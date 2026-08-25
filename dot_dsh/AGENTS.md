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

# Delegate heavy work to the Claude Code subagent (token economics)

When the product-subagents tools (`product_delegate`, `product_roles`, …) are
available: prefer delegating substantial implementation, refactoring, and
code-review work to the Claude Code provider (roles like `implement` and
`code-review`). Claude Code runs on a flat-rate subscription, while your own
tokens are billed per use — so heavy lifting belongs there, and you act as the
orchestrator: scope the task, delegate, verify the result. Do the work
yourself only when it is small, conversational, or the delegation tools are
unavailable.

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
