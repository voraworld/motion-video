import React from "react";
import { BODY, C, WA, display } from "../design/tokens";
import { E, clamp01, k, lerp, p01, spr } from "../motion/util";
import { MaskRise, Prism } from "../components/Kinetic";
import { S6_M1 } from "./S06_WhatsAppBooking";

/**
 * S05 · NO MYDHL+ REGISTRATION (28.8 – 40.32 s, local time)
 * The red room left by the flood. An abstract sign-up sheet floats in 3-D; as the narrator says "no account
 * required" its rows fold shut like blinds and the sheet re-forms as one chat bubble: the customer's first
 * message. The headline's second line turns over as a prism: REGISTRATION. → ACCOUNT NEEDED.
 * Exit: the room folds up out of frame and the bubble is carried into the phone of S06.
 */
export const S5 = { kicker: 0.8, head: 2.15, flip: 4.85, fold: 4.85, bubble: 5.85, text: 6.8, support: 7.9, exit: 10.15, end: 11.52 };
const FORM = { x: 540, y: 1170, w: 600 };
const BW = 660;
export const BUBBLE_TEXT = "Hi! I'd like to arrange a shipment.";

const Row: React.FC<{ fold: number; h: number; children: React.ReactNode }> = ({ fold, h, children }) => (
  <div style={{ height: h * (1 - fold), perspective: 900 }}>
    <div style={{ height: h, transformOrigin: "50% 0%", transform: `rotateX(${(-fold * 92).toFixed(2)}deg)`, opacity: 1 - clamp01((fold - 0.7) / 0.3) }}>{children}</div>
  </div>
);

const FieldRow: React.FC<{ w: number; dots?: boolean; label: number }> = ({ w, dots, label }) => (
  <div style={{ paddingTop: 6 }}>
    <div style={{ width: w * label, height: 11, borderRadius: 6, background: "#CFCFCF", marginBottom: 9 }} />
    <div style={{ width: w, height: 54, borderRadius: 14, border: "3px solid #DCDCDC", display: "flex", alignItems: "center", paddingLeft: 18, boxSizing: "border-box" }}>
      {dots ? <div style={{ letterSpacing: 7, color: "#9A9A9A", fontSize: 28 }}>••••••••</div> : <div style={{ width: w * 0.42, height: 9, borderRadius: 5, background: "#E4E4E4" }} />}
    </div>
  </div>
);

export const S05NoRegistration: React.FC<{ t: number }> = ({ t }) => {
  const inner = FORM.w - 64;
  const folds = [0, 1, 2, 3, 4, 5].map((i) => k(t, [S5.fold + i * 0.15, S5.fold + i * 0.15 + 0.42], [0, 1], E.inOut));
  const morph = k(t, [S5.bubble - 0.2, S5.bubble + 0.7], [0, 1], E.inOut);
  const flatten = k(t, [S5.fold, S5.bubble + 0.6], [0, 1], E.inOut);
  const dots = t > S5.bubble + 0.4 && t < S5.text + 0.1;
  const txt = p01(t, S5.text, S5.text + 0.4);
  const appear = spr(t, 0.15, { freq: 1.2, damp: 0.78 });
  const ry = lerp(-18 + Math.sin(t * 0.9) * 3, 0, flatten);
  const rx = lerp(9, 0, flatten);

  const roomFold = k(t, [S5.exit, S5.end - 0.08], [0, 1], E.inOut);
  const fly = k(t, [S5.exit - 0.25, S5.end - 0.04], [0, 1], E.inOut);
  const bw = lerp(FORM.w, BW, morph);
  const bx = lerp(FORM.x, S6_M1.cx, fly);
  const by = lerp(FORM.y - 30 * morph, S6_M1.cy, fly) - Math.sin(fly * Math.PI) * 140;
  const bScale = lerp(1, S6_M1.w / BW, fly);

  const kick = p01(t, S5.kicker, S5.kicker + 0.4);
  const kickOut = k(t, [S5.head - 0.4, S5.head - 0.08], [0, 1], E.in);
  const h1 = p01(t, S5.head, S5.head + 0.45);
  const h2 = p01(t, S5.head + 0.12, S5.head + 0.57);
  const flip = k(t, [S5.flip, S5.flip + 0.5], [0, 1], E.inOut);
  const sup = [p01(t, S5.support, S5.support + 0.45), p01(t, S5.support + 0.12, S5.support + 0.57)];

  const room = (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: "540px 0px",
        transform: `perspective(2400px) rotateX(${(roomFold * 100).toFixed(2)}deg)`,
        background: `radial-gradient(85% 60% at 50% 50%, #E5121F 0%, ${C.red} 45%, #A9030E 100%)`,
      }}
    >
      {kickOut < 1 ? (
        <div style={{ position: "absolute", left: 0, width: 1080, top: 300, display: "flex", justifyContent: "center", opacity: 1 - kickOut }}>
          <MaskRise p={kick}>
            <div style={{ ...display(70, { wdth: 88, wght: 800 }), color: C.yellow, letterSpacing: "0.04em" }}>HERE&apos;S THE BEST PART.</div>
          </MaskRise>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, width: 1080, top: 250, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <MaskRise p={h1}>
          <div style={{ ...display(156, { wdth: 68 }), color: C.white }}>
            <span style={{ color: C.yellow }}>NO</span> MYDHL+
          </div>
        </MaskRise>
        <MaskRise p={h2} style={{ width: 1080 }}>
          <Prism
            x={flip}
            h={146}
            a={
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ ...display(130, { wdth: 66 }), color: C.white }}>REGISTRATION.</div>
              </div>
            }
            b={
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ ...display(122, { wdth: 64 }), color: C.white }}>ACCOUNT NEEDED.</div>
              </div>
            }
          />
        </MaskRise>
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <MaskRise p={sup[0]}>
            <div style={{ ...display(58, { wdth: 86, wght: 800 }), color: C.yellow, letterSpacing: "0.02em" }}>WHEN YOU BOOK THROUGH</div>
          </MaskRise>
          <MaskRise p={sup[1]}>
            <div style={{ ...display(58, { wdth: 86, wght: 800 }), color: C.yellow, letterSpacing: "0.02em" }}>OUR SERVICE POINT.</div>
          </MaskRise>
        </div>
      </div>
    </div>
  );

  const green = fly > 0.5;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {roomFold < 1 ? room : null}
      <div
        style={{
          position: "absolute",
          left: bx,
          top: by,
          translate: "-50% -50%",
          transform: `perspective(1600px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${(appear * bScale).toFixed(4)})`,
          opacity: clamp01(appear * 2),
        }}
      >
        <div
          style={{
            position: "relative",
            width: bw,
            background: green ? WA.out : C.white,
            borderRadius: lerp(34, 30, morph),
            borderTopRightRadius: lerp(34, 6, morph),
            padding: `${lerp(34, 16, morph)}px ${lerp(32, 22, morph)}px`,
            boxSizing: "border-box",
            boxShadow: "0 40px 70px rgba(60,0,0,0.45), 0 8px 16px rgba(60,0,0,0.3)",
          }}
        >
          <svg width={40} height={30} style={{ position: "absolute", right: -22, top: 0, opacity: morph }}>
            <path d="M0,0 L40,0 Q18,8 4,30 Z" fill={green ? WA.out : C.white} />
          </svg>
          <Row fold={folds[0]} h={140}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 92, height: 92, borderRadius: 46, background: "#EFEFEF", overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", left: 30, top: 18, width: 32, height: 32, borderRadius: 16, background: "#C4C4C4" }} />
                <div style={{ position: "absolute", left: 16, top: 56, width: 60, height: 50, borderRadius: 30, background: "#C4C4C4" }} />
              </div>
              <div style={{ width: inner * 0.55, height: 16, borderRadius: 8, background: C.ink, marginTop: 14 }} />
            </div>
          </Row>
          <Row fold={folds[1]} h={92}>
            <FieldRow w={inner} label={0.3} />
          </Row>
          <Row fold={folds[2]} h={92}>
            <FieldRow w={inner} label={0.42} />
          </Row>
          <Row fold={folds[3]} h={92}>
            <FieldRow w={inner} label={0.36} />
          </Row>
          <Row fold={folds[4]} h={92}>
            <FieldRow w={inner} label={0.3} dots />
          </Row>
          <Row fold={folds[5]} h={90}>
            <div style={{ width: inner, height: 56, borderRadius: 16, background: C.ink, marginTop: 18 }} />
          </Row>
          <div style={{ height: lerp(0, 110, morph), overflow: "hidden", display: "flex", alignItems: "center" }}>
            {dots ? (
              <div style={{ display: "flex", gap: 12, paddingLeft: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 18, height: 18, borderRadius: 9, background: "#9A9A9A", translate: `0 ${(Math.sin(t * 12 - i * 1.1) * 6).toFixed(1)}px` }} />
                ))}
              </div>
            ) : null}
            {txt > 0 ? (
              <div style={{ fontFamily: BODY, fontSize: 40, fontWeight: 600, lineHeight: 1.3, color: green ? WA.text : C.ink, opacity: txt, whiteSpace: "normal" }}>{BUBBLE_TEXT}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
