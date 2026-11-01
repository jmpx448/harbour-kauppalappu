#!/bin/sh
# Draws the cover image of the store page (1080x540 px) on a double-size canvas and scales
# it down. Run: sh store/draw.sh (ImageMagick 7). Colours as in the app icon (icons/draw.sh).
# Not part of the RPM.
set -e
cd "$(dirname "$0")"
TITLE_FONT=$(fc-match -f '%{file}' 'Inter:medium')
GREEN='#1e8449'
INK='#2c3e50'
PENCIL='#6b7c85'

# Everything below is in 1080x540 coordinates.
SCENE=$(cat <<'MVG'
scale 2,2

# --- groceries behind the rim of the basket
push graphic-context
  # baguette
  translate 862,250 rotate 12
  fill '#e3a44a' roundrectangle -26,-92 26,110 26,26
  stroke '#b97a26' stroke-width 5 stroke-linecap round fill none
  line -12,-62 12,-42  line -12,-22 12,-2  line -12,18 12,38
pop graphic-context
push graphic-context
  # milk carton
  translate 700,262
  fill '#5dade2' polygon -44,-26 44,-26 44,86 -44,86
  fill '#aed6f1' polygon -44,-26 44,-26 28,-62 -28,-62
  fill '#f8fbfd' roundrectangle -30,6 30,62 8,8
  fill '#5dade2' circle 0,34 16,34
pop graphic-context
fill '#7dbb3c' circle 780,304 780,246
fill '#65a12c' path 'M 780,250 q 10,-26 34,-30 q -4,28 -34,30 Z'
stroke '#5b4a2e' stroke-width 5 stroke-linecap round line 780,250 776,230 stroke none
fill '#f4c20d' circle 636,318 636,276
fill '#e0ad08' path 'M 632,280 q 2,-14 12,-18 l 4,6 q -8,4 -8,12 Z'
fill '#7d3c98' ellipse 938,296 34,54 0,360
fill '#5f8f2a' path 'M 918,250 q 20,-24 40,0 q -20,-8 -40,0 Z'

# --- basket
fill '#e74c3c' path 'M 612,350 L 968,350 L 930,512 Q 926,526 912,526 L 668,526 Q 654,526 650,512 Z'
fill '#b93a2e'
roundrectangle 660,386 684,500 12,12
roundrectangle 708,386 732,500 12,12
roundrectangle 756,386 780,500 12,12
roundrectangle 804,386 828,500 12,12
roundrectangle 852,386 876,500 12,12
roundrectangle 900,386 924,500 12,12
fill '#c0392b' roundrectangle 590,326 990,362 18,18
stroke '#566573' stroke-width 16 stroke-linecap round line 790,340 646,438 stroke none
fill '#566573' circle 790,340 790,326
MVG
)

magick -size 2160x1080 -define gradient:angle=135 gradient:'#e4f7ea'-'#a9e2bf' bg.png

# The paper, drawn straight; everything on it is turned together further down.
magick -size 2160x1080 xc:none -fill white -draw 'roundrectangle 150,250 1070,1036 16,16' PNG32:paper.png

# Squared paper: a light grid clipped to the paper. The boxes and rows sit on its lines.
GRID=""
for x in $(seq 14 56 2160); do GRID="$GRID line $x,0 $x,1080"; done
for y in $(seq 40 56 1080); do GRID="$GRID line 0,$y 2160,$y"; done
magick -size 2160x1080 xc:none -fill none -stroke '#bcd9ea' -strokewidth 2 -draw "$GRID" grid.png
magick grid.png paper.png -compose DstIn -composite grid.png

# The list: ticked and empty rows as in the app, drawn with a pencil.
ROWS=""
TICKS=""
i=0
for tick in 1 1 0 1 0; do
  y=$((488 + i * 112))
  ROWS="$ROWS rectangle 238,$((y - 56)) 294,$y line 350,$y 966,$y"
  [ "$tick" = 1 ] && TICKS="$TICKS polyline 248,$((y - 30)) 268,$((y - 8)) 322,$((y - 76))"
  i=$((i + 1))
done
magick -size 2160x1080 xc:none -fill none -stroke "$PENCIL" -strokewidth 5 -draw "$ROWS" rows.png
magick -size 2160x1080 xc:none -fill none -stroke "$GREEN" -strokewidth 15 \
  -draw "stroke-linecap round stroke-linejoin round $TICKS" ticks.png

# The heading in block letters, drawn stroke by stroke (no such font on this machine).
# Glyphs: origin on the baseline, x-height 30, ascender 50, descender 16.
HEADING=""
x=0
glyph() {
  HEADING="$HEADING push graphic-context translate $x,0 path '$2' pop graphic-context"
  x=$((x + $1 + 7))
}
H='M 2,-50 L 2,0 M 2,-16 C 4,-34 24,-34 24,-16 L 24,0'
N='M 2,-30 L 2,0 M 2,-16 C 4,-34 24,-34 24,-16 L 24,0'
O='M 13,-30 C 30,-30 30,0 13,0 C -4,0 -4,-30 13,-30 Z'
P='M 2,-30 L 2,16 M 2,-20 C 8,-34 28,-32 28,-15 C 28,2 8,3 2,-8'
I='M 2,-30 L 2,0 M 2,-42 L 2.1,-42'
G='M 26,-16 C 26,-33 0,-34 0,-15 C 0,2 26,2 26,-14 M 26,-30 L 26,8 C 26,20 6,22 1,12'
L='M 2,-50 L 2,0'
glyph 30 'M 26,-40 C 20,-50 2,-48 2,-36 C 2,-22 28,-26 28,-11 C 28,2 6,3 0,-7'
glyph 26 "$H"; glyph 26 "$O"; glyph 30 "$P"; glyph 30 "$P"; glyph 6 "$I"; glyph 26 "$N"; glyph 28 "$G"
x=$((x + 18))
glyph 6 "$L"; glyph 6 "$I"
glyph 24 'M 20,-25 C 16,-32 2,-31 2,-23 C 2,-13 22,-17 22,-7 C 22,2 4,2 0,-5'
glyph 22 'M 9,-44 L 9,-6 C 9,0 16,2 20,-2 M 0,-30 L 18,-30'
magick -size 2160x1080 xc:none -fill none -stroke "$INK" -strokewidth 6 \
  -draw "stroke-linecap round stroke-linejoin round scale 2,2 translate 157,180 scale 0.85,0.85 $HEADING" heading.png

# The finished sheet at a slant, like a magnet put on a fridge door: clockwise, a little
# smaller so that the corners stay on the canvas and clear of the title.
magick paper.png grid.png -composite rows.png -composite ticks.png -composite \
  heading.png -composite -virtual-pixel transparent -distort SRT '610,643 0.92 9 610,646' PNG32:sheet.png
magick sheet.png -alpha extract -background '#0b3d20' -alpha shape \
  -channel A -evaluate multiply 0.28 +channel -blur 0x16 shadow.png

cp ../icons/172x172.png icon.png
magick bg.png \( shadow.png -geometry +8+12 \) -composite sheet.png -composite \
  -draw "$SCENE" \
  -font "$TITLE_FONT" -pointsize 136 -fill "$GREEN" -gravity North -annotate +86+52 'Kauppalappu' \
  \( icon.png -filter Lanczos -resize 150x150 \) -gravity NorthWest -geometry +576+50 -composite \
  big.png
magick big.png -filter Lanczos -resize 1080x540 -alpha off -strip -depth 8 cover.png
rm -f icon.png bg.png paper.png sheet.png shadow.png grid.png rows.png ticks.png heading.png big.png
