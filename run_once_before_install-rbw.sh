#!/bin/bash
set -euo pipefail
# Build rbw (unofficial Rust Bitwarden CLI) in a throwaway toolbox. Fedora has no
# rbw package and upstream ships no binaries, so cargo-build it here.
# rbw is used over the official `bw` CLI because it keeps an unlock agent alive
# (rbw-agent + pinentry), so bw-menu doesn't have to juggle session tokens.
# Idempotent: leftovers from a previous or aborted run are wiped up front, and
# the toolbox is torn down on exit no matter how we leave.
TOOLBOX="rbw-build"

cleanup() { toolbox rm -f "$TOOLBOX" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup   # start from a clean slate

toolbox create -y "$TOOLBOX"
toolbox run -c "$TOOLBOX" sudo dnf install -y cargo rust \
    openssl-devel pkgconf-pkg-config gcc

mkdir -p "$HOME/.local/bin"
# --root drops rbw + rbw-agent straight into ~/.local (shared into the toolbox
# via $HOME), so there's no copy step and re-runs just overwrite.
toolbox run -c "$TOOLBOX" cargo install --locked --root "$HOME/.local" rbw
