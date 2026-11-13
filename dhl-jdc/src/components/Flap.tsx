import React from "react";
import { C, DISPLAY } from "../design/tokens";
import { clamp01, rnd } from "../motion/util";

/**
 * Split-flap (Solari) board, ported from the HyperFrames registry block `split-flap-board`:
 * every cell walks its drum FORWARD through the intervening characters until it lands on its target
 * (never jumps), and each flap falls with constant angular acceleration, θ(p) = 180°·p², handing over
 * from the top leaf to the bottom leaf at θ = 90°. Deterministic in t.
 */
export const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,'+?!-:";
const N = DRUM.length;

export type FlapStyle = { bg: string; fg: string; seam?: string };
export const FLAP_DARK: FlapStyle = { bg: C.ink, fg: "#F6F2E6" };
export const FLAP_YELLOW: FlapStyle = { bg: C.ink, fg: C.yellow };
export const FLAP_RED: FlapStyle = { bg: C.red, fg: C.white, seam: "#8E030C" };
export const FLAP_WHITE: FlapStyle = { bg: C.white, fg: C.ink, seam: "#CFCFCF" };

/** Character shown by one cell at time t (and the next one + flap progress while it flips). */
const cellState = (t: number, start: number, from: string, to: string, flip: number, seed: number) => {
  const ti = Math.max(0, DRUM.indexOf(to));
  const fi = from ? Math.max(0, DRUM.indexOf(from)) : -1;
  // walk length: from the previous text if given, otherwise 4–9 positions before the target
  const steps = fi >= 0 ? (ti - fi + N) % N : 4 + Math.floor(rnd(seed) * 6);
  const startIdx = (ti - steps + N) % N;
  const s = (t - start) / flip;
  if (s <= 0) return { cur: DRUM[startIdx], next: DRUM[startIdx], p: 0, done: steps === 0 && s > 0 };
  if (s >= steps) return { cur: DRUM[ti], next: DRUM[ti], p: 0, done: true };
  const k = Math.floor(s);
  return { cur: DRUM[(startIdx + k) % N], next: DRUM[(startIdx + k + 1) % N], p: s - k, done: false };
};

const Half: React.FC<{ ch: string; w: number; h: number; top: boolean; st: FlapStyle; font: number; style?: React.CSSProperties; shade?: boolean }> = ({
  ch,
  shade,
  w,
  h,
  top,
  st,
  font,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: top ? 0 : h / 2,
      width: w,
      height: h / 2,
      overflow: "hidden",
      background: top ? `linear-gradient(180deg, ${st.bg} 0%, ${st.bg} 100%)` : st.bg,
      borderRadius: top ? `${w * 0.1}px ${w * 0.1}px 0 0` : `0 0 ${w * 0.1}px ${w * 0.1}px`,
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        top: top ? 0 : -h / 2,
        width: w,
        height: h,
        lineHeight: `${h}px`,
        textAlign: "center",
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontStretch: "78%",
        fontSize: font,
        color: st.fg,
        whiteSpace: "pre",
      }}
    >
      {ch}
    </div>
    {/* depth shading only while a leaf is moving; a landed character reads clean */}
    {shade ? <div style={{ position: "absolute", inset: 0, background: top ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.18)" }} /> : null}
  </div>
);

export const FlapCell: React.FC<{ t: number; start: number; from?: string; to: string; w: number; h: number; st: FlapStyle; flip: number; seed: number }> = ({
  t,
  start,
  from = "",
  to,
  w,
  h,
  st,
  flip,
  seed,
}) => {
  const { cur, next, p } = cellState(t, start, from, to, flip, seed);
  const font = h * 0.74;
  const th = 180 * p * p;
  if (p <= 0) {
    // at rest: one solid cell, no seam, nothing between the reader and the character
    return (
      <div
        style={{
          position: "relative",
          width: w,
          height: h,
          flex: "0 0 auto",
          background: st.bg,
          borderRadius: w * 0.1,
          lineHeight: `${h}px`,
          textAlign: "center",
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontStretch: "78%",
          fontSize: font,
          color: st.fg,
          whiteSpace: "pre",
          filter: "drop-shadow(0 6px 8px rgba(70,40,0,0.28))",
        }}
      >
        {cur}
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: w, height: h, perspective: h * 6, flex: "0 0 auto", filter: "drop-shadow(0 6px 8px rgba(70,40,0,0.28))" }}>
      {/* static: next char's top, current char's bottom */}
      <Half ch={p > 0 ? next : cur} w={w} h={h} top st={st} font={font} />
      <Half ch={cur} w={w} h={h} top={false} st={st} font={font} />
      {p > 0 && th < 90 ? (
        <Half ch={cur} w={w} h={h} top st={st} font={font} style={{ transformOrigin: "50% 100%", transform: `rotateX(${-th}deg)`, zIndex: 3 }} shade />
      ) : null}
      {p > 0 && th >= 90 ? (
        <Half ch={next} w={w} h={h} top={false} st={st} font={font} style={{ transformOrigin: "50% 0%", transform: `rotateX(${180 - th}deg)`, zIndex: 3 }} shade />
      ) : null}
    </div>
  );
};

/**
 * A row of flap cells. `text` is padded to `cells` (centred unless align="left").
 * `from` lets a row re-flip from a previous message to a new one (walks forward between them).
 */
export const FlapRow: React.FC<{
  t: number;
  t0: number;
  text: string;
  from?: string;
  cells?: number;
  w: number;
  h: number;
  gap?: number;
  st?: FlapStyle | ((i: number) => FlapStyle);
  flip?: number;
  stagger?: number;
  align?: "center" | "left";
  seed?: number;
  appear?: number;
}> = ({ t, t0, text, from, cells, w, h, gap = 6, st = FLAP_DARK, flip = 0.055, stagger = 0.028, align = "center", seed = 1, appear }) => {
  const n = cells ?? Math.max(text.length, from?.length ?? 0);
  const pad = (s: string) => {
    const u = s.toUpperCase();
    if (align === "left") return u.padEnd(n, " ").slice(0, n);
    const lead = Math.floor((n - u.length) / 2);
    return (" ".repeat(Math.max(0, lead)) + u).padEnd(n, " ").slice(0, n);
  };
  const tgt = pad(text);
  const src = from !== undefined ? pad(from) : undefined;
  const op = appear === undefined ? 1 : clamp01((t - appear) / 0.12);
  if (op <= 0) return null;
  return (
    <div style={{ display: "flex", gap, opacity: op }}>
      {tgt.split("").map((ch, i) => (
        <FlapCell
          key={i}
          t={t}
          start={t0 + i * stagger}
          from={src ? src[i] : undefined}
          to={ch}
          w={w}
          h={h}
          st={typeof st === "function" ? st(i) : st}
          flip={flip}
          seed={seed * 31 + i}
        />
      ))}
    </div>
  );
};

/** True once every cell of a row has landed (for timing SFX/other beats). */
export const flapRowDone = (t0: number, n: number, stagger = 0.028, flip = 0.055) => t0 + n * stagger + 10 * flip;

/**
 * FLAP WIPE — the whole frame turns over like a departure board. A grid of leaves, in a wave:
 * cover: a leaf rises into the top half, then falls (θ = 180°·p²) over the bottom half → the tile is charcoal;
 * reveal: the top leaf falls away onto the bottom half, uncovering the new scene, and the tile clears.
 * p ∈ [0, 1] over the transition; the middle of the transition is a full board (optional word on it).
 */
export const FlapWipe: React.FC<{ p: number; pattern?: "rows" | "diag" | "center" | "cols"; color?: string; cols?: number; rows?: number; word?: string }> = ({
  p,
  pattern = "rows",
  color = C.ink,
  cols = 6,
  rows = 11,
  word,
}) => {
  if (p <= 0 || p >= 1) return null;
  const cw = 1080 / cols;
  const ch = 1920 / rows;
  const half = ch / 2;
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const order =
        pattern === "rows"
          ? r / (rows - 1)
          : pattern === "cols"
            ? c / (cols - 1)
            : pattern === "diag"
              ? (r / (rows - 1) + c / (cols - 1)) / 2
              : Math.hypot(c - (cols - 1) / 2, r - (rows - 1) / 2) / Math.hypot((cols - 1) / 2, (rows - 1) / 2);
      const spread = 0.5;
      const cover = clamp01((p * 2 - order * spread) / (1 - spread));
      const reveal = clamp01(((p - 0.5) * 2 - order * spread) / (1 - spread));
      if (cover <= 0 || reveal >= 1) continue;
      const leaf = (top: number, origin: string, deg: number, shade: number, key: string) => (
        <div
          key={key}
          style={{
            position: "absolute",
            left: 0,
            top,
            width: cw + 1,
            height: half + 1,
            background: color,
            transformOrigin: origin,
            transform: `rotateX(${deg.toFixed(2)}deg)`,
            filter: `brightness(${shade.toFixed(3)})`,
          }}
        />
      );
      const parts: React.ReactNode[] = [];
      if (reveal <= 0) {
        if (cover < 0.5) {
          const q = cover * 2;
          parts.push(leaf(0, "50% 100%", -90 + 90 * (1 - (1 - q) * (1 - q)), 0.75 + 0.25 * q, "a"));
        } else {
          const q = (cover - 0.5) * 2;
          const th = 180 * q * q;
          parts.push(leaf(0, "50% 100%", 0, 1, "s"));
          if (q >= 1) parts.push(leaf(half, "50% 0%", 0, 1, "b"));
          else if (th < 90) parts.push(leaf(0, "50% 100%", -th, 1 - 0.3 * Math.sin((th * Math.PI) / 180), "f"));
          else parts.push(leaf(half, "50% 0%", 180 - th, 0.7 + 0.3 * ((th - 90) / 90), "g"));
        }
      } else {
        const th = 180 * reveal * reveal;
        const fade = 1 - clamp01((reveal - 0.85) / 0.15);
        parts.push(
          <div key="bot" style={{ position: "absolute", left: 0, top: half, width: cw + 1, height: half + 1, background: color, opacity: fade }} />,
        );
        if (th < 90) parts.push(leaf(0, "50% 100%", -th, 1 - 0.35 * Math.sin((th * Math.PI) / 180), "r"));
      }
      tiles.push(
        <div key={`${r}-${c}`} style={{ position: "absolute", left: c * cw + 3, top: r * ch + 3, width: cw - 6, height: ch - 6, perspective: 1200, borderRadius: 10, overflow: "hidden" }}>
          {parts}
          <div style={{ position: "absolute", left: 0, top: half - 2, width: cw + 1, height: 4, background: "rgba(0,0,0,0.55)" }} />
        </div>,
      );
    }
  }
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {tiles}
      {word && p > 0.4 && p < 0.6 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontStretch: "70%",
            fontSize: 150,
            color: C.yellow,
            opacity: clamp01(1 - Math.abs(p - 0.5) / 0.1),
          }}
        >
          {word}
        </div>
      ) : null}
    </div>
  );
};
