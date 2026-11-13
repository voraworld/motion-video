import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Logo } from "../brand/Logo";
import { BRAND, FONT_BODY, FONT_DISPLAY } from "../brand/tokens";

/**
 * Series signature: the episode's last morph element (a circle of `morphColor` starting at `origin`)
 * grows into the centre, flattens into a cream card, and the UGC logo lands on it with the CTA.
 * Frames are local to the parent Sequence (start it at the CTA beat).
 */
export const EndCard: React.FC<{
  cta: string[];
  morphColor: string;
  origin?: { x: number; y: number; size: number };
}> = ({ cta, morphColor, origin = { x: 540, y: 760, size: 220 } }) => {
  const f = useCurrentFrame();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const grow = interpolate(f, [0, 14], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const settle = interpolate(f, [12, 24], [0, 1], { ...clamp, easing: Easing.out(Easing.exp) });
  const size = interpolate(grow, [0, 1], [origin.size, 2600]);
  const cx = interpolate(grow, [0, 1], [origin.x, 540]);
  const cy = interpolate(grow, [0, 1], [origin.y, 760]);
  const logoIn = interpolate(f, [14, 26], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const ctaIn = interpolate(f, [22, 32], [0, 1], { ...clamp, easing: Easing.out(Easing.exp) });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          width: size,
          height: size,
          left: cx - size / 2,
          top: cy - size / 2,
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 50%, ${BRAND.cream} ${settle * 62}%, ${morphColor} ${settle * 62 + 8}%)`,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70, paddingBottom: 260 }}>
        <div style={{ scale: String(0.6 + 0.4 * logoIn), opacity: logoIn }}>
          <Logo height={250} theme="light" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: ctaIn, translate: `0px ${(1 - ctaIn) * 30}px` }}>
          {cta.map((l, i) => (
            <div key={i} style={{ fontFamily: FONT_DISPLAY, fontSize: 70, color: BRAND.ink, textAlign: "center", lineHeight: 1.05 }}>
              {l}
            </div>
          ))}
          <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 34, color: BRAND.ember, letterSpacing: 1 }}>
            Let&apos;s discuss your logistics needs.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
