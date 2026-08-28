# Default editor: neovim.
#
# Absolute shim path rather than a bare `nvim`: sudo sanitizes PATH through
# secure_path, so a bare name is not guaranteed to resolve when sudoedit
# launches the editor. The shim also survives neovim version changes.
#
# All three variables point at the same binary so behaviour never depends on
# which one a given tool happens to read. sudoedit prefers SUDO_EDITOR, then
# VISUAL, then EDITOR; git, systemctl edit, crontab and friends read VISUAL or
# EDITOR. (Fedora's sudo is built --with-env-editor, so sudoedit honours these
# rather than falling back to the compiled-in editor list.)
#
# This also supersedes /etc/profile.d/nano-default-editor.sh, which sets
# EDITOR=/usr/bin/nano only when EDITOR is unset — profile.d is sourced before
# ~/.zshrc, so assigning here wins.
#
# Guarded: on a machine where neovim is not installed, leave the inherited
# editor alone instead of pointing at a binary that does not exist.
() {
  local nvim_bin="$HOME/.local/share/mise/shims/nvim"
  if [[ -x "$nvim_bin" ]]; then
    export EDITOR="$nvim_bin"
    export VISUAL="$nvim_bin"
    export SUDO_EDITOR="$nvim_bin"
  fi
}
