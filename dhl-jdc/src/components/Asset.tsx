import React from "react";
import { Img, staticFile } from "remotion";
import assets from "../content/assets.json";

export type AssetName = keyof typeof assets;
export const assetSize = (n: AssetName) => assets[n];
/** Height for a given display width, from the processed asset's real aspect ratio (never stretched). */
export const hFor = (n: AssetName, w: number) => (w * assets[n].h) / assets[n].w;

/** Processed transparent asset, centred on (x, y) with width w. Aspect ratio always preserved. */
export const Asset: React.FC<{
  name: AssetName;
  x: number;
  y: number;
  w: number;
  rotate?: number;
  opacity?: number;
  style?: React.CSSProperties;
  shadow?: boolean;
}> = ({ name, x, y, w, rotate = 0, opacity = 1, style, shadow }) => {
  const h = hFor(name, w);
  return (
    <Img
      src={staticFile(assets[name].src)}
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        rotate: `${rotate}deg`,
        opacity,
        filter: shadow ? "drop-shadow(0 28px 30px rgba(110,70,0,0.35)) drop-shadow(0 6px 8px rgba(80,50,0,0.25))" : undefined,
        ...style,
      }}
    />
  );
};
