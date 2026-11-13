import React from "react";
import { BRAND } from "../brand/tokens";

/**
 * The UGC ring: thick arc segments with the logo's red → orange → amber gradient.
 * `fill` is how many segments are lit (fractions animate the last one); `drop` lets one segment fall away.
 */
export type RingProps = {
  size: number;
  stroke?: number;
  segments?: number;
  fill: number;
  gap?: number; // degrees between segments
  idPrefix: string;
  /** Segment index that falls off, with its fall progress 0..1 (offset + spin). */
  drop?: { index: number; k: number };
  glow?: number;
  track?: string;
};

const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + r * Math.cos(((a - 90) * Math.PI) / 180), cy + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
};

export const Ring: React.FC<RingProps> = ({ size, stroke = 26, segments = 7, fill, gap = 7, idPrefix, drop, glow = 0, track = "rgba(43,28,21,.08)" }) => {
  const c = size / 2;
  const r = c - stroke / 2 - 2;
  const step = 360 / segments;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible", filter: glow > 0 ? `drop-shadow(0 0 ${18 * glow}px rgba(242,106,31,${0.75 * glow}))` : undefined }}>
      <defs>
        <linearGradient id={`${idPrefix}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.red} />
          <stop offset="0.55" stopColor={BRAND.orange} />
          <stop offset="1" stopColor={BRAND.amber} />
        </linearGradient>
      </defs>
      {Array.from({ length: segments }, (_, i) => {
        const a0 = i * step + gap / 2;
        const a1 = (i + 1) * step - gap / 2;
        const lit = Math.max(0, Math.min(1, fill - i));
        const falling = drop && drop.index === i ? drop.k : 0;
        const mid = ((a0 + a1) / 2 - 90) * (Math.PI / 180);
        const dx = Math.cos(mid) * 60 * falling;
        const dy = Math.sin(mid) * 60 * falling + 900 * falling * falling;
        return (
          <g key={i}>
            <path d={arcPath(c, c, r, a0, a1)} stroke={track} strokeWidth={stroke} fill="none" strokeLinecap="round" />
            {lit > 0 ? (
              <path
                d={arcPath(c, c, r, a0, a0 + (a1 - a0) * lit)}
                stroke={`url(#${idPrefix}-g)`}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                transform={falling > 0 ? `translate(${dx} ${dy}) rotate(${falling * 140} ${c + Math.cos(mid) * r} ${c + Math.sin(mid) * r})` : undefined}
                opacity={1 - falling * 0.6}
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};

/** Decorative open arcs in the logo's language: thick gradient strokes that draw on and drift slowly. */
export const DecorArc: React.FC<{
  x: number;
  y: number;
  r: number;
  stroke: number;
  from: number;
  sweep: number;
  draw: number; // 0..1 how much of the sweep is drawn
  rotate: number;
  opacity?: number;
  idPrefix: string;
}> = ({ x, y, r, stroke, from, sweep, draw, rotate, opacity = 1, idPrefix }) => {
  const size = r * 2 + stroke * 2;
  const c = size / 2;
  return (
    <svg width={size} height={size} style={{ position: "absolute", left: x - c, top: y - c, rotate: `${rotate}deg`, opacity, overflow: "visible" }}>
      <defs>
        <linearGradient id={`${idPrefix}-d`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={BRAND.red} />
          <stop offset="0.6" stopColor={BRAND.orange} />
          <stop offset="1" stopColor={BRAND.amber} />
        </linearGradient>
      </defs>
      {draw > 0.001 ? <path d={arcPath(c, c, r, from, from + sweep * draw)} stroke={`url(#${idPrefix}-d)`} strokeWidth={stroke} fill="none" strokeLinecap="round" /> : null}
    </svg>
  );
};
