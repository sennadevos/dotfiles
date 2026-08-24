#!/bin/sh
# Disable every form of input-field auto-suggest Firefox offers.
#
# These are profile prefs, and profile directory names are random
# (slpatujy.default-release, nius2dsd.default, ...), so chezmoi can't target the
# path directly — this script resolves every profile from profiles.ini and
# writes a marked block into each one's user.js.
#
# user.js is re-applied at every startup, so it's genuinely declarative: it
# overrides anything toggled in the UI. Changes need a Firefox restart.
#
# Anything outside the marked block is preserved, so hand-written prefs added
# later survive re-runs. run_onchange_ means chezmoi re-runs this whenever the
# prefs below change.
set -eu

# Firefox's profile root differs per install method/distro build: classic
# ~/.mozilla, the XDG layout (Fedora & co), Flatpak, Snap. Handle every base
# that has a profiles.ini.
FF_BASES="$HOME/.mozilla/firefox
${XDG_CONFIG_HOME:-$HOME/.config}/mozilla/firefox
$HOME/.var/app/org.mozilla.firefox/.mozilla/firefox
$HOME/snap/firefox/common/.mozilla/firefox"

BEGIN="// >>> dotfiles: disable input auto-suggest (managed, do not edit inside)"
END="// <<< dotfiles: disable input auto-suggest"

# Pref values verified against Firefox 149 defaults (omni.ja greprefs.js /
# browser/omni.ja defaults/preferences/firefox.js).
payload=$(cat <<'PREFS'
// --- Saved form history -----------------------------------------------------
// The dropdown of values previously typed into a field. This is the main one.
user_pref("browser.formfill.enable", false);

// --- Form Autofill (addresses & payment cards) ------------------------------
// "available" is the master switch for the whole feature: detect -> off.
user_pref("extensions.formautofill.available", "off");
user_pref("extensions.formautofill.addresses.supported", "off");
user_pref("extensions.formautofill.creditCards.supported", "off");
user_pref("extensions.formautofill.addresses.enabled", false);
user_pref("extensions.formautofill.creditCards.enabled", false);
// Don't offer to remember an address/card after submitting a form either.
user_pref("extensions.formautofill.addresses.capture.enabled", false);
// Don't override a site's autocomplete="off" on these fields.
user_pref("extensions.formautofill.addresses.ignoreAutocompleteOff", false);
user_pref("extensions.formautofill.creditCards.ignoreAutocompleteOff", false);

// --- Saved logins ----------------------------------------------------------
// Stop auto-filling username/password fields on page load. Saved logins are
// still kept and can be filled deliberately -- signon.rememberSignons is left
// at its default on purpose, since that's storage rather than suggestion.
user_pref("signon.autofillForms", false);
user_pref("signon.autofillForms.autocompleteOff", false);
PREFS
)

# Every profile in one base's profiles.ini. A Path starting with / is absolute
# (IsRelative=0); otherwise it's relative to that base.
process_base() {
    ff_dir=$1
    ini="$ff_dir/profiles.ini"
    sed -n 's/^Path=//p' "$ini" | while IFS= read -r p; do
        [ -n "$p" ] || continue
        case "$p" in
            /*) dir="$p" ;;
            *)  dir="$ff_dir/$p" ;;
        esac
        [ -d "$dir" ] || { echo "firefox-autosuggest: skipping missing profile $dir"; continue; }

        js="$dir/user.js"
        tmp=$(mktemp)

        # Carry over everything outside a previously written block.
        if [ -f "$js" ]; then
            awk -v b="$BEGIN" -v e="$END" '
                $0 == b { skip = 1; next }
                $0 == e { skip = 0; next }
                !skip
            ' "$js" > "$tmp"
            # Collapse trailing blank lines so re-runs don't accumulate them.
            while [ -s "$tmp" ] && [ -z "$(tail -n1 "$tmp")" ]; do
                sed -i '$d' "$tmp"
            done
            [ -s "$tmp" ] && printf '\n' >> "$tmp"
        fi

        {
            printf '%s\n' "$BEGIN"
            printf '%s\n' "$payload"
            printf '%s\n' "$END"
        } >> "$tmp"

        mv "$tmp" "$js"
        chmod 644 "$js"
        echo "firefox-autosuggest: wrote $dir/user.js"
    done
}

found=0
# FF_BASES is newline-separated; word-splitting on IFS=newline keeps paths
# with spaces intact (none expected, but cheap to be correct).
old_ifs=$IFS; IFS='
'
for base in $FF_BASES; do
    [ -r "$base/profiles.ini" ] || continue
    found=1
    process_base "$base"
done
IFS=$old_ifs

[ "$found" -eq 1 ] || echo "firefox-autosuggest: no profiles.ini in any known location — nothing to do"
