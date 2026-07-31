# Enable colors and prompt substitution
autoload -U colors && colors
setopt PROMPT_SUBST

# Git branch function
git_branch() {
  local branch=$(git symbolic-ref --short HEAD 2>/dev/null)
  [[ -n $branch ]] && echo " %F{cyan}($branch)%f"
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
export PROMPT="${_container_seg}%F{green}%n%f%F{green}@%m%f %F{blue}%~%f\$(git_branch) %F{magenta}❯%f "
unset _container_seg

