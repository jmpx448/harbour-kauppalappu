#!/bin/sh
# Piirtää sovelluskuvakkeen 1024 px:n kankaalle ja pienentää Sailfishin koot (86/108/128/172).
# Aja: sh icons/piirra.sh (ImageMagick 7).
#
# Sailfish-tyyli kuten järjestelmän kuvakkeissa (icon-launcher-*): koko kankaan täyttävä
# "lehti" — kolme isosti pyöristettyä kulmaa ja yksi terävä (tässä oikea alakulma) —,
# pehmeä viistoliukuväri vaaleasta yläkulmasta tummempaan alakulmaan, vaalea aihe
# hennolla varjolla. Aihe: kaksi rastia ja tyhjä ruutu (ostoslista).
set -e
cd "$(dirname "$0")"
K=1024
R=430
LEHTI="path 'M 0,$R A $R,$R 0 0 1 $R,0 L $((K - R)),0 A $R,$R 0 0 1 $K,$R L $K,$K L $R,$K A $R,$R 0 0 1 0,$((K - R)) Z'"

# Pohja: liukuväri lehden muotoon.
magick -size ${K}x${K} -define gradient:angle=135 gradient:'#7ddc9c'-'#1e8449' grad.png
magick -size ${K}x${K} xc:black -fill white -draw "$LEHTI" maski.png
magick grad.png maski.png -alpha off -compose CopyOpacity -composite pohja.png

# Aihe: vaalea lista; sama piirros varjoksi (tumma, sumea, hieman alas-oikealle).
AIHE="polyline 250,330 308,388 408,280   line 492,336 780,336
      polyline 250,522 308,580 408,472   line 492,528 780,528
      line 492,720 780,720"
magick -size ${K}x${K} xc:none -fill none -stroke '#fdfdf5' -strokewidth 62 \
  -draw "stroke-linecap round stroke-linejoin round $AIHE" \
  -strokewidth 40 -draw 'roundrectangle 262,668 382,788 22,22' aihe.png
magick aihe.png -fill '#0b3d20' -colorize 100 -channel A -evaluate multiply 0.35 +channel \
  -blur 0x18 varjo.png

magick pohja.png \( varjo.png -geometry +10+16 \) -composite aihe.png -composite iso.png
for s in 86 108 128 172; do magick iso.png -filter Lanczos -resize ${s}x${s} ${s}x${s}.png; done
rm -f grad.png maski.png pohja.png aihe.png varjo.png iso.png
