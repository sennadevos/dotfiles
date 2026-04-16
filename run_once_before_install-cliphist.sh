#!/bin/bash
set -euo pipefail
TOOLBOX="cliphist-build"
toolbox create -y "$TOOLBOX"
toolbox run -c "$TOOLBOX" sudo dnf install -y golang
toolbox run -c "$TOOLBOX" go install go.senan.xyz/cliphist@latest
cp "$HOME/go/bin/cliphist" "$HOME/.local/bin/cliphist"
chmod +x "$HOME/.local/bin/cliphist"
toolbox rm -f "$TOOLBOX"
