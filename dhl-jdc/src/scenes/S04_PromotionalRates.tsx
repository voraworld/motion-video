import React from "react";
import { BODY, C, display } from "../design/tokens";
import { E, k, lerp, p01 } from "../motion/util";
import { Asset, hFor } from "../components/Asset";
import { MaskRise } from "../components/Kinetic";
import { BlurWords } from "../components/Type";

/**
 * S04 · COMPETITIVE RATES (23.04 – 28.8 s, local time)
 * Out of the avatar's yellow: the DHL baggage tag drops in on its cord and swings to rest (pendulum
 * θ = −4° + 34°·e^(−1.9t)·cos 5.2t). The offer is printed on the tag face plate by plate. Exit: the tag's red
 * fold floods the frame red (colour flood) into S05.
 */
const TAG_W = 860;
const TAG_H = hFor("dhl_tag", TAG_W);
const EYE_F = { x: 0.214, y: 0.537 };
const EYE_OFF = { x: (EYE_F.x - 0.5) * TAG_W, y: (EYE_F.y - 0.5) * TAG_H };
const EYE = { x: 230, y: 1080 };
const FOLD_F = { x: 0.9, y: 0.83 }; // the red folded corner
export const S4_FLOOD = { t0: 5.0, t1: 5.76 };

export const S04PromotionalRates: React.FC<{ t: number }> = ({ t }) => {
  const drop = k(t, [0.1, 0.75], [0, 1], E.out);
  const ey = lerp(-260, EYE.y, drop);
  const x = Math.max(0, t - 0.55);
  const th = -4 + 34 * Math.exp(-1.9 * x) * Math.cos(5.2 * x) * (t > 0.55 ? 1 : 0) + (t <= 0.55 ? 30 * (1 - drop) : 0);
  const rad = (th * Math.PI) / 180;
  // fold corner position in screen space (tag rotates about the eyelet)
  const fx = (FOLD_F.x - 0.5) * TAG_W - EYE_OFF.x;
  const fy = (FOLD_F.y - 0.5) * TAG_H - EYE_OFF.y;
  const fold = { x: EYE.x + fx * Math.cos(rad) - fy * Math.sin(rad), y: ey + fx * Math.sin(rad) + fy * Math.cos(rad) };
  const flood = k(t, [S4_FLOOD.t0, S4_FLOOD.t1], [0, 1], E.inOut);
  const face = [p01(t, 2.2, 2.6), p01(t, 2.4, 2.85), p01(t, 2.6, 3.05), p01(t, 3.4, 3.8)];

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(52% 30% at 50% 60%, rgba(255,240,170,0.6), rgba(255,240,170,0))" }} />
      {/* cord from above */}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={`M-40,${ey - 330} Q${EYE.x * 0.45},${ey - 60} ${EYE.x},${ey}`} stroke={C.red} strokeWidth={11} fill="none" strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: `${EYE.x}px ${ey}px`, rotate: `${th.toFixed(3)}deg` }}>
        <Asset name="dhl_tag" x={EYE.x - EYE_OFF.x} y={ey - EYE_OFF.y} w={TAG_W} shadow />
        <div style={{ position: "absolute", left: EYE.x - EYE_OFF.x + 0.075 * TAG_W, top: ey - EYE_OFF.y - 0.03 * TAG_H, translate: "-50% -50%", rotate: "-3.2deg", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <MaskRise p={face[0]}>
            <div style={{ ...display(58, { wdth: 100, wght: 800 }), color: C.ink, letterSpacing: "0.14em" }}>SPECIAL</div>
          </MaskRise>
          <MaskRise p={face[1]}>
            <div style={{ ...display(84, { wdth: 68 }), color: C.red }}>PROMOTIONAL</div>
          </MaskRise>
          <MaskRise p={face[2]}>
            <div style={{ ...display(84, { wdth: 68 }), color: C.red }}>DISCOUNTS</div>
          </MaskRise>
          <div style={{ fontFamily: BODY, fontSize: 22, fontWeight: 600, color: C.ink, opacity: 0.75 * face[3], marginTop: 4 }}>Terms apply.</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 80, width: 920, top: 205 }}>
        <BlurWords
          text="COMPETITIVE SHIPPING RATES."
          t={t}
          t0={0.55}
          out={4.85}
          style={{ ...display(150, { wdth: 68 }), color: C.ink, lineHeight: 0.92 }}
          color={(i) => (i >= 1 ? C.red : undefined)}
        />
      </div>
      {flood > 0 ? (
        <div style={{ position: "absolute", inset: 0, background: C.red, clipPath: `circle(${(flood * 2400).toFixed(1)}px at ${fold.x.toFixed(1)}px ${fold.y.toFixed(1)}px)` }} />
      ) : null}
    </div>
  );
};
