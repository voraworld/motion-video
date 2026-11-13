import episodesJson from "../../data/episodes.json";
import manifestJson from "./generated/manifest.json";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type BeatType = "hook" | "edu" | "stuck" | "ugc" | "cta";
export type Engine = "R" | "H" | "R+H";

/** [startSec, endSec, type, engine, voiceOver, onScreen ("line one / line two")] */
export type BeatTuple = [number, number, BeatType, Engine, string, string];

export type Episode = {
  id: string;
  pillar: string;
  title: string;
  dur: number;
  svc: string;
  hookOS: string;
  hookFX: string;
  concept: string;
  design: string;
  motion: string;
  morph: string[];
  transition: string;
  beats: BeatTuple[];
  learn: string;
  promo: string;
  music: { bpm: number | string; style: string; prompt: string; cues: string };
  caption: string;
};

export type Beat = {
  index: number;
  from: number; // frame
  to: number; // frame (exclusive)
  type: BeatType;
  engine: Engine;
  vo: string;
  lines: string[];
};

export const EPISODES = episodesJson as unknown as Episode[];

export const getEpisode = (id: string): Episode => {
  const ep = EPISODES.find((e) => e.id === id);
  if (!ep) throw new Error(`Unknown episode ${id}`);
  return ep;
};

export const sec = (s: number) => Math.round(s * FPS);

export const beatsOf = (ep: Episode): Beat[] =>
  ep.beats.map(([a, b, type, engine, vo, os], index) => ({
    index,
    from: sec(a),
    to: sec(b),
    type,
    engine,
    vo,
    lines: os.split(" / ").map((l) => l.trim()),
  }));

type Manifest = {
  logo: string | null;
  assets: Record<string, Record<string, string>>;
  vo: Record<string, string>;
  voBeats: Record<string, { start: number; file: string; duration: number }[]>;
  music: Record<string, string>;
  hf: Record<string, string>;
  sfx: Record<string, string>;
};
export const MANIFEST = manifestJson as Manifest;

/** Path of a generated image for an episode (e.g. asset("e01", "warehouse-stuffing-station")), or null if not uploaded yet. */
export const asset = (ep: string, name: string): string | null => MANIFEST.assets[ep]?.[name] ?? null;
