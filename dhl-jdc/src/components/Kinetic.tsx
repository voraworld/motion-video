import React from "react";
import { C } from "../design/tokens";
import { E, clamp01, k } from "../motion/util";

/** Text rising out of a hard mask line (p: 0 hidden → 1 settled; negative exit uses q). */
export const MaskRise: React.FC<{ p: number; q?: number; children: React.ReactNode; style?: React.CSSProperties; dir?: 1 | -1 }> = ({
  p,
  q = 0,
  children,
  style,
  dir = 1,
}) => (
  <div style={{ overflow: "hidden", paddingTop: 6, paddingBottom: 10, marginTop: -6, marginBottom: -10, ...style }}>
    <div style={{ translate: `0 ${((1 - p) * 115 * dir - q * 115 * dir).toFixed(2)}%` }}>{children}</div>
  </div>
);

/**
 * Text uncovered by a sliding parallelogram plane: the plane travels across the line and the text exists
 * only behind its trailing edge. dir 1 = left→right.
 */
export const PlaneReveal: React.FC<{
  p: number;
  width: number;
  height: number;
  color: string;
  dir?: 1 | -1;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ p, width, height, color, dir = 1, children, style }) => {
  const planeW = width * 0.38;
  const travel = width + planeW * 2;
  const x = -planeW + p * travel; // leading edge position (from the start side)
  const reveal = clamp01((x - planeW) / width); // trailing edge
  const clip = dir === 1 ? `inset(-20% ${(1 - reveal) * 100}% -20% -2%)` : `inset(-20% -2% -20% ${(1 - reveal) * 100}%)`;
  const left = dir === 1 ? x - planeW : width - x;
  return (
    <div style={{ position: "relative", width, height, ...style }}>
      <div style={{ position: "absolute", inset: 0, clipPath: clip }}>{children}</div>
      {p > 0 && p < 1 ? (
        <div
          style={{
            position: "absolute",
            top: -height * 0.06,
            height: height * 1.12,
            left,
            width: planeW,
            background: color,
            transform: "skewX(-16deg)",
          }}
        />
      ) : null}
    </div>
  );
};

/** Cheap directional motion blur: n faded copies trailing along (vx, vy) pixels. */
export const Ghost: React.FC<{ vx: number; vy?: number; n?: number; children: React.ReactNode }> = ({ vx, vy = 0, n = 5, children }) => {
  const mag = Math.hypot(vx, vy);
  if (mag < 4) return <>{children}</>;
  return (
    <div style={{ position: "relative" }}>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          style={{
            position: i === 0 ? "relative" : "absolute",
            left: 0,
            top: 0,
            translate: `${(-vx * i) / n}px ${(-vy * i) / n}px`,
            opacity: i === 0 ? 1 : 0.32 * (1 - i / n),
          }}
        >
          {children}
        </div>
      ))}
    </div>
  );
};

/** Letters arriving from depth: each glyph scales down from z and sharpens, staggered. */
export const DepthLetters: React.FC<{ text: string; t: number; t0: number; style: React.CSSProperties; stagger?: number; dur?: number }> = ({
  text,
  t,
  t0,
  style,
  stagger = 0.045,
  dur = 0.5,
}) => (
  <div style={{ display: "flex", ...style }}>
    {text.split("").map((ch, i) => {
      const p = k(t, [t0 + i * stagger, t0 + i * stagger + dur], [0, 1], E.out);
      return (
        <span
          key={i}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            scale: `${(1 + (1 - p) * 2.4).toFixed(3)}`,
            opacity: clamp01(p * 1.6),
            filter: p < 0.98 ? `blur(${((1 - p) * 14).toFixed(1)}px)` : undefined,
            translate: `0 ${((1 - p) * -40).toFixed(1)}px`,
          }}
        >
          {ch}
        </span>
      );
    })}
  </div>
);

/** Rotating prism: face A turns away while face B turns in (x 0→1). */
export const Prism: React.FC<{ x: number; a: React.ReactNode; b: React.ReactNode; h: number; style?: React.CSSProperties }> = ({ x, a, b, h, style }) => {
  const ang = x * 90;
  return (
    <div style={{ position: "relative", height: h, perspective: 1400, ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateZ(${-h / 2}px) rotateX(${ang}deg) translateZ(${h / 2}px)`,
          opacity: x > 0.98 ? 0 : 1,
          filter: `brightness(${1 - x * 0.45})`,
        }}
      >
        {a}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateZ(${-h / 2}px) rotateX(${ang - 90}deg) translateZ(${h / 2}px)`,
          opacity: x < 0.02 ? 0 : 1,
          filter: `brightness(${0.55 + x * 0.45})`,
        }}
      >
        {b}
      </div>
    </div>
  );
};

/** DHL-style speed-line bar used as a graphic divider. */
export const SpeedLines: React.FC<{ w: number; color?: string; style?: React.CSSProperties }> = ({ w, color = C.red, style }) => (
  <svg width={w} height={30} viewBox={`0 0 ${w} 30`} style={style}>
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M${i * 10 + 8},${i * 10} L${w},${i * 10} L${w - 8},${i * 10 + 6} L${i * 10},${i * 10 + 6} Z`} fill={color} />
    ))}
  </svg>
);
