#!/bin/bash
set -euo pipefail
# Build dmenu from source in a throwaway toolbox. surf's Ctrl-g/Ctrl-f prompts
# (config.def.h SETPROP) hard-code a call to dmenu, so it's a real dependency
# of the surf install, not just a launcher nicety.
# Idempotent: leftovers from a previous or aborted run are wiped up front, and
# the toolbox + checkout are torn down on exit no matter how we leave.
TOOLBOX="dmenu-build"
SRC="$HOME/dmenu-src"

cleanup() { rm -rf "$SRC"; toolbox rm -f "$TOOLBOX" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup   # start from a clean slate

toolbox create -y "$TOOLBOX"
toolbox run -c "$TOOLBOX" sudo dnf install -y gcc make git \
    libX11-devel libXinerama-devel libXft-devel
toolbox run -c "$TOOLBOX" bash -c "git clone --depth 1 https://git.suckless.org/dmenu '$SRC' && make -C '$SRC' -j\$(nproc)"

mkdir -p "$HOME/.local/bin"
install -m 755 "$SRC/dmenu" "$HOME/.local/bin/dmenu"
install -m 755 "$SRC/dmenu_path" "$HOME/.local/bin/dmenu_path" 2>/dev/null || true
install -m 755 "$SRC/dmenu_run" "$HOME/.local/bin/dmenu_run" 2>/dev/null || true
install -m 755 "$SRC/stest" "$HOME/.local/bin/stest" 2>/dev/null || true
