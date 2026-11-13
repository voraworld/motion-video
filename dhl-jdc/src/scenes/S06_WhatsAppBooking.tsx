import React from "react";
import { C, WA, display } from "../design/tokens";
import { E, clamp01, k, kk, lerp, p01, spr } from "../motion/util";
import { ChatBody, ChatHeader, InputBar, Msg, StatusBar } from "../components/BookingChat";
import { Icon, WhatsAppMark } from "../components/Icon";
import { MaskRise } from "../components/Kinetic";
import { LivingRibbon } from "../components/LivingRibbon";
import { SH, SmartphoneHero, screenPoint } from "../components/SmartphoneHero";
import { PROJECT } from "../content/copy";

/**
 * S06 · ONE WHATSAPP MESSAGE (51.84 – 65.28 s, local time)
 * The bubble from S05 lands as the first message. The conversation builds with restrained, perspective
 * micro-springs; the camera leans in to the screen and back out. Then the phone recedes and the number
 * assembles above it, digit group by digit group, underlined by the ribbon — held, unobstructed, > 5 s.
 * Exit: the shipment details peel off the screen as three chips; the camera whips right into S07.
 */
export const PH6 = { x: 540, y: 1110, w: 450 };
const CTA_PH = { y: 1160, s: 0.8 };
const M1_LOGICAL = { cx: 238, cy: SH - 66 - 30 - 76 + 33, w: 300 };
const m1g = screenPoint(PH6.x, PH6.y, PH6.w, M1_LOGICAL.cx, M1_LOGICAL.cy);
export const S6_M1 = { cx: m1g[0], cy: m1g[1], w: M1_LOGICAL.w * ((0.893 - 0.058) * PH6.w) / 400 };
export const S6 = { m2: 1.9, card: 2.45, r1: 2.6, r2: 3.55, r3: 4.5, reply: 5.95, cta: 6.4, num: 6.75, whip: 12.95, end: 13.44 };
/** Chip positions (screen space) at the S06 → S07 hand-off. */
export const CHIPS = [
  { icon: "package" as const, label: "WHAT", y: 820 },
  { icon: "globeHemisphereWest" as const, label: "WHERE", y: 930 },
  { icon: "notePencil" as const, label: "NOTES", y: 1040 },
];
export const chipX = (i: number) => 250 + i * 70;

export const Chip: React.FC<{ icon: (typeof CHIPS)[number]["icon"]; label: string; scale?: number }> = ({ icon, label, scale = 1 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 24px 14px 18px",
      background: C.white,
      borderRadius: 40,
      boxShadow: "0 16px 26px rgba(110,70,0,0.3)",
      scale: `${scale}`,
    }}
  >
    <Icon name={icon} size={40} color={C.red} />
    <div style={{ ...display(38, { wdth: 100, wght: 800 }), color: C.ink, letterSpacing: "0.06em" }}>{label}</div>
  </div>
);

export const S06WhatsAppBooking: React.FC<{ t: number }> = ({ t }) => {
  const msgs: Msg[] = [
    { side: "out", text: "Hi! I'd like to arrange a shipment.", h: 66, p: 1 },
    { side: "out", text: "Here's what I need to send…", h: 44, p: spr(t, S6.m2, { freq: 2.2, damp: 0.8 }) },
    {
      side: "out",
      h: 126,
      p: spr(t, S6.card, { freq: 2.0, damp: 0.82 }),
      rows: [
        { icon: "package", k: "WHAT", v: "Product samples", p: p01(t, S6.r1, S6.r1 + 0.4) },
        { icon: "globeHemisphereWest", k: "TO", v: "Singapore", p: p01(t, S6.r2, S6.r2 + 0.4) },
        { icon: "notePencil", k: "NOTES", v: "Fragile items", p: p01(t, S6.r3, S6.r3 + 0.4) },
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

  // camera lean-in / pull-back, then the CTA re-composition
  const lean = kk(t, [1.6, 2.5, 5.1, 6.0], [1, 1.3, 1.3, 1], E.inOut);
  const cta = k(t, [S6.cta, S6.cta + 0.9], [0, 1], E.inOut);
  const pScale = lerp(1, CTA_PH.s, cta);
  const pY = lerp(PH6.y, CTA_PH.y, cta);
  const whip = k(t, [S6.whip, S6.end], [0, 1], E.in);

  const head = [spr(t, 0.3, { freq: 2.4, damp: 0.62 }), spr(t, 0.42, { freq: 2.4, damp: 0.62 }), spr(t, 0.56, { freq: 2.4, damp: 0.62 })];
  const headOut = k(t, [S6.cta - 0.1, S6.cta + 0.35], [0, 1], E.in);
  const sup = p01(t, 2.05, 2.6);

  const waRow = p01(t, S6.num - 0.1, S6.num + 0.4);
  const groups = PROJECT.whatsappGroups.map((_, i) => spr(t, S6.num + 0.15 + i * 0.13, { freq: 2.0, damp: 0.7 }));
  const under = k(t, [S6.num + 0.55, S6.num + 1.15], [0, 1], E.inOut);
  const numOut = whip;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, translate: `${(-whip * 1300).toFixed(1)}px 0`, filter: whip > 0.05 ? `blur(${(whip * 10).toFixed(1)}px)` : undefined }}>
        {/* phone */}
        <div style={{ position: "absolute", inset: 0, transformOrigin: "540px 1230px", scale: `${lean}` }}>
          <div style={{ position: "absolute", inset: 0, transformOrigin: `${PH6.x}px ${PH6.y}px`, translate: `0 ${pY - PH6.y}px`, scale: `${pScale}` }}>
            <SmartphoneHero cx={PH6.x} cy={PH6.y} w={PH6.w} screen={screen} glow={1} />
          </div>
        </div>
        {/* headline + support */}
        {headOut < 1 ? (
          <div style={{ position: "absolute", left: 0, width: 1080, top: 180, opacity: 1 - headOut, translate: `0 ${(-headOut * 80).toFixed(1)}px` }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 26, ...display(124, { wdth: 66 }) }}>
              <span style={{ color: C.ink, display: "inline-block", translate: `${((1 - head[0]) * -500).toFixed(1)}px 0`, opacity: clamp01(head[0] * 3) }}>JUST</span>
              <span style={{ color: C.red, display: "inline-block", translate: `0 ${((1 - head[1]) * -260).toFixed(1)}px`, opacity: clamp01(head[1] * 3) }}>MESSAGE</span>
              <span style={{ color: C.ink, display: "inline-block", translate: `${((1 - head[2]) * 500).toFixed(1)}px 0`, opacity: clamp01(head[2] * 3) }}>US.</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
              <MaskRise p={sup}>
                <div style={{ ...display(60, { wdth: 74, wght: 800 }), color: C.ink, letterSpacing: "0.01em" }}>
                  TELL US WHAT YOU NEED TO <span style={{ color: C.red }}>SHIP.</span>
                </div>
              </MaskRise>
            </div>
          </div>
        ) : null}
        {/* CTA: number */}
        {t > S6.num - 0.2 ? (
          <div style={{ position: "absolute", left: 0, width: 1080, top: 186, display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - numOut * 0.3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: waRow, translate: `0 ${((1 - waRow) * 30).toFixed(1)}px` }}>
              <WhatsAppMark size={92} disc={WA.green} />
              <div style={{ ...display(74, { wdth: 84 }), color: C.ink }}>{PROJECT.ctaLabel}</div>
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 30 }}>
              {PROJECT.whatsappGroups.map((g, i) => (
                <MaskRise key={g} p={clamp01(groups[i])}>
                  <div style={{ ...display(124, { wdth: 64 }), color: i === 0 ? C.red : C.ink, letterSpacing: "0.01em", scale: `${(1 + (1 - groups[i]) * 0.2).toFixed(3)}` }}>{g}</div>
                </MaskRise>
              ))}
            </div>
          </div>
        ) : null}
        {under > 0 ? (
          <LivingRibbon
            id="s6u"
            pts={[
              [90, 444],
              [330, 430],
              [560, 442],
              [790, 426],
              [995, 438],
            ]}
            width={24}
            to={under}
            twist={(s) => 0.6 * Math.sin(s * 8 + t * 2)}
            shadowOffset={16}
          />
        ) : null}
      </div>
      {/* chips peeling off the screen (screen space, they ride through the whip) */}
      {t > S6.whip - 0.6
        ? CHIPS.map((c, i) => {
            const p = k(t, [S6.whip - 0.6 + i * 0.08, S6.end], [0, 1], E.inOut);
            const start = screenPoint(PH6.x, CTA_PH.y, PH6.w * CTA_PH.s, 210, 700 + i * 34);
            const x = lerp(start[0], chipX(i), p);
            const y = lerp(start[1], c.y, p) - Math.sin(p * Math.PI) * 120;
            return (
              <div key={c.label} style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", opacity: clamp01(p * 4), rotate: `${(1 - p) * -12}deg` }}>
                <Chip icon={c.icon} label={c.label} scale={lerp(0.4, 1, p)} />
              </div>
            );
          })
        : null}
    </div>
  );
};
