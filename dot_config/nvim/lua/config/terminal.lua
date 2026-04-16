-- Toggle terminal on bottom with <leader>t
local map = vim.keymap.set
local term_buf = nil

local function toggle_terminal()
  -- Check if terminal window is already open
  for _, win in ipairs(vim.api.nvim_list_wins()) do
    local buf = vim.api.nvim_win_get_buf(win)
    if vim.bo[buf].buftype == 'terminal' then
      vim.api.nvim_win_close(win, false)
      return
    end
  end
  
  -- Open terminal at bottom
  vim.cmd('botright 15split')
  
  -- If we have an existing terminal buffer, use it
  if term_buf and vim.api.nvim_buf_is_valid(term_buf) then
    vim.api.nvim_win_set_buf(0, term_buf)
  else
    -- Create new terminal
    vim.cmd('terminal')
    term_buf = vim.api.nvim_get_current_buf()
  end
  
  vim.cmd('startinsert')
end

map('n', '<leader>t', toggle_terminal, { desc = 'Toggle terminal' })

-- Easy exit from terminal mode
map('t', '<Esc><Esc>', '<C-\\><C-n>', { desc = 'Exit terminal mode' })

-- Navigate between windows from terminal mode (optional but recommended)
map('t', '<C-h>', '<C-\\><C-n><C-w>h')
map('t', '<C-j>', '<C-\\><C-n><C-w>j')
map('t', '<C-k>', '<C-\\><C-n><C-w>k')
map('t', '<C-l>', '<C-\\><C-n><C-w>l')

