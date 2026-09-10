#!/usr/bin/env python3
"""PreToolUse hook: refuse any subagent call that does not name a model.

Why a hook and not prose: the rule was written into the user instructions and
corrected in conversation four times in two days, and still did not stick. An
unset model silently falls back to a harness default, which burns tokens and
credits, so this is enforced deterministically instead of asked for politely.

Why PreToolUse and nothing else: SubagentStart cannot block and never sees the
model -- only agent_id and agent_type. A frontmatter `model:` on the agent
definition and CLAUDE_CODE_SUBAGENT_MODEL only supply a fallback; neither
forces the caller to be explicit. PreToolUse is the only place a model-less
call can actually be stopped.

Scope: every model-less call is denied, with no exception list -- not even for
agent types that pin a model in their own definition. Such a model still
resolves correctly, but the call must name one anyway, so there is no hole to
remember.

The deny reason is fed back to the model, so the natural recovery is an
immediate retry with `model` set.

Contract (verified against the hooks reference):
  stdin  -- JSON with tool_name and tool_input
  stdout -- {"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                    "permissionDecision": "deny",
                                    "permissionDecisionReason": "..."}}
  exit 0 with no output means "no opinion", which is the fail-open path taken
  for anything unexpected. A hook that crashed the tool call on malformed
  input would be worse than one that occasionally lets a call through.
"""

import json
import sys

# The tool was renamed Task -> Agent in v2.1.63; `Task` remains an alias, and
# the settings matcher (`Task|Agent`) is applied unanchored, so re-check here.
SUBAGENT_TOOLS = {"Task", "Agent"}

REASON = (
    "Subagent calls must set an explicit model. Retry this exact call with the "
    "`model` parameter set (e.g. sonnet for mechanical search/extract work, "
    "opus for substantial work). Never omit it and never rely on inheritance "
    "or a harness default."
)


def allow_silently():
    sys.exit(0)


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, UnicodeDecodeError):
        allow_silently()

    if not isinstance(payload, dict):
        allow_silently()

    if payload.get("tool_name") not in SUBAGENT_TOOLS:
        allow_silently()

    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        allow_silently()

    # When the caller omits the model the key is simply absent. Treat an
    # explicit null or an empty/whitespace string as absent too: they are just
    # as unset in effect, and accepting them would leave the obvious hole.
    model = tool_input.get("model")
    if isinstance(model, str) and model.strip():
        allow_silently()

    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": REASON,
            }
        },
        sys.stdout,
    )
    sys.exit(0)


if __name__ == "__main__":
    main()
