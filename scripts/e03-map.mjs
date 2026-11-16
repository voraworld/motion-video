// Builds the E03 chart: real coastlines (Natural Earth 1:50m via world-atlas), graticule, the Jakarta → Sorong
// route and procedural street grids for the two city ends. Output: remotion/src/generated/e03-map.json
// Usage (repo root): node scripts/e03-map.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(path.join(root, "remotion", "package.json"));
const { feature } = require("topojson-client");
const d3 = require("d3-geo");
const land50 = require("world-atlas/land-50m.json");

// World canvas: 120 px per degree of longitude, Mercator, lon 94…142, lat 8…-12.
const PX_PER_DEG = 120;
const LON0 = 94;
const LON1 = 142;
const LAT0 = 8;
const LAT1 = -12;
const S = (PX_PER_DEG * 180) / Math.PI;
const proj = d3.geoMercator().scale(S).translate([0, 0]);
const p0 = proj([LON0, LAT0]);
proj.translate([-p0[0], -p0[1]]);
const W = Math.round(proj([LON1, LAT1])[0]);
const H = Math.round(proj([LON1, LAT1])[1]);
proj.clipExtent([
  [-50, -50],
  [W + 50, H + 50],
]);
const gp = d3.geoPath(proj).digits(1);
const P = (lon, lat) => proj([lon, lat]).map((v) => Math.round(v * 100) / 100);

const land = feature(land50, land50.objects.land);
const landPath = gp(land);

// Graticule every 2°
const grat = d3.geoGraticule().extent([
  [LON0, LAT1],
  [LON1, LAT0],
]).step([2, 2]);
const gratPath = gp(grat());

// Sea route (lon, lat) through open water, validated against the land polygons below.
const SEA = [
  [106.885, -6.095],
  [106.93, -5.86],
  [107.6, -5.6],
  [109.0, -5.4],
  [110.8, -5.25],
  [113.0, -5.35],
  [115.6, -5.95],
  [117.6, -6.35],
  [119.2, -6.95],
  [120.1, -7.7],
  [121.0, -7.8],
  [122.2, -7.05],
  [123.2, -6.45],
  [124.4, -6.2],
  [125.6, -4.8],
  [126.9, -3.95],
  [127.55, -3.45],
  [127.85, -2.75],
  [128.6, -2.15],
  [129.6, -1.55],
  [130.15, -0.95],
  [130.55, -0.66],
  [131.0, -0.7],
  [131.235, -0.865],
];

// Catmull-Rom → dense polyline (in world px)
const catmull = (pts, perSeg = 24) => {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};
const seaLL = catmull(SEA, 20);
const onLand = seaLL.filter((ll, i) => i > 3 && i < seaLL.length - 6 && d3.geoContains(land, ll));
if (onLand.length) console.warn(`route touches land at ${onLand.length} samples, e.g.`, onLand.slice(0, 6).map((p) => p.map((v) => v.toFixed(2)).join(",")));

// Procedural city streets around a centre (world px). Deterministic.
const rand = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const city = (lon, lat, seed, rot) => {
  const [cx, cy] = P(lon, lat);
  const r = rand(seed);
  const R = 9; // world px half-size (~0.075°)
  const lines = [];
  const step = 0.55;
  const ca = Math.cos(rot);
  const sa = Math.sin(rot);
  const tr = (x, y) => [cx + x * ca - y * sa, cy + x * sa + y * ca].map((v) => Math.round(v * 1000) / 1000);
  for (let gx = -R; gx <= R; gx += step) {
    let y = -R;
    while (y < R) {
      const len = 1 + r() * 4;
      if (r() > 0.18) lines.push([tr(gx + (r() - 0.5) * 0.05, y), tr(gx + (r() - 0.5) * 0.05, Math.min(R, y + len))]);
      y += len + r() * 0.6;
    }
  }
  for (let gy = -R; gy <= R; gy += step * 1.3) {
    let x = -R;
    while (x < R) {
      const len = 1 + r() * 4;
      if (r() > 0.18) lines.push([tr(x, gy), tr(Math.min(R, x + len), gy)]);
      x += len + r() * 0.6;
    }
  }
  const minor = lines.flatMap(([a, b]) => [a[0], a[1], b[0], b[1]]);
  const major = [];
  for (let k = 0; k < 5; k++) {
    const ang = rot + (k / 5) * Math.PI + r() * 0.3;
    const pts = [];
    for (let s = -R * 1.2; s <= R * 1.2; s += 0.6) {
      const off = Math.sin(s * 0.35 + k) * 0.8;
      pts.push([cx + Math.cos(ang) * s - Math.sin(ang) * off, cy + Math.sin(ang) * s + Math.cos(ang) * off]);
    }
    major.push(pts.map((p) => p.map((v) => Math.round(v * 1000) / 1000)));
  }
  return { cx, cy, minor, major };
};

// Street-level truck legs (manhattan-ish, lon/lat)
const JKT_LEG = [
  [106.935, -6.205],
  [106.935, -6.17],
  [106.905, -6.17],
  [106.905, -6.135],
  [106.885, -6.12],
  [106.885, -6.095],
];
const SRG_LEG = [
  [131.235, -0.865],
  [131.255, -0.875],
  [131.255, -0.892],
  [131.285, -0.892],
  [131.29, -0.905],
];

const toWorld = (ll) => ll.map(([lon, lat]) => P(lon, lat));
const out = {
  W,
  H,
  pxPerDeg: PX_PER_DEG,
  lon0: LON0,
  lat0: LAT0,
  land: landPath,
  graticule: gratPath,
  sea: toWorld(seaLL),
  jktLeg: toWorld(JKT_LEG),
  srgLeg: toWorld(SRG_LEG),
  cities: {
    jakarta: { ...city(106.89, -6.16, 11, 0.12), at: P(106.85, -6.2) },
    sorong: { ...city(131.27, -0.885, 29, -0.2), at: P(131.27, -0.88) },
  },
  places: {
    jakarta: P(106.85, -6.2),
    priok: P(106.885, -6.095),
    sorong: P(131.255, -0.875),
    door: P(131.29, -0.905),
  },
  labels: [
    { text: "JAVA", at: P(110.2, -7.35) },
    { text: "BORNEO", at: P(113.6, 0.2) },
    { text: "SUMATRA", at: P(101.6, -1.2) },
    { text: "SULAWESI", at: P(121.2, -1.9) },
    { text: "PAPUA", at: P(137.5, -4.0) },
    { text: "JAVA SEA", at: P(111.4, -4.6), sea: true },
    { text: "FLORES SEA", at: P(120.5, -7.6), sea: true },
    { text: "BANDA SEA", at: P(126.8, -5.9), sea: true },
  ],
  ticks: {
    lon: Array.from({ length: LON1 - LON0 + 1 }, (_, i) => ({ lon: LON0 + i, x: P(LON0 + i, 0)[0] })),
    lat: Array.from({ length: LAT0 - LAT1 + 1 }, (_, i) => ({ lat: LAT0 - i, y: P(LON0, LAT0 - i)[1] })),
  },
};
const file = path.join(root, "remotion", "src", "generated", "e03-map.json");
fs.writeFileSync(file, JSON.stringify(out));
console.log(`wrote ${path.relative(root, file)} ${(fs.statSync(file).size / 1024).toFixed(0)} KB, world ${W}×${H}`);
