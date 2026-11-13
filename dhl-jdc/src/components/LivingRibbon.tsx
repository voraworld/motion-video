import React from "react";

/**
 * THE LIVING RED RIBBON — procedural, so every shape change is continuous geometry, not a raster swap.
 *
 * A centre line (Catmull-Rom through control points) is sampled by arc length. At each sample the band is
 * rotated about the tangent by a twist angle θ(s); the projected half-width is w/2·cos θ, so the band
 * really turns edge-on and flips to its back face. Each segment is shaded with a Lambert + Blinn model
 * from its true 3-D surface normal n = (Tʸ·sin θ, −Tˣ·sin θ, cos θ), giving the satin look of the
 * supplied ribbon renders. Morphing = interpolating the control points of two shapes (same count).
 */
export type Pt = [number, number];

export type RibbonProps = {
  pts: Pt[];
  width: number;
  /** twist angle (radians) along s ∈ [0,1] */
  twist?: (s: number) => number;
  /** visible part of the ribbon, as fractions of its length */
  from?: number;
  to?: number;
  /** width multiplier along s (depth / perspective) */
  widthAt?: (s: number) => number;
  taper?: number;
  segments?: number;
  shadow?: "yellow" | "red" | false;
  shadowOffset?: number;
  backColor?: [number, number, number];
  frontColor?: [number, number, number];
  opacity?: number;
  /** extra translation for the whole ribbon */
  style?: React.CSSProperties;
  id?: string;
};

const FRONT: [number, number, number] = [212, 5, 17]; // #D40511
const BACK: [number, number, number] = [150, 4, 14];
const L = (() => {
  const v = [-0.45, -0.62, 0.65];
  const m = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / m);
})();
const Hh = (() => {
  const v = [L[0], L[1], L[2] + 1];
  const m = Math.hypot(v[0], v[1], v[2]);
  return v.map((x) => x / m);
})();

export const mixPts = (a: Pt[], b: Pt[], x: number): Pt[] => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * x, p[1] + (b[i][1] - p[1]) * x]);

/** Dense polyline through the control points (uniform Catmull-Rom). */
const spline = (pts: Pt[], sub = 24): Pt[] => {
  if (pts.length < 2) return pts;
  const out: Pt[] = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let j = 0; j < sub; j++) {
      const t = j / sub;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, cc: number, d: number) =>
        0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};

export type RibbonSample = { p: Pt; tan: Pt; s: number };
/** Point + tangent at fraction s of the ribbon's length (for attaching things to it). */
export const ribbonAt = (pts: Pt[], s: number): RibbonSample => {
  const d = spline(pts);
  const len = [0];
  for (let i = 1; i < d.length; i++) len.push(len[i - 1] + Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]));
  const total = len[len.length - 1] || 1;
  const target = Math.max(0, Math.min(1, s)) * total;
  let i = 1;
  while (i < len.length - 1 && len[i] < target) i++;
  const seg = len[i] - len[i - 1] || 1;
  const u = (target - len[i - 1]) / seg;
  const p: Pt = [d[i - 1][0] + (d[i][0] - d[i - 1][0]) * u, d[i - 1][1] + (d[i][1] - d[i - 1][1]) * u];
  const tx = d[i][0] - d[i - 1][0];
  const ty = d[i][1] - d[i - 1][1];
  const m = Math.hypot(tx, ty) || 1;
  return { p, tan: [tx / m, ty / m], s };
};

const shade = (base: [number, number, number], diff: number, spec: number) => {
  const k = 0.3 + 1.08 * diff;
  const c = base.map((v) => Math.min(255, v * k + 255 * spec * 0.5));
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
};

export const LivingRibbon: React.FC<RibbonProps> = ({
  pts,
  width,
  twist = () => 0,
  from = 0,
  to = 1,
  widthAt = () => 1,
  taper = 0.035,
  segments = 150,
  shadow = "yellow",
  shadowOffset = 34,
  frontColor = FRONT,
  backColor = BACK,
  opacity = 1,
  style,
  id = "rb",
}) => {
  if (to - from <= 0.0005) return null;
  const d = spline(pts);
  const len = [0];
  for (let i = 1; i < d.length; i++) len.push(len[i - 1] + Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]));
  const total = len[len.length - 1] || 1;
  const n = Math.max(8, Math.round(segments * (to - from)));
  const samp: { x: number; y: number; tx: number; ty: number; s: number }[] = [];
  let j = 1;
  for (let i = 0; i <= n; i++) {
    const s = from + ((to - from) * i) / n;
    const target = s * total;
    while (j < len.length - 1 && len[j] < target) j++;
    const seg = len[j] - len[j - 1] || 1;
    const u = (target - len[j - 1]) / seg;
    const x = d[j - 1][0] + (d[j][0] - d[j - 1][0]) * u;
    const y = d[j - 1][1] + (d[j][1] - d[j - 1][1]) * u;
    const tx = d[j][0] - d[j - 1][0];
    const ty = d[j][1] - d[j - 1][1];
    const m = Math.hypot(tx, ty) || 1;
    samp.push({ x, y, tx: tx / m, ty: ty / m, s });
  }
  const edges = samp.map((q) => {
    const th = twist(q.s);
    const span = Math.max(1e-6, to - from);
    const local = (q.s - from) / span;
    const tp = Math.min(1, local / taper, (1 - local) / taper);
    const tpe = tp >= 1 ? 1 : tp * tp * (3 - 2 * tp);
    const hw = (width / 2) * widthAt(q.s) * (0.08 + 0.92 * tpe);
    const c = Math.cos(th);
    const vis = Math.abs(c) < 0.03 ? 0.03 * Math.sign(c || 1) : c;
    const nx = -q.ty;
    const ny = q.tx;
    // skew the far edge along the tangent a little (perspective of a twisted band)
    const sk = Math.sin(th) * hw * 0.18;
    const l: Pt = [q.x + nx * hw * vis + q.tx * sk, q.y + ny * hw * vis + q.ty * sk];
    const r: Pt = [q.x - nx * hw * vis - q.tx * sk, q.y - ny * hw * vis - q.ty * sk];
    // 3-D normal of the surface
    let N = [q.ty * Math.sin(th), -q.tx * Math.sin(th), Math.cos(th)];
    const front = N[2] >= 0;
    if (!front) N = N.map((v) => -v);
    const diff = Math.max(0, N[0] * L[0] + N[1] * L[1] + N[2] * L[2]);
    const spec = Math.pow(Math.max(0, N[0] * Hh[0] + N[1] * Hh[1] + N[2] * Hh[2]), 38);
    return { l, r, front, diff, spec };
  });
  const quads: React.ReactNode[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i];
    const b = edges[i + 1];
    const col = shade(a.front ? frontColor : backColor, (a.diff + b.diff) / 2, (a.spec + b.spec) / 2);
    const dpath = `M${a.l[0].toFixed(1)},${a.l[1].toFixed(1)}L${b.l[0].toFixed(1)},${b.l[1].toFixed(1)}L${b.r[0].toFixed(1)},${b.r[1].toFixed(1)}L${a.r[0].toFixed(1)},${a.r[1].toFixed(1)}Z`;
    quads.push(<path key={i} d={dpath} fill={col} stroke={col} strokeWidth={0.9} strokeLinejoin="round" />);
  }
  const outline =
    "M" +
    edges.map((e) => `${e.l[0].toFixed(1)},${e.l[1].toFixed(1)}`).join("L") +
    "L" +
    [...edges]
      .reverse()
      .map((e) => `${e.r[0].toFixed(1)},${e.r[1].toFixed(1)}`)
      .join("L") +
    "Z";
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity, ...style }}>
      {shadow ? (
        <>
          <defs>
            <filter id={`${id}-sh`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={16} />
            </filter>
          </defs>
          <path
            d={outline}
            transform={`translate(${shadowOffset * 0.3},${shadowOffset})`}
            fill={shadow === "yellow" ? "rgba(120,70,0,0.28)" : "rgba(60,0,4,0.45)"}
            filter={`url(#${id}-sh)`}
          />
        </>
      ) : null}
      {quads}
    </svg>
  );
};
