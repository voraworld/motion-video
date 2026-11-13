import React from "react";
import { Img, staticFile } from "remotion";
import { BODY, C, WA } from "../design/tokens";
import assets from "../content/assets.json";
import { SH, SW } from "./SmartphoneHero";
import { WhatsAppMark } from "./Icon";
import { clamp01 } from "../motion/util";

/** WhatsApp-style chat, built from live elements (no screenshot). Logical size SW×SH. No timestamps. */
export const HEADER_Y = 56;
export const HEADER_H = 74;
export const INPUT_H = 66;

export const StatusBar: React.FC = () => (
  <>
    {/* dynamic island, redrawn over the live screen */}
    <div style={{ position: "absolute", left: 141, top: 12, width: 108, height: 32, borderRadius: 16, background: "#000" }} />
    <div style={{ position: "absolute", right: 22, top: 20, display: "flex", gap: 4, alignItems: "flex-end" }}>
      {[6, 9, 12, 15].map((h, i) => (
        <div key={i} style={{ width: 4, height: h, borderRadius: 1, background: WA.text }} />
      ))}
      <div style={{ width: 24, height: 12, borderRadius: 3, border: `1.5px solid ${WA.text}`, marginLeft: 6, padding: 1.5 }}>
        <div style={{ width: "80%", height: "100%", background: WA.text, borderRadius: 1 }} />
      </div>
    </div>
  </>
);

export const ChatHeader: React.FC<{ logoOpacity?: number }> = ({ logoOpacity = 1 }) => (
  <div style={{ position: "absolute", left: 0, top: HEADER_Y, width: SW, height: HEADER_H, background: WA.head, display: "flex", alignItems: "center" }}>
    <svg width={30} height={30} viewBox="0 0 24 24" style={{ marginLeft: 8 }}>
      <path d="M15 5 L8 12 L15 19" stroke={WA.text} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <div style={{ width: 46, height: 46, borderRadius: 23, background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 2 }}>
      <Img src={staticFile(assets.dhl_logo.src)} style={{ width: 38, height: (38 * assets.dhl_logo.h) / assets.dhl_logo.w, opacity: logoOpacity }} />
    </div>
    <div style={{ marginLeft: 12, fontFamily: BODY, color: WA.text }}>
      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>DHL Express Service Point</div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: WA.sub, lineHeight: 1.3 }}>JDC Cengkareng</div>
    </div>
  </div>
);

export const InputBar: React.FC<{ typed?: string; caret?: boolean; sendGlow?: number }> = ({ typed = "", caret = false, sendGlow = 0 }) => (
  <div style={{ position: "absolute", left: 10, right: 10, top: SH - INPUT_H - 18, height: 50, display: "flex", alignItems: "center", gap: 8 }}>
    <div
      style={{
        flex: 1,
        height: 48,
        borderRadius: 24,
        background: WA.in,
        display: "flex",
        alignItems: "center",
        paddingLeft: 18,
        fontFamily: BODY,
        fontSize: 16,
        color: typed ? WA.text : WA.sub,
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {typed || "Message"}
      {caret ? <span style={{ display: "inline-block", width: 2, height: 20, background: WA.green, marginLeft: 2 }} /> : null}
    </div>
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        background: WA.green,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: sendGlow ? `0 0 ${18 * sendGlow}px ${6 * sendGlow}px rgba(37,211,102,${0.6 * sendGlow})` : undefined,
      }}
    >
      <svg width={22} height={22} viewBox="0 0 24 24">
        <path d="M3 20 L21 12 L3 4 L5.5 12 Z" fill="#0B141A" />
      </svg>
    </div>
  </div>
);

export type Msg = { side: "out" | "in"; text?: string; rows?: { k: string; v: string; p: number }[]; h: number; p: number };

/** Messages stacked from the bottom; a newly arriving message pushes the others up as it grows. */
export const ChatBody: React.FC<{ msgs: Msg[]; hideFirst?: boolean }> = ({ msgs, hideFirst }) => {
  const bottom = SH - INPUT_H - 30;
  let y = bottom;
  const placed: { m: Msg; top: number; i: number }[] = [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    const grow = clamp01(m.p);
    if (grow <= 0) continue;
    y -= (m.h + 10) * grow;
    placed.push({ m, top: y, i });
  }
  return (
    <div style={{ position: "absolute", left: 0, top: HEADER_Y + HEADER_H, width: SW, height: SH - HEADER_Y - HEADER_H, background: WA.bg, overflow: "hidden" }}>
      {/* faint wallpaper dots */}
      <svg width={SW} height={SH} style={{ position: "absolute", left: 0, top: 0, opacity: 0.06 }}>
        {Array.from({ length: 90 }).map((_, i) => (
          <circle key={i} cx={(i * 47) % SW} cy={((i * 83) % 900) + 10} r={3 + (i % 3)} fill="#fff" />
        ))}
      </svg>
      {placed.map(({ m, top, i }) => {
        const p = clamp01(m.p);
        if (hideFirst && i === 0) return null;
        const out = m.side === "out";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: top - (HEADER_Y + HEADER_H),
              [out ? "right" : "left"]: 12,
              maxWidth: 300,
              minWidth: m.rows ? 300 : undefined,
              padding: m.rows ? "10px 12px" : "9px 13px",
              borderRadius: 14,
              [out ? "borderTopRightRadius" : "borderTopLeftRadius"]: 4,
              background: out ? WA.out : WA.in,
              color: WA.text,
              fontFamily: BODY,
              fontSize: 17,
              fontWeight: 500,
              lineHeight: 1.32,
              transformOrigin: out ? "100% 0%" : "0% 0%",
              transform: `perspective(600px) rotateX(${((1 - p) * 38).toFixed(2)}deg) scale(${(0.7 + 0.3 * p).toFixed(3)})`,
              opacity: clamp01(p * 2),
              boxShadow: "0 2px 3px rgba(0,0,0,0.25)",
            }}
          >
            {m.text}
            {m.rows?.map((r, j) => (
              <div
                key={j}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 34,
                  opacity: clamp01(r.p * 1.5),
                  translate: `${((1 - clamp01(r.p)) * 18).toFixed(1)}px 0`,
                  borderTop: j ? "1px solid rgba(255,255,255,0.1)" : undefined,
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: "0.08em", color: C.yellow, width: 56 }}>{r.k}</span>
                <span style={{ fontSize: 16 }}>{r.v}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

/** Start screen used in scene 03: contact header + "start your booking" prompt. */
export const StartScreen: React.FC<{ p: number; typed: string; caret: boolean; sendGlow?: number; children?: React.ReactNode }> = ({ p, typed, caret, sendGlow, children }) => (
  <div style={{ position: "absolute", inset: 0, background: WA.bg }}>
    <ChatHeader />
    <div style={{ position: "absolute", left: 0, width: SW, top: 300, display: "flex", flexDirection: "column", alignItems: "center", fontFamily: BODY }}>
      <div style={{ scale: `${(0.4 + 0.6 * p).toFixed(3)}`, opacity: clamp01(p * 2) }}>
        <WhatsAppMark size={118} disc={WA.green} />
      </div>
      <div style={{ marginTop: 26, fontSize: 25, fontWeight: 800, color: WA.text, opacity: clamp01(p * 2 - 0.6) }}>Start your booking</div>
      <div style={{ marginTop: 8, fontSize: 16, fontWeight: 500, color: WA.sub, opacity: clamp01(p * 2 - 0.9) }}>Tell us what you need to ship</div>
    </div>
    {children}
    <InputBar typed={typed} caret={caret} sendGlow={sendGlow} />
    <StatusBar />
  </div>
);
