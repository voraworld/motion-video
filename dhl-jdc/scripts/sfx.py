#!/usr/bin/env python3
"""
Sound design for the JDC Cengkareng commercial. Every effect is synthesised here (numpy), so nothing
carries a third-party licence. Each cue in CUES is tied to a visual event (see the scene files).

Usage: python3 scripts/sfx.py  ->  public/audio/stems/sfx.wav (+ public/audio/sfx/*.wav one-shots)
"""
import os
import wave

import numpy as np

SR = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RNG = np.random.default_rng(23)
import json
DUR = json.load(open(os.path.join(ROOT, "src/content/timeline.json")))["duration"]


def bp(x, lo=None, hi=None):
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g /= np.sqrt(1 + (f / hi) ** 4)
    if lo:
        g /= np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * g, n)


def T(sec):
    return np.arange(int(sec * SR)) / SR


def noise(sec):
    return RNG.standard_normal(int(sec * SR))


def env(t, a, d):
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


# ---------- one-shots ----------
def seam_cut():  # bright slicing cut + sub punch
    t = T(0.6)
    hiss = bp(noise(0.6), lo=3000) * env(t, 0.002, 0.07) * 0.6
    sub = np.sin(2 * np.pi * (45 * t + 60 / 20 * (1 - np.exp(-20 * t)))) * env(t, 0.003, 0.22)
    return hiss + sub * 0.9


def whoosh(sec=0.55, lo=300, hi=5000, peak=0.5):
    t = T(sec)
    n = bp(noise(sec), lo=lo, hi=hi)
    e = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 2
    e *= np.exp(-((t / sec - peak) ** 2) / 0.08)
    return n * e * 0.9


def thud(sec=0.5, f=70):
    t = T(sec)
    body = np.sin(2 * np.pi * (f * t + 40 / 25 * (1 - np.exp(-25 * t)))) * env(t, 0.002, 0.09)
    card = bp(noise(sec), lo=200, hi=1800) * env(t, 0.001, 0.03) * 0.5
    return body + card


def paper(sec=0.35, bright=1.0):
    t = T(sec)
    n = bp(noise(sec), lo=1500, hi=9000 * bright)
    crackle = (RNG.random(len(t)) < 0.004).astype(float) * RNG.standard_normal(len(t)) * 3
    crackle = bp(crackle, lo=2000)
    e = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 1.5
    return (n * 0.5 + crackle * 0.5) * e


def stamp():
    t = T(0.4)
    return np.sin(2 * np.pi * 95 * t) * env(t, 0.001, 0.05) + bp(noise(0.4), lo=800, hi=4000) * env(t, 0.001, 0.02) * 0.8


def tick(f=2600, vol=0.5):
    t = T(0.06)
    return np.sin(2 * np.pi * f * t) * env(t, 0.0005, 0.01) * vol


def key():
    t = T(0.05)
    return bp(noise(0.05), lo=2500, hi=8000) * env(t, 0.0005, 0.008) * 0.5


def pop():
    t = T(0.18)
    f = 500 + 900 * (1 - np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.002, 0.04) * 0.7


def notify():
    t1 = T(0.35)
    a = np.sin(2 * np.pi * 988 * t1) * env(t1, 0.003, 0.08)
    b = np.sin(2 * np.pi * 1319 * t1) * env(t1, 0.003, 0.12)
    out = np.zeros(int(0.5 * SR))
    out[: len(a)] += a * 0.45
    out[int(0.09 * SR): int(0.09 * SR) + len(b)] += b * 0.4
    return out


def tape():  # packing-tape rip
    sec = 0.55
    t = T(sec)
    grains = np.zeros(len(t))
    rate = 140 + 260 * (t / sec)
    ph = np.cumsum(rate) / SR
    grains += np.sin(2 * np.pi * ph) > 0.92
    tex = bp(noise(sec), lo=900, hi=7000) * (0.4 + grains)
    return tex * np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 0.7 * 0.6


def conveyor(sec=2.2):
    t = T(sec)
    clicks = np.zeros(len(t))
    for i, c in enumerate(np.arange(0, sec, 0.085)):
        j = int(c * SR)
        k = min(len(t) - j, int(0.02 * SR))
        clicks[j: j + k] += np.sin(2 * np.pi * (900 + 80 * (i % 3)) * np.arange(k) / SR) * np.exp(-np.arange(k) / SR / 0.004)
    hum = np.sin(2 * np.pi * 110 * t) * 0.15 + bp(noise(sec), lo=80, hi=500) * 0.25
    e = np.minimum(1, t / 0.3) * np.minimum(1, (sec - t) / 0.4)
    return (clicks * 0.35 + hum) * e


def beep():
    t = T(0.28)
    return (np.sin(2 * np.pi * 1760 * t) * (t < 0.1) + np.sin(2 * np.pi * 1760 * t) * (t > 0.16)) * env(t, 0.002, 0.2) * 0.25


def jet(sec=4.2):
    t = T(sec)
    roar = bp(noise(sec), lo=60, hi=900) * 0.9 + bp(noise(sec), lo=1500, hi=4500) * 0.25
    whine = np.sin(2 * np.pi * np.cumsum(2400 - 900 * t / sec) / SR) * 0.06
    e = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 1.6
    return (roar + whine) * e


def glint():
    out = np.zeros(int(1.2 * SR))
    for i, f in enumerate((2093, 2637, 3136, 4186)):
        t = T(0.8)
        s = np.sin(2 * np.pi * f * t) * env(t, 0.002, 0.25) * 0.18
        j = int(i * 0.06 * SR)
        out[j: j + len(s)] += s
    return out


def clack():
    t = T(0.25)
    return (np.sin(2 * np.pi * 420 * t) * env(t, 0.001, 0.03) + bp(noise(0.25), lo=1500, hi=6000) * env(t, 0.001, 0.015)) * 0.7


def rush(sec=1.2):  # tunnel / passthrough: rising airy swell
    t = T(sec)
    n = bp(noise(sec), lo=500, hi=7000)
    return n * (t / sec) ** 2.5 * np.exp(-np.maximum(0, t - sec * 0.92) / 0.03)


def flutter(sec=0.5, rate=34, bright=1.0):
    """Split-flap cascade: a dense run of small plastic clacks that thins out as the cells land."""
    n = int(sec * SR)
    out = np.zeros(n + int(0.05 * SR))
    tt = 0.0
    i = 0
    while tt < sec:
        j = int(tt * SR)
        m = int(0.018 * SR)
        x = np.arange(m) / SR
        amp = (0.55 + 0.45 * RNG.random()) * (1 - 0.6 * tt / sec)
        click = bp(RNG.standard_normal(m), lo=1800 * bright, hi=7500) * np.exp(-x / 0.0025)
        tone = np.sin(2 * np.pi * (1100 + 300 * RNG.random()) * x) * np.exp(-x / 0.004) * 0.4
        out[j: j + m] += (click + tone) * amp
        tt += (1 / rate) * (0.6 + 0.8 * RNG.random()) * (1 + 0.8 * tt / sec)
        i += 1
    return out


SHOTS = {
    "seam": seam_cut, "whoosh": whoosh, "whoosh_s": lambda: whoosh(0.32, 600, 7000, 0.45), "thud": thud,
    "paper": paper, "paper_big": lambda: paper(0.7, 0.8), "stamp": stamp, "tick": tick, "key": key, "pop": pop,
    "notify": notify, "tape": tape, "conveyor": conveyor, "beep": beep, "jet": jet, "glint": glint, "clack": clack,
    "rush": rush, "rush_long": lambda: rush(1.6),
    "flap_s": lambda: flutter(0.35), "flap": lambda: flutter(0.6), "flap_l": lambda: flutter(0.95, 46), "flap_xl": lambda: flutter(1.0, 60),
}

# (time s, shot, gain) — every cue follows a visual event
CUES = [
    # S01
    (0.0, "flap_l", 0.75), (0.0, "seam", 0.6), (0.62, "whoosh_s", 0.35), (0.78, "thud", 0.85),
    (2.3, "whoosh_s", 0.3),
    (3.3, "flap", 0.55), (3.6, "flap_s", 0.5), (4.26, "flap", 0.55), (4.56, "flap_s", 0.5), (5.22, "flap", 0.55), (5.52, "flap_s", 0.5),
    (6.24, "stamp", 0.85),
    (7.2, "flap_xl", 0.8), (7.25, "whoosh", 0.35),
    # S02
    (8.13, "whoosh_s", 0.2), (10.13, "whoosh_s", 0.2), (10.48, "flap", 0.6), (12.03, "flap", 0.55), (13.23, "flap", 0.55),
    (15.06, "whoosh", 0.6),
    # S03
    (16.11, "flap_s", 0.5), (16.81, "flap_s", 0.5), (17.46, "flap_s", 0.5), (18.66, "flap", 0.55),
    *[(19.06 + i * 0.045, "key", 0.2) for i in range(31)],
    (20.81, "pop", 0.5), (21.86, "whoosh", 0.4), (22.25, "rush", 0.6),
    # S04
    (23.14, "whoosh", 0.45), (25.24, "tick", 0.25), (25.44, "tick", 0.22), (25.64, "tick", 0.22), (28.0, "whoosh", 0.5),
    # S05
    (29.6, "whoosh_s", 0.3), (30.95, "whoosh_s", 0.3), (33.65, "clack", 0.6),
    *[(33.65 + i * 0.15, "paper", 0.3) for i in range(6)],
    (35.35, "pop", 0.4), (35.6, "notify", 0.3), (36.7, "whoosh_s", 0.2),
    (38.95, "paper_big", 0.5), (39.05, "whoosh", 0.4), (40.28, "pop", 0.5),
    # S06
    (41.87, "pop", 0.45), (42.32, "pop", 0.45), (42.47, "tick", 0.3), (43.47, "tick", 0.3), (44.52, "tick", 0.3),
    (45.47, "notify", 0.4), (45.72, "whoosh", 0.35), (46.23, "flap_l", 0.7),
    (53.28, "flap_xl", 0.8), (53.3, "whoosh", 0.35),
    # S07
    (54.0, "tick", 0.3), (54.12, "tick", 0.3), (54.24, "tick", 0.3), (54.11, "flap", 0.5),
    (54.81, "tape", 0.75), (54.98, "thud", 0.45), (55.26, "conveyor", 0.5), (55.36, "flap", 0.5),
    (56.61, "beep", 0.45), (57.3, "jet", 0.55), (57.36, "flap", 0.5),
    (60.96, "flap_xl", 0.8), (61.0, "whoosh", 0.35),
    # S08
    (61.69, "whoosh_s", 0.2), (62.3, "thud", 0.5), (62.94, "whoosh_s", 0.2), (64.04, "flap_l", 0.65), (65.19, "flap", 0.6),
    (69.19, "whoosh_s", 0.18),
    (74.88, "flap_xl", 0.85), (74.88, "glint", 0.5),
]


def write(path, x, stereo=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    x = np.clip(x, -1, 1)
    data = (x * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2 if stereo else 1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


if __name__ == "__main__":
    cache = {k: v() for k, v in SHOTS.items()}
    for k, v in cache.items():
        write(os.path.join(ROOT, "public/audio/sfx", f"{k}.wav"), v / max(1e-9, np.max(np.abs(v))) * 0.9)
    n = int(DUR * SR)
    bus = np.zeros((n, 2))
    for i, (t0, name, g) in enumerate(CUES):
        s = cache[name]
        s = s / max(1e-9, np.max(np.abs(s)))
        j = int(t0 * SR)
        e = min(n, j + len(s))
        pan = np.sin(i * 1.7) * 0.25
        bus[j:e, 0] += s[: e - j] * g * (1 - pan)
        bus[j:e, 1] += s[: e - j] * g * (1 + pan)
    bus *= 0.5
    write(os.path.join(ROOT, "public/audio/stems/sfx.wav"), bus.reshape(-1), stereo=True)
    print("wrote public/audio/stems/sfx.wav", len(CUES), "cues")
