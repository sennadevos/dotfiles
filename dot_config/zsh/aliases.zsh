if (( ${+commands[abbr]} )); then
    abbr rosi="rpm-ostree install"
    abbr rosu="rpm-ostree uninstall"
else
    echo "zsh-abbr niet gevonden, gebruik tijdelijk aliassen"
    alias rosi="rpm-ostree install"
    alias rosu="rpm-ostree uninstall"
fi

alias vim=nvim


# Butane (CoreOS/Atomic ignition configs) via podman — no local install on an
# image-based host. Mounts the cwd at /pwd so `butane < config.bu` just works.
alias butane='podman run --rm --interactive \
              --security-opt label=disable \
              --volume "${PWD}:/pwd" --workdir /pwd \
              quay.io/coreos/butane:release'


# Claude Code: put bypassPermissions in the Shift+Tab cycle without ever
# starting a session in it. `--allow-dangerously-skip-permissions` only ENABLES
# the mode -- it is a different flag from `--dangerously-skip-permissions`,
# which activates it outright. Sessions therefore still start in the default
# mode from ~/.claude/settings.json (`auto`), and the cycle becomes
# default -> acceptEdits -> plan -> bypassPermissions -> auto.
#
# Self-referential on purpose: zsh does not re-expand an alias into itself, so
# this adds the flag exactly once.
alias claude='claude --allow-dangerously-skip-permissions'
