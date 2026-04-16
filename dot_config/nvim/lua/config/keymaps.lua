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

-- Better indenting (stay in visual mode)
map('v', '<', '<gv')
map('v', '>', '>gv')

-- mini.files
map('n', '<leader>e', function()
  local MiniFiles = require('mini.files')
  if not MiniFiles.close() then
    MiniFiles.open(vim.api.nvim_buf_get_name(0))  -- Open at current file
  end
end, { desc = 'Toggle file explorer' })

map('n', '<leader>E', function()
  require('mini.files').open(vim.loop.cwd(), true)  -- Open at cwd
end, { desc = 'Explorer (cwd)' })
