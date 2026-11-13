import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { C } from "./design/tokens";
import { FPS, barPulse, beatPulse, energy, heartPulse, hitPulse, k, scene } from "./motion/util";
import { PersistentHeader } from "./components/PersistentHeader";
import { PersistentFooter } from "./components/PersistentFooter";
import { FlapWipe } from "./components/Flap";
import { S01PainPoint } from "./scenes/S01_PainPoint";
import { S02Solution } from "./scenes/S02_Solution";
import { S03AnywhereAnytime } from "./scenes/S03_AnywhereAnytime";
import { S04PromotionalRates } from "./scenes/S04_PromotionalRates";
import { S05NoRegistration, S5 } from "./scenes/S05_NoRegistration";
import { S06WhatsAppBooking } from "./scenes/S06_WhatsAppBooking";
import { S07WeHandleTheRest } from "./scenes/S07_WeHandleTheRest";
import { S08FinalCTA } from "./scenes/S08_FinalCTA";

/** Flap-wipe seams (global seconds); each is centred on the scene cut so the board is full at the cut. */
export const WIPES = [
  { t0: 7.2, t1: 8.16, pattern: "rows" as const },
  { t0: 53.28, t1: 54.24, pattern: "diag" as const },
  { t0: 60.96, t1: 61.92, pattern: "center" as const },
];

/**
 * Master timeline. Scenes mount only inside their window and receive local time in seconds.
 * Seams: flap wipe (S1→2, S6→7, S7→8), whip (S2→3), zoom through the avatar (S3→4), colour flood (S4→5),
 * fold-up + carry (S5→6). Header and footer sit outside every scene camera.
 */
export const JDCCommercial: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = (id: string) => scene(id).start;
  const end = (id: string) => scene(id).end;
  const live = (a: number, b: number) => t >= a && t < b;
  const e = energy(t);
  const pump = 1 + 0.008 * e * beatPulse(t) + 0.014 * e * barPulse(t) + 0.03 * heartPulse(t);
  return (
    <AbsoluteFill style={{ background: C.yellow, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(90% 55% at 50% 42%, rgba(255,226,102,0.55) 0%, rgba(255,204,0,0) 70%)" }} />
      <AbsoluteFill style={{ transformOrigin: "540px 900px", scale: `${pump.toFixed(4)}` }}>
        {live(0, end("S01")) ? <S01PainPoint t={t} /> : null}
        {live(s("S02"), end("S02")) ? <S02Solution t={t - s("S02")} /> : null}
        {live(s("S03"), end("S03")) ? <S03AnywhereAnytime t={t - s("S03")} /> : null}
        {live(s("S04"), end("S04")) ? <S04PromotionalRates t={t - s("S04")} /> : null}
        {live(s("S05") + S5.exit - 0.3, end("S06")) ? <S06WhatsAppBooking t={t - s("S06")} /> : null}
        {live(s("S05"), s("S05") + S5.end) ? <S05NoRegistration t={t - s("S05")} /> : null}
        {live(s("S07"), end("S07")) ? <S07WeHandleTheRest t={t - s("S07")} /> : null}
        {live(s("S08"), end("S08") + 1) ? <S08FinalCTA t={t - s("S08")} /> : null}
      </AbsoluteFill>
      {heartPulse(t) > 0.01 ? (
        <AbsoluteFill style={{ background: "radial-gradient(75% 55% at 50% 47%, rgba(0,0,0,0) 40%, rgba(70,30,0,0.55) 100%)", opacity: heartPulse(t) * 0.8 }} />
      ) : null}
      {WIPES.map((w, i) => (live(w.t0, w.t1) ? <FlapWipe key={i} p={k(t, [w.t0, w.t1], [0, 1], (x) => x)} pattern={w.pattern} /> : null))}
      <PersistentHeader />
      <PersistentFooter />
      {hitPulse(t) > 0.02 ? <AbsoluteFill style={{ background: "#FFFFFF", opacity: hitPulse(t) * 0.18 }} /> : null}
      {audio ? <Audio src={staticFile("audio/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};
