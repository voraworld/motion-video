import React from "react";
import { C, display } from "../design/tokens";
import { E, k, lerp } from "../motion/util";
import { Asset, hFor } from "../components/Asset";
import { FLAP_RED, FLAP_YELLOW, FlapRow } from "../components/Flap";
import { BlurLine, BlurWords } from "../components/Type";
import { PROJECT } from "../content/copy";

/**
 * S02 · THE SOLUTION REVEAL (7.68 – 15.36 s, local time)
 * Revealed by the flap wipe: a clean yellow floor, the parcel now the hero. THERE'S AN EASIER WAY. arrives
 * word by word out of blur. Then the board announces the service point, letter by letter, and a red row
 * flips A SIMPLER WAY → TO GET STARTED with the narration. Exit: a vertical whip up into S03.
 */
export const S02Solution: React.FC<{ t: number }> = ({ t }) => {
  const settle = k(t, [0, 0.9], [0, 1], E.out);
  const pw = 640;
  const ph = hFor("dhl_box-closed-label-left", pw);
  const py = 1215;
  const whip = k(t, [7.38, 7.68], [0, 1], E.in);
  const nameRow = t < 5.55 ? { text: "A SIMPLER WAY", from: undefined, t0: 4.35 } : { text: "TO GET STARTED", from: "A SIMPLER WAY", t0: 5.55 };

  return (
    <div style={{ position: "absolute", inset: 0, translate: `0 ${(-whip * 1500).toFixed(1)}px`, filter: whip > 0.02 ? `blur(${(whip * 18).toFixed(1)}px)` : undefined }}>
      {/* parcel hero */}
      <div
        style={{
          position: "absolute",
          left: 540 - pw * 0.42,
          width: pw * 0.84,
          top: py + ph / 2 - 40,
          height: 76,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(120,70,0,0.42), rgba(120,70,0,0))",
        }}
      />
      <Asset name="dhl_box-closed-label-left" x={540} y={py} w={pw * lerp(1.04, 1, settle)} shadow />

      {/* THERE'S AN EASIER WAY. */}
      <div style={{ position: "absolute", left: 80, width: 920, top: 215 }}>
        <BlurWords
          text="THERE'S AN EASIER WAY."
          t={t}
          t0={0.45}
          out={2.45}
          style={{ ...display(158, { wdth: 70 }), color: C.ink, lineHeight: 0.92 }}
          color={(i) => (i >= 2 ? C.red : undefined)}
        />
      </div>

      {/* the board announces the service point */}
      {t > 2.55 ? (
        <div style={{ position: "absolute", left: 0, width: 1080, top: 205, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <BlurLine t={t} t0={2.65}>
            <div style={{ ...display(40, { wdth: 100, wght: 800 }), color: C.ink, letterSpacing: "0.14em" }}>{PROJECT.spLabel}</div>
          </BlurLine>
          <FlapRow t={t} t0={2.8} text={PROJECT.spName} cells={14} w={60} h={92} gap={5} st={FLAP_YELLOW} seed={40} />
          <div style={{ height: 8 }} />
          <FlapRow t={t} t0={nameRow.t0} text={nameRow.text} from={nameRow.from} cells={14} w={52} h={78} gap={5} st={FLAP_RED} seed={41} appear={4.3} />
        </div>
      ) : null}
    </div>
  );
};
