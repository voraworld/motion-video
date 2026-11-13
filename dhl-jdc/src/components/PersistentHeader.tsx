import React from "react";
import { Img, staticFile } from "remotion";
import { C, display } from "../design/tokens";
import assets from "../content/assets.json";

/** Official DHL logo (supplied artwork, never redrawn) high on the canvas, on an integrated yellow band. */
export const PersistentHeader: React.FC = () => {
  const lw = 420;
  const lh = (lw * assets.dhl_logo.h) / assets.dhl_logo.w;
  const top = 24;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 132, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, ${C.yellow} 0%, ${C.yellow} 86%, rgba(255,204,0,0) 100%)`,
        }}
      />
      <Img src={staticFile(assets.dhl_logo.src)} style={{ position: "absolute", left: 540 - lw / 2, top, width: lw, height: lh }} />
      <div
        style={{
          ...display(30, { wdth: 100, wght: 800, italic: true }),
          position: "absolute",
          left: 0,
          width: 1080,
          textAlign: "center",
          top: top + lh + 7,
          color: C.red,
          letterSpacing: "0.02em",
          lineHeight: 1,
        }}
      >
        EXPRESS
      </div>
    </div>
  );
};
