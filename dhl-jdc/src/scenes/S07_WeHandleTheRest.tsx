import React from "react";
import { C, display } from "../design/tokens";
import { E, clamp01, k, kk, lerp, p01, rnd } from "../motion/util";
import { Asset, hFor } from "../components/Asset";
import { MaskRise, Prism } from "../components/Kinetic";
import { LivingRibbon, Pt, mixPts } from "../components/LivingRibbon";
import { CHIPS, Chip, chipX } from "./S06_WhatsAppBooking";
import { S8_ARRIVE, s8Twist } from "./S08_FinalCTA";

/**
 * S07 · WE HANDLE THE REST (65.28 – 74.88 s, local time)
 * One continuous camera through a spatial logistics set. The shipment details drop into the open parcel;
 * a red tape-ribbon sweeps over it and the flaps are closed (the swap from open to closed render happens
 * under that occlusion). The parcel rides the roller conveyor into the inspection tunnel while the camera
 * pulls back and travels; then it tilts up to the cargo aircraft climbing away (in its supplied, un-mirrored
 * orientation), drawing a dimensional red trail that curls into the final scene.
 */
const XR = { x: 2000, y: 1150, w: 1100 };
const XR_H = hFor("dhl_xray-scanner", XR.w);
const img = (fx: number, fy: number): Pt => [XR.x + (fx - 0.5) * XR.w, XR.y + (fy - 0.5) * XR_H];
const BELT0 = img(0.07, 0.612);
const BELT1 = img(0.415, 0.556);
const BOX_W = 132;
const BOX_H = hFor("dhl_box-closed-label-right", BOX_W);
const PLANE_W = 1000;
const PLANE_H = hFor("dhl_plane", PLANE_W);
const PLANE_A: Pt = [2950, 760];
const PLANE_B: Pt = [120, -60];
const PLANE_T = [4.3, 9.1];

const T7 = { chips: 0, tape: 1.05, swap: 1.2, ride: [1.6, 3.7] as [number, number], scan: 3.45, tilt: [4.15, 5.4] as [number, number] };

const planeAt = (t: number): Pt => {
  const p = k(t, PLANE_T as [number, number], [0, 1], (x) => x * (0.8 + 0.2 * x));
  return [lerp(PLANE_A[0], PLANE_B[0], p), lerp(PLANE_A[1], PLANE_B[1], p) + Math.sin(p * Math.PI) * 40];
};
const tailAt = (t: number): Pt => {
  const c = planeAt(t);
  return [c[0] + 0.3 * PLANE_W, c[1] + 0.06 * PLANE_H];
};

/** Camera: focus point (world) shown at screen (540, 1130) with zoom Z. */
const camera = (t: number) => {
  const boxStart: Pt = [BELT0[0], BELT0[1] - BOX_H / 2 + 14];
  const st1 = { x: boxStart[0], y: boxStart[1], z: 3.0 };
  const st2 = { x: XR.x, y: XR.y + 20, z: 0.92 };
  const st3 = { x: 1900, y: 560, z: 0.6 };
  const a = k(t, [1.5, 3.1], [0, 1], E.inOut);
  const b = k(t, T7.tilt, [0, 1], E.inOut);
  const c = k(t, [7.4, 9.6], [0, 1], E.in);
  const x = lerp(lerp(st1.x, st2.x, a), st3.x, b) - c * 120;
  const y = lerp(lerp(st1.y, st2.y, a), st3.y, b) - c * 80;
  // zoom interpolated in log space (perceptually even)
  const z = Math.exp(lerp(lerp(Math.log(st1.z), Math.log(st2.z), a), Math.log(st3.z), b));
  return { x, y, z };
};
export const S7_SCREEN_C: Pt = [540, 1130];
const toScreen = (w: Pt, cam: { x: number; y: number; z: number }): Pt => [S7_SCREEN_C[0] + (w[0] - cam.x) * cam.z, S7_SCREEN_C[1] + (w[1] - cam.y) * cam.z];

export const S07WeHandleTheRest: React.FC<{ t: number }> = ({ t }) => {
  const cam = camera(t);
  const whipIn = 1 - k(t, [0, 0.42], [0, 1], E.out);

  // parcel position along the belt
  const ride = k(t, T7.ride, [0, 1], E.inOut);
  const belt: Pt = [lerp(BELT0[0], BELT1[0], ride), lerp(BELT0[1], BELT1[1], ride)];
  const boxC: Pt = [belt[0], belt[1] - BOX_H / 2 + 14];
  const closed = t >= T7.swap;
  const tunnelX = img(0.335, 0.5)[0];

  // headline assemble
  const lines = [
    { txt: "WE HANDLE", col: C.ink, y: 168 },
    { txt: "THE REST.", col: C.red, y: 300 },
  ];
  const stage = t < 2.0 ? 0 : t < 4.3 ? 1 : 2;
  const flip12 = k(t, [2.0, 2.45], [0, 1], E.inOut);
  const flip23 = k(t, [4.3, 4.75], [0, 1], E.inOut);
  const stageLabel = (n: string, l: string) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 18, justifyContent: "center" }}>
      <div style={{ ...display(92, { wdth: 70 }), color: C.red }}>{n}</div>
      <div style={{ ...display(62, { wdth: 80 }), color: C.ink }}>{l}</div>
    </div>
  );

  // trail (screen space), morphing into the S08 arrival curve at the end
  const trailPts: Pt[] = [];
  for (let i = 0; i < 8; i++) trailPts.push(toScreen(tailAt(t - i * 0.32), cam));
  trailPts.reverse(); // oldest → newest (head at the plane)
  const toArrive = k(t, [8.55, 9.6], [0, 1], E.inOut);
  const trail = mixPts(trailPts, S8_ARRIVE, toArrive);
  const trailOn = k(t, [PLANE_T[0] + 0.4, PLANE_T[0] + 1.4], [0, 1], E.out);

  const W = (w: Pt) => toScreen(w, cam);
  const worldFade = 1 - k(t, [8.4, 9.45], [0, 1], E.inOut);
  const xr = W([XR.x, XR.y]);
  const bx = W(boxC);
  const pl = W(planeAt(t));
  const scanP = k(t, [T7.scan, T7.scan + 0.8], [0, 1], E.inOut);
  const tunnelL = W(img(0.31, 0.27));
  const tunnelR = W(img(0.5, 0.585));
  const clipX = W([tunnelX + 30, 0])[0];

  return (
    <div style={{ position: "absolute", inset: 0 }}>
    <div style={{ position: "absolute", inset: 0, translate: `${(whipIn * 1300).toFixed(1)}px 0`, filter: whipIn > 0.05 ? `blur(${(whipIn * 10).toFixed(1)}px)` : undefined }}>
      {/* floor plane with receding seams (moves with the world → parallax against the screen-space type) */}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: worldFade }}>
        {(() => {
          const horizon = W([0, 1245])[1];
          const els: React.ReactNode[] = [
            <rect key="f" x={-2000} y={horizon} width={5080} height={Math.max(0, 1920 - horizon)} fill="url(#floor7)" />,
          ];
          for (let i = -10; i < 40; i++) {
            const wx = i * 220;
            const a = W([wx, 1245]);
            const b: Pt = [a[0] + (a[0] - 540) * 1.6, 1920];
            if (Math.max(a[0], b[0]) < -200 || Math.min(a[0], b[0]) > 1280) continue;
            els.push(<line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="rgba(150,100,0,0.16)" strokeWidth={3} />);
          }
          return (
            <>
              <defs>
                <linearGradient id="floor7" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#F7C500" />
                  <stop offset="1" stopColor="#EDBB00" />
                </linearGradient>
              </defs>
              {els}
            </>
          );
        })()}
      </svg>
      {/* inspection machine */}
      <Asset name="dhl_xray-scanner" x={xr[0]} y={xr[1]} w={XR.w * cam.z} shadow opacity={worldFade} />
      {/* scan beam inside the tunnel */}
      {scanP > 0 && scanP < 1 ? (
        <div
          style={{
            position: "absolute",
            left: tunnelL[0],
            top: tunnelL[1],
            width: tunnelR[0] - tunnelL[0],
            height: tunnelR[1] - tunnelL[1],
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", left: 0, right: 0, top: `${scanP * 100}%`, height: 8 * cam.z, background: C.red, boxShadow: `0 0 ${24 * cam.z}px ${8 * cam.z}px rgba(212,5,17,0.55)` }} />
        </div>
      ) : null}
      {/* parcel (open → closed under the tape sweep), clipped as it passes the curtains */}
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
        {closed ? (
          <Asset name="dhl_box-closed-label-right" x={bx[0]} y={bx[1]} w={BOX_W * cam.z} />
        ) : (
          <Asset name="dhl_box-open" x={bx[0]} y={bx[1] - 4 * cam.z} w={BOX_W * cam.z * 1.08} />
        )}
      </div>
      {/* tape-ribbon sweep (occludes the swap) */}
      {t > T7.tape - 0.05 && t < T7.tape + 0.75 ? (
        <LivingRibbon
          id="s7tape"
          pts={[
            [-200, bx[1] + 120],
            [200, bx[1] + 40],
            [540, bx[1] - 30],
            [880, bx[1] - 110],
            [1280, bx[1] - 200],
          ]}
          width={kk(t, [T7.tape, T7.swap, T7.tape + 0.7], [140, 330, 120])}
          from={k(t, [T7.tape + 0.15, T7.tape + 0.7], [0, 1], E.in)}
          to={k(t, [T7.tape - 0.05, T7.swap + 0.05], [0, 1], E.out)}
          twist={(s) => 0.5 * Math.sin(s * 6 + t * 6)}
        />
      ) : null}
      {/* aircraft + trail */}
      {t > PLANE_T[0] ? (
        <>
          {trailOn > 0 ? (
            <LivingRibbon id="s7trail" pts={trail} width={lerp(70 * cam.z * 1.6, 110, toArrive)} to={1} from={lerp(1 - trailOn, 0, toArrive)} twist={(s) => lerp(1.3 * Math.sin(s * 6 - t * 3), s8Twist(s, 0), toArrive)} />
          ) : null}
          {pl[0] > -PLANE_W ? <Asset name="dhl_plane" x={pl[0]} y={pl[1]} w={PLANE_W * cam.z} rotate={-2} shadow /> : null}
        </>
      ) : null}

      {/* type (screen space) */}
      {lines.map((l, li) => (
        <div key={l.txt} style={{ position: "absolute", left: 0, width: 1080, top: l.y, display: "flex", justifyContent: "center", opacity: 1 - k(t, [8.3, 8.8], [0, 1]) }}>
          {l.txt.split("").map((ch, i) => {
            const seed = li * 20 + i;
            const p = k(t, [0.15 + rnd(seed) * 0.35, 0.75 + rnd(seed) * 0.35], [0, 1], E.out);
            return (
              <span
                key={i}
                style={{
                  ...display(146, { wdth: 70 }),
                  color: l.col,
                  display: "inline-block",
                  whiteSpace: "pre",
                  translate: `${((1 - p) * (rnd(seed + 5) - 0.5) * 900).toFixed(1)}px ${((1 - p) * (rnd(seed + 9) - 0.5) * 700).toFixed(1)}px`,
                  rotate: `${((1 - p) * (rnd(seed + 13) - 0.5) * 120).toFixed(1)}deg`,
                  opacity: clamp01(p * 2.5),
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
      <div style={{ position: "absolute", left: 0, width: 1080, top: 438, display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - k(t, [8.3, 8.8], [0, 1]) }}>
        <MaskRise p={p01(t, 0.9, 1.4)}>
          <div style={{ ...display(48, { wdth: 86, wght: 800 }), color: C.ink, letterSpacing: "0.03em" }}>FROM YOUR FIRST MESSAGE</div>
        </MaskRise>
        <MaskRise p={p01(t, 1.05, 1.55)}>
          <div style={{ ...display(48, { wdth: 86, wght: 800 }), color: C.ink, letterSpacing: "0.03em" }}>TO SHIPMENT ARRANGEMENTS.</div>
        </MaskRise>
      </div>
      <div style={{ position: "absolute", left: 0, width: 1080, top: 584, opacity: p01(t, 0.25, 0.6) * (1 - k(t, [8.3, 8.8], [0, 1])) }}>
        <Prism
          x={stage === 0 ? 0 : stage === 1 ? flip12 : flip23}
          h={100}
          a={stage <= 1 ? stageLabel("01", "SHARE YOUR DETAILS") : stageLabel("02", "WE PREPARE")}
          b={stage === 0 || stage === 1 ? stageLabel("02", "WE PREPARE") : stageLabel("03", "WE ARRANGE")}
        />
      </div>
    </div>
      {/* chips drop into the open parcel */}
      {t < 1.1
        ? CHIPS.map((c, i) => {
            const p = k(t, [0.05 + i * 0.1, 0.7 + i * 0.1], [0, 1], E.in);
            if (p >= 1) return null;
            const target: Pt = [bx[0] + (i - 1) * 40, bx[1] - BOX_H * cam.z * 0.35];
            const x = lerp(chipX(i), target[0], p);
            const y = lerp(c.y, target[1], p) - Math.sin(p * Math.PI) * 160;
            return (
              <div key={c.label} style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", rotate: `${p * (i - 1) * 25}deg` }}>
                <Chip icon={c.icon} label={c.label} scale={lerp(1, 0.25, p)} />
              </div>
            );
          })
        : null}
    </div>
  );
};
