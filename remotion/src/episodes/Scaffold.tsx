import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { beatsOf, getEpisode } from "../data";
import { BrandFrame } from "../brand/BrandFrame";
import { FONT_MONO, ZONES } from "../brand/tokens";
import { Captions } from "../shared/Captions";
import { EndCard } from "../shared/EndCard";
import { Flash, Shake } from "../shared/Impact";
import { Slam } from "../shared/Slam";
import { SfxCue, SoundLayer } from "../shared/SoundLayer";
import { THEMES } from "./themes";

const LABEL: Record<string, string> = { hook: "HOOK", edu: "LEARN", stuck: "STUCK?", ugc: "UGC", cta: "CTA" };

/**
 * Timing scaffold for an episode that has no bespoke composition yet.
 * It plays the real script (kinetic on-screen text, captions, brand frame, SFX, end card) in the
 * episode's palette, so timing and copy can be reviewed. Replace it during production
 * with the episode's own world, motion and morph chain (register it in BESPOKE in Root.tsx).
 */
export const Scaffold: React.FC<{ id: string }> = ({ id }) => {
  const ep = getEpisode(id);
  const theme = THEMES[id];
  const beats = beatsOf(ep);
  const frame = useCurrentFrame();
  const cta = beats[beats.length - 1];
  const hits = [0, ...beats.filter((b) => b.type === "stuck" || b.type === "ugc").map((b) => b.from)];
  const sfx: SfxCue[] = [
    { at: 0, name: "boom", volume: 0.9 },
    ...beats.slice(1, -1).map((b) => ({ at: Math.max(0, b.from - 4), name: "whoosh", volume: 0.45 })),
    ...beats.filter((b) => b.type === "stuck").map((b) => ({ at: b.from, name: "glitch", volume: 0.7 })),
    { at: cta.from, name: "sonic-logo", volume: 0.8 },
  ];
  // The decorative sun drifts to a new spot on each beat.
  const spots = beats.map((b, i) => ({ at: b.from, x: [540, 300, 780, 420, 700, 540, 360, 720, 540][i % 9], y: [760, 640, 820, 700, 860, 720, 780, 660, 760][i % 9] }));
  const idx = Math.max(0, spots.findIndex((s, i) => frame >= s.at && (i === spots.length - 1 || frame < spots[i + 1].at)));
  const prev = spots[Math.max(0, idx - 1)];
  const cur = spots[idx];
  const k = interpolate(frame - cur.at, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const sx = interpolate(k, [0, 1], [prev.x, cur.x]);
  const sy = interpolate(k, [0, 1], [prev.y, cur.y]);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${theme.bg} 0%, ${theme.bg2} 100%)` }}>
      <Shake hits={hits}>
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            left: sx - 260,
            top: sy - 260,
            borderRadius: "50%",
            background: `radial-gradient(circle at 40% 40%, ${theme.morph}, ${theme.accent})`,
            opacity: 0.85,
          }}
        />
        {beats.slice(0, -1).map((b) => (
          <Sequence key={b.index} from={b.from} durationInFrames={b.to - b.from} name={`${b.type} · ${b.lines.join(" / ")}`}>
            <div style={{ position: "absolute", top: ZONES.contentTop + 40, left: ZONES.sideSafe, width: ZONES.rightRail - ZONES.sideSafe }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 26, letterSpacing: 4, color: theme.accent, marginBottom: 24, textAlign: "center" }}>
                {LABEL[b.type]}
              </div>
              <Slam lines={b.lines} color={theme.ink} accent={theme.accent} accentLine={b.lines.length - 1} size={b.type === "hook" ? 110 : 84} exitAt={b.to - b.from - 6} />
            </div>
          </Sequence>
        ))}
      </Shake>
      <Flash hits={hits} />
      <Sequence from={cta.from} name="End card">
        <EndCard cta={cta.lines} morphColor={theme.morph} origin={{ x: sx, y: sy, size: 520 }} />
      </Sequence>
      <Captions beats={beats} accent={theme.accent} ep={id.toLowerCase()} />
      <BrandFrame theme={theme.frame} endCardFrom={cta.from} />
      <div style={{ position: "absolute", left: ZONES.sideSafe, top: ZONES.contentTop - 20, fontFamily: FONT_MONO, fontSize: 20, color: theme.ink, opacity: 0.45 }}>
        {id} · DRAFT SCAFFOLD
      </div>
      <SoundLayer ep={id.toLowerCase()} sfx={sfx} />
    </AbsoluteFill>
  );
};
