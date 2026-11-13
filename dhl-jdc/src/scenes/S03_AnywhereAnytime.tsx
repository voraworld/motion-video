import React from "react";
import { C, display } from "../design/tokens";
import { E, clamp01, k, kk, lerp, p01, spr } from "../motion/util";
import { Icon } from "../components/Icon";
import { DepthLetters, MaskRise } from "../components/Kinetic";
import { LivingRibbon, Pt } from "../components/LivingRibbon";
import { SCREEN, SH, SW, SmartphoneHero, phoneH, screenPoint } from "../components/SmartphoneHero";
import { StartScreen } from "../components/BookingChat";
import { Tunnel } from "./S02_Solution";
import { S4_CORD_START } from "./S04_PromotionalRates";

/**
 * S03 · ANYWHERE. ANYTIME. (17.28 – 28.8 s, local time)
 * The phone emerges from the tunnel's vanishing point. HOME / WORK / ON THE GO travel past it on a curved
 * spatial track (a drum: items turn as they pass, nearer = larger and sharper), each tied to the phone by
 * the red route. Exit: the route runs into the screen, wraps the send button, the screen floods DHL yellow
 * and the camera pushes through the glass — the line becomes the price-tag cord of S04.
 */
export const PH3 = { x: 690, y: 1125, w: 420 };
const ITEMS = [
  { icon: "house" as const, label: "AT HOME" },
  { icon: "buildings" as const, label: "AT WORK" },
  { icon: "moped" as const, label: "ON THE GO" },
];
// carousel track (quadratic bezier) — slot -1 at the top, 0 in front, +1 below
const track = (u: number): { x: number; y: number; z: number } => {
  // u in [-1.6, 1.6]
  const s = (u + 1.6) / 3.2;
  const P0 = [330, 520];
  const P1 = [70, 1090];
  const P2 = [330, 1660];
  const x = (1 - s) * (1 - s) * P0[0] + 2 * (1 - s) * s * P1[0] + s * s * P2[0];
  const y = (1 - s) * (1 - s) * P0[1] + 2 * (1 - s) * s * P1[1] + s * s * P2[1];
  return { x: x + 40, y, z: 1 - Math.min(1, Math.abs(u)) * 0.55 };
};

const PUSH = { t0: 10.25, t1: 11.52, Z: 6.4 };

export const S03AnywhereAnytime: React.FC<{ t: number }> = ({ t }) => {
  // phone entrance from the vanishing point
  const enter = k(t, [0.05, 1.15], [0, 1], E.out);
  const settle = spr(t, 0.05, { freq: 1.1, damp: 0.8 });
  const rotZ = lerp(-26, -4, settle) * (1 - k(t, [9.6, 10.3], [0, 1], E.inOut));
  const pcx = lerp(540, PH3.x, enter);
  const pcy = lerp(900, PH3.y, enter);
  const pScale = lerp(0.12, 1, enter);
  const rotX = lerp(58, 0, enter);

  // carousel phase: active index moves 0 → 1 → 2 with the narration (home 1.45, work 2.15, go 2.75)
  const active = kk(t, [0.9, 1.4, 1.95, 2.25, 2.55, 2.85], [-1, 0, 0, 1, 1, 2], E.inOut);
  const carouselOut = k(t, [4.5, 5.2], [0, 1], E.in);
  const carouselIn = k(t, [0.8, 1.4], [0, 1], E.out);

  // the route ribbon from the front item into the screen
  const [sx, sy] = screenPoint(PH3.x, PH3.y, PH3.w, 0, 560);
  const front = track(0);
  const routePts: Pt[] = [
    [front.x + 120, front.y - 10],
    [front.x + 210, front.y + 70],
    [sx - 70, sy + 60],
    [sx + 10, sy],
  ];
  const routeDraw = k(t, [1.35, 1.9], [0, 1], E.out) * (1 - carouselOut);

  // typed message + push
  const msg = "Hi! I'd like to book a shipment";
  const typed = msg.slice(0, Math.floor(clamp01((t - 3.7) / 1.7) * msg.length));
  const caret = t > 3.5 && t < 9.9 && Math.floor(t * 2.4) % 2 === 0;
  const push = k(t, [PUSH.t0, PUSH.t1], [0, 1], E.in);
  const Z = lerp(1, PUSH.Z, push);
  const s = ((SCREEN.x1 - SCREEN.x0) * PH3.w) / SW;
  const scMid = screenPoint(PH3.x, PH3.y, PH3.w, SW / 2, SH / 2);
  const T = { x: (540 - scMid[0]) * push, y: (960 - scMid[1]) * push };
  // map a global point at full push back into the screen's logical coordinates (for the hand-off cord)
  const toLogical = (g: Pt): Pt => {
    const Pp = [scMid[0] + (g[0] - scMid[0] - (540 - scMid[0])) / PUSH.Z, scMid[1] + (g[1] - scMid[1] - (960 - scMid[1])) / PUSH.Z];
    const left = PH3.x - PH3.w / 2 + SCREEN.x0 * PH3.w;
    const top = PH3.y - phoneH(PH3.w) / 2 + SCREEN.y0 * phoneH(PH3.w);
    return [(Pp[0] - left) / s, (Pp[1] - top) / s];
  };
  const cordLogical = S4_CORD_START.map(toLogical);
  // in-screen red line: wraps the send button, then morphs into the cord
  const sendC: Pt = [366, SH - 66 - 18 + 25];
  const wrapPts: Pt[] = [
    [-20, 560],
    [150, 600],
    [300, 760],
    [sendC[0] - 50, sendC[1] - 10],
    [sendC[0], sendC[1] + 46],
    [sendC[0] + 44, sendC[1]],
  ];
  const inDraw = k(t, [9.7, 10.35], [0, 1], E.inOut);
  const toCord = k(t, [10.45, 11.35], [0, 1], E.inOut);
  // resample the wrap path to 6 points matching the cord (cord has 6 points)
  const inPts: Pt[] = wrapPts.map((p, i) => [lerp(p[0], cordLogical[i][0], toCord), lerp(p[1], cordLogical[i][1], toCord)]);
  const flood = k(t, [10.4, 11.0], [0, 1], E.inOut);

  const screen = (
    <StartScreen p={spr(t, 1.1, { freq: 1.6, damp: 0.6 })} typed={typed} caret={caret} sendGlow={kk(t, [9.9, 10.2, 10.6], [0, 1, 0])}>
      {null}
    </StartScreen>
  );
  const screenWithFlood = (
    <>
      {screen}
      {flood > 0 ? <div style={{ position: "absolute", inset: 0, background: C.yellow, opacity: flood }} /> : null}
      {inDraw > 0 ? (
        <LivingRibbon
          id="s3in"
          pts={inPts}
          width={lerp(9, 16 / (PUSH.Z * s), toCord)}
          to={inDraw}
          shadow={false}
          twist={(u) => 0.3 * Math.sin(u * 8 + t * 3)}
          taper={0.01}
        />
      ) : null}
    </>
  );

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {t < 1.0 ? <Tunnel t={t + 0.68} /> : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: `${scMid[0]}px ${scMid[1]}px`,
          translate: `${T.x.toFixed(1)}px ${T.y.toFixed(1)}px`,
          scale: `${Z}`,
        }}
      >
        {/* carousel (behind the phone) */}
        {carouselOut < 1
          ? ITEMS.map((it, i) => {
              const u = i - active;
              if (Math.abs(u) > 1.6) return null;
              const p = track(u);
              const turn = u * 52 + carouselOut * 90;
              const sc = (0.5 + 0.5 * p.z) * carouselIn;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: p.x,
                    top: p.y,
                    translate: "-50% -50%",
                    transform: `perspective(1200px) rotateY(${turn.toFixed(1)}deg) scale(${sc.toFixed(3)})`,
                    opacity: clamp01(p.z * 1.4 - 0.25) * (1 - carouselOut),
                    filter: Math.abs(u) > 0.3 ? `blur(${(Math.abs(u) * 3).toFixed(1)}px)` : undefined,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    zIndex: Math.round(p.z * 10),
                  }}
                >
                  {/* floor plane under the object: gives the vignette a place, not a badge */}
                  <div style={{ position: "relative", width: 260, height: 210, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                    <div
                      style={{
                        position: "absolute",
                        bottom: -8,
                        width: 250,
                        height: 60,
                        borderRadius: "50%",
                        background: "radial-gradient(closest-side, rgba(150,95,0,0.35), rgba(150,95,0,0))",
                      }}
                    />
                    <Icon name={it.icon} size={200} color={C.ink} />
                  </div>
                  <div style={{ ...display(62, { wdth: 80 }), color: i === Math.round(active) ? C.red : C.ink, marginTop: 14 }}>{it.label}</div>
                </div>
              );
            })
          : null}
        {routeDraw > 0 ? <LivingRibbon id="s3r" pts={routePts} width={26} to={routeDraw} twist={(u) => 0.9 * Math.sin(u * 5 - t * 2)} shadowOffset={18} /> : null}
        {/* phone */}
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${pcx}px ${pcy}px`, transform: `perspective(1600px) rotateX(${rotX.toFixed(2)}deg)` }}>
          <SmartphoneHero cx={pcx} cy={pcy} w={PH3.w * pScale} rotate={rotZ} screen={screenWithFlood} glow={1 - flood} />
        </div>
      </div>

      {/* headline, screen space (leaves as the camera pushes into the glass) */}
      {push < 0.6 ? (
        <div style={{ position: "absolute", left: 56, top: 168, opacity: 1 - k(t, [10.1, 10.5], [0, 1]) }}>
          <DepthLetters text="ANYWHERE." t={t} t0={0.85} style={{ ...display(150, { wdth: 70 }), color: C.ink }} />
          <DepthLetters text="ANYTIME." t={t} t0={1.3} style={{ ...display(150, { wdth: 70 }), color: C.red, marginTop: -4 }} />
        </div>
      ) : null}
      {t > 5.3 && push < 0.6 ? (
        <div style={{ position: "absolute", left: 56, top: 820, opacity: 1 - k(t, [10.0, 10.4], [0, 1]) }}>
          {[
            { txt: "START YOUR", col: C.ink, t0: 5.45 },
            { txt: "BOOKING VIA", col: C.ink, t0: 5.6 },
            { txt: "WHATSAPP.", col: C.red, t0: 5.75 },
          ].map((l) => (
            <MaskRise key={l.txt} p={p01(t, l.t0, l.t0 + 0.55)}>
              <div style={{ ...display(76, { wdth: 68 }), color: l.col, lineHeight: 1 }}>{l.txt}</div>
            </MaskRise>
          ))}
        </div>
      ) : null}
    </div>
  );
};
