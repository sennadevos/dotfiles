#!/usr/bin/env python3
"""Stop hook: report, never block, when tracked config has drifted.

Why: config has changed without being noticed -- an esp-idf.zsh shell profile
that appeared without explanation, and an unaccounted-for sdkconfig change. The
point is that no edit to tracked config passes silently.

Reports two independent things:

1. Everything `chezmoi status` sees as differing from the source state, not
   just files this session touched, so drift from outside Claude is caught too.

2. Shell profiles that will not reproduce on another machine, which chezmoi
   status cannot see:
     - not managed by chezmoi at all, or
     - managed, but the source file is not committed to git (and not
       deliberately gitignored).
   The second is the esp-idf.zsh case exactly: chezmoi renders it, so status is
   quiet, yet it exists only on this machine -- which the dotfiles rule calls a
   bug.

   An earlier version reported any profile whose mtime fell inside a 30-minute
   window. That was wrong twice over: it flagged files that were perfectly
   tracked and clean merely because they had just been edited, while missing
   esp-idf.zsh, whose mtime was months old. Recency is not the property worth
   reporting; reproducibility is.

Only reports. It never blocks, so the cap on consecutive Stop-hook blocks is
irrelevant, and a broken check can never wedge a session: every failure path
exits 0 silently.

Two hard-won constraints on the report text:

- It is declarative. It must never read as an instruction. The closing line
  once said "fold these into the dotfiles and push", which reached the model
  through additionalContext and caused fresh sessions to re-add and commit the
  drift on their own -- the notice provoking the silent config change it exists
  to surface.

- It is deduplicated per session. A Stop hook fires at the end of every turn,
  so an unchanged situation would otherwise reprint itself on every single
  turn until it was resolved, which is how a notice becomes noise and gets
  ignored. The report is emitted when it first appears and again only when its
  content changes.
"""

import hashlib
import json
import os
import shutil
import subprocess
import sys

HOME = os.path.expanduser("~")

STATE_DIR = os.path.join(
    os.environ.get("XDG_CACHE_HOME", os.path.join(HOME, ".cache")),
    "claude-config-drift",
)

# Files and trees that change how every future shell behaves, which is exactly
# the class of edit that went unnoticed before.
PROFILE_FILES = [
    ".zshrc",
    ".zprofile",
    ".zshenv",
    ".bashrc",
    ".bash_profile",
    ".profile",
]
PROFILE_DIRS = [
    ".bashrc.d",
    ".config/zsh",
]


def chezmoi_binary():
    # Hooks do not necessarily inherit an interactive PATH, so fall back to the
    # known install location before giving up.
    found = shutil.which("chezmoi")
    if found:
        return found
    fallback = os.path.join(HOME, ".local/bin/chezmoi")
    return fallback if os.access(fallback, os.X_OK) else None


def run(argv, cwd=None):
    """Run a command, returning stdout, or None on any failure."""
    try:
        result = subprocess.run(
            argv, capture_output=True, text=True, timeout=20, cwd=cwd
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return result.stdout if result.returncode == 0 else None


def chezmoi_drift(binary):
    """Managed paths chezmoi reports as differing from the source state."""
    out = run([binary, "status"])
    if out is None:
        return []

    drifted = []
    for line in out.splitlines():
        # Two status columns, a space, then the path. The second column is the
        # target's state, so anything non-blank there is a real difference on
        # disk.
        if len(line) < 4:
            continue
        if line[1] != " " and line[3:].strip():
            drifted.append("{} {}".format(line[:2], line[3:].strip()))
    return drifted


def existing_profiles():
    """Absolute paths of the shell profiles that actually exist."""
    found = [os.path.join(HOME, name) for name in PROFILE_FILES]
    for directory in PROFILE_DIRS:
        for dirpath, _dirnames, filenames in os.walk(os.path.join(HOME, directory)):
            found.extend(os.path.join(dirpath, name) for name in filenames)
    return sorted(p for p in found if os.path.isfile(p))


def profile_problems(binary):
    """Shell profiles that would not reproduce on another machine."""
    profiles = existing_profiles()
    if not profiles:
        return []

    raw = run([binary, "managed", "--path-style=all", "--format=json"])
    if raw is None:
        return []
    try:
        managed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(managed, dict):
        return []

    # Derive the source directory from any entry rather than spending another
    # chezmoi invocation on `source-path`.
    source_dir = None
    for entry in managed.values():
        absolute = entry.get("sourceAbsolute", "")
        relative = entry.get("sourceRelative", "")
        if absolute and relative and absolute.endswith(relative):
            source_dir = absolute[: -len(relative)].rstrip("/")
            break

    # Untracked AND not gitignored. A gitignored source file is a deliberate
    # local-only choice (see .gitignore's dot_bashrc entries), not an
    # oversight, so --exclude-standard is what makes this precise.
    untracked = set()
    if source_dir:
        out = run(["git", "ls-files", "--others", "--exclude-standard"], cwd=source_dir)
        if out:
            untracked = set(out.split("\n")) - {""}

    problems = []
    for path in profiles:
        rel = os.path.relpath(path, HOME)
        entry = managed.get(rel)
        if entry is None:
            problems.append("~/{}  (not managed by chezmoi)".format(rel))
            continue
        source_rel = entry.get("sourceRelative")
        if source_rel and source_rel in untracked:
            problems.append(
                "~/{}  (managed, but {} is not committed)".format(rel, source_rel)
            )
    return problems


def already_reported(session_id, report):
    """True if this exact report was already emitted for this session."""
    if not session_id:
        return False
    digest = hashlib.sha256(report.encode("utf-8")).hexdigest()
    # Keep the filename to a safe, bounded shape whatever the session id holds.
    key = hashlib.sha256(session_id.encode("utf-8")).hexdigest()[:32]
    state_path = os.path.join(STATE_DIR, key)
    try:
        with open(state_path) as handle:
            if handle.read().strip() == digest:
                return True
    except OSError:
        pass
    try:
        os.makedirs(STATE_DIR, exist_ok=True)
        with open(state_path, "w") as handle:
            handle.write(digest)
    except OSError:
        # Cannot remember: better to report again than to go silent.
        pass
    return False


def main():
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError, OSError):
        payload = {}
    session_id = payload.get("session_id") if isinstance(payload, dict) else None

    binary = chezmoi_binary()
    if binary is None:
        sys.exit(0)

    drifted = chezmoi_drift(binary)
    profiles = profile_problems(binary)

    if not drifted and not profiles:
        sys.exit(0)

    lines = []
    if drifted:
        lines.append("Tracked config differs from the chezmoi source state:")
        lines.extend("  " + entry for entry in drifted)
    if profiles:
        lines.append("Shell profiles that would not reproduce on another machine:")
        lines.extend("  " + entry for entry in profiles)
    lines.append(
        "Notice for the user only. This is not a task: take no git, chezmoi, "
        "or file action in response to it, and do not offer to. Mention it if "
        "it bears on the work in hand, otherwise carry on."
    )
    report = "\n".join(lines)

    if already_reported(session_id, report):
        sys.exit(0)

    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "Stop",
                "additionalContext": report,
            },
            "systemMessage": report,
        },
        sys.stdout,
    )
    sys.exit(0)


if __name__ == "__main__":
    main()
