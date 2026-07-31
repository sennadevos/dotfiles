#!/bin/bash
set -euo pipefail
# Upstream only ships MUSL static release binaries; build a glibc btop from
# source in a throwaway toolbox instead (same pattern as swww/cliphist).
# Idempotent: leftovers from a previous or aborted run are wiped up front, and
# the toolbox + checkout are torn down on exit no matter how we leave.
TOOLBOX="btop-build"
SRC="$HOME/btop-src"

cleanup() { rm -rf "$SRC"; toolbox rm -f "$TOOLBOX" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup   # start from a clean slate

toolbox create -y "$TOOLBOX"
toolbox run -c "$TOOLBOX" sudo dnf install -y gcc-c++ make git coreutils
toolbox run -c "$TOOLBOX" bash -c "git clone --depth 1 https://github.com/aristocratos/btop.git '$SRC' && make -C '$SRC' -j\$(nproc)"

mkdir -p "$HOME/.local/bin" "$HOME/.local/share/btop/themes"
install -m 755 "$SRC/bin/btop" "$HOME/.local/bin/btop"
cp -r "$SRC/themes/." "$HOME/.local/share/btop/themes/" 2>/dev/null || true
