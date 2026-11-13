#!/usr/bin/env python3
"""
Final audio: places each VO line at its scene's voAt (src/content/timeline.json), ducks the music under
the narration (sidechain envelope, ~ -9 dB, 60 ms attack / 350 ms release), adds the SFX stem, and masters
to about -14 LUFS integrated, -1 dBTP (mobile-friendly). Writes:
  public/audio/stems/vo.wav    narration on the timeline
  public/audio/mix.wav         the master the Remotion composition plays
"""
import json
import os
import subprocess
import wave

import numpy as np

SR = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TL = json.load(open(os.path.join(ROOT, "src/content/timeline.json")))
N = int(TL["duration"] * SR)


def read(path):
    with wave.open(path) as w:
        ch, sw, sr = w.getnchannels(), w.getsampwidth(), w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768
    assert sr == SR, (path, sr)
    x = x.reshape(-1, ch)
    if ch == 1:
        x = np.repeat(x, 2, axis=1)
    return x


def write(path, x):
    data = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.reshape(-1).tobytes())


def fit(x):
    out = np.zeros((N, 2))
    m = min(N, len(x))
    out[:m] = x[:m]
    return out


vo = np.zeros((N, 2))
for s in TL["scenes"]:
    x = read(os.path.join(ROOT, "public/audio/vo", f"{s['vo']}.wav"))
    j = int(s["voAt"] * SR)
    e = min(N, j + len(x))
    vo[j:e] += x[: e - j]
    end = s["voAt"] + len(x) / SR
    print(f"{s['id']} VO {s['voAt']:.2f}-{end:.2f}s  (scene ends {s['end']:.2f})", "OVERRUN" if end > s["end"] else "")

music = fit(read(os.path.join(ROOT, "public/audio/stems/music.wav")))
sfx = fit(read(os.path.join(ROOT, "public/audio/stems/sfx.wav")))

# sidechain envelope from the VO level
lvl = np.abs(vo).max(axis=1)
win = int(0.02 * SR)
lvl = np.convolve(lvl, np.ones(win) / win, mode="same")
active = (lvl > 0.01).astype(float)
envl = np.zeros(N)
a = np.exp(-1 / (0.06 * SR))
r = np.exp(-1 / (0.35 * SR))
g = 0.0
for i in range(N):  # one-pole attack/release follower
    x = active[i]
    g = a * g + (1 - a) * x if x > g else r * g + (1 - r) * x
    envl[i] = g
duck = 1 - envl * (1 - 10 ** (-9 / 20))
mix = music * duck[:, None] * 0.9 + vo * 1.0 + sfx * 0.75

os.makedirs(os.path.join(ROOT, "public/audio/stems"), exist_ok=True)
write(os.path.join(ROOT, "public/audio/stems/vo.wav"), vo)
raw = os.path.join(ROOT, "public/audio/mix.raw.wav")
write(raw, mix / max(1.0, np.abs(mix).max() / 0.98))
out = os.path.join(ROOT, "public/audio/mix.wav")
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af",
                "loudnorm=I=-14:TP=-1.0:LRA=9,alimiter=limit=0.89,volume=-1.2dB,alimiter=limit=0.84:level=false", "-ar", str(SR), out], check=True)
os.remove(raw)
print("wrote public/audio/mix.wav")
