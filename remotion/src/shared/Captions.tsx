import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Beat, MANIFEST, sec } from "../data";
import { BRAND, FONT_BODY, FrameTheme, ZONES } from "../brand/tokens";

type Chunk = { from: number; to: number; words: { text: string; at: number }[] };

/**
 * Splits each beat's voice-over into short chunks and spreads them over the time the VO line actually lasts
 * (per-beat durations from scripts/vo.mjs), or over the beat when no VO exists yet.
 */
export const buildChunks = (beats: Beat[], maxWords = 5, voDurations?: (number | undefined)[]): Chunk[] => {
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

/** Small, quiet captions just above the website line, so they never fight the animation. */
export const Captions: React.FC<{ beats: Beat[]; accent?: string; ep?: string; theme?: FrameTheme; themeAt?: (frame: number) => FrameTheme }> = ({
  beats,
  accent = BRAND.orange,
  ep,
  theme = "light",
  themeAt,
}) => {
  const frame = useCurrentFrame();
  const vo = ep ? MANIFEST.voBeats?.[ep] : undefined;
  const durations = vo ? beats.map((b) => vo.find((v) => sec(v.start) === b.from)?.duration) : undefined;
  const chunk = buildChunks(beats, 5, durations).find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  const dark = (themeAt ? themeAt(frame) : theme) === "dark";
  const fade = interpolate(frame - chunk.from, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: ZONES.sideSafe, right: ZONES.sideSafe, top: ZONES.captionsBottom - 46, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            opacity: fade,
            translate: `0px ${(1 - fade) * 6}px`,
            padding: "7px 18px",
            borderRadius: 999,
            background: dark ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.62)",
            boxShadow: dark ? "none" : "0 4px 16px rgba(43,28,21,.08)",
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: 30,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            color: dark ? "rgba(255,255,255,.92)" : BRAND.ink,
          }}
        >
          {chunk.words.map((w, i) => (
            <span key={i} style={{ color: frame >= w.at && frame < w.at + 8 ? accent : undefined }}>
              {w.text}
              {i < chunk.words.length - 1 ? " " : ""}
            </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
