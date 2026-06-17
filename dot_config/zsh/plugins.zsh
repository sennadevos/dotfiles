INSTALL_SCRIPTS_DIR="$HOME/.config/zsh/scripts/install"
PLUGINS_DIR="$HOME/.config/zsh/plugins"

if [[ -f "$PLUGINS_DIR/zsh-abbr/zsh-abbr.zsh" ]]; then
    source "$PLUGINS_DIR/zsh-abbr/zsh-abbr.zsh"
elif [[ -f "$INSTALL_SCRIPTS_DIR/zsh-abbr.sh" ]]; then
    echo -n "\`zsh-abbr\` not found! Do you want to install it? (y/n): "
    read -r optie
    if [[ $optie == "y" ]]; then
        bash "$INSTALL_SCRIPTS_DIR/zsh-abbr.sh"
        source "$PLUGINS_DIR/zsh-abbr/zsh-abbr.zsh"
    fi
fi
