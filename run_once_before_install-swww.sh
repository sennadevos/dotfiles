#!/bin/bash
set -euo pipefail
TOOLBOX="swww-build"
toolbox create -y "$TOOLBOX"
toolbox run -c "$TOOLBOX" sudo dnf install -y cargo lz4-devel wayland-protocols-devel wayland-devel
toolbox run -c "$TOOLBOX" bash -c "git clone https://github.com/LGFae/swww.git ~/swww-src && cd ~/swww-src && cargo build --release"
cp "$HOME/swww-src/target/release/swww" "$HOME/.local/bin/swww"
cp "$HOME/swww-src/target/release/swww-daemon" "$HOME/.local/bin/swww-daemon"
chmod +x "$HOME/.local/bin/swww" "$HOME/.local/bin/swww-daemon"
rm -rf "$HOME/swww-src"
toolbox rm -f "$TOOLBOX"
