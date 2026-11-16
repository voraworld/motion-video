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
 * Night port seen from above. A container hangs from a crane cable and is lowered through a stack of gates.
 * At each gate it lands on a closed barrier arm with a hard stop and a springy bounce; when the gate's step is
 * done the arm swings up and the camera falls with the container to the next gate.
 *
 * Morph chain: orange moon (hook) → porthole gate counter (gate 1) → round customs stamp (SPPB, gate 4)
 * → barrier arm that sweeps the screen (gate 5, end card) → UGC logo (the G draws with the same sweep).
 *
 * R (Remotion): world, camera fall, gates, container, moon/porthole/stamp, headlines, gate 1 + gate 4 chips,
 *   arm sweeps, gate 5 scene, end card backdrop, captions, brand frame, audio.
 * H (HyperFrames): e02-hook, e02-pib, e02-lanes, e02-stuck, e02-door, e02-logo.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ep = getEpisode("E02");
const beats = beatsOf(ep);
const vo = MANIFEST.voBeats?.e02 ?? [];
const A = (name: string) => staticFile(asset("e02", name) ?? `assets/e02/${name}.png`);

const wordAt = (beatIndex: number, word: string) => {
  const b = ep.beats[beatIndex];
  const words = b[4].split(/\s+/);
  const idx = Math.max(0, words.findIndex((w) => w.replace(/[^\w']/g, "").toLowerCase() === word.toLowerCase()));
  const dur = vo.find((v) => v.start === b[0])?.duration ?? b[1] - b[0] - 0.5;
  return b[0] + (dur * idx) / words.length;
};

// ── Timeline ────────────────────────────────────────────────────────────────────────────────────────────
const T = {
  land0: 0.4, // container lands on the hook gate
  stacked: wordAt(1, "stacked"),
  sppb: wordAt(4, "SPPB"),
  delivery: wordAt(4, "delivery"),
  stuck: 34,
  sweep1: 39, // barrier arm sweeps in gate 5
  cta: 48, // barrier arm sweeps in the end card
  logo: 48.3,
};
/** Falls between gates: arm opens at `open`, container falls from `from` and lands at `to`. */
const FALLS = [
  { open: 3.5, from: 3.62, to: 4.12 },
  { open: 9.75, from: 9.9, to: 10.4 },
  { open: 18.75, from: 18.9, to: 19.4 },
  { open: 27.75, from: 27.9, to: 28.4 },
];
const LANDS = [T.land0, ...FALLS.map((f) => f.to)];
const GREEN_AT = 21.78;
const RED_AT = 24.16;

// ── Geometry (1080×1920) ────────────────────────────────────────────────────────────────────────────────
const SPACING = 1700; // world distance between gates
const GATE_Y = 1390; // screen y of the arm's centre line when the camera rests at a gate
const ARM_S = 0.6; // gate-arm.png 1963×570, pivot at (330,163), bar y 123–204, post box x 30–300
const ARM_LEFT = 2;
const PIVOT = { x: 330, y: 163 };
const BAR_CUT = 372; // x where the striped bar starts (the post and hinge stay still)
const CONT_W = 500; // falling-container.png 1071×1266, hook at top centre, body bottom y 1259
const CONT_S = CONT_W / 1071;
const CONT_X = 600; // container centre x
const CONT_BOTTOM = GATE_Y - (PIVOT.y - 123) * ARM_S; // rests on the bar's top edge
const CONT_TOP = CONT_BOTTOM - 1259 * CONT_S;
const PORT = { x: 70, y: 205, size: 200 }; // porthole gate counter; glass centre ≈ 49% / 50%, radius 31%
const GLASS = { x: PORT.x + PORT.size * 0.49, y: PORT.y + PORT.size * 0.5, r: PORT.size * 0.31 };
const MOON = { x: 900, y: 770, r: 100 };

// ── Deterministic helpers ───────────────────────────────────────────────────────────────────────────────
const hash = (i: number, salt = 0) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const easeIn = (p: number) => p * p;

/** Camera depth in gates (0 = hook gate, 4 = gate four). */
const camLevel = (t: number) => {
  let level = 0;
  for (const f of FALLS) {
    if (t >= f.to) level += 1;
    else if (t > f.from) return level + easeIn((t - f.from) / (f.to - f.from));
  }
  return level;
};
/** Fall velocity 0..1 (for speed lines). */
const fallSpeed = (t: number) => {
  for (const f of FALLS) if (t > f.from && t < f.to) return (2 * (t - f.from)) / (f.to - f.from) / 2;
  if (t < T.land0) return 1 - t / T.land0 / 3;
  return 0;
};
/** Springy bounce after a landing: y offset (px) and squash. */
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
/** Container screen offset during the hook drop-in. */
const hookDrop = (t: number) => (t < T.land0 ? -720 * (1 - easeIn(t / T.land0)) : 0);

// ── Icons and chips (the Remotion-side chips match hyperframes/e02-* chips) ────────────────────────────────
const Icon: React.FC<{ name: PhosphorName; size: number; color?: string }> = ({ name, size, color = "#fff" }) => (
  <svg viewBox="0 0 256 256" width={size} height={size} fill={color} aria-hidden>
    {PHOSPHOR[name].map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

const Chip: React.FC<{ t: number; at: number; out: number; top: number; icon: PhosphorName; tag: string; text: string; check?: boolean }> = ({
  t,
  at,
  out,
  top,
  icon,
  tag,
  text,
  check = true,
}) => {
  if (t < at || t > out + 0.5) return null;
  const d = t - at;
  const rot = interpolate(d, [0, 0.26, 0.35, 0.49], [-100, 12, -5, 0], clamp);
  const fadeIn = interpolate(d, [0, 0.2], [0, 1], clamp);
  const o = t - out;
  const outY = o > 0 ? 260 * easeIn(Math.min(1, o / 0.32)) : 0;
  const outRot = o > 0 ? 70 * Math.min(1, o / 0.32) : 0;
  const outFade = o > 0 ? 1 - Math.min(1, o / 0.32) : 1;
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
          transform: `translateY(${outY}px) rotateX(${rot + outRot}deg)`,
          opacity: fadeIn * outFade,
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
        {check ? (
          <div style={{ flex: "none", scale: String(okScale) }}>
            <Icon name="check-circle" size={54} color={BRAND.amber} />
          </div>
        ) : null}
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

// ── World ───────────────────────────────────────────────────────────────────────────────────────────────
/** Aerial night yard, tiled along the fall with a mirrored seam, parallax 0.45 of the camera. */
const Yard: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const h = 1620;
  const off = camLevel(t) * SPACING * 0.45 + t * 10;
  const first = Math.floor(off / h);
  // Sodium-lamp flicker right after each landing.
  let flick = 0;
  for (const l of LANDS) {
    const d = t - l;
    if (d >= 0 && d < 0.45) flick = Math.max(flick, hash(frame, 7) > 0.45 ? 0.35 * (1 - d / 0.45) : 0);
  }
  const stuckPulse = t > T.stuck && t < T.sweep1 ? 0.2 + 0.2 * Math.max(0, Math.sin((t - T.stuck) * 6)) : 0;
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
      {/* Lane light washes at gate three */}
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

/** One barrier gate. `level` is its depth; the bar rotates about the hinge, the post stays still. */
const Gate: React.FC<{ level: number; t: number; frame: number }> = ({ level, t, frame }) => {
  const y = GATE_Y + (level - camLevel(t)) * SPACING;
  if (y < -1300 || y > 2400) return null;
  const fall = FALLS[level];
  let angle = 0;
  if (fall) angle = interpolate(t, [fall.open, fall.open + 0.38], [0, -84], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  // Impact: the bar dips when the container lands on it.
  const land = LANDS[level];
  const dl = t - land;
  if (dl >= 0 && dl < 1) angle += 4 * Math.exp(-6 * dl) * Math.cos(dl * 22);
  // Gate four jams during the "stuck" beat: it tries to lift twice and slams back.
  if (level === 4) {
    angle += interpolate(t, [34.1, 34.3, 34.45, 35.6, 35.8, 35.95], [0, -11, 0, 0, -14, 0], clamp);
    if (t > T.stuck && t < T.sweep1) angle += noise2D("jam", frame * 0.8, 0) * 1.2;
  }
  const w = 1963 * ARM_S;
  const h = 570 * ARM_S;
  const top = y - PIVOT.y * ARM_S;
  const lampOn = level === 3 ? (t > RED_AT ? "red" : t > GREEN_AT ? "green" : null) : null;
  const stuckLamp = level === 4 && t > T.stuck && t < T.sweep1 && Math.sin((t - T.stuck) * 12) > 0;
  return (
    <>
      {/* Bar (rotates) */}
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
        <Img src={A("gate-arm")} style={{ width: w, height: h, display: "block", filter: "drop-shadow(0 18px 18px rgba(0,0,0,.5))" }} />
      </div>
      {/* Post and hinge (still) */}
      <div style={{ position: "absolute", left: ARM_LEFT, top, width: BAR_CUT * ARM_S, height: h, overflow: "hidden" }}>
        <Img src={A("gate-arm")} style={{ width: w, height: h, display: "block", filter: "drop-shadow(0 18px 18px rgba(0,0,0,.5))" }} />
      </div>
      {/* Lane signal at gate three, warning beacon at gate four */}
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

/** Crane cable + container. Lands with a hard stop and a springy bounce; rattles while gate four is jammed. */
const Container: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const { y: by, squash } = bounce(t);
  const p = (() => {
    for (const f of FALLS) if (t > f.from && t < f.to) return (t - f.from) / (f.to - f.from);
    return 0;
  })();
  const lead = Math.sin(Math.PI * p) * 90; // container drops slightly ahead of the camera mid-fall
  const rattle = t > T.stuck && t < T.sweep1 ? noise2D("rattle", frame * 0.9, 1) * 5 : 0;
  const dy = hookDrop(t) + by + lead;
  const sx = 1 + squash * 0.04;
  const sy = 1 - squash * 0.06;
  return (
    <>
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
      <Img
        src={A("falling-container")}
        style={{
          position: "absolute",
          left: CONT_X - CONT_W / 2 + rattle,
          top: CONT_TOP + dy,
          width: CONT_W,
          transformOrigin: "50% 100%",
          scale: `${sx} ${sy}`,
          filter: "drop-shadow(0 30px 30px rgba(0,0,0,.6)) brightness(1.05)",
        }}
      />
    </>
  );
};

/** Dust kicked off the bar at each landing. */
const Dust: React.FC<{ t: number }> = ({ t }) => {
  const parts: React.ReactNode[] = [];
  LANDS.forEach((l, li) => {
    const d = t - l;
    if (d < 0 || d > 0.9) return;
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
  return <>{parts}</>;
};

/** Vertical speed streaks while falling (the world rushes up). */
const SpeedLines: React.FC<{ t: number }> = ({ t }) => {
  const v = fallSpeed(t);
  if (v <= 0.02) return null;
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, v * 1.3) }}>
      {Array.from({ length: 26 }, (_, i) => {
        const x = hash(i, 1) * 1080;
        const len = 260 + hash(i, 2) * 520;
        const y = ((hash(i, 3) * 2600 - t * 5200) % 2600 + 2600) % 2600 - 400;
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
  );
};

/** Light rain over the whole night port. */
const Rain: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ opacity: interpolate(t, [T.cta, T.cta + 0.8], [0.9, 0], clamp) }}>
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

// ── Moon → porthole → stamp ─────────────────────────────────────────────────────────────────────────────
const LEVEL_AT = [4.12, 10.4, 19.4, 28.4, 39.45];
const gateNumber = (t: number) => LEVEL_AT.filter((l) => t >= l).length; // 0 before gate one

const MoonAndPorthole: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const e = Easing.bezier(0.65, 0, 0.35, 1);
  const k = interpolate(t, [3.55, 4.15], [0, 1], { ...clamp, easing: e });
  const bob = Math.sin(t * 1.4) * 6 * (1 - k);
  const cx = interpolate(k, [0, 1], [MOON.x, GLASS.x]);
  const cy = interpolate(k, [0, 1], [MOON.y, GLASS.y]) + bob;
  const r = interpolate(k, [0, 1], [MOON.r, GLASS.r]);
  const frameIn = interpolate(t, [3.95, 4.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const fadeOut = interpolate(t, [T.cta - 0.2, T.cta + 0.2], [1, 0], clamp);
  const n = gateNumber(t);
  const since = t - (LEVEL_AT[n - 1] ?? 0);
  const roll = n > 0 ? interpolate(since, [0, 0.35], [1, 0], { ...clamp, easing: Easing.out(Easing.back(2)) }) : 0;
  const stuck = t > T.stuck && t < T.sweep1;
  const redFlick = stuck ? (noise2D("pf", frame * 0.5, 0) > -0.1 ? 0.75 : 0.2) : 0;
  return (
    <div style={{ opacity: fadeOut }}>
      {/* Moon glow (fades as it docks into the porthole) */}
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
      {/* Porthole frame screws on */}
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
      {/* The moon disc, which becomes the porthole glass */}
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
          opacity: interpolate(t, [4.1, 4.35], [1, 0.82], clamp),
        }}
      >
        {/* Craters (moon only) */}
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
        {/* Gate counter */}
        {n > 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", overflow: "hidden" }}>
            <div style={{ fontFamily: FONT_CONDENSED, fontSize: 104, lineHeight: 1, color: "#2B1C15", translate: `0 ${roll * 120}%` }}>{n}</div>
          </div>
        ) : null}
      </div>
      {/* GATE label */}
      <div
        style={{
          position: "absolute",
          left: PORT.x + PORT.size + 24,
          top: GLASS.y - 46,
          fontFamily: FONT_CONDENSED,
          fontSize: 92,
          lineHeight: 1,
          letterSpacing: `${interpolate(frameIn, [0, 1], [0.6, 0.16])}em`,
          color: stuck ? "#ff6b5a" : BRAND.amber,
          opacity: frameIn,
        }}
      >
        GATE
      </div>
    </div>
  );
};

/** SPPB: a disc lifts out of the porthole glass, flies down and slams onto the container as a customs stamp. */
const Stamp: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const t0 = T.sppb - 0.45;
  if (t < t0 || t > T.stuck + 0.3) return null;
  const k = interpolate(t, [t0, T.sppb], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const target = { x: CONT_X + 20, y: CONT_BOTTOM - 150 };
  const cx = interpolate(k, [0, 1], [GLASS.x, target.x]);
  const cy = interpolate(k, [0, 1], [GLASS.y, target.y]) - Math.sin(k * Math.PI) * 120;
  const slam = t - T.sppb;
  const size = interpolate(k, [0, 1], [GLASS.r * 2, 250]) * (slam > 0 ? interpolate(slam, [0, 0.12], [1.35, 1], clamp) : 1.35 * k + (1 - k));
  const ink = interpolate(t, [T.sppb - 0.1, T.sppb + 0.05], [0, 1], clamp);
  const glitch = t > T.stuck ? interpolate(t, [T.stuck, T.stuck + 0.3], [1, 0], clamp) : 1;
  const jx = t > T.stuck ? noise2D("sg", frame, 0) * 30 : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - size / 2 + jx,
        top: cy - size / 2,
        width: size,
        height: size,
        rotate: `${interpolate(k, [0, 1], [0, -14])}deg`,
        opacity: glitch,
      }}
    >
      {/* Travelling glass disc */}
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
      {/* Stamp ink */}
      <svg viewBox="0 0 250 250" width={size} height={size} style={{ position: "absolute", inset: 0, opacity: ink * 0.92 }}>
        <defs>
          <path id="e02-stamp-arc" d="M 125 125 m -88 0 a 88 88 0 1 1 176 0 a 88 88 0 1 1 -176 0" />
        </defs>
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

// ── Headlines (GATE n · TITLE) ──────────────────────────────────────────────────────────────────────────
const HEADS: { from: number; to: number; parts: { text: string; color?: string }[] }[] = [
  { from: 4.3, to: 9.75, parts: [{ text: "UNLOADED" }] },
  { from: 10.55, to: 18.75, parts: [{ text: "PAY " }, { text: "+", color: BRAND.orange }, { text: " FILE PIB" }] },
  { from: 19.55, to: 27.75, parts: [{ text: "GREEN", color: "#3ee08a" }, { text: " OR " }, { text: "RED", color: "#ff5a48" }] },
  { from: 28.55, to: T.stuck, parts: [{ text: "SPPB " }, { text: "+", color: BRAND.orange }, { text: " DO" }] },
  { from: 39.6, to: 47.75, parts: [{ text: "DOOR TO DOOR" }] },
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

// ── Barrier-arm sweep (transition) ──────────────────────────────────────────────────────────────────────
const SWEEP_PIVOT = { x: -60, y: 1990 };
const SWEEP_S = 1.55;
const sweepAngle = (t: number, t0: number) => interpolate(t, [t0, t0 + 0.75], [0, -90], { ...clamp, easing: Easing.bezier(0.7, 0, 0.25, 1) });
const wedge = (deg: number) => {
  const pts = [`${SWEEP_PIVOT.x}px ${SWEEP_PIVOT.y}px`];
  for (let i = 0; i <= 12; i++) {
    const a = ((deg * i) / 12) * (Math.PI / 180);
    pts.push(`${SWEEP_PIVOT.x + Math.cos(a) * 3200}px ${SWEEP_PIVOT.y + Math.sin(a) * 3200}px`);
  }
  return `polygon(${pts.join(", ")})`;
};
const SweepReveal: React.FC<{ t: number; t0: number; children: React.ReactNode }> = ({ t, t0, children }) => {
  if (t < t0) return null;
  const a = sweepAngle(t, t0);
  return <AbsoluteFill style={{ clipPath: a > -89.9 ? wedge(a - 2) : undefined }}>{children}</AbsoluteFill>;
};
const SweepArm: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  if (t < t0 || t > t0 + 1.1) return null;
  const a = sweepAngle(t, t0) + interpolate(t, [t0 + 0.75, t0 + 1.1], [0, -12], clamp);
  const w = 1963 * SWEEP_S;
  const h = 570 * SWEEP_S;
  return (
    <div
      style={{
        position: "absolute",
        left: SWEEP_PIVOT.x - PIVOT.x * SWEEP_S,
        top: SWEEP_PIVOT.y - PIVOT.y * SWEEP_S,
        width: w,
        height: h,
        transformOrigin: `${PIVOT.x * SWEEP_S}px ${PIVOT.y * SWEEP_S}px`,
        rotate: `${a}deg`,
        opacity: interpolate(t, [t0 + 0.85, t0 + 1.1], [1, 0], clamp),
        filter: "drop-shadow(0 0 40px rgba(242,106,31,.55)) drop-shadow(0 30px 30px rgba(0,0,0,.6))",
      }}
    >
      <Img src={A("gate-arm")} style={{ width: w, height: h, display: "block" }} />
    </div>
  );
};

// ── Gate five and the end card ──────────────────────────────────────────────────────────────────────────
const DoorScene: React.FC<{ t: number }> = ({ t }) => {
  const k = interpolate(t, [T.sweep1, T.cta + 0.8], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "#050A18", overflow: "hidden" }}>
      <Img
        src={A("delivery-truck-at-gate")}
        style={{ position: "absolute", left: -100, top: 0, width: 1280, height: 1920, objectFit: "cover", scale: String(1.04 + 0.1 * k), transformOrigin: "50% 58%" }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,9,24,.9) 0%, rgba(4,9,24,.55) 30%, rgba(4,9,24,0) 44%, rgba(4,9,24,0) 58%, rgba(4,9,24,.86) 72%, rgba(4,9,24,.95) 100%)" }} />
    </AbsoluteFill>
  );
};

const EndScene: React.FC<{ t: number }> = ({ t }) => {
  const d = t - T.cta;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(70% 45% at 50% 42%, #14244A 0%, #0A1430 55%, #050A18 100%)" }}>
      {/* The barrier stripes curl into a ring around the logo */}
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

// ── Episode ─────────────────────────────────────────────────────────────────────────────────────────────
export const E02GateByGate: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const level = camLevel(t);
  const hits = [T.land0, ...FALLS.map((f) => f.to), T.sppb, 35.32, 36.37, T.sweep1 + 0.05, T.cta + 0.05].map(sec);
  const sfx: SfxCue[] = [
    { at: 0, name: "whoosh", volume: 0.45 },
    { at: sec(T.land0), name: "boom", volume: 0.8 },
    ...FALLS.flatMap((f) => [
      { at: sec(f.open), name: "crunch", volume: 0.35 },
      { at: sec(f.from), name: "whoosh", volume: 0.4 },
      { at: sec(f.to), name: "boom", volume: 0.5 },
    ]),
    { at: sec(T.stacked), name: "tick", volume: 0.35 },
    ...[12.48, 15.32, GREEN_AT, RED_AT, T.delivery, 41.22, 42.11, 43.45].map((s) => ({ at: sec(s), name: "tick", volume: 0.35 })),
    { at: sec(T.sppb), name: "stamp", volume: 0.7 },
    { at: sec(T.stuck), name: "glitch", volume: 0.7 },
    { at: sec(34.3), name: "crunch", volume: 0.5 },
    { at: sec(35.8), name: "crunch", volume: 0.5 },
    { at: sec(35.32), name: "boom", volume: 0.4 },
    { at: sec(36.37), name: "boom", volume: 0.4 },
    { at: sec(T.sweep1), name: "whoosh", volume: 0.6 },
    { at: sec(T.cta), name: "whoosh", volume: 0.5 },
    { at: sec(T.logo + 0.1), name: "sonic-logo", volume: 0.8 },
  ];

  return (
    <AbsoluteFill style={{ background: "#050A18" }}>
      <Shake hits={hits} amount={20}>
        {t < T.sweep1 + 0.8 ? (
          <AbsoluteFill>
            <Yard t={t} frame={frame} />
            {[0, 1, 2, 3, 4].map((lv) => (
              <Gate key={lv} level={lv} t={t} frame={frame} />
            ))}
            <Container t={t} frame={frame} />
            <Dust t={t} />
            <SpeedLines t={t} />
          </AbsoluteFill>
        ) : null}
        <SweepReveal t={t} t0={T.sweep1}>
          <DoorScene t={t} />
        </SweepReveal>
        <SweepReveal t={t} t0={T.cta}>
          <EndScene t={t} />
        </SweepReveal>
        <Rain t={t} />
        <SweepArm t={t} t0={T.sweep1} />
        <SweepArm t={t} t0={T.cta} />
      </Shake>
      <Flash hits={[sec(T.land0)]} color="#FFD9A8" peak={0.4} />

      <Stamp t={t} frame={frame} />
      <MoonAndPorthole t={t} frame={frame} />
      <Headline t={t} />
      <Chip t={t} at={T.stacked} out={9.4} top={1448} icon="stack" tag="STACKED" text="Port's temporary storage" />
      <Chip t={t} at={T.sppb} out={33.6} top={1448} icon="seal-check" tag="CUSTOMS" text="SPPB · your release" />
      <Chip t={t} at={T.delivery} out={33.6} top={1584} icon="file-text" tag="SHIPPING LINE" text="Delivery order (DO)" />

      <HfOverlay clip="e02-hook" from={0} durationInFrames={sec(4)} fallback={null} />
      <HfOverlay clip="e02-pib" from={sec(10)} durationInFrames={sec(9)} fallback={null} />
      <HfOverlay clip="e02-lanes" from={sec(19)} durationInFrames={sec(9)} fallback={null} />
      <HfOverlay clip="e02-stuck" from={sec(T.stuck)} durationInFrames={sec(5)} fallback={null} />
      <HfOverlay clip="e02-door" from={sec(T.sweep1)} durationInFrames={sec(9)} fallback={null} />
      <HfOverlay clip="e02-logo" from={sec(T.logo)} durationInFrames={sec(ep.dur - T.logo)} fallback={null} />

      <Captions beats={beats} accent={BRAND.orange} ep="e02" theme="dark" />
      <BrandFrame theme="dark" endCardFrom={sec(T.cta + 0.2)} />
      <SoundLayer ep="e02" sfx={sfx} />
      {/* level is read so the camera is part of the render deps */}
      <div data-level={level.toFixed(2)} style={{ display: "none" }} />
    </AbsoluteFill>
  );
};
