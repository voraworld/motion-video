#!/usr/bin/env bash
# Renders one episode and masters its audio to -14 LUFS / -1.5 dBTP (TikTok, Reels, Shorts).
# Usage: [CONCURRENCY=2] bash scripts/render.sh E01 [draft|final]   → remotion/out/e01-draft.mp4
set -euo pipefail
ID="${1:?episode id, e.g. E01}"
KIND="${2:-draft}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LC="$(echo "$ID" | tr '[:upper:]' '[:lower:]')"
OUT="$ROOT/remotion/out/$LC-$KIND.mp4"
cd "$ROOT/remotion"
node ../scripts/manifest.mjs
npx remotion render "$ID" "$OUT.raw.mp4" --codec=h264 --crf=18 --audio-codec=aac --concurrency=${CONCURRENCY:-4} --log=error
# Two-pass loudness normalisation (measure, then apply) so the master lands on -14 LUFS exactly.
M=$(ffmpeg -hide_banner -i "$OUT.raw.mp4" -af "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$M" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
LN="loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true"
ffmpeg -hide_banner -loglevel error -y -i "$OUT.raw.mp4" -c:v copy -af "$LN" -ar 48000 -c:a aac -b:a 192k "$OUT"
rm -f "$OUT.raw.mp4"
ffmpeg -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
echo "$OUT"
