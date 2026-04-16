# Wallpaper Theme System

A multi-monitor wallpaper manager for niri + swww. Takes a single source image, automatically slices it to fit each monitor (including portrait/rotated displays), and saves it as a named theme you can switch between.

## Scripts

### wallpaper-create

```
wallpaper-create <source-image> <theme-name>
```

Takes any image and creates a wallpaper theme:

1. Reads your current niri outputs (names, logical sizes, positions)
2. Scales the source image to cover the combined monitor area
3. Center-crops to the exact total width and max height
4. Slices per-monitor wallpapers, vertically centered for shorter monitors
5. Saves everything to `~/Pictures/Wallpapers/themes/<theme-name>/`

The script uses **logical sizes** from niri, which already account for rotation and scaling. A 2560x1440 monitor with `transform "270"` is correctly treated as 1440x2560.

**Theme directory structure:**
```
~/Pictures/Wallpapers/themes/my-theme/
├── source.jpg       # original image (for re-slicing later)
├── DP-3.jpg         # left monitor slice
├── HDMI-A-1.jpg     # center monitor slice
└── DP-2.jpg         # right monitor slice (portrait)
```

Slice filenames match niri output names, so themes are tied to your physical setup. If you change monitors, re-run `wallpaper-create` from the saved source image.

**Dependencies:** `magick` (ImageMagick 7), `niri`, `bc`

### wallpaper-set

```
wallpaper-set [theme-name]
```

Applies a saved theme to all monitors via swww:

- With an argument: applies that theme directly
- Without an argument: opens a **fuzzel picker** listing all available themes

For each active niri output, it looks for a matching `<output-name>.jpg` in the theme directory and sets it with a wipe transition.

Starts `swww-daemon` automatically if it isn't running.

**Dependencies:** `swww`, `niri`, `fuzzel` (optional, for picker mode)

## Keybinds

| Key | Action |
|-----|--------|
| `Super+Alt+W` | Open fuzzel wallpaper theme picker |

## Adding a new theme

```bash
# Download or find a wide/tall image
# Wider and taller = better slicing results

# Create the theme
wallpaper-create ~/Downloads/some-panorama.jpg my-new-theme

# Apply it
wallpaper-set my-new-theme
```

For best results, use source images that are:
- **Wide enough** to span all monitors (5280px+ for a 1920+1920+1440 setup)
- **Tall enough** for the portrait monitor (2560px+)
- Ultra-wide panoramas and high-res landscape photos work best
