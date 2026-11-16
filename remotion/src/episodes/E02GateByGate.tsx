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
 * Night port seen from above. A container hangs from a crane cable and is lowered through five gates; at each
 * one it lands on a closed barrier arm with a hard stop, a springy bounce and a shock ring.
 *
 * One orange disc carries the story (morph chain):
 *   moon (hook) → porthole glass, the gate counter (gate 1) → SPPB customs stamp (gate 4)
 *   → the truck's headlights (gate 5) → the G of the UGC logo (end card).
 *
 * Every gate change uses a different move, so the fall never repeats itself:
 *   0→1 dolly-zoom dive with a camera roll · 1→2 the camera flies through the porthole glass (iris)
 *   2→3 the frame splits into a green and a red lane · 3→4 tilted 3D dive
 *   stuck: the screen cracks and tears · 4→5 a giant barrier swings at the camera · 5→end headlight whiteout.
 *
 * R (Remotion): world, camera, gates, container, disc morphs, transitions, depth gauge, headlines,
 *   gate 1 + gate 4 chips, gate 5 scene, end card backdrop, captions, brand frame, audio.
 * H (HyperFrames): e02-hook, e02-pib, e02-lanes, e02-stuck, e02-door, e02-logo.
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
  sppb: wordAt(4, "SPPB"),
  delivery: wordAt(4, "delivery"),
  stuck: 34,
  sweep: 39, // giant barrier swings in gate five
  headlights: 44.6, // the disc flies into the truck's headlights
  flare: 47.65, // headlights flare to white
  white: 48.12, // full white; the end card is behind it
  logo: 48.3,
};
/** Gate changes. */
const DIVE1 = { open: 3.5, from: 3.62, to: 4.12 }; // dolly-zoom dive
const PORT_FLY = { from: 9.5, peak: 9.92, open: 10.28, land: 10.4 }; // through the porthole glass
const SPLIT = { open: 18.6, from: 18.7, to: 19.15, drop: 18.85, land: 19.4 }; // green / red lane split
const DIVE4 = { open: 27.75, from: 27.9, to: 28.4 }; // tilted dive
const LANDS = [T.land0, DIVE1.to, PORT_FLY.land, SPLIT.land, DIVE4.to];
const DROPS = [
  { from: 0, to: T.land0 },
  { from: PORT_FLY.peak, to: PORT_FLY.land },
  { from: SPLIT.drop, to: SPLIT.land },
];
const GREEN_AT = 21.78;
const RED_AT = 24.16;
const GLITCH = [
  [34.0, 34.38],
  [35.3, 35.5],
  [36.35, 36.55],
];

// ── Geometry (1080×1920) ────────────────────────────────────────────────────────────────────────────────
const SPACING = 1700;
const GATE_Y = 1390;
const ARM_S = 0.6; // gate-arm.png 1963×570, pivot (330,163), bar y 123–204, post x 30–300
const ARM_LEFT = 2;
const PIVOT = { x: 330, y: 163 };
const BAR_CUT = 372;
const CONT_W = 500; // falling-container.png 1071×1266, body bottom y 1259
const CONT_S = CONT_W / 1071;
const CONT_X = 600;
const CONT_BOTTOM = GATE_Y - (PIVOT.y - 123) * ARM_S;
const CONT_TOP = CONT_BOTTOM - 1259 * CONT_S;
const PORT = { x: 800, y: 205, size: 200 }; // porthole gate counter, top right (the logo sits top left)
const GLASS = { x: PORT.x + PORT.size * 0.49, y: PORT.y + PORT.size * 0.5, r: PORT.size * 0.31 };
const MOON = { x: 900, y: 770, r: 100 };
const STAMP_AT = { x: CONT_X + 20, y: CONT_BOTTOM - 150 };
const G_LOGO = { x: 436, y: 777, r: 124 }; // the G inside hyperframes/e02-logo
const GAUGE = { x: 1018, top: 560, step: 170 };

// ── Deterministic helpers ───────────────────────────────────────────────────────────────────────────────
const hash = (i: number, salt = 0) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const easeIn = (p: number) => p * p;
const prog = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const inWin = (t: number, a: number, b: number) => t >= a && t < b;

/** Camera depth in gates (0 = hook gate … 4 = gate four). Jumps happen behind the porthole and split moves. */
const camLevel = (t: number) => {
  if (t < DIVE1.from) return 0;
  if (t < DIVE1.to) return easeIn(prog(t, DIVE1.from, DIVE1.to));
  if (t < PORT_FLY.peak) return 1;
  if (t < SPLIT.from) return 2;
  if (t < DIVE4.from) return 3;
  if (t < DIVE4.to) return 3 + easeIn(prog(t, DIVE4.from, DIVE4.to));
  return 4;
};
/** Container screen offset: drop-ins from above, plus the lead it takes during a dive. */
const contDy = (t: number) => {
  for (const d of DROPS) if (inWin(t, d.from, d.to)) return -1100 * (1 - easeIn(prog(t, d.from, d.to)));
  for (const d of [DIVE1, DIVE4]) if (inWin(t, d.from, d.to)) return Math.sin(Math.PI * prog(t, d.from, d.to)) * 90;
  return 0;
};
const diveK = (t: number, d: { from: number; to: number }) => (inWin(t, d.from, d.to) ? Math.sin(Math.PI * prog(t, d.from, d.to)) : 0);
const bounce = (t: number) => {
  let y = 0;
  let squash = 0;
  for (const l of LANDS) {
    const d = t - l;
    if (d >= 0 && d < 1.2) {
      y = -34 * Math.exp(-5.5 * d) * Math.abs(Math.sin(d * 14));
      squash = Math.exp(-14 * d) * Math.cos(d * 30);
    }
  }
  return { y, squash };
};

// ── Icons and chips (match the hyperframes/e02-* chips) ─────────────────────────────────────────────────
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

// ── World (one render of the yard at a given camera depth) ──────────────────────────────────────────────
const Yard: React.FC<{ t: number; frame: number; cam: number }> = ({ t, frame, cam }) => {
  const h = 1620;
  const off = cam * SPACING * 0.45 + t * 10;
  const first = Math.floor(off / h);
  let flick = 0;
  for (const l of LANDS) {
    const d = t - l;
    if (d >= 0 && d < 0.45) flick = Math.max(flick, hash(frame, 7) > 0.45 ? 0.35 * (1 - d / 0.45) : 0);
  }
  const stuckPulse = inWin(t, T.stuck, T.sweep) ? 0.2 + 0.2 * Math.max(0, Math.sin((t - T.stuck) * 6)) : 0;
  return (
    <AbsoluteFill style={{ background: "#050A18", overflow: "hidden" }}>
      {[0, 1, 2].map((k) => {
        const i = first + k;
        return (
          <Img
            key={i}
            src={A("background-plate")}
            style={{ position: "absolute", left: 0, top: i * h - off, width: 1080, height: h, transform: i % 2 ? "scaleY(-1)" : undefined }}
          />
        );
      })}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,9,24,.86) 0%, rgba(5,12,30,.55) 34%, rgba(5,12,30,.42) 60%, rgba(4,9,24,.82) 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(70% 50% at 50% 55%, rgba(0,0,0,0) 40%, rgba(2,5,14,.65) 100%)" }} />
      <AbsoluteFill
        style={{
          background: "radial-gradient(60% 40% at 50% 70%, rgba(46,204,113,.38), rgba(46,204,113,0) 70%)",
          opacity: interpolate(t, [GREEN_AT, GREEN_AT + 0.2, RED_AT - 0.1, RED_AT + 0.05], [0, 1, 1, 0], clamp),
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(60% 40% at 50% 70%, rgba(255,59,48,.4), rgba(255,59,48,0) 70%)",
          opacity: interpolate(t, [RED_AT, RED_AT + 0.2, 27.4, 27.7], [0, 1, 1, 0], clamp),
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(80% 60% at 50% 60%, rgba(255,40,30,0), rgba(255,40,30,.55))", opacity: stuckPulse }} />
      <AbsoluteFill style={{ background: "#000", opacity: flick }} />
    </AbsoluteFill>
  );
};

const gateOpenAt = [DIVE1.open, PORT_FLY.from, SPLIT.open, DIVE4.open];

const Gate: React.FC<{ level: number; t: number; frame: number; cam: number }> = ({ level, t, frame, cam }) => {
  const y = GATE_Y + (level - cam) * SPACING;
  if (y < -1300 || y > 2400) return null;
  const open = gateOpenAt[level];
  let angle = open === undefined ? 0 : interpolate(t, [open, open + 0.38], [0, -84], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  const dl = t - LANDS[level];
  if (dl >= 0 && dl < 1) angle += 4 * Math.exp(-6 * dl) * Math.cos(dl * 22);
  if (level === 4) {
    angle += interpolate(t, [34.1, 34.3, 34.45, 35.6, 35.8, 35.95], [0, -11, 0, 0, -14, 0], clamp);
    if (inWin(t, T.stuck, T.sweep)) angle += noise2D("jam", frame * 0.8, 0) * 1.2;
  }
  const w = 1963 * ARM_S;
  const h = 570 * ARM_S;
  const top = y - PIVOT.y * ARM_S;
  const lampOn = level === 3 ? (t > RED_AT ? "red" : t > GREEN_AT ? "green" : null) : null;
  const stuckLamp = level === 4 && inWin(t, T.stuck, T.sweep) && Math.sin((t - T.stuck) * 12) > 0;
  const shadow = "drop-shadow(0 18px 18px rgba(0,0,0,.5))";
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: ARM_LEFT,
          top,
          width: w,
          height: h,
          clipPath: `inset(0 0 0 ${BAR_CUT * ARM_S}px)`,
          transformOrigin: `${PIVOT.x * ARM_S}px ${PIVOT.y * ARM_S}px`,
          rotate: `${angle}deg`,
        }}
      >
        <Img src={A("gate-arm")} style={{ width: w, height: h, display: "block", filter: shadow }} />
      </div>
      <div style={{ position: "absolute", left: ARM_LEFT, top, width: BAR_CUT * ARM_S, height: h, overflow: "hidden" }}>
        <Img src={A("gate-arm")} style={{ width: w, height: h, display: "block", filter: shadow }} />
      </div>
      {level === 3 ? (
        <div style={{ position: "absolute", left: 52, top: top - 214, width: 104, height: 206 }}>
          <div style={{ position: "absolute", left: 44, top: 180, width: 16, height: 40, background: "#2a2f38" }} />
          <div
            style={{
              position: "absolute",
              inset: "0 0 26px 0",
              borderRadius: 26,
              background: "linear-gradient(180deg,#2b313b,#171b22)",
              border: "2px solid rgba(255,255,255,.12)",
              boxShadow: "0 10px 24px rgba(0,0,0,.5)",
            }}
          />
          {(["green", "red"] as const).map((c, i) => {
            const on = lampOn === c;
            const col = c === "green" ? "#36e07f" : "#ff4b3a";
            return (
              <div
                key={c}
                style={{
                  position: "absolute",
                  left: 20,
                  top: 16 + i * 84,
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: on ? `radial-gradient(circle at 40% 35%, #fff, ${col} 45%, ${col})` : "#0d1015",
                  boxShadow: on ? `0 0 40px 12px ${col}, 0 0 120px 30px ${col}66` : "inset 0 3px 8px rgba(0,0,0,.8)",
                }}
              />
            );
          })}
        </div>
      ) : null}
      {level === 4 ? (
        <div
          style={{
            position: "absolute",
            left: 74,
            top: top - 54,
            width: 60,
            height: 56,
            borderRadius: "30px 30px 6px 6px",
            background: stuckLamp ? "radial-gradient(circle at 50% 40%, #fff, #ff4b3a 50%)" : "#3a1a14",
            boxShadow: stuckLamp ? "0 0 50px 18px rgba(255,75,58,.8)" : "none",
          }}
        />
      ) : null}
    </>
  );
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

const Container: React.FC<{ t: number; frame: number; dy: number }> = ({ t, frame, dy }) => {
  const { y: by, squash } = bounce(t);
  const rattle = inWin(t, T.stuck, T.sweep) ? noise2D("rattle", frame * 0.9, 1) * 5 : 0;
  const y = dy + by;
  return (
    <>
      <Cable dy={y} />
      <Img
        src={A("falling-container")}
        style={{
          position: "absolute",
          left: CONT_X - CONT_W / 2 + rattle,
          top: CONT_TOP + y,
          width: CONT_W,
          transformOrigin: "50% 100%",
          scale: `${1 + squash * 0.04} ${1 - squash * 0.06}`,
          filter: "drop-shadow(0 30px 30px rgba(0,0,0,.6)) brightness(1.05)",
        }}
      />
    </>
  );
};

/** Landing effects on the bar: dust, a flat shock ring, and rain splashing on the bar while it rests. */
const Impact: React.FC<{ t: number; cam: number }> = ({ t, cam }) => {
  const parts: React.ReactNode[] = [];
  LANDS.forEach((l, li) => {
    const d = t - l;
    if (d < 0 || d > 0.9) return;
    const rw = 1100 * (1 - Math.exp(-4 * d));
    parts.push(
      <div
        key={`ring-${li}`}
        style={{
          position: "absolute",
          left: CONT_X - rw / 2,
          top: CONT_BOTTOM - rw * 0.08,
          width: rw,
          height: rw * 0.16,
          borderRadius: "50%",
          border: `${5 * (1 - d)}px solid rgba(255,206,150,${0.9 * (1 - d / 0.9)})`,
          boxShadow: `0 0 30px rgba(245,166,35,${0.7 * (1 - d / 0.9)}), inset 0 0 30px rgba(245,166,35,${0.5 * (1 - d / 0.9)})`,
        }}
      />,
    );
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 1 : -1;
      const vx = side * (160 + hash(i, li) * 420);
      const vy = -(60 + hash(i, li + 9) * 260);
      const x = CONT_X + side * (CONT_W / 2 - 30) + vx * d;
      const y = CONT_BOTTOM + vy * d + 520 * d * d;
      const s = 14 + hash(i, li + 3) * 34;
      parts.push(
        <div
          key={`${li}-${i}`}
          style={{
            position: "absolute",
            left: x - s / 2,
            top: y - s / 2,
            width: s * (1 + d),
            height: s * (1 + d),
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(235,215,190,.55), rgba(235,215,190,0) 70%)",
            opacity: 1 - d / 0.9,
          }}
        />,
      );
    }
  });
  if (Math.abs(cam - Math.round(cam)) < 0.001) {
    for (let i = 0; i < 12; i++) {
      const period = 0.5 + hash(i, 21) * 0.5;
      const ph = ((t + hash(i, 22) * period) % period) / period;
      if (ph > 0.45) continue;
      const k = ph / 0.45;
      const x = 380 + hash(i, 23 + Math.floor((t + hash(i, 22) * period) / period)) * 680;
      const w = 34 * k;
      parts.push(
        <div
          key={`sp-${i}`}
          style={{
            position: "absolute",
            left: x - w / 2,
            top: GATE_Y - 26 - w * 0.15,
            width: w,
            height: w * 0.3,
            borderRadius: "50%",
            border: "2px solid rgba(220,235,255,.6)",
            opacity: 1 - k,
          }}
        />,
      );
    }
  }
  return <>{parts}</>;
};

const World: React.FC<{ t: number; frame: number; cam: number; dy: number }> = ({ t, frame, cam, dy }) => (
  <AbsoluteFill>
    <Yard t={t} frame={frame} cam={cam} />
    {[0, 1, 2, 3, 4].map((lv) => (
      <Gate key={lv} level={lv} t={t} frame={frame} cam={cam} />
    ))}
    <Container t={t} frame={frame} dy={dy} />
    <Impact t={t} cam={cam} />
  </AbsoluteFill>
);

/** The world with this beat's camera move: dives, lane split and glitch tears. */
const WorldStack: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const cam = camLevel(t);
  const dy = contDy(t);
  // Lane split: the gate-two frame splits into a green and a red half that slide apart over gate three.
  if (inWin(t, SPLIT.from, SPLIT.to + 0.05)) {
    const k = interpolate(t, [SPLIT.from, SPLIT.to], [0, 1], { ...clamp, easing: ioCubic });
    const half = (side: -1 | 1) => (
      <AbsoluteFill
        style={{
          clipPath: side < 0 ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)",
          translate: `${side * k * 580}px 0`,
          rotate: `${side * k * 4}deg`,
          scale: String(1 - 0.08 * k),
        }}
      >
        <World t={t} frame={frame} cam={2} dy={0} />
        <AbsoluteFill style={{ background: side < 0 ? "rgba(46,224,127,.38)" : "rgba(255,75,58,.38)", opacity: k, mixBlendMode: "screen" }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: side < 0 ? 528 : 540,
            width: 12,
            background: side < 0 ? "#36e07f" : "#ff4b3a",
            boxShadow: `0 0 60px 20px ${side < 0 ? "#36e07f" : "#ff4b3a"}`,
          }}
        />
      </AbsoluteFill>
    );
    return (
      <AbsoluteFill>
        <World t={t} frame={frame} cam={3} dy={dy} />
        {half(-1)}
        {half(1)}
      </AbsoluteFill>
    );
  }
  // Glitch tears while the gate is stuck.
  const g = GLITCH.find(([a, b]) => inWin(t, a, b));
  if (g) {
    const strips = 7;
    return (
      <AbsoluteFill>
        {Array.from({ length: strips }, (_, i) => {
          const x = noise2D("tear", i * 3.1, frame * 0.9) * 70;
          return (
            <AbsoluteFill key={i} style={{ clipPath: `inset(${(i / strips) * 100}% 0 ${100 - ((i + 1) / strips) * 100}% 0)`, translate: `${x}px 0` }}>
              <World t={t} frame={frame} cam={cam} dy={dy} />
            </AbsoluteFill>
          );
        })}
        <AbsoluteFill style={{ background: "rgba(255,40,40,.18)", mixBlendMode: "screen", translate: "14px 0" }} />
      </AbsoluteFill>
    );
  }
  // Dives: dolly zoom + roll into gate one, a tilted 3D dive into gate four.
  const k1 = diveK(t, DIVE1);
  const k4 = diveK(t, DIVE4);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: "50% 62%",
        transform: `perspective(1400px) rotateX(${k4 * 30}deg) rotateZ(${k1 * 7 - k4 * 3}deg) scale(${1 + 0.32 * k1 + 0.12 * k4})`,
      }}
    >
      <World t={t} frame={frame} cam={cam} dy={dy} />
    </AbsoluteFill>
  );
};

// ── Atmosphere and depth ────────────────────────────────────────────────────────────────────────────────
const Beams: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
    {[
      { x: 150, r: 18, s: 0.35, o: 0.16 },
      { x: 930, r: -16, s: 0.28, o: 0.13 },
      { x: 560, r: 6, s: 0.22, o: 0.08 },
    ].map((b, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: b.x - 190,
          top: -160,
          width: 380,
          height: 2500,
          transformOrigin: "50% 0",
          rotate: `${b.r + Math.sin(t * b.s + i) * 9}deg`,
          background: `linear-gradient(180deg, rgba(255,190,110,${b.o}) 0%, rgba(255,190,110,${b.o * 0.4}) 45%, rgba(255,190,110,0) 80%)`,
          clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)",
          filter: "blur(18px)",
        }}
      />
    ))}
    {[0, 1].map((i) => (
      <div
        key={`fog-${i}`}
        style={{
          position: "absolute",
          left: -400 + ((t * (30 + i * 18) + i * 600) % 1900) - 300,
          top: 900 + i * 380,
          width: 1300,
          height: 520,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(170,190,230,.14), rgba(170,190,230,0))",
        }}
      />
    ))}
  </AbsoluteFill>
);

/** Out-of-focus sodium bokeh and a giant blurred container rushing past the lens during the dives. */
const Foreground: React.FC<{ t: number }> = ({ t }) => {
  const cam = camLevel(t);
  const k1 = prog(t, DIVE1.from, DIVE1.to);
  const k4 = prog(t, DIVE4.from, DIVE4.to);
  const pass = inWin(t, DIVE1.from, DIVE1.to) ? k1 : inWin(t, DIVE4.from, DIVE4.to) ? k4 : -1;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 14 }, (_, i) => {
        const s = 60 + hash(i, 31) * 180;
        const x = hash(i, 32) * 1180 - 50;
        const y = ((((hash(i, 33) * 2600 - cam * SPACING * 1.6 - t * 18) % 2600) + 2600) % 2600) - 300;
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
              background: `radial-gradient(circle, rgba(255,${150 + Math.round(hash(i, 34) * 60)},70,.42), rgba(255,160,70,.12) 55%, rgba(255,160,70,0) 72%)`,
              filter: `blur(${6 + hash(i, 35) * 10}px)`,
              mixBlendMode: "screen",
            }}
          />
        );
      })}
      {pass >= 0 ? (
        <Img
          src={A("falling-container")}
          style={{
            position: "absolute",
            left: i4(t) ? -620 : 560,
            top: interpolate(pass, [0, 1], [2100, -1900]),
            width: 1500,
            filter: "blur(22px) brightness(.55)",
            opacity: 0.85,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
const i4 = (t: number) => t > 20;

/** Radial zoom streaks for the dolly dive, vertical streaks for the tilted dive. */
const Streaks: React.FC<{ t: number }> = ({ t }) => {
  const k1 = diveK(t, DIVE1);
  const k4 = diveK(t, DIVE4) + (t < T.land0 ? 1 - t / T.land0 : 0) * 0.8;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {k1 > 0.01 ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: k1 }}>
          {Array.from({ length: 48 }, (_, i) => {
            const a = (i / 48) * Math.PI * 2 + hash(i, 41) * 0.1;
            const r = 160 + ((hash(i, 42) + t * 2.6) % 1) * 1200;
            const len = 120 + hash(i, 43) * 260;
            const cx = 540;
            const cy = 1100;
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * r}
                y1={cy + Math.sin(a) * r}
                x2={cx + Math.cos(a) * (r + len)}
                y2={cy + Math.sin(a) * (r + len)}
                stroke="rgba(255,220,180,.5)"
                strokeWidth={2 + hash(i, 44) * 3}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      ) : null}
      {k4 > 0.01 ? (
        <AbsoluteFill style={{ opacity: Math.min(1, k4 * 1.2) }}>
          {Array.from({ length: 26 }, (_, i) => {
            const x = hash(i, 1) * 1080;
            const len = 260 + hash(i, 2) * 520;
            const y = ((((hash(i, 3) * 2600 - t * 5200) % 2600) + 2600) % 2600) - 400;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: 2 + hash(i, 4) * 3,
                  height: len,
                  borderRadius: 4,
                  background: "linear-gradient(180deg, rgba(255,214,170,0), rgba(255,214,170,.45), rgba(255,214,170,0))",
                }}
              />
            );
          })}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

const Rain: React.FC<{ t: number }> = ({ t }) => (
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

// ── The orange disc: moon → porthole → stamp → headlights → G ───────────────────────────────────────────
const LEVEL_AT = [DIVE1.to, PORT_FLY.open, SPLIT.land, DIVE4.to, T.sweep + 0.45];
const gateNumber = (t: number) => LEVEL_AT.filter((l) => t >= l).length;

const Porthole: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const k = interpolate(t, [3.55, 4.15], [0, 1], { ...clamp, easing: ioCubic });
  const bob = Math.sin(t * 1.4) * 6 * (1 - k);
  const cx = interpolate(k, [0, 1], [MOON.x, GLASS.x]);
  const cy = interpolate(k, [0, 1], [MOON.y, GLASS.y]) + bob;
  const r = interpolate(k, [0, 1], [MOON.r, GLASS.r]);
  const frameIn = interpolate(t, [3.95, 4.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  // Fly-through: the porthole rushes at the camera until the glass fills the frame …
  const fly = t >= PORT_FLY.open - 0.05 ? 0 : interpolate(t, [PORT_FLY.from, PORT_FLY.peak], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  // … then it screws back on in its corner.
  const back = interpolate(t, [PORT_FLY.open - 0.05, PORT_FLY.open + 0.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) });
  const hidden = inWin(t, PORT_FLY.peak, PORT_FLY.open - 0.05);
  const flyScale = 1 + 19 * fly;
  const reenter = t >= PORT_FLY.open - 0.05 && t < PORT_FLY.open + 0.4 ? back : 1;
  const fadeOut = interpolate(t, [T.flare - 0.2, T.flare + 0.1], [1, 0], clamp);
  const n = gateNumber(t);
  const since = t - (LEVEL_AT[n - 1] ?? 0);
  const roll = n > 0 ? interpolate(since, [0, 0.35], [1, 0], { ...clamp, easing: Easing.out(Easing.back(2)) }) : 0;
  const stuck = inWin(t, T.stuck, T.sweep);
  const redFlick = stuck ? (noise2D("pf", frame * 0.5, 0) > -0.1 ? 0.75 : 0.2) : 0;
  if (hidden) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fadeOut,
        transformOrigin: `${GLASS.x}px ${GLASS.y}px`,
        transform: `translate(${(540 - GLASS.x) * fly}px, ${(960 - GLASS.y) * fly}px) scale(${flyScale * (0.4 + 0.6 * reenter)}) rotate(${(1 - reenter) * -90}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: cx - r * 3,
          top: cy - r * 3,
          width: r * 6,
          height: r * 6,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,140,40,.45), rgba(245,140,40,0) 60%)",
          opacity: 1 - frameIn * 0.85,
        }}
      />
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
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${s * 200}%`,
              height: `${s * 200}%`,
              translate: "-50% -50%",
              borderRadius: "50%",
              background: "rgba(150,50,15,.28)",
              opacity: 1 - k,
            }}
          />
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

/** The orange glass fills the screen, then opens as an iris onto gate two. */
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

/** SPPB: a disc lifts out of the porthole glass, arcs down and slams onto the container as a customs stamp. */
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 34%, #FFD08A, #F5A623 40%, #F26A1F 75%)",
          opacity: 1 - ink,
          boxShadow: "0 0 30px rgba(245,166,35,.7)",
        }}
      />
      <svg viewBox="0 0 250 250" width={size} height={size} style={{ position: "absolute", inset: 0, opacity: ink * 0.94 }}>
        <circle cx={125} cy={125} r={112} fill="rgba(255,247,239,.78)" />
        <circle cx={125} cy={125} r={116} fill="none" stroke="#1E50D8" strokeWidth={10} />
        <circle cx={125} cy={125} r={100} fill="none" stroke="#1E50D8" strokeWidth={3} />
        <circle cx={125} cy={125} r={70} fill="none" stroke="#1E50D8" strokeWidth={3} />
        <text x={125} y={150} textAnchor="middle" fontFamily={FONT_CONDENSED} fontSize={78} fill="#1E50D8" letterSpacing={2}>
          SPPB
        </text>
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <circle key={i} cx={125 + Math.cos(a) * 85} cy={125 + Math.sin(a) * 85} r={3.2} fill="#1E50D8" />;
        })}
      </svg>
    </div>
  );
};

/** Shockwave rings from the stamp. */
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

/** Gate five: the truck at the gate, plus the disc that becomes its headlights. */
const DOOR = { top: -230, left: -100, w: 1280, h: 1920, s: 1.25 };
const doorZoom = (t: number) => 1.04 + 0.1 * interpolate(t, [T.sweep, T.white], [0, 1], clamp);
const headlight = (t: number, i: 0 | 1) => {
  const px = i === 0 ? 510 : 737;
  const py = 1032;
  const ox = DOOR.left + DOOR.w / 2;
  const oy = DOOR.top + DOOR.h * 0.58;
  const z = doorZoom(t);
  return { x: ox + (DOOR.left + px * DOOR.s - ox) * z, y: oy + (DOOR.top + py * DOOR.s - oy) * z };
};

const DoorScene: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ background: "#050A18", overflow: "hidden" }}>
    <Img
      src={A("delivery-truck-at-gate")}
      style={{ position: "absolute", left: DOOR.left, top: DOOR.top, width: DOOR.w, height: DOOR.h, scale: String(doorZoom(t)), transformOrigin: "50% 58%" }}
    />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(4,9,24,.9) 0%, rgba(4,9,24,.5) 26%, rgba(4,9,24,0) 38%, rgba(4,9,24,0) 56%, rgba(4,9,24,.85) 66%, rgba(4,9,24,.96) 100%)",
      }}
    />
  </AbsoluteFill>
);

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
                background: on > 0 ? `radial-gradient(circle, #fff 0%, rgba(255,240,215,${0.95 * flicker}) 25%, rgba(255,190,110,.45) 55%, rgba(255,190,110,0) 72%)` : "radial-gradient(circle at 38% 34%, #FFD08A, #F5A623 40%, #F26A1F 75%)",
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

/** After the whiteout the light contracts into the G of the logo, revealing the navy end card. */
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

// ── Giant barrier swing (gate five) ─────────────────────────────────────────────────────────────────────
const SWEEP_PIVOT = { x: -60, y: 1990 };
const SWEEP_S = 1.55;
const sweepAngle = (t: number) => interpolate(t, [T.sweep, T.sweep + 0.75], [0, -90], { ...clamp, easing: Easing.bezier(0.7, 0, 0.25, 1) });
const wedge = (deg: number) => {
  const pts = [`${SWEEP_PIVOT.x}px ${SWEEP_PIVOT.y}px`];
  for (let i = 0; i <= 12; i++) {
    const a = ((deg * i) / 12) * (Math.PI / 180);
    pts.push(`${SWEEP_PIVOT.x + Math.cos(a) * 3200}px ${SWEEP_PIVOT.y + Math.sin(a) * 3200}px`);
  }
  return `polygon(${pts.join(", ")})`;
};
const SweepReveal: React.FC<{ t: number; children: React.ReactNode }> = ({ t, children }) => {
  if (t < T.sweep) return null;
  const a = sweepAngle(t);
  return <AbsoluteFill style={{ clipPath: a > -89.9 ? wedge(a - 2) : undefined }}>{children}</AbsoluteFill>;
};
const SweepArm: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.sweep || t > T.sweep + 1.1) return null;
  const k = prog(t, T.sweep, T.sweep + 0.75);
  const a = sweepAngle(t) + interpolate(t, [T.sweep + 0.75, T.sweep + 1.1], [0, -12], clamp);
  const w = 1963 * SWEEP_S;
  const h = 570 * SWEEP_S;
  const fade = interpolate(t, [T.sweep + 0.85, T.sweep + 1.1], [1, 0], clamp);
  // It swings towards the lens: tilted in 3D, growing, with a motion-blur trail.
  const arm = (angle: number, opacity: number, blur: number, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: SWEEP_PIVOT.x - PIVOT.x * SWEEP_S,
        top: SWEEP_PIVOT.y - PIVOT.y * SWEEP_S,
        width: w,
        height: h,
        transformOrigin: `${PIVOT.x * SWEEP_S}px ${PIVOT.y * SWEEP_S}px`,
        transform: `perspective(1600px) rotateZ(${angle}deg) rotateX(${(1 - k) * 38}deg) scale(${1 + 0.22 * Math.sin(Math.PI * k)})`,
        opacity: opacity * fade,
        filter: blur ? `blur(${blur}px)` : "drop-shadow(0 0 40px rgba(242,106,31,.6)) drop-shadow(0 30px 30px rgba(0,0,0,.6))",
      }}
    >
      <Img src={A("gate-arm")} style={{ width: w, height: h, display: "block" }} />
    </div>
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {k < 1 ? [arm(a + 7, 0.3, 8, "t1"), arm(a + 14, 0.16, 14, "t2"), arm(a + 22, 0.08, 20, "t3")] : null}
      {arm(a, 1, 0, "main")}
    </AbsoluteFill>
  );
};

// ── Stuck: the screen cracks ────────────────────────────────────────────────────────────────────────────
const CRACK_O = { x: 742, y: 980 };
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
  if (t < T.stuck || t > T.sweep + 0.1) return null;
  const draw = interpolate(t, [34.02, 34.3, 35.3, 35.5], [0, 0.55, 0.55, 1], clamp);
  const fade = interpolate(t, [T.sweep - 0.4, T.sweep], [1, 0], clamp);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: fade, pointerEvents: "none" }}>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[...CRACKS, ...CRACK_RINGS].map((p, i) => (
          <React.Fragment key={i}>
            <polyline points={p} stroke="rgba(0,0,0,.55)" strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} transform="translate(3 3)" />
            <polyline
              points={p}
              stroke="rgba(235,245,255,.85)"
              strokeWidth={i < CRACKS.length ? 3 : 2}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - draw}
              style={{ filter: "drop-shadow(0 0 6px rgba(200,225,255,.9))" }}
            />
          </React.Fragment>
        ))}
      </g>
      <circle cx={CRACK_O.x} cy={CRACK_O.y} r={26 * draw} fill="rgba(235,245,255,.5)" />
    </svg>
  );
};

// ── Depth gauge (like a lift's floor indicator) ─────────────────────────────────────────────────────────
const gaugeValue = (t: number) =>
  interpolate(t, [3.62, DIVE1.to, PORT_FLY.from, PORT_FLY.open, SPLIT.from, SPLIT.land, DIVE4.from, DIVE4.to, T.sweep, T.sweep + 0.6], [0, 1, 1, 2, 2, 3, 3, 4, 4, 5], clamp);
const DepthGauge: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const appear = interpolate(t, [3.9, 4.4], [0, 1], { ...clamp, easing: ioCubic });
  const fade = interpolate(t, [T.flare - 0.3, T.flare], [1, 0], clamp);
  if (appear <= 0 || fade <= 0) return null;
  const v = gaugeValue(t);
  const yAt = (n: number) => GAUGE.top + (n - 1) * GAUGE.step;
  const fillTo = v >= 1 ? yAt(v) : GAUGE.top;
  const stuck = inWin(t, T.stuck, T.sweep);
  const trackH = GAUGE.step * 4 * appear;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: GAUGE.x - 1.5, top: GAUGE.top, width: 3, height: trackH, borderRadius: 2, background: "rgba(255,255,255,.18)" }} />
      <div
        style={{
          position: "absolute",
          left: GAUGE.x - 3,
          top: GAUGE.top,
          width: 6,
          height: Math.min(trackH, fillTo - GAUGE.top),
          borderRadius: 3,
          background: `linear-gradient(180deg, ${BRAND.amber}, ${BRAND.orange})`,
          boxShadow: "0 0 18px rgba(242,106,31,.8)",
        }}
      />
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
            <div
              style={{
                position: "absolute",
                left: GAUGE.x - 12,
                top: y - 12,
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: `3px solid ${reached ? col : "rgba(255,255,255,.35)"}`,
                background: reached ? col : "rgba(5,10,24,.8)",
                boxShadow: reached ? `0 0 18px ${col}` : "none",
              }}
            />
            {pulse >= 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: GAUGE.x - 12 - pulse * 30,
                  top: y - 12 - pulse * 30,
                  width: 24 + pulse * 60,
                  height: 24 + pulse * 60,
                  borderRadius: "50%",
                  border: `2px solid ${BRAND.amber}`,
                  opacity: 1 - pulse,
                }}
              />
            ) : null}
            <div
              style={{
                position: "absolute",
                right: 1080 - GAUGE.x + 24,
                top: y - 16,
                fontFamily: FONT_CONDENSED,
                fontSize: 32,
                lineHeight: 1,
                color: reached ? "#FFF7EF" : "rgba(255,255,255,.4)",
              }}
            >
              {n}
            </div>
          </React.Fragment>
        );
      })}
      {v >= 1 ? (
        <div
          style={{
            position: "absolute",
            left: GAUGE.x - 9,
            top: fillTo - 9,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: `0 0 20px 6px ${BRAND.amber}`,
          }}
        />
      ) : null}
    </div>
  );
};

// ── Headlines (GATE n · TITLE). They sit behind the crane cable for depth. ──────────────────────────────
const HEADS: { from: number; to: number; parts: { text: string; color?: string }[] }[] = [
  { from: 4.3, to: 9.4, parts: [{ text: "UNLOADED" }] },
  { from: 10.5, to: 18.45, parts: [{ text: "PAY " }, { text: "+", color: BRAND.orange }, { text: " FILE PIB" }] },
  { from: 19.55, to: 27.6, parts: [{ text: "GREEN", color: "#3ee08a" }, { text: " OR " }, { text: "RED", color: "#ff5a48" }] },
  { from: 28.55, to: T.stuck, parts: [{ text: "SPPB " }, { text: "+", color: BRAND.orange }, { text: " DO" }] },
  { from: 39.6, to: 47.5, parts: [{ text: "DOOR TO DOOR" }] },
];
const Headline: React.FC<{ t: number }> = ({ t }) => {
  const h = HEADS.find((x) => t >= x.from && t < x.to + 0.4);
  if (!h) return null;
  const inK = interpolate(t, [h.from, h.from + 0.5], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const outK = interpolate(t, [h.to, h.to + 0.32], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const rule = interpolate(t, [h.from + 0.2, h.from + 0.7], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const blur = (inK + outK) * 10;
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
            filter: `blur(${blur}px)`,
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
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 616,
          width: 300,
          height: 8,
          borderRadius: 4,
          background: `linear-gradient(90deg, ${BRAND.orange}, ${BRAND.amber})`,
          transformOrigin: "0 50%",
          scale: `${rule * (1 - outK)} 1`,
        }}
      />
    </>
  );
};
/** The cable again, over the headline, when the world is not mid-transition. */
const CableOver: React.FC<{ t: number }> = ({ t }) => {
  if (t >= T.sweep || inWin(t, PORT_FLY.from, PORT_FLY.land + 0.05) || inWin(t, SPLIT.from, SPLIT.land + 0.05)) return null;
  if (inWin(t, DIVE1.from, DIVE1.to) || inWin(t, DIVE4.from, DIVE4.to)) return null;
  if (GLITCH.some(([a, b]) => inWin(t, a, b))) return null;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 700, overflow: "hidden" }}>
      <Cable dy={contDy(t) + bounce(t).y} />
    </div>
  );
};

// ── Episode ─────────────────────────────────────────────────────────────────────────────────────────────
export const E02GateByGate: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const hits = [T.land0, DIVE1.to, PORT_FLY.land, SPLIT.land, DIVE4.to, T.sppb, 34.05, 35.32, 36.37, T.sweep + 0.05, T.white].map(sec);
  const sfx: SfxCue[] = [
    { at: 0, name: "whoosh", volume: 0.45 },
    { at: sec(T.land0), name: "boom", volume: 0.8 },
    { at: sec(DIVE1.open), name: "crunch", volume: 0.35 },
    { at: sec(DIVE1.from), name: "whoosh", volume: 0.5 },
    { at: sec(DIVE1.to), name: "boom", volume: 0.5 },
    { at: sec(PORT_FLY.from), name: "whoosh", volume: 0.55 },
    { at: sec(PORT_FLY.peak), name: "glitch", volume: 0.25 },
    { at: sec(PORT_FLY.land), name: "boom", volume: 0.5 },
    { at: sec(SPLIT.from), name: "whoosh", volume: 0.55 },
    { at: sec(SPLIT.land), name: "boom", volume: 0.5 },
    { at: sec(DIVE4.open), name: "crunch", volume: 0.35 },
    { at: sec(DIVE4.from), name: "whoosh", volume: 0.5 },
    { at: sec(DIVE4.to), name: "boom", volume: 0.5 },
    ...[T.stacked, 12.48, 15.32, GREEN_AT, RED_AT, T.delivery, 41.22, 42.11, 43.45].map((s) => ({ at: sec(s), name: "tick", volume: 0.35 })),
    { at: sec(T.sppb), name: "stamp", volume: 0.75 },
    { at: sec(T.stuck), name: "glitch", volume: 0.7 },
    { at: sec(34.05), name: "crunch", volume: 0.6 },
    { at: sec(35.8), name: "crunch", volume: 0.45 },
    { at: sec(35.32), name: "glitch", volume: 0.4 },
    { at: sec(35.32), name: "boom", volume: 0.4 },
    { at: sec(36.37), name: "boom", volume: 0.4 },
    { at: sec(T.sweep), name: "whoosh", volume: 0.65 },
    { at: sec(T.sweep + 0.6), name: "boom", volume: 0.45 },
    { at: sec(T.headlights), name: "whoosh", volume: 0.35 },
    { at: sec(T.headlights + 0.8), name: "tick", volume: 0.4 },
    { at: sec(T.flare), name: "whoosh", volume: 0.5 },
    { at: sec(T.logo + 0.1), name: "sonic-logo", volume: 0.8 },
  ];

  return (
    <AbsoluteFill style={{ background: "#050A18" }}>
      <Shake hits={hits} amount={20}>
        {t < T.sweep + 0.8 ? (
          <AbsoluteFill>
            <WorldStack t={t} frame={frame} />
            <Beams t={t} />
            <Headline t={t} />
            <CableOver t={t} />
            <Streaks t={t} />
            <Foreground t={t} />
          </AbsoluteFill>
        ) : null}
        <SweepReveal t={t}>
          <DoorScene t={t} />
          {t >= T.sweep + 0.4 ? (
            <>
              <Beams t={t} />
              <Headline t={t} />
            </>
          ) : null}
        </SweepReveal>
        <Rain t={t} />
        <SweepArm t={t} />
      </Shake>
      <Flash hits={[sec(T.land0)]} color="#FFD9A8" peak={0.4} />

      <Cracks t={t} />
      <StampWave t={t} />
      <Stamp t={t} frame={frame} />
      <DepthGauge t={t} frame={frame} />
      <Porthole t={t} frame={frame} />
      <Iris t={t} />
      <Chip t={t} at={T.stacked} out={9.3} top={1448} icon="stack" tag="STACKED" text="Port's temporary storage" />
      <Chip t={t} at={T.sppb} out={33.6} top={1448} icon="seal-check" tag="CUSTOMS" text="SPPB · your release" />
      <Chip t={t} at={T.delivery} out={33.6} top={1584} icon="file-text" tag="SHIPPING LINE" text="Delivery order (DO)" />

      <HfOverlay clip="e02-hook" from={0} durationInFrames={sec(4)} fallback={null} />
      <HfOverlay clip="e02-pib" from={sec(10)} durationInFrames={sec(9)} fallback={null} />
      <HfOverlay clip="e02-lanes" from={sec(19)} durationInFrames={sec(9)} fallback={null} />
      <HfOverlay clip="e02-stuck" from={sec(T.stuck)} durationInFrames={sec(5)} fallback={null} />
      <HfOverlay clip="e02-door" from={sec(T.sweep)} durationInFrames={sec(9)} fallback={null} />

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
