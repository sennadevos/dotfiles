if (( ${+commands[abbr]} )); then
    abbr rosi="rpm-ostree install"
    abbr rosu="rpm-ostree uninstall"
else
    echo "zsh-abbr niet gevonden, gebruik tijdelijk aliassen"
    alias rosi="rpm-ostree install"
    alias rosu="rpm-ostree uninstall"
fi

alias vim=nvim


