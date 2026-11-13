#!/usr/bin/env bash
# Synthesizes the series' sound effects with FFmpeg, so they carry no third-party license.
# Output: remotion/public/sfx/*.wav (48 kHz). Re-run any time; files are overwritten.
set -euo pipefail
OUT="$(cd "$(dirname "$0")/.." && pwd)/remotion/public/sfx"
mkdir -p "$OUT"
ff() { ffmpeg -hide_banner -loglevel error -y "$@"; }

# Sub-bass boom: a falling sine plus a short brown-noise thump. Used on every hook slam.
ff -f lavfi -i "aevalsrc=0.95*sin(2*PI*(32+110*exp(-7*t))*t)*exp(-3.2*t):s=48000:d=1.8" \
   -f lavfi -i "anoisesrc=d=0.35:c=brown:a=0.9:r=48000" \
   -filter_complex "[1]lowpass=f=900,afade=t=out:st=0.02:d=0.3[n];[0][n]amix=inputs=2:weights=1 0.7:normalize=0,alimiter=limit=0.95" "$OUT/boom.wav"

# Whoosh for whip pans: band-limited noise that swells and dies.
ff -f lavfi -i "anoisesrc=d=0.5:c=pink:a=0.8:r=48000" \
   -af "highpass=f=350,lowpass=f=5000,afade=t=in:st=0:d=0.22,afade=t=out:st=0.24:d=0.26,volume=1.6" "$OUT/whoosh.wav"

# Crunch: crushed noise burst, for things being ripped out or breaking.
ff -f lavfi -i "anoisesrc=d=0.45:c=white:a=0.9:r=48000" \
   -af "acrusher=bits=4:samples=12:mix=1,lowpass=f=3500,afade=t=out:st=0.05:d=0.4,volume=0.9" "$OUT/crunch.wav"

# Digital glitch stutter for "stuck" beats.
ff -f lavfi -i "aevalsrc=0.35*sgn(sin(2*PI*180*t))*mod(floor(t*36)\,2)+0.2*sin(2*PI*1400*t)*mod(floor(t*23)\,2):s=48000:d=0.45" \
   -af "afade=t=out:st=0.3:d=0.15" "$OUT/glitch.wav"

# Stamp thud.
ff -f lavfi -i "aevalsrc=0.9*sin(2*PI*85*t)*exp(-18*t)+0.3*sin(2*PI*1900*t)*exp(-80*t):s=48000:d=0.35" "$OUT/stamp.wav"

# UI tick.
ff -f lavfi -i "aevalsrc=0.6*sin(2*PI*2400*t)*exp(-120*t):s=48000:d=0.05" "$OUT/tick.wav"

# Sonic logo: three rising bright notes, 1.5 s, used on every end card.
ff -f lavfi -i "aevalsrc=0.4*(sin(2*PI*523.25*t)+0.4*sin(2*PI*1046.5*t))*exp(-4*t):s=48000:d=1.5" \
   -f lavfi -i "aevalsrc=0.4*(sin(2*PI*659.25*t)+0.4*sin(2*PI*1318.5*t))*exp(-4*t):s=48000:d=1.35" \
   -f lavfi -i "aevalsrc=0.5*(sin(2*PI*783.99*t)+0.4*sin(2*PI*1568*t))*exp(-2.6*t):s=48000:d=1.2" \
   -filter_complex "[1]adelay=150|150[b];[2]adelay=300|300[c];[0][b][c]amix=inputs=3:normalize=0,alimiter=limit=0.9" "$OUT/sonic-logo.wav"

ls -1 "$OUT"
