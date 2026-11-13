import React from "react";
import { Img, staticFile } from "remotion";
import { FrameTheme } from "./tokens";

/** Official UGC Logistics lockup (public/brand/logo.png, keyed from the supplied file). Dark theme swaps the black text to white. */
export const LOGO_RATIO = 948 / 406;

export const Logo: React.FC<{ height: number; theme?: FrameTheme }> = ({ height, theme = "light" }) => (
  <Img
    src={staticFile(theme === "dark" ? "brand/logo-light-text.png" : "brand/logo.png")}
    style={{ height, width: height * LOGO_RATIO, display: "block" }}
  />
);
