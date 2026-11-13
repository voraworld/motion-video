import React from "react";

/** Text rising out of a hard mask line (p: 0 hidden → 1 settled). */
export const MaskRise: React.FC<{ p: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ p, children, style }) => (
  <div style={{ overflow: "hidden", paddingTop: 8, paddingBottom: 12, marginTop: -8, marginBottom: -12, ...style }}>
    <div style={{ translate: `0 ${((1 - p) * 115).toFixed(2)}%` }}>{children}</div>
  </div>
);

/** Rotating prism: face A turns away while face B turns in (x 0→1). */
export const Prism: React.FC<{ x: number; a: React.ReactNode; b: React.ReactNode; h: number; style?: React.CSSProperties }> = ({ x, a, b, h, style }) => (
  <div style={{ position: "relative", height: h, perspective: 1400, ...style }}>
    <div style={{ position: "absolute", inset: 0, transform: `translateZ(${-h / 2}px) rotateX(${x * 90}deg) translateZ(${h / 2}px)`, opacity: x > 0.98 ? 0 : 1, filter: `brightness(${1 - x * 0.45})` }}>{a}</div>
    <div style={{ position: "absolute", inset: 0, transform: `translateZ(${-h / 2}px) rotateX(${x * 90 - 90}deg) translateZ(${h / 2}px)`, opacity: x < 0.02 ? 0 : 1, filter: `brightness(${0.55 + x * 0.45})` }}>{b}</div>
  </div>
);
