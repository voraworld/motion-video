import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Logo } from "./Logo";
import { BRAND, FONT_BODY, FrameTheme, ZONES } from "./tokens";

/**
 * Logo in the header and the website in the footer, on screen from frame 0 to the end.
 * `endCardFrom`: the header logo fades out there, because the end card shows the big logo.
 */
export const BrandFrame: React.FC<{ theme: FrameTheme; endCardFrom?: number }> = ({ theme, endCardFrom }) => {
  const frame = useCurrentFrame();
  const headerOpacity =
    endCardFrom === undefined
      ? 1
      : interpolate(frame, [endCardFrom - 6, endCardFrom + 4], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.33, 0, 0.67, 1),
        });
  const dark = theme === "dark";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: ZONES.headerTop,
          left: 0,
          right: 0,
          height: ZONES.headerHeight,
          display: "flex",
          justifyContent: "center",
          opacity: headerOpacity,
          filter: dark ? "drop-shadow(0 4px 18px rgba(0,0,0,.45))" : "drop-shadow(0 2px 10px rgba(255,255,255,.6))",
        }}
      >
        <Logo height={ZONES.headerHeight} theme={theme} />
      </div>
      <div
        style={{
          position: "absolute",
          top: ZONES.footerTop,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            height: ZONES.footerHeight,
            padding: "0 30px",
            borderRadius: ZONES.footerHeight,
            display: "flex",
            alignItems: "center",
            background: dark ? "rgba(255,255,255,0.94)" : BRAND.ink,
            color: dark ? BRAND.ink : BRAND.white,
            fontFamily: FONT_BODY,
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: 0.5,
            boxShadow: "0 6px 24px rgba(0,0,0,.25)",
          }}
        >
          {BRAND.url}
        </div>
      </div>
    </AbsoluteFill>
  );
};
