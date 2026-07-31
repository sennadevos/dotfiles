#!/bin/bash
set -euo pipefail
# Build cliphist (Go) in a throwaway toolbox. Idempotent: the build toolbox is
# wiped up front and torn down on exit, so re-running never trips on leftovers.
TOOLBOX="cliphist-build"

cleanup() { toolbox rm -f "$TOOLBOX" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

toolbox create -y "$TOOLBOX"
toolbox run -c "$TOOLBOX" sudo dnf install -y golang
mkdir -p "$HOME/.local/bin"
# GOBIN drops the binary straight into ~/.local/bin (shared into the toolbox via
# $HOME) — no ~/go/bin copy step, and re-runs just overwrite it.
toolbox run -c "$TOOLBOX" env GOBIN="$HOME/.local/bin" go install go.senan.xyz/cliphist@latest
chmod +x "$HOME/.local/bin/cliphist"
