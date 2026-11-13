import React from "react";
import { C, WA, display } from "../design/tokens";
import { E, clamp01, k, lerp, p01, spr } from "../motion/util";
import { Asset, hFor } from "../components/Asset";
import { MaskRise } from "../components/Kinetic";
import { LivingRibbon, Pt, mixPts } from "../components/LivingRibbon";
import { SmartphoneHero } from "../components/SmartphoneHero";
import { StatusBar } from "../components/BookingChat";
import { WhatsAppMark } from "../components/Icon";
import { PROJECT } from "../content/copy";

/**
 * S08 · FINAL CALL TO ACTION (74.88 – 86.4 s, local time)
 * Calmer. The flight trail arrives and closes into the loop it started as in scene 01 (the supplied loop
 * ribbon's gesture), wrapping one parcel and the phone: behind them on top, in front of them below.
 * READY TO SHIP? / ONE MESSAGE. WE HANDLE THE REST. The ribbon's energy ends in a flat red band that carries
 * the WhatsApp number. Final hit at 82.56 s: a light glint runs along the band. Then a long, still hold.
 */
export const S8_ARRIVE: Pt[] = [
  [-160, 330],
  [140, 430],
  [420, 560],
  [650, 690],
  [830, 840],
  [880, 1020],
  [720, 1150],
  [430, 1180],
];
const LOOP: Pt[] = [
  [1190, 470],
  [800, 455],
  [300, 545],
  [118, 820],
  [300, 1105],
  [770, 1112],
  [975, 870],
  [830, 610],
];
const HERO = { parcel: { x: 640, y: 845, w: 500 }, phone: { x: 330, y: 830, w: 228 } };
const HIT = 7.68; // 82.56 s
export const s8Twist = (s: number, t: number, toLoop = 0) => 1.1 * Math.sin(s * 7 - t * 0.9) * lerp(1.2, 1, toLoop);

export const S08FinalCTA: React.FC<{ t: number }> = ({ t }) => {
  const toLoop = k(t, [0, 1.3], [0, 1], E.inOut);
  const pts = mixPts(S8_ARRIVE, LOOP, toLoop);
  const twist = (s: number) => s8Twist(s, t, toLoop);
  const width = lerp(110, 96, toLoop);

  const parcelP = spr(t, 0.75, { freq: 1.3, damp: 0.72 });
  const phoneP = spr(t, 0.95, { freq: 1.3, damp: 0.72 });
  const ph = hFor("dhl_box-closed-label-right", HERO.parcel.w);
  const float = Math.sin(t * 1.6) * 7;

  const ready = p01(t, 0.25, 0.85);
  const tag1 = p01(t, 1.55, 2.05);
  const tag2 = p01(t, 1.75, 2.25);
  const wa = p01(t, 2.6, 3.1);
  const band = k(t, [2.85, 3.55], [0, 1], E.inOut);
  const groups = PROJECT.whatsappGroups.map((_, i) => spr(t, 3.25 + i * 0.12, { freq: 2.0, damp: 0.75 }));
  const sp = [p01(t, 3.9, 4.4), p01(t, 4.05, 4.6)];
  const glint = k(t, [HIT, HIT + 0.9], [0, 1], E.inOut);
  const pulse = 1 + 0.035 * Math.exp(-Math.max(0, t - HIT) * 4) * (t >= HIT ? 1 : 0);

  const phoneScreen = (
    <div style={{ position: "absolute", inset: 0, background: WA.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <WhatsAppMark size={150} disc={WA.green} />
      <StatusBar />
    </div>
  );

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 34% at 50% 44%, rgba(255,238,150,0.6), rgba(255,238,150,0))" }} />
      {/* loop: back half */}
      <LivingRibbon id="s8a" pts={pts} width={width} twist={twist} from={0} to={toLoop > 0.5 ? 0.5 : 1} />
      {/* hero objects */}
      <div
        style={{
          position: "absolute",
          left: HERO.parcel.x - HERO.parcel.w * 0.4,
          width: HERO.parcel.w * 0.8,
          top: HERO.parcel.y + ph / 2 - 30,
          height: 60,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(120,70,0,0.4), rgba(120,70,0,0))",
          opacity: clamp01(parcelP),
        }}
      />
      {parcelP > 0 ? (
        <Asset
          name="dhl_box-closed-label-right"
          x={HERO.parcel.x}
          y={lerp(HERO.parcel.y + 420, HERO.parcel.y, parcelP) + float}
          w={HERO.parcel.w}
          rotate={lerp(10, 0, parcelP)}
          opacity={clamp01(parcelP * 3)}
          shadow
        />
      ) : null}
      {phoneP > 0 ? (
        <SmartphoneHero
          cx={lerp(HERO.phone.x - 300, HERO.phone.x, phoneP)}
          cy={HERO.phone.y - float * 0.6}
          w={HERO.phone.w}
          rotate={lerp(-30, -9, phoneP)}
          screen={phoneScreen}
          glow={1}
          style={{ opacity: clamp01(phoneP * 3) }}
        />
      ) : null}
      {/* loop: front half */}
      {toLoop > 0.5 ? <LivingRibbon id="s8b" pts={pts} width={width} twist={twist} from={0.5} to={1} /> : null}

      {/* type */}
      <div style={{ position: "absolute", left: 0, width: 1080, top: 168, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <MaskRise p={ready}>
          <div style={{ ...display(150, { wdth: 70 }), color: C.ink }}>
            READY TO SHIP<span style={{ color: C.red }}>?</span>
          </div>
        </MaskRise>
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          <MaskRise p={tag1}>
            <div style={{ ...display(54, { wdth: 86, wght: 800 }), color: C.red, letterSpacing: "0.02em" }}>ONE MESSAGE.</div>
          </MaskRise>
          <MaskRise p={tag2}>
            <div style={{ ...display(54, { wdth: 86, wght: 800 }), color: C.ink, letterSpacing: "0.02em" }}>WE HANDLE THE REST.</div>
          </MaskRise>
        </div>
      </div>
      {/* CTA */}
      <div style={{ position: "absolute", left: 0, width: 1080, top: 1178, display: "flex", justifyContent: "center", alignItems: "center", gap: 16, opacity: wa, translate: `0 ${((1 - wa) * 24).toFixed(1)}px` }}>
        <WhatsAppMark size={70} disc={WA.green} />
        <div style={{ ...display(60, { wdth: 86 }), color: C.ink, letterSpacing: "0.02em" }}>{PROJECT.ctaLabel}</div>
      </div>
      {/* number band: flat end of the ribbon language, DHL speed-line cut ends */}
      <div style={{ position: "absolute", left: 0, width: 1080, top: 1262, height: 170, scale: `${pulse}`, transformOrigin: "540px 85px" }}>
        <svg width={1080} height={170} style={{ position: "absolute", left: 0, top: 0 }}>
          <defs>
            <linearGradient id="bandg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.redHi} />
              <stop offset="0.45" stopColor={C.red} />
              <stop offset="1" stopColor="#A9030E" />
            </linearGradient>
            <linearGradient id="glint" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity={0} />
              <stop offset="0.5" stopColor="#fff" stopOpacity={0.55} />
              <stop offset="1" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
            <clipPath id="bandclip">
              <path d={`M${540 - 500 * band + 30},10 L${540 + 500 * band + 10},10 L${540 + 500 * band - 30},160 L${540 - 500 * band - 10},160 Z`} />
            </clipPath>
          </defs>
          <g style={{ filter: "drop-shadow(0 18px 18px rgba(110,40,0,0.35))", opacity: band > 0.02 ? 1 : 0 }}>
            <path d={`M${540 - 500 * band + 30},10 L${540 + 500 * band + 10},10 L${540 + 500 * band - 30},160 L${540 - 500 * band - 10},160 Z`} fill="url(#bandg)" />
          </g>
          {glint > 0 && glint < 1 ? <rect x={-300 + glint * 1500} y={0} width={300} height={170} fill="url(#glint)" clipPath="url(#bandclip)" transform="skewX(-20)" /> : null}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 22 }}>
          {PROJECT.whatsappGroups.map((g, i) => (
            <MaskRise key={g} p={clamp01(groups[i])}>
              <div style={{ ...display(112, { wdth: 64 }), color: i === 0 ? C.yellow : C.white, translate: "0 6px" }}>{g}</div>
            </MaskRise>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, width: 1080, top: 1460, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <MaskRise p={sp[0]}>
          <div style={{ ...display(46, { wdth: 100, wght: 800 }), color: C.ink, letterSpacing: "0.06em" }}>{PROJECT.spLabel}</div>
        </MaskRise>
        <MaskRise p={sp[1]}>
          <div style={{ ...display(100, { wdth: 72, italic: true }), color: C.red }}>{PROJECT.spName}</div>
        </MaskRise>
      </div>
    </div>
  );
};
