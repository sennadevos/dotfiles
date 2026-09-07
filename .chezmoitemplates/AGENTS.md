# Software versions: look them up, never assume

When installing or pinning ANY software version — container images
(Dockerfile/Containerfile base images, docker/podman pull tags), CLI tools,
npm/pip/cargo/go packages, GitHub release assets, mise tools, versions in
lockfiles or CI configs:

- Your built-in knowledge of "the latest version" is stale by definition
  (training cutoff). Never pin a version from memory.
- First look up the current version: registry APIs, `npm view <pkg> version`,
  PyPI/crates.io project pages, GitHub releases/latest, the distro repo, or
  the project's own install docs.
- Prefer the current stable release unless the user asked for something else;
  then pin that looked-up version.
- If you cannot look it up (offline, no network tool available), say so
  explicitly and either use an unpinned/latest reference or ask the user —
  do not silently pin a stale version.
{{ if eq .harness "dsh" }}
# Delegate heavy work to the Claude Code subagent (token economics)

When the product-subagents tools (`product_delegate`, `product_roles`, …) are
available: prefer delegating substantial implementation, refactoring, and
code-review work to the Claude Code provider (roles like `implement` and
`code-review`). Claude Code runs on a flat-rate subscription, while your own
tokens are billed per use — so heavy lifting belongs there, and you act as the
orchestrator: scope the task, delegate, verify the result. Do the work
yourself only when it is small, conversational, or the delegation tools are
unavailable.

## Always pass an explicit Claude model, chosen per task

When delegating via `product_delegate`, always set the `model` parameter
explicitly — never omit it and inherit the product default. These are exact
model ids; pass them verbatim:

- `claude-sonnet-5` — routine, well-scoped work: mechanical edits,
  boilerplate, small fixes, documentation, straightforward single-file
  implementation.
- `claude-opus-5` — the default for substantial work: multi-file
  implementation, refactoring, code review, ordinary debugging.
- `claude-fable-5` — reserve for the hardest tasks: architecture decisions,
  cross-cutting or elusive bugs, and retries of work a `claude-opus-5`
  attempt got wrong.

Pair it with `reasoning_effort`: `low` for mechanical tasks, `high` for
review, debugging, and anything correctness-critical, `medium` otherwise.
{{ end }}
# Installing software: distrobox for toolchains, mise for permanent tools

This is an ostree-booted Fedora. Never `sudo dnf` or `rpm-ostree install`.
Pick the mechanism by lifetime:

- **Local or temporary: distrobox.** Toolchains, SDKs, runtimes, dev
  libraries, build dependencies, anything a project or experiment needs —
  see `~/.config/distrobox/distrobox.ini`. Never a project-local `mise.toml`
  and never mise for something that should disappear with the project.
- **Permanent, user-space or system-wide: mise, globally.** A CLI or desktop
  app the user wants installed, or data such as a spellcheck dictionary, is
  declared in `~/.config/mise/conf.d/tools-<name>.toml` (http backend with
  the version, `checksum = "sha256:…"`, `size`, `strip_components` where the
  backend allows; see the kitty/kdrive/drawio entries). That file MUST be
  committed to chezmoi and pushed to GitHub in the same change. A mise tool
  that exists only on this machine is a bug: the whole point is that the
  install is declared once and reproduced everywhere.

# Existence checks: never conclude "it doesn't exist" from filtered output

When checking whether something exists (a model, package, version, release,
API, config key):

- Search for the exact name/id — grep/filter the complete data for the
  specific string. Do not scan a listing by eye.
- Never conclude absence from output that passed through `head`/`tail`,
  pagination, a result cap, or a broad filter: truncation hides exactly the
  entry you are looking for. Absence counts as proven only by an exact-match
  search over complete output.
- When you report that something does not exist, state what you searched and
  how, so the check is auditable.

# Work inside the workspace

The workspace is the working area: everything produced stays inside it. Never
create, move or delete anything outside it without explicit permission — name
the exact path and ask first. Editing an existing file outside is fine when
asked; the rule is against creating new files and directories unasked.
`/home`, `/tmp`, dotfile directories, and a container's own system paths
(`/opt`, `/usr`, `/etc`) count as outside. The
workspace mounted into a container is still the workspace, so building or
running tools there needs no permission.
