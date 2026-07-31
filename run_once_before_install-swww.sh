#!/bin/bash
set -euo pipefail
# Build swww from source in a throwaway toolbox. Idempotent: leftovers from a
# previous or aborted run are wiped up front, and the toolbox + checkout are
# torn down on exit no matter how we leave.
TOOLBOX="swww-build"
SRC="$HOME/swww-src"

cleanup() { rm -rf "$SRC"; toolbox rm -f "$TOOLBOX" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup   # start from a clean slate

toolbox create -y "$TOOLBOX"
toolbox run -c "$TOOLBOX" sudo dnf install -y cargo lz4-devel wayland-protocols-devel wayland-devel
toolbox run -c "$TOOLBOX" bash -c "git clone https://github.com/LGFae/swww.git '$SRC' && cd '$SRC' && cargo build --release"

mkdir -p "$HOME/.local/bin"
install -m 755 "$SRC/target/release/swww" "$HOME/.local/bin/swww"
install -m 755 "$SRC/target/release/swww-daemon" "$HOME/.local/bin/swww-daemon"
