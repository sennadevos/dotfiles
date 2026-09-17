// Unit tests for the openrouter-media node half. No network, no real fs
// outside a tmpdir: fetch is injected, outputDir points into os.tmpdir().
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  createMediaStore,
  describeUpstreamError,
  describeFailure,
  clampImageCount,
  clampDuration,
  extensionForMime,
  slugify,
  parseRange,
  isTrustedRequest,
  createCatalog,
  buildGenerateRequest,
  createPipeline,
} from '../lib/index.js'

const baseConfig = {
  maxImagesPerCall: 4,
  maxVideoDurationSeconds: 10,
  videoPollIntervalMs: 1,
  videoMaxWaitMs: 30,
}

function jsonResponse(body, status = 200) {
  const text = JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => body,
    headers: new Map([['content-type', 'application/json']]),
  }
}

// ── store ───────────────────────────────────────────────────────────────────

test('ring buffer evicts beyond 20 entries and notifies subscribers', () => {
  const store = createMediaStore()
  let notifications = 0
  store.subscribe(() => {
    notifications += 1
  })
  for (let i = 0; i < 25; i++) store.push({ id: String(i), status: 'pending' })
  const snapshot = store.snapshot()
  assert.equal(snapshot.length, 20)
  assert.equal(snapshot[0].id, '24')
  assert.equal(store.get('0'), undefined)
  assert.ok(notifications >= 25)
})

test('update merges by id and inFlight counts pending rows', () => {
  const store = createMediaStore()
  const updated = store.update('missing', { status: 'done' })
  assert.equal(updated, undefined)
  store.push({ id: 'a', status: 'pending', kind: 'image' })
  store.push({ id: 'b', status: 'done', kind: 'video' })
  store.update('a', { status: 'done' })
  assert.equal(store.inFlight(), 0)
})

// ── error sentences ─────────────────────────────────────────────────────────

test('upstream errors fold into readable sentences (401/402/429/generic)', () => {
  assert.match(describeUpstreamError(402, '', '/images'), /out of credits/)
  assert.match(describeUpstreamError(429, '{"error":{"message":"slow down"}}', '/images'), /rate limited.*slow down/s)
  assert.match(describeUpstreamError(401, '{}', '/videos'), /rejected the API key/)
  assert.match(describeUpstreamError(500, '{"error":{"message":"boom"}}', '/videos'), /500.*boom/s)
  assert.match(
    describeFailure(Object.assign(new Error('x'), { upstreamStatus: 429, upstreamBody: '{}' }), '/videos'),
    /429/,
  )
  assert.match(describeFailure(new TypeError('fetch failed'), '/images'), /Could not reach OpenRouter/)
})

// ── clamping + naming helpers ──────────────────────────────────────────────

test('image count respects config cap and model catalog cap', () => {
  assert.equal(clampImageCount(undefined, 4, undefined), 1)
  assert.equal(clampImageCount(9, 4, undefined), 4)
  assert.equal(clampImageCount(3, 4, { supported_parameters: { n: { min: 1, max: 6 } } }), 3)
  assert.equal(clampImageCount(5, 4, { supported_parameters: { n: { min: 1, max: 2 } } }), 2)
  assert.equal(clampImageCount(0, 4, undefined), 1)
})

test('duration never exceeds the configured cap and is optional', () => {
  assert.equal(clampDuration(undefined, 10), undefined)
  assert.equal(clampDuration(4, 10), 4)
  assert.equal(clampDuration(30, 10), 10)
})

test('slugify and mime mapping behave', () => {
  assert.equal(slugify('A wizard! in a, "tower" — yes'), 'a-wizard-in-a-tower-yes')
  assert.equal(extensionForMime('image/png; charset=binary', 'png'), 'png')
  assert.equal(extensionForMime('image/svg+xml', 'png'), 'svg')
  assert.equal(extensionForMime(undefined, 'png'), 'png')
})

// ── range parsing ───────────────────────────────────────────────────────────

test('parseRange handles start-end, suffix and open-ended forms', () => {
  assert.deepEqual(parseRange('bytes=0-99', 1000), { start: 0, end: 99 })
  assert.deepEqual(parseRange('bytes=500-', 1000), { start: 500, end: 999 })
  assert.deepEqual(parseRange('bytes=-200', 1000), { start: 800, end: 999 })
  assert.equal(parseRange('bytes=1000-', 1000), undefined)
  assert.equal(parseRange('bytes=', 1000), undefined)
  assert.equal(parseRange('items=0-1', 1000), undefined)
  assert.equal(parseRange('bytes=-0', 1000), undefined)
})

// ── host fence ──────────────────────────────────────────────────────────────

test('host fence allows loopback + same-origin and rejects cross-site', () => {
  assert.equal(isTrustedRequest({ host: '127.0.0.1:3080' }), true)
  assert.equal(isTrustedRequest({ host: 'localhost:3080', origin: 'http://localhost:3080' }), true)
  assert.equal(
    isTrustedRequest({ host: '[::1]:3080', origin: 'http://[::1]:3080', 'sec-fetch-site': 'same-origin' }),
    true,
  )
  assert.equal(isTrustedRequest({}), false)
  assert.equal(
    isTrustedRequest({ host: '127.0.0.1:3080', origin: 'http://evil.example', 'sec-fetch-site': 'cross-site' }),
    false,
  )
  assert.equal(isTrustedRequest({ host: 'evil.example', origin: 'http://evil.example' }), false)
  assert.equal(isTrustedRequest({ host: '192.168.1.10:3080' }), false)
  assert.equal(
    isTrustedRequest({ host: '192.168.1.10:3080', origin: 'http://192.168.1.10:3080', 'sec-fetch-site': 'same-origin' }),
    false,
  )
})

// ── catalog ─────────────────────────────────────────────────────────────────

const BASE = 'https://openrouter.ai/api/v1'
const MODELS_URLS = [`${BASE}/images/models`, `${BASE}/videos/models`]

test('catalog fetches both endpoints and serves them cached afterwards', async () => {
  let calls = []
  const fetchImpl = async (url) => {
    calls.push(url)
    if (url === `${BASE}/images/models`) return jsonResponse({ data: [{ id: 'img/a', name: 'Img A' }] })
    if (url === `${BASE}/videos/models`) return jsonResponse({ data: [{ id: 'vid/a', name: 'Vid A' }] })
    throw new Error(`unexpected url ${url}`)
  }
  const catalog = createCatalog(fetchImpl, async () => 'k')
  const first = await catalog()
  assert.deepEqual(first.images.map((m) => m.id), ['img/a'])
  assert.deepEqual(first.videos.map((m) => m.id), ['vid/a'])
  await catalog()
  assert.equal(calls.length, 2)
})

test('catalog keeps serving its stale cache when the network dies', async () => {
  const primed = new Map()
  const fetchImpl = async (url) => {
    if (!MODELS_URLS.includes(url)) throw new Error(`unexpected url ${url}`)
    if (!primed.get(url)) {
      primed.set(url, true)
      if (url.endsWith('/images/models')) return jsonResponse({ data: [{ id: 'keep/img', name: 'KeepImg' }] })
      return jsonResponse({ data: [{ id: 'keep/vid', name: 'KeepVid' }] })
    }
    throw new TypeError('fetch failed')
  }
  const catalog = createCatalog(fetchImpl, async () => 'k')
  await catalog(true)
  const degraded = await catalog(true)
  assert.deepEqual(degraded.images.map((m) => m.id), ['keep/img'])
  assert.deepEqual(degraded.videos.map((m) => m.id), ['keep/vid'])
})

// ── generate request validation ────────────────────────────────────────────

const modelConfig = { ...baseConfig }
const modelsStub = {
  images: [{ id: 'img/x', name: 'X', supported_parameters: { n: { min: 1, max: 2 } } }],
  videos: [{ id: 'vid/y', name: 'Y' }],
}

test('buildGenerateRequest validates, defaults the model and clamps n', async () => {
  const request = await buildGenerateRequest({ kind: 'image', prompt: 'hi', n: 7 }, modelConfig, async () => modelsStub)
  assert.equal(request.model, 'img/x')
  assert.equal(request.n, 2)
  await assert.rejects(() => buildGenerateRequest({ kind: 'image', prompt: '' }, modelConfig, async () => modelsStub))
  await assert.rejects(() =>
    buildGenerateRequest({ kind: 'video', prompt: 'p', resolution: '11p' }, modelConfig, async () => modelsStub),
  )
  await assert.rejects(() =>
    buildGenerateRequest({ kind: 'image', prompt: 'p' }, modelConfig, async () => ({ images: [], videos: [] })),
  )
})

// ── pipelines ───────────────────────────────────────────────────────────────

async function tempDir(t) {
  const dir = await mkdtemp(join(tmpdir(), 'om-test-'))
  t.after(async () => {
    await rm(dir, { recursive: true, force: true })
  })
  return dir
}

test('unset key produces a readable sentence without touching the network', async (t) => {
  delete process.env.OPENROUTER_API_KEY
  let called = 0
  const store = createMediaStore()
  const dir = await tempDir(t)
  const pipeline = createPipeline({
    store,
    outputDir: dir,
    config: baseConfig,
    fetchImpl: async () => {
      called += 1
      return jsonResponse({})
    },
    getApiKey: async () => undefined,
  })
  const item = store.push({ id: 'no-key', kind: 'image', prompt: 'p', model: 'img/x', status: 'pending' })
  const sentence = await pipeline.imageTask(item)
  assert.match(sentence, /API key not set/)
  assert.equal(called, 0)
  assert.equal(store.get('no-key').status, 'error')
})

test('image task decodes b64_json rows, writes files and pushes store rows', async (t) => {
  const b64 = Buffer.from('hello image').toString('base64')
  const store = createMediaStore()
  const dir = await tempDir(t)
  const seen = []
  const pipeline = createPipeline({
    store,
    outputDir: dir,
    config: baseConfig,
    fetchImpl: async (url, init) => {
      seen.push(url)
      assert.equal(init.headers.authorization, 'Bearer k')
      return jsonResponse({
        created: 1,
        data: [
          { b64_json: b64, media_type: 'image/png' },
          { b64_json: b64, media_type: 'image/webp' },
        ],
        usage: { cost: 0.01 },
      })
    },
    getApiKey: async () => 'k',
  })
  const item = store.push({
    id: 'img-run',
    kind: 'image',
    prompt: 'A tiny test!',
    model: 'img/x',
    status: 'pending',
    createdAt: Date.now(),
  })
  const sentence = await pipeline.imageTask(item)
  assert.match(sentence, /Generated 2 images with img\/x/)
  assert.deepEqual(seen, [`${BASE}/images`])
  const doneRows = store.snapshot().filter((row) => row.status === 'done')
  assert.equal(doneRows.length, 2)
  const contents = await Promise.all(doneRows.map((row) => readFile(row.filePath)))
  for (const content of contents) assert.ok(content.length > 0)
  const extensions = doneRows.map((row) => row.filePath.split('.').pop()).sort()
  assert.deepEqual(extensions, ['png', 'webp'])
})

test('upstream failures land as readable sentences on the item', async (t) => {
  const store = createMediaStore()
  const dir = await tempDir(t)
  const pipeline = createPipeline({
    store,
    outputDir: dir,
    config: baseConfig,
    fetchImpl: async () => jsonResponse({ error: { message: 'insufficient credits' } }, 402),
    getApiKey: async () => 'k',
  })
  const item = store.push({ id: 'paid', kind: 'image', prompt: 'p', model: 'img/x', status: 'pending' })
  // The pipeline throws tagged errors; apply()'s runTask wrapper folds them
  // into sentences — mirror that wrapper exactly here.
  const sentence = await pipeline.imageTask(item).catch((error) => {
    const mapped = describeFailure(error, '/images')
    store.update(item.id, { status: 'error', error: mapped })
    return mapped
  })
  assert.match(sentence, /402 payment required/)
  assert.equal(store.get('paid').status, 'error')
  assert.match(store.get('paid').error, /402 payment required/)
})

test('video task past its wait budget returns the job id as text and completes in background', async (t) => {
  const store = createMediaStore()
  const dir = await tempDir(t)
  const b64 = Buffer.from('fake mp4 bytes').toString('base64')
  let submitCalls = 0
  let polls = 0
  let contentFetches = 0
  const pipeline = createPipeline({
    store,
    outputDir: dir,
    config: { ...baseConfig, videoPollIntervalMs: 5, videoMaxWaitMs: 30 }, // budget 30ms, poll every 5ms
    fetchImpl: async (url) => {
      if (url === `${BASE}/videos` && submitCalls === 0) {
        submitCalls += 1
        return jsonResponse({ id: 'job-123', polling_url: `${BASE}/videos/job-123`, status: 'pending' }, 202)
      }
      if (url === `${BASE}/videos/job-123`) {
        polls += 1
        // Stay pending well past the 30ms wait budget, then complete.
        return jsonResponse({ id: 'job-123', status: polls > 15 ? 'completed' : 'in_progress' })
      }
      if (url === `${BASE}/videos/job-123/content?index=0`) {
        contentFetches += 1
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => Buffer.from(b64, 'base64'),
          headers: new Map([['content-type', 'video/mp4']]),
          text: async () => '',
        }
      }
      throw new Error(`unexpected url ${url}`)
    },
    getApiKey: async () => 'k',
    now: () => Date.now(),
  })
  const item = store.push({
    id: 'vid-run',
    kind: 'video',
    prompt: 'a tiny clip',
    model: 'vid/y',
    durationSeconds: 4,
    status: 'pending',
    createdAt: Date.now(),
  })
  const sentence = await pipeline.videoTask(item)
  assert.match(sentence, /Video job-123 still generating/)
  assert.doesNotMatch(sentence, /failed|error/i)
  assert.equal(store.get('vid-run').status, 'pending')
  // Wait for the tail poll to finish quietly.
  for (let i = 0; i < 200 && store.get('vid-run').status !== 'done'; i++) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 20))
  }
  const fresh = store.get('vid-run')
  assert.equal(fresh.status, 'done', `expected done, got ${JSON.stringify(fresh)}`)
  assert.ok(contentFetches >= 1)
  const written = await readFile(fresh.filePath)
  assert.equal(written.toString('base64'), b64)
})
