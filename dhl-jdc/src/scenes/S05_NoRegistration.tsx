import React from "react";
import { BODY, C, WA, display } from "../design/tokens";
import { E, clamp01, k, lerp, p01, spr } from "../motion/util";
import { Icon } from "../components/Icon";
import { MaskRise, Prism } from "../components/Kinetic";
import { S6_M1 } from "./S06_WhatsAppBooking";

/**
 * S05 · NO MYDHL+ REGISTRATION (38.4 – 51.84 s, local time; starts at −1.2 inside the eyelet)
 * Red room. An abstract registration form floats in 3-D. As the narrator says "no account required" its
 * rows fold shut one by one like blinds, the sheet collapses and re-forms as a single chat bubble — the
 * customer's first message. The headline's second line turns over as a prism: REGISTRATION. → ACCOUNT NEEDED.
 * Exit: the red room folds up out of frame; the bubble flies into the phone of S06 as its first message.
 */
export const S5 = { kicker: 0.85, head: 2.2, flip: 5.0, fold: 5.0, bubble: 6.0, text: 7.0, support: 7.6, exit: 12.0, end: 13.44 };
const FORM = { x: 540, y: 1110, w: 620 };
const BW = 660;
export const BUBBLE_TEXT = "Hi! I'd like to arrange a shipment.";

const Row: React.FC<{ fold: number; h: number; children: React.ReactNode }> = ({ fold, h, children }) => (
  <div style={{ height: h * (1 - fold), perspective: 900, overflow: "visible" }}>
    <div style={{ height: h, transformOrigin: "50% 0%", transform: `rotateX(${(-fold * 92).toFixed(2)}deg)`, opacity: 1 - clamp01((fold - 0.7) / 0.3) }}>{children}</div>
  </div>
);

const FieldRow: React.FC<{ icon: "userCircle" | "envelopeSimple" | "identificationCard" | "lockKey"; w: number; dots?: boolean }> = ({ icon, w, dots }) => (
  <div style={{ paddingTop: 6 }}>
    <div style={{ width: w * 0.36, height: 11, borderRadius: 6, background: "#CFCFCF", marginBottom: 9 }} />
    <div style={{ width: w, height: 54, borderRadius: 14, border: "3px solid #DCDCDC", display: "flex", alignItems: "center", gap: 12, paddingLeft: 14, boxSizing: "border-box" }}>
      <Icon name={icon} size={26} color="#ABABAB" />
      {dots ? <div style={{ letterSpacing: 7, color: "#9A9A9A", fontSize: 28 }}>••••••••</div> : <div style={{ width: w * 0.42, height: 9, borderRadius: 5, background: "#E4E4E4" }} />}
    </div>
  </div>
);

export const S05NoRegistration: React.FC<{ t: number; clip?: { cx: number; cy: number; r: number } }> = ({ t, clip }) => {
  const inner = FORM.w - 64;
  const folds = [0, 1, 2, 3, 4, 5].map((i) => k(t, [S5.fold + i * 0.16, S5.fold + i * 0.16 + 0.45], [0, 1], E.inOut));
  const morph = k(t, [S5.bubble - 0.2, S5.bubble + 0.7], [0, 1], E.inOut);
  const flatten = k(t, [S5.fold, S5.bubble + 0.6], [0, 1], E.inOut);
  const dots = t > S5.bubble + 0.5 && t < S5.text + 0.1;
  const txt = p01(t, S5.text, S5.text + 0.45);
  const appear = spr(t, -0.6, { freq: 1.2, damp: 0.75 });
  const wob = Math.sin(t * 0.9);
  const ry = lerp(-18 + wob * 4, 0, flatten);
  const rx = lerp(9 + Math.cos(t * 0.7) * 3, 0, flatten);

  // exit: red room folds up; bubble flies to the phone
  const roomFold = k(t, [S5.exit - 0.15, S5.end - 0.1], [0, 1], E.inOut);
  const fly = k(t, [S5.exit - 0.3, S5.end - 0.05], [0, 1], E.inOut);
  const bw = lerp(FORM.w, BW, morph);
  const bx = lerp(FORM.x, S6_M1.cx, fly);
  const by = lerp(FORM.y - 30 * morph, S6_M1.cy, fly) - Math.sin(fly * Math.PI) * 140;
  const bScale = lerp(1, S6_M1.w / BW, fly);

  const kick = p01(t, S5.kicker, S5.kicker + 0.4);
  const kickOut = k(t, [S5.head - 0.15, S5.head + 0.2], [0, 1], E.in);
  const h1 = p01(t, S5.head, S5.head + 0.5);
  const h2 = p01(t, S5.head + 0.15, S5.head + 0.65);
  const flip = k(t, [S5.flip, S5.flip + 0.55], [0, 1], E.inOut);
  const sup = [p01(t, S5.support, S5.support + 0.5), p01(t, S5.support + 0.15, S5.support + 0.65)];
  const noPulse = 1 + 0.08 * Math.exp(-Math.max(0, t - S5.flip - 0.4) * 5) * (t > S5.flip + 0.4 ? 1 : 0);

  const room = (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: "540px 0px",
        transform: `perspective(2400px) rotateX(${(roomFold * 100).toFixed(2)}deg)`,
        background: `radial-gradient(85% 60% at 50% 48%, #E5121F 0%, ${C.red} 45%, #A9030E 100%)`,
        boxShadow: roomFold > 0 ? `0 40px 80px rgba(80,0,0,${(0.5 * roomFold).toFixed(2)})` : undefined,
      }}
    >
      {/* depth: two faint speed planes receding behind the form */}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: 0.18 }}>
        <path d={`M-40,${1500 + wob * 10} L1120,${1380 + wob * 10} L1120,${1400 + wob * 10} L-40,${1524 + wob * 10} Z`} fill={C.yellow} />
        <path d={`M-40,${1560 + wob * 6} L1120,${1440 + wob * 6} L1120,${1452 + wob * 6} L-40,${1574 + wob * 6} Z`} fill={C.yellow} />
      </svg>
      {/* kicker */}
      {kickOut < 1 ? (
        <div style={{ position: "absolute", left: 0, width: 1080, top: 214, display: "flex", justifyContent: "center", opacity: 1 - kickOut, translate: `0 ${-kickOut * 40}px` }}>
          <MaskRise p={kick}>
            <div style={{ ...display(66, { wdth: 90, wght: 800 }), color: C.yellow, letterSpacing: "0.04em" }}>HERE&apos;S THE BEST PART.</div>
          </MaskRise>
        </div>
      ) : null}
      {/* headline */}
      <div style={{ position: "absolute", left: 0, width: 1080, top: 176, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <MaskRise p={h1}>
          <div style={{ ...display(158, { wdth: 68 }), color: C.white }}>
            <span style={{ color: C.yellow, display: "inline-block", scale: `${noPulse}` }}>NO</span> MYDHL+
          </div>
        </MaskRise>
        <MaskRise p={h2} style={{ width: 1080 }}>
          <Prism
            x={flip}
            h={146}
            a={
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ ...display(132, { wdth: 66 }), color: C.white }}>REGISTRATION.</div>
              </div>
            }
            b={
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ ...display(124, { wdth: 64 }), color: C.white }}>ACCOUNT NEEDED.</div>
              </div>
            }
          />
        </MaskRise>
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <MaskRise p={sup[0]}>
            <div style={{ ...display(60, { wdth: 86, wght: 800 }), color: C.yellow, letterSpacing: "0.02em" }}>WHEN YOU BOOK THROUGH</div>
          </MaskRise>
          <MaskRise p={sup[1]}>
            <div style={{ ...display(60, { wdth: 86, wght: 800 }), color: C.yellow, letterSpacing: "0.02em" }}>OUR SERVICE POINT.</div>
          </MaskRise>
        </div>
      </div>
    </div>
  );

  // the form ↔ bubble object
  const formObj = (
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
          background: lerp(0, 1, fly) > 0.5 ? WA.out : C.white,
          borderRadius: lerp(34, 30, morph),
          borderTopRightRadius: lerp(34, 6, morph),
          padding: `${lerp(34, 16, morph)}px ${lerp(32, 22, morph)}px`,
          boxSizing: "border-box",
          boxShadow: "0 40px 70px rgba(60,0,0,0.45), 0 8px 16px rgba(60,0,0,0.3)",
        }}
      >
        {/* bubble tail */}
        <svg width={40} height={30} style={{ position: "absolute", right: -22, top: 0, opacity: morph }}>
          <path d="M0,0 L40,0 Q18,8 4,30 Z" fill={fly > 0.5 ? WA.out : C.white} />
        </svg>
        <Row fold={folds[0]} h={150}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 96, height: 96, borderRadius: 48, background: "#EFEFEF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="userCircle" size={78} color="#B5B5B5" />
            </div>
            <div style={{ width: inner * 0.55, height: 16, borderRadius: 8, background: C.ink, marginTop: 16 }} />
          </div>
        </Row>
        <Row fold={folds[1]} h={92}>
          <FieldRow icon="userCircle" w={inner} />
        </Row>
        <Row fold={folds[2]} h={92}>
          <FieldRow icon="envelopeSimple" w={inner} />
        </Row>
        <Row fold={folds[3]} h={92}>
          <FieldRow icon="identificationCard" w={inner} />
        </Row>
        <Row fold={folds[4]} h={92}>
          <FieldRow icon="lockKey" w={inner} dots />
        </Row>
        <Row fold={folds[5]} h={84}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 14 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, border: "3px solid #C4C4C4" }} />
            <div style={{ width: inner * 0.6, height: 10, borderRadius: 5, background: "#D4D4D4" }} />
          </div>
          <div style={{ width: inner, height: 0 }} />
        </Row>
        {/* message content */}
        <div style={{ height: lerp(0, 110, morph), overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
          {dots ? (
            <div style={{ display: "flex", gap: 12, paddingLeft: 6 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 18, height: 18, borderRadius: 9, background: "#9A9A9A", translate: `0 ${(Math.sin(t * 12 - i * 1.1) * 6).toFixed(1)}px` }} />
              ))}
            </div>
          ) : null}
          {txt > 0 ? (
            <div
              style={{
                fontFamily: BODY,
                fontSize: 40,
                fontWeight: 600,
                lineHeight: 1.3,
                color: fly > 0.5 ? WA.text : C.ink,
                opacity: txt,
                whiteSpace: "normal",
                translate: `0 ${((1 - txt) * 20).toFixed(1)}px`,
              }}
            >
              {BUBBLE_TEXT}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ position: "absolute", inset: 0, clipPath: clip ? `circle(${clip.r.toFixed(1)}px at ${clip.cx}px ${clip.cy}px)` : undefined }}>
      {roomFold < 1 ? room : null}
      {roomFold < 0.02 ? formObj : null}
      {roomFold >= 0.02 ? formObj : null}
    </div>
  );
};
