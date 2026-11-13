import React from "react";
import { C, display } from "../design/tokens";
import { E, clamp01, k, kk, lerp, p01, spr } from "../motion/util";
import { Asset, hFor } from "../components/Asset";
import { MaskRise, PlaneReveal } from "../components/Kinetic";
import { LivingRibbon, Pt, mixPts } from "../components/LivingRibbon";
import { CREASE_PTS, S1_PARCEL, s1Twist } from "./S01_PainPoint";
import { PROJECT } from "../content/copy";

/**
 * S02 · THE SOLUTION REVEAL (9.6 – 17.28 s, local time)
 * Relief: the crease ribbon lifts into a sweeping arch, the parcel rises as hero, THERE'S AN EASIER WAY.
 * is uncovered by sliding planes. The arch then flattens into a straight band that carries the service
 * point's name. Exit: the ribbon wraps the parcel and shoots off as a route line; the camera dives along
 * it into a tunnel of rings (continues at the start of S03).
 */
const ARCH: Pt[] = [
  [1240, 600],
  [990, 650],
  [640, 730],
  [300, 880],
  [330, 1110],
  [740, 1280],
  [920, 1500],
  [640, 1780],
];
const BAND_SLOPE = -0.2;
const BAND_Y0 = 760;
const bandY = (x: number) => BAND_Y0 + BAND_SLOPE * x;
const BAND: Pt[] = [-260, -40, 180, 400, 620, 840, 1060, 1320].map((x) => [x, bandY(x)] as Pt);
const WRAP: Pt[] = [
  [-200, 1330],
  [200, 1470],
  [720, 1470],
  [1000, 1220],
  [760, 960],
  [320, 1060],
  [640, 700],
  [1320, 160],
];
export const S2_PARCEL = { x: 540, y: 1215, w: 640 };
export const S2_DIVE = { x: 1010, y: 330 }; // the route's exit point the camera dives toward

export const S02Solution: React.FC<{ t: number }> = ({ t }) => {
  // ribbon shape over time
  const toArch = k(t, [0, 1.0], [0, 1], E.inOut);
  const toBand = k(t, [2.25, 3.05], [0, 1], E.inOut);
  const toWrap = k(t, [6.25, 7.05], [0, 1], E.inOut);
  let pts = mixPts(CREASE_PTS, ARCH, toArch);
  pts = mixPts(pts, BAND, toBand);
  pts = mixPts(pts, WRAP, toWrap);
  const flat = toBand * (1 - toWrap);
  const twist = (s: number) => {
    const wave = 1.25 * Math.sin(s * 7.5 - t * 1.6);
    const mid = Math.min(1, Math.max(0, (Math.abs(s - 0.5) - 0.3) / 0.15)); // 0 in the middle 60 %
    const own = wave * (1 - flat) + wave * mid * flat;
    return lerp(s1Twist(s, t + 9.6), own, k(t, [0, 0.8], [0, 1], E.inOut));
  };
  const width = lerp(lerp(110, 150, toArch), 210, flat) * (1 - toWrap * 0.45);

  // camera dive at the end
  const dive = k(t, [6.9, 7.68], [0, 1], E.in);
  const camScale = lerp(1, 5.5, dive);
  const camX = lerp(0, 540 - S2_DIVE.x, dive);
  const camY = lerp(0, 900 - S2_DIVE.y, dive);

  // parcel: from S1 resting pose to hero pose
  const rise = spr(t, 0.05, { freq: 1.3, damp: 0.7 });
  const px = lerp(S1_PARCEL.x, S2_PARCEL.x, rise);
  const py = lerp(S1_PARCEL.y, S2_PARCEL.y, rise) + Math.sin(t * 2.1) * 6 * rise;
  const pw = lerp(S1_PARCEL.w, S2_PARCEL.w, rise);
  const ph = hFor("dhl_box-closed-label-left", pw);

  const flash = 1 - k(t, [0, 0.45], [0, 1], E.out);
  const head1 = k(t, [0.15, 0.85], [0, 1], E.inOut);
  const head2 = k(t, [0.42, 1.12], [0, 1], E.inOut);
  const headOut = k(t, [2.0, 2.4], [0, 1], E.in);
  const lab = k(t, [2.75, 3.25], [0, 1], E.out);
  const name = k(t, [2.95, 3.6], [0, 1], E.out);
  const nameOut = k(t, [6.15, 6.6], [0, 1], E.in);

  const ang = (Math.atan(BAND_SLOPE) * 180) / Math.PI;
  // ribbon split: segment behind the parcel vs in front of it (only while wrapping)
  const behind = toWrap > 0.01;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 1 - k(t, [7.35, 7.68], [0, 1], E.in),
          transformOrigin: `${S2_DIVE.x}px ${S2_DIVE.y}px`,
          scale: `${camScale}`,
          translate: `${camX.toFixed(1)}px ${camY.toFixed(1)}px`,
        }}
      >
        {/* relief flash */}
        {flash > 0 ? (
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 45% at 50% 45%, rgba(255,255,255,0.75), rgba(255,255,255,0))", opacity: flash }} />
        ) : null}
        <LivingRibbon id="s2a" pts={pts} width={width} twist={twist} from={behind ? 0.42 : 0} to={1} />
        {/* parcel hero */}
        <div
          style={{
            position: "absolute",
            left: px - pw * 0.42,
            width: pw * 0.84,
            top: py + ph / 2 - 40,
            height: 76,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(120,70,0,0.42), rgba(120,70,0,0))",
          }}
        />
        <Asset name="dhl_box-closed-label-left" x={px} y={py} w={pw} rotate={Math.sin(t * 1.3) * 1.2 * rise} shadow />
        {behind ? <LivingRibbon id="s2b" pts={pts} width={width} twist={twist} from={0} to={0.43} shadow="yellow" /> : null}

        {/* name riding on the flat band */}
        {flat > 0.5 && nameOut < 1 ? (
          <div
            style={{
              position: "absolute",
              left: 540,
              top: bandY(540),
              rotate: `${ang}deg`,
              translate: "-50% -50%",
              width: 1000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ position: "absolute", top: -128, clipPath: `inset(-20% ${((1 - lab) * 100).toFixed(1)}% -20% 0)`, opacity: 1 - nameOut }}>
              <div style={{ ...display(54, { wdth: 100, wght: 800 }), color: C.ink, letterSpacing: "0.04em" }}>{PROJECT.spLabel}</div>
            </div>
            <div style={{ overflow: "hidden", height: 150, width: 1000, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div
                style={{
                  ...display(128, { wdth: 72, italic: true }),
                  color: C.white,
                  translate: `${((1 - name) * -1100 + nameOut * 1100).toFixed(1)}px 6px`,
                  textShadow: "0 4px 10px rgba(80,0,0,0.25)",
                }}
              >
                {PROJECT.spName}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* headline (screen space) */}
      {headOut < 1 ? (
        <div style={{ position: "absolute", left: 70, top: 205, translate: `0 ${(-headOut * 60).toFixed(1)}px`, opacity: 1 - headOut }}>
          <PlaneReveal p={head1} width={940} height={170} color={C.red}>
            <div style={{ ...display(176, { wdth: 70 }), color: C.ink }}>THERE&apos;S AN</div>
          </PlaneReveal>
          <PlaneReveal p={head2} width={940} height={170} color={C.ink} dir={-1} style={{ marginTop: 6 }}>
            <div style={{ ...display(176, { wdth: 70 }), color: C.red }}>EASIER WAY.</div>
          </PlaneReveal>
        </div>
      ) : null}
      {/* small proof line under the band while the narrator says "a simpler way to get your shipment started" */}
      {t > 4.2 && nameOut < 1 ? (
        <div style={{ position: "absolute", left: 0, width: 1080, top: 300, display: "flex", justifyContent: "center", opacity: 1 - nameOut }}>
          <MaskRise p={p01(t, 4.25, 4.85)}>
            <div style={{ ...display(64, { wdth: 80, wght: 800 }), color: C.ink, letterSpacing: "0.01em" }}>
              A SIMPLER WAY TO <span style={{ color: C.red }}>GET STARTED.</span>
            </div>
          </MaskRise>
        </div>
      ) : null}
      {/* tunnel rings: the camera passes through them into S03 */}
      {t > 7.0 ? <Tunnel t={t - 7.0} /> : null}
    </div>
  );
};

/** Concentric ribbon rings racing past the camera (shared with S03's opening). */
export const Tunnel: React.FC<{ t: number }> = ({ t }) => {
  const rings = [0, 1, 2, 3, 4, 5, 6];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
      {rings.map((i) => {
        const life = t * 1.6 - i * 0.16;
        if (life <= 0 || life > 1.2) return null;
        const z = Math.pow(life, 2.2);
        const rx = 40 + z * 1500;
        const ry = rx * 1.45;
        const op = clamp01(life * 4) * clamp01((1.2 - life) * 3);
        return (
          <ellipse
            key={i}
            cx={540}
            cy={900}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={i % 2 ? C.red : C.redLo}
            strokeWidth={6 + z * 150}
            opacity={op}
            transform={`rotate(${(i * 23 + t * 60).toFixed(1)} 540 900)`}
          />
        );
      })}
      <circle cx={540} cy={900} r={kk(t, [0, 0.6, 1.4], [0, 40, 0])} fill={C.white} opacity={0.5} />
    </svg>
  );
};
