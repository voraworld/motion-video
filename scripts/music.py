#!/usr/bin/env python3
"""
Original music composer for the UGC Motion Series (numpy only, no samples or loops).

Every sound is synthesized here: kick, marching snare, claps, hats, taiko boom, bass, warm pad,
supersaw strings, brass stabs (additive, with a closing "filter" envelope), plucked arpeggio,
crash, reverse cymbal and riser. Arrangement follows the episode's beats in data/episodes.json:

  0 s           boom + taiko (hook)
  first edu     groove in (marching snare, claps, bass, pad)
  every beat    brass stab on the downbeat of each new beat ("handoffs")
  stuck beat    band drops out, reverse cymbal + riser swell into the UGC beat
  ugc beat      full lift: strings melody, arpeggio, crash
  last 2 s      button: final chord hit and ring-out

Usage:  python3 scripts/music.py E01 [--key D] [--out remotion/public/audio/music/e01.wav]
Then the file is loudness-normalised with FFmpeg to about -16 LUFS (sits under the VO in Remotion).
"""
import argparse
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np

SR = 48000
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RNG = np.random.default_rng(7)  # fixed seed: the same episode always renders the same track

NOTE = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# ---------- DSP helpers ----------
def fft_filter(x, lo=None, hi=None, order=2):
    """Static low/high-pass in the frequency domain (vectorised; fine for whole stems)."""
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
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = max(1, min(na, n))
    e[:na] = np.linspace(0, 1, na)
    nd = min(nd, n - na)
    if nd > 0:
        e[na : na + nd] = np.linspace(1, s, nd)
    nr = min(nr, n)
    if nr > 0:
        e[n - nr :] *= np.linspace(1, 0, nr)
    return e


class Mix:
    def __init__(self, seconds):
        self.n = int(seconds * SR)
        self.bus = {k: np.zeros((self.n, 2)) for k in ("drums", "bass", "pad", "lead", "fx")}

    def add(self, bus, sig, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= self.n or len(sig) == 0:
            return
        j = min(self.n, i + len(sig))
        s = sig[: j - i] * gain
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        if s.ndim == 1:
            self.bus[bus][i:j, 0] += s * l * 1.414
            self.bus[bus][i:j, 1] += s * r * 1.414
        else:
            self.bus[bus][i:j] += s


# ---------- instruments ----------
def kick(vel=1.0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * (48 * t + (130 / 28) * (1 - np.exp(-28 * t)))
    body = np.sin(ph) * np.exp(-t * 6.5)
    click = RNG.standard_normal(n) * np.exp(-t * 400) * 0.3
    return (body + click) * vel


def boom():
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (34 * t + (90 / 6) * (1 - np.exp(-6 * t)))) * np.exp(-t * 1.6)
    taiko = np.sin(2 * np.pi * (68 * t + (60 / 18) * (1 - np.exp(-18 * t)))) * np.exp(-t * 4)
    skin = fft_filter(RNG.standard_normal(n), hi=900) * np.exp(-t * 14) * 2.5
    return np.tanh(1.4 * (sub + 0.8 * taiko + skin))


def snare(vel=1.0):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    noise = np.diff(RNG.standard_normal(n + 1)) * np.exp(-t * 22) * 0.55
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.6
    return (noise + tone) * vel


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k, off in enumerate((0, 0.009, 0.018)):
        i = int(off * SR)
        tt = t[: n - i]
        out[i:] += RNG.standard_normal(n - i) * np.exp(-tt * (90 if k < 2 else 18))
    return fft_filter(out, lo=900, hi=7000) * 0.9


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return fft_filter(RNG.standard_normal(n), lo=7000) * np.exp(-t * (14 if open_ else 70)) * 0.5


def crash(length=2.4):
    n = int(length * SR)
    t = np.arange(n) / SR
    return fft_filter(RNG.standard_normal(n), lo=3500) * np.exp(-t * 1.8) * 0.5


def reverse_cymbal(length):
    return crash(length)[::-1] * np.linspace(0, 1, int(length * SR)) ** 2 * 1.4


def riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    sweep = np.sin(2 * np.pi * (200 * t + 900 * t**2 / length)) * 0.25
    noise = fft_filter(RNG.standard_normal(n), lo=1500) * 0.35
    return (sweep + noise) * (t / length) ** 2


def brass(midis, length=0.5, bright=1.0):
    """Additive brass stab: higher harmonics die faster, like a closing filter."""
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for m in midis:
        f0 = hz(m)
        for det in (-0.004, 0.004):
            for k in range(1, 14):
                if f0 * k > 9000:
                    break
                amp = (1 / k) * np.exp(-t * (2.5 + k * 1.6 / bright))
                out += amp * np.sin(2 * np.pi * f0 * (1 + det) * k * t + k)
    att = np.minimum(1, t / 0.012)
    rel = np.minimum(1, (length - t) / 0.08)
    return out * att * rel / (len(midis) * 2.5)


def pad(midis, length, cutoff=1400, detunes=(-0.006, 0, 0.006)):
    n = int(length * SR)
    sig = np.zeros((n, 2))
    for m in midis:
        for i, d in enumerate(detunes):
            s = saw(hz(m), n, d, phase=0.13 * i)
            pan = -0.6 + 1.2 * i / max(1, len(detunes) - 1)
            sig[:, 0] += s * (1 - pan) / 2
            sig[:, 1] += s * (1 + pan) / 2
    env = adsr(n, a=min(0.35, length / 3), d=0.3, s=0.85, r=min(0.4, length / 3))
    for c in range(2):
        sig[:, c] = fft_filter(sig[:, c], hi=cutoff) * env
    return sig / (len(midis) * len(detunes))


def strings(midis, length):
    return pad(midis, length, cutoff=4200, detunes=(-0.009, -0.004, 0, 0.004, 0.009)) * 1.1


def bass_note(midi, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    s = fft_filter(saw(hz(midi), n), hi=420) + 0.6 * np.sin(2 * np.pi * hz(midi) * t)
    return s * adsr(n, a=0.004, d=0.08, s=0.6, r=0.04)


def pluck(midi, length=0.22):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = hz(midi)
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + np.sin(2 * np.pi * f * 2 * t) * 0.3
    return fft_filter(s, hi=3800) * np.exp(-t * 16)


def reverb(stereo, seconds=2.0, wet=0.22):
    m = int(seconds * SR)
    t = np.arange(m) / SR
    out = stereo.copy()
    for c in range(2):
        ir = RNG.standard_normal(m) * np.exp(-t * 3.2 / seconds)
        ir = fft_filter(ir, hi=6000)
        ir /= np.sqrt(np.sum(ir**2))
        n = len(stereo) + m
        size = 1 << (n - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(stereo[:, c], size) * np.fft.rfft(ir, size), size)[: len(stereo)]
        out[:, c] = stereo[:, c] * (1 - wet) + y * wet * 1.4
    return out


# ---------- composition ----------
def compose(ep, key="D"):
    dur = float(ep["dur"])
    bpm = float(re.findall(r"\d+", str(ep["music"]["bpm"]))[0])
    beat = 60 / bpm
    bar = beat * 4
    beats = ep["beats"]
    first_edu = next((b[0] for b in beats if b[2] == "edu"), 4)
    stuck = next((b for b in beats if b[2] == "stuck"), None)
    ugc = next((b[0] for b in beats if b[2] == "ugc"), dur * 0.7)
    drop_at, drop_end = (stuck[0], stuck[1]) if stuck else (ugc - 4, ugc)
    button = dur - 2.0
    handoffs = [b[0] for b in beats[1:]]

    root = 50 + NOTE[key] - NOTE["D"]  # D3 = 50
    # I – V – vi – IV, voiced around the root
    prog = [(0, [0, 4, 7]), (7, [-5, -1, 2]), (9, [-3, 0, 4]), (5, [-7, -3, 0])]
    melody = [[16, 19, 21, 19], [14, 19, 18, 14], [16, 12, 14, 16], [12, 14, 16, 19]]  # scale steps above root

    mix = Mix(dur)

    def chord_at(time):
        i = int(time / bar) % 4
        return prog[i]

    # Hook: boom, crash, low pad
    mix.add("fx", boom(), 0.0, 1.0)
    mix.add("drums", crash(3.0), 0.0, 0.6)
    t = 0.0
    while t < first_edu:
        rt, iv = chord_at(t)
        mix.add("pad", pad([root + rt + x for x in iv], min(bar, first_edu - t) + 0.4, cutoff=900), t, 0.35)
        t += bar

    # Grid of 16ths from the groove until the button
    sixteenth = beat / 4
    step = 0
    t = first_edu
    while t < button:
        in_drop = drop_at <= t < drop_end
        lift = t >= drop_end
        pos16 = step % 16
        if not in_drop:
            # kick: 1 and 3, plus pushes in the lift
            if pos16 in (0, 8) or (lift and pos16 in (6, 14)):
                mix.add("drums", kick(1.0 if pos16 in (0, 8) else 0.7), t, 0.9)
            # marching snare: accents on 2 and 4, ghost 16ths in between
            if pos16 in (4, 12):
                mix.add("drums", clap(), t, 0.55, pan=0.1)
                mix.add("drums", snare(1.0), t, 0.5)
            elif pos16 % 2 == 1 or (pos16 in (2, 10, 14)):
                mix.add("drums", snare(0.22 + 0.1 * (pos16 % 3 == 0)), t, 0.45, pan=-0.15)
            # hats on off-beats
            if pos16 % 4 == 2:
                mix.add("drums", hat(open_=lift and pos16 == 14), t, 0.45, pan=0.35)
            # bass 8ths
            if pos16 % 2 == 0:
                rt, _ = chord_at(t)
                mix.add("bass", bass_note(root - 12 + rt, sixteenth * 1.8), t, 0.6)
            # arpeggio in the lift
            if lift and pos16 % 1 == 0:
                rt, iv = chord_at(t)
                notes = [root + 12 + rt + x for x in iv] + [root + 24 + rt + iv[0]]
                mix.add("lead", pluck(notes[step % 4]), t, 0.22, pan=-0.3 if step % 2 else 0.3)
        t += sixteenth
        step += 1

    # Pads / strings per bar
    t = first_edu
    while t < button:
        rt, iv = chord_at(t)
        length = min(bar, button - t) + 0.3
        if drop_at <= t < drop_end:
            mix.add("pad", pad([root + rt + x for x in iv], length, cutoff=700), t, 0.35)
        else:
            mix.add("pad", pad([root + rt + x for x in iv], length, cutoff=1500), t, 0.3)
            if t >= drop_end or (handoffs and t >= handoffs[min(2, len(handoffs) - 1)]):
                mix.add("lead", strings([root + 12 + rt + x for x in iv], length), t, 0.32)
                mel = melody[int(t / bar) % 4]
                for k, deg in enumerate(mel):
                    nt = t + k * beat
                    if nt < button:
                        major = [0, 2, 4, 5, 7, 9, 11]
                        midi = root + 12 + 12 * (deg // 7) + major[deg % 7]
                        mix.add("lead", strings([midi], beat * 1.05), nt, 0.42 if t >= drop_end else 0.3)
        t += bar

    # Brass stab on every handoff (except inside the drop)
    for h in handoffs:
        if drop_at <= h < drop_end or h >= button:
            continue
        rt, iv = chord_at(h)
        mix.add("lead", brass([root + 12 + rt + x for x in iv], 0.55), h, 0.9)
        mix.add("lead", brass([root + 12 + rt + x for x in iv], 0.35), h + beat * 1.5, 0.5)

    # Drop: reverse cymbal + riser into the lift, crash + boom on the lift
    swell = min(3.0, drop_end - drop_at)
    mix.add("fx", reverse_cymbal(swell), drop_end - swell, 0.8)
    mix.add("fx", riser(swell), drop_end - swell, 0.6)
    mix.add("drums", crash(3.0), drop_end, 0.8)
    mix.add("fx", boom(), drop_end, 0.6)
    mix.add("drums", kick(1.0), drop_end, 1.0)

    # Button: final chord hit and ring-out
    rt, iv = prog[0]
    chord = [root + x for x in (0, 4, 7)] + [root + 12 + x for x in (0, 4, 7)]
    mix.add("lead", brass(chord, 1.6, bright=1.4), button, 1.1)
    mix.add("pad", strings([root + 12 + x for x in (0, 4, 7)], 2.0), button, 0.45)
    mix.add("fx", boom(), button, 0.8)
    mix.add("drums", crash(2.0), button, 0.7)
    mix.add("drums", kick(1.0), button, 1.0)

    # Bus processing
    gains = {"drums": 0.9, "bass": 0.8, "pad": 0.7, "lead": 0.8, "fx": 0.85}
    out = np.zeros((mix.n, 2))
    for k, b in mix.bus.items():
        if k in ("pad", "lead"):
            b = reverb(b, 2.2, 0.28)
        elif k == "drums":
            b = reverb(b, 0.9, 0.12)
        out += b * gains[k]
    out = np.tanh(out * 1.2) / 1.2
    out /= max(1e-9, np.max(np.abs(out))) / 0.9
    fade = int(0.05 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return out


def write_wav(path, stereo):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("id")
    ap.add_argument("--key", default="D")
    ap.add_argument("--out")
    ap.add_argument("--lufs", type=float, default=-16.0)
    a = ap.parse_args()
    eps = json.load(open(os.path.join(ROOT, "data", "episodes.json")))
    ep = next((e for e in eps if e["id"] == a.id), None)
    if not ep:
        sys.exit(f"Unknown episode {a.id}")
    out = a.out or os.path.join(ROOT, "remotion", "public", "audio", "music", a.id.lower() + ".wav")
    raw = out + ".raw.wav"
    write_wav(raw, compose(ep, a.key))
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw,
         "-af", f"loudnorm=I={a.lufs}:TP=-1.5:LRA=11", "-ar", str(SR), out],
        check=True,
    )
    os.remove(raw)
    print("wrote", os.path.relpath(out, ROOT))


if __name__ == "__main__":
    main()
