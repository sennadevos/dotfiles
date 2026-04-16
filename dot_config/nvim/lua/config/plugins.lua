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

-- Markdown Table Mode
add({ source = 'dhruvasagar/vim-table-mode' })
vim.api.nvim_set_keymap('n', '<Leader>tm', ':TableModeToggle<CR>', { noremap = true, silent = true })
