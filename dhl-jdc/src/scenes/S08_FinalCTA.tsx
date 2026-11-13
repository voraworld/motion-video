import React from "react";
import { BODY, C, WA, display } from "../design/tokens";
import { clamp01, lerp, spr } from "../motion/util";
import { Asset, hFor } from "../components/Asset";
import { FLAP_RED, FLAP_YELLOW, FlapRow } from "../components/Flap";
import { BlurLine, BlurWords } from "../components/Type";
import { SmartphoneHero } from "../components/SmartphoneHero";
import { StatusBar } from "../components/BookingChat";
import { WhatsAppMark } from "../components/Icon";
import { PROJECT } from "../content/copy";

/**
 * S08 · FINAL CALL TO ACTION (61.44 – 76.8 s, local time)
 * Calmer, built as a departures board for one passenger: your shipment. READY TO SHIP? lands per word, the
 * parcel and phone set down, the number and the service point arrive on the board, then the address with
 * the narrator. Button hit at 74.88 s: every board row re-rolls once and lands again. Then a still hold.
 */
const HIT = 13.44;
export const S08FinalCTA: React.FC<{ t: number }> = ({ t }) => {
  const parcelP = spr(t, 0.7, { freq: 1.3, damp: 0.75 });
  const phoneP = spr(t, 0.9, { freq: 1.3, damp: 0.75 });
  const pw = 440;
  const ph = hFor("dhl_box-closed-label-right", pw);
  const reroll = t >= HIT; // re-roll every row once on the button hit
  const rr = (t0: number) => (reroll ? HIT : t0);
  const phoneScreen = (
    <div style={{ position: "absolute", inset: 0, background: WA.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <WhatsAppMark size={150} disc={WA.green} />
      <StatusBar />
    </div>
  );

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(55% 26% at 50% 37%, rgba(255,238,150,0.7), rgba(255,238,150,0))" }} />
      <div style={{ position: "absolute", left: 140, width: 800, top: 168 }}>
        <BlurWords text="READY TO SHIP?" t={t} t0={0.25} style={{ ...display(150, { wdth: 70 }), color: C.ink, lineHeight: 0.9 }} color={(i) => (i === 2 ? C.red : undefined)} />
      </div>
      <div style={{ position: "absolute", left: 0, width: 1080, top: 472, display: "flex", justifyContent: "center" }}>
        <BlurLine t={t} t0={1.5}>
          <div style={{ ...display(52, { wdth: 86, wght: 800 }), color: C.ink, letterSpacing: "0.02em" }}>
            <span style={{ color: C.red }}>ONE MESSAGE.</span> WE HANDLE THE REST.
          </div>
        </BlurLine>
      </div>
      {/* hero */}
      <div
        style={{
          position: "absolute",
          left: 620 - pw * 0.42,
          width: pw * 0.84,
          top: 800 + ph / 2 - 30,
          height: 60,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(120,70,0,0.4), rgba(120,70,0,0))",
          opacity: clamp01(parcelP),
        }}
      />
      {parcelP > 0 ? <Asset name="dhl_box-closed-label-right" x={620} y={lerp(1140, 800, parcelP)} w={pw} opacity={clamp01(parcelP * 3)} shadow /> : null}
      {phoneP > 0 ? (
        <SmartphoneHero cx={lerp(120, 360, phoneP)} cy={790} w={200} rotate={lerp(-24, -9, phoneP)} screen={phoneScreen} glow={1} style={{ opacity: clamp01(phoneP * 3) }} />
      ) : null}
      {/* board */}
      <div style={{ position: "absolute", left: 0, width: 1080, top: 1060, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <BlurLine t={t} t0={2.4}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <WhatsAppMark size={60} disc={WA.green} />
            <div style={{ ...display(56, { wdth: 86 }), color: C.ink }}>{PROJECT.ctaLabel}</div>
          </div>
        </BlurLine>
        <FlapRow t={t} t0={rr(2.6)} text={PROJECT.whatsappDisplay} from={reroll ? PROJECT.whatsappDisplay.replace(/[0-9]/g, "0") : undefined} cells={17} w={50} h={80} gap={4} st={FLAP_YELLOW} seed={80} stagger={0.03} appear={2.5} />
        <div style={{ height: 14 }} />
        <BlurLine t={t} t0={3.6}>
          <div style={{ ...display(38, { wdth: 100, wght: 800 }), color: C.ink, letterSpacing: "0.14em" }}>{PROJECT.spLabel}</div>
        </BlurLine>
        <FlapRow t={t} t0={rr(3.75)} text={PROJECT.spName} from={reroll ? "AAA AAAAAAAAAA" : undefined} cells={14} w={54} h={82} gap={5} st={FLAP_RED} seed={81} appear={3.7} />
      </div>
      {/* address with the narrator */}
      <div style={{ position: "absolute", left: 0, width: 1080, top: 1520, display: "flex", justifyContent: "center" }}>
        <BlurLine t={t} t0={7.75}>
          <div style={{ fontFamily: BODY, fontSize: 34, fontWeight: 700, color: C.ink, textAlign: "center", lineHeight: 1.3 }}>
            {PROJECT.address1}
            <br />
            <span style={{ fontWeight: 600 }}>{PROJECT.address2}</span>
          </div>
        </BlurLine>
      </div>
    </div>
  );
};
