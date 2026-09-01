---
name: drawio
description: Create and edit draw.io / diagrams.net diagrams by writing .drawio XML directly, and export them to PNG, SVG or PDF. Use for architecture diagrams, flowcharts, network maps, sequence-style boxes-and-arrows, ER diagrams, or whenever the user asks for a diagram they can open and edit rather than a static image.
whenToUse: The user asks for a diagram, flowchart, architecture drawing, or a .drawio file, or wants an existing .drawio edited or exported.
---

# draw.io diagrams

Write `.drawio` files as plain, uncompressed XML. There is no library and no
MCP server involved: the format is simple, and writing it directly means the
file stays diffable and the user can edit it afterwards.

## File shape

A `.drawio` file is `mxfile` → `diagram` → `mxGraphModel` → `root` → cells.
The two cells `id="0"` and `id="1"` are structural and **must always be
present**; every shape you add is `parent="1"`.

```xml
<mxfile host="app.diagrams.net">
  <diagram name="Overview" id="overview">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1" page="1"
                  pageScale="1" pageWidth="850" pageHeight="1100"
                  math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- shapes and edges here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

Multiple `<diagram>` elements become multiple tabs. Give every cell a stable,
meaningful `id` (`api-gateway`, not `n7`) so later edits are surgical.

## Shapes

```xml
<mxCell id="api" value="API Gateway" vertex="1" parent="1"
        style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;">
  <mxGeometry x="200" y="120" width="160" height="60" as="geometry" />
</mxCell>
```

`x`/`y` are absolute, top-left origin, y grows downward. Always set
`whiteSpace=wrap;html=1;` so labels wrap instead of overflowing.

Useful `style` bases:

| Shape | style |
|---|---|
| Box | `rounded=0;whiteSpace=wrap;html=1;` |
| Rounded box | `rounded=1;whiteSpace=wrap;html=1;` |
| Circle / ellipse | `ellipse;whiteSpace=wrap;html=1;` |
| Decision | `rhombus;whiteSpace=wrap;html=1;` |
| Start / end | `ellipse;whiteSpace=wrap;html=1;arcSize=40;` |
| Database | `shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;` |
| Cloud / external | `ellipse;shape=cloud;whiteSpace=wrap;html=1;` |
| Note | `shape=note;whiteSpace=wrap;html=1;size=14;` |
| Container | `swimlane;whiteSpace=wrap;html=1;startSize=30;` |

Put children of a `swimlane` at `parent="<swimlane-id>"` with geometry
**relative to the swimlane**, not the page.

## Edges

```xml
<mxCell id="api-to-db" value="query" edge="1" parent="1" source="api" target="db"
        style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

`source`/`target` reference cell ids — never draw arrows as shapes. Variants:
`edgeStyle=orthogonalEdgeStyle` (right angles, the default choice),
`edgeStyle=elbowEdgeStyle`, or omit for straight. Add `dashed=1` for optional
or async flows, `startArrow=classic` for bidirectional.

## Colour pairs

Use draw.io's standard fill/stroke pairs — they are legible in both light and
dark and look native:

| Intent | fillColor | strokeColor |
|---|---|---|
| Blue (default/system) | `#dae8fc` | `#6c8ebf` |
| Green (success/data) | `#d5e8d4` | `#82b366` |
| Orange (attention) | `#ffe6cc` | `#d79b00` |
| Yellow (note) | `#fff2cc` | `#d6b656` |
| Red (error/external) | `#f8cecc` | `#b85450` |
| Purple (async/queue) | `#e1d5e7` | `#9673a6` |
| Grey (neutral) | `#f5f5f5` | `#666666` |

Colour by **meaning**, consistently, and say what the colours mean in a legend
or in your reply. Do not colour every box differently for decoration.

## Layout

There is no auto-layout when writing XML by hand, so place deliberately:

- Work on a 20px grid; keep 40–80px of clear space between shapes.
- Default box 120×60; widen to 160–200 for longer labels rather than shrinking
  the text.
- Flow left-to-right or top-to-bottom, consistently within one diagram.
- Align shapes in a rank on the same `x` (vertical flow) or `y` (horizontal),
  so edges stay straight.
- Never overlap shapes, and do not route an edge through an unrelated box.

## Exporting

drawio desktop is installed via mise. Call it by its **absolute shim path** —
a bare `drawio` is not on PATH in every context on this machine:

```sh
~/.local/share/mise/shims/drawio --export --format png --output diagram.png diagram.drawio
```

`--format` accepts `png`, `svg`, `pdf`, `jpg`. Useful flags: `--scale 2` for
high-DPI PNG, `--transparent`, `--width <px>`, `--page-index <n>` for a
specific tab, `--all-pages` for a multi-page PDF.

Two caveats worth knowing:

- It is an Electron app, so export needs a display. Inside a desktop session
  that is fine (it may flash a window). In a truly headless context wrap it:
  `xvfb-run -a ~/.local/share/mise/shims/drawio --export …`.
- It prints Wayland/Vulkan/GPU warnings to stderr even on success. Judge
  success by the output file existing, not by empty stderr.

Export only when the user wants an image. The `.drawio` file is the
deliverable — it stays editable; a PNG does not.

## Editing an existing diagram

Read the file first. If it opens with `<mxfile` and you can see `<mxCell>`
elements, it is uncompressed and you can edit the XML directly. If the
`<diagram>` element instead contains one long base64 blob, it is
deflate-compressed: open it in drawio and re-save with **Extras → Edit
Diagram** to get plain XML, or rebuild the diagram rather than guessing.

When editing, change only the cells you mean to change — preserve existing
ids, geometry and styles so the user's manual layout survives.

## Checklist before you finish

- Cells `0` and `1` present; every shape `parent="1"`.
- Every `source`/`target` names a cell id that exists.
- No overlapping geometry; labels fit their boxes.
- File written with a `.drawio` extension.
- Tell the user the path, and offer an export rather than assuming one.

---

Adapted from the `drawio` skill in
[github/awesome-copilot](https://github.com/github/awesome-copilot) (MIT).
The upstream export script (`drawio-to-png.mjs`, needing `puppeteer-core` and a
Chromium fallback) is replaced here by the drawio CLI, which is installed.
