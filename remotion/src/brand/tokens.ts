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

/** UGC brand colours, sampled from the official logo. */
export const BRAND = {
  orange: "#F26A1F",
  ember: "#D63A1F",
  red: "#C0392B",
  amber: "#F5A623",
  cream: "#FCEFE2",
  peach: "#F8CCB9",
  ink: "#2B1C15",
  white: "#FFFFFF",
  url: "utamaglobalindocargo.com",
  tagline: "WE CARE WHAT WE DELIVER",
};

/** The logo's ring gradient (red → orange → amber), reused by every decorative ring. */
export const RING_GRADIENT = [BRAND.red, BRAND.orange, BRAND.amber];

/**
 * Fixed layout zones on 1080×1920 (pixels from the top).
 * Logo at the very top, website at the very bottom, small captions just above the website.
 */
export const ZONES = {
  headerTop: 48,
  headerHeight: 96,
  contentTop: 210,
  captionsBottom: 1812, // captions sit on this line
  footerTop: 1846,
  footerHeight: 40,
  sideSafe: 80,
  rightRail: 1000,
};

export type FrameTheme = "light" | "dark";
