-- lua/config/completion.lua

-- Safe setup for mini.completion
later(function() 
  require('mini.completion').setup({
     -- your settings here
  })
end)

local add = MiniDeps.add

-- For syntax highlighting
add({
  source = 'nvim-treesitter/nvim-treesitter',
  hooks = { post_checkout = function() vim.cmd('TSUpdate') end },
})

-- Configurations for the Nvim LSP client
add('neovim/nvim-lspconfig')

-- -----------------------------------------------------------------------
-- 3. SETUP SYNTAX HIGHLIGHTING (Treesitter)
-- -----------------------------------------------------------------------
require('nvim-treesitter.configs').setup({
  -- Automatically install C and C++ parsers
  ensure_installed = { "c", "cpp", "lua", "vim", "vimdoc" },
  
  -- Enable the highlighting
  highlight = { enable = true },
})

-- -----------------------------------------------------------------------
-- 4. SETUP AUTOCOMPLETION (mini.completion)
-- -----------------------------------------------------------------------
require('mini.completion').setup({
  -- Delay (in ms) before showing completion window. 
  -- Set to 0 for instant results, or 100-300 for less distraction.
  delay = { completion = 100, info = 100, signature = 50 },

  -- The default window config
  window = {
    info = { height = 25, width = 80, border = 'single' },
    signature = { height = 25, width = 80, border = 'single' },
  },

  -- Fallback action keys (optional)
  mappings = {
    force_twostep = '<C-Space>', -- Force menu to appear
    force_fallback = '<A-Space>', -- Force fallback completion (words in buffer)
  },
})

-- -----------------------------------------------------------------------
-- 5. CONNECT LSP (Clangd)
-- -----------------------------------------------------------------------
local lspconfig = require('lspconfig')

-- Configure clangd for C/C++
lspconfig.clangd.setup({
  -- This function runs when clangd attaches to a C/C++ buffer
  on_attach = function(client, bufnr)
    -- Enable completion triggered by <C-x><C-o> 
    -- (mini.completion uses this automatically, but this ensures it's set)
    vim.api.nvim_buf_set_option(bufnr, 'omnifunc', 'v:lua.vim.lsp.omnifunc')

    -- KEYMAPPINGS (Standard LSP)
    local opts = { buffer = bufnr }
    vim.keymap.set('n', 'gd', vim.lsp.buf.definition, opts)     -- Go to Definition
    vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)            -- Hover documentation
    vim.keymap.set('n', '<leader>rn', vim.lsp.buf.rename, opts)  -- Rename variable
  end,
})
