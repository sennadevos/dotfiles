# Enable colors and prompt substitution
autoload -U colors && colors
setopt PROMPT_SUBST

# Git branch function
git_branch() {
  local branch=$(git symbolic-ref --short HEAD 2>/dev/null)
  [[ -n $branch ]] && echo " %F{cyan}($branch)%f"
}

# Current directory for the prompt. %~ can't be used here: on Fedora Atomic
# /home is a symlink to var/home, so $PWD is often /var/home/sjdevos/... while
# $HOME is /home/sjdevos and the two never match. Collapse either spelling to ~,
# then keep only the last 3 components so deep paths don't stretch the line.
prompt_cwd() {
  local p=$PWD
  p=${p/#\/var\/home\/$USER/\~}
  p=${p/#$HOME/\~}

  local -a parts=(${(s:/:)p})
  if (( ${#parts} > 3 )); then
    p="…/${(j:/:)parts[-3,-1]}"
  fi

  print -r -- ${p//\%/%%}
}

# Container indicator. distrobox/toolbox run under podman: distrobox exports
# CONTAINER_ID, and both drop /run/.containerenv with name="<box>". Resolve it
# once at startup (it can't change mid-session) and bake it into PROMPT, so
# rendering the prompt stays free.
_container_seg=''
if [[ -n $CONTAINER_ID ]]; then
  _container_seg="%B%F{yellow}[$CONTAINER_ID]%f%b "
elif [[ -r /run/.containerenv ]]; then
  _box=$(sed -n 's/^name="\(.*\)"$/\1/p' /run/.containerenv)
  [[ -n $_box ]] && _container_seg="%B%F{yellow}[$_box]%f%b "
  unset _box
fi

# Prompt — container badge (when inside one) + user@host, cwd, git branch, ❯ caret.
# %m is the hostname up to the first dot; %M would be the fully qualified one.
export PROMPT="${_container_seg}%F{green}%n%f%F{green}@%m%f %F{blue}\$(prompt_cwd)%f\$(git_branch) %F{magenta}❯%f "
unset _container_seg

