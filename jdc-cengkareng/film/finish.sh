#!/usr/bin/env bash
# Mux rendered frames + mixed audio into the final MP4, embed ownership metadata, write a SHA-256 fingerprint.
# Usage: bash finish.sh <frames-dir>
set -euo pipefail
H="$(cd "$(dirname "$0")" && pwd)"; FR="${1:?frames dir}"; OUT="$H/out"; mkdir -p "$OUT"
NAME="jdc-cengkareng-shipping-unboxed-86s"
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i "$FR/%05d.jpg" -i "$H/audio/mix.wav" \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -level 4.2 -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart \
  -metadata title="DHL Express Service Point JDC Cengkareng · Shipping, Unboxed." \
  -metadata artist="Service Point JDC Cengkareng" \
  -metadata copyright="(c) 2026 Service Point JDC Cengkareng. Official video. Editing or re-branding is not permitted." \
  -metadata comment="Official video of Service Point JDC Cengkareng, Soewarna Business Park Lot 7A-7B, Soekarno-Hatta Int'l Airport Area. WhatsApp +62 877-7589-7478. ID JDC-CGK-2026-11-V2" \
  "$OUT/$NAME.mp4"
# light version for previews / WhatsApp sharing
ffmpeg -hide_banner -loglevel error -y -i "$OUT/$NAME.mp4" -vf scale=720:1280 -c:v libx264 -preset slow -crf 26 -c:a aac -b:a 128k -movflags +faststart -map_metadata 0 "$OUT/$NAME-720p.mp4"
( cd "$OUT" && sha256sum "$NAME.mp4" "$NAME-720p.mp4" > "$NAME.sha256" )
ls -la "$OUT"; cat "$OUT/$NAME.sha256"
