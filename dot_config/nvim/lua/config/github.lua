-- lua/config/github.lua
--
-- GitHub review workflow inside Neovim, via octo.nvim.
-- Read and answer PR review comments + issues without leaving the editor,
-- so you stay in your daily-driver instead of the browser.
--
-- Requires the `gh` CLI on $PATH, authenticated once with `gh auth login`.
-- Picker is Telescope (fuzzy lists of PRs / issues / comments).

local add = MiniDeps.add

later(function()
  -- File-type icons. octo (and the telescope picker) expect this to be present
  -- and crash without it. Needs a Nerd Font in the terminal to render glyphs.
  add({ source = 'nvim-tree/nvim-web-devicons' })

  -- Fuzzy picker. Telescope depends on plenary (its async/util library).
  add({
    source = 'nvim-telescope/telescope.nvim',
    depends = { 'nvim-lua/plenary.nvim' },
  })

  -- The GitHub integration itself. Talks to GitHub through the `gh` CLI.
  add({
    source = 'pwntester/octo.nvim',
    depends = {
      'nvim-telescope/telescope.nvim',
      'nvim-lua/plenary.nvim',
      'nvim-tree/nvim-web-devicons',
    },
  })

  require('octo').setup({
    picker = 'telescope',
    -- Silence the warning when your gh token lacks the projects_v2 scope;
    -- you don't need Projects for reviewing comments.
    suppress_missing_scope = { projects_v2 = true },

    -- Free up <leader>gi inside octo buffers. localleader == leader == Space, so
    -- octo's buffer-local `<localleader>gi` (goto_issue) shadows our global
    -- `<leader>gi` (Octo issue list) whenever a PR/issue buffer is focused.
    -- goto_issue ("jump to issue under cursor") is niche, so disable it
    -- (lhs = "" tells octo to skip the mapping) and let our global win.
    mappings = {
      issue         = { goto_issue = { lhs = '' } },
      pull_request  = { goto_issue = { lhs = '' } },
      review_thread = { goto_issue = { lhs = '' } },
    },
  })

  -- Quality-of-life: stop octo from leaving litter behind.
  -- octo buffers are fetched from GitHub / read-only diffs, so they never need
  -- swap files. The only time you see stale ".swp" + E325 is after octo crashes
  -- (a clean exit removes its own swaps). So: never create swaps for octo
  -- buffers, sweep any crash leftovers on startup, and stop treesitter on the
  -- diff buffers (nvim 0.12's async parser races on octo's fast buffer swaps
  -- and throws "attempt to call method 'range'").
  local grp = vim.api.nvim_create_augroup('octo_qol', { clear = true })

  -- PR / issue buffers (filetype "octo"): no swap.
  vim.api.nvim_create_autocmd('FileType', {
    group = grp,
    pattern = 'octo',
    callback = function(args) vim.bo[args.buf].swapfile = false end,
  })

  -- Review diff + null buffers (named "octo://..." / "octo/null"): no swap,
  -- and no treesitter.
  vim.api.nvim_create_autocmd({ 'BufNew', 'BufFilePost', 'BufWinEnter' }, {
    group = grp,
    callback = function(args)
      local name = vim.api.nvim_buf_get_name(args.buf)
      if name:match('^octo://') or name:match('octo/null$') then
        vim.bo[args.buf].swapfile = false
        pcall(vim.treesitter.stop, args.buf)
      end
    end,
  })

  -- Belt-and-suspenders: clear any octo swap files a previous crash left, so
  -- opening a PR never makes you delete one by hand again. Runs once now (this
  -- loads lazily via `later`, i.e. already past startup).
  local swapdir = vim.fn.stdpath('state') .. '/swap'
  for _, f in ipairs(vim.fn.glob(swapdir .. '/*octo*', true, true)) do
    pcall(vim.fn.delete, f)
  end

  -- Entry points (mnemonic: g = GitHub).
  local map = vim.keymap.set
  map('n', '<leader>gp', '<cmd>Octo pr list<cr>',      { desc = 'GitHub: list open PRs' })
  -- Capital P = broader: every state, not just open. Repo-aware (current remote).
  map('n', '<leader>gP', function()
    require('octo.picker').prs({ states = { 'OPEN', 'CLOSED', 'MERGED' } })
  end, { desc = 'GitHub: list ALL PRs (open/closed/merged)' })
  map('n', '<leader>gi', '<cmd>Octo issue list<cr>',   { desc = 'GitHub: list issues' })
  map('n', '<leader>gr', '<cmd>Octo review start<cr>', { desc = 'GitHub: start review' })
  map('n', '<leader>gs', '<cmd>Octo search<cr>',       { desc = 'GitHub: search' })
end)
