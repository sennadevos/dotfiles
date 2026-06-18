-- lua/config/cnav.lua
--
-- Make built-in goto-file (`gf`) resolve C/C++ #include targets in projects that
-- ship a compile_commands.json (e.g. ESP-IDF). By default Neovim's `path` is just
-- ".,/usr/include,," — so `gf` on `#include "actuators/fan.h"` or
-- `#include "freertos/FreeRTOS.h"` finds nothing. We pull the real -I/-isystem
-- dirs out of compile_commands.json and feed them to the buffer's `path`, so `gf`
-- (and `[i`, `:find`, `gd`-fallback, ...) jump straight to the header.
--
-- Only dirs that actually exist are added, so it adapts to where clangd runs:
--   * on the host you get the project's components/ + managed_components/,
--   * inside the esp-idf distrobox you additionally get /opt/esp/idf/... (which
--     exists only there).
-- Parsed once per compile_commands.json and cached (keyed by path + mtime).
--
-- This is independent of clangd: clangd's `gd` on an #include line also opens the
-- file, but `gf` works even before/without the language server.

local uv = vim.uv or vim.loop

-- cc_path -> { mtime = <sec>, path = <comma-joined dirs> }
local cache = {}

-- Walk up from `dir` to find compile_commands.json (project root or build/).
local function find_db(dir)
  while dir and dir ~= '' and dir ~= '/' do
    for _, rel in ipairs({ '/compile_commands.json', '/build/compile_commands.json' }) do
      local p = dir .. rel
      if uv.fs_stat(p) then return p end
    end
    dir = vim.fs.dirname(dir)
  end
end

-- Union of existing include dirs across every translation unit in the DB.
local function include_path(cc_path)
  local st = uv.fs_stat(cc_path)
  local mtime = st and st.mtime.sec or 0
  local hit = cache[cc_path]
  if hit and hit.mtime == mtime then return hit.path end

  local f = io.open(cc_path, 'r')
  if not f then return nil end
  local ok, db = pcall(vim.json.decode, f:read('*a'))
  f:close()
  if not ok or type(db) ~= 'table' then return nil end

  local seen, dirs = {}, {}
  for _, e in ipairs(db) do
    local args = e.arguments
    if not args and e.command then args = vim.split(e.command, '%s+', { trimempty = true }) end
    for i = 1, #(args or {}) do
      local a = args[i]
      local inc
      if a:sub(1, 2) == '-I' and #a > 2 then
        inc = a:sub(3)
      elseif a == '-I' or a == '-isystem' then
        inc = args[i + 1]
      end
      if inc and not seen[inc] and uv.fs_stat(inc) then
        seen[inc] = true
        dirs[#dirs + 1] = inc
      end
    end
  end

  local path = table.concat(dirs, ',')
  cache[cc_path] = { mtime = mtime, path = path }
  return path
end

vim.api.nvim_create_autocmd('FileType', {
  pattern = { 'c', 'cpp' },
  group = vim.api.nvim_create_augroup('cnav', { clear = true }),
  callback = function(ev)
    local name = vim.api.nvim_buf_get_name(ev.buf)
    local start = (name ~= '' and uv.fs_stat(name)) and vim.fs.dirname(name) or uv.cwd()
    local cc = find_db(start)
    if not cc then return end
    local extra = include_path(cc)
    if not extra or extra == '' then return end
    -- '.' = the file's own dir, then every DB include dir, then '' fallback.
    vim.opt_local.path = '.,' .. extra .. ','
  end,
})
