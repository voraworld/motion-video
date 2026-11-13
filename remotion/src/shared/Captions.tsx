import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Beat, MANIFEST, sec } from "../data";
import { BRAND, FONT_BODY, ZONES } from "../brand/tokens";

type Chunk = { from: number; to: number; words: { text: string; at: number }[] };

/**
 * Splits each beat's voice-over into chunks of up to `maxWords` words and spreads them over the time the
 * VO line actually lasts (per-beat durations from scripts/vo.mjs), or over the beat when no VO exists yet.
 * For word-exact highlights, swap in transcription timings (remotion-captions skill).
 */
export const buildChunks = (beats: Beat[], maxWords = 4, voDurations?: (number | undefined)[]): Chunk[] => {
  const chunks: Chunk[] = [];
  for (const b of beats) {
    const words = b.vo.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const vd = voDurations?.[b.index];
    const span = vd ? Math.min(sec(vd), b.to - b.from - 2) : b.to - b.from - 4;
    const per = span / words.length;
    for (let i = 0; i < words.length; i += maxWords) {
      const slice = words.slice(i, i + maxWords);
      const start = b.from + Math.round(i * per);
      chunks.push({
        from: start,
        to: b.from + Math.round(Math.min(words.length, i + maxWords) * per),
        words: slice.map((text, j) => ({ text, at: start + Math.round(j * per) })),
      });
    }
  }
  return chunks;
};

export const Captions: React.FC<{ beats: Beat[]; accent?: string; ep?: string }> = ({ beats, accent = BRAND.orange, ep }) => {
  const frame = useCurrentFrame();
  const vo = ep ? MANIFEST.voBeats?.[ep] : undefined;
  const durations = vo ? beats.map((b) => vo.find((v) => sec(v.start) === b.from)?.duration) : undefined;
  const chunk = buildChunks(beats, 4, durations).find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  const pop = interpolate(frame - chunk.from, [0, 4], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: ZONES.sideSafe,
          right: 1080 - ZONES.rightRail,
          bottom: 1920 - ZONES.captionsBottom,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            scale: String(pop),
            padding: "12px 24px",
            borderRadius: 18,
            background: "rgba(20,12,8,0.78)",
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 50,
            lineHeight: 1.18,
            color: BRAND.white,
            textAlign: "center",
            maxWidth: "100%",
          }}
        >
          {chunk.words.map((w, i) => (
            <span key={i} style={{ color: frame >= w.at && frame < w.at + 9 ? accent : BRAND.white }}>
              {w.text}
              {i < chunk.words.length - 1 ? " " : ""}
            </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
