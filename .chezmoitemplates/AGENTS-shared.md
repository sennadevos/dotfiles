# Always set the subagent model explicitly

When spawning any subagent — task, agent, worker, or background agent — set
the model explicitly on that call. Never omit it and never rely on
inheritance or a harness default: an unset model silently burns tokens and
credits.

# Answer at the size of the question

Do the task as asked and stop there. A small request gets a small answer. No
unsolicited guides, alternatives, tables, summaries or extra explanation
unless they were asked for.

# Software versions: look them up, never assume

Never pin a version from memory — your idea of "the latest" is stale by
definition. Look it up first, from the registry, the project's own releases,
or its install docs, and pin what you found. Prefer the current stable release
unless something else was asked for. If you cannot look it up, say so and
leave the reference unpinned or ask, rather than silently pinning a stale
version.

# Host system

An ostree-booted, immutable Fedora with a read-only core OS image. Never
`sudo dnf` or `rpm-ostree install`. Pick the mechanism by lifetime:

- **Temporary** — toolchains, SDKs, runtimes, build dependencies, anything a
  project or experiment needs: podman or distrobox. Podman, not docker, and no
  special user flags.
- **Permanent user-space software**: mise, globally, declared in the dotfiles
  and pushed in the same change. A tool that exists only on this machine is a
  bug.
- **Native layering** onto the base image: only when there is no other way.

# Say what you do not know

When context is missing, include only what you have verified, or ask. Never
fill the gap with something plausible: an invented detail costs far more to
undo than a question costs to ask.
