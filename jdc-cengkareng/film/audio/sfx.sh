#!/usr/bin/env bash
# Synthesised SFX for the JDC film (FFmpeg only, no third-party samples). Output: audio/sfx/*.wav
set -euo pipefail
D="$(cd "$(dirname "$0")" && pwd)/sfx"; R="$(cd "$(dirname "$0")/../../.." && pwd)/remotion/public/sfx"; mkdir -p "$D"
ff(){ ffmpeg -hide_banner -loglevel error -y "$@"; }
for n in boom whoosh tick stamp; do cp "$R/$n.wav" "$D/$n.wav"; done
cp "$R/sonic-logo.wav" "$D/logo.wav"
ff -f lavfi -i "anoisesrc=d=0.42:c=white:a=0.9:r=48000" -af "highpass=f=900,lowpass=f=7000,tremolo=f=38:d=0.9,afade=t=in:d=0.02,afade=t=out:st=0.25:d=0.17,volume=1.1" "$D/rip.wav"
ff -f lavfi -i "anoisesrc=d=0.5:c=pink:a=0.7:r=48000" -af "bandpass=f=2600:w=1800,tremolo=f=22:d=0.6,afade=t=in:d=0.03,afade=t=out:st=0.38:d=0.12,volume=1.3" "$D/zip.wav"
ff -f lavfi -i "aevalsrc=0.25*sgn(sin(2*PI*95*t))*0.6+0.15*sin(2*PI*1900*t)*(0.5+0.5*sgn(sin(2*PI*31*t))):s=48000:d=1.3" -af "lowpass=f=4200,afade=t=in:d=0.05,afade=t=out:st=1.1:d=0.2,volume=0.7" "$D/print.wav"
ff -f lavfi -i "aevalsrc=0.9*sin(2*PI*140*t)*exp(-30*t)+0.5*sin(2*PI*2400*t)*exp(-90*t):s=48000:d=0.25" -f lavfi -i "anoisesrc=d=0.12:c=white:a=0.6:r=48000" -filter_complex "[1]highpass=f=1500,afade=t=out:d=0.1[n];[0][n]amix=inputs=2:normalize=0" "$D/slap.wav"
ff -f lavfi -i "aevalsrc=0.45*sin(2*PI*1760*t)*lt(t\,0.09)+0.45*sin(2*PI*2349*t)*gt(t\,0.11)*lt(t\,0.2):s=48000:d=0.24" -af "afade=t=out:st=0.18:d=0.06" "$D/beep.wav"
ff -f lavfi -i "aevalsrc=0.35*sin(2*PI*(300+2600*t*t)*t):s=48000:d=0.7" -af "afade=t=in:d=0.05,afade=t=out:st=0.5:d=0.2,highpass=f=200" "$D/sweep.wav"
ff -f lavfi -i "anoisesrc=d=0.9:c=brown:a=0.9:r=48000" -af "lowpass=f=500,tremolo=f=11:d=0.7,afade=t=in:d=0.1,afade=t=out:st=0.6:d=0.3,volume=1.6" "$D/roll.wav"
ff -f lavfi -i "aevalsrc=0.3*sin(2*PI*(500+900*t)*t)+0.15*sin(2*PI*(1000+1800*t)*t):s=48000:d=0.55" -af "tremolo=f=30:d=0.4,afade=t=out:st=0.4:d=0.15" "$D/stretch.wav"
ff -f lavfi -i "aevalsrc=0.9*sin(2*PI*(70+90*exp(-20*t))*t)*exp(-14*t):s=48000:d=0.4" -f lavfi -i "anoisesrc=d=0.15:c=brown:a=0.7:r=48000" -filter_complex "[1]lowpass=f=700,afade=t=out:d=0.14[n];[0][n]amix=inputs=2:normalize=0" "$D/thud.wav"
ff -f lavfi -i "aevalsrc=0.7*sin(2*PI*(380+900*exp(-28*t))*t)*exp(-22*t):s=48000:d=0.2" "$D/pop.wav"
ff -f lavfi -i "aevalsrc=0.3*sgn(sin(2*PI*(46+6*sin(2*PI*3*t))*t))+0.2*sin(2*PI*92*t):s=48000:d=2.4" -af "lowpass=f=600,afade=t=in:d=0.3,afade=t=out:st=1.7:d=0.7,volume=0.8" "$D/engine.wav"
ff -f lavfi -i "anoisesrc=d=0.45:c=pink:a=0.6:r=48000" -af "bandpass=f=900:w=600,afade=t=in:d=0.08,afade=t=out:st=0.2:d=0.25,volume=1.2" "$D/fold.wav"
ff -f lavfi -i "anoisesrc=d=2.6:c=pink:a=0.9:r=48000" -af "highpass=f=250,lowpass=f=3500,afade=t=in:d=0.9,afade=t=out:st=1.5:d=1.1,volume=1.4" "$D/jet.wav"
ff -f lavfi -i "anoisesrc=d=1.15:c=brown:a=0.9:r=48000" -af "lowpass=f=420,tremolo=f=18:d=0.85,afade=t=in:st=0:d=1.0:curve=exp,afade=t=out:st=1.05:d=0.1,volume=2.2" "$D/rumble.wav"
ff -f lavfi -i "aevalsrc=0.6*sin(2*PI*1250*t)*exp(-90*t)+0.4*sin(2*PI*380*t)*exp(-60*t):s=48000:d=0.09" "$D/key.wav"
ff -f lavfi -i "aevalsrc=1.0*sin(2*PI*(42+150*exp(-12*t))*t)*exp(-4.5*t):s=48000:d=1.3" -f lavfi -i "anoisesrc=d=0.5:c=white:a=0.9:r=48000" -f lavfi -i "aevalsrc=0.5*sin(2*PI*180*t)*exp(-30*t):s=48000:d=0.2" -filter_complex "[1]highpass=f=2500,afade=t=out:st=0.01:d=0.45,volume=0.55[n];[0][n][2]amix=inputs=3:normalize=0,alimiter=limit=0.95" "$D/impact.wav"
ff -f lavfi -i "anoisesrc=d=0.75:c=pink:a=0.9:r=48000" -af "highpass=f=300,lowpass=f=6000,afade=t=in:st=0:d=0.45:curve=exp,afade=t=out:st=0.5:d=0.25,aecho=0.6:0.4:40:0.3,volume=1.8" "$D/swoosh.wav"
ls "$D" | paste -sd' '
