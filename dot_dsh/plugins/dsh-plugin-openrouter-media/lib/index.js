// dsh-plugin-openrouter-media — node half.
//
// Image/video generation via OpenRouter for the DeepSeek Harness web profile.
// Dual-face plugin: this half registers two agent tools and the /x-media
// route prefix; lib/client.js (built from src/client.jsx) is the browser
// half. Ephemeral by design: the store lives in memory only, nothing is
// persisted except the generated media files under the configured outputDir.
//
// Contracts implemented here were verified against dsh 0.1.1-rc.2 sources
// (see DESIGN.md) and against the OpenRouter HTTP API docs.

import { createReadStream } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

export const name = 'openrouter-media'
export const inject = ['tools', 'webServer']

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const RING_SIZE = 20
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000
const SSE_HEARTBEAT_MS = 15_000

// ── config ──────────────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  outputDir: z.string().min(1).default(join(homedir(), 'Pictures', 'dsh-generated')),
  defaultImageModel: z.string().min(1).optional(),
  defaultVideoModel: z.string().min(1).optional(),
  maxImagesPerCall: z.number().int().min(1).max(20).default(4),
  maxVideoDurationSeconds: z.number().int().min(1).max(120).default(10),
  videoPollIntervalMs: z.number().int().min(250).default(5000),
  videoMaxWaitMs: z.number().int().min(1000).default(240_000),
})

// ── store (in-memory only; cleared on restart) ──────────────────────────────

/** Ring buffer of the last RING_SIZE results plus a subscriber set. */
export function createMediaStore(ringSize = RING_SIZE) {
  let results = []
  const subscribers = new Set()
  const notify = () => {
    // A broken subscriber must never break a generation run.
    for (const fn of [...subscribers]) {
      try {
        fn()
      } catch {}
    }
  }
  return {
    /** Newest-first snapshot (fresh array, stable per mutation). */
    snapshot: () => [...results],
    get(id) {
      return results.find((result) => result.id === id)
    },
    /** Insert a new result at the head, evicting beyond the ring size. */
    push(result) {
      results = [result, ...results].slice(0, ringSize)
      notify()
      return result
    },
    /** Merge a patch into one result by id (no-op when it was evicted). */
    update(id, patch) {
      let updated
      results = results.map((result) => {
        if (result.id !== id) return result
        updated = { ...result, ...patch }
        return updated
      })
      if (updated) notify()
      return updated
    },
    clear() {
      results = []
      notify()
    },
    /** Live count for the panel badge: pending image/video jobs. */
    inFlight() {
      return results.filter((result) => result.status === 'pending').length
    },
    subscribe(fn) {
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },
  }
}

// ── auth ────────────────────────────────────────────────────────────────────

/**
 * Resolve the OpenRouter API key: the process environment wins, then the
 * harness credentials service (which layers ~/.dsh/.credentials.yaml and
 * .env files). Read opportunistically via ctx.reflect.get(name, false) —
 * plain `ctx.credentials` property access throws for an undeclared service
 * (verified cordis semantics), and spec pins this plugin's inject list to
 * ['tools','webServer'].
 */
export async function resolveApiKey(ctx) {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY
  try {
    const credentials = ctx.reflect.get('credentials', false)
    if (credentials && typeof credentials.resolve === 'function') {
      const hit = await credentials.resolve('OPENROUTER_API_KEY')
      if (hit?.value) return hit.value
    }
  } catch {
    // Service absent or resolve failed — fall through to the unconfigured sentence.
  }
  return undefined
}

// ── upstream error sentences ────────────────────────────────────────────────

/** Fold an upstream HTTP failure into one readable sentence. */
export function describeUpstreamError(status, bodyText, endpoint) {
  let message
  try {
    const body = JSON.parse(bodyText)
    message = body?.error?.message ?? body?.message ?? body?.error ?? undefined
    if (message && typeof message !== 'string') message = JSON.stringify(message)
  } catch {
    message = bodyText && bodyText.length <= 200 ? bodyText.trim() : undefined
  }
  const short = endpoint?.startsWith('/') ? endpoint : ''
  if (status === 401) {
    return `OpenRouter rejected the API key (401 unauthorized)${message ? `: ${message}` : ''}`
  }
  if (status === 402) {
    return `OpenRouter returned 402 payment required — the account is out of credits${short ? ` (${short})` : ''}`
  }
  if (status === 429) {
    return `OpenRouter rate limited the request (429) — try again shortly${message ? `: ${message}` : ''}`
  }
  const suffix = message ? `: ${message}` : ''
  return `OpenRouter returned ${status} for ${short || 'media generation'}${suffix}`
}

/** Readable sentence for any pipeline failure (thrown or upstream). */
export function describeFailure(error, endpoint) {
  if (error instanceof Error && error.upstreamStatus !== undefined) {
    return describeUpstreamError(error.upstreamStatus, error.upstreamBody, error.endpoint ?? endpoint)
  }
  const message = error instanceof Error ? error.message : String(error)
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|network/i.test(message)) {
    return `Could not reach OpenRouter${endpoint ? ` (${endpoint})` : ''}: ${message}`
  }
  return `Media generation failed${endpoint ? ` (${endpoint})` : ''}: ${message}`
}

// ── OpenRouter client ───────────────────────────────────────────────────────

/**
 * Thin JSON/binary helper over fetch. Failures carry
 * { upstreamStatus, upstreamBody, endpoint } so describeFailure can fold
 * them into sentences.
 */
export function createOpenRouterClient(fetchImpl, apiKey) {
  const headers = { 'content-type': 'application/json' }
  if (apiKey) headers.authorization = `Bearer ${apiKey}`
  const request = async (path, init) => {
    let response
    try {
      response = await fetchImpl(`${OPENROUTER_BASE}${path}`, {
        method: init?.method ?? 'GET',
        headers: { ...headers, ...(init?.headers ?? {}) },
        ...(init?.body !== undefined ? { body: init.body } : {}),
      })
    } catch (error) {
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), { endpoint: path })
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw Object.assign(new Error('upstream error'), {
        endpoint: path,
        upstreamStatus: response.status,
        upstreamBody: body,
      })
    }
    return response
  }
  return {
    postJson: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    getJson: (path) => request(path),
    getRaw: (path, extraHeaders) => request(path, { headers: extraHeaders }),
  }
}

// ── model catalog (never hardcode model ids) ────────────────────────────────

/** Fetch + cache both model catalogs. Falls back to stale cache on failure. */
export function createCatalog(fetchImpl, getApiKey) {
  let cache
  let fetchedAt = 0
  return async function catalog(force = false) {
    const fresh = cache !== undefined && Date.now() - fetchedAt < CATALOG_TTL_MS
    if (fresh && !force) return cache
    try {
      const client = createOpenRouterClient(fetchImpl, await getApiKey())
      const [images, videos] = await Promise.all([
        client
          .getJson('/images/models')
          .then((r) => r.json())
          .then((body) => body?.data ?? [])
          .catch(() => cache?.images ?? []),
        client
          .getJson('/videos/models')
          .then((r) => r.json())
          .then((body) => body?.data ?? [])
          .catch(() => cache?.videos ?? []),
      ])
      cache = {
        images: images.map((m) => ({ id: m.id, name: m.name, supported_parameters: m.supported_parameters })),
        videos: videos.map((m) => ({
          id: m.id,
          name: m.name,
          supported_resolutions: m.supported_resolutions,
          supported_durations: m.supported_durations,
          generate_audio: m.generate_audio,
        })),
      }
      fetchedAt = Date.now()
      return cache
    } catch {
      // Fully offline with nothing cached: empty lists. Generation surfaces a
      // readable sentence; the models route degrades instead of throwing.
      return cache ?? { images: [], videos: [] }
    }
  }
}

// ── filenames ───────────────────────────────────────────────────────────────

const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

export function extensionForMime(mime, fallback) {
  if (typeof mime !== 'string') return fallback
  return MIME_EXTENSIONS[mime.toLowerCase().split(';')[0].trim()] ?? fallback
}

/** Lowercase, non-alphanumeric runs collapsed to '-', trimmed, max 40 chars. */
export function slugify(text) {
  const slug = String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  return slug || 'media'
}

function timestampFor(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

// ── clamping ────────────────────────────────────────────────────────────────

/**
 * Clamp the requested image count to the configured cap and, when known,
 * the model's own catalog cap.
 */
export function clampImageCount(n, maxImagesPerCall, modelEntry) {
  const requested = Number.isInteger(n) && n >= 1 ? n : 1
  const catalogCap = modelEntry?.supported_parameters?.n?.max
  const cap = Math.min(maxImagesPerCall, Number.isFinite(catalogCap) ? catalogCap : maxImagesPerCall)
  return Math.min(requested, Math.max(cap, 1))
}

/** Clamp the requested duration to the configured cap (never above it). */
export function clampDuration(seconds, maxVideoDurationSeconds) {
  const requested = Number.isInteger(seconds) && seconds >= 1 ? seconds : undefined
  return requested === undefined ? undefined : Math.min(requested, maxVideoDurationSeconds)
}

// ── generate pipeline (shared by tools and panel route) ─────────────────────

/**
 * One code path for both entry points so the panel and the agent cannot
 * drift. Every failure lands on the store item as a readable sentence;
 * nothing throws.
 */
export function createPipeline({ store, outputDir, config, fetchImpl, getApiKey, lifecycle = { stopped: false }, now = Date.now }) {
  let dirReady
  const ensureDir = () => {
    dirReady ??= mkdir(outputDir, { recursive: true }).catch((error) => {
      dirReady = undefined
      throw error
    })
    return dirReady
  }

  async function downloadToFile(url, apiKey, filePath) {
    const fetched = await fetchImpl(url, { headers: { authorization: `Bearer ${apiKey}` } })
    if (!fetched.ok) {
      const text = await fetched.text().catch(() => '')
      throw Object.assign(new Error('upstream error'), {
        endpoint: url,
        upstreamStatus: fetched.status,
        upstreamBody: text,
      })
    }
    const buffer = Buffer.from(await fetched.arrayBuffer())
    await writeFile(filePath, buffer)
    return { buffer, mime: fetched.headers.get('content-type') ?? undefined }
  }

  const imageTask = async (item) => {
    const apiKey = await getApiKey()
    if (!apiKey) {
      const sentence =
        'OpenRouter API key not set — add OPENROUTER_API_KEY to the environment or ~/.dsh/.credentials.yaml'
      store.update(item.id, { status: 'error', error: sentence })
      return sentence
    }
    const client = createOpenRouterClient(fetchImpl, apiKey)
    const body = { model: item.model, prompt: item.prompt }
    if (item.n !== undefined) body.n = item.n
    if (item.aspectRatio) body.aspect_ratio = item.aspectRatio
    const response = await client.postJson('/images', body)
    const payload = await response.json()
    const images = Array.isArray(payload?.data) ? payload.data : []
    if (images.length === 0) throw new Error('OpenRouter returned no image data')
    await ensureDir()
    const stamp = timestampFor(new Date(now()))
    let index = 0
    let written = 0
    let firstFilePath
    for (const image of images) {
      index += 1
      let b64 = image?.b64_json
      let mime = image?.media_type
      if (!b64 && typeof image?.url === 'string' && image.url.startsWith('data:')) {
        const match = /^data:([^;]+);base64,(.+)$/.exec(image.url)
        if (match) {
          mime = mime ?? match[1]
          b64 = match[2]
        }
      }
      if (!b64) continue
      written += 1
      const ext = extensionForMime(mime, 'png')
      const filePath = join(outputDir, `${stamp}-${slugify(item.prompt)}-${index}.${ext}`)
      const bytes = Buffer.from(b64, 'base64')
      await writeFile(filePath, bytes)
      const fields = {
        status: 'done',
        doneAt: now(),
        filePath,
        mime: mime ?? 'image/png',
        bytes: bytes.length,
        aspectRatio: item.aspectRatio,
      }
      if (firstFilePath === undefined) {
        firstFilePath = filePath
        store.update(item.id, fields)
      } else {
        // Additional images become their own done rows (ring-buffer entries).
        store.push({
          id: randomUUID(),
          kind: 'image',
          prompt: item.prompt,
          model: item.model,
          createdAt: item.createdAt,
          aspectRatio: item.aspectRatio,
          ...fields,
        })
      }
    }
    if (firstFilePath === undefined) throw new Error('OpenRouter response carried no decodable image entries')
    return written === 1
      ? `Image generated with ${item.model}, saved to ${firstFilePath}`
      : `Generated ${written} images with ${item.model}, saved under ${outputDir}`
  }

  async function finishVideo({ item, jobId, state, client, apiKey }) {
    const contentPath =
      Array.isArray(state?.unsigned_urls) && state.unsigned_urls[0]
        ? state.unsigned_urls[0]
        : `${OPENROUTER_BASE}/videos/${jobId}/content?index=0`
    await ensureDir()
    const stamp = timestampFor(new Date(now()))
    const filePath = join(outputDir, `${stamp}-${slugify(item.prompt)}-${String(jobId).slice(-8)}.mp4`)
    const { buffer, mime } = await downloadToFile(contentPath, apiKey, filePath)
    store.update(item.id, {
      status: 'done',
      doneAt: now(),
      filePath,
      mime: mime ?? 'video/mp4',
      bytes: buffer.length,
    })
    return filePath
  }

  const videoTask = async (item) => {
    const apiKey = await getApiKey()
    if (!apiKey) {
      const sentence =
        'OpenRouter API key not set — add OPENROUTER_API_KEY to the environment or ~/.dsh/.credentials.yaml'
      store.update(item.id, { status: 'error', error: sentence })
      return sentence
    }
    const client = createOpenRouterClient(fetchImpl, apiKey)
    const body = { model: item.model, prompt: item.prompt }
    if (item.durationSeconds !== undefined) body.duration = item.durationSeconds
    if (item.resolution) body.resolution = item.resolution
    if (item.generateAudio !== undefined) body.generate_audio = item.generateAudio
    const submitted = await client.postJson('/videos', body)
    const payload = await submitted.json()
    const jobId = payload?.id ?? payload?.job_id ?? payload?.request_id
    if (!jobId) throw new Error('OpenRouter did not return a video job id')
    store.update(item.id, { jobId: String(jobId) })

    const deadline = now() + config.videoMaxWaitMs
    while (true) {
      if (lifecycle.stopped) throw new Error('plugin unloaded while waiting for the video job')
      const state = await client.getJson(`/videos/${jobId}`).then((r) => r.json())
      if (state?.status === 'completed') {
        const filePath = await finishVideo({ item, jobId, state, client, apiKey })
        return `Video ready: ${filePath}`
      }
      if (state?.status === 'failed') {
        const reason = typeof state?.error === 'string' ? state.error : state?.error?.message
        const sentence = `Video generation failed${reason ? `: ${reason}` : ''}`
        store.update(item.id, { status: 'error', error: sentence })
        return sentence
      }
      if (now() >= deadline) break
      await sleep(config.videoPollIntervalMs)
    }

    // Spec item 11: exceeding videoMaxWaitMs returns the job id as text — NOT
    // an error. A tail poll keeps running so the file still lands in the panel.
    const sentence = `Video ${jobId} still generating after ${Math.round(config.videoMaxWaitMs / 1000)}s — it will land in the panel when done (id: ${jobId})`
    store.update(item.id, { status: 'pending', note: sentence })
    void tailPollVideo({ item, jobId, client, apiKey }).catch(() => {})
    return sentence
  }

  const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms))

  async function tailPollVideo({ item, jobId, client, apiKey }) {
    try {
      while (true) {
        if (lifecycle.stopped) return
        await sleep(config.videoPollIntervalMs)
        const state = await client.getJson(`/videos/${jobId}`).then((r) => r.json())
        if (state?.status === 'completed') {
          await finishVideo({ item, jobId, state, client, apiKey })
          return
        }
        if (state?.status === 'failed') {
          const reason = typeof state?.error === 'string' ? state.error : state?.error?.message
          store.update(item.id, {
            status: 'error',
            error: `Video generation failed${reason ? `: ${reason}` : ''}`,
          })
          return
        }
      }
    } catch (error) {
      if (!lifecycle.stopped && store.get(item.id)?.status === 'pending') {
        store.update(item.id, {
          status: 'error',
          error: `Video ${jobId} could not be finished in the background: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }
  }

  return { imageTask, videoTask, ensureDir }
}

// ── request validation + dispatch ───────────────────────────────────────────

const GenerateRequestSchema = z.object({
  kind: z.enum(['image', 'video']),
  prompt: z.string().min(1).max(4000),
  model: z.string().min(1).optional(),
  n: z.number().int().min(1).optional(),
  aspectRatio: z.string().regex(/^\d+:\d+$|^auto$/).optional(),
  durationSeconds: z.number().int().min(1).optional(),
  resolution: z.enum(['480p', '768p', '720p', '1080p', '1K', '2K', '4K']).optional(),
  generateAudio: z.boolean().optional(),
})

/** Parse and normalize one generate request (panel POST or tool args). */
export async function buildGenerateRequest(raw, config, catalog) {
  const parsed = GenerateRequestSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue?.path?.join('.') || 'request'
    throw Object.assign(new Error(`Invalid ${where}: ${issue?.message ?? 'malformed request'}`), { statusCode: 400 })
  }
  const input = parsed.data
  const models = await catalog()
  if (input.kind === 'image') {
    const model = input.model ?? config.defaultImageModel ?? models.images[0]?.id
    if (!model) {
      throw Object.assign(
        new Error('No image model available — the OpenRouter catalog fetch failed and no defaultImageModel is configured'),
        { statusCode: 503 },
      )
    }
    const modelEntry = models.images.find((m) => m.id === model)
    return { ...input, model, n: clampImageCount(input.n, config.maxImagesPerCall, modelEntry) }
  }
  const model = input.model ?? config.defaultVideoModel ?? models.videos[0]?.id
  if (!model) {
    throw Object.assign(
      new Error('No video model available — the OpenRouter catalog fetch failed and no defaultVideoModel is configured'),
      { statusCode: 503 },
    )
  }
  return { ...input, model, durationSeconds: clampDuration(input.durationSeconds, config.maxVideoDurationSeconds) }
}

// ── host fence (spec 15: /x-media sits outside dsh's /api trust fence) ──────

function headerValue(headers, name) {
  const value = headers[name]
  if (value === undefined) return undefined
  return Array.isArray(value) ? value[0] : value
}

/**
 * Mirror of the connection plugin's isTrustedApiRequest for a loopback-only
 * deployment (the shipped web composition binds 127.0.0.1): the Host must be
 * loopback, cross-site fetches never pass, and an attached Origin must match
 * the Host exactly. /x-media sits outside dsh's /api trust fence and has no
 * trustedHosts config surface, so LAN serving is not answerable here.
 */
export function isTrustedRequest(headers) {
  const host = headerValue(headers, 'host')
  if (!host) return false
  let hostUrl
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  const hostname = hostUrl.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  const loopback = hostname === 'localhost' || hostname === '::1' || /^127(\.\d+){3}$/.test(hostname)
  if (!loopback) return false
  if ((headerValue(headers, 'sec-fetch-site') ?? '').toLowerCase() === 'cross-site') return false
  const origin = headerValue(headers, 'origin')
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

// ── asset serving (correct Content-Type + Range) ────────────────────────────

/** Parse a Range header into {start, end} offsets, or undefined. */
export function parseRange(rangeValue, size) {
  if (typeof rangeValue !== 'string') return undefined
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeValue.trim())
  if (!match) return undefined
  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return undefined
  let start
  let end
  if (rawStart === '') {
    const suffix = Number(rawEnd)
    if (!Number.isInteger(suffix) || suffix <= 0) return undefined
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(rawStart)
    if (!Number.isInteger(start) || start >= size) return undefined
    end = rawEnd === '' ? size - 1 : Number(rawEnd)
    if (!Number.isInteger(end) || end < start) return undefined
    end = Math.min(end, size - 1)
  }
  return { start, end }
}

function json(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(body)
}

/** Read a request body with a modest size cap. */
function readBody(req, limit = 256 * 1024) {
  return new Promise((resolveBody, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('Request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

// ── plugin entry ────────────────────────────────────────────────────────────

export function apply(ctx, config = {}) {
  const parsedConfig = ConfigSchema.safeParse(config)
  if (!parsedConfig.success) {
    const issue = parsedConfig.error.issues[0]
    throw new Error(
      `openrouter-media: invalid config at ${issue?.path?.join('.') || '(root)'}: ${issue?.message ?? 'malformed config'}`,
    )
  }
  const config_ = parsedConfig.data
  const store = createMediaStore()
  const fetchImpl = (...args) => fetch(...args)
  const getApiKey = () => resolveApiKey(ctx)
  const catalog = createCatalog(fetchImpl, getApiKey)
  // createPipeline keeps `lifecycle` in its closure and does not return it, so
  // own the object here — the unload effect below needs the same reference.
  const lifecycle = { stopped: false }
  const pipeline = createPipeline({ store, outputDir: config_.outputDir, config: config_, fetchImpl, getApiKey, lifecycle })

  // Assets map: id → { filePath, mime }. In-memory only, so a request-supplied
  // asset id can never be turned into an arbitrary filesystem path.
  const assets = new Map()

  /** Run one generation task and register whatever files it wrote. */
  const runTask = async (kind, item) => {
    try {
      const run = kind === 'image' ? pipeline.imageTask : pipeline.videoTask
      return await run(item)
    } catch (error) {
      const sentence = describeFailure(error, kind === 'image' ? '/images' : '/videos')
      store.update(item.id, { status: 'error', error: sentence })
      return sentence
    }
  }

  /** Start one generation from validated input; returns the store item. */
  const startGeneration = (input) => {
    const item = store.push({
      id: randomUUID(),
      kind: input.kind,
      prompt: input.prompt,
      model: input.model,
      status: 'pending',
      createdAt: Date.now(),
      n: input.n,
      aspectRatio: input.aspectRatio,
      durationSeconds: input.durationSeconds,
      resolution: input.resolution,
      generateAudio: input.generateAudio,
    })
    void runTask(input.kind, item)
    return item
  }

  // Sweep done rows into the assets map (files may also appear from image
  // tasks that write several rows per request).
  store.subscribe(() => {
    for (const result of store.snapshot()) {
      if (result.status === 'done' && result.filePath && !assets.has(result.id)) {
        assets.set(result.id, { filePath: result.filePath, mime: result.mime })
      }
    }
  })

  const withFence = (handler) => (req, res, ...rest) => {
    if (!isTrustedRequest(req.headers)) {
      json(res, 403, { error: 'forbidden — /x-media only answers same-origin requests' })
      return
    }
    Promise.resolve(handler(req, res, ...rest)).catch((error) => {
      if (!res.headersSent) {
        json(res, 500, { error: `openrouter-media route failure: ${error instanceof Error ? error.message : String(error)}` })
      } else {
        res.destroy()
      }
    })
  }

  // ── GET /x-media/events — SSE, metadata frames only ───────────────────────
  const handleEvents = withFence((req, res) => {
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    })
    res.write('retry: 5000\n\n')
    const send = () => {
      res.write(`data: ${JSON.stringify({ type: 'snapshot', results: store.snapshot(), inFlight: store.inFlight() })}\n\n`)
    }
    send()
    const unsubscribe = store.subscribe(send)
    const heartbeat = setInterval(() => {
      res.write(': ping\n\n')
    }, SSE_HEARTBEAT_MS)
    req.on('close', () => {
      clearInterval(heartbeat)
      unsubscribe()
    })
  })

  // ── POST /x-media/generate ────────────────────────────────────────────────
  const handleGenerate = withFence(async (req, res) => {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Use POST /x-media/generate' })
      return
    }
    let raw
    try {
      raw = JSON.parse(await readBody(req))
    } catch {
      json(res, 400, { error: 'Request body is not valid JSON' })
      return
    }
    let input
    try {
      input = await buildGenerateRequest(raw, config_, catalog)
    } catch (error) {
      json(res, error?.statusCode ?? 400, { error: error instanceof Error ? error.message : String(error) })
      return
    }
    const item = startGeneration(input)
    json(res, 202, { accepted: true, id: item.id, inFlight: store.inFlight() })
  })

  // ── GET /x-media/asset/:id — correct Content-Type + Range support ────────
  const handleAsset = withFence(async (req, res, id) => {
    const asset = assets.get(id)
    if (!asset) {
      json(res, 404, { error: `No media asset with id ${id} in this session — the store is cleared on restart` })
      return
    }
    let size
    try {
      size = (await stat(asset.filePath)).size
    } catch {
      json(res, 404, { error: 'Media file is no longer on disk' })
      return
    }
    const baseHeaders = {
      'content-type': asset.mime ?? 'application/octet-stream',
      'accept-ranges': 'bytes',
      'cache-control': 'no-store',
    }
    if (req.method === 'HEAD') {
      res.writeHead(200, { ...baseHeaders, 'content-length': size })
      res.end()
      return
    }
    const range = parseRange(headerValue(req.headers, 'range'), size)
    if (range) {
      res.writeHead(206, {
        ...baseHeaders,
        'content-range': `bytes ${range.start}-${range.end}/${size}`,
        'content-length': range.end - range.start + 1,
      })
      createReadStream(asset.filePath, { start: range.start, end: range.end })
        .on('error', () => res.destroy())
        .pipe(res)
      return
    }
    res.writeHead(200, { ...baseHeaders, 'content-length': size })
    createReadStream(asset.filePath).on('error', () => res.destroy()).pipe(res)
  })

  // ── GET /x-media/models — cached catalog + panel limits ───────────────────
  const handleModels = withFence(async (req, res) => {
    const models = await catalog()
    json(res, 200, {
      images: models.images,
      videos: models.videos,
      defaultImageModel: config_.defaultImageModel,
      defaultVideoModel: config_.defaultVideoModel,
      limits: {
        maxImagesPerCall: config_.maxImagesPerCall,
        maxVideoDurationSeconds: config_.maxVideoDurationSeconds,
      },
    })
  })

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: '/x-media',
        handler: (req, res) => {
          let pathname
          try {
            pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
          } catch {
            json(res, 400, { error: 'Malformed request path' })
            return
          }
          const rest = pathname.slice('/x-media'.length)
          if (rest === '/events') return handleEvents(req, res)
          if (rest === '/generate') return handleGenerate(req, res)
          if (rest === '/models') return handleModels(req, res)
          if (rest.startsWith('/asset/')) {
            const id = rest.slice('/asset/'.length)
            if (id === '') {
              json(res, 400, { error: 'Asset id missing' })
              return
            }
            return handleAsset(req, res, id)
          }
          if (rest === '' || rest === '/') {
            json(res, 200, {
              plugin: 'openrouter-media',
              routes: ['/x-media/events', '/x-media/generate', '/x-media/asset/:id', '/x-media/models'],
            })
            return
          }
          json(res, 404, { error: `Unknown /x-media route: ${rest}` })
        },
      }),
    'openrouter-media: /x-media route prefix',
  )

  // ── agent tools (terse text only — never an image content block) ──────────
  const textOnlyOutput = {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
    render: (_args, value) => [{ type: 'text', text: value.text }],
  }

  const runTool = async (kind, args) => {
    let input
    try {
      input = await buildGenerateRequest({ ...args, kind }, config_, catalog)
    } catch (error) {
      return { text: error instanceof Error ? error.message : `Media generation failed: ${String(error)}` }
    }
    const item = store.push({
      id: randomUUID(),
      kind: input.kind,
      prompt: input.prompt,
      model: input.model,
      status: 'pending',
      createdAt: Date.now(),
      n: input.n,
      aspectRatio: input.aspectRatio,
      durationSeconds: input.durationSeconds,
      resolution: input.resolution,
      generateAudio: input.generateAudio,
    })
    const sentence = await runTask(kind, item)
    return {
      text: typeof sentence === 'string' && sentence.length > 0 ? sentence : `Media request ${item.id} finished`,
    }
  }

  ctx.effect(
    () =>
      ctx.tools.register({
        name: 'media_generate_image',
        description:
          'Generate images from a text prompt via OpenRouter. Synchronous; saves the files under the configured outputDir and surfaces them in the dsh web media panel. Returns one terse sentence — the panel shows the images.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            prompt: { type: 'string', description: 'What the image should show.' },
            model: {
              type: 'string',
              description:
                'OpenRouter image model id (see GET /x-media/models). Defaults to the configured defaultImageModel or the catalog head.',
            },
            n: { type: 'integer', description: `How many images to request (1-${config_.maxImagesPerCall}). Defaults to 1.` },
            aspectRatio: {
              type: 'string',
              description: 'Aspect ratio like "1:1", "16:9", "9:16", "4:3", "3:4", or "auto". Providers clamp to their supported subset.',
            },
          },
          required: ['prompt'],
        },
        output: textOnlyOutput,
        execute: (args) => runTool('image', args),
      }),
    'openrouter-media: media_generate_image tool',
  )

  ctx.effect(
    () =>
      ctx.tools.register({
        name: 'media_generate_video',
        description:
          'Generate a short video from a text prompt via OpenRouter. Polls the job until done, or the configured wait budget elapses and the job id is returned as plain text (completion still lands in the panel). Returns one terse sentence.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            prompt: { type: 'string', description: 'What the video should show.' },
            model: {
              type: 'string',
              description:
                'OpenRouter video model id (see GET /x-media/models). Defaults to the configured defaultVideoModel or the catalog head.',
            },
            durationSeconds: {
              type: 'integer',
              description: `Clip length in seconds, capped at ${config_.maxVideoDurationSeconds} by configuration.`,
            },
            resolution: { type: 'string', description: 'Output resolution: "480p", "720p", "1080p" (model-dependent).' },
            generateAudio: { type: 'boolean', description: 'Whether to generate audio alongside the video (model-dependent).' },
          },
          required: ['prompt'],
        },
        output: textOnlyOutput,
        execute: (args) => runTool('video', args),
      }),
    'openrouter-media: media_generate_video tool',
  )

  // Background video tail polls must stop when the plugin unloads.
  ctx.effect(
    () => {
      lifecycle.stopped = false
      return () => {
        lifecycle.stopped = true
      }
    },
    'openrouter-media: background job lifecycle',
  )
}
