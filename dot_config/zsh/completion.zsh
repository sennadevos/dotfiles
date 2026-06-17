# Initialize the new completion system
autoload -Uz compinit && compinit

# Enable case-insensitive completion
zstyle ':completion:*' matcher-list '' 'm:{a-z}={A-Z}' 'm:{a-zA-Z}={A-Za-z}'

