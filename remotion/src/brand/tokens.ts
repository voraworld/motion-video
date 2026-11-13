import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fonts ship with the project (public/fonts, Latin subset, SIL Open Font License),
// so renders never depend on Google Fonts being reachable.
export const FONT_DISPLAY = "Archivo Black";
export const FONT_BODY = "Plus Jakarta Sans";
export const FONT_MONO = "JetBrains Mono";

loadFont({ family: FONT_DISPLAY, url: staticFile("fonts/ArchivoBlack-400.woff2"), weight: "400" });
loadFont({ family: FONT_BODY, url: staticFile("fonts/PlusJakartaSans-var.woff2"), weight: "200 800" });
loadFont({ family: FONT_MONO, url: staticFile("fonts/JetBrainsMono-var.woff2"), weight: "100 800" });

/** UGC brand colours, sampled from the existing "Stuck Cargo" video. */
export const BRAND = {
  orange: "#F26A1F",
  ember: "#D63A1F",
  cream: "#FCEFE2",
  peach: "#F8CCB9",
  ink: "#2B1C15",
  white: "#FFFFFF",
  url: "utamaglobalindocargo.com",
  tagline: "WE CARE WHAT WE DELIVER",
};

/**
 * Fixed layout zones on 1080×1920 (pixels from the top).
 * TikTok/Reels draw their own UI above 168 px and below ~1330 px, so every word stays inside 168–1330.
 */
export const ZONES = {
  headerTop: 180,
  headerHeight: 120,
  contentTop: 330,
  contentBottom: 1080,
  captionsBottom: 1250, // captions sit on this line, growing upward
  footerTop: 1280,
  footerHeight: 50,
  sideSafe: 90,
  rightRail: 960, // no important content right of this x
};

export type FrameTheme = "light" | "dark";
