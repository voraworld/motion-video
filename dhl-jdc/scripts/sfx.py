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
DUR = 86.4


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


SHOTS = {
    "seam": seam_cut, "whoosh": whoosh, "whoosh_s": lambda: whoosh(0.32, 600, 7000, 0.45), "thud": thud,
    "paper": paper, "paper_big": lambda: paper(0.7, 0.8), "stamp": stamp, "tick": tick, "key": key, "pop": pop,
    "notify": notify, "tape": tape, "conveyor": conveyor, "beep": beep, "jet": jet, "glint": glint, "clack": clack,
    "rush": rush, "rush_long": lambda: rush(1.6),
}

# (time s, shot, gain) — every cue follows a visual event
CUES = [
    (0.0, "seam", 0.9), (0.02, "whoosh_s", 0.5), (0.1, "whoosh_s", 0.4), (0.18, "whoosh_s", 0.35),
    (0.45, "whoosh", 0.45), (0.92, "thud", 0.85),
    (2.05, "whoosh_s", 0.3),
    (2.45, "paper", 0.5), (2.65, "paper", 0.45), (2.85, "paper", 0.45), (3.05, "paper", 0.4),
    (2.88, "stamp", 0.7), (3.84, "stamp", 0.75),
    *[(4.25 + i * 0.12, "tick", 0.25) for i in range(6)],
    (6.24, "stamp", 0.8),
    (7.68, "whoosh", 0.35), (7.95, "whoosh", 0.55), (8.05, "paper_big", 0.6),
    (9.6, "glint", 0.5),
    (12.4, "whoosh_s", 0.4), (12.6, "whoosh", 0.35),
    (16.25, "whoosh", 0.4), (16.6, "rush_long", 0.55),
    (17.35, "whoosh_s", 0.35),
    (18.68, "tick", 0.35), (19.53, "tick", 0.35), (20.13, "tick", 0.35),
    *[(20.98 + i * 0.055, "key", 0.22) for i in range(31)],
    (27.18, "pop", 0.45), (27.55, "rush_long", 0.5),
    (28.9, "whoosh", 0.4), (29.6, "whoosh_s", 0.25),
    (31.8, "tick", 0.25), (32.0, "tick", 0.22), (32.25, "tick", 0.22),
    (37.2, "rush", 0.6), (38.4, "whoosh", 0.35),
    (40.6, "whoosh_s", 0.3),
    *[(43.4 + i * 0.16, "paper", 0.32) for i in range(6)],
    (43.4, "clack", 0.6), (44.95, "pop", 0.4), (45.4, "notify", 0.32),
    (50.4, "paper_big", 0.5), (50.6, "whoosh", 0.4),
    (51.84, "pop", 0.5),
    (53.74, "pop", 0.45), (54.29, "pop", 0.45), (54.44, "tick", 0.3), (55.39, "tick", 0.3), (56.34, "tick", 0.3),
    (57.79, "notify", 0.4),
    (58.55, "thud", 0.5), (58.9, "clack", 0.35), (59.03, "clack", 0.35), (59.16, "clack", 0.35),
    (64.75, "whoosh", 0.6),
    (65.3, "tick", 0.3), (65.4, "tick", 0.3), (65.5, "tick", 0.3),
    (66.25, "tape", 0.75), (66.5, "thud", 0.45),
    (66.85, "conveyor", 0.5), (68.73, "beep", 0.5),
    (69.4, "jet", 0.55),
    (73.7, "whoosh", 0.4), (74.3, "rush", 0.4),
    (77.75, "whoosh_s", 0.3), (78.15, "clack", 0.3), (78.27, "clack", 0.3), (78.39, "clack", 0.3),
    (82.56, "glint", 0.6),
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
