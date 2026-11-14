#!/usr/bin/env python3
"""Original score for the JDC Cengkareng film (numpy synthesis, instruments from scripts/music.py).

Epic intro (0-6 s) -> drop into upbeat pop at 6.0 s, 120 BPM, E major, I-V-vi-IV.
Sections follow film/timeline.json: verse 6-32, breakdown 32-39, chorus 39-61,
post-chorus 61-71, final lift 71-82.5, button chord at 82.5 with ring-out to 85.
Usage: python3 -I music.py  ->  audio/music.wav (about -20 LUFS, the bed under the VO)
"""
import importlib.util, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
spec = importlib.util.spec_from_file_location("m", os.path.join(ROOT, "scripts", "music.py"))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
SR = m.SR

DUR, BPM = 85.0, 120.0
beat = 60 / BPM; bar = 4 * beat; s16 = beat / 4
root = 52  # E3
prog = [(0, [0, 4, 7]), (7, [-5, -1, 2]), (9, [-3, 0, 4]), (5, [-7, -3, 0])]          # E  B  C#m  A
intro_prog = [(9, [-3, 0, 4]), (5, [-7, -3, 0]), (7, [-5, -1, 2])]                     # C#m A  B
melody = [[16, 19, 21, 19], [14, 19, 18, 14], [16, 12, 14, 16], [12, 14, 16, 19]]       # semitones above root
SEC = [("verse", 6, 32), ("break", 32, 39), ("chorus", 39, 61), ("post", 61, 71), ("final", 71, 82.5)]

def sec(t):
    for n, a, b in SEC:
        if a <= t < b: return n
    return None

mix = m.Mix(DUR)
chord = lambda t: prog[int((t - 6) / bar) % 4]

# ---------- intro: taiko-like pulse, strings, riser ----------
mix.add("fx", m.boom(), 0.0, 0.9)
for i, (rt, iv) in enumerate(intro_prog):
    t = i * bar
    mix.add("pad", m.strings([root + rt + x for x in iv] + [root + rt + 12], bar + 0.5), t, 0.42)
    mix.add("bass", m.bass_note(root - 12 + rt, bar), t, 0.55)
for k in range(12):
    t = k * beat
    if t < 6: mix.add("drums", m.kick(0.45 + 0.04 * k), t, 0.8)
mix.add("fx", m.riser(2.8), 3.2, 0.55)
mix.add("fx", m.reverse_cymbal(1.6), 4.4, 0.5)

# ---------- groove ----------
t = 6.0; step = 0
while t < 82.5 - 1e-6:
    s = sec(t); rt, iv = chord(t); in_beat = step % 4 == 0; b = (step // 4) % 4
    if s in ("verse", "chorus", "final") and in_beat: mix.add("drums", m.kick(1.0), t, 1.0)
    if s == "post" and in_beat and b in (0, 2): mix.add("drums", m.kick(0.9), t, 0.9)
    if s in ("verse", "chorus", "final", "post") and in_beat and b in (1, 3): mix.add("drums", m.clap(), t, 0.55)
    if s == "break" and in_beat and b == 3 and t > 35: mix.add("drums", m.clap(), t, 0.35)
    if s == "verse" and step % 4 == 2: mix.add("drums", m.hat(), t, 0.32)
    if s in ("chorus", "final"): mix.add("drums", m.hat(open_=(step % 4 == 2)), t, 0.22 if step % 4 else 0.12)
    if s == "post" and step % 2 == 0: mix.add("drums", m.hat(), t, 0.2)
    # bass: 8ths, whole notes in the breakdown
    if s in ("verse", "chorus", "final", "post") and step % 2 == 0:
        mix.add("bass", m.bass_note(root - 12 + rt + (12 if (step % 8 == 6 and s != "post") else 0), beat * 0.48), t, 0.62)
    if s == "break" and step % 16 == 0: mix.add("bass", m.bass_note(root - 12 + rt, bar * 0.95), t, 0.45)
    # pluck arpeggio
    arp = [root + 12 + rt + iv[k] for k in (0, 1, 2, 1)]
    if s in ("verse", "break", "chorus", "final", "post"):
        oct_ = 12 if s == "post" else 0
        g = {"verse": 0.22, "break": 0.3, "chorus": 0.18, "final": 0.2, "post": 0.28}[s]
        mix.add("lead", m.pluck(arp[step % 4] + oct_, 0.2), t, g, pan=-0.3 + 0.6 * ((step % 4) / 3))
    # chords per bar
    if step % 16 == 0:
        cut = {"verse": 1300, "break": 900, "chorus": 2200, "post": 1600, "final": 2600}[s]
        mix.add("pad", m.pad([root + rt + x for x in iv], bar + 0.3, cutoff=cut), t, 0.3)
        if s in ("chorus", "final"): mix.add("pad", m.strings([root + 12 + rt + x for x in iv], bar + 0.2), t, 0.2)
        if s in ("chorus", "final"):
            mel = melody[int((t - 6) / bar) % 4]
            for off, note, ln in zip((0, 1, 1.5, 2.5), mel, (0.45, 0.3, 0.45, 0.9)):
                mix.add("lead", m.brass([root + note], ln, 1.2), t + off * beat, 0.34)
        if s == "verse" and int((t - 6) / bar) % 2 == 0:
            mix.add("lead", m.brass([root + rt + x + 12 for x in iv], 0.22, 0.9), t, 0.22)
    t += s16; step += 1

# ---------- transitions and accents ----------
for at_ in (6.0, 39.0, 49.0, 71.0): mix.add("drums", m.crash(2.2), at_, 0.55)
mix.add("fx", m.boom(), 6.0, 1.0)
for a, ln in ((36.6, 2.4), (68.6, 2.4)): mix.add("fx", m.riser(ln), a, 0.4)
for a in (37.5, 69.5): mix.add("fx", m.reverse_cymbal(1.5), a, 0.4)
# button: final chord and ring-out
mix.add("drums", m.crash(2.6), 82.5, 0.7); mix.add("drums", m.kick(1.0), 82.5, 1.0); mix.add("fx", m.boom(), 82.5, 0.6)
mix.add("lead", m.brass([root, root + 4, root + 7, root + 12], 1.2, 1.3), 82.5, 0.45)
mix.add("pad", m.strings([root, root + 4, root + 7, root + 11, root + 16], 2.5), 82.5, 0.4)
mix.add("bass", m.bass_note(root - 12, 2.3), 82.5, 0.6)

# ---------- busses ----------
gains = {"drums": 0.85, "bass": 0.8, "pad": 0.7, "lead": 0.75, "fx": 0.8}
out = np.zeros((mix.n, 2))
for k, b in mix.bus.items():
    if k in ("pad", "lead"): b = m.reverb(b, 2.2, 0.28)
    elif k == "drums": b = m.reverb(b, 0.9, 0.1)
    out += b * gains[k]
out = np.tanh(out * 1.2) / 1.2
out /= max(1e-9, np.max(np.abs(out))) / 0.9
fade = int(1.2 * SR); out[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
raw = os.path.join(HERE, "music.raw.wav"); dst = os.path.join(HERE, "music.wav")
m.write_wav(raw, out)
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af", "loudnorm=I=-20:TP=-2:LRA=11", "-ar", str(SR), dst], check=True)
os.remove(raw); print("wrote", dst)
