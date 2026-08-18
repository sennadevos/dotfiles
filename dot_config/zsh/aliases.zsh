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
