-- ~/.config/nvim/init.lua

-- Clone mini.nvim if not installed
local path_package = vim.fn.stdpath('data') .. '/site/'
local mini_path = path_package .. 'pack/deps/start/mini.nvim'

if not vim.loop.fs_stat(mini_path) then
  vim.cmd('echo "Installing mini.nvim..." | redraw')
  local clone_cmd = {
    'git', 'clone', '--filter=blob:none',
    'https://github.com/echasnovski/mini.nvim', mini_path
  }
  vim.fn.system(clone_cmd)
  vim.cmd('packadd mini.nvim | helptags ALL')
end

-- Set up mini.deps
require('mini.deps').setup({ path = { package = path_package } })

-- To make these globally available
_G.add = MiniDeps.add
_G.now = MiniDeps.now
_G.later = MiniDeps.later

-- Load config files
require('config.keymaps')
require('config.options')
require('config.plugins')
require('config.completion')
require('config.terminal')
require('config.github')
require('config.prose')
require('config.git')
pcall(require, 'config.markdown-preview')  -- from go-grip-preview repo (symlinked)

-- Disable arrow keys in Normal mode
vim.keymap.set('n', '<Up>', '<cmd>echo "Use k!"<CR>')
vim.keymap.set('n', '<Down>', '<cmd>echo "Use j!"<CR>')
vim.keymap.set('n', '<Left>', '<cmd>echo "Use h!"<CR>')
vim.keymap.set('n', '<Right>', '<cmd>echo "Use l!"<CR>')
