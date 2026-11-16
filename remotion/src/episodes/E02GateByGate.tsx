import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import { asset, beatsOf, getEpisode, MANIFEST, sec } from "../data";
import { BrandFrame } from "../brand/BrandFrame";
import { BRAND, FONT_BODY, FONT_CONDENSED } from "../brand/tokens";
import { Captions } from "../shared/Captions";
import { HfOverlay } from "../shared/HfOverlay";
import { Flash, Shake } from "../shared/Impact";
import { PHOSPHOR, PhosphorName } from "../shared/phosphor";
import { SfxCue, SoundLayer } from "../shared/SoundLayer";

/**
 * E02 · Gate by Gate: Import Clearance (55 s) — the only dark episode.
 *
 * The container travels through five rooms, one per gate, each with its own picture and its own motion:
 *   hook   night yard from above, the container slams onto a closed barrier
 *   gate 1 top-down stack: containers rain down into the yard like falling blocks, ours lands on top
 *   gate 2 hologram room: the container becomes a rotating wireframe, payment and PIB tokens orbit it
 *   gate 3 road fork from above: the green and the red lane light up in turn
 *   gate 4 the container doors: the SPPB stamp hits the door, the delivery order slides out of the seam
 *   stuck  the doors stay shut: the screen cracks, calendar pages tear off, the clock races
 *   gate 5 the doors swing open onto the truck leaving the port
 *
 * One orange disc carries the story: moon → porthole gate counter → customs release stamp → truck headlights → the G of the logo.
 * Gate changes: dolly dive · fly through the porthole · green/red split · whip zoom · doors swing open · headlight whiteout.
 *
 * R (Remotion): every room, the disc morphs, transitions, depth gauge, headlines, gate 1 + gate 4 chips, captions,
 *   brand frame, audio. H (HyperFrames): e02-hook, e02-pib, e02-lanes, e02-stuck, e02-door, e02-logo.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ep = getEpisode("E02");
const beats = beatsOf(ep);
const vo = MANIFEST.voBeats?.e02 ?? [];
const A = (name: string) => staticFile(asset("e02", name) ?? `assets/e02/${name}.png`);
const ioCubic = Easing.bezier(0.65, 0, 0.35, 1);

const wordAt = (beatIndex: number, word: string) => {
  const b = ep.beats[beatIndex];
  const words = b[4].split(/\s+/);
  const idx = Math.max(0, words.findIndex((w) => w.replace(/[^\w']/g, "").toLowerCase() === word.toLowerCase()));
  const dur = vo.find((v) => v.start === b[0])?.duration ?? b[1] - b[0] - 0.5;
  return b[0] + (dur * idx) / words.length;
};

// ── Timeline ────────────────────────────────────────────────────────────────────────────────────────────
const T = {
  land0: 0.4,
  stacked: wordAt(1, "stacked"),
  // Word starts measured on the generated VO (whisper word timestamps).
  sppb: 28 + 1.79, // "release (approval)"
  delivery: 28 + 3.97,
  paid: 10 + 2.68,
  declared: 10 + 3.93,
  stuck: 34,
  headlights: 44.6,
  flare: 47.65,
  white: 48.12,
  logo: 48.3,
};
const DIVE1 = { open: 3.5, from: 3.62, to: 4.12, cut: 4.02 }; // hook → stack: dolly dive, cut on a flash
const PORT_FLY = { from: 9.5, peak: 9.92, open: 10.28 }; // stack → hologram: through the porthole glass
const SPLIT = { from: 18.6, to: 19.15 }; // hologram → road: green / red split
const WHIP = { from: 27.8, cut: 28.1, settle: 28.6 }; // road → doors: whip zoom into the container
const DOORS_OPEN = { from: 39.0, to: 39.8 }; // doors → truck: the container doors swing open
const GREEN_AT = 21.78;
const RED_AT = 24.16;
const GLITCH = [
  [34.0, 34.38],
  [35.3, 35.5],
  [36.35, 36.55],
];

// Rooms (visibility windows)
const ROOM = {
  hook: [0, DIVE1.cut + 0.1],
  stack: [DIVE1.cut, PORT_FLY.peak + 0.05],
  holo: [PORT_FLY.peak, SPLIT.to + 0.05],
  road: [SPLIT.from, WHIP.cut],
  doors: [WHIP.cut, DOORS_OPEN.to + 0.05],
  truck: [DOORS_OPEN.from, T.white + 0.1],
} as const;
const showing = (t: number, r: readonly [number, number]) => t >= r[0] && t < r[1];

// ── Geometry (1080×1920) ────────────────────────────────────────────────────────────────────────────────
const SPACING = 1700;
const GATE_Y = 1390;
const ARM_S = 0.6; // gate-arm.png 1963×570, pivot (330,163), bar y 123–204, post x 30–300
const PIVOT = { x: 330, y: 163 };
const BAR_CUT = 372;
const CONT_W = 500; // falling-container.png 1071×1266, body bottom y 1259
const CONT_S = CONT_W / 1071;
const CONT_X = 600;
const CONT_BOTTOM = GATE_Y - (PIVOT.y - 123) * ARM_S;
const CONT_TOP = CONT_BOTTOM - 1259 * CONT_S;
const PORT = { x: 800, y: 205, size: 200 };
const GLASS = { x: PORT.x + PORT.size * 0.49, y: PORT.y + PORT.size * 0.5, r: PORT.size * 0.31 };
const MOON = { x: 900, y: 770, r: 100 };
const DOOR_S = 1080 / 941; // container-doors.png 941×1672, seam x 470
const STAMP_AT = { x: 636 * DOOR_S, y: 760 * DOOR_S };
const G_LOGO = { x: 436, y: 777, r: 124 };
const GAUGE = { x: 1018, top: 560, step: 170 };
const ROAD = { top: 57, s: 1080 / 1024 }; // road-fork.png 1024×1536, fork at (514,780)

// ── Helpers ─────────────────────────────────────────────────────────────────────────────────────────────
const hash = (i: number, salt = 0) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const easeIn = (p: number) => p * p;
const prog = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const inWin = (t: number, a: number, b: number) => t >= a && t < b;

const Icon: React.FC<{ name: PhosphorName; size: number; color?: string }> = ({ name, size, color = "#fff" }) => (
  <svg viewBox="0 0 256 256" width={size} height={size} fill={color} aria-hidden>
    {PHOSPHOR[name].map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

const Chip: React.FC<{ t: number; at: number; out: number; top: number; icon: PhosphorName; tag: string; text: string }> = ({ t, at, out, top, icon, tag, text }) => {
  if (t < at || t > out + 0.5) return null;
  const d = t - at;
  const rot = interpolate(d, [0, 0.26, 0.35, 0.49], [-100, 12, -5, 0], clamp);
  const fadeIn = interpolate(d, [0, 0.2], [0, 1], clamp);
  const o = Math.max(0, Math.min(1, (t - out) / 0.32));
  const okScale = interpolate(d, [0.32, 0.6, 0.74], [0, 1.15, 1], clamp);
  const shine = interpolate(d, [0.25, 0.95], [-120, 260], clamp);
  return (
    <div style={{ position: "absolute", left: 300, top, width: 700, height: 116, perspective: 900 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "0 26px 0 18px",
          borderRadius: 22,
          overflow: "hidden",
          transformOrigin: "50% 0%",
          transform: `translateY(${260 * easeIn(o)}px) rotateX(${rot + 70 * o}deg)`,
          opacity: fadeIn * (1 - o),
          background: "linear-gradient(180deg, rgba(16,26,48,.9), rgba(8,14,30,.9))",
          border: "1.5px solid rgba(255,255,255,.14)",
          boxShadow: "0 18px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 7, background: `linear-gradient(180deg, ${BRAND.orange}, ${BRAND.amber})` }} />
        <div
          style={{
            flex: "none",
            width: 80,
            height: 80,
            borderRadius: 18,
            display: "grid",
            placeItems: "center",
            background: `linear-gradient(135deg, ${BRAND.orange}, ${BRAND.amber})`,
            boxShadow: "0 6px 18px rgba(0,0,0,.35)",
          }}
        >
          <Icon name={icon} size={48} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_CONDENSED, fontSize: 34, letterSpacing: "0.12em", lineHeight: 1, color: BRAND.amber }}>{tag}</div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 35, lineHeight: 1.15, color: "#FFF7EF", whiteSpace: "nowrap" }}>{text}</div>
        </div>
        <div style={{ flex: "none", scale: String(okScale) }}>
          <Icon name="check-circle" size={54} color={BRAND.amber} />
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "40%",
            translate: `${shine}% 0`,
            background: "linear-gradient(100deg, transparent, rgba(255,255,255,.16), transparent)",
          }}
        />
      </div>
    </div>
  );
};

/** Darkening gradients so headlines (top) and chips (bottom) always read. */
const Grade: React.FC<{ top?: number; bottom?: number }> = ({ top = 0.88, bottom = 0.9 }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, rgba(4,9,24,${top}) 0%, rgba(4,9,24,${top * 0.55}) 26%, rgba(4,9,24,0) 40%, rgba(4,9,24,0) 64%, rgba(4,9,24,${bottom * 0.8}) 76%, rgba(4,9,24,${bottom}) 100%)`,
    }}
  />
);

// ── Hook: night yard, the container slams onto a closed barrier ────────────────────────────────────────
const hookCam = (t: number) => (t < DIVE1.from ? 0 : easeIn(prog(t, DIVE1.from, DIVE1.to)));
const hookDy = (t: number) => {
  if (t < T.land0) return -1100 * (1 - easeIn(t / T.land0));
  if (inWin(t, DIVE1.from, DIVE1.to)) return Math.sin(Math.PI * prog(t, DIVE1.from, DIVE1.to)) * 90;
  return 0;
};
const bounce = (t: number) => {
  const d = t - T.land0;
  if (d < 0 || d > 1.2) return { y: 0, squash: 0 };
  return { y: -34 * Math.exp(-5.5 * d) * Math.abs(Math.sin(d * 14)), squash: Math.exp(-14 * d) * Math.cos(d * 30) };
};

const Cable: React.FC<{ dy: number }> = ({ dy }) => (
  <div
    style={{
      position: "absolute",
      left: CONT_X - 5,
      top: -60,
      width: 10,
      height: CONT_TOP + dy + 70,
      background: "linear-gradient(90deg, #4b525c, #c9ced6 45%, #6c727c)",
      boxShadow: "0 0 10px rgba(0,0,0,.6)",
    }}
  />
);

const HookRoom: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const cam = hookCam(t);
  const h = 1620;
  const off = cam * SPACING * 0.45 + t * 10;
  const k1 = inWin(t, DIVE1.from, DIVE1.to) ? Math.sin(Math.PI * prog(t, DIVE1.from, DIVE1.to)) : 0;
  const gy = GATE_Y - cam * SPACING;
  const angle = interpolate(t, [DIVE1.open, DIVE1.open + 0.38], [0, -84], { ...clamp, easing: Easing.out(Easing.back(1.4)) }) + (t > T.land0 && t < T.land0 + 1 ? 4 * Math.exp(-6 * (t - T.land0)) * Math.cos((t - T.land0) * 22) : 0);
  const w = 1963 * ARM_S;
  const ah = 570 * ARM_S;
  const top = gy - PIVOT.y * ARM_S;
  const { y: by, squash } = bounce(t);
  const dy = hookDy(t) + by;
  const flick = t > T.land0 && t < T.land0 + 0.45 && hash(frame, 7) > 0.45 ? 0.35 : 0;
  const d = t - T.land0;
  const rw = d > 0 && d < 0.9 ? 1100 * (1 - Math.exp(-4 * d)) : 0;
  return (
    <AbsoluteFill style={{ transformOrigin: "50% 62%", transform: `rotateZ(${k1 * 7}deg) scale(${1 + 0.32 * k1})`, background: "#050A18", overflow: "hidden" }}>
      {[0, 1].map((k) => {
        const i = Math.floor(off / h) + k;
        return <Img key={i} src={A("background-plate")} style={{ position: "absolute", left: 0, top: i * h - off, width: 1080, height: h, transform: i % 2 ? "scaleY(-1)" : undefined }} />;
      })}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,9,24,.86) 0%, rgba(5,12,30,.55) 34%, rgba(5,12,30,.42) 60%, rgba(4,9,24,.82) 100%)" }} />
      <div style={{ position: "absolute", left: 2, top, width: w, height: ah, clipPath: `inset(0 0 0 ${BAR_CUT * ARM_S}px)`, transformOrigin: `${PIVOT.x * ARM_S}px ${PIVOT.y * ARM_S}px`, rotate: `${angle}deg` }}>
        <Img src={A("gate-arm")} style={{ width: w, height: ah, display: "block", filter: "drop-shadow(0 18px 18px rgba(0,0,0,.5))" }} />
      </div>
      <div style={{ position: "absolute", left: 2, top, width: BAR_CUT * ARM_S, height: ah, overflow: "hidden" }}>
        <Img src={A("gate-arm")} style={{ width: w, height: ah, display: "block" }} />
      </div>
      <Cable dy={dy} />
      <Img
        src={A("falling-container")}
        style={{
          position: "absolute",
          left: CONT_X - CONT_W / 2,
          top: CONT_TOP + dy,
          width: CONT_W,
          transformOrigin: "50% 100%",
          scale: `${1 + squash * 0.04} ${1 - squash * 0.06}`,
          filter: "drop-shadow(0 30px 30px rgba(0,0,0,.6)) brightness(1.05)",
        }}
      />
      {rw > 0 ? (
        <div
          style={{
            position: "absolute",
            left: CONT_X - rw / 2,
            top: CONT_BOTTOM - rw * 0.08,
            width: rw,
            height: rw * 0.16,
            borderRadius: "50%",
            border: `${5 * (1 - d)}px solid rgba(255,206,150,${0.9 * (1 - d / 0.9)})`,
            boxShadow: `0 0 30px rgba(245,166,35,${0.7 * (1 - d / 0.9)})`,
          }}
        />
      ) : null}
      <AbsoluteFill style={{ background: "#000", opacity: flick }} />
      {k1 > 0.01 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: k1 }}>
          {Array.from({ length: 48 }, (_, i) => {
            const a = (i / 48) * Math.PI * 2 + hash(i, 41) * 0.1;
            const r = 160 + ((hash(i, 42) + t * 2.6) % 1) * 1200;
            const len = 120 + hash(i, 43) * 260;
            return (
              <line
                key={i}
                x1={540 + Math.cos(a) * r}
                y1={1100 + Math.sin(a) * r}
                x2={540 + Math.cos(a) * (r + len)}
                y2={1100 + Math.sin(a) * (r + len)}
                stroke="rgba(255,220,180,.5)"
                strokeWidth={2 + hash(i, 44) * 3}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

// ── Gate 1: the stack, seen from straight above ─────────────────────────────────────────────────────────
type Box = { x: number; y: number; w: number; rot: number; at: number; filter: string; hero?: boolean };
const STACK_FILTERS = [
  "hue-rotate(185deg) saturate(.55) brightness(.62)",
  "saturate(.25) brightness(.5)",
  "hue-rotate(160deg) saturate(.4) brightness(.55)",
  "saturate(.7) brightness(.55)",
  "hue-rotate(200deg) saturate(.35) brightness(.48)",
];
const STACK: Box[] = (() => {
  const out: Box[] = [];
  let n = 0;
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 2; c++) {
      if (r === 2 && c === 1) continue; // the hero's slot on the lower tier stays visible under it
      out.push({ x: 90 + c * 460 + 220, y: 790 + r * 126 + 55, w: 440, rot: 0, at: 4.25 + n * 0.17, filter: STACK_FILTERS[(r * 2 + c) % STACK_FILTERS.length] });
      n++;
    }
  out.push({ x: 540, y: 1042, w: 470, rot: -3, at: 0, filter: "none", hero: true });
  return out;
})();
const heroLandAt = () => T.stacked;

const StackBox: React.FC<{ b: Box; t: number }> = ({ b, t }) => {
  const at = b.hero ? heroLandAt() - 0.36 : b.at;
  const fall = 0.36;
  if (t < at) return null;
  const p = prog(t, at, at + fall);
  const s = (b.hero ? 1.1 : 1) * (1 + 1.8 * (1 - easeIn(p)));
  const d = t - at - fall;
  const settle = d > 0 && d < 0.5 ? 1 - 0.035 * Math.exp(-8 * d) * Math.cos(d * 30) : 1;
  const rot = b.rot + (1 - p) * (hash(b.x + b.y, 9) - 0.5) * 30;
  const sh = (s - 1) * 60;
  const h = b.w / 4;
  return (
    <div
      style={{
        position: "absolute",
        left: b.x - b.w / 2,
        top: b.y - h / 2,
        width: b.w,
        height: h,
        rotate: `${rot}deg`,
        scale: String(s * settle),
        opacity: interpolate(p, [0, 0.25], [0, 1], clamp),
        filter: `drop-shadow(${sh * 0.4}px ${10 + sh}px ${8 + sh * 0.6}px rgba(0,0,0,${0.75 - Math.min(0.4, sh / 200)}))`,
      }}
    >
      <Img src={A("container-top")} style={{ width: "100%", height: "100%", display: "block", filter: b.filter }} />
      {b.hero && d > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: -10,
            borderRadius: 10,
            border: `4px solid ${BRAND.amber}`,
            boxShadow: `0 0 ${30 + 20 * Math.sin(t * 4)}px rgba(245,166,35,.8)`,
            opacity: interpolate(d, [0, 0.3], [0, 1], clamp) * (0.7 + 0.3 * Math.sin(t * 4)),
          }}
        />
      ) : null}
    </div>
  );
};

const StackRoom: React.FC<{ t: number }> = ({ t }) => {
  const enter = interpolate(t, [DIVE1.cut, DIVE1.cut + 0.5], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const drift = prog(t, DIVE1.cut, PORT_FLY.peak);
  const lands = STACK.map((b) => (b.hero ? heroLandAt() : b.at + 0.36));
  return (
    <AbsoluteFill style={{ background: "#060B16", overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: "50% 55%", transform: `rotate(${6 - 8 * drift + enter * 14}deg) scale(${1.12 - 0.08 * drift + enter * 0.6})` }}>
        <Img src={A("background-plate")} style={{ position: "absolute", left: -120, top: -200, width: 1320, height: 1980, filter: "blur(3px) brightness(.45) saturate(.8)" }} />
        {/* Painted yard slots */}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 6 }, (_, r) => (
            <line key={r} x1={70} x2={1010} y1={784 + r * 126} y2={784 + r * 126} stroke="rgba(255,214,120,.35)" strokeWidth={3} strokeDasharray="26 16" />
          ))}
          <line x1={540} x2={540} y1={784} y2={1414} stroke="rgba(255,214,120,.3)" strokeWidth={3} strokeDasharray="26 16" />
        </svg>
        {STACK.filter((b) => !b.hero).map((b, i) => (
          <StackBox key={i} b={b} t={t} />
        ))}
        {lands.map((l, i) => {
          const d = t - l;
          if (d < 0 || d > 0.6) return null;
          const b = STACK[i];
          const r = (b.hero ? 420 : 260) * (1 - Math.exp(-5 * d));
          return (
            <div
              key={`ring-${i}`}
              style={{
                position: "absolute",
                left: b.x - r,
                top: b.y - r * 0.5,
                width: r * 2,
                height: r,
                borderRadius: "50%",
                border: `${b.hero ? 5 : 3}px solid rgba(255,214,150,${(b.hero ? 0.9 : 0.5) * (1 - d / 0.6)})`,
              }}
            />
          );
        })}
        <StackBox b={STACK[STACK.length - 1]} t={t} />
      </AbsoluteFill>
      <Grade top={0.9} bottom={0.85} />
    </AbsoluteFill>
  );
};

// ── Gate 2: hologram room ───────────────────────────────────────────────────────────────────────────────
const HOLO_C = { x: 540, y: 1060 };
const BOX = { L: 790, H: 168, W: 158 };
const project = (x: number, y: number, z: number, yaw: number, pitch: number) => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  const f = 1500 / (1500 + z2);
  return { x: HOLO_C.x + x1 * f, y: HOLO_C.y + y2 * f, z: z2 };
};
const TOKENS: { at: number; icon: PhosphorName; phase: number }[] = [
  { at: T.paid, icon: "coins", phase: 0.4 },
  { at: T.declared, icon: "file-text", phase: 0.4 + Math.PI },
];

const HoloToken: React.FC<{ t: number; tok: (typeof TOKENS)[number] }> = ({ t, tok }) => {
  if (t < tok.at - 0.3) return null;
  const pop = interpolate(t, [tok.at - 0.3, tok.at], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.2)) });
  const a = t * 0.9 + tok.phase;
  const x = HOLO_C.x + 460 * Math.cos(a);
  const y = HOLO_C.y - 20 + 150 * Math.sin(a);
  const depth = 0.85 + 0.2 * Math.sin(a);
  const beam = t > tok.at && t < tok.at + 0.6 ? 1 - (t - tok.at) / 0.6 : 0;
  return (
    <>
      {beam > 0 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <line x1={x} y1={y} x2={HOLO_C.x} y2={HOLO_C.y} stroke={BRAND.amber} strokeWidth={6 * beam} style={{ filter: "drop-shadow(0 0 10px #F5A623)" }} />
        </svg>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: x - 70,
          top: y - 70,
          width: 140,
          height: 140,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          scale: String(pop * depth),
          background: "radial-gradient(circle at 40% 35%, rgba(40,70,120,.95), rgba(8,18,40,.95))",
          border: `3px solid ${BRAND.amber}`,
          boxShadow: `0 0 ${30 + beam * 50}px rgba(245,166,35,.7), inset 0 0 20px rgba(245,166,35,.3)`,
        }}
      >
        <Icon name={tok.icon} size={70} color="#FFF7EF" />
      </div>
    </>
  );
};

const HoloRoom: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const yaw = 0.5 + (t - 10) * 0.32;
  const pitch = -0.32;
  const draw = interpolate(t, [PORT_FLY.open - 0.1, PORT_FLY.open + 0.9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const pulse = TOKENS.reduce((m, k) => Math.max(m, t > k.at && t < k.at + 0.6 ? 1 - (t - k.at) / 0.6 : 0), 0);
  const flick = 0.9 + 0.1 * noise2D("holo", frame * 0.3, 0);
  const { L, H, W } = BOX;
  const corners = [-1, 1].flatMap((sx) => [-1, 1].flatMap((sy) => [-1, 1].map((sz) => [sx * L * 0.5, sy * H * 0.5, sz * W * 0.5] as const)));
  const P = corners.map(([x, y, z]) => project(x, y, z, yaw, pitch));
  const edges: [number, number][] = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if ([0, 1, 2].filter((k) => corners[i][k] !== corners[j][k]).length === 1) edges.push([i, j]);
  const ribs = Array.from({ length: 23 }, (_, i) => -L / 2 + ((i + 1) * L) / 24).flatMap((x) =>
    [-1, 1].map((sz) => [project(x, -H / 2, (sz * W) / 2, yaw, pitch), project(x, H / 2, (sz * W) / 2, yaw, pitch)] as const),
  );
  const scanY = HOLO_C.y - 160 + (((t - 10) * 0.45) % 1) * 320;
  const gridOff = (t * 90) % 80;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(80% 55% at 50% 58%, #0E2550 0%, #071431 50%, #030817 100%)", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: -660,
          top: 980,
          width: 2400,
          height: 1800,
          transformOrigin: "50% 0",
          transform: "perspective(700px) rotateX(72deg)",
          backgroundImage: "linear-gradient(rgba(90,200,255,.28) 2px, transparent 2px), linear-gradient(90deg, rgba(90,200,255,.28) 2px, transparent 2px)",
          backgroundSize: "80px 80px",
          backgroundPosition: `0 ${gridOff}px`,
          maskImage: "linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent)",
          WebkitMaskImage: "linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent)",
        }}
      />
      {/* Rising data motes */}
      {Array.from({ length: 40 }, (_, i) => {
        const x = 120 + hash(i, 61) * 840;
        const y = 1500 - (((hash(i, 62) * 900 + t * (40 + hash(i, 63) * 60)) % 900));
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 4, height: 4, borderRadius: 2, background: "rgba(140,220,255,.7)", boxShadow: "0 0 8px rgba(140,220,255,.9)" }} />;
      })}
      {/* Emitter disc under the hologram */}
      <div style={{ position: "absolute", left: HOLO_C.x - 380, top: HOLO_C.y + 150, width: 760, height: 120, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(245,166,35,.45), rgba(245,166,35,0))" }} />
      <div style={{ position: "absolute", left: HOLO_C.x - 300, top: HOLO_C.y - 260, width: 600, height: 460, background: "linear-gradient(0deg, rgba(245,166,35,.16), rgba(245,166,35,0))", clipPath: "polygon(20% 100%, 80% 100%, 100% 0, 0 0)" }} />
      {TOKENS.map((k, i) => (Math.sin(t * 0.9 + k.phase) < 0 ? <HoloToken key={i} t={t} tok={k} /> : null))}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: flick, filter: `drop-shadow(0 0 ${10 + pulse * 20}px rgba(245,166,35,.9))` }}>
        <polygon
          points={[P[0], P[1], P[3], P[2]].map((p) => `${p.x},${p.y}`).join(" ")}
          fill={`rgba(242,106,31,${0.06 + pulse * 0.15})`}
        />
        <polygon points={[P[4], P[5], P[7], P[6]].map((p) => `${p.x},${p.y}`).join(" ")} fill={`rgba(242,106,31,${0.06 + pulse * 0.15})`} />
        {ribs.map(([a, b], i) => (
          <line key={`r${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(245,166,35,.45)" strokeWidth={1.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        ))}
        {edges.map(([i, j], k) => (
          <line key={`e${k}`} x1={P[i].x} y1={P[i].y} x2={P[j].x} y2={P[j].y} stroke="#FFC46B" strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
        ))}
        {P.map((p, i) => (
          <circle key={`c${i}`} cx={p.x} cy={p.y} r={7 * draw} fill="#FFF0D6" />
        ))}
      </svg>
      {/* Scan line */}
      <div style={{ position: "absolute", left: 120, width: 840, top: scanY, height: 3, background: "linear-gradient(90deg, transparent, rgba(140,220,255,.9), transparent)", boxShadow: "0 0 20px rgba(140,220,255,.9)", opacity: draw }} />
      {TOKENS.map((k, i) => (Math.sin(t * 0.9 + k.phase) >= 0 ? <HoloToken key={`f${i}`} t={t} tok={k} /> : null))}
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 2px, transparent 2px 5px)" }} />
      <Grade top={0.6} bottom={0.75} />
    </AbsoluteFill>
  );
};

// ── Gate 3: the road fork from above ────────────────────────────────────────────────────────────────────
const PATH_GREEN = "M 434 1090 L 434 880 C 434 770 390 700 300 600 S 120 420 -60 320";
const PATH_RED = "M 434 1090 L 434 880 C 440 770 560 700 660 610 S 900 420 1090 320";
const LanePath: React.FC<{ d: string; color: string; on: number; dim: number; t: number }> = ({ d, color, on, dim, t }) => (
  <g opacity={on * dim}>
    <path d={d} fill="none" stroke={color} strokeWidth={120} strokeLinecap="round" opacity={0.28} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - on} style={{ filter: "blur(18px)" }} />
    <path d={d} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - on} />
    <path d={d} fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="0.02 0.05" strokeDashoffset={-t * 0.25} opacity={on > 0.95 ? 0.85 : 0} />
  </g>
);

const RoadRoom: React.FC<{ t: number }> = ({ t }) => {
  const k = prog(t, SPLIT.from, WHIP.cut);
  const drive = interpolate(t, [SPLIT.to - 0.2, 20.6], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const g = interpolate(t, [GREEN_AT, GREEN_AT + 0.7], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const r = interpolate(t, [RED_AT, RED_AT + 0.7], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const gDim = t > RED_AT ? interpolate(t, [RED_AT, RED_AT + 0.4], [1, 0.35], clamp) : 1;
  const lamp = t > RED_AT ? "#ff4b3a" : t > GREEN_AT ? "#36e07f" : "#5b6270";
  const cy = 1150 + 700 * drive + Math.sin(t * 9) * 1.2;
  // whip zoom out of this room into the container
  const wz = interpolate(t, [WHIP.from, WHIP.cut], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const focus = { x: 434 * ROAD.s, y: ROAD.top + 1060 * ROAD.s };
  return (
    <AbsoluteFill style={{ background: "#060B16", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transformOrigin: `${focus.x}px ${focus.y}px`,
          transform: `scale(${(1.02 + 0.06 * k) * (1 + 7 * wz)})`,
          filter: wz > 0.01 ? `blur(${wz * 14}px)` : undefined,
        }}
      >
        <div style={{ position: "absolute", left: 0, top: ROAD.top, width: 1024 * ROAD.s, height: 1536 * ROAD.s }}>
          <Img src={A("road-fork")} style={{ width: "100%", height: "100%", display: "block", filter: "brightness(.82)" }} />
          <svg viewBox="0 0 1024 1536" width="100%" height="100%" style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>
            <LanePath d={PATH_GREEN} color="#36e07f" on={g} dim={gDim} t={t} />
            <LanePath d={PATH_RED} color="#ff4b3a" on={r} dim={1} t={t} />
          </svg>
          {/* Lamp on the island pole */}
          <div style={{ position: "absolute", left: 514 - 34, top: 496 - 34, width: 68, height: 68, borderRadius: "50%", background: `radial-gradient(circle, #fff 0%, ${lamp} 45%, ${lamp}00 72%)`, boxShadow: t > GREEN_AT ? `0 0 80px 30px ${lamp}aa` : "none" }} />
          {/* Our container driving up the left lane, headlights first */}
          <div style={{ position: "absolute", left: 434 - 37, top: cy - 145, width: 74, height: 290 }}>
            <div style={{ position: "absolute", left: -110, top: -330, width: 294, height: 360, background: "radial-gradient(60% 70% at 50% 100%, rgba(255,240,210,.55), rgba(255,240,210,0))", clipPath: "polygon(38% 100%, 62% 100%, 100% 0, 0 0)" }} />
            <Img
              src={A("container-top")}
              style={{ position: "absolute", left: (74 - 290) / 2, top: (290 - 74) / 2, width: 290, height: 74, rotate: "-90deg", filter: "drop-shadow(0 10px 10px rgba(0,0,0,.7))" }}
            />
          </div>
        </div>
      </AbsoluteFill>
      <Grade top={0.92} bottom={0.8} />
      <AbsoluteFill style={{ background: "#FFF3E0", opacity: interpolate(t, [WHIP.cut - 0.12, WHIP.cut], [0, 0.9], clamp) }} />
    </AbsoluteFill>
  );
};

// ── Gate 4: the container doors ─────────────────────────────────────────────────────────────────────────
const DoorsPlate: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const settle = interpolate(t, [WHIP.cut, WHIP.settle], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const push = prog(t, WHIP.cut, DOORS_OPEN.from);
  const stuck = inWin(t, T.stuck, DOORS_OPEN.from);
  const red = stuck ? 0.25 + 0.2 * Math.max(0, Math.sin((t - T.stuck) * 6)) : 0;
  const jx = stuck ? noise2D("door", frame * 0.9, 0) * 3 : 0;
  return (
    <AbsoluteFill style={{ background: "#060B16", overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: "50% 50%", transform: `translateX(${jx}px) scale(${(1.02 + 0.05 * push) * (1 + 0.5 * settle)})`, filter: settle > 0.01 ? `blur(${settle * 12}px)` : undefined }}>
        <Img src={A("container-doors")} style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1672 * DOOR_S, filter: "brightness(.9)" }} />
      </AbsoluteFill>
      <Grade top={0.9} bottom={0.88} />
      <AbsoluteFill style={{ background: "radial-gradient(80% 60% at 50% 55%, rgba(255,40,30,0), rgba(255,40,30,.6))", opacity: red }} />
    </AbsoluteFill>
  );
};

/** The delivery order slides out of the door seam. */
const DeliveryOrder: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  if (t < T.delivery - 0.1 || t > DOORS_OPEN.from) return null;
  const k = interpolate(t, [T.delivery - 0.1, T.delivery + 0.5], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.3)) });
  const gone = t > T.stuck ? interpolate(t, [T.stuck, T.stuck + 0.3], [1, 0], clamp) : 1;
  const jx = t > T.stuck ? noise2D("do", frame, 2) * 30 : 0;
  const x = interpolate(k, [0, 1], [540, 300]) + jx;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 540, height: 1920, overflow: "hidden", opacity: gone }}>
      <div
        style={{
          position: "absolute",
          left: x - 125,
          top: 960 + 40 * k,
          width: 250,
          height: 320,
          rotate: `${-9 * k}deg`,
          borderRadius: 10,
          background: "linear-gradient(180deg, #FFFDF8, #F1E9DD)",
          boxShadow: "0 20px 40px rgba(0,0,0,.5)",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="file-text" size={46} color={BRAND.orange} />
          <div style={{ fontFamily: FONT_CONDENSED, fontSize: 52, lineHeight: 1, color: BRAND.ink }}>DO</div>
        </div>
        <div style={{ height: 6, width: 90, borderRadius: 3, background: BRAND.orange, margin: "16px 0 18px" }} />
        {[1, 0.8, 0.92, 0.6, 0.85, 0.7].map((w, i) => (
          <div key={i} style={{ height: 10, width: `${w * 100}%`, borderRadius: 5, background: "rgba(43,28,21,.18)", marginBottom: 14 }} />
        ))}
      </div>
    </div>
  );
};

/** Stuck: calendar pages tear off and the clock races. */
const StuckProps: React.FC<{ t: number }> = ({ t }) => {
  if (t < 35.0 || t > DOORS_OPEN.from + 0.1) return null;
  const inK = interpolate(t, [35.0, 35.35], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) });
  const out = interpolate(t, [DOORS_OPEN.from - 0.3, DOORS_OPEN.from], [1, 0], clamp);
  const cal = { x: 640, y: 1000, w: 250, h: 270 };
  const tearEvery = 0.32;
  const torn = Math.max(0, Math.floor((t - 35.4) / tearEvery));
  const sheets: React.ReactNode[] = [];
  for (let i = Math.max(0, torn - 4); i <= torn; i++) {
    const d = t - (35.4 + i * tearEvery);
    if (d < 0 || d > 1.3) continue;
    sheets.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: cal.x + 60 * d + 200 * d * d * (hash(i, 71) - 0.3),
          top: cal.y + 40 + 120 * d + 700 * d * d,
          width: cal.w,
          height: cal.h - 40,
          transformOrigin: "50% 0",
          rotate: `${(hash(i, 72) - 0.4) * 160 * d}deg`,
          opacity: 1 - d / 1.3,
          borderRadius: 8,
          background: "#FFFDF8",
          boxShadow: "0 10px 20px rgba(0,0,0,.4)",
        }}
      />,
    );
  }
  const minute = (t - 35) * 720;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out, pointerEvents: "none" }}>
      {/* Calendar pad (no dates: every page is a day) */}
      <div style={{ position: "absolute", left: cal.x, top: cal.y, width: cal.w, height: cal.h, scale: String(inK), transformOrigin: "50% 100%" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: "#FFFDF8", boxShadow: "0 18px 40px rgba(0,0,0,.5)", overflow: "hidden" }}>
          <div style={{ height: 56, background: "linear-gradient(90deg, #C0392B, #FF4B3A)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, padding: 20 }}>
            {Array.from({ length: 28 }, (_, i) => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: i === 27 ? "#FF4B3A" : "rgba(43,28,21,.2)" }} />
            ))}
          </div>
        </div>
        {[46, 124, 202].map((x) => (
          <div key={x} style={{ position: "absolute", left: x - 6, top: -10, width: 12, height: 30, borderRadius: 6, background: "#9aa0a8" }} />
        ))}
      </div>
      {sheets}
      {/* Racing clock */}
      <div style={{ position: "absolute", left: 160, top: 1010, width: 230, height: 230, scale: String(inK) }}>
        <svg viewBox="0 0 230 230" width={230} height={230}>
          <circle cx={115} cy={115} r={108} fill="#FFFDF8" stroke="#FF4B3A" strokeWidth={10} />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <line key={i} x1={115 + Math.cos(a) * 82} y1={115 + Math.sin(a) * 82} x2={115 + Math.cos(a) * 96} y2={115 + Math.sin(a) * 96} stroke="#2B1C15" strokeWidth={i % 3 ? 3 : 6} />;
          })}
          <line x1={115} y1={115} x2={115 + Math.sin((minute / 12) * (Math.PI / 180)) * 52} y2={115 - Math.cos((minute / 12) * (Math.PI / 180)) * 52} stroke="#2B1C15" strokeWidth={9} strokeLinecap="round" />
          <line x1={115} y1={115} x2={115 + Math.sin(minute * (Math.PI / 180)) * 80} y2={115 - Math.cos(minute * (Math.PI / 180)) * 80} stroke="#FF4B3A" strokeWidth={6} strokeLinecap="round" />
          <circle cx={115} cy={115} r={10} fill="#2B1C15" />
        </svg>
      </div>
    </div>
  );
};

/** Gate 4 → 5: the two doors swing open towards the camera, the truck scene is behind them. */
const DoorsRoom: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const k = interpolate(t, [DOORS_OPEN.from, DOORS_OPEN.to], [0, 1], { ...clamp, easing: Easing.bezier(0.55, 0, 0.3, 1) });
  if (k <= 0) return <DoorsPlate t={t} frame={frame} />;
  const half = (side: -1 | 1) => (
    <AbsoluteFill
      style={{
        clipPath: side < 0 ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)",
        transformOrigin: side < 0 ? "0% 50%" : "100% 50%",
        transform: `perspective(1300px) rotateY(${side * -112 * k}deg)`,
        filter: `brightness(${1 - 0.5 * k})`,
      }}
    >
      <DoorsPlate t={t} frame={frame} />
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill>
      {half(-1)}
      {half(1)}
    </AbsoluteFill>
  );
};

// ── Gate 5: the truck leaves through the open gate ──────────────────────────────────────────────────────
const DOOR = { top: -230, left: -100, w: 1280, h: 1920, s: 1.25 };
const truckZoom = (t: number) =>
  interpolate(t, [DOORS_OPEN.from, DOORS_OPEN.to + 0.2], [1.3, 1.04], { ...clamp, easing: Easing.out(Easing.cubic) }) + 0.1 * prog(t, DOORS_OPEN.to, T.white);
const headlight = (t: number, i: 0 | 1) => {
  const px = i === 0 ? 510 : 737;
  const py = 1032;
  const ox = DOOR.left + DOOR.w / 2;
  const oy = DOOR.top + DOOR.h * 0.58;
  const z = truckZoom(t);
  return { x: ox + (DOOR.left + px * DOOR.s - ox) * z, y: oy + (DOOR.top + py * DOOR.s - oy) * z };
};
const TruckRoom: React.FC<{ t: number }> = ({ t }) => {
  const spill = interpolate(t, [DOORS_OPEN.from, DOORS_OPEN.from + 0.25, DOORS_OPEN.to], [0, 0.8, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#050A18", overflow: "hidden" }}>
      <Img
        src={A("delivery-truck-at-gate")}
        style={{ position: "absolute", left: DOOR.left, top: DOOR.top, width: DOOR.w, height: DOOR.h, scale: String(truckZoom(t)), transformOrigin: "50% 58%" }}
      />
      <Grade top={0.9} bottom={0.95} />
      <AbsoluteFill style={{ background: "radial-gradient(30% 60% at 50% 50%, rgba(255,236,200,1), rgba(255,200,120,0))", opacity: spill }} />
    </AbsoluteFill>
  );
};

const Headlights: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.headlights || t > T.white + 0.1) return null;
  const fly = interpolate(t, [T.headlights, T.headlights + 0.55], [0, 1], { ...clamp, easing: ioCubic });
  const split = interpolate(t, [T.headlights + 0.5, T.headlights + 0.8], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.5)) });
  const on = interpolate(t, [T.headlights + 0.75, T.headlights + 0.95], [0, 1], clamp);
  const flare = interpolate(t, [T.flare, T.white], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const L = headlight(t, 0);
  const R = headlight(t, 1);
  const mid = { x: (L.x + R.x) / 2, y: (L.y + R.y) / 2 };
  const flicker = 0.9 + 0.1 * Math.sin(t * 40);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[L, R].map((p, i) => {
        const x = interpolate(split, [0, 1], [interpolate(fly, [0, 1], [GLASS.x, mid.x]), p.x]);
        const y = interpolate(split, [0, 1], [interpolate(fly, [0, 1], [GLASS.y, mid.y]), p.y]) - Math.sin(fly * Math.PI) * 140;
        const r = interpolate(fly, [0, 1], [GLASS.r, 36]) + on * 6 + flare * 900;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: x - r,
                top: y - r,
                width: r * 2,
                height: r * 2,
                borderRadius: "50%",
                background:
                  on > 0
                    ? `radial-gradient(circle, #fff 0%, rgba(255,240,215,${0.95 * flicker}) 25%, rgba(255,190,110,.45) 55%, rgba(255,190,110,0) 72%)`
                    : "radial-gradient(circle at 38% 34%, #FFD08A, #F5A623 40%, #F26A1F 75%)",
                boxShadow: `0 0 ${30 + on * 60}px ${on * 20}px rgba(255,214,150,.6)`,
                opacity: i === 1 ? Math.max(split, 0.001) : 1,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: x - 420 - flare * 1400,
                top: y - 6 - flare * 30,
                width: 840 + flare * 2800,
                height: 12 + flare * 60,
                borderRadius: "50%",
                background: "radial-gradient(closest-side, rgba(255,250,240,.95), rgba(160,200,255,.35) 60%, rgba(160,200,255,0))",
                opacity: on * (0.55 + flare * 0.45),
              }}
            />
          </React.Fragment>
        );
      })}
      <AbsoluteFill style={{ background: "#FFF6EA", opacity: flare }} />
    </AbsoluteFill>
  );
};

const LightToG: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.white || t > T.logo + 0.45) return null;
  const k = interpolate(t, [T.white, T.logo + 0.18], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const r = interpolate(k, [0, 1], [1400, G_LOGO.r]);
  const x = interpolate(k, [0, 1], [540, G_LOGO.x]);
  const y = interpolate(k, [0, 1], [1000, G_LOGO.y]);
  const fade = interpolate(t, [T.logo + 0.1, T.logo + 0.4], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: `radial-gradient(circle, #FFF6EA ${interpolate(k, [0, 1], [70, 0])}%, #F5A623 ${interpolate(k, [0, 1], [85, 45])}%, #F26A1F)`,
        boxShadow: `0 0 120px 40px rgba(245,166,35,${0.6 * fade})`,
        opacity: fade,
      }}
    />
  );
};

const EndScene: React.FC<{ t: number }> = ({ t }) => {
  const d = t - T.white;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(70% 45% at 50% 42%, #14244A 0%, #0A1430 55%, #050A18 100%)" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="e02-end-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={BRAND.red} />
            <stop offset="0.5" stopColor={BRAND.orange} />
            <stop offset="1" stopColor={BRAND.amber} />
          </linearGradient>
        </defs>
        <g transform={`rotate(${d * 10} 540 900)`} opacity={interpolate(d, [0.3, 1.2], [0, 0.4], clamp)}>
          <circle cx={540} cy={900} r={640} fill="none" stroke="url(#e02-end-ring)" strokeWidth={16} strokeDasharray="90 60" />
        </g>
        <g transform={`rotate(${-d * 6} 540 900)`} opacity={interpolate(d, [0.5, 1.4], [0, 0.22], clamp)}>
          <circle cx={540} cy={900} r={700} fill="none" stroke="#FFF7EF" strokeWidth={2} strokeDasharray="4 18" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ── Rooms + transitions ─────────────────────────────────────────────────────────────────────────────────
const Rooms: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const g = GLITCH.find(([a, b]) => inWin(t, a, b));
  const doors = (
    <>
      <DoorsRoom t={t} frame={frame} />
    </>
  );
  // Hologram → road: the frame splits into a green and a red half.
  const splitK = interpolate(t, [SPLIT.from, SPLIT.to], [0, 1], { ...clamp, easing: ioCubic });
  const holoHalf = (side: -1 | 1) => (
    <AbsoluteFill
      key={side}
      style={{
        clipPath: side < 0 ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)",
        translate: `${side * splitK * 600}px 0`,
        rotate: `${side * splitK * 5}deg`,
        scale: String(1 - 0.1 * splitK),
      }}
    >
      <HoloRoom t={t} frame={frame} />
      <AbsoluteFill style={{ background: side < 0 ? "rgba(46,224,127,.4)" : "rgba(255,75,58,.4)", opacity: splitK, mixBlendMode: "screen" }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: side < 0 ? 526 : 540,
          width: 14,
          background: side < 0 ? "#36e07f" : "#ff4b3a",
          boxShadow: `0 0 70px 24px ${side < 0 ? "#36e07f" : "#ff4b3a"}`,
        }}
      />
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill>
      {showing(t, ROOM.truck) ? <TruckRoom t={t} /> : null}
      {showing(t, ROOM.doors) ? (
        g ? (
          <AbsoluteFill>
            {Array.from({ length: 7 }, (_, i) => (
              <AbsoluteFill key={i} style={{ clipPath: `inset(${(i / 7) * 100}% 0 ${100 - ((i + 1) / 7) * 100}% 0)`, translate: `${noise2D("tear", i * 3.1, frame * 0.9) * 70}px 0` }}>
                {doors}
              </AbsoluteFill>
            ))}
          </AbsoluteFill>
        ) : (
          doors
        )
      ) : null}
      {showing(t, ROOM.road) ? <RoadRoom t={t} /> : null}
      {showing(t, ROOM.holo) ? (t >= SPLIT.from ? [holoHalf(-1), holoHalf(1)] : <HoloRoom t={t} frame={frame} />) : null}
      {showing(t, ROOM.stack) ? <StackRoom t={t} /> : null}
      {showing(t, ROOM.hook) ? <HookRoom t={t} frame={frame} /> : null}
    </AbsoluteFill>
  );
};

// ── Atmosphere ──────────────────────────────────────────────────────────────────────────────────────────
const outdoors = (t: number) => !inWin(t, PORT_FLY.peak, SPLIT.from + 0.2) && t < T.white;
const Rain: React.FC<{ t: number }> = ({ t }) => {
  if (!outdoors(t)) return null;
  return (
    <AbsoluteFill style={{ opacity: interpolate(t, [T.flare, T.white], [0.9, 0], clamp), pointerEvents: "none" }}>
      <svg width={1080} height={1920}>
        {Array.from({ length: 70 }, (_, i) => {
          const speed = 1300 + hash(i, 5) * 900;
          const len = 36 + hash(i, 6) * 60;
          const x = hash(i, 7) * 1180 - 50;
          const y = ((hash(i, 8) * 2300 + t * speed) % 2300) - 200;
          return <line key={i} x1={x} y1={y} x2={x - len * 0.12} y2={y + len} stroke="rgba(200,220,255,.22)" strokeWidth={2} strokeLinecap="round" />;
        })}
      </svg>
    </AbsoluteFill>
  );
};
const Bokeh: React.FC<{ t: number }> = ({ t }) => {
  if (!outdoors(t)) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 12 }, (_, i) => {
        const s = 60 + hash(i, 31) * 170;
        const x = hash(i, 32) * 1180 - 50;
        const y = ((((hash(i, 33) * 2600 - t * 26) % 2600) + 2600) % 2600) - 300;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - s / 2,
              top: y - s / 2,
              width: s,
              height: s,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(255,${150 + Math.round(hash(i, 34) * 60)},70,.36), rgba(255,160,70,.1) 55%, rgba(255,160,70,0) 72%)`,
              filter: `blur(${6 + hash(i, 35) * 10}px)`,
              mixBlendMode: "screen",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ── The orange disc: moon → porthole → stamp → headlights → G ───────────────────────────────────────────
const LEVEL_AT = [DIVE1.to, PORT_FLY.open, SPLIT.to, WHIP.cut, DOORS_OPEN.from + 0.45];
const gateNumber = (t: number) => LEVEL_AT.filter((l) => t >= l).length;

const Porthole: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const k = interpolate(t, [3.55, 4.15], [0, 1], { ...clamp, easing: ioCubic });
  const bob = Math.sin(t * 1.4) * 6 * (1 - k);
  const cx = interpolate(k, [0, 1], [MOON.x, GLASS.x]);
  const cy = interpolate(k, [0, 1], [MOON.y, GLASS.y]) + bob;
  const r = interpolate(k, [0, 1], [MOON.r, GLASS.r]);
  const frameIn = interpolate(t, [3.95, 4.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const fly = t >= PORT_FLY.open - 0.05 ? 0 : interpolate(t, [PORT_FLY.from, PORT_FLY.peak], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const back = interpolate(t, [PORT_FLY.open - 0.05, PORT_FLY.open + 0.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) });
  const hidden = inWin(t, PORT_FLY.peak, PORT_FLY.open - 0.05);
  const reenter = t >= PORT_FLY.open - 0.05 && t < PORT_FLY.open + 0.4 ? back : 1;
  const fadeOut = interpolate(t, [T.flare - 0.2, T.flare + 0.1], [1, 0], clamp);
  const n = gateNumber(t);
  const since = t - (LEVEL_AT[n - 1] ?? 0);
  const roll = n > 0 ? interpolate(since, [0, 0.35], [1, 0], { ...clamp, easing: Easing.out(Easing.back(2)) }) : 0;
  const stuck = inWin(t, T.stuck, DOORS_OPEN.from);
  const redFlick = stuck ? (noise2D("pf", frame * 0.5, 0) > -0.1 ? 0.75 : 0.2) : 0;
  if (hidden) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fadeOut,
        transformOrigin: `${GLASS.x}px ${GLASS.y}px`,
        transform: `translate(${(540 - GLASS.x) * fly}px, ${(960 - GLASS.y) * fly}px) scale(${(1 + 19 * fly) * (0.4 + 0.6 * reenter)}) rotate(${(1 - reenter) * -90}deg)`,
      }}
    >
      <div style={{ position: "absolute", left: cx - r * 3, top: cy - r * 3, width: r * 6, height: r * 6, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,140,40,.45), rgba(245,140,40,0) 60%)", opacity: 1 - frameIn * 0.85 }} />
      <Img
        src={A("porthole")}
        style={{
          position: "absolute",
          left: PORT.x,
          top: PORT.y,
          width: PORT.size,
          height: PORT.size,
          opacity: frameIn,
          scale: String(interpolate(frameIn, [0, 1], [1.5, 1])),
          rotate: `${interpolate(frameIn, [0, 1], [-60, 0])}deg`,
          filter: "drop-shadow(0 10px 22px rgba(0,0,0,.6))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: "50%",
          overflow: "hidden",
          background: "radial-gradient(circle at 38% 34%, #FFD08A, #F5A623 38%, #F26A1F 72%, #C0392B)",
          boxShadow: `0 0 ${40 * (1 - k) + 10}px rgba(245,166,35,.6), inset -10px -14px 30px rgba(120,30,10,.45)`,
          opacity: interpolate(t, [4.1, 4.35], [1, 0.85], clamp) + fly * 0.15,
        }}
      >
        {[
          [0.28, 0.58, 0.16],
          [0.62, 0.3, 0.11],
          [0.6, 0.66, 0.08],
        ].map(([x, y, s], i) => (
          <div key={i} style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: `${s * 200}%`, height: `${s * 200}%`, translate: "-50% -50%", borderRadius: "50%", background: "rgba(150,50,15,.28)", opacity: 1 - k }} />
        ))}
        <AbsoluteFill style={{ background: "#ff2a1a", opacity: redFlick, mixBlendMode: "multiply" }} />
        {n > 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", overflow: "hidden", opacity: 1 - fly }}>
            <div style={{ fontFamily: FONT_CONDENSED, fontSize: 104, lineHeight: 1, color: "#2B1C15", translate: `0 ${roll * 120}%` }}>{n}</div>
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          right: 1080 - PORT.x + 18,
          top: GLASS.y - 46,
          fontFamily: FONT_CONDENSED,
          fontSize: 92,
          lineHeight: 1,
          letterSpacing: `${interpolate(frameIn, [0, 1], [0.6, 0.16])}em`,
          color: stuck ? "#ff6b5a" : BRAND.amber,
          opacity: frameIn * (1 - fly),
        }}
      >
        GATE
      </div>
    </div>
  );
};

const Iris: React.FC<{ t: number }> = ({ t }) => {
  if (!inWin(t, PORT_FLY.peak - 0.02, PORT_FLY.open + 0.05)) return null;
  const k = interpolate(t, [PORT_FLY.peak + 0.06, PORT_FLY.open], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const hole = 1150 * k;
  const glare = interpolate(t, [PORT_FLY.peak, PORT_FLY.peak + 0.1], [0.6, 0], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 46% 42%, #FFD08A, #F5A623 30%, #F26A1F 62%, #C0392B)",
          WebkitMaskImage: `radial-gradient(circle at 540px 960px, transparent ${hole}px, #000 ${hole + 2}px)`,
          maskImage: `radial-gradient(circle at 540px 960px, transparent ${hole}px, #000 ${hole + 2}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 540 - hole - 20,
          top: 960 - hole - 20,
          width: (hole + 20) * 2,
          height: (hole + 20) * 2,
          borderRadius: "50%",
          boxShadow: `0 0 80px 30px rgba(255,214,150,${0.8 * (1 - k)}), inset 0 0 60px 20px rgba(255,214,150,${0.6 * (1 - k)})`,
          opacity: k > 0 ? 1 : 0,
        }}
      />
      <AbsoluteFill style={{ background: "#fff", opacity: glare }} />
    </AbsoluteFill>
  );
};

const Stamp: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const t0 = T.sppb - 0.45;
  if (t < t0 || t > T.stuck + 0.3) return null;
  const k = interpolate(t, [t0, T.sppb], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const cx = interpolate(k, [0, 1], [GLASS.x, STAMP_AT.x]);
  const cy = interpolate(k, [0, 1], [GLASS.y, STAMP_AT.y]) - Math.sin(k * Math.PI) * 120;
  const slam = t - T.sppb;
  const size = interpolate(k, [0, 1], [GLASS.r * 2, 250]) * (slam > 0 ? interpolate(slam, [0, 0.12], [1.35, 1], clamp) : 1 + 0.35 * k);
  const ink = interpolate(t, [T.sppb - 0.1, T.sppb + 0.05], [0, 1], clamp);
  const glitch = t > T.stuck ? interpolate(t, [T.stuck, T.stuck + 0.3], [1, 0], clamp) : 1;
  const jx = t > T.stuck ? noise2D("sg", frame, 0) * 30 : 0;
  return (
    <div style={{ position: "absolute", left: cx - size / 2 + jx, top: cy - size / 2, width: size, height: size, rotate: `${interpolate(k, [0, 1], [0, -14])}deg`, opacity: glitch }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 38% 34%, #FFD08A, #F5A623 40%, #F26A1F 75%)", opacity: 1 - ink, boxShadow: "0 0 30px rgba(245,166,35,.7)" }} />
      <svg viewBox="0 0 250 250" width={size} height={size} style={{ position: "absolute", inset: 0, opacity: ink * 0.94 }}>
        <circle cx={125} cy={125} r={112} fill="rgba(255,247,239,.82)" />
        <circle cx={125} cy={125} r={116} fill="none" stroke="#1E50D8" strokeWidth={10} />
        <circle cx={125} cy={125} r={100} fill="none" stroke="#1E50D8" strokeWidth={3} />
        <circle cx={125} cy={125} r={70} fill="none" stroke="#1E50D8" strokeWidth={3} />
        <text x={125} y={143} textAnchor="middle" fontFamily={FONT_CONDENSED} fontSize={54} fill="#1E50D8" letterSpacing={1}>
          RELEASED
        </text>
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <circle key={i} cx={125 + Math.cos(a) * 85} cy={125 + Math.sin(a) * 85} r={3.2} fill="#1E50D8" />;
        })}
      </svg>
    </div>
  );
};

const StampWave: React.FC<{ t: number }> = ({ t }) => {
  const d = t - T.sppb;
  if (d < 0 || d > 1.1) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[0, 0.1, 0.2].map((lag, i) => {
        const k = Math.max(0, Math.min(1, (d - lag) / 0.9));
        if (k <= 0) return null;
        const r = 130 + 1500 * (1 - Math.pow(1 - k, 3));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: STAMP_AT.x - r,
              top: STAMP_AT.y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              border: `${10 - i * 3}px solid ${i === 1 ? "rgba(255,247,239,.8)" : "rgba(30,80,216,.85)"}`,
              opacity: 1 - k,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// ── Stuck: the screen cracks ────────────────────────────────────────────────────────────────────────────
const CRACK_O = { x: 742, y: 880 };
const CRACKS: string[] = Array.from({ length: 11 }, (_, i) => {
  let a = (i / 11) * Math.PI * 2 + hash(i, 51) * 0.4;
  let x = CRACK_O.x;
  let y = CRACK_O.y;
  const pts = [`${x},${y}`];
  const segs = 5 + Math.floor(hash(i, 52) * 4);
  for (let s = 0; s < segs; s++) {
    a += (hash(i * 10 + s, 53) - 0.5) * 0.7;
    const len = 60 + hash(i * 10 + s, 54) * 150;
    x += Math.cos(a) * len;
    y += Math.sin(a) * len;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
});
const CRACK_RINGS = [70, 150, 250].map((r, i) =>
  Array.from({ length: 12 }, (_, j) => {
    const a = (j / 11) * Math.PI * 2 * 0.8 + i;
    const rr = r * (0.85 + hash(j + i * 20, 55) * 0.3);
    return `${(CRACK_O.x + Math.cos(a) * rr).toFixed(1)},${(CRACK_O.y + Math.sin(a) * rr).toFixed(1)}`;
  }).join(" "),
);
const Cracks: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.stuck || t > DOORS_OPEN.from + 0.1) return null;
  const draw = interpolate(t, [34.02, 34.3, 35.3, 35.5], [0, 0.55, 0.55, 1], clamp);
  const fade = interpolate(t, [DOORS_OPEN.from - 0.4, DOORS_OPEN.from], [1, 0], clamp);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: fade, pointerEvents: "none" }}>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[...CRACKS, ...CRACK_RINGS].map((p, i) => (
          <React.Fragment key={i}>
            <polyline points={p} stroke="rgba(0,0,0,.55)" strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} transform="translate(3 3)" />
            <polyline points={p} stroke="rgba(235,245,255,.85)" strokeWidth={i < CRACKS.length ? 3 : 2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} style={{ filter: "drop-shadow(0 0 6px rgba(200,225,255,.9))" }} />
          </React.Fragment>
        ))}
      </g>
      <circle cx={CRACK_O.x} cy={CRACK_O.y} r={26 * draw} fill="rgba(235,245,255,.5)" />
    </svg>
  );
};

// ── Depth gauge ─────────────────────────────────────────────────────────────────────────────────────────
const gaugeValue = (t: number) =>
  interpolate(
    t,
    [DIVE1.from, DIVE1.to, PORT_FLY.from, PORT_FLY.open, SPLIT.from, SPLIT.to, WHIP.from, WHIP.cut, DOORS_OPEN.from, DOORS_OPEN.to],
    [0, 1, 1, 2, 2, 3, 3, 4, 4, 5],
    clamp,
  );
const DepthGauge: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const appear = interpolate(t, [3.9, 4.4], [0, 1], { ...clamp, easing: ioCubic });
  const fade = interpolate(t, [T.flare - 0.3, T.flare], [1, 0], clamp);
  if (appear <= 0 || fade <= 0) return null;
  const v = gaugeValue(t);
  const yAt = (n: number) => GAUGE.top + (n - 1) * GAUGE.step;
  const fillTo = v >= 1 ? yAt(v) : GAUGE.top;
  const stuck = inWin(t, T.stuck, DOORS_OPEN.from);
  const trackH = GAUGE.step * 4 * appear;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: GAUGE.x - 1.5, top: GAUGE.top, width: 3, height: trackH, borderRadius: 2, background: "rgba(255,255,255,.18)" }} />
      <div style={{ position: "absolute", left: GAUGE.x - 3, top: GAUGE.top, width: 6, height: Math.min(trackH, fillTo - GAUGE.top), borderRadius: 3, background: `linear-gradient(180deg, ${BRAND.amber}, ${BRAND.orange})`, boxShadow: "0 0 18px rgba(242,106,31,.8)" }} />
      {[1, 2, 3, 4, 5].map((n) => {
        const y = yAt(n);
        if (y > GAUGE.top + trackH + 1) return null;
        const reached = v >= n - 0.001;
        const since = t - (LEVEL_AT[n - 1] ?? 999);
        const pulse = since >= 0 && since < 0.7 ? since / 0.7 : -1;
        const red = stuck && n === 4 && Math.sin(frame * 0.8) > 0;
        const col = red ? "#ff4b3a" : BRAND.orange;
        return (
          <React.Fragment key={n}>
            <div style={{ position: "absolute", left: GAUGE.x - 12, top: y - 12, width: 24, height: 24, borderRadius: "50%", border: `3px solid ${reached ? col : "rgba(255,255,255,.35)"}`, background: reached ? col : "rgba(5,10,24,.8)", boxShadow: reached ? `0 0 18px ${col}` : "none" }} />
            {pulse >= 0 ? (
              <div style={{ position: "absolute", left: GAUGE.x - 12 - pulse * 30, top: y - 12 - pulse * 30, width: 24 + pulse * 60, height: 24 + pulse * 60, borderRadius: "50%", border: `2px solid ${BRAND.amber}`, opacity: 1 - pulse }} />
            ) : null}
            <div style={{ position: "absolute", right: 1080 - GAUGE.x + 24, top: y - 16, fontFamily: FONT_CONDENSED, fontSize: 32, lineHeight: 1, color: reached ? "#FFF7EF" : "rgba(255,255,255,.4)" }}>{n}</div>
          </React.Fragment>
        );
      })}
      {v >= 1 ? <div style={{ position: "absolute", left: GAUGE.x - 9, top: fillTo - 9, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: `0 0 20px 6px ${BRAND.amber}` }} /> : null}
    </div>
  );
};

// ── Headlines ───────────────────────────────────────────────────────────────────────────────────────────
const HEADS: { from: number; to: number; parts: { text: string; color?: string }[] }[] = [
  { from: 4.4, to: 9.3, parts: [{ text: "UNLOADED" }] },
  { from: 10.5, to: 18.4, parts: [{ text: "PAY " }, { text: "+", color: BRAND.orange }, { text: " DECLARE" }] },
  { from: 19.4, to: 27.5, parts: [{ text: "GREEN", color: "#3ee08a" }, { text: " OR " }, { text: "RED", color: "#ff5a48" }] },
  { from: 28.5, to: T.stuck, parts: [{ text: "RELEASE " }, { text: "+", color: BRAND.orange }, { text: " DO" }] },
  { from: 39.9, to: 47.4, parts: [{ text: "DOOR TO DOOR" }] },
];
const Headline: React.FC<{ t: number }> = ({ t }) => {
  const h = HEADS.find((x) => t >= x.from && t < x.to + 0.4);
  if (!h) return null;
  const inK = interpolate(t, [h.from, h.from + 0.5], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const outK = interpolate(t, [h.to, h.to + 0.32], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const rule = interpolate(t, [h.from + 0.2, h.from + 0.7], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <>
      <div style={{ position: "absolute", left: 80, top: 430, width: 920, height: 170, overflow: "hidden" }}>
        <div
          style={{
            fontFamily: FONT_CONDENSED,
            fontSize: 168,
            lineHeight: 1,
            color: "#FFF7EF",
            whiteSpace: "nowrap",
            translate: `0 ${(inK + outK * 1.2) * 105}%`,
            scale: `1 ${1 + inK * 0.25}`,
            transformOrigin: "50% 100%",
            filter: `blur(${(inK + outK) * 10}px)`,
            textShadow: "0 10px 40px rgba(0,0,0,.55)",
          }}
        >
          {h.parts.map((p, i) => (
            <span key={i} style={{ color: p.color }}>
              {p.text}
            </span>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 84, top: 616, width: 300, height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${BRAND.orange}, ${BRAND.amber})`, transformOrigin: "0 50%", scale: `${rule * (1 - outK)} 1` }} />
    </>
  );
};

// ── Episode ─────────────────────────────────────────────────────────────────────────────────────────────
export const E02GateByGate: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const stackLands = STACK.filter((b) => !b.hero).map((b) => b.at + 0.36);
  const hits = [T.land0, DIVE1.cut, T.stacked, PORT_FLY.open, SPLIT.to, WHIP.cut, T.sppb, 34.05, 35.32, 36.37, DOORS_OPEN.from + 0.1, T.white].map(sec);
  const sfx: SfxCue[] = [
    { at: 0, name: "whoosh", volume: 0.45 },
    { at: sec(T.land0), name: "boom", volume: 0.8 },
    { at: sec(DIVE1.open), name: "crunch", volume: 0.35 },
    { at: sec(DIVE1.from), name: "whoosh", volume: 0.5 },
    { at: sec(DIVE1.cut), name: "boom", volume: 0.45 },
    ...stackLands.map((s) => ({ at: sec(s), name: "tick", volume: 0.22 })),
    { at: sec(T.stacked), name: "boom", volume: 0.55 },
    { at: sec(PORT_FLY.from), name: "whoosh", volume: 0.55 },
    { at: sec(PORT_FLY.peak), name: "glitch", volume: 0.25 },
    { at: sec(T.paid), name: "tick", volume: 0.4 },
    { at: sec(T.declared), name: "tick", volume: 0.4 },
    { at: sec(SPLIT.from), name: "whoosh", volume: 0.55 },
    { at: sec(SPLIT.to), name: "boom", volume: 0.4 },
    { at: sec(GREEN_AT), name: "tick", volume: 0.4 },
    { at: sec(RED_AT), name: "tick", volume: 0.4 },
    { at: sec(WHIP.from), name: "whoosh", volume: 0.6 },
    { at: sec(WHIP.cut), name: "boom", volume: 0.5 },
    { at: sec(T.sppb), name: "stamp", volume: 0.75 },
    { at: sec(T.delivery), name: "whoosh", volume: 0.3 },
    { at: sec(T.stuck), name: "glitch", volume: 0.7 },
    { at: sec(34.05), name: "crunch", volume: 0.6 },
    { at: sec(35.32), name: "glitch", volume: 0.4 },
    { at: sec(35.32), name: "boom", volume: 0.4 },
    { at: sec(36.37), name: "boom", volume: 0.4 },
    ...Array.from({ length: 10 }, (_, i) => ({ at: sec(35.4 + i * 0.32), name: "tick", volume: 0.18 })),
    { at: sec(DOORS_OPEN.from), name: "crunch", volume: 0.55 },
    { at: sec(DOORS_OPEN.from + 0.1), name: "whoosh", volume: 0.6 },
    ...[41.22, 42.11, 43.45].map((s) => ({ at: sec(s), name: "tick", volume: 0.35 })),
    { at: sec(T.headlights), name: "whoosh", volume: 0.35 },
    { at: sec(T.headlights + 0.8), name: "tick", volume: 0.4 },
    { at: sec(T.flare), name: "whoosh", volume: 0.5 },
    { at: sec(T.logo + 0.1), name: "sonic-logo", volume: 0.8 },
  ];

  return (
    <AbsoluteFill style={{ background: "#050A18" }}>
      <Shake hits={hits} amount={18}>
        <Rooms t={t} frame={frame} />
        <Bokeh t={t} />
        {t < T.white ? <Headline t={t} /> : null}
        {t < PORT_FLY.from && t < DIVE1.from ? (
          <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 700, overflow: "hidden" }}>
            <Cable dy={hookDy(t) + bounce(t).y} />
          </div>
        ) : null}
        <Rain t={t} />
      </Shake>
      <Flash hits={[sec(T.land0), sec(DIVE1.cut)]} color="#FFD9A8" peak={0.5} />

      <Cracks t={t} />
      <StuckProps t={t} />
      <DeliveryOrder t={t} frame={frame} />
      <StampWave t={t} />
      <Stamp t={t} frame={frame} />
      <DepthGauge t={t} frame={frame} />
      <Porthole t={t} frame={frame} />
      <Iris t={t} />
      <Chip t={t} at={T.stacked} out={9.25} top={1448} icon="stack" tag="STACKED" text="Port's temporary storage" />
      <Chip t={t} at={T.sppb} out={33.6} top={1448} icon="seal-check" tag="CUSTOMS" text="Release approval (SPPB)" />
      <Chip t={t} at={T.delivery} out={33.6} top={1584} icon="file-text" tag="SHIPPING LINE" text="Delivery order (DO)" />

      <HfOverlay clip="e02-hook" from={0} durationInFrames={sec(4)} fallback={null} />
      <HfOverlay clip="e02-pib" from={sec(10)} durationInFrames={sec(9)} fallback={null} />
      <HfOverlay clip="e02-lanes" from={sec(19)} durationInFrames={sec(9)} fallback={null} />
      <HfOverlay clip="e02-stuck" from={sec(T.stuck)} durationInFrames={sec(5)} fallback={null} />
      <HfOverlay clip="e02-door" from={sec(39)} durationInFrames={sec(9)} fallback={null} />

      <Headlights t={t} />
      {t >= T.white ? <EndScene t={t} /> : null}
      <LightToG t={t} />
      <HfOverlay clip="e02-logo" from={sec(T.logo)} durationInFrames={sec(ep.dur - T.logo)} fallback={null} />

      <Captions beats={beats} accent={BRAND.orange} ep="e02" theme="dark" />
      <BrandFrame theme="dark" align="left" endCardFrom={sec(T.white)} />
      <SoundLayer ep="e02" sfx={sfx} />
    </AbsoluteFill>
  );
};
