window.__ModuleLoader__.load({
	id: "dsh-plugin-openrouter-media",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.jsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/panel.css.js
var css = `
.om-trigger{position:relative;cursor:pointer;background:transparent;border:none;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary,#9a9a9a);padding:0}
.om-trigger:hover,.om-trigger:focus-visible{color:var(--dsw-alias-label-secondary,#cfcfcf);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.15))}
.om-badge{position:absolute;top:-2px;right:-4px;min-width:14px;height:14px;padding:0 3px;border-radius:7px;background:var(--dsw-specific-menu,#2b2b2b);color:var(--dsw-alias-label-primary,#f2f2f2);font-size:10px;line-height:14px;font-weight:600;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.35)}
.om-panel{position:fixed;top:16px;right:16px;z-index:2147483000;width:380px;max-width:min(430px,calc(100vw - 32px));max-height:min(640px,calc(100vh - 96px));display:flex;flex-direction:column;background:var(--dsw-specific-menu,#1f1f22);color:var(--dsw-alias-label-primary,#ececec);border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.25));border-radius:12px;box-shadow:var(--dsw-shadow-lv3,0 12px 40px rgba(0,0,0,.45));overflow:hidden;font-size:13px}
.om-header{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));flex:none}
.om-title{font-weight:600;flex:1}
.om-close{background:transparent;border:none;color:inherit;cursor:pointer;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;padding:0}
.om-close:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.15))}
.om-body{display:flex;flex-direction:column;gap:8px;padding:12px;overflow:auto}
.om-tabs{display:flex;gap:6px}
.om-tab{flex:none;padding:4px 12px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.25));background:transparent;color:var(--dsw-alias-label-secondary,#bbb);cursor:pointer;font-size:12px}
.om-tab[data-active="true"]{background:var(--dsw-alias-fill-l2,rgba(127,127,127,.18));color:var(--dsw-alias-label-primary,#fff)}
.om-prompt{width:100%;box-sizing:border-box;min-height:60px;resize:vertical;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));background:transparent;color:inherit;padding:8px 10px;font:inherit}
.om-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.om-field{display:flex;flex-direction:column;gap:3px;min-width:0}
.om-field > label{font-size:11px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}
.om-input,.om-select{border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.3));background:transparent;color:inherit;padding:5px 8px;font:inherit;max-width:180px}
.om-submit{margin-left:auto}
.om-connwarn{font-size:11px;color:#e0a83a}
.om-error{font-size:12px;color:#e07a7a;white-space:pre-wrap}
.om-results{display:flex;flex-direction:column;gap:10px;margin-top:4px}
.om-result{border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));border-radius:10px;overflow:hidden}
.om-media{display:block;width:100%;height:auto;max-height:280px;object-fit:contain;background:rgba(0,0,0,.25)}
.om-caption{display:flex;gap:8px;align-items:center;padding:6px 8px;font-size:11px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}
.om-pill{flex:none;padding:1px 8px;border-radius:999px;font-size:10px;font-weight:600;background:var(--dsw-alias-fill-l2,rgba(127,127,127,.2))}
.om-pill[data-status="pending"]{color:#e0b23a}
.om-pill[data-status="done"]{color:#69c26f}
.om-pill[data-status="error"]{color:#e07a7a}
.om-note{padding:0 8px 8px;font-size:11px;color:var(--dsw-alias-label-tertiary,#9a9a9a)}
@media (prefers-reduced-motion:reduce){.om-panel{animation:none}}
`;
function injectStyles(pkgTag) {
  if (typeof document === "undefined") return;
  const tagId = `${pkgTag}/panel.css`;
  const quoted = JSON.stringify(tagId);
  if (document.querySelector("style[data-plugin-css=" + quoted + "]") !== null) return;
  const tag = document.createElement("style");
  tag.dataset.plugin = pkgTag;
  tag.dataset.pluginCss = tagId;
  tag.textContent = css;
  document.head.appendChild(tag);
}

// src/client.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var NS = "openrouter-media";
var PACKAGE_ID = "dsh-plugin-openrouter-media";
var name = "openrouter-media-client";
var inject = ["slots", "locale"];
function createMediaStore() {
  let state = {
    results: [],
    inFlight: 0,
    open: false,
    tab: "image",
    models: null,
    connection: true,
    submitError: null
  };
  const listeners = /* @__PURE__ */ new Set();
  const commit = (next) => {
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
      }
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
        inFlight: typeof frame?.inFlight === "number" ? frame.inFlight : results.filter((r) => r.status === "pending").length
      });
    },
    toggleOpen(nextOpen) {
      const open = nextOpen ?? !state.open;
      commit({ ...state, open, submitError: null });
      return open;
    }
  };
}
var zh = {
  "panel.title": "媒体生成",
  "panel.close": "关闭",
  "panel.promptLabel": "描述你想生成的内容",
  "panel.image": "图片",
  "panel.video": "视频",
  "panel.model": "模型",
  "panel.count": "数量",
  "panel.aspect": "宽高比",
  "panel.duration": "时长（秒）",
  "panel.resolution": "分辨率",
  "panel.audio": "生成音频",
  "panel.generate": "生成",
  "panel.generating": "生成中…",
  "panel.disconnected": "面板离线 — 正在重连…",
  "trigger.aria": "打开媒体生成面板",
  "status.pending": "排队/生成中",
  "status.done": "完成",
  "status.error": "失败"
};
var en = {
  "panel.title": "Media generation",
  "panel.close": "Close",
  "panel.promptLabel": "Describe what to generate",
  "panel.image": "Image",
  "panel.video": "Video",
  "panel.model": "Model",
  "panel.count": "Count",
  "panel.aspect": "Aspect ratio",
  "panel.duration": "Duration (s)",
  "panel.resolution": "Resolution",
  "panel.audio": "Generate audio",
  "panel.generate": "Generate",
  "panel.generating": "Generating…",
  "panel.disconnected": "Panel offline — reconnecting…",
  "trigger.aria": "Open the media panel",
  "status.pending": "pending",
  "status.done": "done",
  "status.error": "error"
};
async function fetchModels(store) {
  try {
    const response = await fetch("/x-media/models");
    if (!response.ok) throw new Error(`models fetch failed: ${response.status}`);
    const body = await response.json();
    store.set({ models: body });
  } catch {
    store.set({ models: { images: [], videos: [], limits: { maxImagesPerCall: 4, maxVideoDurationSeconds: 10 } } });
  }
}
async function submitGeneration(store, payload) {
  try {
    const response = await fetch("/x-media/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
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
function MediaTrigger(props) {
  const useMedia = props.useMedia ?? (() => void 0);
  const inFlight = useMedia((state) => state.inFlight);
  const open = useMedia((state) => state.open);
  const wide = props.wide === true;
  const t = props.t ?? ((key) => key);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "button",
    {
      type: "button",
      className: "om-trigger",
      "aria-label": t("trigger.aria"),
      title: t("panel.title"),
      "data-open": open ? "true" : "false",
      onClick: () => props.store.toggleOpen(),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "1.5", y: "3.5", width: "9", height: "9", rx: "1.5", stroke: "currentColor", strokeWidth: "1.2" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "4.6", cy: "6.6", r: "1", fill: "currentColor" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2 11l3-3 2.5 2.5L10 8l3.5 3.5", stroke: "currentColor", strokeWidth: "1.2", fill: "none" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12.5 2v4M10.5 4h4", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round" })
        ] }),
        inFlight > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "om-badge", children: inFlight }) : null,
        wide ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: 4, fontSize: 12 }, children: t("panel.title") }) : null
      ]
    }
  );
}
function ResultRow({ result }) {
  const statusPill = /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "om-pill", "data-status": result.status, children: result.status });
  const media = result.status !== "done" || !result.id ? null : result.kind === "video" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", { className: "om-media", controls: true, preload: "metadata", src: `/x-media/asset/${result.id}` }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { className: "om-media", alt: result.prompt, loading: "lazy", src: `/x-media/asset/${result.id}` });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", { className: "om-result", children: [
    media,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figcaption", { className: "om-caption", children: [
      statusPill,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "om-caption-text", children: result.model })
    ] }),
    result.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "om-error", children: result.error }) : null,
    !result.error && result.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "om-note", children: result.note }) : null
  ] });
}
var ASPECT_CHOICES = ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"];
var RESOLUTION_CHOICES = ["480p", "720p", "1080p"];
function MediaPanel(props) {
  const useMedia = props.useMedia ?? (() => void 0);
  const store = props.store;
  const state = useMedia((value) => value);
  const t = props.t ?? ((key) => key);
  const open = state.open;
  (0, import_react.useEffect)(() => {
    if (open && !store.getSnapshot().models) void fetchModels(store);
  }, [open, store]);
  if (!open) return null;
  const models = state.models;
  const limits = models?.limits ?? { maxImagesPerCall: 4, maxVideoDurationSeconds: 10 };
  const isImage = state.tab === "image";
  const modelList = isImage ? models?.images ?? [] : models?.videos ?? [];
  const defaultModel = isImage ? models?.defaultImageModel : models?.defaultVideoModel;
  const results = state.results;
  const onSubmit = async () => {
    const snapshot = store.getSnapshot();
    const promptText = (document.getElementById("om-prompt")?.value ?? "").trim();
    if (!promptText) {
      store.set({ submitError: "Prompt is empty." });
      return;
    }
    const payload = { kind: isImage ? "image" : "video", prompt: promptText };
    const modelSelect = document.getElementById("om-model")?.value;
    if (modelSelect) payload.model = modelSelect;
    if (isImage) {
      const n = Number(document.getElementById("om-count")?.value ?? 1);
      if (Number.isInteger(n) && n >= 1) payload.n = n;
      const aspect = document.getElementById("om-aspect")?.value;
      if (aspect && aspect !== "auto") payload.aspectRatio = aspect;
    } else {
      const duration = Number(document.getElementById("om-duration")?.value ?? 0);
      if (Number.isInteger(duration) && duration >= 1) payload.durationSeconds = Math.min(duration, limits.maxVideoDurationSeconds);
      const resolution = document.getElementById("om-resolution")?.value;
      if (resolution) payload.resolution = resolution;
      const audio = document.getElementById("om-audio")?.checked;
      if (audio != null) payload.generateAudio = audio === true;
    }
    await submitGeneration(store, payload);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "om-panel", role: "dialog", "aria-label": t("panel.title"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "om-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "om-title", children: t("panel.title") }),
      state.connection ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "om-connwarn", children: t("panel.disconnected") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "om-close", "aria-label": t("panel.close"), onClick: () => store.toggleOpen(false), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "12", height: "12", viewBox: "0 0 12 12", fill: "none", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2 2l8 8M10 2l-8 8", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round" }) }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "om-body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "om-tabs", children: ["image", "video"].map((tabKey) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "om-tab",
          "data-active": state.tab === tabKey ? "true" : "false",
          onClick: () => store.set({ tab: tabKey, submitError: null }),
          children: tabKey === "image" ? t("panel.image") : t("panel.video")
        },
        tabKey
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { id: "om-prompt", className: "om-prompt", placeholder: t("panel.promptLabel"), rows: 2, maxLength: 4e3 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "om-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "om-field", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "om-model", children: t("panel.model") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { id: "om-model", className: "om-select", defaultValue: defaultModel ?? "", children: (modelList.length === 0 ? [{ id: "", name: defaultModel ?? "(catalog unavailable)" }] : modelList).map(
            (model) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: model.id, children: model.name || model.id }, model.id || "default")
          ) })
        ] }),
        isImage ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "om-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "om-count", children: t("panel.count") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                id: "om-count",
                className: "om-input",
                type: "number",
                min: "1",
                max: limits.maxImagesPerCall,
                defaultValue: "1",
                style: { width: 56 }
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "om-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "om-aspect", children: t("panel.aspect") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { id: "om-aspect", className: "om-select", children: ASPECT_CHOICES.map((choice) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: choice, children: choice }, choice)) })
          ] })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "om-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "om-duration", children: t("panel.duration") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                id: "om-duration",
                className: "om-input",
                type: "number",
                min: "1",
                max: limits.maxVideoDurationSeconds,
                defaultValue: Math.min(5, limits.maxVideoDurationSeconds),
                style: { width: 56 }
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "om-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "om-resolution", children: t("panel.resolution") }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { id: "om-resolution", className: "om-select", defaultValue: "720p", children: RESOLUTION_CHOICES.map((choice) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: choice, children: choice }, choice)) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "om-field", style: { flexDirection: "row", alignItems: "center", gap: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: "om-audio", type: "checkbox", defaultChecked: true }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { htmlFor: "om-audio", children: t("panel.audio") })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "om-row", children: [
        state.inFlight > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("panel.generating") }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "primary", className: "om-submit", onClick: onSubmit, disabled: state.connection === false, children: t("panel.generate") })
      ] }),
      state.submitError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "om-error", children: state.submitError }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "om-results", children: results.length === 0 ? null : results.map((result) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResultRow, { result }, result.id)) })
    ] })
  ] });
}
function apply(ctx) {
  ctx.effect(() => injectStyles(PACKAGE_ID), "openrouter-media-client: stylesheet");
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "openrouter-media-client: dictionaries");
  const store = createMediaStore();
  ctx.effect(() => {
    const source = new EventSource("/x-media/events");
    source.addEventListener("message", (event) => {
      let frame;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      if (frame?.type === "snapshot") {
        store.applySnapshot(frame);
      }
    });
    source.onopen = () => store.set({ connection: true });
    source.onerror = () => store.set({ connection: false });
    return () => source.close();
  }, "openrouter-media-client: event source");
  const faceFor = () => ({ hooks: { media: store }, store });
  ctx.slots.inject(
    "sidebar.footer.action",
    () => ctx.slots.register(
      {
        name: "sidebar.footer.action",
        id: "openrouter-media-trigger",
        locale: NS,
        inject: faceFor
      },
      MediaTrigger
    )
  );
  ctx.slots.inject(
    "shell.overlay",
    () => ctx.slots.register(
      {
        name: "shell.overlay",
        id: "openrouter-media-panel",
        order: 5,
        locale: NS,
        inject: faceFor
      },
      MediaPanel
    )
  );
}

		return module.exports;
	}
});

