import React from "react";
import { BODY, C, display } from "../design/tokens";
import { E, clamp01, k, lerp } from "../motion/util";
import { Asset, hFor } from "../components/Asset";
import { FLAP_DARK, FLAP_RED, FlapRow } from "../components/Flap";
import { BlurLine, BlurWords } from "../components/Type";

/**
 * S07 · WE HANDLE THE REST (53.76 – 61.44 s, local time)
 * One continuous camera through a logistics set. The three shipment details drop into the open parcel; a
 * strip of red tape sweeps over it and the flaps are shut (the open→closed render swap happens under that
 * occlusion). The parcel rides the roller conveyor into the inspection tunnel while the camera pulls back,
 * then tilts up to the cargo aircraft climbing away in its supplied (un-mirrored) orientation.
 * The status row flips 01 DETAILS IN → 02 PREPARING → 03 ARRANGED with the narration.
 */
type Pt = [number, number];
const XR = { x: 2000, y: 1150, w: 1100 };
const XR_H = hFor("dhl_xray-scanner", XR.w);
const img = (fx: number, fy: number): Pt => [XR.x + (fx - 0.5) * XR.w, XR.y + (fy - 0.5) * XR_H];
const BELT0 = img(0.07, 0.612);
const BELT1 = img(0.415, 0.556);
const BOX_W = 132;
const BOX_H = hFor("dhl_box-closed-label-right", BOX_W);
const PLANE_W = 1000;
const PLANE_A: Pt = [2950, 780];
const PLANE_B: Pt = [150, -40];
const PLANE_T: [number, number] = [3.7, 7.7];
const T7 = { tape: 1.05, swap: 1.22, ride: [1.5, 3.05] as [number, number], scan: 2.85, tilt: [3.3, 4.25] as [number, number] };
const CHIPS = ["WHAT", "WHERE", "NOTES"];
const SC: Pt = [540, 1180];

const planeAt = (t: number): Pt => {
  const p = k(t, PLANE_T, [0, 1], (x) => x * (0.8 + 0.2 * x));
  return [lerp(PLANE_A[0], PLANE_B[0], p), lerp(PLANE_A[1], PLANE_B[1], p) + Math.sin(p * Math.PI) * 40];
};
const camera = (t: number) => {
  const boxStart: Pt = [BELT0[0], BELT0[1] - BOX_H / 2 + 14];
  const st1 = { x: boxStart[0], y: boxStart[1], z: 2.9 };
  const st2 = { x: XR.x, y: XR.y + 20, z: 0.92 };
  const st3 = { x: 1900, y: 600, z: 0.6 };
  const a = k(t, [1.4, 2.9], [0, 1], E.inOut);
  const b = k(t, T7.tilt, [0, 1], E.inOut);
  return {
    x: lerp(lerp(st1.x, st2.x, a), st3.x, b),
    y: lerp(lerp(st1.y, st2.y, a), st3.y, b),
    z: Math.exp(lerp(lerp(Math.log(st1.z), Math.log(st2.z), a), Math.log(st3.z), b)),
  };
};

export const S07WeHandleTheRest: React.FC<{ t: number }> = ({ t }) => {
  const cam = camera(t);
  const W = (w: Pt): Pt => [SC[0] + (w[0] - cam.x) * cam.z, SC[1] + (w[1] - cam.y) * cam.z];
  const ride = k(t, T7.ride, [0, 1], E.inOut);
  const belt: Pt = [lerp(BELT0[0], BELT1[0], ride), lerp(BELT0[1], BELT1[1], ride)];
  const bx = W([belt[0], belt[1] - BOX_H / 2 + 14]);
  const closed = t >= T7.swap;
  const clipX = W([img(0.335, 0.5)[0] + 30, 0])[0];
  const xr = W([XR.x, XR.y]);
  const pl = W(planeAt(t));
  const scanP = k(t, [T7.scan, T7.scan + 0.7], [0, 1], E.inOut);
  const tunnelL = W(img(0.31, 0.27));
  const tunnelR = W(img(0.5, 0.585));
  const horizon = W([0, 1245])[1];

  const stage = t < 1.6 ? 0 : t < 3.6 ? 1 : 2;
  const rows = [
    { text: "01 DETAILS IN", t0: 0.35 },
    { text: "02 PREPARING", t0: 1.6 },
    { text: "03 ARRANGED", t0: 3.6 },
  ];
  const row = rows[stage];

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* floor */}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <linearGradient id="floor7" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F7C500" />
            <stop offset="1" stopColor="#EDBB00" />
          </linearGradient>
        </defs>
        <rect x={-2000} y={horizon} width={5080} height={Math.max(0, 1920 - horizon)} fill="url(#floor7)" />
        {Array.from({ length: 40 }).map((_, i) => {
          const a = W([i * 220 - 1800, 1245]);
          const bb: Pt = [a[0] + (a[0] - 540) * 1.6, 1920];
          if (Math.max(a[0], bb[0]) < -300 || Math.min(a[0], bb[0]) > 1380) return null;
          return <line key={i} x1={a[0]} y1={a[1]} x2={bb[0]} y2={bb[1]} stroke="rgba(150,100,0,0.16)" strokeWidth={3} />;
        })}
      </svg>
      <Asset name="dhl_xray-scanner" x={xr[0]} y={xr[1]} w={XR.w * cam.z} shadow />
      {scanP > 0 && scanP < 1 ? (
        <div style={{ position: "absolute", left: tunnelL[0], top: tunnelL[1], width: tunnelR[0] - tunnelL[0], height: tunnelR[1] - tunnelL[1], overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: `${scanP * 100}%`, height: 7 * cam.z, background: C.red, opacity: 0.9 }} />
        </div>
      ) : null}
      <div style={{ position: "absolute", inset: 0, clipPath: `polygon(0 0, ${clipX}px 0, ${clipX}px 1920px, 0 1920px)` }}>
        <div
          style={{
            position: "absolute",
            left: bx[0] - BOX_W * cam.z * 0.4,
            width: BOX_W * cam.z * 0.8,
            top: bx[1] + (BOX_H * cam.z) / 2 - 18 * cam.z,
            height: 30 * cam.z,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(90,60,0,0.4), rgba(90,60,0,0))",
          }}
        />
        {closed ? <Asset name="dhl_box-closed-label-right" x={bx[0]} y={bx[1]} w={BOX_W * cam.z} /> : <Asset name="dhl_box-open" x={bx[0]} y={bx[1] - 4 * cam.z} w={BOX_W * cam.z * 1.08} />}
      </div>
      {/* details drop into the parcel */}
      {t < 1.05
        ? CHIPS.map((c, i) => {
            const p = k(t, [0.15 + i * 0.12, 0.75 + i * 0.12], [0, 1], E.in);
            if (p >= 1) return null;
            const x = lerp(260 + i * 280, bx[0] + (i - 1) * 50, p);
            const y = lerp(820, bx[1] - BOX_H * cam.z * 0.3, p);
            return (
              <div key={c} style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", scale: `${lerp(1, 0.3, p)}`, rotate: `${(i - 1) * 6 + p * (i - 1) * 20}deg` }}>
                <div style={{ ...display(40, { wdth: 100, wght: 800 }), color: C.ink, background: C.white, padding: "16px 28px 12px", borderRadius: 40, letterSpacing: "0.08em", boxShadow: "0 14px 24px rgba(110,70,0,0.3)" }}>{c}</div>
              </div>
            );
          })
        : null}
      {/* red tape sweep: closes the parcel (render swap happens underneath) */}
      {t > T7.tape - 0.05 && t < T7.tape + 0.55 ? (
        <div
          style={{
            position: "absolute",
            left: -200,
            width: 1480,
            top: bx[1] - 110,
            height: 220,
            background: `linear-gradient(180deg, ${C.redHi}, ${C.red} 40%, #A9030E)`,
            rotate: "-8deg",
            transformOrigin: "0% 50%",
            scale: `${k(t, [T7.tape - 0.05, T7.swap], [0, 1], E.out).toFixed(3)} 1`,
            translate: `${(k(t, [T7.swap + 0.05, T7.tape + 0.55], [0, 1], E.in) * 1600).toFixed(1)}px 0`,
            boxShadow: "0 20px 30px rgba(110,30,0,0.3)",
          }}
        />
      ) : null}
      {t > PLANE_T[0] && pl[0] > -PLANE_W ? <Asset name="dhl_plane" x={pl[0]} y={pl[1]} w={PLANE_W * cam.z} rotate={-2} shadow /> : null}

      {/* type */}
      <div style={{ position: "absolute", left: 80, width: 920, top: 190 }}>
        <BlurWords text="WE HANDLE THE REST." t={t} t0={0.2} style={{ ...display(140, { wdth: 70 }), color: C.ink, lineHeight: 0.92 }} color={(i) => (i >= 2 ? C.red : undefined)} />
      </div>
      <div style={{ position: "absolute", left: 0, width: 1080, top: 460, display: "flex", justifyContent: "center" }}>
        <BlurLine t={t} t0={0.75}>
          <div style={{ fontFamily: BODY, fontSize: 34, fontWeight: 700, color: C.ink, textAlign: "center", lineHeight: 1.25 }}>
            From your first message
            <br />
            to shipment arrangements.
          </div>
        </BlurLine>
      </div>
      <div style={{ position: "absolute", left: 0, width: 1080, top: 590, display: "flex", justifyContent: "center", opacity: clamp01((t - 0.3) / 0.12) }}>
        <FlapRow
          t={t}
          t0={row.t0}
          text={row.text}
          from={stage > 0 ? rows[stage - 1].text : undefined}
          cells={13}
          w={56}
          h={84}
          gap={5}
          st={(i) => (i < 2 ? FLAP_RED : FLAP_DARK)}
          align="left"
          seed={70}
        />
      </div>
    </div>
  );
};
