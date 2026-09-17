sh -c "$(curl -fsLS get.chezmoi.io)" -- -b "$HOME/.local/bin"
mkdir -p "$HOME/.local/share/chezmoi"
cp -r ./ "$HOME/.local/share/chezmoi/"
