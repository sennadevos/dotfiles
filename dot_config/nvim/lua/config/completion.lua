-- lua/config/completion.lua
--
-- Completion + syntax + LSP, kept deliberately small:
--   * mini.completion   - the completion engine (LSP-aware, with buffer fallback)
--   * nvim-treesitter   - syntax highlighting / better parsing
--   * nvim-lspconfig    - language-server wiring (clangd for the ESP-IDF C/C++ work)
--
-- LSP attaches only when the server binary exists on $PATH, so this file is
-- safe to load even before you've installed clangd/lua-language-server/etc.

local add = MiniDeps.add

-- ---------------------------------------------------------------------------
-- Plugins
-- ---------------------------------------------------------------------------

-- Treesitter: pin the `master` branch. The default branch was rewritten to a
-- new API and would break `require('nvim-treesitter.configs')` below.
add({
  source = 'nvim-treesitter/nvim-treesitter',
  checkout = 'master',
  monitor = 'main',
  hooks = { post_checkout = function() vim.cmd('TSUpdate') end },
})

add('neovim/nvim-lspconfig')

-- ---------------------------------------------------------------------------
-- Syntax highlighting (Treesitter)
-- ---------------------------------------------------------------------------
require('nvim-treesitter.configs').setup({
  ensure_installed = { 'c', 'cpp', 'lua', 'vim', 'vimdoc' },
  highlight = { enable = true },
})

-- Work around a crash in nvim-treesitter's `master` branch (frozen — we're
-- already at its tip) on Neovim 0.12. Its markdown fenced-code-block injection
-- directive `set-lang-from-info-string!` assumes the query match hands it a
-- single TSNode, but 0.12 passes the capture differently, so get_node_text ends
-- up calling :range() on a non-node and throws, intermittently while editing
-- markdown with code fences:
--     Decoration provider "conceal_line" ... attempt to call method 'range' (a nil value)
-- Re-register the directive ourselves (force = true beats the plugin's, and
-- this runs after it, so ours wins). The handler normalises the match to a
-- node, pcall-guards the text lookup, and resolves the fence language the same
-- way the plugin does (filetype match on "a.<alias>"). Drop this whole block if
-- we ever migrate to nvim-treesitter's `main` branch, which fixes the API.
require('nvim-treesitter.query_predicates')  -- force the buggy directive to register first
vim.treesitter.query.add_directive('set-lang-from-info-string!', function(match, _, bufnr, pred, metadata)
  local node = match[pred[2]]
  if type(node) == 'table' then node = node[#node] end  -- 0.12 hands a node-list
  if not node then return end
  local ok, text = pcall(vim.treesitter.get_node_text, node, bufnr)
  if not ok or type(text) ~= 'string' then return end
  local alias = text:lower()
  metadata['injection.language'] = vim.filetype.match({ filename = 'a.' .. alias }) or alias
end, { force = true, all = false })

-- ---------------------------------------------------------------------------
-- Completion engine (mini.completion)
-- ---------------------------------------------------------------------------
-- menuone: show the menu even for a single match; noselect: don't auto-insert.
vim.opt.completeopt = 'menuone,noselect'

require('mini.completion').setup({
  -- Delay (ms) before the completion / info / signature windows appear.
  delay = { completion = 100, info = 100, signature = 50 },

  window = {
    info      = { height = 25, width = 80, border = 'single' },
    signature = { height = 25, width = 80, border = 'single' },
  },

  mappings = {
    force_twostep  = '<C-Space>',  -- force the LSP menu to appear
    force_fallback = '<A-Space>',  -- force buffer-word fallback completion
  },
})

-- ---------------------------------------------------------------------------
-- LSP servers  (Neovim 0.11 native API)
-- ---------------------------------------------------------------------------
-- nvim-lspconfig now just ships the server definitions in lsp/<name>.lua;
-- we activate them with vim.lsp.enable() instead of the old `.setup()` shim.
-- Buffer-local keymaps are wired once, on attach, for whichever server lands.
vim.api.nvim_create_autocmd('LspAttach', {
  callback = function(ev)
    local opts = { buffer = ev.buf }
    vim.keymap.set('n', 'gd',         vim.lsp.buf.definition, opts)  -- go to definition
    vim.keymap.set('n', 'K',          vim.lsp.buf.hover,      opts)  -- hover docs
    vim.keymap.set('n', '<leader>rn', vim.lsp.buf.rename,     opts)  -- rename symbol
  end,
})

-- clangd for C/C++. Only enabled when the binary is actually present, so this
-- stays quiet until clangd is on $PATH (it now lives in ~/.local/bin).
if vim.fn.executable('clangd') == 1 then
  vim.lsp.enable('clangd')
end
