import React from "react";
import { Img, staticFile } from "remotion";
import assets from "../content/assets.json";

/** Screen rectangle inside the processed phone render, as fractions of its width/height. */
export const SCREEN = { x0: 0.058, x1: 0.893, y0: 0.036, y1: 0.966, r: 0.1 } as const;
/** Logical screen size the UI is designed at (scaled to fit). */
export const SW = 400;
export const SH = Math.round((SW * ((SCREEN.y1 - SCREEN.y0) * assets.dhl_phone.h)) / ((SCREEN.x1 - SCREEN.x0) * assets.dhl_phone.w));
export const phoneH = (w: number) => (w * assets.dhl_phone.h) / assets.dhl_phone.w;
/** Screen-space point of a logical screen coordinate for a phone at (cx, cy, w) without rotation. */
export const screenPoint = (cx: number, cy: number, w: number, sx: number, sy: number): [number, number] => {
  const h = phoneH(w);
  const left = cx - w / 2 + SCREEN.x0 * w;
  const top = cy - h / 2 + SCREEN.y0 * h;
  const s = ((SCREEN.x1 - SCREEN.x0) * w) / SW;
  return [left + sx * s, top + sy * s];
};

export const SmartphoneHero: React.FC<{
  cx: number;
  cy: number;
  w: number;
  rotate?: number;
  style?: React.CSSProperties;
  screen?: React.ReactNode;
  glow?: number;
}> = ({ cx, cy, w, rotate = 0, style, screen, glow = 0 }) => {
  const h = phoneH(w);
  const sw = (SCREEN.x1 - SCREEN.x0) * w;
  const sh = (SCREEN.y1 - SCREEN.y0) * h;
  const s = sw / SW;
  return (
    <div style={{ position: "absolute", left: cx - w / 2, top: cy - h / 2, width: w, height: h, rotate: `${rotate}deg`, ...style }}>
      <Img
        src={staticFile(assets.dhl_phone.src)}
        style={{
          position: "absolute",
          inset: 0,
          width: w,
          height: h,
          filter: "drop-shadow(0 40px 40px rgba(90,55,0,0.38)) drop-shadow(0 8px 10px rgba(60,40,0,0.3))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: SCREEN.x0 * w,
          top: SCREEN.y0 * h,
          width: sw,
          height: sh,
          borderRadius: SCREEN.r * w,
          overflow: "hidden",
          transform: "perspective(1700px) rotateY(-5deg)",
          transformOrigin: "50% 50%",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: SW, height: SH, transform: `scale(${s})`, transformOrigin: "0 0" }}>{screen}</div>
        {glow > 0 ? (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 40%)", opacity: glow }} />
        ) : null}
      </div>
    </div>
  );
};
