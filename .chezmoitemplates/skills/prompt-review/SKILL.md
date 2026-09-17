---
name: prompt-review
description: Review how you actually prompt Claude Code, and how your Claude Code config is set up, against the official best-practices guidance — using your own prompt history as evidence. Reports in the terminal with real quoted examples, then applies config fixes one at a time, only on approval.
whenToUse: The user runs /prompt-review, or asks how their prompting could be better, what habits their Claude Code history shows, or whether their Claude Code setup is configured well.
disable-model-invocation: true
---

# Prompt and config review

Usage: `/prompt-review [days] [--deep]` — default window 30 days.

This grades the user's own typed prompts against the Claude Code best-practices
guidance. It is worth doing because prompting habits are invisible from the
inside: nobody remembers opening eleven unrelated tasks in one session, but the
history does.

Two hard rules, both about trust:

- **Never invent a pattern.** Every finding carries at least two verbatim
  quotes from the real history, cited by index. A pattern you cannot quote
  twice does not go in the report. "I could not evidence this" is a fine thing
  to say, and a better one than a plausible generality.
- **Report first, change nothing.** Print the whole report, then offer config
  changes one at a time. Apply only what is explicitly approved, item by item.
  No batching, no "and while I was in there".

Output is the terminal. Do not write a report file.

## Privacy — read before touching anything

This history contains other people's data. These are off limits, with no task
that justifies them:

- `~/.claude/.credentials.json` — a plaintext OAuth token.
- `~/.claude/paste-cache/`, and the `pastedContents` **values** in the history —
  raw pasted text, routinely file contents and secrets.
- `~/.claude/file-history/` — full file snapshots.
- Any `toolUseResult` or `tool_result` block under `~/.claude/projects/` —
  these hold whole file reads.

`pastedContents` is still useful as a *count*: pasting where an `@` reference
would have done is a real finding. Count it, never quote it.

Project directory names are literal filesystem paths and can name clients. Refer
to projects by basename in the report.

## Step 1 — extract the window

`~/.claude/history.jsonl` holds one JSON object per typed prompt: `display` (the
verbatim prompt), `pastedContents`, `timestamp` (epoch **milliseconds**),
`project`, `sessionId`.

Prompt text contains newlines, so never count or slice the raw file by line.
Project it once into a derived file where `display` is a JSON-escaped string.
After that one line really is one prompt, and every downstream `wc -l`, `grep`
and `uniq -c` is safe.

```sh
DAYS=30   # or the number the user passed
CUT=$(( ($(date +%s) - DAYS*86400) * 1000 ))
OUT="$(mktemp -t prompt-review-XXXXXX.jsonl)"

jq -s -c --argjson cut "$CUT" '
  [ .[] | select(.timestamp >= $cut) ]
  | sort_by(.timestamp)
  | to_entries[]
  | { i: .key,
      ts: (.value.timestamp/1000 | gmtime | strftime("%Y-%m-%d %H:%M")),
      session: .value.sessionId,
      project: .value.project,
      pasted: (.value.pastedContents | length),
      chars: (.value.display | length),
      display: .value.display }
' ~/.claude/history.jsonl > "$OUT"

wc -l < "$OUT"
```

Three things that will bite otherwise:

- `--argjson`, not `--arg`: the timestamp comparison has to be numeric.
- Redirect to the file; never print the corpus. Echoing hundreds of prompts into
  this conversation defeats the entire reason for using subagents.
- `i` is the citation key. Every quote in the report is checked against it.

If the count is under 30, say so and stop — there is not enough material for an
honest review. Offer a wider window rather than guessing from thin evidence.

`history.jsonl` misses prompts issued through resume or scripts, roughly a
quarter of them. That is acceptable for a default run; `--deep` recovers the
rest.

## Step 2 — three subagents, in parallel

Set `model` explicitly on every subagent call. A PreToolUse hook denies any call
that omits it, so a model-less call simply fails.

Give each agent the path in `$OUT` and tell it plainly: **read only that file,
never `~/.claude/history.jsonl`.** The projection is what keeps raw pasted
secrets out of three more context windows.

The split is by *input*, not by report section — each agent reads a disjoint set
of bytes, which is why they parallelise cleanly.

**Agent 1 — habits, model `opus`.** Reads the prompt *text*. Judges it against
these themes from the best-practices guidance:

- Give Claude a check it can run: a test, a build, a screenshot to compare.
- Separate explore, plan and code rather than asking for all three at once.
- Give specific context — scope the task, point at the source files, reference
  an existing pattern to imitate, describe the symptom rather than your guess at
  the cause.
- Use `@` file references, images, URLs and piped data instead of pasting.
- Course-correct early; after two failed corrections, `/clear` and re-prompt
  rather than patching a poisoned context.
- Ask for an adversarial review of work that matters.

Returns 5–8 findings. Each: the theme, a verdict, at least two verbatim quotes
with their `i` and date, and a concrete rewrite of the single worst example.

**Agent 2 — session shape, model `sonnet`.** Reads only the metadata fields.
This one counts and does not editorialise; interpretation is agent 1's job, and
mixing the two is how invented patterns get in. It reports prompts per session
and each session's wall-clock span, how many distinct projects appear inside one
session, `/clear` and `/compact` frequency, and runs of three or more
consecutive prompts under 60 characters within 15 minutes — the signature of
correcting over and over. Returns a metrics table plus the three worst sessions
with their quoted prompt chains.

Useful derivations:

```sh
jq -r '.session' "$OUT" | sort | uniq -c | sort -rn | head
jq -r 'select(.display|startswith("/")) | .display' "$OUT" \
  | awk '{print $1}' | sort | uniq -c | sort -rn
jq -r 'select(.pasted > 0) | .i' "$OUT" | wc -l
jq -r 'select(.display | test("@[A-Za-z0-9_./-]+")) | .i' "$OUT" | wc -l
```

**Agent 3 — config, model `opus`.** Does not read `$OUT`. Fetches
`https://code.claude.com/docs/en/best-practices` at run time rather than working
from memory, then reads the **chezmoi source**, because the live files are
generated:

- `~/.claude/settings.json` comes from
  `~/.local/share/chezmoi/dot_claude/modify_settings.json.tmpl`, which owns
  `permissions`, `hooks`, `tui`, `theme` and
  `skipDangerousModePermissionPrompt`, and passes `model` and `modelSettings`
  through untouched.
- `~/.claude/CLAUDE.md` comes from
  `~/.local/share/chezmoi/.chezmoitemplates/AGENTS-shared.md` plus a
  Claude-only tail in `dot_claude/CLAUDE.md.tmpl`.
- Hooks: `~/.local/share/chezmoi/dot_claude/hooks/`.
- Skills: `~/.local/share/chezmoi/.chezmoitemplates/skills/`.

It checks CLAUDE.md against the 200-line guidance and applies the pruning test
to each section — *would removing this cause a mistake?* — checks whether the
permission allowlist covers the commands that actually show up in the history,
whether anything corrected repeatedly belongs in a hook instead of prose, and
whether a repeated multi-step playbook belongs in a skill.

Every config finding must name the **chezmoi source file to edit**. A finding
that proposes editing `~/.claude/settings.json` or `~/.claude/CLAUDE.md`
directly is wrong and must be restated: the next apply silently reverts it.

**Agent 4 — deep corpus, model `opus`, only with `--deep`.** Recovers the
prompts `history.jsonl` misses, from the session transcripts:

```sh
jq -c 'select(.type=="user" and .isSidechain==false and (.isMeta != true)
       and (.message.content|type=="string")
       and (.promptSource != "sdk"))
       | select(.message.content | test("^<(task-notification|command-name|command-message|local-command-caveat|local-command-stdout|bash-stdout|bash-input)>") | not)
       | { ts: .timestamp, display: .message.content }' \
  ~/.claude/projects/*/*.jsonl
```

Never touch `toolUseResult` in those files. Reports only whether the extra
prompts change any finding from agent 1.

## Step 3 — verify, then report

Before printing, spot-check two quotes per finding:

```sh
jq -r --argjson n 12 'select(.i==$n) | .display' "$OUT"
```

A quote that is not byte-identical means the agent paraphrased. Drop the
finding rather than repairing it — a paraphrased quote means that agent's other
evidence is suspect too.

Then print, to the terminal only:

```
Prompt review — N prompts, <first date> to <last date>, M sessions

HABITS
H1. <one-line verdict>
    Evidence: [#<i>, <date>] "<verbatim quote>"
              [#<i>, <date>] "<verbatim quote>"
    Why it matters: <a sentence or two>
    Instead: <concrete rewrite of the worst example>

SESSION SHAPE
<metrics table, then the worst sessions, quoted>

CONFIG
C1. <finding>
    Now:    <what the config actually contains>
    Change: <the edit>
    File:   <chezmoi source path>
```

Order habits by how often they occur, not by how bad they sound. Say plainly
when something is already good — a review that only finds fault is not a
trustworthy one, and if CLAUDE.md is short and well pruned, say so.

## Step 4 — apply, one item at a time

Only the `C` items. Habits are not something to apply.

For each in order: state the exact edit, ask whether to apply it, and wait. On
approval, edit the chezmoi source file, then:

```sh
chezmoi diff && chezmoi apply && chezmoi status
```

`chezmoi status` should come back clean. On a decline, move to the next item and
do not raise it again.

Never edit `~/.claude/settings.json`, `~/.claude/CLAUDE.md`, or anything under
`~/.claude/skills/` directly. They are generated, so the edit is silently
reverted on the next apply — worse than not making it.

Finally, delete `$OUT`.
