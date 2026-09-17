// dsh-plugin-openrouter-media — browser half.
//
// A lazy-CJS bundle: executing it only REGISTERS the factory via
// window.__ModuleLoader__.load({id, factory}); every side effect (CSS
// injection, EventSource) lives inside apply() / component effects, exactly
// like the shipped dsh client bundles (see DESIGN.md §5).
//
// Required cordis services: `slots` and `locale` — both mounted by the shell
// before plugin fibers activate. react / react/jsx-runtime /
// @deepseek-ai/dsh-client-ui-primitives are shell seed words resolved by the
// runtime require (zero runtime dependencies of our own).

import { useEffect } from 'react';
import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
import { injectStyles } from './panel.css.js';

const NS = 'openrouter-media';
const PACKAGE_ID = '__PACKAGE_ID__'; // replaced by scripts/build.mjs

/** Cordis plugin name + required services (slots and locale come pre-mounted). */
export const name = 'openrouter-media-client';
export const inject = ['slots', 'locale'];

// ── shared observable store ────────────────────────────────────────────────

/**
 * HostObservable for useSyncExternalStoreWithSelector: { getSnapshot,
 * subscribe }. One instance shared by BOTH slot entries through their
 * inject faces (`hooks: { media: store }` → components get a `useMedia`
 * selector hook bound by the renderer).
 */
function createMediaStore() {
  let state = {
    results: [],
    inFlight: 0,
    open: false,
    tab: 'image',
    models: null,
    connection: true,
    submitError: null,
  };
  const listeners = new Set();
  const commit = (next) => {
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {}
    }
  };
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(patch) {
      commit({ ...state, ...patch });
    },
    /** Replace the result list from a server snapshot frame. */
    applySnapshot(frame) {
      const results = Array.isArray(frame?.results) ? frame.results : [];
      commit({
        ...state,
        results,
        inFlight: typeof frame?.inFlight === 'number' ? frame.inFlight : results.filter((r) => r.status === 'pending').length,
      });
    },
    toggleOpen(nextOpen) {
      const open = nextOpen ?? !state.open;
      commit({ ...state, open, submitError: null });
      return open;
    },
  };
}

const emptyDict = {};
const zh = {
  'panel.title': '媒体生成',
  'panel.close': '关闭',
  'panel.promptLabel': '描述你想生成的内容',
  'panel.image': '图片',
  'panel.video': '视频',
  'panel.model': '模型',
  'panel.count': '数量',
  'panel.aspect': '宽高比',
  'panel.duration': '时长（秒）',
  'panel.resolution': '分辨率',
  'panel.audio': '生成音频',
  'panel.generate': '生成',
  'panel.generating': '生成中…',
  'panel.disconnected': '面板离线 — 正在重连…',
  'trigger.aria': '打开媒体生成面板',
  'status.pending': '排队/生成中',
  'status.done': '完成',
  'status.error': '失败',
};
const en = {
  'panel.title': 'Media generation',
  'panel.close': 'Close',
  'panel.promptLabel': 'Describe what to generate',
  'panel.image': 'Image',
  'panel.video': 'Video',
  'panel.model': 'Model',
  'panel.count': 'Count',
  'panel.aspect': 'Aspect ratio',
  'panel.duration': 'Duration (s)',
  'panel.resolution': 'Resolution',
  'panel.audio': 'Generate audio',
  'panel.generate': 'Generate',
  'panel.generating': 'Generating…',
  'panel.disconnected': 'Panel offline — reconnecting…',
  'trigger.aria': 'Open the media panel',
  'status.pending': 'pending',
  'status.done': 'done',
  'status.error': 'error',
};

async function fetchModels(store) {
  try {
    const response = await fetch('/x-media/models');
    if (!response.ok) throw new Error(`models fetch failed: ${response.status}`);
    const body = await response.json();
    store.set({ models: body });
  } catch {
    store.set({ models: { images: [], videos: [], limits: { maxImagesPerCall: 4, maxVideoDurationSeconds: 10 } } });
  }
}

async function submitGeneration(store, payload) {
  try {
    const response = await fetch('/x-media/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok && response.status !== 202) {
      store.set({ submitError: body?.error ?? `Request failed with status ${response.status}` });
      return false;
    }
    store.set({ submitError: null });
    return true;
  } catch (error) {
    store.set({ submitError: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

// ── components ─────────────────────────────────────────────────────────────

function MediaTrigger(props) {
  const useMedia = props.useMedia ?? (() => undefined);
  const inFlight = useMedia((state) => state.inFlight);
  const open = useMedia((state) => state.open);
  const wide = props.wide === true;
  const t = props.t ?? ((key) => key);
  return (
    <button
      type="button"
      className="om-trigger"
      aria-label={t('trigger.aria')}
      title={t('panel.title')}
      data-open={open ? 'true' : 'false'}
      onClick={() => props.store.toggleOpen()}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1.5" y="3.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="4.6" cy="6.6" r="1" fill="currentColor" />
        <path d="M2 11l3-3 2.5 2.5L10 8l3.5 3.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
        <path d="M12.5 2v4M10.5 4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      {inFlight > 0 ? <span className="om-badge">{inFlight}</span> : null}
      {wide ? <span style={{ marginLeft: 4, fontSize: 12 }}>{t('panel.title')}</span> : null}
    </button>
  );
}

function ResultRow({ result }) {
  const statusPill = (
    <span className="om-pill" data-status={result.status}>
      {result.status}
    </span>
  );
  const media =
    result.status !== 'done' || !result.id ? null : result.kind === 'video' ? (
      <video className="om-media" controls preload="metadata" src={`/x-media/asset/${result.id}`} />
    ) : (
      <img className="om-media" alt={result.prompt} loading="lazy" src={`/x-media/asset/${result.id}`} />
    );
  return (
    <figure className="om-result">
      {media}
      <figcaption className="om-caption">
        {statusPill}
        <span className="om-caption-text">{result.model}</span>
      </figcaption>
      {result.error ? <div className="om-error">{result.error}</div> : null}
      {!result.error && result.note ? <div className="om-note">{result.note}</div> : null}
    </figure>
  );
}

const ASPECT_CHOICES = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4'];
const RESOLUTION_CHOICES = ['480p', '720p', '1080p'];

function MediaPanel(props) {
  const useMedia = props.useMedia ?? (() => undefined);
  const store = props.store;
  const state = useMedia((value) => value);
  const t = props.t ?? ((key) => key);
  const open = state.open;

  useEffect(() => {
    if (open && !store.getSnapshot().models) void fetchModels(store);
  }, [open, store]);

  if (!open) return null;

  const models = state.models;
  const limits = models?.limits ?? { maxImagesPerCall: 4, maxVideoDurationSeconds: 10 };
  const isImage = state.tab === 'image';
  const modelList = isImage ? (models?.images ?? []) : (models?.videos ?? []);
  const defaultModel = isImage ? models?.defaultImageModel : models?.defaultVideoModel;
  const results = state.results;

  const onSubmit = async () => {
    const snapshot = store.getSnapshot();
    const promptText = (document.getElementById('om-prompt')?.value ?? '').trim();
    if (!promptText) {
      store.set({ submitError: 'Prompt is empty.' });
      return;
    }
    const payload = { kind: isImage ? 'image' : 'video', prompt: promptText };
    const modelSelect = document.getElementById('om-model')?.value;
    if (modelSelect) payload.model = modelSelect;
    if (isImage) {
      const n = Number(document.getElementById('om-count')?.value ?? 1);
      if (Number.isInteger(n) && n >= 1) payload.n = n;
      const aspect = document.getElementById('om-aspect')?.value;
      if (aspect && aspect !== 'auto') payload.aspectRatio = aspect;
    } else {
      const duration = Number(document.getElementById('om-duration')?.value ?? 0);
      if (Number.isInteger(duration) && duration >= 1) payload.durationSeconds = Math.min(duration, limits.maxVideoDurationSeconds);
      const resolution = document.getElementById('om-resolution')?.value;
      if (resolution) payload.resolution = resolution;
      const audio = document.getElementById('om-audio')?.checked;
      if (audio != null) payload.generateAudio = audio === true;
    }
    await submitGeneration(store, payload);
  };

  return (
    <div className="om-panel" role="dialog" aria-label={t('panel.title')}>
      <header className="om-header">
        <span className="om-title">{t('panel.title')}</span>
        {state.connection ? null : <span className="om-connwarn">{t('panel.disconnected')}</span>}
        <button type="button" className="om-close" aria-label={t('panel.close')} onClick={() => store.toggleOpen(false)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <div className="om-body">
        <div className="om-tabs">
          {['image', 'video'].map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              className="om-tab"
              data-active={state.tab === tabKey ? 'true' : 'false'}
              onClick={() => store.set({ tab: tabKey, submitError: null })}
            >
              {tabKey === 'image' ? t('panel.image') : t('panel.video')}
            </button>
          ))}
        </div>
        <textarea id="om-prompt" className="om-prompt" placeholder={t('panel.promptLabel')} rows={2} maxLength={4000} />
        <div className="om-row">
          <span className="om-field">
            <label htmlFor="om-model">{t('panel.model')}</label>
            <select id="om-model" className="om-select" defaultValue={defaultModel ?? ''}>
              {(modelList.length === 0 ? [{ id: '', name: defaultModel ?? '(catalog unavailable)' }] : modelList).map(
                (model) => (
                  <option key={model.id || 'default'} value={model.id}>
                    {model.name || model.id}
                  </option>
                ),
              )}
            </select>
          </span>
          {isImage ? (
            <>
              <span className="om-field">
                <label htmlFor="om-count">{t('panel.count')}</label>
                <input
                  id="om-count"
                  className="om-input"
                  type="number"
                  min="1"
                  max={limits.maxImagesPerCall}
                  defaultValue="1"
                  style={{ width: 56 }}
                />
              </span>
              <span className="om-field">
                <label htmlFor="om-aspect">{t('panel.aspect')}</label>
                <select id="om-aspect" className="om-select">
                  {ASPECT_CHOICES.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              </span>
            </>
          ) : (
            <>
              <span className="om-field">
                <label htmlFor="om-duration">{t('panel.duration')}</label>
                <input
                  id="om-duration"
                  className="om-input"
                  type="number"
                  min="1"
                  max={limits.maxVideoDurationSeconds}
                  defaultValue={Math.min(5, limits.maxVideoDurationSeconds)}
                  style={{ width: 56 }}
                />
              </span>
              <span className="om-field">
                <label htmlFor="om-resolution">{t('panel.resolution')}</label>
                <select id="om-resolution" className="om-select" defaultValue="720p">
                  {RESOLUTION_CHOICES.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              </span>
              <span className="om-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <input id="om-audio" type="checkbox" defaultChecked />
                <label htmlFor="om-audio">{t('panel.audio')}</label>
              </span>
            </>
          )}
        </div>
        <div className="om-row">
          {state.inFlight > 0 ? <span>{t('panel.generating')}</span> : null}
          <Button variant="primary" className="om-submit" onClick={onSubmit} disabled={state.connection === false}>
            {t('panel.generate')}
          </Button>
        </div>
        {state.submitError ? <div className="om-error">{state.submitError}</div> : null}
        <div className="om-results">
          {results.length === 0 ? null : results.map((result) => <ResultRow key={result.id} result={result} />)}
        </div>
      </div>
    </div>
  );
}

// ── browser plugin entry ───────────────────────────────────────────────────

/** Slot content registered into sidebar.footer.action and shell.overlay. */
export function apply(ctx) {
  ctx.effect(() => injectStyles(PACKAGE_ID), 'openrouter-media-client: stylesheet');
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'openrouter-media-client: dictionaries');

  const store = createMediaStore();

  ctx.effect(() => {
    const source = new EventSource('/x-media/events');
    source.addEventListener('message', (event) => {
      let frame;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      if (frame?.type === 'snapshot') {
        store.applySnapshot(frame);
      }
    });
    source.onopen = () => store.set({ connection: true });
    source.onerror = () => store.set({ connection: false });
    return () => source.close();
  }, 'openrouter-media-client: event source');

  const faceFor = () => ({ hooks: { media: store }, store });

  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      {
        name: 'sidebar.footer.action',
        id: 'openrouter-media-trigger',
        locale: NS,
        inject: faceFor,
      },
      MediaTrigger,
    ),
  );

  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'openrouter-media-panel',
        order: 5,
        locale: NS,
        inject: faceFor,
      },
      MediaPanel,
    ),
  );
}
