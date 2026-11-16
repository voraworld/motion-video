import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { geoBounds, geoContains, geoGraticule, geoGraticule10, geoMercator, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import land50 from "world-atlas/land-50m.json";
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
 * One route line crosses the real archipelago (Natural Earth coastlines, scripts/e03-map.mjs) and the vehicle
 * changes shape at every mode switch: truck → ship → truck → destination pin → UGC logo.
 *
 * Shots, each with its own move:
 *   hook   an ink globe spins and dives onto Jakarta (orthographic → chart), the route tears to Sorong
 *   FTL/LTL Jakarta streets in a tilted nav view; above it the trailer is X-rayed from the top (real container
 *          roof photo) — one shipper's pallets, then shared pallets
 *   FCL/LCL scale zoom out to the archipelago; real container doors swing open on a full wall, slam, and reopen
 *          on a shared wall; the ship sails along the bottom of the chart
 *   last mile dive into Sorong, the port town pops up from the chart, the destination pin drops, handoff chain
 *   stuck  Zero ODOL (HyperFrames) over a red-washed chart
 *   ugc    pull out to the whole plan, mode icons pin onto each leg, a plane flies the domestic-air arc
 *   end    the pin flies into the logo's G
 *
 * Rendering: the chart is one screen-sized SVG whose viewBox is the camera window (no giant CSS layers), so it
 * stays sharp from orbit to street level.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ep = getEpisode("E03");
const beats = beatsOf(ep);
const A = (name: string, epId = "e03") => staticFile(asset(epId, name) ?? `assets/${epId}/${name}.png`);
const io = Easing.bezier(0.65, 0, 0.35, 1);
const INK = BRAND.ink;
const ORANGE = BRAND.orange;
const PAPER = "#FBF3E4";
const DEEP = "#C8471A";

type Pt = { x: number; y: number };
const pt = (p: number[]): Pt => ({ x: p[0], y: p[1] });
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
function prog(t: number, a: number, b: number) {
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}

// ── Route geometry ──────────────────────────────────────────────────────────────────────────────────────
type Poly = { pts: Pt[]; cum: number[]; len: number; d: string };
const poly = (raw: number[][]): Poly => {
  const pts = raw.map(pt);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, len: cum[cum.length - 1], d: "M" + pts.map((p) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join("L") };
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
const PLACES = { jakarta: pt(MAP.places.jakarta), priok: pt(MAP.places.priok), sorong: pt(MAP.places.sorong), door: pt(MAP.places.door) };
const seaYs = SEA.pts.map((p) => p.y);
const OVER: Pt = { x: (PLACES.jakarta.x + PLACES.sorong.x) / 2, y: (Math.min(...seaYs) + Math.max(...seaYs)) / 2 };
const AIR_C = { x: OVER.x, y: OVER.y - 560 };
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
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  c: { x: lerp(a.c.x, b.c.x, k), y: lerp(a.c.y, b.c.y, k) },
  s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), k)),
  tilt: lerp(a.tilt, b.tilt, k),
  roll: lerp(a.roll, b.roll, k),
  fy: lerp(a.fy, b.fy, k),
});
const STREET = 72;
const OVERVIEW = 0.335;
const SEA_S = 0.62;
const GLOBE_END_S = 9; // chart scale at the slam
const S_PER_RAD = (MAP.pxPerDeg * 180) / Math.PI; // world px per radian at chart scale 1
const globeR = (t: number) => 300 * Math.pow((S_PER_RAD * GLOBE_END_S) / 300, Easing.in(Easing.cubic)(prog(t, 0, T.slam)));

const truckJ = (t: number) => at(JKT, interpolate(t, T.jkt, [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) }));
const ship = (t: number) => at(SEA, interpolate(t, T.sea, [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) }));
const truckS = (t: number) => at(SRG, interpolate(t, T.srg, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) }));
/** Roll so the vehicle drives "up" the screen at street level (smoothed over ±0.75 s). */
const headingRoll = (f: (t: number) => Pt & { a: number }, t: number) => {
  let sx = 0;
  let sy = 0;
  for (let k = -3; k <= 3; k++) {
    const p = f(t + k * 0.25);
    sx += Math.cos(p.a);
    sy += Math.sin(p.a);
  }
  return -(Math.atan2(sy, sx) * 180) / Math.PI - 90;
};

const camera = (t: number): Cam => {
  const jkt: Cam = { c: PLACES.jakarta, s: GLOBE_END_S, tilt: 0, roll: 0, fy: 1000 };
  const over: Cam = { c: OVER, s: OVERVIEW, tilt: 24, roll: 0, fy: 1120 };
  const jStart: Cam = { c: truckJ(T.jkt[0]), s: STREET, tilt: 50, roll: headingRoll(truckJ, T.jkt[0]), fy: 1330 };
  if (t < T.slam) return { ...jkt, s: globeR(t) / S_PER_RAD };
  if (t < 0.85) return mixCam(jkt, { ...jkt, s: 8 }, Easing.out(Easing.back(2))(prog(t, T.slam, 0.85)));
  if (t < 2.1) return mixCam({ ...jkt, s: 8 }, over, io(prog(t, 0.85, 2.1)));
  if (t < T.dive1[0]) return mixCam(over, { ...over, s: OVERVIEW * 1.06 }, prog(t, 2.1, T.dive1[0]));
  if (t < T.dive1[1]) return mixCam({ ...over, s: OVERVIEW * 1.06 }, jStart, Easing.bezier(0.6, 0, 0.2, 1)(prog(t, ...T.dive1)));
  if (t < T.out1[0]) {
    const breathe = 1 - 0.3 * Math.sin(Math.PI * prog(t, 7.6, 10.8)) * (t > 7.6 && t < 10.8 ? 1 : 0);
    return { c: truckJ(t), s: STREET * breathe, tilt: 50, roll: headingRoll(truckJ, t), fy: 1330 };
  }
  const sea0: Cam = { c: ship(T.sea[0]), s: SEA_S, tilt: 32, roll: 0, fy: 1250 };
  if (t < T.out1[1]) {
    const jEnd: Cam = { c: truckJ(T.out1[0]), s: STREET, tilt: 50, roll: headingRoll(truckJ, T.out1[0]), fy: 1330 };
    const k = prog(t, ...T.out1);
    const wide: Cam = { ...over, s: 0.24, tilt: 18 };
    return k < 0.62 ? mixCam(jEnd, wide, io(k / 0.62)) : mixCam(wide, sea0, io((k - 0.62) / 0.38));
  }
  const sStart: Cam = { c: truckS(T.srg[0]), s: STREET, tilt: 50, roll: headingRoll(truckS, T.srg[0]), fy: 1440 };
  if (t < T.dive2[0]) return { c: ship(t), s: SEA_S, tilt: 32, roll: 0, fy: 1250 };
  if (t < T.dive2[1]) {
    const k = prog(t, ...T.dive2);
    const s0: Cam = { c: ship(T.dive2[0]), s: SEA_S, tilt: 32, roll: 0, fy: 1250 };
    const wide: Cam = { c: { x: lerp(s0.c.x, PLACES.sorong.x, 0.6), y: lerp(s0.c.y, PLACES.sorong.y, 0.6) }, s: 0.4, tilt: 20, roll: 0, fy: 1200 };
    return k < 0.3 ? mixCam(s0, wide, io(k / 0.3)) : mixCam(wide, sStart, Easing.bezier(0.6, 0, 0.2, 1)((k - 0.3) / 0.7));
  }
  const doorCam: Cam = { c: truckS(T.srg[1]), s: STREET, tilt: 50, roll: headingRoll(truckS, T.srg[1]), fy: 1440 };
  if (t < T.out2[0]) {
    if (t < T.srg[1]) return { c: truckS(t), s: STREET, tilt: 50, roll: headingRoll(truckS, t), fy: 1440 };
    return { ...doorCam, roll: doorCam.roll + 16 * io(prog(t, T.srg[1], T.stuck)), s: STREET * (1 + 0.18 * prog(t, T.stuck, T.out2[0])) };
  }
  const ugc: Cam = { c: { x: OVER.x, y: OVER.y - 150 }, s: OVERVIEW, tilt: 30, roll: 0, fy: 1260 };
  const doorEnd: Cam = { ...doorCam, roll: doorCam.roll + 16, s: STREET * 1.18 };
  if (t < T.out2[1]) return mixCam(doorEnd, ugc, io(prog(t, ...T.out2)));
  return { ...ugc, s: OVERVIEW * (1 + 0.06 * prog(t, T.out2[1], T.pinToG[0])), roll: -3 * prog(t, T.out2[1], T.pinToG[0]) };
};

/** World → screen (before tilt), including the camera roll around the focus point. */
const toScreen = (cam: Cam, p: Pt) => {
  const dx = (p.x - cam.c.x) * cam.s;
  const dy = (p.y - cam.c.y) * cam.s;
  const r = (cam.roll * Math.PI) / 180;
  return { x: 540 + dx * Math.cos(r) - dy * Math.sin(r), y: cam.fy + dx * Math.sin(r) + dy * Math.cos(r) };
};

// ── Pieces ──────────────────────────────────────────────────────────────────────────────────────────────
const Icon: React.FC<{ name: PhosphorName; size: number; color?: string }> = ({ name, size, color = "#fff" }) => (
  <svg viewBox="0 0 256 256" width={size} height={size} fill={color} aria-hidden>
    {PHOSPHOR[name].map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

/** Region land (Natural Earth 1:50m), pre-filtered to the archipelago so the per-frame projection stays fast. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAND50: any = (() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f: any = feature(land50 as any, (land50 as any).objects.land);
  const geom = f.type === "FeatureCollection" ? f.features[0].geometry : f.geometry ?? f;
  const polys = (geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates]).filter((poly: number[][][]) => {
    const [[x0, y0], [x1, y1]] = geoBounds({ type: "Polygon", coordinates: poly } as never);
    return x1 > 88 && x0 < 150 && y1 > -16 && y0 < 14;
  });
  return { type: "MultiPolygon", coordinates: polys };
})();
const MERC0 = geoMercator().scale(S_PER_RAD).translate([0, 0]);
const P0 = MERC0([MAP.lon0, MAP.lat0]) as [number, number];
// Kept tight: a 3D-tilted layer much larger than the screen is dropped by the compositor.
const CLIP: [[number, number], [number, number]] = [
  [-380, -420],
  [1460, 2240],
];
/** Screen position of a world point before roll (the roll is applied by the SVG group). */
const sx = (cam: Cam, x: number) => 540 + (x - cam.c.x) * cam.s;
const sy = (cam: Cam, y: number) => cam.fy + (y - cam.c.y) * cam.s;
const LIM = 6000; // keep far-away vertices inside the rasteriser's safe range
const cl = (v: number) => Math.max(-LIM, Math.min(LIM, v)).toFixed(1);
const polyD = (cam: Cam, pts: Pt[]) => "M" + pts.map((p) => `${cl(sx(cam, p.x))} ${cl(sy(cam, p.y))}`).join("L");

/** The chart: a screen-space SVG re-projected every frame (sharp and safe from orbit to street level). */
const Chart: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const streetsOn = interpolate(Math.log(cam.s), [Math.log(9), Math.log(26)], [0, 1], clamp);
  const routeTear = interpolate(t, T.tear, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const planned = interpolate(t, [T.dive1[0], T.dive1[0] + 0.6], [1, 0.45], clamp);
  const pj = interpolate(t, T.jkt, [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const ps = interpolate(t, T.sea, [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const pr = interpolate(t, T.srg, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const glowAll = interpolate(t, [T.everyLeg - 0.2, T.everyLeg + 0.6], [0, 1], clamp);
  const air = interpolate(t, [T.air, T.air + 1.6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const proj = geoMercator()
    .scale(S_PER_RAD * cam.s)
    .translate([540 - (P0[0] + cam.c.x) * cam.s, cam.fy - (P0[1] + cam.c.y) * cam.s])
    .clipExtent(CLIP);
  const gp = geoPath(proj);
  let land = gp(LAND50) ?? "";
  // When the whole view is inside one island (street level), the rectangle clip can come back empty:
  // fill the view with land if the camera centre is on land.
  let landClip = true;
  if (land.length < 8) {
    const centre = proj.invert?.([540, cam.fy]);
    if (centre && geoContains(LAND50, centre)) {
      land = `M${CLIP[0][0]} ${CLIP[0][1]}H${CLIP[1][0]}V${CLIP[1][1]}H${CLIP[0][0]}Z`;
      landClip = false;
    }
  }
  const grat = cam.s < 20 ? gp(GRAT_CHART) ?? "" : "";
  const near = (c: Pt) => Math.abs(c.x - cam.c.x) * cam.s < 4000 && Math.abs(c.y - cam.c.y) * cam.s < 4000;
  const city = (c: (typeof MAP.cities)["jakarta"]) => {
    if (streetsOn <= 0 || !near({ x: c.cx, y: c.cy })) return null;
    const m = c.minor;
    let minor = "";
    for (let i = 0; i < m.length; i += 4) minor += `M${cl(sx(cam, m[i]))} ${cl(sy(cam, m[i + 1]))}L${cl(sx(cam, m[i + 2]))} ${cl(sy(cam, m[i + 3]))}`;
    const major = c.major.map((pl) => polyD(cam, pl.map(pt))).join("");
    return (
      <g opacity={streetsOn} clipPath={landClip ? "url(#e03-land)" : undefined}>
        <path d={minor} fill="none" stroke={INK} strokeOpacity={0.3} strokeWidth={1.8} />
        <path d={major} fill="none" stroke={INK} strokeOpacity={0.6} strokeWidth={10} strokeLinecap="round" />
        <path d={major} fill="none" stroke="#FFF8EA" strokeWidth={6} strokeLinecap="round" />
      </g>
    );
  };
  const full = polyD(cam, [...JKT.pts, ...SEA.pts, ...SRG.pts]);
  const airPts = Array.from({ length: 60 }, (_, i) => airAt(i / 59));
  const airD = polyD(cam, airPts);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        <clipPath id="e03-land">
          <path d={land} />
        </clipPath>
      </defs>
      <g transform={`rotate(${cam.roll} 540 ${cam.fy})`}>
        {grat ? <path d={grat} fill="none" stroke={INK} strokeOpacity={0.16} strokeWidth={1.2} /> : null}
        <path d={land} fill="none" stroke={INK} strokeOpacity={0.05} strokeWidth={34} />
        <path d={land} fill="none" stroke={INK} strokeOpacity={0.07} strokeWidth={16} />
        <path d={land} fill="rgba(214,168,104,.5)" stroke={INK} strokeOpacity={0.8} strokeWidth={2} />
        {city(MAP.cities.jakarta)}
        {city(MAP.cities.sorong)}
        {air > 0 ? (
          <>
            <path d={airD} fill="none" stroke={INK} strokeOpacity={0.8} strokeWidth={4} strokeDasharray="14 12" />
            <path d={airD} fill="none" stroke={PAPER} strokeWidth={10} pathLength={1} strokeDasharray="1 1" strokeDashoffset={-air} />
          </>
        ) : null}
        <path d={full} fill="none" stroke={ORANGE} strokeOpacity={0.22 * planned + 0.2 * glowAll} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - routeTear} />
        <path d={full} fill="none" stroke={DEEP} strokeOpacity={planned * 0.9 + glowAll * 0.4} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - routeTear} />
        <path d={full} fill="none" stroke={ORANGE} strokeOpacity={planned + glowAll} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - routeTear} />
        {(
          [
            [JKT, pj],
            [SEA, ps],
            [SRG, pr],
          ] as const
        ).map(([pl, p], i) => {
          const d = polyD(cam, pl.pts);
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={DEEP} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
              <path d={d} fill="none" stroke={ORANGE} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
            </g>
          );
        })}
        {glowAll > 0 ? <path d={full} fill="none" stroke="#FFF7EF" strokeOpacity={glowAll} strokeWidth={3.5} strokeDasharray="10 16" strokeDashoffset={-t * 60} /> : null}
      </g>
    </svg>
  );
};

/** Ink globe for the hook: Indonesia rotates to the front while the camera falls onto Jakarta. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAND110 = feature(land110 as any, (land110 as any).objects.land);
const GRAT = geoGraticule10();
const GRAT_CHART = geoGraticule().extent([
  [90, -14],
  [146, 10],
]).step([2, 2])();
const Globe: React.FC<{ t: number }> = ({ t }) => {
  if (t > T.slam + 0.02) return null;
  const k = Easing.out(Easing.cubic)(prog(t, 0, 0.42));
  const lon = lerp(78, 106.85, k);
  const lat = lerp(16, -6.2, k);
  const r = globeR(t);
  const proj = geoOrthographic().scale(r).translate([540, 1000]).rotate([-lon, -lat]).clipExtent([
    [-20, -20],
    [1100, 1940],
  ]);
  const path = geoPath(proj);
  const fade = interpolate(t, [0.38, 0.48], [1, 0], clamp);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: fade }}>
      <defs>
        <radialGradient id="e03-globe" cx="42%" cy="38%" r="65%">
          <stop offset="0" stopColor="#FFF9EC" />
          <stop offset="0.7" stopColor="#F2E2C2" />
          <stop offset="1" stopColor="#D8BF93" />
        </radialGradient>
      </defs>
      <circle cx={540} cy={1000} r={r + 30} fill="none" stroke={ORANGE} strokeOpacity={0.25} strokeWidth={18} />
      <path d={path({ type: "Sphere" }) ?? ""} fill="url(#e03-globe)" stroke={INK} strokeWidth={4} />
      <path d={path(GRAT) ?? ""} fill="none" stroke={INK} strokeOpacity={0.18} strokeWidth={1.2} />
      <path d={path(LAND110 as never) ?? ""} fill="rgba(214,168,104,.6)" stroke={INK} strokeWidth={1.6} />
      <circle cx={540} cy={1000} r={10 + 16 * k} fill={ORANGE} stroke="#fff" strokeWidth={4} opacity={k} />
    </svg>
  );
};

/** Place names and ports, screen-space, following the camera. */
const ChartLabels: React.FC<{ cam: Cam }> = ({ cam }) => {
  const on = interpolate(Math.log(cam.s), [Math.log(0.8), Math.log(1.6)], [1, 0], clamp);
  if (on <= 0.01) return null;
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
              fontFamily: FONT_SERIF,
              fontStyle: l.sea ? "italic" : "normal",
              fontSize: l.sea ? 24 : 30,
              letterSpacing: "0.3em",
              color: INK,
              opacity: (l.sea ? 0.45 : 0.62) * on,
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
          <div key={name} style={{ position: "absolute", left: p.x, top: p.y, opacity: on }}>
            <div style={{ position: "absolute", left: -13, top: -13, width: 26, height: 26, borderRadius: "50%", background: PAPER, border: `6px solid ${INK}` }} />
            <div
              style={{
                position: "absolute",
                top: side < 0 ? 22 : -62,
                left: side < 0 ? -50 : -150,
                fontFamily: FONT_MONO,
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: "0.14em",
                color: PAPER,
                background: INK,
                padding: "4px 12px",
                borderRadius: 4,
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
  if (t < T.dive1[0] + 0.3 || t >= T.door) return null;
  const pos = t < T.toShip ? truckJ(t) : t < T.toTruck ? (t < T.sea[0] ? at(SEA, 0) : ship(t)) : truckS(t);
  const p = toScreen(cam, pos);
  const m = [...MODES].reverse().find((x) => t >= x.from) ?? MODES[0];
  const swapIn = m.from > 0 ? interpolate(t - m.from, [0, 0.18, 0.32], [0.2, 1.18, 1], clamp) : 1;
  const next = MODES.find((x) => x.from > t);
  const swapOut = next ? interpolate(next.from - t, [0, 0.15], [0.2, 1], clamp) : 1;
  const scale = Math.min(swapIn, swapOut) * interpolate(t, [T.dive1[0] + 0.3, T.dive1[0] + 0.7], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  const blur = (1 - Math.min(1, scale)) * 8;
  const halo = (t * 1.2) % 1;
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y }}>
      <div style={{ position: "absolute", left: -100, top: -100, width: 200, height: 200, borderRadius: "50%", border: `4px solid ${ORANGE}`, opacity: 1 - halo, scale: String(0.6 + halo * 0.7) }} />
      <div
        style={{
          position: "absolute",
          left: -62,
          top: -62,
          width: 124,
          height: 124,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: `radial-gradient(circle at 35% 30%, ${BRAND.amber}, ${ORANGE} 55%, ${BRAND.ember})`,
          border: "7px solid #fff",
          boxShadow: "0 16px 30px rgba(43,28,21,.4)",
          scale: String(scale),
          rotate: `${(1 - Math.min(1, swapIn)) * 160}deg`,
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        }}
      >
        <Icon name={m.icon} size={68} />
      </div>
    </div>
  );
};

/** Destination pin at the door; in the end it flies into the logo's G. */
const DoorPin: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (t < T.door || t > T.pinToG[1] + 0.3) return null;
  const drop = interpolate(t, [T.door, T.door + 0.35], [-300, 0], { ...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0) });
  const d = t - T.door - 0.35;
  const squash = d > 0 && d < 0.6 ? 1 - 0.18 * Math.exp(-10 * d) * Math.cos(d * 30) : 1;
  const ring = d > 0 ? prog(t, T.door + 0.35, T.door + 1.2) : 0;
  const p = toScreen(cam, t > T.out2[0] ? PLACES.sorong : PLACES.door);
  const fly = interpolate(t, T.pinToG, [0, 1], { ...clamp, easing: io });
  const x = lerp(p.x, 436, fly);
  const y = lerp(p.y, 777, fly);
  const size = lerp(t > T.out2[0] ? interpolate(t, T.out2, [170, 96], clamp) : 170, 248, fly);
  const fade = interpolate(t, [T.pinToG[1] - 0.05, T.pinToG[1] + 0.25], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: fade }}>
      {ring > 0 && ring < 1 ? <div style={{ position: "absolute", left: -160 * ring, top: -50 * ring, width: 320 * ring, height: 100 * ring, borderRadius: "50%", border: `6px solid ${ORANGE}`, opacity: 1 - ring }} /> : null}
      <div style={{ position: "absolute", left: -size / 2, top: -size + drop, width: size, height: size, transformOrigin: "50% 100%", scale: `${2 - squash} ${squash}`, filter: "drop-shadow(0 14px 14px rgba(43,28,21,.4))" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - fly }}>
          <Icon name="map-pin" size={size} color={ORANGE} />
        </div>
        <div style={{ position: "absolute", left: size * 0.12, top: size * 0.12, width: size * 0.76, height: size * 0.76, borderRadius: "50%", background: `conic-gradient(${BRAND.red}, ${ORANGE}, ${BRAND.amber}, ${BRAND.red})`, opacity: fly }} />
      </div>
    </div>
  );
};

/** UGC beat: mode icons pin onto each leg; a plane flies the domestic-air arc. */
const PlanIcons: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (t < T.out2[1] - 0.2 || t > T.pinToG[0] + 0.3) return null;
  const fade = interpolate(t, [T.pinToG[0] - 0.2, T.pinToG[0] + 0.2], [1, 0], clamp);
  const pop = (s: number) => interpolate(t, [s, s + 0.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.4)) });
  const air = interpolate(t, [T.air, T.air + 1.6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const j = toScreen(cam, PLACES.jakarta);
  const items: { p: Pt; icon: PhosphorName; s: number }[] = [
    { p: { x: j.x - 70, y: j.y - 70 }, icon: "truck", s: pop(T.legFtl) },
    { p: { x: j.x + 50, y: j.y - 110 }, icon: "truck", s: pop(T.legLtl) },
    { p: toScreen(cam, at(SEA, 0.4)), icon: "boat", s: pop(T.legFcl) },
    { p: toScreen(cam, at(SEA, 0.72)), icon: "boat", s: pop(T.legLcl) },
  ];
  const plane = airAt(air);
  const pp = toScreen(cam, plane);
  return (
    <div style={{ opacity: fade }}>
      {items.map((it, i) => (
        <div key={i} style={{ position: "absolute", left: it.p.x - 46, top: it.p.y - 100, width: 92, height: 92, borderRadius: "50%", display: "grid", placeItems: "center", background: INK, border: `5px solid ${PAPER}`, scale: String(it.s), boxShadow: "0 10px 18px rgba(43,28,21,.35)" }}>
          <Icon name={it.icon} size={52} />
        </div>
      ))}
      {air > 0 && air < 1 ? (
        <div style={{ position: "absolute", left: pp.x - 48, top: pp.y - 48, width: 96, height: 96, borderRadius: "50%", display: "grid", placeItems: "center", background: ORANGE, border: "5px solid #fff", rotate: `${(plane.a * 180) / Math.PI + 45}deg`, boxShadow: "0 10px 18px rgba(43,28,21,.35)" }}>
          <Icon name="airplane-tilt" size={56} />
        </div>
      ) : null}
    </div>
  );
};

/** Coordinate ticks along the top edge and the left edge. */
const Ticks: React.FC<{ cam: Cam; t: number }> = ({ cam, t }) => {
  const fade = interpolate(t, [T.pinToG[0], T.pinToG[1]], [1, 0], clamp) * interpolate(t, [0.3, 0.6], [0, 1], clamp);
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
        <div style={{ position: "absolute", left: x, top: 30, width: 2, height: 16, background: INK, opacity: 0.55 }} />
        {x > 70 && x < 940 && Math.abs(x - 540) > 230 ? (
          <div style={{ position: "absolute", left: x + 6, top: 27, fontFamily: FONT_MONO, fontSize: 15, color: INK, opacity: 0.55 }}>{`${lon.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}°E`}</div>
        ) : null}
      </React.Fragment>,
    );
  }
  for (let k = 0; k < 40; k++) {
    const y = 180 + k * 46;
    if (y > 1800) break;
    ticks.push(<div key={`y${k}`} style={{ position: "absolute", left: 30, top: y, width: k % 4 ? 8 : 16, height: 2, background: INK, opacity: 0.45 }} />);
  }
  return <div style={{ position: "absolute", inset: 0, opacity: fade, pointerEvents: "none" }}>{ticks}</div>;
};

// ── FTL / LTL: the trailer X-rayed from above ───────────────────────────────────────────────────────────
const SHIPPERS = ["#34425E", "#CDB892", "#8C9A72", "#A7684A"];
const LTL_MINE = [2, 3, 9, 10];
const Pallet: React.FC<{ x: number; y: number; w: number; h: number; color: string; mine: boolean; s: number; flip: number }> = ({ x, y, w, h, color, mine, s, flip }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, scale: `${s * Math.abs(Math.cos(flip * Math.PI))} ${s}`, opacity: Math.min(1, s * 1.5) }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 6,
        background: mine ? `linear-gradient(135deg, ${BRAND.amber}, ${ORANGE} 55%, ${BRAND.ember})` : `linear-gradient(135deg, ${color}, ${color})`,
        boxShadow: "inset 0 -6px 0 rgba(0,0,0,.18), inset 0 4px 0 rgba(255,255,255,.18), 0 6px 10px rgba(0,0,0,.3)",
      }}
    />
    <div style={{ position: "absolute", left: "46%", top: 0, bottom: 0, width: "8%", background: "rgba(255,255,255,.22)" }} />
    <div style={{ position: "absolute", top: "44%", left: 0, right: 0, height: "10%", background: "rgba(255,255,255,.18)" }} />
  </div>
);
const TruckXray: React.FC<{ t: number }> = ({ t }) => {
  const enter = interpolate(t, [T.ftl - 0.6, T.ftl - 0.05], [-1150, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const leave = interpolate(t, [13.25, 13.7], [0, 1250], { ...clamp, easing: Easing.in(Easing.cubic) });
  if (t < T.ftl - 0.6 || t > 13.7) return null;
  const W = 740;
  const H = 185;
  const left = 70;
  const top = 600;
  const scan = interpolate(t, [T.ftl + 0.05, T.ftl + 0.75], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const ltl = t >= T.ltl - 0.1;
  const flip = interpolate(t, [T.ltl - 0.1, T.ltl + 0.35], [0, 1], clamp);
  const cols = 7;
  const rows = 2;
  const pw = (W - 30) / cols;
  const ph = (H - 30) / rows;
  const bob = Math.sin(t * 9) * 1.2;
  return (
    <div style={{ position: "absolute", left: left + enter + leave, top: top + bob, width: 960, height: 260 }}>
      {/* dimension line (chart drafting) */}
      <svg width={W + 20} height={40} style={{ position: "absolute", left: -10, top: -44 }}>
        <line x1={10} y1={22} x2={W + 10} y2={22} stroke={INK} strokeWidth={2} opacity={0.6} />
        <line x1={10} y1={10} x2={10} y2={34} stroke={INK} strokeWidth={2} opacity={0.6} />
        <line x1={W + 10} y1={10} x2={W + 10} y2={34} stroke={INK} strokeWidth={2} opacity={0.6} />
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, borderRadius: 8, background: "#2A1F18", boxShadow: "0 26px 40px rgba(43,28,21,.35)" }} />
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const drop = interpolate(t, [T.ftl + 0.25 + i * 0.04, T.ftl + 0.55 + i * 0.04], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.8)) });
        const mine = !ltl || LTL_MINE.includes(i);
        const color = SHIPPERS[(i * 7 + r) % SHIPPERS.length];
        return <Pallet key={i} x={15 + c * pw + 3} y={15 + r * ph + 3} w={pw - 6} h={ph - 6} color={color} mine={mine} s={drop} flip={ltl ? (flip < 0.5 ? flip : flip) : 0} />;
      })}
      {/* the roof: opaque to the right of the scan line, ghosted to the left */}
      <Img src={A("container-top", "e02")} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, opacity: 0.14 }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, clipPath: `inset(0 0 0 ${scan * 100}%)` }}>
        <Img src={A("container-top", "e02")} style={{ width: W, height: H, display: "block" }} />
      </div>
      {scan > 0 && scan < 1 ? <div style={{ position: "absolute", left: scan * W - 3, top: -14, width: 6, height: H + 28, background: ORANGE, boxShadow: `0 0 24px 8px ${ORANGE}` }} /> : null}
      {/* tractor unit, top view */}
      <div style={{ position: "absolute", left: W + 8, top: 6, width: 150, height: H - 12, borderRadius: "14px 46px 46px 14px", background: "linear-gradient(90deg, #E9E6E0, #FFFFFF 40%, #E2DED6)", boxShadow: "0 22px 34px rgba(43,28,21,.35)", border: "2px solid rgba(43,28,21,.25)" }}>
        <div style={{ position: "absolute", right: 14, top: 18, bottom: 18, width: 36, borderRadius: "6px 30px 30px 6px", background: "linear-gradient(90deg, #3A4A5E, #22303F)" }} />
        <div style={{ position: "absolute", left: 22, top: 20, width: 50, height: 10, borderRadius: 5, background: ORANGE }} />
        <div style={{ position: "absolute", left: 22, bottom: 20, width: 50, height: 10, borderRadius: 5, background: ORANGE }} />
        <div style={{ position: "absolute", right: 30, top: -14, width: 22, height: 16, borderRadius: 4, background: "#3A4A5E" }} />
        <div style={{ position: "absolute", right: 30, bottom: -14, width: 22, height: 16, borderRadius: 4, background: "#3A4A5E" }} />
      </div>
      {/* your share is pinned in LTL */}
      {ltl ? (
        <div style={{ position: "absolute", left: 15 + 2.5 * pw + pw / 2 - 40, top: -78, scale: String(interpolate(t, [T.ltl + 0.3, T.ltl + 0.6], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.4)) })) }}>
          <Icon name="map-pin" size={80} color={ORANGE} />
        </div>
      ) : null}
    </div>
  );
};

// ── FCL / LCL: real container doors swing open on the cargo wall ───────────────────────────────────────
const DoorsReveal: React.FC<{ t: number }> = ({ t }) => {
  if (t < 15.0 || t > 23.4) return null;
  const rise = interpolate(t, [15.0, 15.55], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sink = interpolate(t, [22.9, 23.35], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  // open on FCL, slam shut, reopen on LCL
  const open = interpolate(t, [T.fcl + 0.05, T.fcl + 0.65, T.lcl - 0.55, T.lcl - 0.25, T.lcl + 0.05, T.lcl + 0.65], [0, 1, 1, 0, 0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const shared = t >= T.lcl - 0.25;
  const W = 380;
  const H = (W * 1672) / 941;
  const left = 540 - W / 2;
  const top = 600;
  const cols = 3;
  const rows = 5;
  const bw = (W - 50) / cols;
  const bh = (H - 120) / rows;
  const mine = [1, 4, 6, 7, 12];
  return (
    <div style={{ position: "absolute", left, top: top + rise * 900 + sink * 900, width: W, height: H, perspective: 1300 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: "linear-gradient(180deg, #1B130E, #2C2018)", boxShadow: "0 30px 50px rgba(43,28,21,.4)" }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <polygon points={`0,${H} ${W},${H} ${W - 60},${H - 70} 60,${H - 70}`} fill="#3A2A20" />
        <line x1={0} y1={0} x2={60} y2={50} stroke="#4A382C" strokeWidth={3} />
        <line x1={W} y1={0} x2={W - 60} y2={50} stroke="#4A382C" strokeWidth={3} />
      </svg>
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const isMine = !shared || mine.includes(i);
        const col = SHIPPERS[(i * 5 + r) % SHIPPERS.length];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 25 + c * bw + 3,
              top: 40 + r * bh + 3,
              width: bw - 6,
              height: bh - 6,
              borderRadius: 4,
              background: isMine ? `linear-gradient(160deg, ${BRAND.amber}, ${ORANGE} 60%, ${BRAND.ember})` : col,
              boxShadow: "inset 0 -5px 0 rgba(0,0,0,.2), inset 0 3px 0 rgba(255,255,255,.18)",
            }}
          >
            <div style={{ position: "absolute", left: 0, right: 0, top: "42%", height: 8, background: "rgba(255,255,255,.22)" }} />
          </div>
        );
      })}
      {shared ? (
        <div style={{ position: "absolute", left: 25 + 1 * bw + bw / 2 - 38, top: -20, scale: String(interpolate(t, [T.lcl + 0.4, T.lcl + 0.7], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.4)) })) }}>
          <Icon name="map-pin" size={76} color={ORANGE} />
        </div>
      ) : null}
      {(
        [
          [0, -1],
          [1, 1],
        ] as const
      ).map(([half, side]) => (
        <div
          key={half}
          style={{
            position: "absolute",
            left: half ? W / 2 : 0,
            top: 0,
            width: W / 2,
            height: H,
            overflow: "hidden",
            transformOrigin: half ? "100% 50%" : "0% 50%",
            transform: `rotateY(${side * -112 * open}deg)`,
            filter: `brightness(${1 - 0.45 * open})`,
            boxShadow: "0 20px 30px rgba(0,0,0,.35)",
          }}
        >
          <Img src={A("container-doors", "e02")} style={{ position: "absolute", left: half ? -W / 2 : 0, top: 0, width: W, height: H }} />
        </div>
      ))}
    </div>
  );
};

/** The ship sails along the bottom edge of the chart on engraved waves. */
const ShipSail: React.FC<{ t: number }> = ({ t }) => {
  const show = interpolate(t, [T.sea[0] - 0.2, T.sea[0] + 0.4, T.sea[1] - 0.3, T.sea[1] + 0.1], [0, 1, 1, 0], { ...clamp, easing: io });
  if (show <= 0) return null;
  const x = interpolate(t, [T.sea[0] - 0.2, T.sea[1]], [-700, 420], clamp);
  const bob = Math.sin(t * 2.2) * 5;
  const rollDeg = Math.sin(t * 1.7) * 1.1;
  const wave = (amp: number, len: number, speed: number, y: number, op: number, w: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 56; i++) {
      const px = i * 20 - 10;
      pts.push(`${px},${(y + Math.sin((px + t * speed) / len) * amp).toFixed(1)}`);
    }
    return <polyline points={pts.join(" ")} fill="none" stroke={INK} strokeOpacity={op} strokeWidth={w} strokeLinecap="round" />;
  };
  return (
    <div style={{ position: "absolute", left: 0, top: 1360, width: 1080, height: 360, opacity: show }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(251,243,228,0), rgba(251,243,228,.92) 38%, rgba(251,243,228,.95))" }} />
      <svg width={1080} height={360} style={{ position: "absolute", inset: 0 }}>
        {wave(6, 44, 70, 248, 0.32, 2)}
        {wave(8, 60, -45, 268, 0.42, 2.5)}
        {wave(5, 34, 95, 288, 0.3, 2)}
        {wave(7, 52, -60, 308, 0.22, 2)}
      </svg>
      <div style={{ position: "absolute", left: x, top: 52 + bob, width: 640, rotate: `${rollDeg}deg`, transformOrigin: "50% 90%" }}>
        <Img src={A("inter-island-cargo-ship")} style={{ width: 640, display: "block", filter: "drop-shadow(0 10px 8px rgba(43,28,21,.25))" }} />
        <svg width={320} height={40} style={{ position: "absolute", left: -300, top: 172 }}>
          {[0, 1, 2].map((i) => {
            const o = (t * 140 + i * 110) % 320;
            return <line key={i} x1={320 - o} x2={320 - o - 70} y1={18 + i * 6} y2={18 + i * 6} stroke={INK} strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" />;
          })}
        </svg>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 230, height: 130, overflow: "hidden" }}>
        <svg width={1080} height={130}>{wave(6, 40, 110, 22, 0.45, 2.5)}</svg>
      </div>
    </div>
  );
};

/** Sorong: the port town pops up from the chart like a pop-up book. */
const PortPopUp: React.FC<{ t: number }> = ({ t }) => {
  if (t < 24.25 || t > 30) return null;
  const up = interpolate(t, [24.25, 24.95], [90, 0], { ...clamp, easing: Easing.out(Easing.back(1.5)) });
  const down = interpolate(t, [29.55, 29.95], [0, 92], { ...clamp, easing: Easing.in(Easing.cubic) });
  const sway = Math.sin(t * 1.3) * 1.2;
  return (
    <div style={{ position: "absolute", left: 50, top: 470, width: 980, height: 520, perspective: 1300 }}>
      <div style={{ position: "absolute", left: 40, right: 40, bottom: 0, height: 30, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(43,28,21,.4), rgba(43,28,21,0))" }} />
      <div style={{ position: "absolute", inset: 0, transformOrigin: "50% 100%", transform: `rotateX(${up + down}deg) rotateZ(${sway}deg)` }}>
        <Img src={A("port-town-vignette")} style={{ position: "absolute", left: 0, bottom: 12, width: 980, filter: "drop-shadow(0 20px 22px rgba(43,28,21,.3))" }} />
      </div>
    </div>
  );
};

const HandoffChain: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.handoff[0] - 0.1 || t > 29.95) return null;
  const out = interpolate(t, [29.5, 29.9], [1, 0], clamp);
  const icons: PhosphorName[] = ["truck", "boat", "truck"];
  return (
    <div style={{ position: "absolute", left: 200, top: 1030, width: 680, height: 130, opacity: out }}>
      {[0, 1].map((i) => {
        const flash = t > T.handoff[1] + i * 0.15 ? 0.5 + 0.5 * Math.sin((t - T.handoff[1]) * 14) : 0;
        const draw = interpolate(t, [T.handoff[0] + 0.15 + i * 0.25, T.handoff[0] + 0.45 + i * 0.25], [0, 1], clamp);
        return <div key={i} style={{ position: "absolute", left: 110 + i * 240, top: 60, width: 240 * draw, height: 10, borderRadius: 5, background: flash > 0.5 ? ORANGE : INK, boxShadow: flash > 0.5 ? `0 0 22px ${ORANGE}` : "none" }} />;
      })}
      {icons.map((ic, i) => {
        const s = interpolate(t, [T.handoff[0] + i * 0.25, T.handoff[0] + i * 0.25 + 0.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.4)) });
        return (
          <div key={i} style={{ position: "absolute", left: i * 240 + 40, top: 0, width: 130, height: 130, borderRadius: "50%", display: "grid", placeItems: "center", background: i === 1 ? INK : ORANGE, border: "6px solid #fff", boxShadow: "0 12px 22px rgba(43,28,21,.35)", scale: String(s) }}>
            <Icon name={ic} size={72} />
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
      <div style={{ overflow: "hidden", height: 196 }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 188, lineHeight: 1, color: INK, translate: `0 ${(1 - inK) * 100}%`, whiteSpace: "nowrap" }}>
          LAST <span style={{ color: DEEP }}>MILE</span>
        </div>
      </div>
      <svg width={640} height={40}>
        <path d="M6 20 C 160 0, 300 40, 620 18" fill="none" stroke={ORANGE} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - line} />
      </svg>
    </div>
  );
};

/** Compass rose: big and spinning behind the globe, then it docks onto the chart's printed compass. */
const Compass: React.FC<{ t: number }> = ({ t }) => {
  const dock = interpolate(t, [0.35, 1.1], [0, 1], { ...clamp, easing: io });
  const fade = interpolate(t, [1.0, 1.3], [1, 0], clamp);
  if (fade <= 0) return null;
  const size = lerp(1500, 170, dock);
  const x = lerp(540, 930, dock);
  const y = lerp(1000, 161, dock);
  return (
    <Img
      src={A("compass-rose")}
      style={{ position: "absolute", left: x - size / 2, top: y - (size * 997) / 955 / 2, width: size, rotate: `${(1 - dock) * 200 - t * 40}deg`, opacity: fade * (0.35 + 0.65 * dock), mixBlendMode: "multiply" }}
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
  const chartOn = interpolate(t, [0.38, 0.48], [0, 1], clamp) * interpolate(t, [T.pinToG[0], T.logo + 0.2], [1, 0], clamp);
  // Panels need calm paper behind them: a soft veil over the chart while they are on screen.
  const veil = Math.max(
    interpolate(t, [T.ftl - 0.6, T.ftl - 0.1, 13.3, 13.7], [0, 1, 1, 0], clamp),
    interpolate(t, [15.0, 15.5, 22.9, 23.4], [0, 1, 1, 0], clamp),
  );
  const hits = [T.slam, T.dive1[1] - 0.05, T.out1[0] + 0.3, T.dive2[1] - 0.05, T.door + 0.35, T.lcl - 0.25, T.noTolerance, T.out2[0] + 0.1].map(sec);
  const sfx: SfxCue[] = [
    { at: 0, name: "whoosh", volume: 0.7 },
    { at: sec(T.slam), name: "boom", volume: 0.9 },
    { at: sec(T.slam), name: "horn", volume: 0.7 },
    { at: sec(T.tear[0]), name: "whoosh", volume: 0.55 },
    { at: sec(T.dive1[0]), name: "whoosh", volume: 0.5 },
    { at: sec(T.dive1[1] - 0.05), name: "boom", volume: 0.4 },
    { at: sec(T.ftl - 0.55), name: "whoosh", volume: 0.4 },
    { at: sec(T.ftl + 0.05), name: "glitch", volume: 0.2 },
    { at: sec(T.ltl - 0.1), name: "tick", volume: 0.4 },
    { at: sec(T.toShip), name: "whoosh", volume: 0.4 },
    { at: sec(T.out1[0] + 0.2), name: "whoosh", volume: 0.6 },
    { at: sec(T.sea[0] + 0.2), name: "horn", volume: 0.35 },
    { at: sec(T.fcl + 0.05), name: "crunch", volume: 0.4 },
    { at: sec(T.lcl - 0.25), name: "crunch", volume: 0.55 },
    { at: sec(T.lcl + 0.05), name: "crunch", volume: 0.4 },
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
      <Compass t={t} />
      <Globe t={t} />
      <Shake hits={hits} amount={14}>
        <AbsoluteFill
          style={{
            opacity: chartOn,
            perspective: 1700,
            perspectiveOrigin: `540px ${cam.fy}px`,
            // horizon haze: the far edge of the tilted chart fades into the paper
            WebkitMaskImage: `linear-gradient(180deg, transparent ${cam.tilt * 0.35}%, #000 ${cam.tilt * 0.72 + 2}%)`,
            maskImage: `linear-gradient(180deg, transparent ${cam.tilt * 0.35}%, #000 ${cam.tilt * 0.72 + 2}%)`,
          }}
        >
          <AbsoluteFill style={{ transformOrigin: `540px ${cam.fy}px`, transform: `rotateX(${cam.tilt}deg)`, mixBlendMode: "multiply" }}>
            <Chart t={t} cam={cam} />
          </AbsoluteFill>
          <AbsoluteFill style={{ transformOrigin: `540px ${cam.fy}px`, transform: `rotateX(${cam.tilt}deg)` }}>
            <ChartLabels cam={cam} />
            <PlanIcons t={t} cam={cam} />
            <Vehicle t={t} cam={cam} />
          </AbsoluteFill>
        </AbsoluteFill>
        <DoorPin t={t} cam={cam} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(251,243,228,.95) 0%, rgba(251,243,228,.88) 48%, rgba(251,243,228,0) 66%)", opacity: veil }} />
        <AbsoluteFill style={{ background: "#C0392B", mixBlendMode: "multiply", opacity: red * 0.45 }} />
        <AbsoluteFill style={{ background: "rgba(251,243,228,.6)", opacity: red }} />
      </Shake>
      <Ticks cam={cam} t={t} />

      <TruckXray t={t} />
      <DoorsReveal t={t} />
      <ShipSail t={t} />
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
