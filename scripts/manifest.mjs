// Scans remotion/public and writes remotion/src/generated/manifest.json, so compositions
// know which assets, audio files and HyperFrames clips exist and can fall back when one is missing.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const pub = path.join(root, "remotion", "public");
const out = path.join(root, "remotion", "src", "generated", "manifest.json");

const list = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => !f.startsWith(".")) : []);
const stem = (f) => f.replace(/\.[^.]+$/, "");

const manifest = { logo: null, assets: {}, vo: {}, voBeats: {}, music: {}, hf: {}, sfx: {} };

if (fs.existsSync(path.join(pub, "brand", "logo.svg"))) manifest.logo = "brand/logo.svg";
for (const ep of list(path.join(pub, "assets"))) {
  manifest.assets[ep] = {};
  for (const f of list(path.join(pub, "assets", ep))) manifest.assets[ep][stem(f)] = `assets/${ep}/${f}`;
}
const isFile = (p) => fs.statSync(p).isFile();
for (const f of list(path.join(pub, "audio", "vo")).filter((f) => isFile(path.join(pub, "audio", "vo", f)))) manifest.vo[stem(f)] = `audio/vo/${f}`;
// Per-beat voice-over from scripts/vo.mjs: remotion/src/generated/vo/<ep>.json
const voMeta = path.join(root, "remotion", "src", "generated", "vo");
for (const f of list(voMeta).filter((f) => f.endsWith(".json"))) {
  const meta = JSON.parse(fs.readFileSync(path.join(voMeta, f), "utf8"));
  manifest.voBeats[stem(f)] = meta.beats.map((b) => ({ start: b.start, file: b.file, duration: b.duration }));
}
for (const f of list(path.join(pub, "audio", "music"))) manifest.music[stem(f)] = `audio/music/${f}`;
for (const f of list(path.join(pub, "hf")).filter((f) => f.endsWith(".webm"))) manifest.hf[stem(f)] = `hf/${f}`;
for (const f of list(path.join(pub, "sfx"))) manifest.sfx[stem(f)] = `sfx/${f}`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
const count = (o) => Object.values(o).reduce((n, v) => n + (typeof v === "object" ? Object.keys(v).length : 1), 0);
console.log(
  `manifest: logo=${manifest.logo ? "yes" : "placeholder"} assets=${count(manifest.assets)} vo=${Object.keys(manifest.vo).length + Object.keys(manifest.voBeats).length} music=${Object.keys(manifest.music).length} hf=${Object.keys(manifest.hf).length} sfx=${Object.keys(manifest.sfx).length}`,
);
