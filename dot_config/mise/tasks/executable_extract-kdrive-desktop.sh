#!/usr/bin/env bash
set -euo pipefail

APP="$(mise which kdrive)"
LAUNCH="$HOME/.local/bin/mise exec http:kdrive -- kdrive"

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
"$APP" --appimage-extract >/dev/null

root=squashfs-root

# .desktop — rewrite Exec/Icon so it survives version bumps.
# QT_QPA_PLATFORM=xcb: the kDrive/Nextcloud tray dialog is broken on native
# Wayland (can't position itself, popups never map); run it under XWayland.
desktop="$(find "$root" -maxdepth 1 -name '*.desktop' | head -n1)"
install -d "$HOME/.local/share/applications"
sed -e "s|^Exec=[^%]*|Exec=env QT_QPA_PLATFORM=xcb $LAUNCH |" \
    -e "s|^TryExec=.*|TryExec=$HOME/.local/bin/mise|" \
    -e "s|^Icon=.*|Icon=kdrive|" \
    "$desktop" > "$HOME/.local/share/applications/kdrive.desktop"

# kDrive writes its own autostart entry pointing at the versioned tarball
# cache path, which breaks on every update; replace it with our wrapper.
if [ -f "$HOME/.config/autostart/kDrive.desktop" ]; then
  install -m644 "$HOME/.local/share/applications/kdrive.desktop" \
    "$HOME/.config/autostart/kDrive.desktop"
fi

# icons
while IFS= read -r icon; do
  size="$(basename "$(dirname "$(dirname "$icon")")")"
  install -Dm644 "$icon" \
    "$HOME/.local/share/icons/hicolor/$size/apps/kdrive.${icon##*.}"
done < <(find "$root/usr/share/icons/hicolor" -type f 2>/dev/null || true)

# fallback: top-level .DirIcon / *.png next to the desktop file
[ -f "$root/.DirIcon" ] && install -Dm644 "$root/.DirIcon" \
  "$HOME/.local/share/icons/hicolor/256x256/apps/kdrive.png"

update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
