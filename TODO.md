# TODO

Repo-only: `.chezmoiignore` keeps this from rendering to `~/TODO.md`.

Conventions already established here, so a future item does not have to
rediscover them:

- A skill is a shared body at `.chezmoitemplates/skills/<name>/SKILL.md` with
  `name` / `description` / `whenToUse` frontmatter, plus a two-line pointer per
  harness at `dot_claude/skills/<name>/SKILL.md.tmpl`. See `drawio` and
  `strict-output`.
- MCP servers are declared per harness, not shared. Claude Code's live in the
  `mcpServers` key that `modify_private_dot_claude.json.tmpl` owns.
- `/dot_claude/*` is gitignored with explicit `!` exceptions, so anything new
  under it needs its own exception or it will never leave this machine.
- Secrets never enter this repo. `dot_dsh/settings.yaml` shows the pattern:
  read the key from a local, gitignored credentials file at run time.

## Rator Airtable

- [ ] **Airtable MCP server.** Decide between the first-party Airtable
      connector and a self-hosted MCP server, then declare the choice in
      `modify_private_dot_claude.json.tmpl` next to the existing `chrome`
      entry. Needs a base ID and a scoped token, and the token must stay out of
      the repo.
- [ ] **Requirements skill** — read and write the Rator requirements base.
      Undecided: which base and table, and which fields the skill is allowed to
      write rather than only read.
- [ ] **Planning skill** — the planning views of that same base. Same open
      questions.

## Bank transaction skills

Three Dutch banks. Expect one shared normalising step with a per-bank parser in
front of it, rather than three independent skills.

- [ ] **SNS/ASN transactions.** Kept as one item on the assumption that SNS and
      ASN, being the same banking group, export the same format — confirm that
      before writing a single parser for both.
- [ ] **Rabobank transactions.**

Unresolved for all three, and worth settling before any of them is written:
which export format is actually in use (CSV, MT940, CAMT.053), where the
downloaded statements land on disk, and what consumes the parsed output.

## Other

- [ ] **WhatsApp Web skill.** Browser-driven, so it would go through the
      `chrome` MCP server against the already-running containerised Chromium.
      Attach on port 9222 rather than launching: a launched instance gets an
      empty profile and no logged-in session. Scope undecided — reading
      threads, sending messages, or both.
