// Generates the English voice-over for one episode with Kokoro (on-device, Apache-2.0 model) via `hyperframes tts`.
// One file per beat, so every line starts exactly on its beat. If a line runs longer than its beat,
// it is re-generated slightly faster (up to 1.3×).
//
// Usage: node scripts/vo.mjs E01 [voice=af_heart] [speed=1.06]
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

const beats = [];
for (const [i, [a, b, , , vo]] of ep.beats.entries()) {
  const file = path.join(outDir, `b${String(i).padStart(2, "0")}.wav`);
  const room = b - a - 0.25; // leave a breath before the next beat
  let speed = Number(speedArg);
  tts(vo, file, speed);
  let d = duration(file);
  while (d > room && speed < 1.3) {
    speed = Math.min(1.3, +(speed * (d / room) + 0.02).toFixed(2));
    tts(vo, file, speed);
    d = duration(file);
  }
  beats.push({ index: i, start: a, file: path.relative(path.join(root, "remotion", "public"), file), duration: +d.toFixed(3), speed, fits: d <= b - a });
  console.log(`${id} beat ${i} ${a}-${b}s  ${d.toFixed(2)}s @${speed}x  ${d <= room ? "ok" : "TIGHT"}  "${vo}"`);
}
const meta = { id, voice, beats };
const metaFile = path.join(root, "remotion", "src", "generated", "vo", `${lc}.json`);
fs.mkdirSync(path.dirname(metaFile), { recursive: true });
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + "\n");
console.log("wrote", path.relative(root, metaFile));
