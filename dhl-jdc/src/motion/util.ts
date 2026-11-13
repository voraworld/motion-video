import { Easing, interpolate } from "remotion";
import timeline from "../content/timeline.json";

export const FPS = timeline.fps;
export const DURATION_S = timeline.duration;
export const SCENES = timeline.scenes;
export const scene = (id: string) => SCENES.find((s) => s.id === id)!;
export const f = (s: number) => Math.round(s * FPS);

export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  inOut: Easing.bezier(0.83, 0, 0.17, 1),
  soft: Easing.bezier(0.45, 0, 0.2, 1),
  back: Easing.bezier(0.34, 1.4, 0.64, 1),
  lin: (x: number) => x,
};

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** Clamped interpolation over time in seconds: k(t, [t0, t1], [a, b], easing). */
export const k = (t: number, range: [number, number], out: [number, number], ease: (x: number) => number = E.out) =>
  interpolate(t, range, out, { ...CL, easing: ease });
/** Multi-key clamped interpolation. */
export const kk = (t: number, inR: number[], outR: number[], ease: (x: number) => number = E.soft) =>
  interpolate(t, inR, outR, { ...CL, easing: ease });
export const p01 = (t: number, t0: number, t1: number, ease: (x: number) => number = E.out) => k(t, [t0, t1], [0, 1], ease);

/** Damped spring response 0→1 (critically tuned per call), deterministic in t. */
export const spr = (t: number, t0: number, { freq = 2.2, damp = 0.55 } = {}) => {
  const x = t - t0;
  if (x <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const z = damp;
  if (z >= 1) return 1 - (1 + w * x) * Math.exp(-w * x);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + ((z * w) / wd) * Math.sin(wd * x));
};
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
/** Small deterministic pseudo-random in [0,1). */
export const rnd = (seed: number) => {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- beat grid (shared with scripts/music.py: 125 BPM, one bar = 1.92 s) ----------
export const BEAT = 60 / timeline.bpm;
export const BAR = BEAT * 4;
export const HEARTBEATS: number[] = timeline.heartbeats;
export const HITS: number[] = timeline.hits;
/** How hard the picture pumps with the kick, per section (mirrors the arrangement). */
export const energy = (t: number) => {
  const segs: [number, number, number][] = [
    [0, 6.24, 1],
    [6.24, 7.68, 0],
    [7.68, 15.36, 0.55],
    [15.36, 28.8, 1],
    [28.8, 38.4, 0.25],
    [38.4, 40.32, 0.5],
    [40.32, 53.76, 0.8],
    [53.76, 74.88, 1],
    [74.88, 99, 0],
  ];
  for (const [a, b, e] of segs) if (t >= a && t < b) return e;
  return 0;
};
const decay = (dt: number, k: number) => (dt >= 0 ? Math.exp(-dt * k) : 0);
/** 1 on every kick, decaying. */
export const beatPulse = (t: number) => decay(t - Math.floor(t / BEAT) * BEAT, 9);
/** 1 on every bar downbeat, decaying. */
export const barPulse = (t: number) => decay(t - Math.floor(t / BAR) * BAR, 6);
/** Heartbeat thumps ("dag-dug"). */
export const heartPulse = (t: number) => HEARTBEATS.reduce((m, h) => Math.max(m, decay(t - h, 10)), 0);
/** Impact frames at scene hits. */
export const hitPulse = (t: number) => HITS.reduce((m, h) => Math.max(m, decay(t - h, 14)), 0);
/** Bar index (for deterministic per-bar variation). */
export const barIndex = (t: number) => Math.floor(t / BAR);
