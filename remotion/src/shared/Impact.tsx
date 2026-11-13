import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";

/** Strength of the most recent hit at this frame, decaying over `decay` frames. */
const hitStrength = (frame: number, hits: number[], decay: number) => {
  let s = 0;
  for (const h of hits) {
    const d = frame - h;
    if (d >= 0 && d < decay) s = Math.max(s, 1 - d / decay);
  }
  return s;
};

/** Camera shake on every hit frame. Wrap the whole picture (not the brand frame). */
export const Shake: React.FC<{ hits: number[]; amount?: number; decay?: number; children: React.ReactNode }> = ({
  hits,
  amount = 26,
  decay = 14,
  children,
}) => {
  const frame = useCurrentFrame();
  const s = hitStrength(frame, hits, decay) ** 1.6;
  const x = noise2D("shake-x", frame * 0.9, 0) * amount * s;
  const y = noise2D("shake-y", 0, frame * 0.9) * amount * s;
  const r = noise2D("shake-r", frame * 0.7, 3) * 1.2 * s;
  return (
    <AbsoluteFill style={{ translate: `${x}px ${y}px`, rotate: `${r}deg`, scale: String(1 + 0.03 * s) }}>{children}</AbsoluteFill>
  );
};

/** White flash on every hit frame. */
export const Flash: React.FC<{ hits: number[]; color?: string; peak?: number }> = ({
  hits,
  color = "#FFFFFF",
  peak = 0.55,
}) => {
  const frame = useCurrentFrame();
  const o = hits.reduce(
    (m, h) => Math.max(m, interpolate(frame - h, [0, 1, 6], [0, peak, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
    0,
  );
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: color, opacity: o, pointerEvents: "none" }} />;
};
