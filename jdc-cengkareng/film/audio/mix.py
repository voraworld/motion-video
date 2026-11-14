#!/usr/bin/env python3
"""Mixes music + voice-over + SFX from ../timeline.json into audio/mix.wav (-14 LUFS, -1 dBTP).
The music ducks under the voice with a sidechain compressor, so the VO stays clear."""
import json, os, subprocess
H = os.path.dirname(os.path.abspath(__file__)); TL = json.load(open(os.path.join(H, "..", "timeline.json")))
ins, f = ["-i", os.path.join(H, "music.wav")], []
vo_l, sfx_l = [], []
n = 1
for sid, at in TL["vo"]:
    ins += ["-i", os.path.join(H, "vo", f"{sid}.wav")]; ms = int(at * 1000)
    f.append(f"[{n}]adelay={ms}|{ms},aformat=channel_layouts=stereo[v{n}]"); vo_l.append(f"[v{n}]"); n += 1
for at, name, g in TL["sfx"]:
    ins += ["-i", os.path.join(H, "sfx", f"{name}.wav")]; ms = int(at * 1000)
    f.append(f"[{n}]adelay={ms}|{ms},aformat=channel_layouts=stereo,volume={g*0.6:.3f}[x{n}]"); sfx_l.append(f"[x{n}]"); n += 1
f.append("".join(vo_l) + f"amix=inputs={len(vo_l)}:normalize=0,apad=whole_dur={TL['duration']}[vo]")
f.append("".join(sfx_l) + f"amix=inputs={len(sfx_l)}:normalize=0,apad=whole_dur={TL['duration']}[sfx]")
f.append("[vo]asplit=2[vo1][vo2]")
f.append("[0]aformat=channel_layouts=stereo,volume=1.0[mu];[mu][vo1]sidechaincompress=threshold=0.03:ratio=4:attack=12:release=260:makeup=1[duck]")
f.append(f"[duck][vo2][sfx]amix=inputs=3:normalize=0:weights=1.05 1.3 0.85,atrim=0:{TL['duration']},loudnorm=I=-14:TP=-1:LRA=11,aresample=48000[out]")
out = os.path.join(H, "mix.wav")
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *ins, "-filter_complex", ";".join(f), "-map", "[out]", out], check=True)
print("wrote", out)
