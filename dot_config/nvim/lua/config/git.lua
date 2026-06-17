-- lua/config/git.lua
--
-- Local git workflow. Mnemonic prefix: <leader>d = diff / local git
-- (octo owns <leader>g for the GitHub/remote side).
--   * diffview.nvim - side-by-side diffs of working tree, commits, branches,
--                     and per-file history.
--   * neogit        - Magit-style status buffer: stage/unstage, commit, push,
--                     pull, branch — drives diffview for its diffs.
--
-- Beyond the keymaps: `:DiffviewOpen <rev>` diffs against any revision/range,
-- e.g. `:DiffviewOpen origin/develop...HEAD` or `:DiffviewOpen HEAD~3`.

local add = MiniDeps.add

later(function()
  add({
    source = 'sindrets/diffview.nvim',
    depends = { 'nvim-lua/plenary.nvim' },
  })

  require('diffview').setup({})

  -- Magit-style git interface. Reuses plenary + diffview (already pulled above)
  -- and telescope (from github.lua) for its pickers.
  add({
    source = 'NeogitOrg/neogit',
    depends = {
      'nvim-lua/plenary.nvim',
      'sindrets/diffview.nvim',
      'nvim-telescope/telescope.nvim',
    },
  })

  require('neogit').setup({})

  local map = vim.keymap.set

  -- Toggle the working-tree diff view (vs HEAD).
  map('n', '<leader>dv', function()
    if next(require('diffview.lib').views) == nil then
      vim.cmd('DiffviewOpen')
    else
      vim.cmd('DiffviewClose')
    end
  end, { desc = 'Diffview: toggle working-tree diff' })

  -- History of the current file.
  map('n', '<leader>dh', '<cmd>DiffviewFileHistory %<cr>', { desc = 'Diffview: current file history' })

  -- Neogit status buffer (stage/commit/push/...).
  map('n', '<leader>dn', '<cmd>Neogit<cr>', { desc = 'Neogit: open status' })
end)
