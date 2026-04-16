#!/bin/bash
set -euo pipefail

outputs=$(niri msg outputs | grep -B1 "Current mode" | awk '/^Output/{print $NF}' | tr -d '"()')

# Screenshot all outputs in parallel
for output in $outputs; do
    grim -o "$output" "/tmp/lock-$output.png" &
done
wait

# Glitch all in parallel with corrupter
for output in $outputs; do
    corrupter -mag 1 -lag 0.001 -stride 0.4 -boffset 80 -bheight 30 -meanabber 2 -stdabber 25 -add 5 "/tmp/lock-$output.png" "/tmp/lock-blur-$output.png" &
done
wait

args=()
for output in $outputs; do
    args+=(-i "$output:/tmp/lock-blur-$output.png")
done

swaylock "${args[@]}"
