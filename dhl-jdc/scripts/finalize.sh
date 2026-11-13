#!/usr/bin/env bash
# Turns the Remotion render into the delivery master: limited-range yuv420p H.264 + the mastered mix (AAC 256k).
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=${1:-out/master_raw.mp4}
ffmpeg -hide_banner -loglevel error -y -i "$RAW" -i public/audio/mix.wav -map 0:v -map 1:a \
  -vf "scale=in_range=full:out_range=tv,format=yuv420p" -c:v libx264 -preset slow -crf 17 -profile:v high -level 4.2 \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest out/JDC_CENGKARENG_DHL_EXPRESS_MASTER.mp4
