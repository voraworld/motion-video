import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { C } from "./design/tokens";
import { FPS, scene } from "./motion/util";
import { PersistentHeader } from "./components/PersistentHeader";
import { PersistentFooter } from "./components/PersistentFooter";
import { S01PainPoint } from "./scenes/S01_PainPoint";
import { S02Solution } from "./scenes/S02_Solution";
import { S03AnywhereAnytime } from "./scenes/S03_AnywhereAnytime";
import { S04PromotionalRates, S4_PASS, s5Reveal } from "./scenes/S04_PromotionalRates";
import { S05NoRegistration, S5 } from "./scenes/S05_NoRegistration";
import { S06WhatsAppBooking } from "./scenes/S06_WhatsAppBooking";
import { S07WeHandleTheRest } from "./scenes/S07_WeHandleTheRest";
import { S08FinalCTA } from "./scenes/S08_FinalCTA";

/**
 * Master timeline. Scenes are mounted only inside their window and receive local time in seconds, so
 * hand-offs that overlap (eyelet passthrough, red-room fold) can be layered explicitly. Header and footer
 * sit outside every scene and never move with a scene camera.
 */
export const JDCCommercial: React.FC<{ audio?: boolean }> = ({ audio = true }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = (id: string) => scene(id).start;
  const end = (id: string) => scene(id).end;
  const live = (a: number, b: number) => t >= a && t < b;
  const s4local = t - s("S04");
  return (
    <AbsoluteFill style={{ background: C.yellow, overflow: "hidden" }}>
      {/* soft studio light on the yellow sweep */}
      <AbsoluteFill style={{ background: "radial-gradient(90% 55% at 50% 42%, rgba(255,226,102,0.55) 0%, rgba(255,204,0,0) 70%)" }} />
      {live(0, end("S01")) ? <S01PainPoint t={t} /> : null}
      {live(s("S02"), end("S02")) ? <S02Solution t={t - s("S02")} /> : null}
      {live(s("S03"), end("S03")) ? <S03AnywhereAnytime t={t - s("S03")} /> : null}
      {live(s("S04"), end("S04")) ? <S04PromotionalRates t={s4local} /> : null}
      {live(s("S06") - 1.44, end("S06")) ? <S06WhatsAppBooking t={t - s("S06")} /> : null}
      {live(s("S04") + S4_PASS.t0, s("S05") + S5.end) ? (
        <S05NoRegistration t={t - s("S05")} clip={t < s("S05") ? s5Reveal(s4local) : undefined} />
      ) : null}
      {live(s("S07"), end("S07")) ? <S07WeHandleTheRest t={t - s("S07")} /> : null}
      {live(s("S08"), end("S08") + 1) ? <S08FinalCTA t={t - s("S08")} /> : null}
      <PersistentHeader />
      <PersistentFooter />
      {audio ? <Audio src={staticFile("audio/mix.wav")} /> : null}
    </AbsoluteFill>
  );
};
