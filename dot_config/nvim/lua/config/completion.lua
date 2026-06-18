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

-- Switch between a C/C++ source and its header. Tries clangd's
-- textDocument/switchSourceHeader first, but clangd misses the ESP-IDF layout
-- (source in the component root, header in an include/ subdir) when going
-- .c -> .h, so on an empty result we fall back to a basename search across
-- common sibling dirs and the buffer's `path` (the compile_commands include
-- dirs that config.cnav populates).
local function switch_source_header(bufnr)
  bufnr = bufnr or 0
  local name = vim.api.nvim_buf_get_name(bufnr)
  local stem = vim.fn.fnamemodify(name, ':t:r')
  local ext  = vim.fn.fnamemodify(name, ':e')
  local src_exts = { 'c', 'cc', 'cpp', 'cxx', 'm', 'mm' }
  local hdr_exts = { 'h', 'hh', 'hpp', 'hxx' }
  local want = vim.tbl_contains(src_exts, ext) and hdr_exts or src_exts

  local function open_counterpart()
    local dir = vim.fn.fnamemodify(name, ':h')
    local roots = { dir, dir .. '/include', dir .. '/../include', dir .. '/..', dir .. '/src', dir .. '/../src' }
    for _, e in ipairs(want) do
      for _, r in ipairs(roots) do
        local cand = r .. '/' .. stem .. '.' .. e
        if vim.uv.fs_stat(cand) then
          vim.cmd.edit(vim.fn.fnamemodify(cand, ':p'))
          return true
        end
      end
      local found = vim.fn.findfile(stem .. '.' .. e, vim.bo[bufnr].path)
      if found ~= '' then
        vim.cmd.edit(vim.fn.fnamemodify(found, ':p'))
        return true
      end
    end
    return false
  end

  local c = vim.lsp.get_clients({ name = 'clangd', bufnr = bufnr })[1]
  if not c then
    if not open_counterpart() then vim.notify('no paired source/header found', vim.log.levels.INFO) end
    return
  end
  c:request('textDocument/switchSourceHeader', { uri = vim.uri_from_bufnr(bufnr) }, function(err, result)
    if not err and result then
      vim.cmd.edit(vim.uri_to_fname(result))
    elseif not open_counterpart() then
      vim.notify('no paired source/header found', vim.log.levels.INFO)
    end
  end, bufnr)
end

vim.api.nvim_create_autocmd('LspAttach', {
  callback = function(ev)
    local opts = { buffer = ev.buf }
    vim.keymap.set('n', 'gd',         vim.lsp.buf.definition,     opts)  -- go to definition (in C: the function body / "implementation")
    vim.keymap.set('n', 'gi',         vim.lsp.buf.implementation, opts)  -- go to implementation (C++ overrides; empty for plain C — use gd)
    vim.keymap.set('n', 'K',          vim.lsp.buf.hover,          opts)  -- hover docs
    vim.keymap.set('n', '<leader>rn', vim.lsp.buf.rename,         opts)  -- rename symbol

    -- Switch source <-> header (.c/.h). clangd first, path-based fallback for
    -- the ESP-IDF include/ layout it can't pair from the .c side.
    vim.keymap.set('n', '<leader>o', function() switch_source_header(0) end, opts)
  end,
})

-- clangd for C/C++. Only enabled when the binary is actually present, so this
-- stays quiet until clangd is on $PATH (it now lives in ~/.local/bin).
if vim.fn.executable('clangd') == 1 then
  vim.lsp.enable('clangd')
end
