#!/usr/bin/env python3
"""Original "jedag jedug" EDM-pop score for the JDC Cengkareng film (numpy synthesis; instruments from scripts/music.py).

120 BPM, E major, every scene cut on a downbeat (film/timeline.json). Signature moves:
  - punchy four-on-the-floor kick with sub tail, sidechain pumping on bass/pads/stabs
  - house offbeat bass and open hats, supersaw stabs in the choruses
  - before every cut: snare roll (8ths -> 16ths -> 32nds), riser, one 8th of silence ("gasp"), then the drop
  - the reveal at 9.0 s: music stops for half a beat, then explodes with the box
Usage: python3 -I music.py -> audio/music.wav (~-18 LUFS bed under the VO)
"""
import importlib.util, os, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
spec = importlib.util.spec_from_file_location("m", os.path.join(ROOT, "scripts", "music.py")); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
SR = m.SR; RNG = np.random.default_rng(11)

DUR, beat = 86.0, 0.5; bar = 4 * beat; s16 = beat / 4
root = 52  # E3
prog = [(0, [0, 4, 7]), (7, [-5, -1, 2]), (9, [-3, 0, 4]), (5, [-7, -3, 0])]     # E B C#m A
intro_prog = [(9, [-3, 0, 4]), (5, [-7, -3, 0]), (7, [-5, -1, 2])]
hook = [[16, 19, 21, 19, 16], [14, 19, 18, 14, 11], [16, 12, 14, 16, 19], [12, 14, 16, 19, 21]]
CUTS = [14, 24, 32, 40, 50, 62, 72]
SEC = [("dropA", 6, 14), ("groove", 14, 24), ("pre", 24, 32), ("half", 32, 40), ("chorus", 40, 50), ("chorus2", 50, 62), ("bridge", 62, 72), ("final", 72, 84)]
def sec(t):
    for n, a, b in SEC:
        if a <= t < b: return n
    return None
def gasp(t):  # silence windows (everything but fx)
    return any(c - 0.125 <= t < c for c in CUTS) or 5.75 <= t < 6.0 or 8.5 <= t < 9.0 or 83.75 <= t < 84.0
def roll_zone(t):
    return any(c - 2.0 <= t < c - 0.125 for c in CUTS + [84]) or 7.0 <= t < 8.5

mix = m.Mix(DUR); kicks = []
chord = lambda t: prog[int((t - 6) / bar) % 4]
def sub_kick(vel=1.0):
    n = int(0.42 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (46 + 70 * np.exp(-30 * t)) * t) * np.exp(-t * 7.5) * 0.9 + RNG.standard_normal(n) * np.exp(-t * 600) * 0.25) * vel
def kick(t, vel=1.0):
    mix.add("drums", m.kick(vel), t, 1.0); mix.add("bass", sub_kick(vel), t, 0.75); kicks.append(t)
def stab(midis, length=0.17): return m.strings(midis, length) * 1.2

# ---------- intro (epic) ----------
mix.add("fx", m.boom(), 0.0, 0.9)
for i, (rt, iv) in enumerate(intro_prog):
    mix.add("pad", m.strings([root + rt + x for x in iv] + [root + rt + 12], bar + 0.4), i * bar, 0.45)
    mix.add("bass", m.bass_note(root - 12 + rt, bar), i * bar, 0.5)
for k in range(11):
    t = k * beat; mix.add("drums", m.kick(0.4 + 0.05 * k), t, 0.85)
for k in range(8):
    t = 4.0 + k * s16 * (2 if k < 4 else 1); mix.add("drums", m.snare(0.4 + 0.07 * k), t, 0.5)
mix.add("fx", m.riser(2.6), 3.15, 0.6); mix.add("fx", m.reverse_cymbal(1.5), 4.25, 0.5)

# ---------- groove grid ----------
t = 6.0; step = 0
while t < 84 - 1e-6:
    s = sec(t); rt, iv = chord(t); b16 = step % 16; on_beat = step % 4 == 0; beat_in_bar = b16 // 4
    if not gasp(t):
        full = s in ("dropA", "groove", "pre", "chorus", "chorus2", "final") or (s == "bridge" and t >= 66)
        if full and on_beat: kick(t)
        if s == "half" and b16 == 0: kick(t)
        if s == "half" and b16 == 10: kick(t, 0.8)
        if s == "bridge" and t < 66 and b16 == 0: kick(t, 0.7)
        # snare + clap
        if (full or s == "bridge") and on_beat and beat_in_bar in (1, 3): mix.add("drums", m.clap(), t, 0.6); mix.add("drums", m.snare(0.8), t, 0.35)
        if s == "half" and b16 == 8: mix.add("drums", m.clap(), t, 0.75); mix.add("drums", m.snare(1.0), t, 0.45)
        # hats: offbeat open hats, 16th closed hats
        if s and step % 4 == 2: mix.add("drums", m.hat(open_=True), t, 0.3)
        if s in ("groove", "pre", "chorus", "chorus2", "final") and step % 4 != 2: mix.add("drums", m.hat(), t, 0.17 if step % 2 else 0.1)
        # house bass: root on the beat, octave on the offbeat
        if s and s != "half":
            if on_beat: mix.add("bass", m.bass_note(root - 12 + rt, 0.2), t, 0.55)
            if step % 4 == 2: mix.add("bass", m.bass_note(root + rt, 0.2), t, 0.5)
        if s == "half" and b16 == 0: mix.add("bass", m.bass_note(root - 12 + rt, bar * 0.9), t, 0.45)
        # supersaw stabs on the offbeats
        if s in ("chorus", "chorus2", "final", "dropA") and step % 4 == 2: mix.add("pad", stab([root + 12 + rt + x for x in iv]), t, 0.32)
        if s in ("groove", "pre") and step % 8 == 6: mix.add("pad", stab([root + 12 + rt + x for x in iv]), t, 0.24)
        # plucked arpeggio
        if s in ("groove", "pre", "half", "bridge", "final"):
            arp = [root + 12 + rt + iv[k] for k in (0, 1, 2, 1)]
            mix.add("lead", m.pluck(arp[step % 4] + (12 if s == "bridge" else 0), 0.19), t, {"groove": .2, "pre": .2, "half": .3, "bridge": .3, "final": .15}[s], pan=-0.35 + 0.7 * ((step % 4) / 3))
        # pads + hook melody per bar
        if b16 == 0:
            cut = {"dropA": 1800, "groove": 1500, "pre": 2200, "half": 900, "chorus": 2600, "chorus2": 2800, "bridge": 1600, "final": 3000}[s]
            mix.add("pad", m.pad([root + rt + x for x in iv], bar + 0.2, cutoff=cut), t, 0.22)
            if s in ("chorus", "chorus2", "final"):
                mel = hook[int((t - 6) / bar) % 4]
                for off, note, ln in zip((0, .75, 1.5, 2.5, 3.25), mel, (.32, .3, .45, .32, .5)):
                    mix.add("lead", m.brass([root + note], ln, 1.3), t + off * beat, 0.33)
    # build-ups: snare roll that tightens toward each cut
    if roll_zone(t) and not gasp(t):
        nxt = min([c for c in CUTS + [84, 9.0] if c > t], default=86); left = nxt - t
        div = 2 if left > 1.0 else (1 if left > 0.5 else 0.5)    # in 16ths: 8ths, 16ths, 32nds
        sub = s16 * div
        if abs((t / sub) - round(t / sub)) < 1e-6:
            mix.add("drums", m.snare(0.35 + 0.6 * (1 - left / 2)), t, 0.42)
        if div == 0.5: mix.add("drums", m.snare(0.6 + 0.4 * (1 - left / 2)), t + sub, 0.42)
    t += s16; step += 1

# ---------- risers, drops, reveal ----------
for c in CUTS:
    mix.add("fx", m.riser(1.9), c - 1.95, 0.5); mix.add("fx", m.reverse_cymbal(1.2), c - 1.2, 0.45)
    mix.add("drums", m.crash(2.2), c, 0.7); mix.add("fx", m.boom(), c, 0.9)
mix.add("drums", m.crash(2.4), 6.0, 0.75); mix.add("fx", m.boom(), 6.0, 1.0)
mix.add("fx", m.riser(1.5), 7.5, 0.55); mix.add("fx", m.reverse_cymbal(1.0), 8.0, 0.5)
mix.add("drums", m.crash(2.6), 9.0, 0.85); mix.add("fx", m.boom(), 9.0, 1.1)
mix.add("pad", m.strings([root, root + 4, root + 7, root + 12, root + 16], 1.6), 9.0, 0.45)
# button
mix.add("fx", m.riser(1.8), 82.0, 0.5)
mix.add("drums", m.crash(2.8), 84.0, 0.8); kick(84.0); mix.add("fx", m.boom(), 84.0, 1.0)
mix.add("lead", m.brass([root, root + 4, root + 7, root + 12], 1.2, 1.3), 84.0, 0.5)
mix.add("pad", m.strings([root, root + 4, root + 7, root + 11, root + 16], 2.0), 84.0, 0.45)
mix.add("bass", m.bass_note(root - 12, 1.8), 84.0, 0.6)

# ---------- sidechain pump ----------
env = np.ones(mix.n); idx = np.arange(mix.n) / SR
for k in kicks:
    i0 = int(k * SR); i1 = min(mix.n, i0 + int(0.32 * SR)); x = (idx[i0:i1] - k) / 0.24
    env[i0:i1] = np.minimum(env[i0:i1], 0.22 + 0.78 * np.clip(x, 0, 1) ** 0.65)
for bus in ("bass", "pad", "lead"): mix.bus[bus] *= env[:, None]
# gasp: hard silence on the music busses (fx keep riding)
for c in CUTS + [6.0, 9.0, 84.0]:
    a = int((c - (0.5 if c == 9.0 else 0.125)) * SR); b = int(c * SR)
    for bus in ("drums", "bass", "pad", "lead"): mix.bus[bus][a:b] *= np.linspace(1, 0, b - a)[:, None] ** 6

gains = {"drums": 1.0, "bass": 0.85, "pad": 0.6, "lead": 0.7, "fx": 0.8}
out = np.zeros((mix.n, 2))
for k, b in mix.bus.items():
    if k in ("pad", "lead"): b = m.reverb(b, 1.8, 0.24)
    elif k == "drums": b = m.reverb(b, 0.7, 0.08)
    out += b * gains[k]
out = np.tanh(out * 1.35) / 1.35
out /= max(1e-9, np.max(np.abs(out))) / 0.92
fade = int(1.6 * SR); out[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
raw = os.path.join(HERE, "music.raw.wav"); dst = os.path.join(HERE, "music.wav")
m.write_wav(raw, out)
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af", "loudnorm=I=-17:TP=-1.5:LRA=9", "-ar", str(SR), dst], check=True)
os.remove(raw); print("wrote", dst, len(kicks), "kicks")
