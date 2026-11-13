#!/usr/bin/env bash
# Renders one episode and masters its audio to -14 LUFS / -1.5 dBTP (TikTok, Reels, Shorts).
# Usage: bash scripts/render.sh E01 [draft|final]   → remotion/out/e01-draft.mp4
set -euo pipefail
ID="${1:?episode id, e.g. E01}"
KIND="${2:-draft}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LC="$(echo "$ID" | tr '[:upper:]' '[:lower:]')"
OUT="$ROOT/remotion/out/$LC-$KIND.mp4"
cd "$ROOT/remotion"
node ../scripts/manifest.mjs
npx remotion render "$ID" "$OUT.raw.mp4" --codec=h264 --crf=18 --audio-codec=aac --concurrency=4 --log=error
ffmpeg -hide_banner -loglevel error -y -i "$OUT.raw.mp4" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -c:a aac -b:a 192k "$OUT"
rm -f "$OUT.raw.mp4"
ffmpeg -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
echo "$OUT"
