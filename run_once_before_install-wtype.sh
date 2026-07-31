#!/bin/bash
set -euo pipefail
# Build wtype (xdotool-type for Wayland) in a throwaway toolbox. It drives the
# virtual-keyboard protocol, which niri supports, and is what bw-menu uses to
# type credentials straight into the focused window.
# Idempotent: leftovers from a previous or aborted run are wiped up front, and
# the toolbox + checkout are torn down on exit no matter how we leave.
TOOLBOX="wtype-build"
SRC="$HOME/wtype-src"

cleanup() { rm -rf "$SRC"; toolbox rm -f "$TOOLBOX" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup   # start from a clean slate

toolbox create -y "$TOOLBOX"
toolbox run -c "$TOOLBOX" sudo dnf install -y gcc meson ninja-build git \
    pkgconf-pkg-config wayland-devel wayland-protocols-devel libxkbcommon-devel
toolbox run -c "$TOOLBOX" bash -c "git clone --depth 1 https://github.com/atx/wtype '$SRC' && meson setup '$SRC/build' '$SRC' && ninja -C '$SRC/build'"

mkdir -p "$HOME/.local/bin"
install -m 755 "$SRC/build/wtype" "$HOME/.local/bin/wtype"
