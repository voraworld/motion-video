import React from "react";
import { BODY, C, display } from "../design/tokens";
import { E, k, kk, lerp, p01 } from "../motion/util";
import { Asset, hFor } from "../components/Asset";
import { MaskRise, PlaneReveal } from "../components/Kinetic";
import { LivingRibbon, Pt } from "../components/LivingRibbon";

/**
 * S04 · COMPETITIVE RATES (28.8 – 38.4 s, local time)
 * The cord from the phone pulls the DHL-yellow tag into frame; it swings on its eyelet with real pendulum
 * damping. Macro push to the metal eyelet, pull back. Headline uncovered by sliding planes; the offer is
 * printed onto the tag face (live text, moving with the tag). Exit: the camera flies through the eyelet —
 * scene 05 is already waiting on the other side of the hole.
 */
const TAG_W = 820;
const TAG_H = hFor("dhl_tag", TAG_W);
const EYE_F = { x: 0.214, y: 0.537 }; // eyelet centre, fraction of the processed tag
const EYE_OFF = { x: (EYE_F.x - 0.5) * TAG_W, y: (EYE_F.y - 0.5) * TAG_H };
export const EYE = { x: 255, y: 1150 };
const EYE0 = { x: 1260, y: 520 };
const HOLE_R = 0.019 * TAG_W;

const cord = (e: { x: number; y: number }, sag = 110): Pt[] => {
  const P1: Pt = [130, 745];
  return [
    [-90, 650],
    P1,
    [lerp(P1[0], e.x, 0.33), lerp(P1[1], e.y, 0.33) + sag],
    [lerp(P1[0], e.x, 0.66), lerp(P1[1], e.y, 0.66) + sag * 0.8],
    [e.x - 70, e.y - 30],
    [e.x, e.y],
  ];
};
export const S4_CORD_START: Pt[] = cord(EYE0);

const eyeAt = (t: number) => {
  const p = k(t, [0.05, 1.05], [0, 1], E.out);
  // arc: comes in high from the right, dips, settles
  return { x: lerp(EYE0.x, EYE.x, p), y: lerp(EYE0.y, EYE.y, p) - Math.sin(p * Math.PI) * 90 };
};
const swing = (t: number) => {
  const x = Math.max(0, t - 0.15);
  return -3 + 38 * Math.exp(-1.9 * x) * Math.cos(5.2 * x);
};

/** Passthrough: returns the S05 reveal circle (global time). */
export const S4_PASS = { t0: 8.4, t1: 9.6 };
export const passScale = (t: number) => {
  const x = k(t, [S4_PASS.t0, S4_PASS.t1], [0, 1], (v) => v);
  return 1 + 92 * Math.pow(x, 3.2);
};
export const s5Reveal = (tLocalS4: number) => ({ cx: EYE.x, cy: EYE.y, r: HOLE_R * passScale(tLocalS4) * 0.92 });

export const S04PromotionalRates: React.FC<{ t: number }> = ({ t }) => {
  const e = eyeAt(t);
  const th = swing(t);
  const macro = kk(t, [1.0, 2.05, 2.55, 3.4], [1, 1.75, 1.75, 1], E.inOut);
  const pass = passScale(t);
  const cam = macro * pass;

  const h1 = k(t, [1.05, 1.75], [0, 1], E.inOut);
  const h2 = k(t, [1.35, 2.05], [0, 1], E.inOut);
  const headOut = k(t, [8.3, 8.7], [0, 1], E.in);
  const face = [p01(t, 3.0, 3.5), p01(t, 3.2, 3.75), p01(t, 3.45, 4.0), p01(t, 4.4, 4.9)];

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${EYE.x}px ${EYE.y}px`, scale: `${cam}` }}>
        {/* soft key light pooled where the tag hangs */}
        <div style={{ position: "absolute", inset: 0, opacity: k(t, [0.2, 1.0], [0, 1]), background: "radial-gradient(48% 30% at 52% 62%, rgba(255,240,170,0.55), rgba(255,240,170,0))" }} />
        <LivingRibbon id="s4c" pts={cord(e, 110 + Math.sin(t * 2) * 6)} width={16} shadowOffset={26} twist={(s) => 0.5 * Math.sin(s * 12 + t * 2)} taper={0.005} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: `${e.x}px ${e.y}px`, rotate: `${th.toFixed(3)}deg` }}>
          <Asset name="dhl_tag" x={e.x - EYE_OFF.x} y={e.y - EYE_OFF.y} w={TAG_W} shadow />
          {/* offer printed on the tag face */}
          <div
            style={{
              position: "absolute",
              left: e.x - EYE_OFF.x + 0.075 * TAG_W,
              top: e.y - EYE_OFF.y - 0.02 * TAG_H,
              translate: "-50% -50%",
              rotate: "-3.2deg",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <MaskRise p={face[0]}>
              <div style={{ ...display(60, { wdth: 100, wght: 800 }), color: C.ink, letterSpacing: "0.12em" }}>SPECIAL</div>
            </MaskRise>
            <MaskRise p={face[1]}>
              <div style={{ ...display(80, { wdth: 68 }), color: C.red }}>PROMOTIONAL</div>
            </MaskRise>
            <MaskRise p={face[2]}>
              <div style={{ ...display(80, { wdth: 68 }), color: C.red }}>DISCOUNTS</div>
            </MaskRise>
            <div style={{ fontFamily: BODY, fontSize: 22, fontWeight: 600, color: C.ink, opacity: 0.75 * face[3], marginTop: 6 }}>Terms apply.</div>
          </div>
        </div>
        {/* the hole itself, so the dive reads as going *through* the eyelet */}
        <div
          style={{
            position: "absolute",
            left: EYE.x - HOLE_R,
            top: EYE.y - HOLE_R,
            width: HOLE_R * 2,
            height: HOLE_R * 2,
            borderRadius: "50%",
            background: C.red,
            opacity: k(t, [8.4, 8.7], [0, 1]),
            boxShadow: "inset 0 3px 6px rgba(0,0,0,0.45)",
          }}
        />
      </div>
      {headOut < 1 ? (
        <div style={{ position: "absolute", left: 60, top: 186, opacity: 1 - headOut }}>
          <PlaneReveal p={h1} width={960} height={150} color={C.ink}>
            <div style={{ ...display(140, { wdth: 68 }), color: C.ink }}>COMPETITIVE</div>
          </PlaneReveal>
          <PlaneReveal p={h2} width={960} height={150} color={C.red} dir={-1} style={{ marginTop: 8 }}>
            <div style={{ ...display(140, { wdth: 68 }), color: C.red }}>SHIPPING RATES.</div>
          </PlaneReveal>
        </div>
      ) : null}
    </div>
  );
};
