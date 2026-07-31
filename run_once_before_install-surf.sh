#!/bin/bash
set -euo pipefail
# Build surf (suckless webkit browser) from source in a throwaway toolbox.
# Idempotent: leftovers from a previous or aborted run are wiped up front, and
# the toolbox + checkout are torn down on exit no matter how we leave.
#
# On niri (and other wlroots-less Wayland compositors) WebKitGTK's GL/DMA-BUF
# path is unreliable, so surf normally needs to be launched with:
#   GDK_BACKEND=x11 WEBKIT_DISABLE_DMABUF_RENDERER=1 surf
# Rather than relying on that being set at every call site, the real binary is
# installed as surf.bin and ~/.local/bin/surf is a thin wrapper that exports
# both vars before exec'ing it, so plain `surf` just works.
TOOLBOX="surf-build"
SRC="$HOME/surf-src"

cleanup() { rm -rf "$SRC"; toolbox rm -f "$TOOLBOX" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup   # start from a clean slate

toolbox create -y "$TOOLBOX"
toolbox run -c "$TOOLBOX" sudo dnf install -y gcc make pkgconf-pkg-config \
    webkit2gtk4.1-devel gtk3-devel libsoup3-devel gcr3-devel git
toolbox run -c "$TOOLBOX" bash -c "git clone --depth 1 https://git.suckless.org/surf '$SRC' && make -C '$SRC' -j\$(nproc)"

mkdir -p "$HOME/.local/bin"
install -m 755 "$SRC/surf" "$HOME/.local/bin/surf.bin"

cat > "$HOME/.local/bin/surf" <<'EOF'
#!/bin/sh
# Wrapper: WebKitGTK's DMA-BUF renderer is unreliable under niri, so force the
# X11 backend and disable it here instead of at every launch site.
export GDK_BACKEND=x11
export WEBKIT_DISABLE_DMABUF_RENDERER=1
exec "$(dirname "$(readlink -f "$0")")/surf.bin" "$@"
EOF
chmod 755 "$HOME/.local/bin/surf"
