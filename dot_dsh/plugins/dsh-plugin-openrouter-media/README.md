# dsh-plugin-openrouter-media

Image/video generation via OpenRouter for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(`dsh web`). Surfaced as a floating panel in the web UI and callable by the
agent. Ephemeral: no history, no persistence — results live in an in-memory
ring buffer (last 20) that is cleared on restart; only the generated media
files land on disk.

## Features

- **Agent tools** — `media_generate_image(prompt, model?, n?, aspectRatio?)`
  and `media_generate_video(prompt, model?, durationSeconds?, resolution?,
  generateAudio?)`. Both return terse text only: one readable sentence per
  call, never image content blocks. A video job exceeding
  `videoMaxWaitMs` returns its job id as plain text (not an error) while a
  background poll keeps running until completion.
- **Web panel** — a sidebar-footer trigger with an in-flight badge opens a
  floating overlay panel: prompt box, image/video tabs, model selects
  populated live from the OpenRouter catalogs, per-kind controls, and the
  newest results rendered inline (`<img>` / `<video>` from the plugin's asset
  route, Range-request ready).
- **SSE store** — one `EventSource` on `/x-media/events` feeds one observable
  store shared by both slots through their inject faces.
- **Readable failures** — unset key, 402, 429, upstream errors and catalog
  outages all fold into single readable sentences, in the conversation and in
  the panel.
- **Trust fence** — `/x-media` sits outside dsh's `/api` trust fence, so every
  handler validates the Host/Origin/Sec-Fetch-Site headers itself.

## Configuration

| key                      | default                       | meaning                                    |
| ------------------------ | ----------------------------- | ------------------------------------------ |
| `outputDir`              | `~/Pictures/dsh-generated`    | where generated media files are written    |
| `defaultImageModel`      | *(catalog head)*              | OpenRouter image model id                  |
| `defaultVideoModel`      | *(catalog head)*              | OpenRouter video model id                  |
| `maxImagesPerCall`       | `4`                           | hard cap for tool/panel image counts       |
| `maxVideoDurationSeconds`| `10`                          | hard cap for clip length                   |
| `videoPollIntervalMs`    | `5000`                        | video job poll interval                    |
| `videoMaxWaitMs`         | `240000`                      | wait budget before returning the job id    |

Override by targeting `openrouter-media` in your profile patch layer
(`~/.dsh/profiles/web/cordis.patch.yml`); a config override replaces the whole
object, so restate keys you keep.

Auth reads `OPENROUTER_API_KEY` from the environment first, then the harness
credential store (`~/.dsh/.credentials.yaml` refs). Model ids are never
hardcoded — they come from `GET /api/v1/images/models` and
`GET /api/v1/videos/models` at runtime (24h cache).

## Install

```bash
dsh plugin --profile web add link:<path to this directory>
```

The package declares `dsh.bundle.patch: ./cordis.patch.yml`, so the command
above appends it to the profile's bundle stack automatically.

## Build & test

```bash
pnpm install   # zod dependency + esbuild devDependency
pnpm run build # bundles src/client.jsx into lib/client.js (lazy-CJS envelope)
pnpm test      # node --test unit suite
```

The client bundle is hand-rolled (dsh's tsdown client preset is unpublished):
esbuild with format=cjs wrapped in the exact
`window.__ModuleLoader__.load({id, factory})` envelope the shell consumes;
react / jsx-runtime / ui-primitives stay bare `require()` externals resolved
from the shell seed.
