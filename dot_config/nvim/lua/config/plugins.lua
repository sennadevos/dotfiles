local add = MiniDeps.add

later(function()
  require('mini.files').setup({
    mappings = {
      close       = 'q',
      go_in       = 'l',
      go_in_plus  = '<CR>',
      go_out      = 'h',
      go_out_plus = 'H',
      reset       = '<BS>',
      reveal_cwd  = '@',
      show_help   = 'g?',
      synchronize = '=',
      trim_left   = '<',
      trim_right  = '>',
    },
    options = {
      use_as_default_explorer = true,
      permanent_delete = false,  -- Move to trash instead
    },
    windows = {
      preview = true,
      width_focus = 30,
      width_preview = 40,
    },
  })
end)

-- vim-tmux-navigator: C-h/j/k/l moves between vim splits AND tmux panes,
-- whichever lies in that direction. The tmux half lives in tmux/tmux.conf;
-- both halves are required. The plugin defines the C-h/j/k/l and C-\ normal
-- mode maps itself, which is why keymaps.lua no longer sets them.
-- Loaded eagerly (not in later()) so navigation works on the first keypress.
add({ source = 'christoomey/vim-tmux-navigator' })

-- Markdown Table Mode
add({ source = 'dhruvasagar/vim-table-mode' })
vim.api.nvim_set_keymap('n', '<Leader>tm', ':TableModeToggle<CR>', { noremap = true, silent = true })
