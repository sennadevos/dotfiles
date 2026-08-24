#!/usr/bin/env bash
set -euo pipefail

APP="$(mise which marktext)"
LAUNCH="$HOME/.local/bin/mise exec github:marktext/marktext -- marktext"

apps_dir="$HOME/.local/share/applications"
icon_dir="$HOME/.local/share/icons/hicolor"
install -d "$apps_dir"

# mise's github backend may fetch either the AppImage or the plain tar.gz
# build. Only a real AppImage implements --appimage-extract; passing that
# flag to the plain Electron binary silently LAUNCHES the app instead.
# AppImage magic: "AI\x01" or "AI\x02" at offset 8 of the ELF header.
magic="$(od -An -tx1 -j8 -N3 "$APP" | tr -d ' \n')"

if [ "$magic" = "414901" ] || [ "$magic" = "414902" ]; then
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  cd "$tmp"
  "$APP" --appimage-extract >/dev/null

  root=squashfs-root

  # .desktop — rewrite Exec/Icon so it survives version bumps
  desktop="$(find "$root" -maxdepth 1 -name '*.desktop' | head -n1)"
  sed -e "s|^Exec=[^%]*|Exec=$LAUNCH |" \
      -e "s|^TryExec=.*|TryExec=$HOME/.local/bin/mise|" \
      -e "s|^Icon=.*|Icon=marktext|" \
      "$desktop" > "$apps_dir/marktext.desktop"

  # icons
  while IFS= read -r icon; do
    size="$(basename "$(dirname "$(dirname "$icon")")")"
    install -Dm644 "$icon" \
      "$icon_dir/$size/apps/marktext.${icon##*.}"
  done < <(find "$root/usr/share/icons/hicolor" -type f 2>/dev/null || true)

  # fallback: top-level .DirIcon / *.png next to the desktop file
  if [ -f "$root/.DirIcon" ]; then
    install -Dm644 "$root/.DirIcon" "$icon_dir/256x256/apps/marktext.png"
  fi
else
  # Plain tar.gz layout: nothing to extract and no bundled .desktop, so
  # generate one and take the icon that ships in resources/static.
  app_dir="$(dirname "$APP")"
  if [ -f "$app_dir/resources/static/icon.png" ]; then
    install -Dm644 "$app_dir/resources/static/icon.png" \
      "$icon_dir/512x512/apps/marktext.png"
  fi

  cat > "$apps_dir/marktext.desktop" <<EOF
[Desktop Entry]
Name=MarkText
Comment=Next generation markdown editor
Exec=$LAUNCH %F
TryExec=$HOME/.local/bin/mise
Terminal=false
Type=Application
Icon=marktext
Categories=Office;TextEditor;
MimeType=text/markdown;
StartupWMClass=marktext
EOF
fi

update-desktop-database "$apps_dir" 2>/dev/null || true
gtk-update-icon-cache -f -t "$icon_dir" 2>/dev/null || true
