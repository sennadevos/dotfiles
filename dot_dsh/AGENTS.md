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
