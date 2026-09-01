#!/usr/bin/env bash
set -euo pipefail

# Install drawio's desktop entry, icons and MIME definitions out of the
# AppImage, so .drawio files open on double-click and drawio appears in the
# launcher. Runs as a mise postinstall, so it re-runs on every version bump.

APP="$(mise which drawio)"
# The mise shim, not the versioned install path: it survives upgrades.
LAUNCH="$HOME/.local/share/mise/shims/drawio"

apps_dir="$HOME/.local/share/applications"
icon_dir="$HOME/.local/share/icons/hicolor"
mime_dir="$HOME/.local/share/mime"
install -d "$apps_dir" "$mime_dir/packages"

# Only a real AppImage implements --appimage-extract; passing that flag to a
# plain Electron binary silently LAUNCHES the app instead. AppImage magic is
# "AI\x01" or "AI\x02" at offset 8 of the ELF header.
magic="$(od -An -tx1 -j8 -N3 "$APP" | tr -d ' \n')"
if [ "$magic" != "414901" ] && [ "$magic" != "414902" ]; then
  echo "drawio: not an AppImage, skipping desktop integration" >&2
  exit 0
fi

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
"$APP" --appimage-extract >/dev/null

root=squashfs-root

# .desktop — rewrite Exec to the shim, keeping --no-sandbox (the bundled entry
# uses it; the AppImage's chrome-sandbox is not setuid here) and %U so file
# managers can pass the file to open.
desktop="$(find "$root" -maxdepth 1 -name '*.desktop' | head -n1)"
sed -e "s|^Exec=.*|Exec=$LAUNCH --no-sandbox %U|" \
    -e "s|^TryExec=.*|TryExec=$LAUNCH|" \
    -e "s|^Icon=.*|Icon=drawio|" \
    "$desktop" > "$apps_dir/drawio.desktop"

# icons
while IFS= read -r icon; do
  size="$(basename "$(dirname "$(dirname "$icon")")")"
  install -Dm644 "$icon" "$icon_dir/$size/apps/drawio.${icon##*.}"
done < <(find "$root/usr/share/icons/hicolor" -type f 2>/dev/null || true)

# MIME definitions — without these a .drawio file is detected as text/plain and
# double-click never reaches drawio. The AppImage ships the glob definitions
# for *.drawio, *.vsdx and *.mmd/*.mermaid.
if [ -f "$root/usr/share/mime/packages/drawio.xml" ]; then
  install -Dm644 "$root/usr/share/mime/packages/drawio.xml" \
    "$mime_dir/packages/drawio.xml"
  update-mime-database "$mime_dir" 2>/dev/null || true
fi

update-desktop-database "$apps_dir" 2>/dev/null || true
gtk-update-icon-cache -f -t "$icon_dir" 2>/dev/null || true
