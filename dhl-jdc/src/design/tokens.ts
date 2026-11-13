import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/** Official DHL brand colours (the only colours used outside the phone UI mock-up). */
export const C = {
  yellow: "#FFCC00",
  red: "#D40511",
  ink: "#191919",
  white: "#FFFFFF",
  // tonal steps of the same two brand hues, used for lighting only
  yellowHi: "#FFD733",
  yellowLo: "#F2BF00",
  redHi: "#EE2A35",
  redLo: "#9E0410",
  redDeep: "#6E0008",
} as const;

/** WhatsApp-style UI colours, used only inside the phone screen. */
export const WA = { bg: "#0B141A", head: "#1F2C34", out: "#005C4B", in: "#202C33", text: "#E9EDEF", sub: "#8696A0", green: "#25D366" } as const;

export const W = 1080;
export const H = 1920;
/** Persistent layout zones (no social-UI safe area, by request: header high, footer low). */
export const ZONE = { headerBottom: 132, footerTop: 1712, contentTop: 150, contentBottom: 1690 } as const;

// Fonts ship in public/fonts (SIL Open Font License), so renders never need the network.
export const DISPLAY = "Archivo";
export const BODY = "Inter";
loadFont({ family: DISPLAY, url: staticFile("fonts/Archivo-var.woff2"), weight: "100 900", stretch: "62% 125%" });
loadFont({ family: DISPLAY, url: staticFile("fonts/Archivo-var-italic.woff2"), weight: "100 900", stretch: "62% 125%", style: "italic" });
loadFont({ family: BODY, url: staticFile("fonts/Inter-var.woff2"), weight: "100 900" });

/** Condensed heavy display face: Archivo at 72% width, weight 900. */
export const display = (size: number, opts: { wdth?: number; wght?: number; italic?: boolean } = {}): React.CSSProperties => ({
  fontFamily: DISPLAY,
  fontSize: size,
  fontWeight: opts.wght ?? 900,
  fontStretch: `${opts.wdth ?? 72}%`,
  fontStyle: opts.italic ? "italic" : "normal",
  lineHeight: 0.9,
  letterSpacing: "-0.01em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
});

export const body = (size: number, weight = 600): React.CSSProperties => ({
  fontFamily: BODY,
  fontSize: size,
  fontWeight: weight,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
});
