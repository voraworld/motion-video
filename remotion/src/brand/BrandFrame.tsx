import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Logo } from "./Logo";
import { BRAND, FONT_BODY, FrameTheme, ZONES } from "./tokens";

/**
 * Official logo at the very top and the website at the very bottom, from frame 0 to the end.
 * `endCardFrom`: the header logo fades out there, because the end card shows the big logo.
 */
export const BrandFrame: React.FC<{ theme: FrameTheme; endCardFrom?: number }> = ({ theme, endCardFrom }) => {
  const frame = useCurrentFrame();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const headerOpacity =
    endCardFrom === undefined ? 1 : interpolate(frame, [endCardFrom - 6, endCardFrom + 4], [1, 0], { ...clamp, easing: Easing.bezier(0.33, 0, 0.67, 1) });
  const dark = theme === "dark";
  const ink = dark ? "rgba(255,255,255,.88)" : "rgba(43,28,21,.78)";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: ZONES.headerTop, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: headerOpacity }}>
        <Logo height={ZONES.headerHeight} theme={theme} />
      </div>
      <div
        style={{
          position: "absolute",
          top: ZONES.footerTop,
          height: ZONES.footerHeight,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          fontFamily: FONT_BODY,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: 1.5,
          color: ink,
        }}
      >
        <span style={{ width: 54, height: 3, borderRadius: 3, background: `linear-gradient(90deg, transparent, ${BRAND.orange})` }} />
        {BRAND.url}
        <span style={{ width: 54, height: 3, borderRadius: 3, background: `linear-gradient(90deg, ${BRAND.orange}, transparent)` }} />
      </div>
    </AbsoluteFill>
  );
};
