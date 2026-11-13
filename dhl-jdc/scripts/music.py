#!/usr/bin/env python3
"""
Original soundtrack for the DHL Express Service Point JDC Cengkareng commercial.
Everything is synthesised here with numpy (no samples, no loops, no third-party music), so the
track carries no licence restrictions. 125 BPM, 86.4 s = 45 bars of 4/4 (one bar = 1.92 s).

Arrangement (bars, from src/content/timeline.json scene starts):
  0-3   HOOK      B minor. Boom on frame 0, driving taiko/toms, 16th bass ostinato, big hits on the
                  three text slams (0.0, 2.88, 3.84) and the "NOT IN THE MOOD?" accent (6.24),
                  then a near-silent gap and a riser into the reveal.
  5-8   REVEAL    D major. Crash + brass chord on 9.6 s, half-time drums, bright plucks, pad.
  9-19  GROOVE    Four-on-the-floor pop groove, clap 2/4, offbeat hats, pumping bass, arp, lead hook.
  20-26 SPACE     Breakdown under the MyDHL+ message: no kick, soft pad and arp, riser at the end.
  27-33 PLAYFUL   Lighter groove, marimba-like call/response, chime on the WhatsApp number.
  34-38 BUILD     Strings ostinato, toms, snare roll and riser into the finale.
  39-42 FINALE    Full lift: crash, anthem lead, brass, strings.
  43-44 BUTTON    Final chord hit on 82.56 s and a natural decay to the end.

Usage: python3 scripts/music.py   ->  public/audio/stems/music.wav  (-17 LUFS, -1.5 dBTP)
"""
import json
import os
import subprocess
import wave

import numpy as np

SR = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RNG = np.random.default_rng(11)
TL = json.load(open(os.path.join(ROOT, "src/content/timeline.json")))
BPM = TL["bpm"]
BEAT = 60 / BPM
BAR = BEAT * 4
S16 = BEAT / 4
DUR = TL["duration"]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def fft_filter(x, lo=None, hi=None, order=2):
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    return np.fft.irfft(X * g, n)


def saw(freq, n, detune=0.0, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((freq * (1 + detune) * t + phase) % 1.0) - 1


def adsr(n, a=0.005, d=0.1, s=0.7, r=0.1):
    e = np.ones(n) * s
    na = max(1, min(int(a * SR), n))
    e[:na] = np.linspace(0, 1, na)
    nd = min(int(d * SR), n - na)
    if nd > 0:
        e[na: na + nd] = np.linspace(1, s, nd)
    nr = min(int(r * SR), n)
    if nr > 0:
        e[n - nr:] *= np.linspace(1, 0, nr)
    return e


class Mix:
    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.bus = {k: np.zeros((self.n, 2)) for k in ("drums", "bass", "pad", "lead", "fx")}

    def add(self, bus, sig, at, gain=1.0, pan=0.0):
        i = int(round(at * SR))
        if i >= self.n or len(sig) == 0 or i < 0:
            return
        j = min(self.n, i + len(sig))
        s = sig[: j - i] * gain
        if s.ndim == 1:
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            self.bus[bus][i:j, 0] += s * l * 1.414
            self.bus[bus][i:j, 1] += s * r * 1.414
        else:
            self.bus[bus][i:j] += s


# ---------------- instruments ----------------
def kick(vel=1.0, punch=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * (50 * t + (150 * punch / 30) * (1 - np.exp(-30 * t)))
    body = np.sin(ph) * np.exp(-t * 7)
    click = fft_filter(RNG.standard_normal(n), lo=2000) * np.exp(-t * 500) * 0.25
    return np.tanh(1.6 * (body + click)) * vel


def boom(length=2.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (34 * t + (95 / 6) * (1 - np.exp(-6 * t)))) * np.exp(-t * 1.5)
    taiko = np.sin(2 * np.pi * (70 * t + (60 / 18) * (1 - np.exp(-18 * t)))) * np.exp(-t * 4)
    skin = fft_filter(RNG.standard_normal(n), hi=900) * np.exp(-t * 14) * 2.5
    return np.tanh(1.4 * (sub + 0.8 * taiko + skin))


def taiko(vel=1.0, pitch=72):
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (pitch * t + (40 / 14) * (1 - np.exp(-14 * t)))) * np.exp(-t * 6)
    skin = fft_filter(RNG.standard_normal(n), lo=80, hi=1200) * np.exp(-t * 25) * 1.4
    return np.tanh(1.3 * (body + skin)) * vel


def heartbeat(vel=1.0):
    """'dag-dug': a low, felt thump with a soft skin click."""
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (48 * t + (40 / 16) * (1 - np.exp(-16 * t)))) * np.exp(-t * 11)
    skin = fft_filter(RNG.standard_normal(n), lo=60, hi=600) * np.exp(-t * 45) * 0.6
    return np.tanh(2.0 * (body + skin)) * vel


def tom(pitch=110, vel=1.0):
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (pitch * t + (pitch * 0.5 / 20) * (1 - np.exp(-20 * t)))) * np.exp(-t * 9)
    return (body + fft_filter(RNG.standard_normal(n), hi=2500) * np.exp(-t * 40) * 0.3) * vel


def snare(vel=1.0):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    noise = fft_filter(RNG.standard_normal(n), lo=1200, hi=9000) * np.exp(-t * 20) * 0.8
    tone = np.sin(2 * np.pi * 200 * t) * np.exp(-t * 28) * 0.6
    return (noise + tone) * vel


def clap(vel=1.0):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k, off in enumerate((0, 0.008, 0.017, 0.026)):
        i = int(off * SR)
        tt = t[: n - i]
        out[i:] += RNG.standard_normal(n - i) * np.exp(-tt * (110 if k < 3 else 16))
    return fft_filter(out, lo=900, hi=8000) * 0.8 * vel


def hat(open_=False, vel=1.0):
    n = int((0.28 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    return fft_filter(RNG.standard_normal(n), lo=7500) * np.exp(-t * (12 if open_ else 80)) * 0.45 * vel


def shaker(vel=1.0):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.minimum(1, t / 0.09)) ** 2
    return fft_filter(RNG.standard_normal(n), lo=5000, hi=12000) * env * 0.35 * vel


def crash(length=2.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    return fft_filter(RNG.standard_normal(n), lo=3200) * np.exp(-t * 1.6) * 0.5


def reverse_cymbal(length):
    return crash(length)[::-1] * np.linspace(0, 1, int(length * SR)) ** 2 * 1.3


def riser(length, f0=180, f1=1400):
    n = int(length * SR)
    t = np.arange(n) / SR
    sweep = np.sin(2 * np.pi * (f0 * t + (f1 - f0) * t ** 2 / (2 * length))) * 0.22
    noise = fft_filter(RNG.standard_normal(n), lo=1500) * 0.3
    return (sweep + noise) * (t / length) ** 2.2


def brass(midis, length=0.5, bright=1.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for m in midis:
        f0 = hz(m)
        for det in (-0.004, 0.0035):
            for k in range(1, 16):
                if f0 * k > 9000:
                    break
                amp = (1 / k) * np.exp(-t * (2.2 + k * 1.5 / bright))
                out += amp * np.sin(2 * np.pi * f0 * (1 + det) * k * t + k)
    att = np.minimum(1, t / 0.014)
    rel = np.clip((length - t) / 0.1, 0, 1)
    return out * att * rel / (len(midis) * 2.5)


def pad(midis, length, cutoff=1400, detunes=(-0.006, 0, 0.006), attack=None):
    n = int(length * SR)
    sig = np.zeros((n, 2))
    for m in midis:
        for i, d in enumerate(detunes):
            s = saw(hz(m), n, d, phase=0.17 * i + 0.05 * m)
            pan = -0.7 + 1.4 * i / max(1, len(detunes) - 1)
            sig[:, 0] += s * (1 - pan) / 2
            sig[:, 1] += s * (1 + pan) / 2
    env = adsr(n, a=attack if attack is not None else min(0.3, length / 3), d=0.3, s=0.85, r=min(0.35, length / 3))
    for c in range(2):
        sig[:, c] = fft_filter(sig[:, c], hi=cutoff) * env
    return sig / (len(midis) * len(detunes))


def strings(midis, length, cutoff=4200):
    return pad(midis, length, cutoff=cutoff, detunes=(-0.009, -0.004, 0, 0.004, 0.009)) * 1.1


def supersaw_lead(midi, length, cutoff=3200):
    n = int(length * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for i, d in enumerate((-0.012, -0.005, 0, 0.005, 0.012)):
        s += saw(hz(midi), n, d, phase=0.21 * i)
    s /= 5
    # filter envelope: bright attack, settles
    bright = fft_filter(s, hi=cutoff * 1.6)
    dark = fft_filter(s, hi=cutoff * 0.6)
    k = np.exp(-t * 6)
    s = bright * k + dark * (1 - k)
    vib = 1 + 0.0
    return s * adsr(n, a=0.008, d=0.15, s=0.75, r=0.06) * vib


def bass_note(midi, length, drive=1.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    s = fft_filter(saw(hz(midi), n), hi=380) + 0.7 * np.sin(2 * np.pi * hz(midi) * t)
    return np.tanh(drive * s) * adsr(n, a=0.004, d=0.08, s=0.65, r=0.03)


def pluck(midi, length=0.25, bright=3800):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = hz(midi)
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.45 + np.sin(2 * np.pi * f * 2 * t) * 0.3
    return fft_filter(s, hi=bright) * np.exp(-t * 15)


def marimba(midi, length=0.4):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = hz(midi)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30)
    return s * np.minimum(1, t / 0.002)


def bell(midi, length=1.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = hz(midi)
    s = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3)
         + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 6))
    return s * np.exp(-t * 2.2) * np.minimum(1, t / 0.002) * 0.6


def reverb(stereo, seconds=2.0, wet=0.22):
    m = int(seconds * SR)
    t = np.arange(m) / SR
    out = stereo.copy()
    for c in range(2):
        ir = RNG.standard_normal(m) * np.exp(-t * 3.2 / seconds)
        ir = fft_filter(ir, hi=6500)
        ir /= np.sqrt(np.sum(ir ** 2))
        n = len(stereo) + m
        size = 1 << (n - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(stereo[:, c], size) * np.fft.rfft(ir, size), size)[: len(stereo)]
        out[:, c] = stereo[:, c] * (1 - wet) + y * wet * 1.4
    return out


# ---------------- harmony ----------------
D3 = 50
MAJOR = [0, 2, 4, 5, 7, 9, 11]
# (root offset from D, chord tones) — D A Bm G
POP = [(0, [0, 4, 7]), (7, [-5, -1, 2]), (9, [-3, 0, 4]), (5, [-7, -3, 0])]
# Hook in B minor: Bm G Em F#
HOOK = [(9, [-3, 0, 4]), (5, [-7, -3, 0]), (2, [-10, -7, -3]), (4, [-8, -4, -1])]
# Breakdown: Bm G D A
SPACE = [(9, [-3, 0, 4]), (5, [-7, -3, 0]), (0, [0, 4, 7]), (7, [-5, -1, 2])]


def deg(d, octave=1):
    return D3 + 12 * octave + 12 * (d // 7) + MAJOR[d % 7]


# 2-bar lead hook: (16th step, scale degree, length in 16ths)
HOOK_MEL = [(0, 4, 2), (2, 4, 2), (4, 5, 2), (6, 4, 2), (8, 2, 4), (14, 0, 2),
            (16, 1, 2), (18, 2, 2), (20, 4, 4), (26, 2, 2), (28, 1, 4)]
HOOK_MEL_B = [(0, 4, 2), (2, 4, 2), (4, 5, 2), (6, 7, 4), (12, 6, 2), (14, 5, 2),
              (16, 4, 4), (22, 2, 2), (24, 4, 2), (26, 2, 2), (28, 0, 4)]


def compose():
    mix = Mix(DUR)
    bar_t = lambda b: b * BAR
    pump = np.ones(mix.n)

    def duck_at(t, depth=0.5, rec=0.2):
        i = int(t * SR)
        m = int(rec * SR)
        if i >= mix.n:
            return
        j = min(mix.n, i + m)
        pump[i:j] = np.minimum(pump[i:j], 1 - depth * (1 - np.linspace(0, 1, j - i)) ** 2)

    # ---------- HOOK (bars 0-3): board slams on 0 / 3.36 / 4.32 / 5.28, accent 6.24 ----------
    hits = [0.0, 3.36, 4.32, 5.28, 6.24]
    for h in hits:
        big = h in (0.0, 6.24)
        mix.add("fx", boom(2.4 if big else 1.6), h, 0.9 if big else 0.55)
        mix.add("drums", crash(2.2), h, 0.5 if big else 0.25)
        b = int(h / BAR)
        r, iv = HOOK[b % 4]
        mix.add("lead", brass([D3 + r + x for x in iv] + [D3 + 12 + r + iv[0]], 0.7, 1.3), h, 1.0 if big else 0.75)
    hook_end = 6.24
    t, step = 0.0, 0
    while t < hook_end - 1e-6:
        p = step % 16
        b = int(t / BAR)
        r, iv = HOOK[b % 4]
        if p % 4 == 0:
            mix.add("drums", kick(1.0), t, 1.0)
            duck_at(t, 0.45)
        if p in (4, 12):
            mix.add("drums", clap(), t, 0.55)
            mix.add("drums", snare(0.9), t, 0.5)
        if p in (2, 6, 10, 14):
            mix.add("drums", taiko(0.7, 80 if p < 8 else 66), t, 0.5, pan=-0.2 if p < 8 else 0.2)
        mix.add("drums", hat(vel=0.9 if p % 2 == 0 else 0.55), t, 0.35, pan=0.3)
        mix.add("bass", bass_note(D3 - 12 + r, S16 * 0.9, drive=1.6), t, 0.55)
        t += S16
        step += 1
    for b in range(4):
        r, iv = HOOK[b]
        start = bar_t(b)
        if start >= hook_end:
            break
        mix.add("pad", strings([D3 + 12 + r + x for x in iv], min(BAR, hook_end - start) + 0.3, cutoff=2600), start, 0.3)
    # near-silence with heartbeats, then riser + toms under the flap wipe into the reveal
    mix.add("pad", pad([D3 + 12 + 4 + x for x in (-8, -4, -1)], 1.6, cutoff=800, attack=0.9), 6.4, 0.2)
    mix.add("fx", reverse_cymbal(0.96), 7.68 - 0.96, 0.8)
    mix.add("fx", riser(0.96), 7.68 - 0.96, 0.55)
    for k in range(8):
        mix.add("drums", tom(95 + k * 12, 0.3 + k * 0.08), 7.2 + k * 0.06, 0.55, pan=-0.4 + k * 0.1)

    # ---------- generic groove writer ----------
    def groove(b0, b1, prog, *, kick4=True, half=False, clapv=0.5, hats=True, openhat=True, bassv=0.55,
               arp=0.0, arp_bright=3800, lead=0.0, mel=HOOK_MEL, padv=0.28, padcut=1500, stringv=0.0,
               marim=0.0, shake=0.0, pumpd=0.5):
        t0, t1 = bar_t(b0), bar_t(b1)
        t, step = t0, 0
        while t < t1 - 1e-6:
            p = step % 16
            bi = int((t - t0 + 1e-6) / BAR)
            r, iv = prog[bi % len(prog)]
            if kick4 and p % 4 == 0:
                mix.add("drums", kick(1.0), t, 1.08)
                mix.add("bass", bass_note(D3 - 24 + r, BEAT * 0.45, drive=2.2), t, 0.22)
                duck_at(t, pumpd)
            if half and p == 0:
                mix.add("drums", kick(1.0), t, 1.0)
                duck_at(t, pumpd)
            if half and p == 8:
                mix.add("drums", snare(1.0), t, 0.5)
                mix.add("drums", clap(), t, 0.4)
            bar_no = int((t - t0 + 1e-6) / BAR)
            if kick4 and bar_no % 4 == 3 and p >= 12:
                mix.add("drums", snare(0.5 + (p - 12) * 0.15), t, 0.55)
                mix.add("drums", tom(150 - (p - 12) * 18, 0.7), t, 0.4, pan=0.3 - (p - 12) * 0.2)
            if not half and p in (4, 12) and clapv:
                mix.add("drums", clap(), t, clapv)
                mix.add("drums", snare(0.6), t, clapv * 0.6)
            if hats:
                if openhat and p % 4 == 2:
                    mix.add("drums", hat(open_=True, vel=0.8), t, 0.3, pan=0.3)
                elif p % 2 == 0:
                    mix.add("drums", hat(vel=0.7), t, 0.28, pan=0.25)
            if shake:
                mix.add("drums", shaker(1.0 if p % 2 else 0.6), t, shake, pan=-0.35)
            if bassv and p % 2 == 0:
                oct_up = 12 if (p in (6, 14)) else 0
                mix.add("bass", bass_note(D3 - 12 + r + oct_up, S16 * 1.7), t, bassv)
            if arp:
                notes = [D3 + 12 + r + x for x in iv] + [D3 + 24 + r + iv[0]]
                mix.add("lead", pluck(notes[(step * 3) % 4], bright=arp_bright), t, arp, pan=-0.35 if step % 2 else 0.35)
            if p == 0:
                mix.add("pad", pad([D3 + r + x for x in iv] + [D3 + 12 + r + iv[1]], BAR + 0.3, cutoff=padcut), t, padv)
                if stringv:
                    mix.add("lead", strings([D3 + 12 + r + x for x in iv], BAR + 0.2), t, stringv)
            t += S16
            step += 1
        if lead or marim:
            for pb in range(b0, b1, 2):
                for (s_, d, ln) in (mel if (pb // 2) % 2 == 0 else HOOK_MEL_B):
                    nt = bar_t(pb) + s_ * S16
                    if nt >= t1:
                        continue
                    if lead:
                        mix.add("lead", supersaw_lead(deg(d, 1), ln * S16 * 0.95), nt, lead, pan=0.05)
                    if marim:
                        mix.add("lead", marimba(deg(d, 2), 0.5), nt, marim, pan=-0.15)

    # ---------- REVEAL (bars 4-7) ----------
    mix.add("lead", brass([D3 + 12 + x for x in (0, 4, 7)] + [D3 + 24], 1.2, 1.5), bar_t(4), 1.0)
    mix.add("drums", crash(3.0), bar_t(4), 0.65)
    mix.add("fx", boom(), bar_t(4), 0.7)
    mix.add("lead", bell(deg(4, 2)), bar_t(4), 0.25)
    groove(4, 8, POP, kick4=False, half=True, arp=0.16, arp_bright=3000, padv=0.3, padcut=1800, stringv=0.18, openhat=False, bassv=0.45)
    mix.add("fx", reverse_cymbal(0.9), bar_t(8) - 0.9, 0.6)

    # ---------- GROOVE (bars 8-14: anywhere + rates) ----------
    mix.add("drums", crash(2.4), bar_t(8), 0.55)
    groove(8, 12, POP, arp=0.13, padv=0.24)
    mix.add("drums", crash(2.4), bar_t(12), 0.6)
    mix.add("lead", brass([D3 + 12 + x for x in (0, 4, 7)], 0.6), bar_t(12), 0.8)
    groove(12, 15, POP, arp=0.12, marim=0.12, padv=0.24, shake=0.25)
    for (s_, d, ln) in HOOK_MEL:
        mix.add("lead", supersaw_lead(deg(d, 1), ln * S16 * 0.95), bar_t(10) + s_ * S16, 0.14)
    mix.add("fx", reverse_cymbal(1.2), bar_t(15) - 1.2, 0.55)

    # ---------- SPACE (bars 15-20: no MyDHL+ account) ----------
    mix.add("drums", crash(3.0), bar_t(15), 0.45)
    mix.add("fx", boom(), bar_t(15), 0.45)
    groove(15, 21, SPACE, kick4=False, clapv=0, hats=False, bassv=0.0, arp=0.09, arp_bright=1800, padv=0.3, padcut=1000, stringv=0.12, shake=0.12)
    for b in range(16, 21):
        r, iv = SPACE[(b - 15) % 4]
        mix.add("bass", bass_note(D3 - 12 + r, BAR * 0.9), bar_t(b), 0.3)
    for b in range(17, 20):  # a felt kick on the downbeats keeps the pulse alive under the narration
        mix.add("drums", kick(0.8), bar_t(b), 0.6)
        mix.add("drums", kick(0.6), bar_t(b) + BEAT * 2, 0.45)
    mix.add("fx", riser(1.92), bar_t(21) - 1.92, 0.45)
    for k in range(16):
        mix.add("drums", snare(0.25 + k * 0.045), bar_t(21) - 1.92 + k * S16, 0.45)

    # ---------- PLAYFUL (bars 21-27: WhatsApp) ----------
    mix.add("drums", crash(2.4), bar_t(21), 0.55)
    groove(21, 28, POP, marim=0.2, padv=0.22, shake=0.28, clapv=0.45)
    for k, d in enumerate((4, 7, 9, 11)):
        mix.add("lead", bell(deg(d, 2), 1.4), 46.08 + k * 0.12, 0.22)

    # ---------- BUILD (bars 28-31: we handle the rest) ----------
    mix.add("drums", crash(2.4), bar_t(28), 0.55)
    groove(28, 32, POP, arp=0.13, padv=0.2, stringv=0.22, shake=0.2)
    t = bar_t(28)
    while t < bar_t(32) - 1e-6:
        b = int((t - bar_t(28) + 1e-6) / BAR)
        r, iv = POP[b % 4]
        mix.add("lead", strings([D3 + 24 + r + iv[(int((t - bar_t(28)) / (BEAT / 2))) % 3]], BEAT / 2 * 0.9, cutoff=5000), t, 0.16)
        t += BEAT / 2
    for k in range(16):
        mix.add("drums", snare(0.3 + k * 0.04), bar_t(31) + k * S16, 0.5)
        if k % 2 == 0:
            mix.add("drums", tom(100 + k * 6, 0.6), bar_t(31) + k * S16, 0.45)
    mix.add("fx", riser(3.84), bar_t(32) - 3.84, 0.5)
    mix.add("fx", reverse_cymbal(1.92), bar_t(32) - 1.92, 0.6)

    # ---------- FINALE (bars 32-38) ----------
    mix.add("drums", crash(3.0), bar_t(32), 0.7)
    mix.add("fx", boom(), bar_t(32), 0.8)
    mix.add("lead", brass([D3 + 12 + x for x in (0, 4, 7)] + [D3 + 24], 0.9, 1.5), bar_t(32), 0.9)
    groove(32, 39, POP, arp=0.13, lead=0.15, padv=0.24, stringv=0.2, shake=0.22)
    for b in range(32, 39):
        r, iv = POP[(b - 32) % 4]
        mix.add("lead", brass([D3 + 12 + r + x for x in iv], 0.35), bar_t(b) + BEAT * 1.5, 0.4)

    # ---------- BUTTON (bar 39 -> end) ----------
    bt = bar_t(39)
    chord = [D3 + x for x in (0, 7)] + [D3 + 12 + x for x in (0, 4, 7)] + [D3 + 24]
    mix.add("lead", brass(chord, 1.9, bright=1.6), bt, 1.0)
    mix.add("lead", strings([D3 + 12 + x for x in (0, 4, 7)] + [D3 + 24 + 4], 1.9, cutoff=5000), bt, 0.4)
    mix.add("pad", pad([D3 + x for x in (0, 4, 7)], 1.9, cutoff=1600, attack=0.01), bt, 0.3)
    mix.add("bass", bass_note(D3 - 12, 1.8), bt, 0.6)
    mix.add("fx", boom(1.9), bt, 0.9)
    mix.add("drums", crash(1.9), bt, 0.7)
    mix.add("drums", kick(1.0), bt, 1.0)
    mix.add("lead", bell(deg(7, 2), 1.9), bt, 0.25)

    # ---------- heartbeats + scene impacts (shared with the visuals via timeline.json) ----------
    for i, hb in enumerate(TL["heartbeats"]):
        mix.add("fx", heartbeat(1.0 if i % 2 == 0 else 0.8), hb, 1.0)
    for h in TL["hits"]:
        if h in (0.0, 7.68, 61.44, 74.88, 46.08):
            continue
        mix.add("fx", boom(1.8), h, 0.55)
        mix.add("drums", kick(1.0, punch=1.3), h, 1.0)

    # ---------- bus processing ----------
    pump_s = pump[:, None]
    mix.bus["pad"] *= pump_s
    mix.bus["bass"] *= np.sqrt(pump_s)
    gains = {"drums": 1.05, "bass": 0.9, "pad": 0.6, "lead": 0.74, "fx": 0.9}
    out = np.zeros((mix.n, 2))
    for k, b in mix.bus.items():
        if k in ("pad", "lead"):
            b = reverb(b, 2.4, 0.3)
        elif k == "drums":
            b = reverb(b, 0.9, 0.1)
        elif k == "fx":
            b = reverb(b, 1.8, 0.2)
        out += b * gains[k]
    # gentle high-shelf cut for mobile speakers (tames fatigue above ~9 kHz)
    for c in range(2):
        hi = fft_filter(out[:, c], lo=9000)
        out[:, c] -= hi * 0.35
    out = np.tanh(out * 1.15) / 1.15
    out /= max(1e-9, np.max(np.abs(out))) / 0.9
    fade = int(0.35 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
    return out


def write_wav(path, stereo):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


if __name__ == "__main__":
    out = os.path.join(ROOT, "public/audio/stems/music.wav")
    raw = out + ".raw.wav"
    write_wav(raw, compose())
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af",
                    "loudnorm=I=-17:TP=-1.5:LRA=11", "-ar", str(SR), out], check=True)
    os.remove(raw)
    print("wrote", os.path.relpath(out, ROOT))
