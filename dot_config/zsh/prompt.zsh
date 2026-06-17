# Enable colors and prompt substitution
autoload -U colors && colors
setopt PROMPT_SUBST

# Git branch function
git_branch() {
  local branch=$(git symbolic-ref --short HEAD 2>/dev/null)
  [[ -n $branch ]] && echo " %F{cyan}($branch)%f"
}

# Prompt
export PROMPT='%F{green}%n%f %F{blue}%~%f$(git_branch) %F{magenta}❯%f '

