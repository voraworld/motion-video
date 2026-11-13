import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import { asset, beatsOf, getEpisode, MANIFEST, sec } from "../data";
import { BrandFrame } from "../brand/BrandFrame";
import { BRAND, FONT_DISPLAY, FONT_MONO, FrameTheme, ZONES } from "../brand/tokens";
import { Captions } from "../shared/Captions";
import { HfOverlay } from "../shared/HfOverlay";
import { Shake } from "../shared/Impact";
import { DecorArc } from "../shared/Ring";
import { SfxCue, SoundLayer } from "../shared/SoundLayer";

/**
 * E01 · The Export Relay (55 s)
 *
 * The thread is the UGC ring (HyperFrames clip e01-medallion): seven gradient segments from the logo, one per
 * handoff, around a disc whose icon swaps at each handoff. Stations ride a 3D carousel of white cards carrying
 * the GPT assets; the carousel spins one stop per handoff. In the UGC beat the cards leave the cylinder and
 * orbit the glowing ring; for the end card the ring flies into the logo's G (HyperFrames clip e01-logo).
 *
 * R (Remotion): background, ring decor, carousel, orbit, chapter titles, ring placement, captions, brand frame, audio.
 * H (HyperFrames): e01-hook, e01-medallion, e01-lanes, e01-rolled, e01-team, e01-logo.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ep = getEpisode("E01");
const beats = beatsOf(ep);
const vo = MANIFEST.voBeats?.e01 ?? [];

/** Start time (s) of a word inside a beat's VO, from the real VO duration. */
const wordAt = (beatIndex: number, word: string) => {
  const b = ep.beats[beatIndex];
  const words = b[4].split(/\s+/);
  const idx = Math.max(0, words.findIndex((w) => w.replace(/[^\w/]/g, "").toLowerCase() === word.toLowerCase()));
  const dur = vo.find((v) => v.start === b[0])?.duration ?? b[1] - b[0] - 0.5;
  return b[0] + (dur * idx) / words.length;
};

// Keep in sync with hyperframes/e01-medallion (same VO-derived times).
const T = {
  booking: 4.0,
  stuffed: 10.0,
  trucked: wordAt(2, "Three"),
  customs: 17.0,
  green: wordAt(3, "Green"),
  loaded: 26.0,
  arrived: wordAt(4, "Six"),
  delivered: wordAt(4, "Seven"),
  stuck: 33.0,
  ugc: 38.0,
  cta: 48.0,
};

const STEPS = [
  { at: T.booking, n: "01", title: "BOOKING · CUT-OFF SET" },
  { at: T.stuffed, n: "02", title: "STUFFED + WEIGHED (VGM)" },
  { at: T.trucked, n: "03", title: "TRUCKED" },
  { at: T.customs, n: "04", title: "PEB → NPE" },
  { at: T.loaded, n: "05", title: "LOADED · B/L" },
  { at: T.arrived, n: "06", title: "ARRIVED" },
  { at: T.delivered, n: "07", title: "DELIVERED" },
];

const CARDS: { key: string; img: string | null }[] = [
  { key: "booking", img: null },
  { key: "stuffing", img: asset("e01", "warehouse-stuffing-station") },
  { key: "truck", img: asset("e01", "container-truck") },
  { key: "customs", img: asset("e01", "customs-checkpoint") },
  { key: "crane", img: asset("e01", "terminal-crane") },
  { key: "ship", img: asset("e01", "container-ship") },
  { key: "buyer", img: asset("e01", "buyer-warehouse") },
];

const stepAt = (t: number) => STEPS.reduce((a, s, i) => (t >= s.at ? i : a), -1);

// ---------- background ----------
const Backdrop: React.FC<{ t: number }> = ({ t }) => {
  const iris = interpolate(t, [3.45, 4.2], [0, 1700], { ...clamp, easing: Easing.bezier(0.7, 0, 0.3, 1) });
  const draw = (from: number) => interpolate(t, [from, from + 1.3], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const drift = (k: number) => Math.sin(t * 0.35 + k) * 18;
  return (
    <AbsoluteFill>
      {/* Hook: warm charcoal with a faint ring echo */}
      <AbsoluteFill style={{ background: "radial-gradient(70% 50% at 50% 50%, #2A1E17 0%, #120D0A 70%, #0B0807 100%)" }}>
        <DecorArc idPrefix="hk1" x={540} y={960} r={520} stroke={6} from={0} sweep={360} draw={interpolate(t, [0.05, 0.6], [0, 1], clamp)} rotate={t * 12} opacity={0.18} />
      </AbsoluteFill>
      {/* World: cream, opened by an iris from the ring */}
      <AbsoluteFill style={{ clipPath: `circle(${iris}px at 540px 960px)`, background: "radial-gradient(90% 60% at 50% 42%, #FFF9F2 0%, #FCEFE2 55%, #F7DEC8 100%)" }}>
        <div style={{ position: "absolute", left: -260 + drift(0), top: 980 + drift(1), width: 760, height: 760, borderRadius: "50%", background: "radial-gradient(circle, rgba(242,106,31,.20), rgba(242,106,31,0) 70%)" }} />
        <div style={{ position: "absolute", left: 560 + drift(2), top: -180 + drift(3), width: 820, height: 820, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,166,35,.18), rgba(245,166,35,0) 70%)" }} />
        <DecorArc idPrefix="d1" x={1060} y={430} r={300} stroke={34} from={200} sweep={150} draw={draw(4.0)} rotate={t * 4} opacity={0.9} />
        <DecorArc idPrefix="d2" x={40} y={1560} r={250} stroke={28} from={20} sweep={140} draw={draw(4.25)} rotate={-t * 3} opacity={0.8} />
        <DecorArc idPrefix="d3" x={70} y={600} r={70} stroke={14} from={300} sweep={250} draw={draw(4.5)} rotate={t * 9} opacity={0.55} />
        <DecorArc idPrefix="d4" x={1000} y={1700} r={46} stroke={10} from={90} sweep={260} draw={draw(4.7)} rotate={-t * 11} opacity={0.5} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- chapter title ----------
const Chapter: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const i = stepAt(t);
  if (i < 0 || t >= T.stuck - 0.05) return null;
  const s = STEPS[i];
  const local = frame - sec(s.at);
  const next = i + 1 < STEPS.length ? STEPS[i + 1].at : T.stuck;
  const out = interpolate(frame, [sec(next) - 5, sec(next)], [0, 1], clamp);
  const words = s.title.split(" ");
  return (
    <div style={{ position: "absolute", top: ZONES.contentTop + 20, left: ZONES.sideSafe, right: ZONES.sideSafe, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: 1 - out, filter: out > 0 ? `blur(${out * 8}px)` : undefined }}>
      <div style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 28, letterSpacing: 4, color: "rgba(43,28,21,.55)", opacity: interpolate(local, [0, 6], [0, 1], clamp) }}>
        <span style={{ color: BRAND.ember }}>{s.n}</span> / 07
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 20, rowGap: 4, maxWidth: 920, fontFamily: FONT_DISPLAY, fontSize: 70, lineHeight: 1.04, color: BRAND.ink, textAlign: "center" }}>
        {words.map((w, k) => {
          const wt = local - 3 - k * 2;
          return (
            <span key={k} style={{ display: "inline-block", opacity: interpolate(wt, [0, 4], [0, 1], clamp), filter: `blur(${interpolate(wt, [0, 4], [8, 0], clamp)}px)`, translate: `0px ${interpolate(wt, [0, 5], [14, 0], clamp)}px` }}>
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------- station card ----------
const CARD_W = 700;
const CARD_H = 740;
const CutOffClock: React.FC<{ t: number }> = ({ t }) => {
  const k = interpolate(t, [T.booking + 0.3, T.stuffed - 0.6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const sweep = 318 * k;
  const r = 170;
  const p = (a: number) => [230 + r * Math.cos(((a - 90) * Math.PI) / 180), 230 + r * Math.sin(((a - 90) * Math.PI) / 180)];
  const [x1, y1] = p(Math.max(0.01, sweep));
  const [cx, cy] = p(330);
  return (
    <svg width={460} height={460} viewBox="0 0 460 460">
      <defs>
        <linearGradient id="clk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.red} />
          <stop offset="0.55" stopColor={BRAND.orange} />
          <stop offset="1" stopColor={BRAND.amber} />
        </linearGradient>
      </defs>
      <circle cx={230} cy={230} r={r} fill="none" stroke="rgba(43,28,21,.08)" strokeWidth={34} />
      <path d={`M 230 ${230 - r} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1} ${y1}`} fill="none" stroke="url(#clk)" strokeWidth={34} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={14} fill={BRAND.ink} />
      {Array.from({ length: 12 }, (_, i) => {
        const [a, b] = [p(i * 30), p(i * 30)];
        return <circle key={i} cx={(a[0] - 230) * 0.72 + 230} cy={(b[1] - 230) * 0.72 + 230} r={i % 3 === 0 ? 6 : 3.5} fill="rgba(43,28,21,.35)" />;
      })}
      <line x1={230} y1={230} x2={230 + 104 * Math.cos(((sweep - 90) * Math.PI) / 180)} y2={230 + 104 * Math.sin(((sweep - 90) * Math.PI) / 180)} stroke={BRAND.ink} strokeWidth={12} strokeLinecap="round" />
      <circle cx={230} cy={230} r={18} fill={BRAND.orange} />
    </svg>
  );
};

const Card: React.FC<{ i: number; t: number; w?: number; h?: number; check?: number }> = ({ i, t, w = CARD_W, h = CARD_H, check = 0 }) => {
  const c = CARDS[i];
  const s = w / CARD_W;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 44 * s, background: "#FFFFFF", boxShadow: `0 ${40 * s}px ${90 * s}px rgba(43,28,21,.20), 0 ${6 * s}px ${16 * s}px rgba(43,28,21,.08)`, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #FFF6EE 0%, #FFFFFF 62%)" }} />
      <div style={{ position: "absolute", left: "50%", top: "47%", width: 520 * s, height: 520 * s, translate: "-50% -50%", borderRadius: "50%", background: `radial-gradient(circle at 42% 38%, ${BRAND.amber} 0%, ${BRAND.orange} 45%, ${BRAND.ember} 100%)`, opacity: 0.92 }} />
      <div style={{ position: "absolute", left: "50%", top: "47%", width: 660 * s, height: 660 * s, translate: "-50% -50%", borderRadius: "50%", border: `${3 * s}px solid rgba(242,106,31,.18)` }} />
      {c.key === "booking" ? (
        <div style={{ position: "absolute", left: "50%", top: "47%", translate: "-50% -50%", scale: String(s), width: 460, height: 460, borderRadius: "50%", background: "#FFFFFF", boxShadow: "0 24px 50px rgba(43,28,21,.22)" }}>
          <CutOffClock t={t} />
        </div>
      ) : c.img ? (
        <Img src={staticFile(c.img)} style={{ position: "absolute", left: 24 * s, right: 24 * s, top: 120 * s, height: 470 * s, width: w - 48 * s, objectFit: "contain", filter: `drop-shadow(0 ${24 * s}px ${26 * s}px rgba(43,28,21,.28))` }} />
      ) : null}
      <div style={{ position: "absolute", left: 40 * s, bottom: 34 * s, fontFamily: FONT_MONO, fontWeight: 600, fontSize: 24 * s, letterSpacing: 3 * s, color: "rgba(43,28,21,.45)" }}>
        HANDOFF <span style={{ color: BRAND.ember }}>{STEPS[i].n}</span>
      </div>
      <div style={{ position: "absolute", right: 34 * s, bottom: 30 * s, width: 40 * s, height: 40 * s, borderRadius: "50%", border: `${7 * s}px solid ${BRAND.orange}`, borderRightColor: "transparent", rotate: `${t * 40}deg` }} />
      {check > 0 ? (
        <div style={{ position: "absolute", right: 22 * s, top: 22 * s, width: 92 * s, height: 92 * s, borderRadius: "50%", background: "#2E8B57", display: "grid", placeItems: "center", scale: String(check), boxShadow: "0 8px 20px rgba(46,139,87,.4)" }}>
          <svg width={52 * s} height={52 * s} viewBox="0 0 24 24">
            <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : null}
    </div>
  );
};

// ---------- 3D carousel ----------
const STEP_DEG = 360 / 7;
const RADIUS = 760;
const CAROUSEL_Y = 880;
const carouselRot = (t: number) => {
  // [time, index] keyframes: one stop per handoff, a fast whip back to the crane when the cut-off is missed.
  const keys: [number, number][] = [[T.booking - 0.05, -2.6]];
  keys.push([T.booking + 1.1, 0]);
  STEPS.slice(1).forEach((s, i) => keys.push([s.at - 0.05, i], [s.at + 0.85, i + 1]));
  keys.push([T.stuck, 6], [T.stuck + 0.6, 4]);
  let deg = keys[0][1] * STEP_DEG;
  for (let k = 1; k < keys.length; k++) {
    const [t0, a] = keys[k - 1];
    const [t1, b] = keys[k];
    if (t >= t0) deg = interpolate(t, [t0, t1], [a * STEP_DEG, b * STEP_DEG], { ...clamp, easing: Easing.bezier(0.34, 1.32, 0.5, 1) });
  }
  return deg;
};

const Carousel: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  if (t < T.booking - 0.1 || t > T.ugc + 0.8) return null;
  const rot = carouselRot(t);
  const speed = Math.abs(carouselRot(t + 1 / 30) - rot);
  const enter = interpolate(t, [T.booking - 0.1, T.booking + 0.9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const leave = interpolate(t, [T.ugc, T.ugc + 0.7], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const shipOff = interpolate(t, [T.stuck + 0.9, T.stuck + 2.6], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const jitter = t >= T.stuck + 0.6 && t < T.stuck + 1.4 ? noise2D("cj", frame * 0.8, 0) * 10 : 0;
  return (
    <AbsoluteFill style={{ perspective: 2300, perspectiveOrigin: `540px ${CAROUSEL_Y}px`, opacity: enter * (1 - leave) }}>
      <div
        style={{
          position: "absolute",
          left: 540,
          top: CAROUSEL_Y,
          transformStyle: "preserve-3d",
          transform: `translateX(${jitter}px) scale(${0.82 + 0.18 * enter - 0.3 * leave}) translateZ(${-RADIUS}px) rotateY(${-rot}deg)`,
          filter: speed > 0.8 ? `blur(${Math.min(5, speed * 0.6)}px)` : undefined,
        }}
      >
        {CARDS.map((c, i) => {
          let rel = (((i * STEP_DEG - rot) % 360) + 540) % 360 - 180;
          const front = Math.abs(rel);
          const vis = interpolate(front, [0, 70, 120], [1, 0.55, 0], clamp);
          const off = c.key === "ship" ? shipOff : 0;
          if (vis <= 0.01) return null;
          rel = rel + 0;
          return (
            <div
              key={c.key}
              style={{
                position: "absolute",
                left: -CARD_W / 2,
                top: -CARD_H / 2,
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
                transform: `rotateY(${i * STEP_DEG}deg) translateZ(${RADIUS}px) translateX(${off * 900}px) translateY(${off * 120}px) rotateZ(${off * 14}deg)`,
                opacity: vis * (1 - off),
                filter: front > 20 ? `brightness(${interpolate(front, [20, 90], [1, 0.82], clamp)})` : undefined,
              }}
            >
              <Card i={i} t={t} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- UGC orbit ----------
const ORBIT_C = { x: 540, y: 950 };
const Orbit: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.ugc - 0.1 || t > T.cta + 0.8) return null;
  const out = interpolate(t, [T.cta - 0.35, T.cta + 0.4], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <AbsoluteFill>
      {CARDS.map((c, i) => {
        const k = interpolate(t, [T.ugc + 0.15 + i * 0.07, T.ugc + 1.2 + i * 0.07], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.9, 0.3, 1.15) });
        const theta = -Math.PI / 2 + (i * 2 * Math.PI) / 7 + (t - T.ugc) * 0.22;
        const rx = 410 + out * 500;
        const ry = 400 + out * 600;
        const x = ORBIT_C.x + Math.cos(theta) * rx * k;
        const y = ORBIT_C.y + Math.sin(theta) * ry * k;
        const depth = (Math.sin(theta) + 1) / 2; // lower cards come forward
        const scale = (0.28 + 0.06 * depth) * (0.4 + 0.6 * k);
        const check = interpolate(t, [T.ugc + 1.6 + i * 0.12, T.ugc + 1.9 + i * 0.12], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
        return (
          <div key={c.key} style={{ position: "absolute", left: x - (CARD_W * scale) / 2, top: y - (CARD_H * scale) / 2, zIndex: Math.round(depth * 10), opacity: k * (1 - out) }}>
            <Card i={i} t={t} w={CARD_W * scale} h={CARD_H * scale} check={check} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- the ring (HyperFrames medallion) placement ----------
const RING_KEYS: [number, number, number, number][] = [
  // [time, centreX, centreY, display size of the 900-px clip]
  [0, 540, 960, 820],
  [3.45, 540, 960, 820],
  [4.2, 540, 1470, 300],
  [T.ugc, 540, 1470, 300],
  [T.ugc + 1.2, ORBIT_C.x, ORBIT_C.y, 560],
  [T.cta - 0.3, ORBIT_C.x, ORBIT_C.y, 560],
  [T.cta + 0.25, 436, 777, 249], // onto the logo's G (see hyperframes/e01-logo)
];
const ringAt = (t: number) => {
  const ts = RING_KEYS.map((k) => k[0]);
  const e = Easing.bezier(0.65, 0, 0.35, 1);
  return {
    x: interpolate(t, ts, RING_KEYS.map((k) => k[1]), { ...clamp, easing: e }),
    y: interpolate(t, ts, RING_KEYS.map((k) => k[2]), { ...clamp, easing: e }) + (t > T.ugc + 1.2 && t < T.cta - 0.3 ? Math.sin(t * 1.6) * 6 : 0),
    size: interpolate(t, ts, RING_KEYS.map((k) => k[3]), { ...clamp, easing: e }),
  };
};

export const E01ExportRelay: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const ring = ringAt(t);
  const ringFade = interpolate(t, [T.cta + 0.2, T.cta + 0.5], [1, 0], clamp);
  const themeAt = (f: number): FrameTheme => (f < sec(4.1) ? "dark" : "light");
  const hits = [sec(0.45), sec(2.25), sec(T.stuck + 0.8)];
  const sfx: SfxCue[] = [
    ...Array.from({ length: 7 }, (_, i) => ({ at: sec(0.05 + i * 0.05), name: "tick", volume: 0.35 })),
    { at: sec(0.45), name: "boom", volume: 0.7 },
    { at: sec(2.25), name: "crunch", volume: 0.55 },
    { at: sec(3.45), name: "whoosh", volume: 0.5 },
    ...STEPS.slice(1).map((s) => ({ at: sec(s.at - 0.05), name: "whoosh", volume: 0.35 })),
    ...STEPS.map((s) => ({ at: sec(s.at + 0.05), name: "tick", volume: 0.3 })),
    { at: sec(T.stuck), name: "glitch", volume: 0.7 },
    { at: sec(T.stuck + 0.8), name: "crunch", volume: 0.55 },
    { at: sec(T.ugc + 0.1), name: "whoosh", volume: 0.5 },
    { at: sec(T.cta + 0.1), name: "sonic-logo", volume: 0.8 },
  ];

  return (
    <AbsoluteFill style={{ background: "#0B0807" }}>
      <Shake hits={hits} amount={18}>
        <Backdrop t={t} />
        <Carousel t={t} frame={frame} />
        <Orbit t={t} />
      </Shake>
      <Chapter t={t} frame={frame} />

      {/* The UGC ring */}
      {MANIFEST.hf["e01-medallion"] ? (
        <Sequence durationInFrames={sec(T.cta + 0.6)} name="H e01-medallion (placed)">
          <div style={{ position: "absolute", left: ring.x - ring.size / 2, top: ring.y - ring.size / 2, width: ring.size, height: ring.size, opacity: ringFade }}>
            <OffthreadVideo src={staticFile(MANIFEST.hf["e01-medallion"])} transparent muted style={{ width: "100%", height: "100%" }} />
          </div>
        </Sequence>
      ) : null}

      <HfOverlay clip="e01-hook" from={0} durationInFrames={sec(4)} fallback={null} />
      <HfOverlay clip="e01-lanes" from={sec(T.green) - 3} durationInFrames={sec(T.loaded) - sec(T.green) + 3} fallback={null} />
      <HfOverlay clip="e01-rolled" from={sec(T.stuck)} durationInFrames={sec(T.ugc - T.stuck)} fallback={null} />
      <HfOverlay clip="e01-team" from={sec(T.ugc)} durationInFrames={sec(T.cta - T.ugc)} fallback={null} />
      <HfOverlay clip="e01-logo" from={sec(T.cta)} durationInFrames={sec(ep.dur - T.cta)} fallback={null} />

      <Captions beats={beats} accent={BRAND.orange} ep="e01" themeAt={themeAt} />
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
