// Generates the English voice-over for one episode with Kokoro (on-device, Apache-2.0 model) via `hyperframes tts`.
// One file per beat, so every line starts exactly on its beat. If a line runs longer than its beat,
// it is re-generated slightly faster (up to 1.3×).
//
// Usage: [ONLY=0,3] node scripts/vo.mjs E01 [voice=af_heart] [speed=1.06]
// Output: remotion/public/audio/vo/e01/b00.wav … and remotion/src/generated/vo/e01.json (durations per beat)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const [id = "E01", voice = "af_heart", speedArg = "1.06"] = process.argv.slice(2);
const ep = JSON.parse(fs.readFileSync(path.join(root, "data", "episodes.json"), "utf8")).find((e) => e.id === id);
if (!ep) throw new Error(`Unknown episode ${id}`);
const lc = id.toLowerCase();
const outDir = path.join(root, "remotion", "public", "audio", "vo", lc);
fs.mkdirSync(outDir, { recursive: true });

const duration = (f) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());

const tts = (text, file, speed) =>
  execFileSync("npx", ["--yes", "hyperframes@0.8.217", "tts", text, "-v", voice, "-s", String(speed), "-o", file], {
    cwd: path.join(root, "hyperframes"),
    stdio: ["ignore", "ignore", "inherit"],
  });

// ONLY=0,3 regenerates just those beats and keeps the others from the existing meta file.
const only = process.env.ONLY ? process.env.ONLY.split(",").map(Number) : null;
const metaPath = path.join(root, "remotion", "src", "generated", "vo", `${lc}.json`);
const prev = only && fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")).beats : [];
// data/vo-pauses.json: { "<EP>": { "<beat>": [{ "after": "<word>", "nextAt": <s into the beat> }] } } splits a line
// after that word and starts the rest at nextAt, so each on-screen step gets its share of the beat (no words cut).
const PAUSES = (() => {
  const f = path.join(root, "data", "vo-pauses.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8"))[id] ?? {} : {};
})();
const silence = (secs, file) =>
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", String(secs), file]);
const concat = (files, out) =>
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", `${files.map((_, k) => `[${k}:a]aresample=24000,aformat=channel_layouts=mono[a${k}]`).join(";")};${files.map((_, k) => `[a${k}]`).join("")}concat=n=${files.length}:v=0:a=1`, out]);

const beats = [];
for (const [i, [a, b, , , vo]] of ep.beats.entries()) {
  if (only && !only.includes(i)) {
    const keep = prev.find((x) => x.index === i);
    if (keep) {
      beats.push(keep);
      continue;
    }
  }
  const file = path.join(outDir, `b${String(i).padStart(2, "0")}.wav`);
  const room = b - a - 0.25; // leave a breath before the next beat
  let speed = Number(speedArg);
  const split = PAUSES[String(i)];
  if (split?.length) {
    // Segments generated separately at the normal speed, joined with silence so segment k starts at nextAt.
    const words = vo.split(/\s+/);
    const cuts = split.map((p) => words.indexOf(p.after) + 1);
    const parts = [0, ...cuts].map((c, k) => words.slice(c, k < cuts.length ? cuts[k] : undefined).join(" "));
    const files = [];
    const pauses = [];
    let at = 0;
    for (const [k, text] of parts.entries()) {
      const seg = file.replace(/\.wav$/, `.seg${k}.wav`);
      tts(text, seg, speed);
      if (k > 0) {
        const gap = Math.max(0.3, split[k - 1].nextAt - at);
        const sil = file.replace(/\.wav$/, `.gap${k}.wav`);
        silence(gap, sil);
        files.push(sil);
        pauses.push({ word: cuts[k - 1], at: +(at + gap).toFixed(3), len: +gap.toFixed(3) });
        at += gap;
      }
      files.push(seg);
      at += duration(seg);
    }
    concat(files, file);
    files.forEach((f) => fs.rmSync(f));
    const d = duration(file);
    const tmp = file.replace(/\.wav$/, ".norm.wav");
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", tmp]);
    fs.renameSync(tmp, file);
    beats.push({ index: i, start: a, file: path.relative(path.join(root, "remotion", "public"), file), duration: +d.toFixed(3), speed, fits: d <= b - a, pauses });
    console.log(`${id} beat ${i} ${a}-${b}s  ${d.toFixed(2)}s @${speed}x  split ${JSON.stringify(pauses)}  "${vo}"`);
    continue;
  }
  tts(vo, file, speed);
  let d = duration(file);
  while (d > room && speed < 1.3) {
    speed = Math.min(1.3, +(speed * (d / room) + 0.02).toFixed(2));
    tts(vo, file, speed);
    d = duration(file);
  }
  // Loudness: -16 LUFS, true peak -1.5 dBTP, 48 kHz (the music bed sits about 10 dB under this).
  const tmp = file.replace(/\.wav$/, ".norm.wav");
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", tmp]);
  fs.renameSync(tmp, file);
  beats.push({ index: i, start: a, file: path.relative(path.join(root, "remotion", "public"), file), duration: +d.toFixed(3), speed, fits: d <= b - a });
  console.log(`${id} beat ${i} ${a}-${b}s  ${d.toFixed(2)}s @${speed}x  ${d <= room ? "ok" : "TIGHT"}  "${vo}"`);
}
const meta = { id, voice, beats };
const metaFile = path.join(root, "remotion", "src", "generated", "vo", `${lc}.json`);
fs.mkdirSync(path.dirname(metaFile), { recursive: true });
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + "\n");
console.log("wrote", path.relative(root, metaFile));
