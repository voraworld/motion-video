import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { asset, beatsOf, getEpisode, sec } from "../data";
import { BrandFrame } from "../brand/BrandFrame";
import { BRAND, FONT_MONO, FONT_SERIF } from "../brand/tokens";
import { Captions } from "../shared/Captions";
import { HfOverlay } from "../shared/HfOverlay";
import { Shake } from "../shared/Impact";
import { PHOSPHOR, PhosphorName } from "../shared/phosphor";
import { SfxCue, SoundLayer } from "../shared/SoundLayer";
import MAP from "../generated/e03-map.json";

/**
 * E03 · Jakarta to Sorong (50 s) — paper navigation chart.
 *
 * One route line crosses the real archipelago (Natural Earth 1:50m coastlines, scripts/e03-map.mjs) and the
 * vehicle changes shape at every mode switch: truck → ship → truck → destination pin → UGC logo.
 * The camera is a chart camera: it zooms from orbit onto Jakarta, dives to street level (tilted "nav" view that
 * turns with the truck), pulls out to the whole archipelago for the sea leg, dives into Sorong, and pulls out again.
 *
 * Shots: hook orbit slam + route tear · Jakarta streets (FTL/LTL cards) · open sea with the ship sailing in an
 * elevation strip (FCL/LCL cards) · Sorong streets with the port town popping up from the chart · Zero ODOL ·
 * whole plan (plane arc for domestic air) · end card.
 *
 * R (Remotion): chart, camera, route, vehicle morphs, ship strip, pop-up port, LAST MILE, handoff chain, end card.
 * H (HyperFrames): e03-hook, e03-ftl, e03-fcl, e03-odol, e03-ugc, e03-logo.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ep = getEpisode("E03");
const beats = beatsOf(ep);
const A = (name: string) => staticFile(asset("e03", name) ?? `assets/e03/${name}.png`);
const io = Easing.bezier(0.65, 0, 0.35, 1);
const INK = BRAND.ink;
const ORANGE = BRAND.orange;
const PAPER = "#FBF3E4";

type Pt = { x: number; y: number };
const pt = (p: number[]): Pt => ({ x: p[0], y: p[1] });

// ── Route geometry ──────────────────────────────────────────────────────────────────────────────────────
type Poly = { pts: Pt[]; cum: number[]; len: number; d: string };
const poly = (raw: number[][]): Poly => {
  const pts = raw.map(pt);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, len: cum[cum.length - 1], d: "M" + pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("L") };
};
const at = (pl: Poly, f: number): Pt & { a: number } => {
  const target = Math.max(0, Math.min(1, f)) * pl.len;
  let i = 1;
  while (i < pl.cum.length - 1 && pl.cum[i] < target) i++;
  const seg = pl.cum[i] - pl.cum[i - 1] || 1;
  const k = (target - pl.cum[i - 1]) / seg;
  const a = pl.pts[i - 1];
  const b = pl.pts[i];
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, a: Math.atan2(b.y - a.y, b.x - a.x) };
};
const JKT = poly(MAP.jktLeg);
const SEA = poly(MAP.sea);
const SRG = poly(MAP.srgLeg);
const FULL_D = `${JKT.d}${SEA.d.replace(/^M/, "L")}${SRG.d.replace(/^M/, "L")}`;
const PLACES = { jakarta: pt(MAP.places.jakarta), priok: pt(MAP.places.priok), sorong: pt(MAP.places.sorong), door: pt(MAP.places.door) };
const OVER = { x: (PLACES.jakarta.x + PLACES.sorong.x) / 2, y: 0 }; // overview centre
OVER.y = (Math.min(...SEA.pts.map((p) => p.y)) + Math.max(...SEA.pts.map((p) => p.y))) / 2;
// Domestic air: an arc from Jakarta to Sorong, bowing north.
const AIR_C = { x: OVER.x, y: OVER.y - 520 };
const airAt = (f: number) => {
  const a = PLACES.jakarta;
  const b = PLACES.sorong;
  const u = 1 - f;
  const x = u * u * a.x + 2 * u * f * AIR_C.x + f * f * b.x;
  const y = u * u * a.y + 2 * u * f * AIR_C.y + f * f * b.y;
  const dx = 2 * u * (AIR_C.x - a.x) + 2 * f * (b.x - AIR_C.x);
  const dy = 2 * u * (AIR_C.y - a.y) + 2 * f * (b.y - AIR_C.y);
  return { x, y, a: Math.atan2(dy, dx) };
};
const AIR_D = `M${PLACES.jakarta.x} ${PLACES.jakarta.y}Q${AIR_C.x} ${AIR_C.y} ${PLACES.sorong.x} ${PLACES.sorong.y}`;

// ── Timeline (VO word starts from whisper timestamps on the generated VO) ────────────────────────────────
const T = {
  slam: 0.5,
  tear: [0.95, 1.95] as const,
  dive1: [3.55, 4.6] as const,
  jkt: [4.6, 13.7] as const,
  ftl: 5.54,
  ltl: 8.08,
  out1: [13.7, 15.2] as const,
  toShip: 14.0,
  sea: [15.0, 23.4] as const,
  fcl: 15.71,
  lcl: 18.31,
  dive2: [23.4, 24.6] as const,
  toTruck: 24.05,
  srg: [24.5, 25.7] as const,
  door: 25.75,
  handoff: [26.3, 27.29] as const,
  stuck: 30,
  noTolerance: 33.12,
  out2: [36.0, 37.4] as const,
  everyLeg: 37.48,
  legFtl: 38.57,
  legLtl: 39.11,
  air: 39.68,
  legFcl: 42.0,
  legLcl: 42.72,
  pinToG: [43.9, 44.7] as const,
  logo: 44.5,
};

// ── Chart camera ────────────────────────────────────────────────────────────────────────────────────────
type Cam = { c: Pt; s: number; tilt: number; roll: number; fy: number };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  c: { x: lerp(a.c.x, b.c.x, k), y: lerp(a.c.y, b.c.y, k) },
  s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), k)),
  tilt: lerp(a.tilt, b.tilt, k),
  roll: lerp(a.roll, b.roll, k),
  fy: lerp(a.fy, b.fy, k),
});
const STREET = 72;
const OVERVIEW = 0.27;
const SEA_S = 0.48;
const truckJ = (t: number) => at(JKT, interpolate(t, T.jkt, [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) }));
const ship = (t: number) => at(SEA, interpolate(t, T.sea, [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) }));
const truckS = (t: number) => at(SRG, interpolate(t, T.srg, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }));
/** Heading roll so the vehicle drives "up" the screen at street level (smoothed). */
const headingRoll = (f: (t: number) => Pt & { a: number }, t: number) => {
  let sx = 0;
  let sy = 0;
  for (let k = -3; k <= 3; k++) {
    const p = f(t + k * 0.25);
    sx += Math.cos(p.a);
    sy += Math.sin(p.a);
  }
  return (-(Math.atan2(sy, sx) * 180) / Math.PI) - 90;
};

const camera = (t: number): Cam => {
  const orbit: Cam = { c: { x: OVER.x - 300, y: OVER.y }, s: 0.055, tilt: 0, roll: -32, fy: 980 };
  const jkt: Cam = { c: PLACES.jakarta, s: 9, tilt: 0, roll: 0, fy: 980 };
  const over: Cam = { c: OVER, s: OVERVIEW, tilt: 22, roll: 0, fy: 1040 };
  const jStart: Cam = { c: truckJ(T.jkt[0]), s: STREET, tilt: 52, roll: headingRoll(truckJ, T.jkt[0]), fy: 1260 };
  if (t < T.slam) return mixCam(orbit, jkt, Easing.bezier(0.75, 0, 0.9, 0.3)(t / T.slam));
  if (t < 0.85) return mixCam(jkt, { ...jkt, s: 8 }, Easing.out(Easing.back(2))(prog(t, T.slam, 0.85)));
  if (t < 2.1) return mixCam({ ...jkt, s: 8 }, over, io(prog(t, 0.85, 2.1)));
  if (t < T.dive1[0]) return mixCam(over, { ...over, s: OVERVIEW * 1.06 }, prog(t, 2.1, T.dive1[0]));
  if (t < T.dive1[1]) return mixCam({ ...over, s: OVERVIEW * 1.06 }, jStart, Easing.bezier(0.6, 0, 0.2, 1)(prog(t, ...T.dive1)));
  if (t < T.out1[0]) {
    const p = truckJ(t);
    const breathe = 1 - 0.25 * Math.sin(Math.PI * prog(t, 7.6, 10.8)) * (t > 7.6 && t < 10.8 ? 1 : 0);
    return { c: p, s: STREET * breathe, tilt: 52, roll: headingRoll(truckJ, t), fy: 1260 };
  }
  const sea0: Cam = { c: ship(T.sea[0]), s: SEA_S, tilt: 30, roll: 0, fy: 1040 };
  if (t < T.out1[1]) {
    const jEnd: Cam = { c: truckJ(T.out1[0]), s: STREET, tilt: 52, roll: headingRoll(truckJ, T.out1[0]), fy: 1260 };
    // Scale zoom: streets → whole archipelago (overshoots wide, then settles on the sea leg)
    const k = prog(t, ...T.out1);
    const wide: Cam = { ...over, s: 0.2, tilt: 18 };
    return k < 0.65 ? mixCam(jEnd, wide, io(k / 0.65)) : mixCam(wide, sea0, io((k - 0.65) / 0.35));
  }
  const sStart: Cam = { c: truckS(T.srg[0]), s: STREET, tilt: 52, roll: headingRoll(truckS, T.srg[0]), fy: 1430 };
  if (t < T.dive2[0]) return { c: ship(t), s: SEA_S, tilt: 30, roll: 0, fy: 1040 };
  if (t < T.dive2[1]) {
    const k = prog(t, ...T.dive2);
    const wide: Cam = { c: { x: lerp(ship(T.dive2[0]).x, PLACES.sorong.x, 0.6), y: lerp(ship(T.dive2[0]).y, PLACES.sorong.y, 0.6) }, s: 0.32, tilt: 20, roll: 0, fy: 1100 };
    return k < 0.3 ? mixCam({ c: ship(T.dive2[0]), s: SEA_S, tilt: 30, roll: 0, fy: 1040 }, wide, io(k / 0.3)) : mixCam(wide, sStart, Easing.bezier(0.6, 0, 0.2, 1)((k - 0.3) / 0.7));
  }
  const doorCam: Cam = { c: truckS(T.srg[1]), s: STREET, tilt: 52, roll: headingRoll(truckS, T.srg[1]), fy: 1430 };
  if (t < T.out2[0]) {
    if (t < T.srg[1]) return { c: truckS(t), s: STREET, tilt: 52, roll: headingRoll(truckS, t), fy: 1430 };
    // slow orbit around the door, then a creeping push during the Zero ODOL beat
    return { ...doorCam, roll: doorCam.roll + 14 * io(prog(t, T.srg[1], T.stuck)), s: STREET * (1 + 0.15 * prog(t, T.stuck, T.out2[0])) };
  }
  const ugc: Cam = { c: { x: OVER.x, y: OVER.y - 120 }, s: OVERVIEW, tilt: 28, roll: 0, fy: 1220 };
  const doorEnd: Cam = { ...doorCam, roll: doorCam.roll + 14, s: STREET * 1.15 };
  if (t < T.out2[1]) return mixCam(doorEnd, ugc, io(prog(t, ...T.out2)));
  return { ...ugc, s: OVERVIEW * (1 + 0.05 * prog(t, T.out2[1], T.pinToG[0])), roll: -3 * prog(t, T.out2[1], T.pinToG[0]) };
};
function prog(t: number, a: number, b: number) {
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}

/** World → screen (before tilt), for things placed inside the roll layer. */
const toScreen = (cam: Cam, p: Pt) => ({ x: 540 + (p.x - cam.c.x) * cam.s, y: cam.fy + (p.y - cam.c.y) * cam.s });

// ── Pieces ──────────────────────────────────────────────────────────────────────────────────────────────
const Icon: React.FC<{ name: PhosphorName; size: number; color?: string }> = ({ name, size, color = "#fff" }) => (
  <svg viewBox="0 0 256 256" width={size} height={size} fill={color} aria-hidden>
    {PHOSPHOR[name].map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

const NS = { vectorEffect: "non-scaling-stroke" as const };

/** The chart itself (world coordinates). */
const ChartWorld: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const streetsOn = interpolate(Math.log(cam.s), [Math.log(9), Math.log(26)], [0, 1], clamp);
  const routeTear = interpolate(t, T.tear, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const planned = interpolate(t, [T.dive1[0], T.dive1[0] + 0.6], [1, 0.38], clamp);
  const pj = interpolate(t, T.jkt, [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const ps = interpolate(t, T.sea, [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const pr = interpolate(t, T.srg, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const glowAll = interpolate(t, [T.everyLeg - 0.2, T.everyLeg + 0.6], [0, 1], clamp);
  const air = interpolate(t, [T.air, T.air + 1.6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const ants = -t * 0.06;
  const city = (c: (typeof MAP.cities)["jakarta"]) => (
    <g opacity={streetsOn} clipPath="url(#e03-land)">
      <path d={c.minor} fill="none" stroke={INK} strokeOpacity={0.28} strokeWidth={1.4} style={NS} />
      <path d={c.major} fill="none" stroke={INK} strokeOpacity={0.55} strokeWidth={4} style={NS} />
      <path d={c.major} fill="none" stroke={PAPER} strokeWidth={2} style={NS} />
    </g>
  );
  return (
    <svg width={MAP.W} height={MAP.H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        <clipPath id="e03-land">
          <path d={MAP.land} />
        </clipPath>
      </defs>
      <path d={MAP.graticule} fill="none" stroke={INK} strokeOpacity={0.14} strokeWidth={1} style={NS} />
      {/* Chart waterlines around the coast */}
      <path d={MAP.land} fill="none" stroke={INK} strokeOpacity={0.05} strokeWidth={26} style={NS} />
      <path d={MAP.land} fill="none" stroke={INK} strokeOpacity={0.07} strokeWidth={12} style={NS} />
      <path d={MAP.land} fill="rgba(214,170,108,.42)" stroke={INK} strokeOpacity={0.75} strokeWidth={1.6} style={NS} />
      {city(MAP.cities.jakarta)}
      {city(MAP.cities.sorong)}
      {/* Domestic air arc (UGC beat) */}
      {air > 0 ? (
        <path d={AIR_D} fill="none" stroke={INK} strokeWidth={3.5} strokeDasharray="0.012 0.01" pathLength={1} strokeDashoffset={0} opacity={0.75} style={{ ...NS, clipPath: undefined }} />
      ) : null}
      {air > 0 ? <path d={AIR_D} fill="none" stroke={PAPER} strokeWidth={8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={-air} style={NS} /> : null}
      {/* Route: planned line, travelled legs, and a marching highlight when the whole plan lights up */}
      <path d={FULL_D} fill="none" stroke={ORANGE} strokeOpacity={0.25 * planned + 0.2 * glowAll} strokeWidth={26} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - routeTear} style={NS} />
      <path d={FULL_D} fill="none" stroke={ORANGE} strokeOpacity={planned * 0.95 + glowAll * 0.6} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - routeTear} style={NS} />
      {[
        [JKT, pj],
        [SEA, ps],
        [SRG, pr],
      ].map(([pl, p], i) => (
        <path key={i} d={(pl as Poly).d} fill="none" stroke={ORANGE} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - (p as number)} style={NS} />
      ))}
      {glowAll > 0 ? <path d={FULL_D} fill="none" stroke="#FFF7EF" strokeOpacity={glowAll} strokeWidth={3} strokeDasharray="0.01 0.018" pathLength={1} strokeDashoffset={ants} style={NS} /> : null}
    </svg>
  );
};

/** Screen-space chart furniture that follows the camera: place names, ports, compass ticks. */
const ChartLabels: React.FC<{ t: number; cam: Cam }> = ({ cam }) => {
  const overviewOn = interpolate(Math.log(cam.s), [Math.log(0.6), Math.log(1.2)], [1, 0], clamp);
  if (overviewOn <= 0.01) return null;
  const counter = { rotate: `${-cam.roll}deg` };
  return (
    <>
      {MAP.labels.map((l, i) => {
        const p = toScreen(cam, pt(l.at));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              translate: "-50% -50%",
              ...counter,
              fontFamily: FONT_SERIF,
              fontStyle: l.sea ? "italic" : "normal",
              fontSize: l.sea ? 22 : 26,
              letterSpacing: "0.32em",
              color: INK,
              opacity: (l.sea ? 0.42 : 0.6) * overviewOn,
              whiteSpace: "nowrap",
            }}
          >
            {l.text}
          </div>
        );
      })}
      {(
        [
          ["JAKARTA", PLACES.jakarta, -1],
          ["SORONG", PLACES.sorong, 1],
        ] as const
      ).map(([name, p0, side]) => {
        const p = toScreen(cam, p0);
        return (
          <div key={name} style={{ position: "absolute", left: p.x, top: p.y, opacity: overviewOn, ...counter }}>
            <div style={{ position: "absolute", left: -11, top: -11, width: 22, height: 22, borderRadius: "50%", background: PAPER, border: `5px solid ${INK}` }} />
            <div
              style={{
                position: "absolute",
                top: side < 0 ? 18 : -54,
                left: side < 0 ? -40 : -120,
                fontFamily: FONT_MONO,
                fontWeight: 800,
                fontSize: 26,
                letterSpacing: "0.12em",
                color: INK,
                background: "rgba(251,243,228,.85)",
                padding: "2px 8px",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </div>
          </div>
        );
      })}
    </>
  );
};

/** The vehicle: one orange disc whose icon condenses and pops into the next mode. */
const MODES: { from: number; icon: PhosphorName }[] = [
  { from: -1, icon: "truck" },
  { from: T.toShip, icon: "boat" },
  { from: T.toTruck, icon: "truck" },
  { from: T.door, icon: "map-pin" },
];
const Vehicle: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (t < T.dive1[0] + 0.3 || t >= T.out2[0]) return null;
  const pos = t < T.toShip ? truckJ(t) : t < T.toTruck ? (t < T.sea[0] ? at(SEA, 0) : ship(t)) : truckS(t);
  const p = toScreen(cam, pos);
  const m = [...MODES].reverse().find((x) => t >= x.from) ?? MODES[0];
  const since = t - m.from;
  const swapIn = m.from > 0 ? interpolate(since, [0, 0.18, 0.32], [0.2, 1.18, 1], clamp) : 1;
  const next = MODES.find((x) => x.from > t);
  const swapOut = next ? interpolate(next.from - t, [0, 0.15], [0.2, 1], clamp) : 1;
  const scale = Math.min(swapIn, swapOut) * interpolate(t, [T.dive1[0] + 0.3, T.dive1[0] + 0.7], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  const blur = (1 - Math.min(1, scale)) * 8;
  const pin = m.icon === "map-pin";
  if (pin) return null; // the pin is drawn by <DoorPin/>
  const halo = (t * 1.2) % 1;
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, rotate: `${-cam.roll}deg` }}>
      <div style={{ position: "absolute", left: -90, top: -90, width: 180, height: 180, borderRadius: "50%", border: `3px solid ${ORANGE}`, opacity: 1 - halo, scale: String(0.6 + halo * 0.7) }} />
      <div
        style={{
          position: "absolute",
          left: -56,
          top: -56,
          width: 112,
          height: 112,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: `radial-gradient(circle at 35% 30%, ${BRAND.amber}, ${ORANGE} 55%, ${BRAND.ember})`,
          border: "6px solid #fff",
          boxShadow: "0 14px 26px rgba(43,28,21,.35)",
          scale: String(scale),
          rotate: `${(1 - Math.min(1, swapIn)) * 160}deg`,
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        }}
      >
        <Icon name={m.icon} size={62} />
      </div>
    </div>
  );
};

/** Destination pin at the door; in the end it flies into the logo's G. */
const DoorPin: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (t < T.door || t > T.pinToG[1] + 0.3) return null;
  const drop = interpolate(t, [T.door, T.door + 0.35], [-260, 0], { ...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0) });
  const squash = t > T.door + 0.35 && t < T.door + 0.8 ? 1 - 0.18 * Math.exp(-10 * (t - T.door - 0.35)) * Math.cos((t - T.door - 0.35) * 30) : 1;
  const ring = t > T.door + 0.35 ? prog(t, T.door + 0.35, T.door + 1.2) : 0;
  let p = toScreen(cam, PLACES.door);
  if (t > T.out2[0]) p = toScreen(cam, PLACES.sorong);
  const fly = interpolate(t, T.pinToG, [0, 1], { ...clamp, easing: io });
  const x = lerp(p.x, 436, fly);
  const y = lerp(p.y, 777, fly);
  const size = lerp(t > T.out2[0] ? 90 : 150, 248, fly);
  const fade = interpolate(t, [T.pinToG[1] - 0.05, T.pinToG[1] + 0.25], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: fade }}>
      {ring > 0 && ring < 1 ? (
        <div style={{ position: "absolute", left: -140 * ring, top: -45 * ring, width: 280 * ring, height: 90 * ring, borderRadius: "50%", border: `5px solid ${ORANGE}`, opacity: 1 - ring }} />
      ) : null}
      {/* pin head becomes a disc on the way to the G */}
      <div style={{ position: "absolute", left: -size / 2, top: -size + drop, width: size, height: size, transformOrigin: "50% 100%", scale: `${2 - squash} ${squash}`, filter: "drop-shadow(0 12px 14px rgba(43,28,21,.35))" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - fly }}>
          <Icon name="map-pin" size={size} color={ORANGE} />
        </div>
        <div
          style={{
            position: "absolute",
            left: size * 0.12,
            top: size * 0.12 + (1 - fly) * size * 0.05,
            width: size * 0.76,
            height: size * 0.76,
            borderRadius: "50%",
            background: `conic-gradient(${BRAND.red}, ${ORANGE}, ${BRAND.amber}, ${BRAND.red})`,
            opacity: fly,
          }}
        />
      </div>
    </div>
  );
};

/** UGC beat: mode icons pinned on the plan, plane flying the air arc. */
const PlanIcons: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (t < T.out2[1] - 0.2 || t > T.pinToG[0] + 0.3) return null;
  const fade = interpolate(t, [T.pinToG[0] - 0.2, T.pinToG[0] + 0.2], [1, 0], clamp);
  const pop = (s: number) => interpolate(t, [s, s + 0.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.4)) });
  const air = interpolate(t, [T.air, T.air + 1.6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const items: { p: Pt; icon: PhosphorName; s: number; rot?: number }[] = [
    { p: at(JKT, 0.5), icon: "truck", s: pop(T.legFtl) },
    { p: { x: at(JKT, 0.5).x - 18, y: at(JKT, 0.5).y + 110 }, icon: "truck", s: pop(T.legLtl) },
    { p: at(SEA, 0.35), icon: "boat", s: pop(T.legFcl) },
    { p: at(SEA, 0.7), icon: "boat", s: pop(T.legLcl) },
  ];
  const plane = airAt(air);
  const pp = toScreen(cam, plane);
  return (
    <div style={{ opacity: fade }}>
      {items.map((it, i) => {
        const p = toScreen(cam, it.p);
        return (
          <div key={i} style={{ position: "absolute", left: p.x - 38, top: p.y - 90, width: 76, height: 76, borderRadius: "50%", display: "grid", placeItems: "center", background: INK, border: `4px solid ${PAPER}`, scale: String(it.s), boxShadow: "0 8px 16px rgba(43,28,21,.3)" }}>
            <Icon name={it.icon} size={44} />
          </div>
        );
      })}
      {air > 0 && air < 1 ? (
        <div style={{ position: "absolute", left: pp.x - 40, top: pp.y - 40, width: 80, height: 80, borderRadius: "50%", display: "grid", placeItems: "center", background: ORANGE, border: "4px solid #fff", rotate: `${(plane.a * 180) / Math.PI + 45}deg`, boxShadow: "0 8px 16px rgba(43,28,21,.3)" }}>
          <Icon name="airplane-tilt" size={48} />
        </div>
      ) : null}
    </div>
  );
};

/** Coordinate ticks along the left and top edges, following the camera. */
const Ticks: React.FC<{ cam: Cam; t: number }> = ({ cam, t }) => {
  const fade = interpolate(t, [T.pinToG[0], T.pinToG[1]], [1, 0], clamp);
  const pxDeg = MAP.pxPerDeg * cam.s;
  const steps = [10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01];
  const step = steps.find((s) => s * pxDeg < 260 && s * pxDeg >= 70) ?? 0.01;
  const lon0 = MAP.lon0 + (cam.c.x - 540 / cam.s) / MAP.pxPerDeg;
  const ticks: React.ReactNode[] = [];
  const first = Math.ceil(lon0 / step) * step;
  for (let lon = first, i = 0; i < 20; lon += step, i++) {
    const x = (lon - lon0) * pxDeg;
    if (x > 1040) break;
    ticks.push(
      <React.Fragment key={`x${i}`}>
        <div style={{ position: "absolute", left: x, top: 34, width: 2, height: 16, background: INK, opacity: 0.55 }} />
        {x > 120 && x < 900 && Math.abs(x - 540) > 220 ? (
          <div style={{ position: "absolute", left: x + 6, top: 30, fontFamily: FONT_MONO, fontSize: 15, color: INK, opacity: 0.55 }}>{`${lon.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}°E`}</div>
        ) : null}
      </React.Fragment>,
    );
  }
  for (let k = 0; k < 40; k++) {
    const y = 180 + k * 46;
    if (y > 1800) break;
    ticks.push(<div key={`y${k}`} style={{ position: "absolute", left: 34, top: y, width: k % 4 ? 8 : 16, height: 2, background: INK, opacity: 0.45 }} />);
  }
  return <div style={{ position: "absolute", inset: 0, opacity: fade, pointerEvents: "none" }}>{ticks}</div>;
};

// ── Shots that sit on top of the chart ──────────────────────────────────────────────────────────────────
/** Elevation strip: the ship sails on code-drawn waves while the chart above follows its icon. */
const ShipStrip: React.FC<{ t: number }> = ({ t }) => {
  const show = interpolate(t, [T.sea[0] - 0.3, T.sea[0] + 0.3, T.sea[1] - 0.4, T.sea[1] + 0.1], [0, 1, 1, 0], { ...clamp, easing: io });
  if (show <= 0) return null;
  const x = interpolate(t, [T.sea[0] - 0.3, T.sea[1]], [-520, 430], clamp);
  const bob = Math.sin(t * 2.2) * 6;
  const roll = Math.sin(t * 1.7) * 1.2;
  const top = 1340;
  const h = 360;
  const wave = (amp: number, len: number, speed: number, y: number, color: string, w: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 54; i++) {
      const px = i * 20;
      pts.push(`${px},${(y + Math.sin((px + t * speed) / len) * amp).toFixed(1)}`);
    }
    return <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />;
  };
  return (
    <div style={{ position: "absolute", left: 40, top, width: 1000, height: h, clipPath: `inset(${(1 - show) * 50}% 0 ${(1 - show) * 50}% 0 round 10px)` }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(251,243,228,.94)", border: `2.5px solid ${INK}`, borderRadius: 10 }} />
      <div style={{ position: "absolute", inset: 8, border: "1px solid rgba(43,28,21,.4)", borderRadius: 6 }} />
      <svg width={1000} height={h} style={{ position: "absolute", inset: 0 }}>
        {wave(7, 40, 60, 270, "rgba(43,28,21,.28)", 2)}
        {wave(9, 55, -40, 292, "rgba(43,28,21,.4)", 2.5)}
        {wave(6, 32, 80, 314, "rgba(43,28,21,.25)", 2)}
      </svg>
      <div style={{ position: "absolute", left: x, top: 60 + bob, width: 560, rotate: `${roll}deg`, transformOrigin: "50% 90%" }}>
        <Img src={A("inter-island-cargo-ship")} style={{ width: 560, display: "block", filter: "drop-shadow(0 6px 6px rgba(43,28,21,.25))" }} />
        {/* wake */}
        <svg width={300} height={40} style={{ position: "absolute", left: -260, top: 160 }}>
          {[0, 1, 2].map((i) => (
            <line key={i} x1={300 - ((t * 120 + i * 100) % 300)} x2={300 - ((t * 120 + i * 100) % 300) - 60} y1={20 + i * 5} y2={20 + i * 5} stroke="rgba(43,28,21,.35)" strokeWidth={3} strokeLinecap="round" />
          ))}
        </svg>
      </div>
      <svg width={1000} height={h} style={{ position: "absolute", inset: 0 }}>
        {wave(5, 28, 90, 222, "rgba(251,243,228,.0)", 0)}
      </svg>
      <div style={{ position: "absolute", left: 24, top: 18, fontFamily: FONT_MONO, fontWeight: 800, fontSize: 18, letterSpacing: "0.2em", color: INK, opacity: 0.55 }}>ELEVATION</div>
    </div>
  );
};

/** Sorong: the port town pops up from the chart like a pop-up book. */
const PortPopUp: React.FC<{ t: number }> = ({ t }) => {
  const up = interpolate(t, [24.25, 24.95], [90, 0], { ...clamp, easing: Easing.out(Easing.back(1.5)) });
  const down = interpolate(t, [29.55, 29.95], [0, 92], { ...clamp, easing: Easing.in(Easing.cubic) });
  if (t < 24.25 || t > 30) return null;
  const sway = Math.sin(t * 1.3) * 1.2;
  return (
    <div style={{ position: "absolute", left: 60, top: 520, width: 960, height: 520, perspective: 1300 }}>
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 0, height: 26, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(43,28,21,.35), rgba(43,28,21,0))" }} />
      <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%", transform: `rotateX(${up + down}deg) rotateZ(${sway}deg)` }}>
        <Img src={A("port-town-vignette")} style={{ position: "absolute", left: 0, bottom: 10, width: 960, filter: "drop-shadow(0 18px 20px rgba(43,28,21,.3))" }} />
      </div>
    </div>
  );
};

/** "Every mode switch is a handoff": truck → ship → truck chain with flashing links. */
const HandoffChain: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.handoff[0] - 0.1 || t > 29.95) return null;
  const out = interpolate(t, [29.5, 29.9], [1, 0], clamp);
  const icons: PhosphorName[] = ["truck", "boat", "truck"];
  return (
    <div style={{ position: "absolute", left: 210, top: 1080, width: 660, height: 120, opacity: out }}>
      {[0, 1].map((i) => {
        const flash = t > T.handoff[1] + i * 0.15 ? 0.5 + 0.5 * Math.sin((t - T.handoff[1]) * 14) : 0;
        const draw = interpolate(t, [T.handoff[0] + 0.15 + i * 0.25, T.handoff[0] + 0.45 + i * 0.25], [0, 1], clamp);
        return <div key={i} style={{ position: "absolute", left: 100 + i * 230, top: 56, width: 230 * draw, height: 8, borderRadius: 4, background: flash ? ORANGE : INK, boxShadow: flash ? `0 0 20px ${ORANGE}` : "none", opacity: 0.85 }} />;
      })}
      {icons.map((ic, i) => {
        const s = interpolate(t, [T.handoff[0] + i * 0.25, T.handoff[0] + i * 0.25 + 0.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.4)) });
        return (
          <div key={i} style={{ position: "absolute", left: i * 230 + 40, top: 0, width: 120, height: 120, borderRadius: "50%", display: "grid", placeItems: "center", background: i === 1 ? INK : ORANGE, border: "5px solid #fff", boxShadow: "0 10px 20px rgba(43,28,21,.3)", scale: String(s) }}>
            <Icon name={ic} size={66} />
          </div>
        );
      })}
    </div>
  );
};

const LastMile: React.FC<{ t: number }> = ({ t }) => {
  if (t < 24.3 || t > 30) return null;
  const inK = interpolate(t, [24.3, 24.8], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const out = interpolate(t, [29.5, 29.85], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const line = interpolate(t, [24.6, 25.3], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", left: 80, top: 214, width: 880, opacity: 1 - out }}>
      <div style={{ overflow: "hidden", height: 170 }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 156, lineHeight: 1, color: INK, translate: `0 ${(1 - inK) * 100}%` }}>
          LAST <span style={{ color: "#C8471A" }}>MILE</span>
        </div>
      </div>
      <svg width={620} height={40} style={{ marginTop: 8 }}>
        <path d="M6 20 C 160 0, 300 40, 600 18" fill="none" stroke={ORANGE} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - line} />
      </svg>
    </div>
  );
};

/** Orbit lens for the first half second: the chart seen through a round scope, the compass rose behind it. */
const OrbitLens: React.FC<{ t: number }> = ({ t }) => {
  const k = prog(t, 0, T.slam);
  if (t > T.slam + 0.25) return null;
  const r = interpolate(k, [0, 1], [430, 1500], { easing: Easing.in(Easing.cubic) });
  const fade = interpolate(t, [T.slam, T.slam + 0.25], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: fade }}>
      <AbsoluteFill style={{ background: PAPER, WebkitMaskImage: `radial-gradient(circle at 540px 980px, transparent ${r}px, #000 ${r + 2}px)`, maskImage: `radial-gradient(circle at 540px 980px, transparent ${r}px, #000 ${r + 2}px)` }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <circle cx={540} cy={980} r={r} fill="none" stroke={INK} strokeWidth={5} />
        <circle cx={540} cy={980} r={r + 18} fill="none" stroke={INK} strokeWidth={1.5} strokeOpacity={0.6} />
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i / 72) * Math.PI * 2 + t * 0.8;
          const l = i % 6 ? 12 : 26;
          return <line key={i} x1={540 + Math.cos(a) * (r + 18)} y1={980 + Math.sin(a) * (r + 18)} x2={540 + Math.cos(a) * (r + 18 + l)} y2={980 + Math.sin(a) * (r + 18 + l)} stroke={INK} strokeWidth={2} strokeOpacity={0.6} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Big compass rose: spins behind the orbit shot, then docks onto the chart's printed compass (top right). */
const Compass: React.FC<{ t: number }> = ({ t }) => {
  const dock = interpolate(t, [0.3, 1.1], [0, 1], { ...clamp, easing: io });
  const fade = interpolate(t, [1.0, 1.3], [1, 0], clamp);
  if (fade <= 0) return null;
  const size = lerp(1300, 170, dock);
  const x = lerp(540, 930, dock);
  const y = lerp(980, 161, dock);
  return (
    <Img
      src={A("compass-rose")}
      style={{ position: "absolute", left: x - size / 2, top: y - (size * 997) / 955 / 2, width: size, rotate: `${(1 - dock) * 220 - t * 30}deg`, opacity: fade * (0.55 + 0.45 * dock), mixBlendMode: "multiply" }}
    />
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const k = interpolate(t, [T.pinToG[0], T.logo + 0.3], [0, 1], clamp);
  if (k <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: k }}>
      <Img src={A("chart-paper-background")} style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }} />
      <Img src={A("compass-rose")} style={{ position: "absolute", left: 540 - 520, top: 900 - 540, width: 1040, opacity: 0.1, rotate: `${(t - T.logo) * 8}deg`, mixBlendMode: "multiply" }} />
    </AbsoluteFill>
  );
};

// ── Episode ─────────────────────────────────────────────────────────────────────────────────────────────
export const E03JakartaSorong: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const cam = camera(t);
  const stuck = t >= T.stuck && t < T.out2[0];
  const red = stuck ? interpolate(t, [T.stuck, T.stuck + 0.4, T.out2[0] - 0.3, T.out2[0]], [0, 1, 1, 0], clamp) : 0;
  const mapFade = interpolate(t, [T.pinToG[0], T.logo + 0.2], [1, 0], clamp);
  const hits = [T.slam, T.dive1[1] - 0.05, T.out1[0] + 0.3, T.dive2[1] - 0.05, T.door + 0.35, T.noTolerance, T.out2[0] + 0.1].map(sec);
  const sfx: SfxCue[] = [
    { at: 0, name: "whoosh", volume: 0.7 },
    { at: sec(T.slam), name: "boom", volume: 0.9 },
    { at: sec(T.slam), name: "horn", volume: 0.7 },
    { at: sec(T.tear[0]), name: "whoosh", volume: 0.55 },
    { at: sec(T.dive1[0]), name: "whoosh", volume: 0.5 },
    { at: sec(T.dive1[1] - 0.05), name: "boom", volume: 0.4 },
    { at: sec(T.ftl - 0.05), name: "tick", volume: 0.35 },
    { at: sec(T.ltl - 0.05), name: "tick", volume: 0.35 },
    { at: sec(T.toShip), name: "whoosh", volume: 0.4 },
    { at: sec(T.out1[0] + 0.2), name: "whoosh", volume: 0.6 },
    { at: sec(T.sea[0] + 0.2), name: "horn", volume: 0.35 },
    { at: sec(T.fcl - 0.05), name: "tick", volume: 0.35 },
    { at: sec(T.lcl - 0.05), name: "tick", volume: 0.35 },
    { at: sec(T.dive2[0]), name: "whoosh", volume: 0.55 },
    { at: sec(T.toTruck), name: "tick", volume: 0.4 },
    { at: sec(24.3), name: "whoosh", volume: 0.35 },
    { at: sec(T.door + 0.35), name: "stamp", volume: 0.6 },
    { at: sec(T.handoff[1]), name: "tick", volume: 0.4 },
    { at: sec(T.stuck), name: "glitch", volume: 0.6 },
    { at: sec(T.noTolerance), name: "stamp", volume: 0.75 },
    { at: sec(T.out2[0] + 0.1), name: "whoosh", volume: 0.6 },
    ...[T.legFtl, T.legLtl, T.legFcl, T.legLcl].map((s) => ({ at: sec(s), name: "tick", volume: 0.35 })),
    { at: sec(T.air), name: "whoosh", volume: 0.45 },
    { at: sec(T.pinToG[0]), name: "whoosh", volume: 0.5 },
    { at: sec(T.logo + 0.15), name: "sonic-logo", volume: 0.8 },
  ];

  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Img src={A("chart-paper-background")} style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }} />
      <Shake hits={hits} amount={14}>
        <AbsoluteFill style={{ opacity: mapFade, perspective: 1700, perspectiveOrigin: `540px ${cam.fy}px` }}>
          <AbsoluteFill style={{ transformOrigin: `540px ${cam.fy}px`, transform: `rotateX(${cam.tilt}deg)`, transformStyle: "preserve-3d" }}>
            <AbsoluteFill style={{ transformOrigin: `540px ${cam.fy}px`, rotate: `${cam.roll}deg` }}>
              <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${540 - cam.c.x * cam.s}px, ${cam.fy - cam.c.y * cam.s}px) scale(${cam.s})`, mixBlendMode: "multiply" }}>
                <ChartWorld t={t} cam={cam} />
              </div>
              <ChartLabels t={t} cam={cam} />
              <PlanIcons t={t} cam={cam} />
              <Vehicle t={t} cam={cam} />
            </AbsoluteFill>
          </AbsoluteFill>
        </AbsoluteFill>
        <DoorPin t={t} cam={cam} />
        <AbsoluteFill style={{ background: "#C0392B", mixBlendMode: "multiply", opacity: red * 0.5 }} />
        <AbsoluteFill style={{ background: "rgba(251,243,228,.55)", opacity: red }} />
      </Shake>
      <OrbitLens t={t} />
      <Compass t={t} />
      <Ticks cam={cam} t={t} />

      <ShipStrip t={t} />
      <PortPopUp t={t} />
      <HandoffChain t={t} />
      <LastMile t={t} />

      <HfOverlay clip="e03-hook" from={0} durationInFrames={sec(4)} fallback={null} />
      <HfOverlay clip="e03-ftl" from={sec(4)} durationInFrames={sec(10)} fallback={null} />
      <HfOverlay clip="e03-fcl" from={sec(14)} durationInFrames={sec(10)} fallback={null} />
      <HfOverlay clip="e03-odol" from={sec(30)} durationInFrames={sec(6)} fallback={null} />
      <HfOverlay clip="e03-ugc" from={sec(36)} durationInFrames={sec(8)} fallback={null} />

      <EndCard t={t} />
      <HfOverlay clip="e03-logo" from={sec(T.logo)} durationInFrames={sec(ep.dur - T.logo)} fallback={null} />
      <Captions beats={beats} accent={ORANGE} ep="e03" theme="light" />
      <BrandFrame theme="light" endCardFrom={sec(T.logo)} />
      <SoundLayer ep="e03" sfx={sfx} />
    </AbsoluteFill>
  );
};
