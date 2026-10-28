#!/bin/sh
# Draws the app icon on a 1024 px canvas and scales it down to the Sailfish sizes
# (86/108/128/172). Run: sh icons/draw.sh (ImageMagick 7).
#
# Sailfish style as in the system icons (icon-launcher-*): a "leaf" filling the canvas —
# three heavily rounded corners and one sharp one (here bottom right) —, a soft diagonal
# gradient from a light top corner to a darker bottom corner, a light motif with a faint
# shadow. Motif: two ticks and an empty box (a shopping list).
set -e
cd "$(dirname "$0")"
K=1024
R=430
LEAF="path 'M 0,$R A $R,$R 0 0 1 $R,0 L $((K - R)),0 A $R,$R 0 0 1 $K,$R L $K,$K L $R,$K A $R,$R 0 0 1 0,$((K - R)) Z'"

# Base: gradient in the shape of the leaf.
magick -size ${K}x${K} -define gradient:angle=135 gradient:'#7ddc9c'-'#1e8449' grad.png
magick -size ${K}x${K} xc:black -fill white -draw "$LEAF" mask.png
magick grad.png mask.png -alpha off -compose CopyOpacity -composite base.png

# Motif: a light list; the same drawing as the shadow (dark, blurred, slightly down-right).
MOTIF="polyline 250,330 308,388 408,280   line 492,336 780,336
       polyline 250,522 308,580 408,472   line 492,528 780,528
       line 492,720 780,720"
magick -size ${K}x${K} xc:none -fill none -stroke '#fdfdf5' -strokewidth 62 \
  -draw "stroke-linecap round stroke-linejoin round $MOTIF" \
  -strokewidth 40 -draw 'roundrectangle 262,668 382,788 22,22' motif.png
magick motif.png -fill '#0b3d20' -colorize 100 -channel A -evaluate multiply 0.35 +channel \
  -blur 0x18 shadow.png

magick base.png \( shadow.png -geometry +10+16 \) -composite motif.png -composite big.png
for s in 86 108 128 172; do magick big.png -filter Lanczos -resize ${s}x${s} ${s}x${s}.png; done
rm -f grad.png mask.png base.png motif.png shadow.png big.png
