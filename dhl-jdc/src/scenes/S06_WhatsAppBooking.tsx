import React from "react";
import { C, WA, display } from "../design/tokens";
import { E, k, kk, lerp, p01, spr } from "../motion/util";
import { ChatBody, ChatHeader, InputBar, Msg, StatusBar } from "../components/BookingChat";
import { WhatsAppMark } from "../components/Icon";
import { FLAP_YELLOW, FlapRow } from "../components/Flap";
import { BlurLine, BlurWords } from "../components/Type";
import { SH, SmartphoneHero, screenPoint } from "../components/SmartphoneHero";
import { PROJECT } from "../content/copy";

/**
 * S06 · ONE WHATSAPP MESSAGE (40.32 – 53.76 s, local time)
 * The bubble from S05 lands as the first message; the conversation builds with restrained perspective
 * springs while the camera leans in. Then the phone steps back and the number arrives on the board, cell by
 * cell, as the narrator reads it out. Held until the flap wipe at the end.
 */
export const PH6 = { x: 540, y: 1120, w: 440 };
const M1_LOGICAL = { cx: 238, cy: SH - 66 - 30 - 76 + 33, w: 300 };
const m1g = screenPoint(PH6.x, PH6.y, PH6.w, M1_LOGICAL.cx, M1_LOGICAL.cy);
export const S6_M1 = { cx: m1g[0], cy: m1g[1], w: (M1_LOGICAL.w * ((0.893 - 0.058) * PH6.w)) / 400 };
export const S6 = { m2: 1.55, card: 2.0, r1: 2.15, r2: 3.15, r3: 4.2, reply: 5.15, cta: 5.4, num: 5.76 };
const CTA_PH = { y: 1225, s: 0.74 };

export const S06WhatsAppBooking: React.FC<{ t: number }> = ({ t }) => {
  const msgs: Msg[] = [
    { side: "out", text: "Hi! I'd like to arrange a shipment.", h: 66, p: 1 },
    { side: "out", text: "Here's what I need to send…", h: 44, p: spr(t, S6.m2, { freq: 2.2, damp: 0.8 }) },
    {
      side: "out",
      h: 126,
      p: spr(t, S6.card, { freq: 2.0, damp: 0.82 }),
      rows: [
        { k: "WHAT", v: "Product samples", p: p01(t, S6.r1, S6.r1 + 0.4) },
        { k: "TO", v: "Singapore", p: p01(t, S6.r2, S6.r2 + 0.4) },
        { k: "NOTES", v: "Fragile items", p: p01(t, S6.r3, S6.r3 + 0.4) },
      ],
    },
    { side: "in", text: "Let's get your shipment arranged.", h: 66, p: spr(t, S6.reply, { freq: 2.0, damp: 0.8 }) },
  ];
  const screen = (
    <div style={{ position: "absolute", inset: 0, background: WA.bg }}>
      <ChatBody msgs={msgs} hideFirst={t < 0} />
      <ChatHeader />
      <InputBar />
      <StatusBar />
    </div>
  );
  const lean = kk(t, [1.3, 2.1, 4.5, 5.2], [1, 1.24, 1.24, 1], E.inOut);
  const cta = k(t, [S6.cta, S6.cta + 0.8], [0, 1], E.inOut);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "540px 1260px", scale: `${lean}` }}>
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${PH6.x}px ${PH6.y}px`, translate: `0 ${(lerp(PH6.y, CTA_PH.y, cta) - PH6.y).toFixed(1)}px`, scale: `${lerp(1, CTA_PH.s, cta)}` }}>
          <SmartphoneHero cx={PH6.x} cy={PH6.y} w={PH6.w} screen={screen} glow={1} />
        </div>
      </div>
      {/* chat beat */}
      <div style={{ position: "absolute", left: 30, width: 1020, top: 200 }}>
        <BlurWords text="JUST MESSAGE US." t={t} t0={0.35} out={S6.cta - 0.1} style={{ ...display(116, { wdth: 66 }), color: C.ink, flexWrap: "nowrap" }} color={(i) => (i === 1 ? C.red : undefined)} />
      </div>
      <div style={{ position: "absolute", left: 0, width: 1080, top: 352, display: "flex", justifyContent: "center" }}>
        <BlurLine t={t} t0={1.65} out={S6.cta - 0.05}>
          <div style={{ ...display(60, { wdth: 76, wght: 800 }), color: C.ink, letterSpacing: "0.01em" }}>TELL US WHAT YOU NEED TO SHIP.</div>
        </BlurLine>
      </div>
      {/* CTA beat: number on the board */}
      {t > S6.num - 0.2 ? (
        <div style={{ position: "absolute", left: 0, width: 1080, top: 205, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
          <BlurLine t={t} t0={S6.num - 0.1}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <WhatsAppMark size={78} disc={WA.green} />
              <div style={{ ...display(74, { wdth: 84 }), color: C.ink }}>{PROJECT.ctaLabel}</div>
            </div>
          </BlurLine>
          <FlapRow t={t} t0={S6.num + 0.15} text={PROJECT.whatsappDisplay} cells={17} w={50} h={80} gap={4} st={FLAP_YELLOW} seed={60} stagger={0.035} appear={S6.num + 0.05} />
        </div>
      ) : null}
    </div>
  );
};
