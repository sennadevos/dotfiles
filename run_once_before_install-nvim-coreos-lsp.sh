#!/bin/bash
set -euo pipefail
# Language servers backing config/nvim/lua/config/coreos.lua: schema-aware
# editing of Butane (.bu, YAML) and Ignition (.ign, JSON) provisioning configs.
#
# Both are npm packages. Installed with an explicit --prefix so they land in
# ~/.local/bin alongside clangd rather than npm's default /usr/local, which
# needs root on an rpm-ostree host. npm's own global config is left untouched.
#
# Idempotent: npm -g reinstalls in place, so re-running just updates them.
mkdir -p "$HOME/.local"
npm install -g --prefix "$HOME/.local" \
    yaml-language-server \
    vscode-langservers-extracted
