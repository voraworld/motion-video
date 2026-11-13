#!/usr/bin/env bash
# Builds every deliverable from a rendered master.
# Expects out/JDC_CENGKARENG_DHL_EXPRESS_MASTER.mp4. Output: ../deliverables/dhl-jdc-cengkareng/
set -euo pipefail
cd "$(dirname "$0")/.."
D=../deliverables/dhl-jdc-cengkareng
M=out/JDC_CENGKARENG_DHL_EXPRESS_MASTER.mp4
mkdir -p "$D/JDC_CENGKARENG_AUDIO" "$D/JDC_CENGKARENG_STATUS"
cp "$M" "$D/"

# Poster: the held final CTA frame, rendered as a lossless still.
node scripts/stills.mjs 76.5 out/poster >/dev/null
python3 -c "from PIL import Image; Image.open('out/poster/t76.50.jpg').save('$D/JDC_CENGKARENG_POSTER.png')"

# Contact sheet: three frames per scene, taken from the actual master.
TIMES="0.6 3.9 6.5 9.0 11.2 14.0 16.5 19.0 21.0 24.0 26.2 28.3 31.5 35.0 38.0 43.0 46.8 50.0 54.4 56.6 59.2 64.0 70.0 76.3"
rm -rf out/sheet && mkdir -p out/sheet
for s in $TIMES; do ffmpeg -hide_banner -loglevel error -y -ss "$s" -i "$M" -frames:v 1 "out/sheet/t$s.jpg"; done
python3 scripts/sheet.py $(for s in $TIMES; do echo "out/sheet/t$s.jpg"; done) --cols 6 --w 300 -o "$D/JDC_CENGKARENG_PREVIEW_CONTACT_SHEET.png"

# Audio stems + master mix.
cp public/audio/stems/music.wav "$D/JDC_CENGKARENG_AUDIO/JDC_music.wav"
cp public/audio/stems/vo.wav "$D/JDC_CENGKARENG_AUDIO/JDC_voiceover.wav"
cp public/audio/stems/sfx.wav "$D/JDC_CENGKARENG_AUDIO/JDC_sfx.wav"
cp public/audio/mix.wav "$D/JDC_CENGKARENG_AUDIO/JDC_final_mix.wav"

# WhatsApp Status parts (≤ 30 s each), cut on scene boundaries so each part starts and ends cleanly.
cut() { ffmpeg -hide_banner -loglevel error -y -ss "$2" -to "$3" -i "$M" -c:v libx264 -crf 19 -preset slow -pix_fmt yuv420p \
  -af "afade=t=in:d=0.12,afade=t=out:st=$(python3 -c "print(round($3-$2-0.25,3))"):d=0.25" -c:a aac -b:a 192k -movflags +faststart "$D/JDC_CENGKARENG_STATUS/$1"; }
rm -f "$D/JDC_CENGKARENG_STATUS/"*.mp4
cut "JDC_STATUS_1of4_0000-0023.mp4" 0 23.04
cut "JDC_STATUS_2of4_0023-0040.mp4" 23.04 40.32
cut "JDC_STATUS_3of4_0040-0053.mp4" 40.32 53.76
cut "JDC_STATUS_4of4_0053-0116.mp4" 53.76 76.8

# Source archive (no node_modules / renders).
rm -f "$D/JDC_CENGKARENG_DHL_EXPRESS_SOURCE.zip"
(cd .. && zip -qr "deliverables/dhl-jdc-cengkareng/JDC_CENGKARENG_DHL_EXPRESS_SOURCE.zip" dhl-jdc -x "dhl-jdc/node_modules/*" "dhl-jdc/out/*")
ls -la "$D" "$D"/*/
