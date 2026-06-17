-- ~/.config/nvim/lua/config/keymaps.lua

local map = vim.keymap.set

-- Leader key
vim.g.mapleader = ' '
vim.g.maplocalleader = ' '

-- Better navigation
map('n', '<C-h>', '<C-w>h', { desc = 'Move to left window' })
map('n', '<C-j>', '<C-w>j', { desc = 'Move to lower window' })
map('n', '<C-k>', '<C-w>k', { desc = 'Move to upper window' })
map('n', '<C-l>', '<C-w>l', { desc = 'Move to right window' })

-- Quick save/quit
map('n', '<leader>w', '<cmd>w<cr>', { desc = 'Save' })
map('n', '<leader>q', '<cmd>q<cr>', { desc = 'Quit' })

-- Clear search highlight
map('n', '<Esc>', '<cmd>nohlsearch<cr>')

-- Open the Neovim cheatsheet (living reference of what's installed + keymaps)
map('n', '<leader>?', function()
  vim.cmd.edit(vim.fn.stdpath('config') .. '/CHEATSHEET.md')
end, { desc = 'Open Neovim cheatsheet' })

-- Toggle line wrapping
map('n', '<leader>ww', '<cmd>set wrap!<cr>', { desc = 'Toggle line wrap' })

-- Better indenting (stay in visual mode)
map('v', '<', '<gv')
map('v', '>', '>gv')

-- mini.files
-- Toggle helper: close the explorer if it's open, otherwise open it at `path`.
local function explorer_toggle(path)
  local MiniFiles = require('mini.files')
  if not MiniFiles.close() then
    MiniFiles.open(path)
  end
end

-- <leader>e: ALWAYS anchored at the working directory. Reliable from anywhere.
-- The old version opened at the current buffer's path, which breaks when focus
-- is in a terminal (term://...) or an Octo issue/PR (octo://...) — those aren't
-- real file paths. cwd is always a valid directory, so this never errors.
map('n', '<leader>e', function()
  explorer_toggle(vim.fn.getcwd())
end, { desc = 'File explorer (cwd)' })

-- <leader>E: reveal the current file in the tree when the buffer is a real file
-- on disk; otherwise fall back to cwd (so this can't error either).
map('n', '<leader>E', function()
  local name = vim.api.nvim_buf_get_name(0)
  local path = (name ~= '' and vim.loop.fs_stat(name)) and name or vim.fn.getcwd()
  explorer_toggle(path)
end, { desc = 'File explorer (reveal current file)' })
