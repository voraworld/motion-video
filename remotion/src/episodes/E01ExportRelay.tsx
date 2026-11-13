import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { asset, beatsOf, getEpisode, MANIFEST, sec } from "../data";
import { BrandFrame } from "../brand/BrandFrame";
import { BRAND, FONT_DISPLAY, ZONES } from "../brand/tokens";
import { Captions } from "../shared/Captions";
import { EndCard } from "../shared/EndCard";
import { HfOverlay } from "../shared/HfOverlay";
import { Flash, Shake } from "../shared/Impact";
import { Slam } from "../shared/Slam";
import { SfxCue, SoundLayer } from "../shared/SoundLayer";

/**
 * E01 · The Export Relay (55 s)
 * One long shot: the camera dollies along a panorama of seven stations on cream paper. The cargo is a
 * relay baton riding the orange track under the stations; at each handoff a split-flap counter flips and
 * the baton morphs: pill → carton → container → ship hull → B/L sheet → map pin → UGC logo (end card).
 * H clips (HyperFrames): e01-hook (0–4 s), e01-lanes (customs lanes), e01-rolled (33–38 s), e01-team (38–48 s).
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const CREAM = "#FCEFE2";
const INK = BRAND.ink;
const TRACK_Y = 1085;
const STATION_Y = 830;
const SPACING = 1100;

/** Time (s) a word starts inside a beat's VO, from the real VO duration (falls back to the beat length). */
const ep = getEpisode("E01");
const beats = beatsOf(ep);
const vo = MANIFEST.voBeats?.e01 ?? [];
const wordAt = (beatIndex: number, word: string) => {
  const b = ep.beats[beatIndex];
  const words = b[4].split(/\s+/);
  const idx = Math.max(0, words.findIndex((w) => w.replace(/[^\w/]/g, "").toLowerCase() === word.toLowerCase()));
  const dur = vo.find((v) => v.start === b[0])?.duration ?? b[1] - b[0] - 0.5;
  return b[0] + (dur * idx) / words.length;
};

const T = {
  booking: 4.0,
  stuffed: 10.0,
  trucked: wordAt(2, "Three"),
  customs: 17.0,
  green: wordAt(3, "Green"),
  loaded: 26.0,
  bl: wordAt(4, "bill"),
  arrived: wordAt(4, "Six"),
  delivered: wordAt(4, "Seven"),
  stuck: 33.0,
  ugc: 38.0,
  cta: 48.0,
};

type Station = { key: string; img: string | null; w: number; h: number };
const STATIONS: Station[] = [
  { key: "booking", img: null, w: 0, h: 0 },
  { key: "stuffing", img: asset("e01", "warehouse-stuffing-station"), w: 900, h: 400 },
  { key: "truck", img: asset("e01", "container-truck"), w: 900, h: 400 },
  { key: "customs", img: asset("e01", "customs-checkpoint"), w: 900, h: 400 },
  { key: "crane", img: asset("e01", "terminal-crane"), w: 820, h: 410 },
  { key: "ship", img: asset("e01", "container-ship"), w: 980, h: 400 },
  { key: "buyer", img: asset("e01", "buyer-warehouse"), w: 900, h: 400 },
];
const stationX = (i: number) => 540 + i * SPACING;

/** Split-flap steps: number, title, time. */
const STEPS = [
  { at: T.booking, n: "01", title: "BOOKING · CUT-OFF SET", station: 0 },
  { at: T.stuffed, n: "02", title: "STUFFED + WEIGHED (VGM)", station: 1 },
  { at: T.trucked, n: "03", title: "TRUCKED", station: 2 },
  { at: T.customs, n: "04", title: "PEB → NPE", station: 3 },
  { at: T.loaded, n: "05", title: "LOADED · B/L", station: 4 },
  { at: T.arrived, n: "06", title: "ARRIVED", station: 5 },
  { at: T.delivered, n: "07", title: "DELIVERED", station: 6 },
];

// ---------- camera ----------
const STRIP_SCALE = 0.2;
const RUN_FROM = T.ugc + 1.3;
const RUN_TO = T.cta - 1.4;
/** World x of the baton while it runs the whole relay in the UGC beat. */
const runX = (t: number) => interpolate(t, [RUN_FROM, RUN_TO], [stationX(0), stationX(6)], { ...clamp, easing: Easing.inOut(Easing.cubic) });
const STRIP_MIN = stationX(0) + 2000;
const STRIP_MAX = stationX(6) - 2000;
const camAt = (t: number) => {
  if (t >= RUN_FROM) return { x: Math.min(STRIP_MAX, Math.max(STRIP_MIN, runX(t))), s: STRIP_SCALE, y: 10 };
  // [time, centerX (world), scale, yShift]
  const keys: [number, number, number, number][] = [[0, stationX(0), 1, 0]];
  for (const s of STEPS.slice(1)) {
    const prev = keys[keys.length - 1];
    keys.push([s.at - 0.3, prev[1], 1, 0], [s.at + 0.6, stationX(s.station), 1, 0]);
  }
  const last = keys[keys.length - 1];
  keys.push([T.stuck, last[1], 1, 0], [T.stuck + 0.35, (stationX(4) + stationX(5)) / 2, 0.72, 0]);
  keys.push([T.ugc, (stationX(4) + stationX(5)) / 2, 0.72, 0], [RUN_FROM, STRIP_MIN, STRIP_SCALE, 10]);
  const ts = keys.map((k) => k[0]);
  const ease = Easing.bezier(0.6, 0, 0.3, 1);
  return {
    x: interpolate(t, ts, keys.map((k) => k[1]), { ...clamp, easing: ease }),
    s: interpolate(t, ts, keys.map((k) => k[2]), { ...clamp, easing: ease }),
    y: interpolate(t, ts, keys.map((k) => k[3]), { ...clamp, easing: ease }),
  };
};
/** World → screen. */
const toScreen = (cam: { x: number; s: number; y: number }, wx: number, wy: number) => ({
  x: (wx - cam.x) * cam.s + 540,
  y: (wy - STATION_Y) * cam.s + STATION_Y + cam.y,
});

// ---------- baton / morph token ----------
type Shape = { w: number; h: number; r: [number, number, number, number]; rot: number; clip: number[]; c1: string; c2: string; ribs: number; lines: number };
const RECT = [0, 0, 100, 0, 100, 100, 0, 100];
const SHAPES: Record<string, Shape> = {
  pill: { w: 170, h: 56, r: [50, 50, 50, 50], rot: -18, clip: RECT, c1: "#F26A1F", c2: "#F7934A", ribs: 0, lines: 0 },
  carton: { w: 104, h: 92, r: [6, 6, 6, 6], rot: 0, clip: RECT, c1: "#C99A63", c2: "#B98650", ribs: 0, lines: 0 },
  container: { w: 200, h: 84, r: [4, 4, 4, 4], rot: 0, clip: RECT, c1: "#D63A1F", c2: "#F5A623", ribs: 1, lines: 0 },
  hull: { w: 210, h: 74, r: [3, 3, 3, 3], rot: 0, clip: [0, 0, 100, 0, 88, 100, 12, 100], c1: "#2B2B2E", c2: "#45454A", ribs: 0, lines: 0 },
  sheet: { w: 86, h: 112, r: [6, 6, 6, 6], rot: -6, clip: RECT, c1: "#FFFFFF", c2: "#F2F2F2", ribs: 0, lines: 1 },
  pin: { w: 92, h: 92, r: [50, 50, 50, 0], rot: -45, clip: RECT, c1: "#F26A1F", c2: "#D63A1F", ribs: 0, lines: 0 },
};
const MORPHS: [number, keyof typeof SHAPES][] = [
  [0, "pill"],
  [T.stuffed, "carton"],
  [T.trucked, "container"],
  [T.loaded, "hull"],
  [T.bl, "sheet"],
  [T.arrived, "pin"],
  [T.stuck, "container"],
  [T.ugc, "pill"],
  [T.cta - 1.2, "pin"],
];
const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a: string, b: string, k: number) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",")})`;
};
const shapeAt = (t: number): Shape & { k: number } => {
  let i = 0;
  while (i < MORPHS.length - 1 && t >= MORPHS[i + 1][0]) i++;
  const cur = SHAPES[MORPHS[i][1]];
  const prev = SHAPES[MORPHS[Math.max(0, i - 1)][1]];
  const k = i === 0 ? 1 : interpolate(t, [MORPHS[i][0], MORPHS[i][0] + 0.35], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const lerp = (a: number, b: number) => a + (b - a) * k;
  return {
    w: lerp(prev.w, cur.w),
    h: lerp(prev.h, cur.h),
    r: prev.r.map((v, j) => lerp(v, cur.r[j])) as Shape["r"],
    rot: lerp(prev.rot, cur.rot),
    clip: prev.clip.map((v, j) => lerp(v, cur.clip[j])),
    c1: mixHex(prev.c1, cur.c1, Math.min(1, Math.max(0, k))),
    c2: mixHex(prev.c2, cur.c2, Math.min(1, Math.max(0, k))),
    ribs: lerp(prev.ribs, cur.ribs),
    lines: lerp(prev.lines, cur.lines),
    k,
  };
};

const Token: React.FC<{ x: number; y: number; scale: number; t: number; extraRot?: number }> = ({ x, y, scale, t, extraRot = 0 }) => {
  const s = shapeAt(t);
  const pop = interpolate(s.k, [0, 0.5, 1], [1, 1.25, 1], clamp);
  const clip = `polygon(${[0, 1, 2, 3].map((i) => `${s.clip[i * 2]}% ${s.clip[i * 2 + 1]}%`).join(",")})`;
  return (
    <div
      style={{
        position: "absolute",
        left: x - s.w / 2,
        top: y - s.h / 2,
        width: s.w,
        height: s.h,
        scale: String(scale * pop),
        rotate: `${s.rot + extraRot}deg`,
        filter: "drop-shadow(0 10px 14px rgba(43,28,21,.35))",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: s.r.map((v) => `${v}%`).join(" "),
          clipPath: clip,
          background: `linear-gradient(90deg, ${s.c1}, ${s.c2})`,
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, opacity: s.ribs, background: "repeating-linear-gradient(90deg, rgba(0,0,0,.16) 0 4px, transparent 4px 13px)" }} />
        <div style={{ position: "absolute", left: "16%", right: "16%", top: "18%", bottom: "18%", opacity: s.lines, background: "repeating-linear-gradient(180deg, rgba(43,28,21,.35) 0 4px, transparent 4px 14px)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,0) 55%)" }} />
      </div>
    </div>
  );
};

// ---------- split-flap counter ----------
const FlapDigit: React.FC<{ digit: string; changedAt: number; frame: number; seed: number }> = ({ digit, changedAt, frame, seed }) => {
  const d = frame - changedAt;
  const spinning = d >= 0 && d < 8;
  const shown = spinning ? String((seed * 7 + d * 3) % 10) : digit;
  const flip = spinning ? (d % 2) / 2 : 1;
  return (
    <div style={{ position: "relative", width: 112, height: 150, borderRadius: 14, background: "linear-gradient(180deg,#2C2C2F 0 50%,#1C1C1E 50% 100%)", boxShadow: "0 14px 30px rgba(43,28,21,.35)", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: FONT_DISPLAY, fontSize: 124, lineHeight: 1, color: "#FFF4E8" }}>{shown}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 75, background: "linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,0))", transformOrigin: "50% 100%", transform: `rotateX(${-90 * (1 - flip)}deg)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 73, height: 4, background: "rgba(0,0,0,.7)" }} />
    </div>
  );
};

const Counter: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame / 30;
  let idx = -1;
  STEPS.forEach((s, i) => {
    if (t >= s.at) idx = i;
  });
  if (idx < 0 || t >= T.stuck) return null;
  const step = STEPS[idx];
  const changed = sec(step.at);
  const appear = interpolate(frame, [sec(T.booking), sec(T.booking) + 6], [0, 1], clamp);
  const leave = interpolate(frame, [sec(T.stuck) - 6, sec(T.stuck)], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: ZONES.contentTop + 10, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: appear * leave }}>
      <div style={{ display: "flex", gap: 12, scale: String(0.9 + 0.1 * appear) }}>
        <FlapDigit digit={step.n[0]} changedAt={changed} frame={frame} seed={idx} />
        <FlapDigit digit={step.n[1]} changedAt={changed} frame={frame} seed={idx + 3} />
      </div>
      <Sequence from={changed} durationInFrames={sec(T.stuck) - changed} layout="none" name={`title ${step.n}`}>
        <div style={{ width: ZONES.rightRail - ZONES.sideSafe }}>
          <Slam key={step.n} lines={[step.title]} color={INK} accent={BRAND.ember} accentLine={0} size={58} shadow="none" />
        </div>
      </Sequence>
    </div>
  );
};

// ---------- the booking clock (station 0) ----------
const Clock: React.FC<{ t: number }> = ({ t }) => {
  const sweep = interpolate(t, [T.booking, T.stuffed - 0.5], [-150, -12], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", left: -200, top: -200, width: 400, height: 400 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#FFFFFF", border: `14px solid ${BRAND.orange}`, boxShadow: "0 24px 50px rgba(43,28,21,.22)" }} />
      <div style={{ position: "absolute", inset: 14, borderRadius: "50%", background: `conic-gradient(from -14deg, ${BRAND.ember} 0 28deg, transparent 28deg)`, opacity: 0.85 }} />
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: 197, top: 30, width: 6, height: 26, borderRadius: 3, background: INK, transformOrigin: "3px 170px", rotate: `${i * 30}deg` }} />
      ))}
      <div style={{ position: "absolute", left: 194, top: 70, width: 12, height: 134, borderRadius: 6, background: INK, transformOrigin: "6px 130px", rotate: `${sweep}deg` }} />
      <div style={{ position: "absolute", left: 182, top: 182, width: 36, height: 36, borderRadius: "50%", background: BRAND.orange }} />
    </div>
  );
};

// ---------- the panorama world ----------
const World: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame / 30;
  const cam = camAt(t);
  const prev = camAt((frame - 1) / 30);
  const speed = Math.abs(cam.x - prev.x) * cam.s + Math.abs(cam.s - prev.s) * 900;
  const blur = Math.min(14, speed * 0.09);
  const active = STEPS.reduce((a, s, i) => (t >= s.at ? s.station : a), 0);
  const shipOut = interpolate(t, [T.stuck + 0.6, T.stuck + 3.6], [0, 1300], { ...clamp, easing: Easing.in(Easing.cubic) });
  const truckIn = interpolate(t, [T.trucked - 0.2, T.trucked + 0.9], [-260, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const bob = Math.sin(frame / 9) * 4;
  const glow = t < RUN_FROM ? 0 : (runX(t) - (stationX(0) - 300)) / (stationX(6) - stationX(0) + 600);
  const worldLeft = stationX(0) - 700;
  const worldRight = stationX(6) + 700;
  return (
    <AbsoluteFill
      style={{
        transformOrigin: "0 0",
        translate: `${540 - cam.x * cam.s}px ${STATION_Y - STATION_Y * cam.s + cam.y}px`,
        scale: String(cam.s),
        filter: blur > 0.6 ? `blur(${blur}px)` : undefined,
      }}
    >
      {/* Ground: faint isometric grid along the whole panorama */}
      <div
        style={{
          position: "absolute",
          left: worldLeft,
          width: worldRight - worldLeft,
          top: STATION_Y - 600,
          height: 1200,
          background:
            "repeating-linear-gradient(30deg, transparent 0 46px, rgba(214,58,31,.07) 46px 48px), repeating-linear-gradient(150deg, transparent 0 46px, rgba(214,58,31,.07) 46px 48px)",
          WebkitMaskImage: "linear-gradient(180deg, transparent, #000 25%, #000 75%, transparent)",
        }}
      />
      {/* Relay track */}
      <div style={{ position: "absolute", left: stationX(0) - 300, width: stationX(6) - stationX(0) + 600, top: TRACK_Y - 5, height: 10, borderRadius: 10, background: `repeating-linear-gradient(90deg, ${BRAND.orange} 0 38px, transparent 38px 60px)`, opacity: 0.55 }} />
      <div style={{ position: "absolute", left: stationX(0) - 300, width: (stationX(6) - stationX(0) + 600) * glow, top: TRACK_Y - 9, height: 18, borderRadius: 18, background: `linear-gradient(90deg, ${BRAND.ember}, ${BRAND.orange})`, boxShadow: `0 0 40px ${BRAND.orange}` }} />
      {STATIONS.map((st, i) => {
        const x = stationX(i);
        const on = i === active && t < T.stuck;
        const lift = on ? interpolate(t - (STEPS.find((s) => s.station === i)?.at ?? 0), [0, 0.5], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) }) : 1;
        const dx = st.key === "ship" ? shipOut : st.key === "truck" ? truckIn : 0;
        const dy = st.key === "ship" ? bob : 0;
        return (
          <div key={st.key} style={{ position: "absolute", left: x + dx, top: STATION_Y + dy, scale: String(0.94 + 0.06 * lift) }}>
            {/* soft sun behind each station */}
            <div style={{ position: "absolute", left: -260, top: -300, width: 520, height: 520, borderRadius: "50%", background: `radial-gradient(circle, ${BRAND.orange}55 0%, ${BRAND.orange}00 68%)` }} />
            {st.key === "booking" ? (
              <Clock t={t} />
            ) : st.img ? (
              <Img src={staticFile(st.img)} style={{ position: "absolute", left: -st.w / 2, top: -st.h / 2, width: st.w, height: st.h, objectFit: "contain", filter: "drop-shadow(0 22px 26px rgba(43,28,21,.22))" }} />
            ) : (
              <div style={{ position: "absolute", left: -st.w / 2, top: -st.h / 2, width: st.w, height: st.h, border: "4px dashed #D63A1F", display: "grid", placeItems: "center", fontFamily: FONT_DISPLAY, color: "#D63A1F" }}>MISSING ASSET</div>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const E01ExportRelay: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const cam = camAt(t);
  const cta = beats[beats.length - 1];

  // Baton/token position: screen-centre on the track while the camera travels; runs along the strip in the UGC beat.
  const tokenWorldX = t < T.ugc ? cam.x : t < RUN_FROM ? interpolate(t, [T.ugc, RUN_FROM], [cam.x, stationX(0)], clamp) : runX(t);
  const tokenScreen = toScreen(cam, tokenWorldX, TRACK_Y);
  const fall = interpolate(t, [T.stuck + 0.3, T.stuck + 0.8, T.stuck + 1.0, T.stuck + 1.15], [0, 150, 120, 150], clamp);
  const fallRot = interpolate(t, [T.stuck + 0.3, T.stuck + 1.0], [0, 24], clamp);
  const tokenScale = t >= T.ugc ? interpolate(t, [T.ugc, RUN_FROM], [0.85, 0.7], clamp) : cam.s < 1 ? 0.85 : 1;

  // Hook: baton tossed across the black frame, freezing on "DROP ONE?" (2.2 s), then becoming the token.
  const tossK = interpolate(t, [0.55, 2.2], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const batonX = interpolate(tossK, [0, 1], [-320, 540]);
  const batonY = interpolate(tossK, [0, 1], [1500, 1030]) - Math.sin(tossK * Math.PI) * 260;
  const batonRot = interpolate(tossK, [0, 1], [-260, -18]);
  const iris = interpolate(t, [3.55, 4.25], [0, 1500], { ...clamp, easing: Easing.in(Easing.cubic) });
  const batonToToken = interpolate(t, [3.7, 4.1], [0, 1], clamp);

  const hits = [sec(0.45), sec(2.2), sec(T.stuck + 0.8), sec(T.ugc)];
  const flapChanges = STEPS.map((s) => sec(s.at));
  const sfx: SfxCue[] = [
    // clock ticks while the booking cut-off clock runs
    ...Array.from({ length: 11 }, (_, i) => ({ at: sec(T.booking + 0.4 + i * 0.5), name: "tick", volume: 0.3 })),
    { at: sec(0.45), name: "boom", volume: 0.7 },
    { at: sec(0.6), name: "whoosh", volume: 0.5 },
    { at: sec(2.2), name: "stamp", volume: 0.55 },
    ...flapChanges.flatMap((f) => [0, 2, 4, 6].map((d) => ({ at: f + d, name: "tick", volume: 0.4 }))),
    ...STEPS.slice(1).map((s) => ({ at: sec(s.at - 0.3), name: "whoosh", volume: 0.35 })),
    { at: sec(T.stuck), name: "glitch", volume: 0.7 },
    { at: sec(T.stuck + 0.8), name: "crunch", volume: 0.6 },
    { at: sec(T.ugc + 0.2), name: "whoosh", volume: 0.5 },
    { at: cta.from, name: "sonic-logo", volume: 0.8 },
  ];

  return (
    <AbsoluteFill style={{ background: "#0F0F10" }}>
      <Shake hits={hits}>
        {/* The world opens from the baton with an iris at the end of the hook */}
        <AbsoluteFill style={{ clipPath: `circle(${iris}px at 540px 1030px)`, background: `radial-gradient(120% 70% at 50% 45%, #FFF7EE 0%, ${CREAM} 55%, #F6DCC4 100%)` }}>
          <World frame={frame} />
          {t >= 3.7 ? (
            <Token x={tokenScreen.x} y={tokenScreen.y + (t >= T.stuck && t < T.ugc ? fall : 0)} scale={tokenScale * batonToToken} t={t} extraRot={t >= T.stuck && t < T.ugc ? fallRot : 0} />
          ) : null}
          <Counter frame={frame} />
        </AbsoluteFill>
      </Shake>

      <HfOverlay
        clip="e01-hook"
        from={0}
        durationInFrames={sec(4)}
        fallback={
          <div style={{ position: "absolute", top: ZONES.contentTop + 20, left: ZONES.sideSafe, width: ZONES.rightRail - ZONES.sideSafe }}>
            <Slam lines={["7 HANDOFFS.", "DROP ONE?"]} lineStarts={[14, 66]} color="#FFFFFF" accent={BRAND.orange} accentLine={1} size={100} exitAt={110} />
          </div>
        }
      />
      {/* Hook baton (in front of the split-flap board) (GPT asset) */}
      {t < 4.1 ? (
        <Img
          src={staticFile(asset("e01", "baton") ?? "")}
          style={{
            position: "absolute",
            width: 420,
            left: batonX - 210,
            top: batonY - 140,
            rotate: `${batonRot}deg`,
            opacity: 1 - batonToToken,
            filter: t < 2.2 ? `blur(${Math.max(0, 6 - tossK * 8)}px) drop-shadow(0 20px 30px rgba(0,0,0,.5))` : "drop-shadow(0 20px 30px rgba(0,0,0,.5))",
            translate: t >= 2.2 ? `0px ${Math.sin((t - 2.2) * 5) * 4}px` : undefined,
          }}
        />
      ) : null}
      <HfOverlay clip="e01-lanes" from={sec(T.green) - 3} durationInFrames={sec(T.loaded) - sec(T.green) + 3} fallback={null} />
      <HfOverlay
        clip="e01-rolled"
        from={sec(T.stuck)}
        durationInFrames={sec(T.ugc - T.stuck)}
        fallback={
          <div style={{ position: "absolute", top: ZONES.contentTop + 30, left: ZONES.sideSafe, width: ZONES.rightRail - ZONES.sideSafe }}>
            <Slam lines={["ROLLED."]} color={BRAND.ember} size={180} shadow="none" />
          </div>
        }
      />
      <HfOverlay
        clip="e01-team"
        from={sec(T.ugc)}
        durationInFrames={sec(T.cta - T.ugc)}
        fallback={
          <div style={{ position: "absolute", top: ZONES.contentTop + 20, left: ZONES.sideSafe, width: ZONES.rightRail - ZONES.sideSafe }}>
            <Slam lines={["ONE TEAM.", "ALL 7 HANDOFFS."]} color={INK} accent={BRAND.orange} accentLine={1} size={96} shadow="none" />
          </div>
        }
      />
      <Flash hits={[sec(0.45), sec(T.stuck + 0.8)]} peak={0.35} />

      <Sequence from={sec(T.cta)} name="End card (pin → logo)">
        <EndCard cta={beats[beats.length - 1].lines} morphColor={BRAND.orange} origin={{ x: tokenScreen.x, y: tokenScreen.y, size: 92 }} />
      </Sequence>
      <Captions beats={beats} accent={BRAND.orange} ep="e01" />
      <Sequence durationInFrames={sec(4.1)} name="Brand frame (dark, hook)" layout="none">
        <BrandFrame theme="dark" />
      </Sequence>
      <Sequence from={sec(4.1)} name="Brand frame (light)" layout="none">
        <BrandFrame theme="light" endCardFrom={sec(T.cta) - sec(4.1)} />
      </Sequence>
      <SoundLayer ep="e01" sfx={sfx} />
    </AbsoluteFill>
  );
};
