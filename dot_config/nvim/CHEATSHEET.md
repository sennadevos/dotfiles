# Neovim Cheatsheet

Open this any time with **`<leader>?`**. Preview it rendered with **`<leader>pm`**.
Leader = `<Space>`. Localleader = `<Space>` too (so `<localleader>x` = `<Space>x`).

This is a **living doc** — every time we add a plugin or keymap, it gets a row
here. The **Use?** column is your bloat audit: be honest, and if something stays
"❌ never" for a couple weeks, rip it out. See the audit note at the bottom.

---

## Installed plugins

| Plugin | What it gives you | Entry point | Use? |
|---|---|---|---|
| **mini.nvim** › mini.files | File explorer | `<leader>e` / `<leader>E` | ✅ |
| **mini.nvim** › mini.completion | Completion engine (LSP + dict/buffer fallback) | automatic | ✅ |
| **nvim-treesitter** | Syntax highlighting (c, cpp, lua, vim, vimdoc) | automatic | ✅ |
| **nvim-lspconfig** + clangd | C/C++ code intelligence | `gd` `K` `<leader>rn` | 🟡 trial |
| **telescope** + plenary | Fuzzy picker (powers octo) | via octo | ✅ |
| **nvim-web-devicons** | File-type icons (octo/telescope dep) | — | ✅ dep |
| **octo.nvim** | GitHub PRs/issues in the editor | `<leader>g*` | 🟡 trial |
| **diffview.nvim** | Side-by-side git diffs + file history | `<leader>d*` | 🆕 new |
| **neogit** | Magit-style git: stage / commit / push | `<leader>dn` | 🆕 new |
| **vim-table-mode** | Markdown table autoformat | `<leader>tm` | 🟡 trial |
| dictionaries (EN+NL) | Prose word completion + spell | automatic in prose | 🆕 new |

---

## Core

| Key | Action |
|---|---|
| `<leader>w` / `<leader>q` | save / quit |
| `<C-h/j/k/l>` | move between windows (works from terminal too) |
| `<Esc>` | clear search highlight |
| `<leader>ww` | toggle line wrap |
| `<` / `>` (visual) | reindent, keep selection |
| arrows | disabled — use `h j k l` |
| `<leader>?` | open this cheatsheet |

## Files — mini.files

| Key | Action |
|---|---|
| `<leader>e` | explorer at **cwd** (always works — terminals, octo, etc.) |
| `<leader>E` | explorer revealing the **current file** (falls back to cwd) |
| `l` / `h` | into / out of directory · `<CR>` open · `q` close · `=` sync changes |

## Terminal

| Key | Action |
|---|---|
| `<leader>t` | toggle bottom terminal |
| `<Esc><Esc>` | leave terminal mode |

## Writing (Markdown / text / commits) — prose mode

Auto-enabled for `markdown`, `text`, `gitcommit`, `mail`, `rst`.

| Key | Action |
|---|---|
| `<C-Space>` (insert) | **dictionary** completion EN+NL — on demand (also `<C-x><C-k>`) |
| (typing) | auto completion from buffer words (fast) |
| `<C-y>` / `<C-e>` | accept / dismiss any completion popup (then keep typing) |
| `<C-n>` / `<C-p>` | cycle matches while popup is open |
| `z=` | spelling suggestions for word under cursor |
| `]s` / `[s` | next / previous misspelling |
| `zg` / `zw` | mark word good / wrong (personal list) |
| `<leader>tm` | toggle table mode |
| `<leader>pm` | preview Markdown in browser (go-grip) |

## Code (LSP — active when a server like clangd is attached)

| Key | Action |
|---|---|
| `gd` | go to definition |
| `K` | hover docs |
| `<leader>rn` | rename symbol |
| `<C-Space>` | force completion menu |
| `<A-Space>` | force fallback (buffer words / dictionary) |

## GitHub — octo.nvim

Needs `gh auth login` once. Repo = git remote of cwd.

| Key | Action |
|---|---|
| `<leader>gp` / `<leader>gP` | list **open** / **all** PRs (open/closed/merged) |
| `<leader>gi` | list issues |
| `<leader>gr` | start a review |
| `<leader>gs` | search |

**In an issue/PR buffer** (`<localleader>` = `<Space>`):

| Key | Action |
|---|---|
| `]c` / `[c` · `]t` / `[t` | next/prev **comment** · next/prev **thread** |
| `ca` | add comment (visual-select lines first to anchor a range) |
| `cr` | reply to thread under cursor |
| `sa` | reply with a suggestion block (proposes a change to those lines) |
| `:w` | submit the comment window (close without writing = abandon) |
| `rt` / `rT` | resolve / unresolve thread — resolution is per-**thread**, not per-review |
| `r+` | 👍 reaction |
| `gf` → `<C-^>` | jump to the real file at the commented line → back to PR |
| `za` · `zM` / `zR` | fold thread under cursor · collapse / expand all |

**See still-open + read the diff (merged PR, read-only): `:Octo review browse`.**
It loads existing threads and opens the diff **with the file panel** — each file
shows `active: N` (= unresolved). It does **not** start a pending review.
In the panel: `j`/`k` move files · `<CR>` open a file's diff · `<localleader>e` /
`<localleader>b` focus / toggle panel. Note: `pf` (file picker) and `pd` (plain
diff) do **not** show counts — only browse mode does. No grand total; sum the
`active:` bubbles, or use the `gh` GraphQL query in Feedback_Flow.md.

Full review walkthrough: `~/Workspace/Feedback_Flow.md`. All keys: `:h octo-mappings`.

## Git (local diffs) — diffview.nvim

| Key / command | Action |
|---|---|
| `<leader>dv` | toggle working-tree diff (vs HEAD) |
| `<leader>dh` | current file's history |
| `<leader>dn` | open **Neogit** status buffer (stage / commit / push / pull / branch) |
| `:DiffviewOpen <rev>` | diff vs any rev/range, e.g. `origin/develop...HEAD`, `HEAD~3` |
| (in the view) `<Tab>`/`<S-Tab>` | next / previous changed file |
| (in the view) `q` or `:DiffviewClose` | close |

---

## Bloat audit (revisit ~every 2 weeks)

For each 🟡/🆕 above, ask: *did I use it this week?*
- **Yes** → promote to ✅.
- **No, but I want to** → put a real task on it (e.g. actually do a review with octo).
- **No, and meh** → remove the plugin from `lua/config/*.lua` and delete its row.

Current trials to make-or-break:
- [ ] **octo** — do one real feedback pass (see Feedback_Flow.md)
- [ ] **clangd/LSP** — wire `compile_commands.json` in the Rator repo, then use `gd`/`K`
- [ ] **vim-table-mode** — used in a real doc, or drop it
- [ ] **dictionaries** — does prose completion feel helpful or noisy?
- [ ] **diffview** — use it for one real diff/review, or drop it
- [ ] **neogit** — do one real stage/commit cycle through it, or drop it
