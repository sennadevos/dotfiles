-- lua/config/coreos.lua
--
-- Butane (.bu) and Ignition (.ign) support: filetype detection + schema-backed
-- LSP, so provisioning configs get completion, hover docs and validation
-- instead of being edited blind.
--
--   * .bu  -> yaml,  yaml-language-server  + the SchemaStore Butane schema
--   * .ign -> json,  vscode-json-language-server + the upstream Ignition schema
--
-- Both servers are npm packages living in ~/.local/bin (installed with
--   npm install -g --prefix ~/.local yaml-language-server vscode-langservers-extracted
-- ). As with clangd in config.completion, each is enabled only when its binary
-- is actually present, so this file is safe to load on a machine without them.

-- ---------------------------------------------------------------------------
-- Filetype detection
-- ---------------------------------------------------------------------------
-- Neovim 0.12 knows neither extension. Butane configs are YAML, Ignition
-- configs are JSON; mapping them onto those filetypes is what lets the servers
-- (and treesitter highlighting) attach at all.
vim.filetype.add({
  extension = {
    bu  = 'yaml',
    ign = 'json',
  },
})

-- ---------------------------------------------------------------------------
-- Butane -> yaml-language-server
-- ---------------------------------------------------------------------------
-- The Butane schema is a dispatcher: it reads `variant` + `version` from the
-- document and $refs the matching per-version sub-schema (fcos 1.4.0-1.7.0,
-- flatcar 1.1.0), so a config is validated against its own spec version rather
-- than a lowest common denominator. That means the server needs network access
-- on first open to resolve the remote $ref; it caches afterwards.
--
-- The mapping is keyed on the schema URL -> glob, which is yaml-language-server's
-- own `schemas` format. SchemaStore already maps *.bu to this same schema, but
-- pinning it here means it works even with the catalog disabled or unreachable.
if vim.fn.executable('yaml-language-server') == 1 then
  vim.lsp.config('yamlls', {
    settings = {
      yaml = {
        schemas = {
          ['https://relativ-it.github.io/Butane-Schemas/Butane-Schema.json'] = '*.bu',
        },
        -- Keep SchemaStore on for every other YAML file (compose, workflows, ...).
        schemaStore = { enable = true, url = 'https://www.schemastore.org/api/json/catalog.json' },
        validate = true,
        completion = true,
        hover = true,
      },
    },
  })
  vim.lsp.enable('yamlls')
end

-- ---------------------------------------------------------------------------
-- Ignition -> vscode-json-language-server
-- ---------------------------------------------------------------------------
-- .ign files are butane's *output* and normally machine-generated, so this is
-- mostly a reading aid: hover docs and a red squiggle when a hand-edit or a
-- rendering bug produces something the spec doesn't allow.
--
-- Ignition ships one schema per config version and they're not
-- version-dispatched the way Butane's is, so we pin v3_6 (current stable, and
-- what recent FCOS consumes). Bump the path if you move to a newer spec.
if vim.fn.executable('vscode-json-language-server') == 1 then
  vim.lsp.config('jsonls', {
    settings = {
      json = {
        schemas = {
          {
            fileMatch = { '*.ign' },
            url = 'https://raw.githubusercontent.com/coreos/ignition/main/config/v3_6/schema/ignition.json',
          },
        },
        validate = { enable = true },
      },
    },
  })
  vim.lsp.enable('jsonls')
end
