# dotfiles

Managed with [chezmoi](https://www.chezmoi.io/). Source directory is `~/.dotfiles` (overriding the default `~/.local/share/chezmoi`) via `~/.config/chezmoi/chezmoi.toml`.

## What's in here

### Configs (`dot_config/`)
- **niri** — Wayland compositor. Keybinds follow the convention: `Super+...` = window manager, `+Ctrl+...` = move/control, `+Alt+...` = alter a value.
- **waybar** — floating rounded top bar on the middle monitor (HDMI-A-1). Warm dark theme with amber accent.
- **alacritty** — terminal with a warm palette matching the rest of the system.
- **nvim** — mini.nvim-based setup with transparent background (uses terminal bg).

### Scripts (`dot_local/bin/`)
- **lock.sh** — per-monitor screenshot → corrupter glitch → swaylock.
- **wallpaper-create** — slice a source image into per-monitor wallpapers based on niri's detected layout.
- **wallpaper-set** — apply a saved theme to all monitors (fuzzel picker if no argument).

See `dot_local/bin/README-wallpapers.md` for the wallpaper theme system.

### Install hooks
- **run_once_before_install-cliphist.sh** — builds cliphist in an ephemeral toolbox.
- **run_once_before_install-swww.sh** — builds swww (both binaries) in an ephemeral toolbox.

These run automatically on first `chezmoi apply`, then are skipped forever unless their contents change.

## Apply on a fresh machine

```bash
# Install chezmoi (atomic Fedora: in a toolbox or via homebrew/curl)
sh -c "$(curl -fsLS get.chezmoi.io)"

# Initialize from this repo
chezmoi init --apply <github-user>/dotfile
```

`chezmoi apply` will copy configs into place and run the install hooks.

## External dependencies (not in this repo)

These need to be installed separately:
- **niri** — layered on the atomic OS image
- **waybar**, **alacritty**, **swaylock**, **grim**, **fuzzel** — Fedora packages
- **swww**, **cliphist**, **corrupter** — built by run_once scripts or similar
- **JetBrainsMono Nerd Font** + **Symbols Nerd Font** — installed in `~/.local/share/fonts`
