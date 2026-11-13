// English voice-over with Kokoro (on-device, Apache-2.0 model) through the HyperFrames CLI `tts` command.
// One WAV per scene, loudness-normalised to -16 LUFS / -1.5 dBTP, 48 kHz.
// Usage: node scripts/vo.mjs [s01 s02 ...]   (no args = every line)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "src/content/vo.json"), "utf8"));
const only = process.argv.slice(2);
const outDir = path.join(root, "public/audio/vo");
fs.mkdirSync(outDir, { recursive: true });
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
const metaFile = path.join(root, "src/content/vo-durations.json");
const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : {};
for (const l of cfg.lines) {
  if (only.length && !only.includes(l.id)) continue;
  const raw = path.join(outDir, `${l.id}.raw.wav`);
  const out = path.join(outDir, `${l.id}.wav`);
  execFileSync("npx", ["--yes", "hyperframes@0.8.217", "tts", l.spoken, "-v", cfg.voice, "-s", String(l.speed), "-o", raw], { stdio: ["ignore", "ignore", "inherit"] });
  // trim leading/trailing silence, then normalise
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af",
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-ac", "1", out]);
  fs.unlinkSync(raw);
  meta[l.id] = +dur(out).toFixed(3);
  console.log(l.id, meta[l.id] + "s", l.spoken);
}
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + "\n");
