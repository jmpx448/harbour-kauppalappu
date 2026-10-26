#!/bin/sh
# Piirtää sovelluskuvakkeen 1024 px:n kankaalle ja pienentää Sailfishin koot (86/108/128/172).
# Aja: sh icons/piirra.sh (ImageMagick 7). Vihreä ympyrä, kaksi rastia ja yksi tyhjä ruutu.
set -e
cd "$(dirname "$0")"
magick -size 1024x1024 xc:none \
  -fill '#2e7d32' -draw 'circle 512,512 512,16' \
  -fill none -stroke white -strokewidth 64 -draw 'stroke-linecap round stroke-linejoin round
     polyline 248,336 304,392 400,288   line 496,344 784,344
     polyline 248,536 304,592 400,488   line 496,544 784,544
     line 496,744 784,744' \
  -strokewidth 40 -draw 'roundrectangle 256,688 368,800 20,20' \
  iso.png
for s in 86 108 128 172; do magick iso.png -filter Lanczos -resize ${s}x${s} ${s}x${s}.png; done
rm -f iso.png
