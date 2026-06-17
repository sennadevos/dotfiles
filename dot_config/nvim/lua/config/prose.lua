-- lua/config/prose.lua
--
-- Natural-language writing setup, applied ONLY to prose filetypes so code
-- buffers keep their LSP completion untouched:
--   * spell check in English + Dutch  (underlines, `z=` suggestions, `]s`/`[s`)
--   * completion from a merged EN+NL dictionary instead of just buffer words
--
-- The dictionary lives at <data>/dict/en-nl.txt (built from the system English
-- word list + the OpenTaal Dutch word list). The Dutch spell file is at
-- <config>/spell/nl.utf-8.spl; English ships with Neovim.

local dict = vim.fn.stdpath('data') .. '/dict/en-nl.txt'

vim.api.nvim_create_autocmd('FileType', {
  pattern = { 'markdown', 'text', 'gitcommit', 'mail', 'rst' },
  group = vim.api.nvim_create_augroup('prose', { clear = true }),
  callback = function()
    vim.opt_local.spell = true
    vim.opt_local.spelllang = 'en,nl'
    vim.opt_local.dictionary = dict
    vim.opt_local.infercase = true  -- adapt completion case to what you typed

    -- Dictionary completion is ON DEMAND: scanning the 800k-word list on every
    -- auto-popup was laggy. So auto-completion stays on fast buffer words, and
    -- you pull dictionary words only when you ask. <C-Space> is free in prose
    -- (mini.completion's two-step needs an LSP, which prose has none of), so we
    -- repurpose it here. The native <C-x><C-k> still works too.
    vim.keymap.set('i', '<C-Space>', '<C-x><C-k>',
      { buffer = true, desc = 'Dictionary completion (EN+NL)' })
  end,
})
