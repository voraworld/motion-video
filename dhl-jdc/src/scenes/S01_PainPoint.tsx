import React from "react";
import { C, display } from "../design/tokens";
import { E, clamp01, k, lerp, spr } from "../motion/util";
import { Asset, hFor } from "../components/Asset";
import { FLAP_DARK, FLAP_RED, FLAP_YELLOW, FlapRow } from "../components/Flap";

/**
 * S01 · THE PAIN POINT (0 – 7.68 s)
 * Frame 0 is already a departure board mid-flutter: GOT A / SHIPMENT / TO SEND? resolves in half a second
 * while a DHL parcel drops onto the floor. The board tightens to the top and a status board flips in, one
 * booking step per beat (LOGIN, PORTAL, BOOKING FORMS), each landing on red DELAYED. NOT IN THE MOOD? is
 * stamped across it on the accent. Two heartbeats in near-silence, then the frame turns over (flap wipe).
 */
export const S1 = { tighten: 2.3, status: [3.36, 4.32, 5.28], mood: 6.24 } as const;
export const S1_PARCEL = { x: 540, y: 1352, w: 520 };

const shake = (t: number) => {
  let x = 0;
  let y = 0;
  for (const [t0, amp] of [
    [0.95, 12],
    [S1.mood, 20],
  ] as const) {
    const d = t - t0;
    if (d >= 0 && d < 0.3) {
      const a = amp * Math.exp(-d * 13);
      x += a * Math.sin(d * 90 + t0);
      y += a * Math.cos(d * 75 + t0 * 3);
    }
  }
  return { x, y };
};

const ROWS = [
  { label: "LOGIN", t0: S1.status[0] },
  { label: "PORTAL", t0: S1.status[1] },
  { label: "BOOKING FORMS", t0: S1.status[2] },
];

export const S01PainPoint: React.FC<{ t: number }> = ({ t }) => {
  const sh = shake(t);
  const tighten = k(t, [S1.tighten, S1.tighten + 0.5], [0, 1], E.inOut);
  const parcel = spr(t, 0.45, { freq: 1.6, damp: 0.6 });
  const ph = hFor("dhl_box-closed-label-left", S1_PARCEL.w);
  const statusIn = k(t, [S1.tighten + 0.25, S1.tighten + 0.6], [0, 1], E.out);
  const mood = spr(t, S1.mood, { freq: 2.6, damp: 0.55 });
  const dim = k(t, [6.5, 7.0], [0, 1], E.inOut);

  return (
    <div style={{ position: "absolute", inset: 0, translate: `${sh.x.toFixed(1)}px ${sh.y.toFixed(1)}px` }}>
      {/* parcel drops in and stays (it carries into S02) */}
      {parcel > 0 ? (
        <>
          <div
            style={{
              position: "absolute",
              left: S1_PARCEL.x - S1_PARCEL.w * 0.42,
              width: S1_PARCEL.w * 0.84,
              top: S1_PARCEL.y + ph / 2 - 34,
              height: 64,
              borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(120,70,0,0.42), rgba(120,70,0,0))",
              opacity: clamp01(parcel),
            }}
          />
          <Asset name="dhl_box-closed-label-left" x={S1_PARCEL.x} y={lerp(-300, S1_PARCEL.y, parcel)} w={S1_PARCEL.w} rotate={lerp(-14, 0, parcel)} shadow />
        </>
      ) : null}

      {/* headline board: big at first, then tightens to the top */}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: 1080,
          top: lerp(205, 170, tighten),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          transformOrigin: "540px 0px",
          scale: `${lerp(1, 0.6, tighten)}`,
        }}
      >
        <FlapRow t={t} t0={-0.62} text="GOT A" cells={8} w={108} h={152} gap={8} st={FLAP_YELLOW} seed={1} />
        <FlapRow t={t} t0={-0.56} text="SHIPMENT" cells={8} w={108} h={152} gap={8} st={FLAP_DARK} seed={2} />
        <FlapRow t={t} t0={-0.5} text="TO SEND?" cells={8} w={108} h={152} gap={8} st={FLAP_DARK} seed={3} />
      </div>

      {/* status board */}
      {statusIn > 0 ? (
        <div style={{ position: "absolute", left: 76, top: 560, width: 928, opacity: statusIn, translate: `0 ${((1 - statusIn) * 30).toFixed(1)}px` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, padding: "0 4px" }}>
            <div style={{ ...display(30, { wdth: 100, wght: 800 }), color: C.ink, letterSpacing: "0.16em" }}>BOOKING STEP</div>
            <div style={{ ...display(30, { wdth: 100, wght: 800 }), color: C.ink, letterSpacing: "0.16em" }}>STATUS</div>
          </div>
          {ROWS.map((r, i) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <FlapRow t={t} t0={r.t0} text={r.label} cells={13} w={44} h={68} gap={4} st={FLAP_DARK} align="left" seed={10 + i} appear={r.t0 - 0.1} />
              <FlapRow t={t} t0={r.t0 + 0.25} text="DELAYED" cells={7} w={44} h={68} gap={4} st={FLAP_RED} seed={20 + i} appear={r.t0 - 0.1} />
            </div>
          ))}
        </div>
      ) : null}

      {/* NOT IN THE MOOD? stamped across the status board */}
      {mood > 0 ? (
        <div style={{ position: "absolute", left: 0, width: 1080, top: 760, display: "flex", justifyContent: "center", opacity: clamp01(mood * 4) }}>
          <div
            style={{
              ...display(132, { wdth: 70 }),
              color: C.white,
              background: C.red,
              padding: "20px 40px 8px",
              rotate: "-5deg",
              scale: `${lerp(1.5, 1, mood).toFixed(3)}`,
              boxShadow: "0 24px 40px rgba(90,0,0,0.35)",
            }}
          >
            NOT IN THE MOOD?
          </div>
        </div>
      ) : null}
      {/* heartbeat: everything sinks back while the room goes quiet */}
      {dim > 0 ? <div style={{ position: "absolute", inset: 0, background: C.yellow, opacity: dim * 0.35 }} /> : null}
    </div>
  );
};
