-- markdown-preview.lua
--
-- Open the current buffer's file as a rendered Markdown preview in the browser,
-- using the running go-grip user service.
--
-- This file is part of the go-grip-preview repo. Its install.sh symlinks it to
-- ~/.config/nvim/lua/config/markdown-preview.lua and adds a require for it.
-- It depends on `preview-md` being on $PATH (install.sh symlinks that too).
--
--   :MarkdownPreview   open the current file in the browser
--   <leader>pm         same, via keymap

local function preview_current_file()
  local file = vim.fn.expand('%:p')
  if file == '' then
    vim.notify('[markdown-preview] current buffer has no file on disk', vim.log.levels.WARN)
    return
  end

  vim.system({ 'preview-md', file }, { text = true }, function(out)
    if out.code ~= 0 then
      vim.schedule(function()
        local msg = out.stderr ~= '' and out.stderr or 'failed to open preview'
        vim.notify('[markdown-preview] ' .. msg, vim.log.levels.ERROR)
      end)
    end
  end)
end

vim.api.nvim_create_user_command('MarkdownPreview', preview_current_file, {
  desc = 'Open current file as Markdown preview in the browser (go-grip)',
})

vim.keymap.set('n', '<leader>pm', preview_current_file, {
  desc = 'Markdown preview in browser',
})
