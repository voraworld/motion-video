import React from "react";
import { Img, staticFile } from "remotion";
import { MANIFEST } from "../data";
import { BRAND, FONT_BODY, FONT_DISPLAY, FrameTheme } from "./tokens";

/**
 * The UGC Logistics lockup.
 * Uses the official file at public/brand/logo.svg once it is uploaded (inbox/brand/logo.svg → `npm run ingest`).
 * Until then it draws a close typographic stand-in: "UGC" + stacked "LO / GIS / TICS" + tagline.
 */
export const Logo: React.FC<{ height: number; theme?: FrameTheme; tagline?: boolean }> = ({
  height,
  theme = "light",
  tagline = true,
}) => {
  if (MANIFEST.logo) {
    return <Img src={staticFile(MANIFEST.logo)} style={{ height, width: "auto" }} />;
  }
  const side = theme === "dark" ? BRAND.white : BRAND.ink;
  const ugcH = tagline ? height * 0.72 : height;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: height * 0.04 }}>
      <div style={{ display: "flex", alignItems: "center", gap: ugcH * 0.12 }}>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: ugcH * 1.02,
            lineHeight: 0.86,
            letterSpacing: -ugcH * 0.04,
            backgroundImage: `linear-gradient(100deg, ${BRAND.ember} 10%, ${BRAND.orange} 90%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          UGC
        </span>
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: ugcH * 0.27,
            lineHeight: 1.02,
            letterSpacing: ugcH * 0.04,
            color: side,
          }}
        >
          <span>LO</span>
          <span>GIS</span>
          <span>TICS</span>
        </span>
      </div>
      {tagline ? (
        <span
          style={{
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: height * 0.13,
            letterSpacing: height * 0.012,
            color: BRAND.ember,
            whiteSpace: "nowrap",
          }}
        >
          {BRAND.tagline}
        </span>
      ) : null}
    </div>
  );
};
