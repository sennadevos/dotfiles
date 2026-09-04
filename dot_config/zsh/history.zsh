# Persistent shell history. zsh's defaults are effectively "off": HISTFILE is
# unset, HISTSIZE is 30 and SAVEHIST is 0, so nothing survives a session.

# State, not config, so it lives under XDG_STATE_HOME rather than in the repo
# (alongside lesshst, gh/, mise/). zsh does NOT create the parent directory, so
# the guard below is load-bearing on a fresh machine.
HISTFILE="${XDG_STATE_HOME:-$HOME/.local/state}/zsh/history"
[[ -d ${HISTFILE:h} ]] || mkdir -p ${HISTFILE:h}

# HISTSIZE above SAVEHIST leaves headroom for the dedup options below to drop
# entries before the list is trimmed and written out.
HISTSIZE=60000
SAVEHIST=50000

setopt EXTENDED_HISTORY       # record start time + duration per entry
setopt INC_APPEND_HISTORY     # append as commands are entered, not at exit, so
                              # a crashed or killed shell still records them
setopt HIST_IGNORE_ALL_DUPS   # a repeated command drops the older copy; matters
                              # more here because Up is a plain walk
setopt HIST_SAVE_NO_DUPS      # never write duplicates to the file
setopt HIST_IGNORE_SPACE      # a leading space keeps a command out (secrets)
setopt HIST_REDUCE_BLANKS     # tidy whitespace before storing
setopt HIST_VERIFY            # show an expanded !! before running it, which
                              # pairs with /etc/zshrc's `bindkey ' ' magic-space`

# Deliberately NOT set: SHARE_HISTORY. Panes would import each other's commands
# live, making Up unpredictable per pane. Commands still reach the shared file
# immediately via INC_APPEND_HISTORY, so new shells see everything.
