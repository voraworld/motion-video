import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { geoBounds, geoContains, geoGraticule10, geoMercator, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import land110 from "world-atlas/land-110m.json";
import land50 from "world-atlas/land-50m.json";
import { asset, beatsOf, getEpisode, sec } from "../data";
import { BrandFrame } from "../brand/BrandFrame";
import { BRAND, FONT_BODY, FONT_MONO, FONT_SERIF } from "../brand/tokens";
import { Captions } from "../shared/Captions";
import { HfOverlay } from "../shared/HfOverlay";
import { Shake } from "../shared/Impact";
import { PHOSPHOR, PhosphorName } from "../shared/phosphor";
import { SfxCue, SoundLayer } from "../shared/SoundLayer";
import MAP from "../generated/e03-map.json";

/**
 * E03 · Jakarta to Sorong (50 s) — a navigation-app journey.
 *
 * Real streets: OpenStreetMap data (OpenFreeMap vector tiles) pre-rendered with MapLibre into two city plates
 * (scripts/e03-plates.mjs); real truck routes from OSRM with their street names; Natural Earth coastlines for
 * the sea leg. The camera is a navigation camera: tilted, turning with the vehicle, the route ahead orange and
 * the route behind grey. The vehicle is a 3D top-view sprite that changes at every mode switch:
 * truck → ship → truck → destination pin → UGC logo.
 *
 * Shots: globe dives onto Jakarta, route tears to Sorong · Sunter → Tanjung Priok with turn banners, bottom sheet
 * shows FTL/LTL with pallets loading an open truck · scale zoom out, the ship sails Java → Flores → Banda sea,
 * bottom sheet FCL/LCL with an open container · dive into Sorong, last mile, pin drops, handoff chain ·
 * Zero ODOL (HyperFrames) · whole plan with a plane on the domestic-air arc · pin flies into the logo's G.
 *
 * Map data © OpenStreetMap contributors (ODbL) · OpenFreeMap / OpenMapTiles · Natural Earth.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ep = getEpisode("E03");
const beats = beatsOf(ep);
const A = (name: string, epId = "e03") => staticFile(asset(epId, name) ?? `assets/${epId}/${name}.png`);
const io = Easing.bezier(0.65, 0, 0.35, 1);
const INK = BRAND.ink;
const ORANGE = BRAND.orange;
const DEEP = "#C8471A";
const WATER = "#A6D1F0";
const LAND = "#EEEFEA";
const GREY = "#BFC6CE";

type Pt = { x: number; y: number };
const pt = (p: number[]): Pt => ({ x: p[0], y: p[1] });
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
function prog(t: number, a: number, b: number) {
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}

// ── Routes ──────────────────────────────────────────────────────────────────────────────────────────────
type Poly = { pts: Pt[]; cum: number[]; len: number };
const poly = (pts: Pt[]): Poly => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, len: cum[cum.length - 1] };
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
/** Split a polyline at fraction f: [behind, ahead]. */
const split = (pl: Poly, f: number): [Pt[], Pt[]] => {
  const target = Math.max(0, Math.min(1, f)) * pl.len;
  let i = 1;
  while (i < pl.cum.length - 1 && pl.cum[i] < target) i++;
  const p = at(pl, f);
  return [[...pl.pts.slice(0, i), p], [p, ...pl.pts.slice(i)]];
};
const ROAD_J = poly(MAP.roads.jakarta.pts.map(pt));
const ROAD_S = poly(MAP.roads.sorong.pts.map(pt));
const SEA = poly([ROAD_J.pts[ROAD_J.pts.length - 1], ...MAP.sea.slice(1, -1).map(pt), ROAD_S.pts[0]]);
const FULL = poly([...ROAD_J.pts, ...SEA.pts.slice(1), ...ROAD_S.pts.slice(1)]);
const JAKARTA = ROAD_J.pts[0];
const SORONG = ROAD_S.pts[0];
const DOOR = ROAD_S.pts[ROAD_S.pts.length - 1];
const seaYs = SEA.pts.map((p) => p.y);
const OVER: Pt = { x: (JAKARTA.x + DOOR.x) / 2, y: (Math.min(...seaYs) + Math.max(...seaYs)) / 2 };
const AIR_C = { x: OVER.x, y: OVER.y - 560 };
const airAt = (f: number) => {
  const a = JAKARTA;
  const b = DOOR;
  const u = 1 - f;
  return {
    x: u * u * a.x + 2 * u * f * AIR_C.x + f * f * b.x,
    y: u * u * a.y + 2 * u * f * AIR_C.y + f * f * b.y,
    a: Math.atan2(2 * u * (AIR_C.y - a.y) + 2 * f * (b.y - AIR_C.y), 2 * u * (AIR_C.x - a.x) + 2 * f * (b.x - AIR_C.x)),
  };
};

// ── Timeline (VO word starts from whisper timestamps on the generated VO) ────────────────────────────────
const T = {
  slam: 0.5,
  tear: [0.95, 1.95] as const,
  dive1: [3.55, 4.6] as const,
  jkt: [4.6, 13.6] as const,
  ftl: 5.54,
  ltl: 8.08,
  out1: [13.6, 15.2] as const,
  toShip: 14.0,
  sea: [15.0, 23.4] as const,
  fcl: 15.71,
  lcl: 18.31,
  dive2: [23.4, 24.5] as const,
  toTruck: 24.0,
  srg: [24.5, 26.3] as const,
  door: 26.3,
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
const ease = Easing.inOut(Easing.sin);
const fJ = (t: number) => interpolate(t, T.jkt, [0, 1], { ...clamp, easing: ease });
const fSea = (t: number) => interpolate(t, T.sea, [0, 1], { ...clamp, easing: ease });
const fS = (t: number) => interpolate(t, T.srg, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

// ── Camera ──────────────────────────────────────────────────────────────────────────────────────────────
type Cam = { c: Pt; s: number; tilt: number; roll: number; fy: number };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  c: { x: lerp(a.c.x, b.c.x, k), y: lerp(a.c.y, b.c.y, k) },
  s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), k)),
  tilt: lerp(a.tilt, b.tilt, k),
  roll: lerp(a.roll, b.roll, k),
  fy: lerp(a.fy, b.fy, k),
});
const S_PER_RAD = (MAP.pxPerDeg * 180) / Math.PI;
const GLOBE_END_S = 9;
const OVERVIEW = 0.335;
const SEA_S = 0.62;
const STREET_J = 330;
const STREET_S = 420;
const NAV_TILT = 46;
const globeR = (t: number) => 300 * Math.pow((S_PER_RAD * GLOBE_END_S) / 300, Easing.in(Easing.cubic)(prog(t, 0, T.slam)));
/** Navigation-style heading: the route ahead points up the screen (smoothed). */
const headingRoll = (pl: Poly, f: number, span = 0.03) => {
  let sx = 0;
  let sy = 0;
  for (let k = -3; k <= 3; k++) {
    const p = at(pl, f + k * span);
    sx += Math.cos(p.a);
    sy += Math.sin(p.a);
  }
  return -(Math.atan2(sy, sx) * 180) / Math.PI - 90;
};
const unwrap = (deg: number, ref: number) => {
  let d = deg;
  while (d - ref > 180) d -= 360;
  while (d - ref < -180) d += 360;
  return d;
};

const camera = (t: number): Cam => {
  const jkt: Cam = { c: JAKARTA, s: GLOBE_END_S, tilt: 0, roll: 0, fy: 1000 };
  const over: Cam = { c: OVER, s: OVERVIEW, tilt: 24, roll: 0, fy: 1120 };
  const navJ = (tt: number): Cam => ({ c: at(ROAD_J, fJ(tt)), s: STREET_J, tilt: NAV_TILT, roll: unwrap(headingRoll(ROAD_J, fJ(tt)), 0), fy: 1150 });
  const navS = (tt: number): Cam => ({ c: at(ROAD_S, fS(tt)), s: STREET_S, tilt: NAV_TILT, roll: unwrap(headingRoll(ROAD_S, fS(tt), 0.05), 0), fy: 1150 });
  if (t < T.slam) return { ...jkt, s: globeR(t) / S_PER_RAD };
  if (t < 0.85) return mixCam(jkt, { ...jkt, s: 8 }, Easing.out(Easing.back(2))(prog(t, T.slam, 0.85)));
  if (t < 2.1) return mixCam({ ...jkt, s: 8 }, over, io(prog(t, 0.85, 2.1)));
  if (t < T.dive1[0]) return mixCam(over, { ...over, s: OVERVIEW * 1.06 }, prog(t, 2.1, T.dive1[0]));
  if (t < T.dive1[1]) return mixCam({ ...over, s: OVERVIEW * 1.06 }, navJ(T.jkt[0]), Easing.bezier(0.6, 0, 0.2, 1)(prog(t, ...T.dive1)));
  if (t < T.out1[0]) {
    const zoomOut = 1 - 0.32 * Math.sin(Math.PI * prog(t, 7.4, 11.4)) * (t > 7.4 && t < 11.4 ? 1 : 0);
    const c = navJ(t);
    return { ...c, s: c.s * zoomOut };
  }
  const sea0: Cam = { c: at(SEA, 0), s: SEA_S, tilt: 30, roll: 0, fy: 1060 };
  if (t < T.out1[1]) {
    const k = prog(t, ...T.out1);
    const wide: Cam = { ...over, s: 0.24, tilt: 18 };
    return k < 0.62 ? mixCam(navJ(T.out1[0]), wide, io(k / 0.62)) : mixCam(wide, sea0, io((k - 0.62) / 0.38));
  }
  if (t < T.dive2[0]) return { c: at(SEA, fSea(t)), s: SEA_S, tilt: 30, roll: 0, fy: 1060 };
  if (t < T.dive2[1]) {
    const k = prog(t, ...T.dive2);
    const s0: Cam = { c: at(SEA, fSea(T.dive2[0])), s: SEA_S, tilt: 30, roll: 0, fy: 1060 };
    const wide: Cam = { c: { x: lerp(s0.c.x, SORONG.x, 0.6), y: lerp(s0.c.y, SORONG.y, 0.6) }, s: 0.42, tilt: 20, roll: 0, fy: 1100 };
    return k < 0.3 ? mixCam(s0, wide, io(k / 0.3)) : mixCam(wide, navS(T.srg[0]), Easing.bezier(0.6, 0, 0.2, 1)((k - 0.3) / 0.7));
  }
  if (t < T.out2[0]) {
    if (t < T.srg[1]) return navS(t);
    const d = navS(T.srg[1]);
    return { ...d, roll: d.roll + 18 * io(prog(t, T.srg[1], T.stuck)), s: d.s * (1 + 0.15 * prog(t, T.stuck, T.out2[0])) };
  }
  const ugc: Cam = { c: { x: OVER.x, y: OVER.y - 150 }, s: OVERVIEW, tilt: 30, roll: 0, fy: 1260 };
  const d = navS(T.srg[1]);
  const doorEnd: Cam = { ...d, roll: d.roll + 18, s: d.s * 1.15 };
  if (t < T.out2[1]) return mixCam(doorEnd, ugc, io(prog(t, ...T.out2)));
  return { ...ugc, s: OVERVIEW * (1 + 0.06 * prog(t, T.out2[1], T.pinToG[0])), roll: -3 * prog(t, T.out2[1], T.pinToG[0]) };
};

/** World → screen before the tilt (includes the camera roll). */
const toScreen = (cam: Cam, p: Pt) => {
  const dx = (p.x - cam.c.x) * cam.s;
  const dy = (p.y - cam.c.y) * cam.s;
  const r = (cam.roll * Math.PI) / 180;
  return { x: 540 + dx * Math.cos(r) - dy * Math.sin(r), y: cam.fy + dx * Math.sin(r) + dy * Math.cos(r) };
};
const PERSP = 1700;
/** Screen point after the CSS tilt (rotateX about the focus line, perspective PERSP). */
const tilted = (cam: Cam, p: { x: number; y: number }) => {
  const th = (cam.tilt * Math.PI) / 180;
  const dy = p.y - cam.fy;
  const y1 = dy * Math.cos(th);
  const z1 = -dy * Math.sin(th);
  const k = PERSP / (PERSP - z1);
  return { x: 540 + (p.x - 540) * k, y: cam.fy + y1 * k, k };
};

// ── The map canvas: water, land, city plates, route ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAND50: any = (() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f: any = feature(land50 as any, (land50 as any).objects.land);
  const geom = f.type === "FeatureCollection" ? f.features[0].geometry : f.geometry;
  const polys = geom.coordinates.filter((poly: number[][][]) => {
    const [[x0, y0], [x1, y1]] = geoBounds({ type: "Polygon", coordinates: poly } as never);
    return x1 > 88 && x0 < 150 && y1 > -16 && y0 < 14;
  });
  return { type: "MultiPolygon", coordinates: polys };
})();
const P0 = geoMercator().scale(S_PER_RAD).translate([0, 0])([MAP.lon0, MAP.lat0]) as [number, number];
const CW = 1840;
const CH = 2660;
const OX = 380;
const OY = 420;
const PLATES = [
  { key: "jakarta", ...MAP.plates.jakarta },
  { key: "sorong", ...MAP.plates.sorong },
];

const usePlates = () => {
  const [imgs, setImgs] = useState<Record<string, HTMLImageElement> | null>(null);
  const [handle] = useState(() => delayRender("Loading E03 map plates"));
  useEffect(() => {
    let left = PLATES.length;
    const out: Record<string, HTMLImageElement> = {};
    for (const p of PLATES) {
      const img = new Image();
      img.onload = () => {
        out[p.key] = img;
        left -= 1;
        if (left === 0) {
          setImgs(out);
          continueRender(handle);
        }
      };
      img.src = staticFile(p.file);
    }
  }, [handle]);
  return imgs;
};

type RouteState = { behind: Pt[][]; ahead: Pt[][]; tear: number; glow: number; air: number };
const routeState = (t: number): RouteState => {
  const tear = interpolate(t, T.tear, [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const glow = interpolate(t, [T.everyLeg - 0.2, T.everyLeg + 0.6], [0, 1], clamp);
  const air = interpolate(t, [T.air, T.air + 1.6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  if (t < T.jkt[0] || t >= T.out2[1]) return { behind: [], ahead: [FULL.pts], tear: t < T.jkt[0] ? tear : 1, glow, air };
  if (t < T.toShip + 0.4) {
    const [b, a] = split(ROAD_J, fJ(t));
    return { behind: [b], ahead: [a, SEA.pts, ROAD_S.pts], tear: 1, glow, air };
  }
  if (t < T.srg[0]) {
    const [b, a] = split(SEA, fSea(t));
    return { behind: [ROAD_J.pts, b], ahead: [a, ROAD_S.pts], tear: 1, glow, air };
  }
  const [b, a] = split(ROAD_S, fS(t));
  return { behind: [ROAD_J.pts, SEA.pts, b], ahead: [a], tear: 1, glow, air };
};

const MapCanvas: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const plates = usePlates();
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const fx = OX + 540;
    const fy = OY + cam.fy;
    const W2S = (p: Pt): [number, number] => [fx + (p.x - cam.c.x) * cam.s, fy + (p.y - cam.c.y) * cam.s];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = WATER;
    ctx.fillRect(0, 0, CW, CH);
    ctx.translate(fx, fy);
    ctx.rotate((cam.roll * Math.PI) / 180);
    ctx.translate(-fx, -fy);
    // land (Natural Earth), re-projected for this frame and clipped around the canvas
    const proj = geoMercator()
      .scale(S_PER_RAD * cam.s)
      .translate([fx - (P0[0] + cam.c.x) * cam.s, fy - (P0[1] + cam.c.y) * cam.s])
      .clipExtent([
        [-1400, -1400],
        [CW + 1400, CH + 1400],
      ]);
    const path = geoPath(proj, ctx);
    ctx.beginPath();
    path(LAND50);
    let landDrawn = true;
    ctx.fillStyle = LAND;
    ctx.fill();
    if (cam.s < 60) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#B9C3CC";
      ctx.stroke();
    }
    const centre = proj.invert?.([fx, fy]);
    if (centre && cam.s > 60 && !geoContains(LAND50, centre)) landDrawn = false;
    void landDrawn;
    // city plates (real streets), fading in as the camera reaches street level
    const plateOn = interpolate(Math.log(cam.s), [Math.log(18), Math.log(70)], [0, 1], clamp);
    if (plates && plateOn > 0) {
      for (const p of PLATES) {
        const [x0, y0] = W2S({ x: p.x0, y: p.y0 });
        const [x1, y1] = W2S({ x: p.x1, y: p.y1 });
        if (x1 < -2000 || x0 > CW + 2000 || y1 < -2000 || y0 > CH + 2000) continue;
        ctx.globalAlpha = plateOn;
        ctx.drawImage(plates[p.key], x0, y0, x1 - x0, y1 - y0);
        ctx.globalAlpha = 1;
      }
    }
    // route
    const rs = routeState(t);
    const line = (pts: Pt[], color: string, width: number, alpha = 1, dash?: number[]) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const [x, y] = W2S(p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash(dash ?? []);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    };
    const wide = cam.s < 3;
    const cw = wide ? 12 : 26;
    const iw = wide ? 7 : 16;
    if (rs.air > 0) {
      const airPts = Array.from({ length: 80 }, (_, i) => airAt((i / 79) * rs.air));
      line(airPts, INK, 5, 0.75, [16, 14]);
    }
    for (const b of rs.behind) {
      line(b, "#8E98A3", cw);
      line(b, GREY, iw);
    }
    for (const a of rs.ahead) {
      const pts = rs.tear < 1 && a === FULL.pts ? split(FULL, rs.tear)[0] : a;
      line(pts, DEEP, cw);
      line(pts, ORANGE, iw);
      if (rs.glow > 0) line(pts, "#FFF7EF", wide ? 3 : 5, rs.glow, [12, 18]);
    }
  });
  return <canvas ref={ref} width={CW} height={CH} style={{ position: "absolute", left: -OX, top: -OY, width: CW, height: CH }} />;
};

// ── Globe (hook) ────────────────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAND110 = feature(land110 as any, (land110 as any).objects.land);
const GRAT = geoGraticule10();
const Globe: React.FC<{ t: number }> = ({ t }) => {
  if (t > T.slam + 0.02) return null;
  const k = Easing.out(Easing.cubic)(prog(t, 0, 0.42));
  const r = globeR(t);
  const proj = geoOrthographic()
    .scale(r)
    .translate([540, 1000])
    .rotate([-lerp(78, 106.85, k), -lerp(16, -6.2, k)])
    .clipExtent([
      [-20, -20],
      [1100, 1940],
    ]);
  const path = geoPath(proj);
  const fade = interpolate(t, [0.38, 0.48], [1, 0], clamp);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: fade }}>
      <defs>
        <radialGradient id="e03-globe" cx="40%" cy="36%" r="70%">
          <stop offset="0" stopColor="#CFE7F8" />
          <stop offset="0.7" stopColor={WATER} />
          <stop offset="1" stopColor="#7FB6DD" />
        </radialGradient>
      </defs>
      <circle cx={540} cy={1000} r={r + 40} fill="rgba(166,209,240,.25)" />
      <path d={path({ type: "Sphere" }) ?? ""} fill="url(#e03-globe)" stroke="#7FA9C9" strokeWidth={3} />
      <path d={path(GRAT) ?? ""} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.2} />
      <path d={path(LAND110 as never) ?? ""} fill={LAND} stroke="#9EAAB5" strokeWidth={1.4} />
      <circle cx={540} cy={1000} r={12 + 16 * k} fill={ORANGE} stroke="#fff" strokeWidth={5} opacity={k} />
    </svg>
  );
};

// ── Map furniture ───────────────────────────────────────────────────────────────────────────────────────
const Icon: React.FC<{ name: PhosphorName; size: number; color?: string }> = ({ name, size, color = "#fff" }) => (
  <svg viewBox="0 0 256 256" width={size} height={size} fill={color} aria-hidden>
    {PHOSPHOR[name].map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

/** Overview labels (upright, after the tilt). */
const Labels: React.FC<{ cam: Cam }> = ({ cam }) => {
  const on = interpolate(Math.log(cam.s), [Math.log(0.8), Math.log(1.6)], [1, 0], clamp);
  if (on <= 0.01) return null;
  return (
    <>
      {MAP.labels.map((l, i) => {
        const p = tilted(cam, toScreen(cam, pt(l.at)));
        return (
          <div key={i} style={{ position: "absolute", left: p.x, top: p.y, translate: "-50% -50%", scale: String(p.k), fontFamily: FONT_BODY, fontWeight: l.sea ? 600 : 700, fontStyle: l.sea ? "italic" : "normal", fontSize: l.sea ? 22 : 26, letterSpacing: "0.24em", color: l.sea ? "#4E7EA3" : "#6B7480", opacity: on, whiteSpace: "nowrap" }}>
            {l.text}
          </div>
        );
      })}
      {(
        [
          ["Jakarta", JAKARTA, -1],
          ["Sorong", DOOR, 1],
        ] as const
      ).map(([name, p0, side]) => {
        const p = tilted(cam, toScreen(cam, p0));
        return (
          <div key={name} style={{ position: "absolute", left: p.x, top: p.y, opacity: on }}>
            <div style={{ position: "absolute", left: -14, top: -14, width: 28, height: 28, borderRadius: "50%", background: "#fff", border: `7px solid ${ORANGE}`, boxShadow: "0 4px 10px rgba(0,0,0,.25)" }} />
            <div style={{ position: "absolute", top: side < 0 ? 24 : -66, left: side < 0 ? -40 : -130, padding: "6px 16px", borderRadius: 22, background: "#fff", boxShadow: "0 6px 16px rgba(30,40,50,.18)", fontFamily: FONT_BODY, fontWeight: 800, fontSize: 28, color: INK, whiteSpace: "nowrap" }}>
              {name}
            </div>
          </div>
        );
      })}
    </>
  );
};

/** The vehicle: a 3D top-view sprite lying on the tilted map, swapping at every mode change. */
const SPRITES: { from: number; name: string; len: number; w: number; h: number }[] = [
  { from: -1, name: "nav-truck-top", len: 210, w: 713, h: 1475 },
  { from: T.toShip, name: "nav-ship-top", len: 250, w: 433, h: 1501 },
  { from: T.toTruck, name: "nav-truck-top", len: 210, w: 713, h: 1475 },
];
const vehiclePos = (t: number) => (t < T.toShip ? at(ROAD_J, fJ(t)) : t < T.toTruck ? at(SEA, fSea(t)) : at(ROAD_S, fS(t)));
const Vehicle: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (t < T.dive1[0] + 0.25 || t >= T.door) return null;
  const pos = vehiclePos(t);
  const p = toScreen(cam, pos);
  const m = [...SPRITES].reverse().find((x) => t >= x.from) ?? SPRITES[0];
  const swapIn = m.from > 0 ? interpolate(t - m.from, [0, 0.2, 0.36], [0.15, 1.15, 1], clamp) : 1;
  const next = SPRITES.find((x) => x.from > t);
  const swapOut = next ? interpolate(next.from - t, [0, 0.16], [0.15, 1], clamp) : 1;
  const enter = interpolate(t, [T.dive1[0] + 0.25, T.dive1[0] + 0.65], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  const scale = Math.min(swapIn, swapOut) * enter;
  // smoothed heading on screen
  let sx = 0;
  let sy = 0;
  for (let k = -2; k <= 2; k++) {
    const q = vehiclePos(t + k * 0.12);
    sx += Math.cos(q.a);
    sy += Math.sin(q.a);
  }
  const heading = (Math.atan2(sy, sx) * 180) / Math.PI + 90 + cam.roll;
  const h = m.len;
  const w = (m.len * m.w) / m.h;
  const halo = (t * 1.1) % 1;
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y }}>
      <div style={{ position: "absolute", left: -130, top: -130, width: 260, height: 260, borderRadius: "50%", background: "rgba(242,106,31,.14)", border: "3px solid rgba(242,106,31,.5)", scale: String(0.7 + halo * 0.5), opacity: 1 - halo }} />
      <div style={{ position: "absolute", left: -95, top: -95, width: 190, height: 190, borderRadius: "50%", background: "rgba(255,255,255,.55)", border: "4px solid #fff", boxShadow: "0 10px 26px rgba(30,40,50,.28)", scale: String(enter) }} />
      <Img
        src={A(m.name)}
        style={{
          position: "absolute",
          left: -w / 2,
          top: -h / 2,
          width: w,
          height: h,
          rotate: `${heading}deg`,
          scale: String(scale),
          filter: `drop-shadow(8px 14px 10px rgba(20,30,40,.4))${scale < 0.9 ? ` blur(${(1 - scale) * 6}px)` : ""}`,
        }}
      />
    </div>
  );
};

/** Destination pin (3D asset, upright) at the door; at the end it flies into the logo's G. */
const DoorPin: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (t < T.door - 0.05 || t > T.pinToG[1] + 0.3) return null;
  const drop = interpolate(t, [T.door, T.door + 0.35], [-340, 0], { ...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0) });
  const d = t - T.door - 0.35;
  const squash = d > 0 && d < 0.6 ? 1 - 0.16 * Math.exp(-10 * d) * Math.cos(d * 30) : 1;
  const ring = d > 0 ? prog(t, T.door + 0.35, T.door + 1.2) : 0;
  const p = tilted(cam, toScreen(cam, DOOR));
  const fly = interpolate(t, T.pinToG, [0, 1], { ...clamp, easing: io });
  const baseH = t > T.out2[0] ? interpolate(t, T.out2, [230, 120], clamp) : 230;
  const h = lerp(baseH, 320, fly);
  const w = (h * 774) / 1170;
  // the hole of the pin sits at ~31% height; it lands on the G at (436, 777)
  const x = lerp(p.x, 436, fly);
  const y = lerp(p.y, 777 + h * 0.69, fly);
  const fade = interpolate(t, [T.pinToG[1] - 0.05, T.pinToG[1] + 0.25], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: fade }}>
      {ring > 0 && ring < 1 ? <div style={{ position: "absolute", left: -170 * ring, top: -45 * ring, width: 340 * ring, height: 90 * ring, borderRadius: "50%", border: `6px solid ${ORANGE}`, opacity: 1 - ring }} /> : null}
      <div style={{ position: "absolute", left: -60, top: -14, width: 120, height: 28, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(20,30,40,.35), rgba(20,30,40,0))", opacity: 1 - fly }} />
      <Img src={A("destination-pin")} style={{ position: "absolute", left: -w / 2, top: -h + drop, width: w, height: h, transformOrigin: "50% 100%", scale: `${2 - squash} ${squash}`, filter: "drop-shadow(0 16px 16px rgba(30,40,50,.35))" }} />
    </div>
  );
};

/** UGC beat: badges with the 3D vehicles on each leg, a plane flies the domestic-air arc. */
const PlanBadges: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  if (t < T.out2[1] - 0.2 || t > T.pinToG[0] + 0.3) return null;
  const fade = interpolate(t, [T.pinToG[0] - 0.2, T.pinToG[0] + 0.2], [1, 0], clamp);
  const pop = (s: number) => interpolate(t, [s, s + 0.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.4)) });
  const air = interpolate(t, [T.air, T.air + 1.6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const j = tilted(cam, toScreen(cam, JAKARTA));
  const s1 = tilted(cam, toScreen(cam, at(SEA, 0.38)));
  const s2 = tilted(cam, toScreen(cam, at(SEA, 0.7)));
  const items = [
    { x: j.x - 60, y: j.y - 120, img: "nav-truck-top", s: pop(T.legFtl) },
    { x: j.x + 70, y: j.y - 150, img: "nav-truck-top", s: pop(T.legLtl) },
    { x: s1.x, y: s1.y - 110, img: "nav-ship-top", s: pop(T.legFcl) },
    { x: s2.x, y: s2.y - 110, img: "nav-ship-top", s: pop(T.legLcl) },
  ];
  const plane = airAt(air);
  const pp = tilted(cam, toScreen(cam, plane));
  return (
    <div style={{ opacity: fade }}>
      {items.map((it, i) => (
        <div key={i} style={{ position: "absolute", left: it.x - 56, top: it.y - 56, width: 112, height: 112, borderRadius: "50%", background: "#fff", boxShadow: "0 10px 22px rgba(30,40,50,.28)", border: `5px solid ${ORANGE}`, display: "grid", placeItems: "center", scale: String(it.s), overflow: "hidden" }}>
          <Img src={A(it.img)} style={{ height: 96, rotate: "45deg" }} />
        </div>
      ))}
      {air > 0 && air < 1 ? (
        <Img src={A("nav-plane-top")} style={{ position: "absolute", left: pp.x - 90, top: pp.y - 88, width: 180, rotate: `${(plane.a * 180) / Math.PI + 90}deg`, filter: "drop-shadow(10px 18px 12px rgba(30,40,50,.35))" }} />
      ) : null}
    </div>
  );
};

// ── Navigation UI ───────────────────────────────────────────────────────────────────────────────────────
type Banner = { icon: PhosphorName; small: string; big: string };
const turnIcon = (modifier: string): PhosphorName => (modifier.includes("left") ? "arrow-bend-up-left" : modifier.includes("right") ? "arrow-bend-up-right" : "arrow-up");
const roadBanner = (key: "jakarta" | "sorong", f: number, dest: string): Banner => {
  const steps = MAP.roads[key].steps.filter((s) => s.name);
  const next = steps.find((s) => s.at > f + 0.005);
  if (!next) return { icon: "flag-checkered", small: "arriving", big: dest };
  return { icon: turnIcon(next.modifier), small: "toward", big: next.name };
};
const SEAS: [number, string][] = [
  [0, "Java Sea"],
  [0.4, "Flores Sea"],
  [0.62, "Banda Sea"],
  [0.86, "Port of Sorong"],
];
const bannerAt = (t: number): Banner | null => {
  if (t >= T.jkt[0] - 0.2 && t < T.out1[0] + 0.1) return roadBanner("jakarta", fJ(t), "Port of Tanjung Priok");
  if (t >= T.sea[0] + 0.3 && t < T.dive2[0] + 0.2) {
    const f = fSea(t);
    const cur = [...SEAS].reverse().find(([a]) => f >= a) ?? SEAS[0];
    return { icon: cur[0] >= 0.86 ? "flag-checkered" : "arrow-up", small: cur[0] >= 0.86 ? "arriving" : "across the", big: cur[1] };
  }
  if (t >= T.dive2[1] - 0.2 && t < T.stuck) return t >= T.door ? { icon: "flag-checkered", small: "arrived", big: "Sorong" } : roadBanner("sorong", fS(t), "Sorong");
  return null;
};
const NavBanner: React.FC<{ t: number }> = ({ t }) => {
  const b = bannerAt(t);
  const vis = Math.max(
    interpolate(t, [T.jkt[0] - 0.3, T.jkt[0] + 0.2, T.out1[0], T.out1[0] + 0.35], [0, 1, 1, 0], clamp),
    interpolate(t, [T.sea[0] + 0.2, T.sea[0] + 0.6, T.dive2[0], T.dive2[0] + 0.3], [0, 1, 1, 0], clamp),
    interpolate(t, [T.dive2[1] - 0.3, T.dive2[1] + 0.1, T.stuck - 0.3, T.stuck], [0, 1, 1, 0], clamp),
  );
  if (!b || vis <= 0) return null;
  // flip when the content changes: find when this banner text started
  let since = 0;
  for (let k = 1; k <= 30; k++) {
    const prev = bannerAt(t - k / 30);
    if (!prev || prev.big !== b.big) break;
    since = k / 30;
  }
  const flip = interpolate(since, [0, 0.25], [90, 0], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  return (
    <div style={{ position: "absolute", left: 40, top: 168, width: 1000, height: 156, perspective: 1000, opacity: vis, translate: `0 ${(1 - vis) * -40}px` }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 34,
          background: `linear-gradient(135deg, ${DEEP}, ${ORANGE} 60%, #F58A2A)`,
          boxShadow: "0 18px 40px rgba(200,71,26,.35), inset 0 1px 0 rgba(255,255,255,.3)",
          display: "flex",
          alignItems: "center",
          gap: 30,
          padding: "0 40px",
          transformOrigin: "50% 0%",
          transform: `rotateX(${flip}deg)`,
        }}
      >
        <Icon name={b.icon} size={84} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 30, color: "rgba(255,255,255,.85)", lineHeight: 1.1 }}>{b.small}</div>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 54, color: "#fff", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 780 }}>{b.big}</div>
        </div>
      </div>
    </div>
  );
};

/** Bottom sheet (like a navigation app's trip card). */
const sheetVis = (t: number) =>
  Math.max(
    interpolate(t, [T.ftl - 0.7, T.ftl - 0.2, T.out1[0] - 0.2, T.out1[0] + 0.2], [0, 1, 1, 0], clamp),
    interpolate(t, [T.fcl - 0.7, T.fcl - 0.2, T.dive2[0] - 0.2, T.dive2[0] + 0.2], [0, 1, 1, 0], clamp),
    interpolate(t, [T.srg[0], T.srg[0] + 0.4, T.stuck - 0.35, T.stuck], [0, 1, 1, 0], clamp),
  );
const SHEET = { left: 40, top: 1352, w: 1000, h: 392 };
const Sheet: React.FC<{ t: number }> = ({ t }) => {
  const v = sheetVis(t);
  if (v <= 0) return null;
  return (
    <div style={{ position: "absolute", left: SHEET.left, top: SHEET.top + (1 - v) * 460, width: SHEET.w, height: SHEET.h, borderRadius: 40, background: "#FFFFFF", boxShadow: "0 -10px 40px rgba(30,40,50,.18)" }}>
      <div style={{ position: "absolute", left: SHEET.w / 2 - 44, top: 14, width: 88, height: 9, borderRadius: 5, background: "#D7DBE0" }} />
    </div>
  );
};

/** Pallets loading into an open truck / container (3D assets), on the right of the bottom sheet. */
const PALLET_OTHERS = ["pallet-cartons", "pallet-drums", "pallet-sacks"];
const Loader: React.FC<{ t: number; kind: "truck" | "container" }> = ({ t, kind }) => {
  const v = sheetVis(t);
  const truck = kind === "truck";
  const a1 = truck ? T.ftl : T.fcl;
  const a2 = truck ? T.ltl : T.lcl;
  const win = truck ? [T.ftl - 0.7, T.out1[0] + 0.2] : [T.fcl - 0.7, T.dive2[0] + 0.2];
  if (t < win[0] || t > win[1] || v <= 0) return null;
  const img = truck ? { name: "open-trailer-iso", w: 1392, h: 986, a: [435, 668], b: [1268, 375] } : { name: "open-container-iso", w: 1400, h: 991, a: [270, 820], b: [1120, 430] };
  const W = 470;
  const k = W / img.w;
  const H = img.h * k;
  const left = SHEET.left + SHEET.w - W - 20;
  const top = SHEET.top + (SHEET.h - H) / 2 + 8 + (1 - v) * 460;
  const n = 6;
  const shared = t >= a2 - 0.15;
  const mine = [1, 4];
  const slots = Array.from({ length: n }, (_, i) => {
    const f = (i + 0.5) / n;
    return { i, x: lerp(img.a[0], img.b[0], f) * k, y: lerp(img.a[1], img.b[1], f) * k };
  }).sort((p, q) => p.y - q.y);
  const pw = (truck ? 180 : 172) * k;
  return (
    <div style={{ position: "absolute", left, top, width: W, height: H }}>
      <Img src={A(img.name)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, filter: "drop-shadow(0 14px 14px rgba(30,40,50,.25))" }} />
      {slots.map(({ i, x, y }) => {
        // first load (all yours), then the shared load swaps in
        const at1 = a1 + 0.35 + i * 0.12;
        const at2 = a2 + 0.25 + i * 0.12;
        const isMine = !shared || mine.includes(i);
        const name = isMine ? "pallet-yours" : PALLET_OTHERS[i % 3];
        const dropT = shared ? at2 : at1;
        const d = interpolate(t, [dropT, dropT + 0.32], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0) });
        const bounce = t > dropT + 0.32 && t < dropT + 0.7 ? 1 - 0.08 * Math.exp(-10 * (t - dropT - 0.32)) * Math.cos((t - dropT - 0.32) * 28) : 1;
        const out = shared && t < at2 ? interpolate(t, [a2 - 0.15, a2 + 0.1], [1, 0], clamp) : 1;
        if (d <= 0 && !(shared && t < at2)) return null;
        const ph = pw * 1.15;
        return (
          <React.Fragment key={i}>
            <Img
              src={A(name)}
              style={{
                position: "absolute",
                left: x - pw / 2,
                top: y - ph * 0.82 - (1 - d) * 220,
                width: pw,
                opacity: shared && t < at2 ? out : Math.min(1, d * 3),
                transformOrigin: "50% 100%",
                scale: `${2 - bounce} ${bounce}`,
                filter: "drop-shadow(2px 6px 4px rgba(30,40,50,.3))",
              }}
            />
            {shared && isMine && t > at2 + 0.4 ? (
              <Img src={A("destination-pin")} style={{ position: "absolute", left: x - 20, top: y - ph * 0.82 - 66 + Math.sin(t * 5 + i) * 4, width: 40 }} />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Sorong sheet: LAST MILE, the handoff chain, the port town. */
const LastMileSheet: React.FC<{ t: number }> = ({ t }) => {
  const v = sheetVis(t);
  if (t < T.srg[0] || t > T.stuck || v <= 0) return null;
  const top = SHEET.top + (1 - v) * 460;
  const inK = interpolate(t, [T.srg[0] + 0.2, T.srg[0] + 0.7], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const chain: string[] = ["nav-truck-top", "nav-ship-top", "nav-truck-top"];
  return (
    <div style={{ position: "absolute", left: SHEET.left, top, width: SHEET.w, height: SHEET.h }}>
      <div style={{ position: "absolute", left: 44, top: 46, overflow: "hidden", height: 120 }}>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 108, lineHeight: 1, color: INK, translate: `0 ${(1 - inK) * 110}%`, whiteSpace: "nowrap" }}>
          LAST <span style={{ color: DEEP }}>MILE</span>
        </div>
      </div>
      {/* handoff chain */}
      <div style={{ position: "absolute", left: 44, top: 210, width: 470, height: 130 }}>
        {[0, 1].map((i) => {
          const draw = interpolate(t, [T.handoff[0] + 0.15 + i * 0.25, T.handoff[0] + 0.45 + i * 0.25], [0, 1], clamp);
          const flash = t > T.handoff[1] + i * 0.12 ? 0.5 + 0.5 * Math.sin((t - T.handoff[1]) * 14) : 0;
          return <div key={i} style={{ position: "absolute", left: 100 + i * 170, top: 60, width: 170 * draw, height: 10, borderRadius: 5, background: flash > 0.5 ? ORANGE : "#C9CFD6", boxShadow: flash > 0.5 ? `0 0 18px ${ORANGE}` : "none" }} />;
        })}
        {chain.map((img, i) => {
          const s = interpolate(t, [T.handoff[0] + i * 0.25, T.handoff[0] + i * 0.25 + 0.3], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2.4)) });
          return (
            <div key={i} style={{ position: "absolute", left: i * 170, top: 0, width: 130, height: 130, borderRadius: "50%", background: "#F4F6F8", border: `5px solid ${i === 1 ? "#2F6E97" : ORANGE}`, display: "grid", placeItems: "center", overflow: "hidden", scale: String(s), boxShadow: "0 8px 16px rgba(30,40,50,.18)" }}>
              <Img src={A(img)} style={{ height: 112, rotate: "45deg" }} />
            </div>
          );
        })}
      </div>
      {/* destination preview */}
      <div style={{ position: "absolute", right: 30, top: 40, width: 400, height: 312, borderRadius: 26, overflow: "hidden", background: "linear-gradient(180deg, #DDEFFB, #F6F2E8)" }}>
        <Img src={A("port-town-vignette")} style={{ position: "absolute", left: -20, top: 40, width: 440, scale: String(1 + 0.05 * prog(t, T.srg[0], T.stuck)) }} />
      </div>
    </div>
  );
};

const CompassButton: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const v = Math.max(sheetVis(t), interpolate(t, [T.jkt[0], T.jkt[0] + 0.4, T.stuck - 0.3, T.stuck], [0, 1, 1, 0], clamp) * (t < T.stuck ? 1 : 0));
  if (v <= 0 || (t > T.out1[0] && t < T.sea[0])) return null;
  return (
    <div style={{ position: "absolute", left: 900, top: 1210, width: 104, height: 104, borderRadius: "50%", background: "#fff", boxShadow: "0 8px 22px rgba(30,40,50,.22)", display: "grid", placeItems: "center", opacity: v }}>
      <div style={{ rotate: `${cam.roll}deg` }}>
        <svg width={50} height={50} viewBox="0 0 50 50">
          <path d="M25 3 L33 25 L17 25 Z" fill={BRAND.red} />
          <path d="M25 47 L33 25 L17 25 Z" fill="#C9CFD6" />
        </svg>
      </div>
    </div>
  );
};

const Attribution: React.FC<{ t: number }> = ({ t }) => {
  const on = interpolate(t, [3.8, 4.4, T.pinToG[0], T.pinToG[1]], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 50, top: 1322, fontFamily: FONT_MONO, fontSize: 15, color: "rgba(43,28,21,.55)", opacity: on * (1 - sheetVis(t)) }}>
      © OpenStreetMap contributors · OpenFreeMap · Natural Earth
    </div>
  );
};

const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const k = interpolate(t, [T.pinToG[0], T.logo + 0.3], [0, 1], clamp);
  if (k <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: k, background: LAND }}>
      <Img src={staticFile(MAP.plates.jakarta.file)} style={{ position: "absolute", left: -600, top: -500, width: 2280, filter: "blur(3px) saturate(.6)", opacity: 0.5, scale: String(1 + 0.04 * (t - T.logo)) }} />
      <AbsoluteFill style={{ background: "radial-gradient(70% 50% at 50% 45%, rgba(246,246,242,.96), rgba(246,246,242,.78))" }} />
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
  const mapOn = interpolate(t, [0.38, 0.48], [0, 1], clamp) * interpolate(t, [T.pinToG[0], T.logo + 0.2], [1, 0], clamp);
  const topVeil = Math.max(interpolate(t, [0, 0.6, 3.4, 3.8], [0, 1, 1, 0], clamp), interpolate(t, [T.out2[1] - 0.4, T.out2[1], T.pinToG[0], T.pinToG[1]], [0, 1, 1, 0], clamp));
  const hits = [T.slam, T.dive1[1] - 0.05, T.out1[0] + 0.3, T.dive2[1] - 0.05, T.door + 0.35, T.noTolerance, T.out2[0] + 0.1].map(sec);
  const turnTicks = MAP.roads.jakarta.steps.filter((s) => s.name && s.at > 0.02 && s.at < 0.8).map((s) => interpolate(s.at, [0, 1], T.jkt));
  const sfx: SfxCue[] = [
    { at: 0, name: "whoosh", volume: 0.7 },
    { at: sec(T.slam), name: "boom", volume: 0.9 },
    { at: sec(T.slam), name: "horn", volume: 0.7 },
    { at: sec(T.tear[0]), name: "whoosh", volume: 0.55 },
    { at: sec(T.dive1[0]), name: "whoosh", volume: 0.5 },
    { at: sec(T.dive1[1] - 0.05), name: "boom", volume: 0.4 },
    ...turnTicks.map((s) => ({ at: sec(s), name: "tick", volume: 0.3 })),
    { at: sec(T.ftl + 0.35), name: "stamp", volume: 0.3 },
    { at: sec(T.ltl + 0.25), name: "stamp", volume: 0.3 },
    { at: sec(T.toShip), name: "whoosh", volume: 0.4 },
    { at: sec(T.out1[0] + 0.2), name: "whoosh", volume: 0.6 },
    { at: sec(T.sea[0] + 0.2), name: "horn", volume: 0.35 },
    { at: sec(T.fcl + 0.35), name: "stamp", volume: 0.3 },
    { at: sec(T.lcl + 0.25), name: "stamp", volume: 0.3 },
    { at: sec(T.dive2[0]), name: "whoosh", volume: 0.55 },
    { at: sec(T.toTruck), name: "tick", volume: 0.4 },
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
    <AbsoluteFill style={{ background: "radial-gradient(80% 60% at 50% 50%, #F4F6F3, #E2E8EC)" }}>
      <Globe t={t} />
      <Shake hits={hits} amount={12}>
        <AbsoluteFill
          style={{
            opacity: mapOn,
            perspective: PERSP,
            perspectiveOrigin: `540px ${cam.fy}px`,
            WebkitMaskImage: `linear-gradient(180deg, transparent ${cam.tilt * 0.3}%, #000 ${cam.tilt * 0.62 + 2}%)`,
            maskImage: `linear-gradient(180deg, transparent ${cam.tilt * 0.3}%, #000 ${cam.tilt * 0.62 + 2}%)`,
          }}
        >
          <AbsoluteFill style={{ transformOrigin: `540px ${cam.fy}px`, transform: `rotateX(${cam.tilt}deg)` }}>
            <MapCanvas t={t} cam={cam} />
            <Vehicle t={t} cam={cam} />
          </AbsoluteFill>
        </AbsoluteFill>
        <AbsoluteFill style={{ opacity: mapOn }}>
          <Labels cam={cam} />
          <PlanBadges t={t} cam={cam} />
        </AbsoluteFill>
        <DoorPin t={t} cam={cam} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(246,246,242,.92) 0%, rgba(246,246,242,.7) 26%, rgba(246,246,242,0) 40%)", opacity: topVeil }} />
        <AbsoluteFill style={{ background: "#C0392B", mixBlendMode: "multiply", opacity: red * 0.4 }} />
        <AbsoluteFill style={{ background: "rgba(248,246,242,.7)", opacity: red }} />
      </Shake>
      <Attribution t={t} />
      <CompassButton t={t} cam={cam} />
      <NavBanner t={t} />
      <Sheet t={t} />
      <Loader t={t} kind="truck" />
      <Loader t={t} kind="container" />
      <LastMileSheet t={t} />

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
