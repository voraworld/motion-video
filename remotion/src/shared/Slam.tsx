import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { FONT_DISPLAY } from "../brand/tokens";

/**
 * Kinetic headline: each word slams in from large and blurred, one after another,
 * then the whole block leaves with a short blur-out. Frames are local to the parent Sequence.
 */
export const Slam: React.FC<{
  lines: string[];
  color: string;
  accent?: string;
  /** Index of the line drawn in the accent colour. */
  accentLine?: number;
  size?: number;
  /** Local frame at which each line starts. Defaults to 8 frames apart. */
  lineStarts?: number[];
  wordGap?: number;
  exitAt?: number;
  shadow?: string;
  align?: "center" | "left";
}> = ({
  lines,
  color,
  accent,
  accentLine = -1,
  size = 104,
  lineStarts,
  wordGap = 3,
  exitAt,
  shadow = "0 6px 30px rgba(0,0,0,.35)",
  align = "center",
}) => {
  const frame = useCurrentFrame();
  const exit =
    exitAt === undefined
      ? 0
      : interpolate(frame, [exitAt, exitAt + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        gap: size * 0.08,
        opacity: 1 - exit,
        filter: exit > 0 ? `blur(${exit * 10}px)` : undefined,
      }}
    >
      {lines.map((line, li) => {
        const start = lineStarts?.[li] ?? li * 8;
        return (
          <div
            key={li}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: align === "center" ? "center" : "flex-start",
              columnGap: size * 0.26,
              fontFamily: FONT_DISPLAY,
              fontSize: size,
              lineHeight: 1,
              letterSpacing: -size * 0.01,
              color: li === accentLine && accent ? accent : color,
              textShadow: shadow,
              textAlign: align,
            }}
          >
            {line.split(" ").map((word, wi) => {
              const t = frame - start - wi * wordGap;
              const s = interpolate(t, [0, 6], [2.3, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.exp),
              });
              const o = interpolate(t, [0, 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const b = interpolate(t, [0, 5], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <span
                  key={wi}
                  style={{ display: "inline-block", scale: String(s), opacity: o, filter: b > 0.2 ? `blur(${b}px)` : undefined }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
