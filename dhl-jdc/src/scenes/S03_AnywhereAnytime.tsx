import React from "react";
import { C, WA, display } from "../design/tokens";
import { E, clamp01, k, lerp, spr } from "../motion/util";
import { FLAP_DARK, FLAP_RED, FlapRow } from "../components/Flap";
import { BlurWords } from "../components/Type";
import { SmartphoneHero, screenPoint } from "../components/SmartphoneHero";
import { ChatBody, ChatHeader, InputBar, StartScreen, StatusBar } from "../components/BookingChat";

/**
 * S03 · ANYWHERE. ANYTIME. (15.36 – 23.04 s, local time)
 * Lands from the whip (blurred, sharpening). One board row answers the narration: FROM HOME → FROM WORK →
 * ON THE GO → VIA WHATSAPP. The phone does the work: the message is typed and sent. Exit: the camera tracks
 * to the DHL avatar in the chat header and dives into it; its yellow becomes the next frame.
 */
export const PH3 = { x: 540, y: 1165, w: 420 };
const AV = screenPoint(PH3.x, PH3.y, PH3.w, 63, 79); // a point on the yellow avatar disc (off the logo)
const SEG = [
  { t0: 0.75, text: "FROM HOME" },
  { t0: 1.45, text: "FROM WORK" },
  { t0: 2.1, text: "ON THE GO" },
  { t0: 3.3, text: "VIA WHATSAPP" },
];

const Letters: React.FC<{ text: string; t: number; t0: number; out: number; style: React.CSSProperties }> = ({ text, t, t0, out, style }) => (
  <div style={{ display: "flex", justifyContent: "center", ...style }}>
    {text.split("").map((ch, i) => {
      const p = k(t, [t0 + i * 0.035, t0 + i * 0.035 + 0.22], [0, 1], E.out);
      const q = k(t, [out + i * 0.012, out + i * 0.012 + 0.16], [0, 1], E.in);
      const v = p * (1 - q);
      return (
        <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: clamp01(0.0 + v), filter: v < 0.99 ? `blur(${((1 - v) * 8).toFixed(1)}px)` : undefined, translate: `0 ${((1 - p) * 18).toFixed(1)}px` }}>
          {ch}
        </span>
      );
    })}
  </div>
);

export const S03AnywhereAnytime: React.FC<{ t: number }> = ({ t }) => {
  const land = k(t, [0, 0.38], [0, 1], E.out);
  // zoom-through: track to the avatar (6.5–7.05), then dive (7.05–7.68)
  const track = k(t, [6.5, 7.05], [0, 1], E.inOut);
  const dive = k(t, [7.05, 7.68], [0, 1], (x) => x * x * x);
  const Z = lerp(1, 2.4, track) * lerp(1, 70, dive);
  const T = { x: (540 - AV[0]) * track, y: (900 - AV[1]) * track };

  const seg = [...SEG].reverse().find((s) => t >= s.t0) ?? SEG[0];
  const segI = SEG.indexOf(seg);
  const prev = segI > 0 ? SEG[segI - 1].text : undefined;

  const msg = "Hi! I'd like to book a shipment";
  const typed = t < 5.45 ? msg.slice(0, Math.floor(clamp01((t - 3.7) / 1.4) * msg.length)) : "";
  const sent = t >= 5.45;
  const screen = sent ? (
    <div style={{ position: "absolute", inset: 0, background: WA.bg }}>
      <ChatBody msgs={[{ side: "out", text: msg, h: 44, p: spr(t, 5.45, { freq: 2.2, damp: 0.8 }) }]} />
      <ChatHeader logoOpacity={1 - k(t, [6.35, 6.6], [0, 1])} />
      <InputBar />
      <StatusBar />
    </div>
  ) : (
    <StartScreen p={spr(t, 0.5, { freq: 1.6, damp: 0.7 })} typed={typed} caret={t > 3.5 && Math.floor(t * 2.4) % 2 === 0} sendGlow={k(t, [5.1, 5.4], [0, 1])} />
  );

  return (
    <div style={{ position: "absolute", inset: 0, translate: `0 ${((1 - land) * 700).toFixed(1)}px`, filter: land < 0.98 ? `blur(${((1 - land) * 18).toFixed(1)}px)` : undefined }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: `${AV[0]}px ${AV[1]}px`, translate: `${T.x.toFixed(1)}px ${T.y.toFixed(1)}px`, scale: `${Z.toFixed(4)}` }}>
        <SmartphoneHero cx={PH3.x} cy={PH3.y} w={PH3.w} screen={screen} glow={1} />
      </div>
      {track < 0.6 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - k(t, [6.5, 6.8], [0, 1]) }}>
          {t < 3.5 ? (
            <div style={{ position: "absolute", left: 0, width: 1080, top: 168 }}>
              <Letters text="ANYWHERE." t={t} t0={0.25} out={3.1} style={{ ...display(150, { wdth: 70 }), color: C.ink }} />
              <Letters text="ANYTIME." t={t} t0={0.5} out={3.15} style={{ ...display(150, { wdth: 70 }), color: C.red, marginTop: -6 }} />
            </div>
          ) : (
            <div style={{ position: "absolute", left: 80, width: 920, top: 205 }}>
              <BlurWords text="START YOUR BOOKING" t={t} t0={3.3} style={{ ...display(108, { wdth: 70 }), color: C.ink, lineHeight: 0.95 }} />
            </div>
          )}
          <div style={{ position: "absolute", left: 0, width: 1080, top: 470, display: "flex", justifyContent: "center" }}>
            <FlapRow t={t} t0={seg.t0} text={seg.text} from={prev} cells={12} w={66} h={98} gap={6} st={segI === 3 ? FLAP_RED : FLAP_DARK} seed={50} appear={0.7} />
          </div>
        </div>
      ) : null}
    </div>
  );
};
