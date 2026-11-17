import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Beat, MANIFEST, sec } from "../data";
import { BRAND, FONT_BODY, FrameTheme, ZONES } from "../brand/tokens";

type Chunk = { from: number; to: number; words: { text: string; at: number }[] };

/**
 * Splits each beat's voice-over into short chunks and spreads them over the time the VO line actually lasts
 * (per-beat durations from scripts/vo.mjs), or over the beat when no VO exists yet.
 */
type Pause = { word: number; at: number; len: number };

export const buildChunks = (beats: Beat[], maxWords = 5, voDurations?: (number | undefined)[], voPauses?: (Pause[] | undefined)[]): Chunk[] => {
  const chunks: Chunk[] = [];
  for (const b of beats) {
    const words = b.vo.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const vd = voDurations?.[b.index];
    const span = vd ? Math.min(sec(vd), b.to - b.from - 2) : b.to - b.from - 4;
    // Lines split by scripts/vo.mjs (data/vo-pauses.json): words spread over the speech only, the silences skipped,
    // and a new caption chunk starts at each resumed segment.
    const pauses = voPauses?.[b.index] ?? [];
    const starts = [0, ...pauses.map((p) => p.word), words.length];
    // speech span of each segment (frames from the beat start): segment k runs from its resume time to the next pause
    const segFrom = [0, ...pauses.map((p) => sec(p.at))];
    const segTo = [...pauses.map((p) => sec(p.at - p.len)), span];
    for (let s = 0; s < starts.length - 1; s++) {
      const per = (segTo[s] - segFrom[s]) / (starts[s + 1] - starts[s]);
      const at = (k: number) => b.from + Math.round(segFrom[s] + (k - starts[s]) * per);
      for (let i = starts[s]; i < starts[s + 1]; i += maxWords) {
        const end = Math.min(starts[s + 1], i + maxWords);
        const last = end === starts[s + 1] && s < starts.length - 2;
        chunks.push({ from: at(i), to: last ? b.from + Math.round(segTo[s]) + 8 : at(end), words: words.slice(i, end).map((text, j) => ({ text, at: at(i + j) })) });
      }
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
  const pauses = vo ? beats.map((b) => vo.find((v) => sec(v.start) === b.from)?.pauses) : undefined;
  const chunk = buildChunks(beats, 5, durations, pauses).find((c) => frame >= c.from && frame < c.to);
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
