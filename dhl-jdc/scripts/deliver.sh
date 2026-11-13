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
node scripts/stills.mjs 86.3 out/poster >/dev/null
python3 -c "from PIL import Image; Image.open('out/poster/t86.30.jpg').save('$D/JDC_CENGKARENG_POSTER.png')"

# Contact sheet: three frames per scene, taken from the actual master.
TIMES="1.0 4.2 6.8 10.6 13.6 16.4 19.6 24.5 27.6 30.6 33.8 37.9 41.0 45.6 49.0 53.6 56.5 61.0 66.0 68.3 71.6 76.8 80.5 85.5"
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
cut "JDC_STATUS_1of4_0000-0028.mp4" 0 28.8
cut "JDC_STATUS_2of4_0028-0051.mp4" 28.8 51.84
cut "JDC_STATUS_3of4_0051-0114.mp4" 51.84 74.88
cut "JDC_STATUS_4of4_0114-0126.mp4" 74.88 86.4

# Source archive (no node_modules / renders).
rm -f "$D/JDC_CENGKARENG_DHL_EXPRESS_SOURCE.zip"
(cd .. && zip -qr "deliverables/dhl-jdc-cengkareng/JDC_CENGKARENG_DHL_EXPRESS_SOURCE.zip" dhl-jdc -x "dhl-jdc/node_modules/*" "dhl-jdc/out/*")
ls -la "$D" "$D"/*/
