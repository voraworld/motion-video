import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Beat } from "../data";
import { BRAND, FONT_BODY, ZONES } from "../brand/tokens";

type Chunk = { from: number; to: number; words: { text: string; at: number }[] };

/**
 * Splits each beat's voice-over into chunks of up to `maxWords` words and spreads them evenly over the beat.
 * This is the placeholder timing. Once the recorded VO exists, replace it with word timings from a
 * transcription (remotion-captions skill) so the highlight matches the actual audio.
 */
export const buildChunks = (beats: Beat[], maxWords = 4): Chunk[] => {
  const chunks: Chunk[] = [];
  for (const b of beats) {
    const words = b.vo.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const span = b.to - b.from - 4;
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

export const Captions: React.FC<{ beats: Beat[]; accent?: string }> = ({ beats, accent = BRAND.orange }) => {
  const frame = useCurrentFrame();
  const chunk = buildChunks(beats).find((c) => frame >= c.from && frame < c.to);
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
