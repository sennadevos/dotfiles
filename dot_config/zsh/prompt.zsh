# Enable colors and prompt substitution
autoload -U colors && colors
setopt PROMPT_SUBST

# --- Width behaviour ----------------------------------------------------
# On a slim window a fixed one-line prompt eats most of the usable typing width
# and then wraps. So the prompt adapts: the path sheds components as the window
# narrows, and below PROMPT_SLIM_COLS the caret moves to its own line, giving
# the line you type on the full window width.
#
# user@host is NEVER dropped, at any width. It is the largest single segment
# (19 columns here) and shedding it would be the cheapest saving, but the
# hostname is what tells several machines' windows apart, so the space comes
# from the path, the branch and the line break instead.
# One knob: how much room to type must be left on the prompt line. The layout
# is chosen by need rather than by fixed column thresholds, so a wide window
# with a deep path and a slim window with a short path both do the sensible
# thing, and no vertical line is ever spent while there is still room.
: ${PROMPT_MIN_INPUT:=30}

# Container indicator. distrobox/toolbox run under podman: distrobox exports
# CONTAINER_ID, and both drop /run/.containerenv with name="<box>". Resolve it
# once at startup, since it cannot change mid-session.
_prompt_box=''
if [[ -n $CONTAINER_ID ]]; then
  _prompt_box=$CONTAINER_ID
elif [[ -r /run/.containerenv ]]; then
  _prompt_box=$(sed -n 's/^name="\(.*\)"$/\1/p' /run/.containerenv)
fi

# Current directory for the prompt, keeping only the last $1 components.
# %~ can't be used here: on Fedora Atomic /home is a symlink to var/home, so
# $PWD is often /var/home/sjdevos/... while $HOME is /home/sjdevos and the two
# never match. Collapse either spelling to ~ first.
#
# Sets $REPLY to PLAIN text — no prompt escapes, no %-doubling — because the
# renderer must measure its width before choosing a layout. Measuring a string
# that already contained %F{...} would mean expanding escapes and stripping
# ANSI; escaping happens once, at output.
#
# REPLY rather than printing to stdout so the renderer can try several values
# of `keep` without forking a subshell for each attempt.
prompt_cwd() {
  local keep=${1:-3}
  local p=$PWD
  p=${p/#\/var\/home\/$USER/\~}
  p=${p/#$HOME/\~}

  local -a parts=(${(s:/:)p})
  if (( ${#parts} > keep )); then
    p="…/${(j:/:)parts[-keep,-1]}"
  fi

  REPLY=$p
}

# Git branch, plain text, empty outside a repository.
git_branch() {
  git symbolic-ref --short HEAD 2>/dev/null
}

# Build the prompt for the current terminal width.
#
# This lives in a command substitution inside PROMPT rather than in precmd on
# purpose: `zle reset-prompt` (see TRAPWINCH below) re-expands PROMPT but does
# NOT re-run precmd, so a precmd-built string would keep its stale width after
# a resize and the live redraw would silently do nothing.
prompt_render() {
  local cols=$COLUMNS
  (( cols <= 0 )) && cols=80          # not a terminal, or width unknown

  local user=$USER host=${HOST%%.*}   # %m is the hostname up to the first dot
  local id="${user}@${host}"

  local badge=''
  [[ -n $_prompt_box ]] && badge="[${_prompt_box}] "

  local br=$(git_branch)
  local brseg=''
  [[ -n $br ]] && brseg=" (${br})"

  # Try the most detail that still leaves PROMPT_MIN_INPUT columns to type on
  # one line: full path, then two components, then just the basename. A single
  # line costs the info segment plus " ❯ " (3).
  local cwd info keep twoline=1 REPLY
  for keep in 3 2 1; do
    prompt_cwd $keep; cwd=$REPLY
    info="${badge}${id} ${cwd}${brseg}"
    if (( cols - ${#info} - 3 >= PROMPT_MIN_INPUT )); then
      twoline=0
      break
    fi
  done

  if (( twoline )); then
    # Nothing fitted on one line, so the caret gets its own line and typing
    # gets the full width. $cwd is the basename form from the last iteration.
    # The info line still has to fit on its own. Degrade in order: drop the
    # branch, then truncate the path from the left. Identity is never touched.
    if (( ${#info} > cols )); then
      brseg=''
      info="${badge}${id} ${cwd}"
    fi
    if (( ${#info} > cols )); then
      local head="${badge}${id} "
      local avail=$(( cols - ${#head} ))
      if (( avail >= 2 )); then
        cwd="…${cwd[-(avail - 1),-1]}"
      else
        cwd=''
      fi
      info="${head}${cwd}"
    fi
  fi

  # Colourise last. A % in a path or branch name must be doubled, or prompt
  # expansion eats it as an escape.
  local out=''
  [[ -n $badge ]] && out+="%B%F{yellow}[${_prompt_box//\%/%%}]%f%b "
  # Two %F{green} spans rather than one around the whole thing, so the emitted
  # bytes stay exactly what this prompt has always produced.
  out+="%F{green}${user}%f%F{green}@${host}%f"
  out+=" %F{blue}${cwd//\%/%%}%f"
  [[ -n $brseg ]] && out+=" %F{cyan}(${br//\%/%%})%f"

  if (( twoline )); then
    out+=$'\n'"%F{magenta}❯%f "
  else
    out+=" %F{magenta}❯%f "
  fi

  print -r -- $out
}

export PROMPT='$(prompt_render)'

# Re-render on resize, so dragging the window edge reshapes the prompt at once.
# The `zle &&` guard matters: reset-prompt is only valid while the line editor
# is active, and TRAPWINCH also fires when it is not. Anything already typed
# survives the redraw.
TRAPWINCH() { zle && zle reset-prompt }
