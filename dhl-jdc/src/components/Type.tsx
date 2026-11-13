import React from "react";
import { clamp01, k, E } from "../motion/util";

/**
 * Title entrances (HyperFrames motion guide): varied per scene, never fade+slide-up for everything.
 * Landed titles hold dead still; exits are short blur-outs.
 */
/** Per-word: blur 10px → 0 and opacity 0 → 1 in 0.15 s, words 0.08 s apart. */
export const BlurWords: React.FC<{ text: string; t: number; t0: number; out?: number; style: React.CSSProperties; gap?: number; color?: (i: number) => string | undefined }> = ({
  text,
  t,
  t0,
  out,
  style,
  gap = 0.28,
  color,
}) => {
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: `${gap}em`, ...style }}>
      {words.map((w, i) => {
        const p = k(t, [t0 + i * 0.08, t0 + i * 0.08 + 0.16], [0, 1], E.out);
        const q = out === undefined ? 0 : k(t, [out + i * 0.04, out + i * 0.04 + 0.16], [0, 1], E.in);
        const v = p * (1 - q);
        if (v <= 0) return <span key={i} style={{ opacity: 0 }}>{w}</span>;
        return (
          <span key={i} style={{ display: "inline-block", opacity: clamp01(v), filter: v < 0.99 ? `blur(${((1 - v) * 10).toFixed(1)}px)` : undefined, color: color?.(i) }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Whole line blurs in (8px → 0 in 0.18 s) with a slight scale settle; blurs out on exit. */
export const BlurLine: React.FC<{ t: number; t0: number; out?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ t, t0, out, children, style }) => {
  const p = k(t, [t0, t0 + 0.2], [0, 1], E.out);
  const q = out === undefined ? 0 : k(t, [out, out + 0.18], [0, 1], E.in);
  const v = p * (1 - q);
  if (v <= 0) return null;
  return (
    <div style={{ opacity: clamp01(v), filter: v < 0.99 ? `blur(${((1 - v) * 9).toFixed(1)}px)` : undefined, scale: `${(1.04 - 0.04 * p).toFixed(4)}`, ...style }}>
      {children}
    </div>
  );
};
