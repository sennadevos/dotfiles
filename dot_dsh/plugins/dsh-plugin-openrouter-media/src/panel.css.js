// Stylesheet for the openrouter-media panel, injected at materialization
// with the verified <style data-plugin> pattern (see dsh-client-ui-jobs).
const css = `
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

/** Inject the stylesheet once per bundle rev (verified jobs pattern). */
export function injectStyles(pkgTag) {
  if (typeof document === 'undefined') return;
  const tagId = `${pkgTag}/panel.css`;
  const quoted = JSON.stringify(tagId);
  if (document.querySelector('style[data-plugin-css=' + quoted + ']') !== null) return;
  const tag = document.createElement('style');
  tag.dataset.plugin = pkgTag;
  tag.dataset.pluginCss = tagId;
  tag.textContent = css;
  document.head.appendChild(tag);
}
