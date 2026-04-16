-- ~/.config/nvim/lua/config/options.lua
local opt = vim.opt

-- Line numbers
opt.number = true
opt.relativenumber = false

-- Tabs & indentation
opt.tabstop = 4
opt.shiftwidth = 4
opt.expandtab = true
opt.smartindent = true

-- Search
opt.ignorecase = true
opt.smartcase = true
opt.hlsearch = false

-- Appearance
opt.termguicolors = true
opt.signcolumn = 'yes'
opt.scrolloff = 8
opt.wrap = false

-- Behavior
opt.splitright = true
opt.splitbelow = true
opt.undofile = true
opt.updatetime = 250
opt.timeoutlen = 300

-- Clipboard
opt.clipboard = 'unnamedplus'

-- Disable netrw (if using a file explorer plugin)
vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1

-- Transparent background (use terminal background)
vim.api.nvim_set_hl(0, 'Normal', { bg = 'NONE' })
vim.api.nvim_set_hl(0, 'NormalFloat', { bg = 'NONE' })
vim.api.nvim_set_hl(0, 'NonText', { bg = 'NONE' })
vim.api.nvim_set_hl(0, 'SignColumn', { bg = 'NONE' })
vim.api.nvim_set_hl(0, 'EndOfBuffer', { bg = 'NONE' })
