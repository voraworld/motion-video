import { FrameTheme } from "../brand/tokens";

/**
 * Starting palette per episode, matching each episode's style tile in the content plan.
 * Used by the scaffold until an episode gets its own bespoke composition.
 */
export type EpisodeTheme = { bg: string; bg2: string; ink: string; accent: string; frame: FrameTheme; morph: string };

export const THEMES: Record<string, EpisodeTheme> = {
  E01: { bg: "#FCEFE2", bg2: "#F8CCB9", ink: "#2B1C15", accent: "#F26A1F", frame: "light", morph: "#F26A1F" },
  E02: { bg: "#0E1622", bg2: "#1D2B40", ink: "#FFFFFF", accent: "#F28C3A", frame: "dark", morph: "#F26A1F" },
  E03: { bg: "#FBF4EC", bg2: "#F3E2CF", ink: "#2B1C15", accent: "#D63A1F", frame: "light", morph: "#D63A1F" },
  E04: { bg: "#D63A1F", bg2: "#B52E17", ink: "#FFFFFF", accent: "#FCEFE2", frame: "dark", morph: "#FFFFFF" },
  E05: { bg: "#FCEFE2", bg2: "#F8CCB9", ink: "#2B1C15", accent: "#D63A1F", frame: "light", morph: "#F26A1F" },
  E06: { bg: "#EDE3D8", bg2: "#FFFFFF", ink: "#2B1C15", accent: "#D63A1F", frame: "light", morph: "#F26A1F" },
  E07: { bg: "#2A2B2E", bg2: "#1D1E21", ink: "#FFFFFF", accent: "#F26A1F", frame: "dark", morph: "#C8331E" },
  E08: { bg: "#E7C7A6", bg2: "#D9B48E", ink: "#2B1C15", accent: "#D63A1F", frame: "light", morph: "#F26A1F" },
  E09: { bg: "#F26A1F", bg2: "#FCEFE2", ink: "#FFFFFF", accent: "#2B1C15", frame: "dark", morph: "#F26A1F" },
  E10: { bg: "#F7F4F1", bg2: "#ECE6E0", ink: "#2B1C15", accent: "#F26A1F", frame: "light", morph: "#F26A1F" },
  E11: { bg: "#2A1C16", bg2: "#3A2A21", ink: "#FCEFE2", accent: "#F26A1F", frame: "dark", morph: "#F26A1F" },
  E12: { bg: "#0D0B0A", bg2: "#1A1411", ink: "#F26A1F", accent: "#FCEFE2", frame: "dark", morph: "#F26A1F" },
};
