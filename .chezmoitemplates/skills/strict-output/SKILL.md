---
name: strict-output
description: Answer under a hard, mechanical format and length limit chosen by preset key — raw JSON, a capped table, code with no prose, one sentence, YES/NO, and similar. Use when the user invokes /strict-output, names a preset key, or asks for output in a shape that must be parseable or must fit a stated hard cap.
whenToUse: The user runs /strict-output, or asks for an answer in a fixed machine-readable or length-capped shape (raw JSON with no fences, exactly one sentence, YES or NO, at most five bullets, code with no commentary).
---

# Strict output

Usage: `/strict-output [preset] <task>`

The point is a boundary that does not bend. Ordinary instructions to be brief
get softened by the pull toward being helpful — a lead-in sentence, a caveat, a
closing offer to elaborate. Under this skill the preset wins over that pull
every time, because the output is usually going somewhere that cannot absorb
prose: a parser, a cell, a diff, a commit message.

Two failure modes to reject explicitly:

- **Wrapping.** A `json-object` answer inside ```` ```json ```` fences is not a
  JSON object, it is a code block. Emit the payload and nothing around it.
- **Rounding up.** "Max 5 bullets" is not a target. Fewer is correct whenever
  fewer says it.

## Preset registry

| Preset key | Format | Cap | Restriction |
|---|---|---|---|
| `json-object` | Raw JSON object (`{}`) | content minimum | No markdown fences, no wrapper text |
| `json-array` | Raw JSON array (`[]`) | content minimum | Strictly an array of valid JSON objects |
| `markdown-table` | Markdown table (`\|`) | max 5 rows | Header row required; no body text |
| `code-only` | Raw source | content minimum | No comments, docstrings or explanation |
| `one-liner` | Plain text | exactly 1 sentence | Single line, no breaks, no greeting |
| `punchy-bullets` | Markdown list (`*`) | max 5 bullets | Fragments, each under 10 words |
| `tldr` | Hybrid | 2 sentences total | One overview sentence, one bulleted takeaway |
| `elevator-pitch` | Single paragraph | max 50 words | High density, no introductory clutter |
| `yes-no` | Plain text | exactly 1 token | Reads exclusively `YES` or `NO` |
| `step-by-step` | Numbered list (`1.`) | max 7 steps | Sequential only; no leading paragraph |
| `comparative` | Two-column table | max 3 items per side | Side by side; no intro, no outro |

## The contract

While a preset is in force:

1. Emit the payload in the preset's format, within its cap, obeying its
   restriction. Nothing precedes it and nothing follows it.
2. Zero conversational padding. No "Sure", no "Here is", no restating the
   task, no summary, no offer to expand.
3. The preset governs the shape of the answer, never its truth. Do the work as
   carefully as you would without it — the limit is on presentation, not on
   thinking. Verify before compressing; a wrong `YES` is worse than a long
   answer.
4. If the task genuinely cannot be answered inside the format — the question is
   not a yes/no, the data does not exist, the request is ambiguous in a way
   that changes the answer — do not silently stretch the format and do not
   invent a fitting answer. Emit exactly one line beginning `CANNOT: ` and the
   reason in a clause. That is the only permitted departure.
5. The preset applies to the answer, not to tool use. Read, search and run
   whatever the task needs first; the constraint binds only what is written
   back.

## No preset, or an unrecognised one

Do not guess a preset and do not fall back to a normal answer — either would
defeat the point of asking. Reply with the valid keys on one line and stop.

## Choosing between the near-identical ones

- `one-liner` vs `elevator-pitch`: one sentence versus up to fifty words of
  several. Use `one-liner` for an answer, `elevator-pitch` for a pitch.
- `tldr` vs `punchy-bullets`: `tldr` carries one framing sentence; use it when
  the takeaway needs context. `punchy-bullets` when the items stand alone.
- `json-object` vs `json-array`: an array only when the caller expects a
  collection. A single result stays an object rather than a one-element array.
- `code-only` vs an ordinary code answer: `code-only` strips comments too, so
  reach for it when the output is pasted into a file, not read by a person.
