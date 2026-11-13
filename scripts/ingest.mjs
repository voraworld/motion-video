// Moves uploaded files from inbox/ into the Remotion public folder, then refreshes the manifest.
//
//   inbox/e01/e01_warehouse-stuffing-station.png -> remotion/public/assets/e01/warehouse-stuffing-station.png
//   inbox/e01/e01_vo.wav    -> remotion/public/audio/vo/e01.wav   (or per-beat files from scripts/vo.mjs)
//   inbox/e01/e01_music.wav -> remotion/public/audio/music/e01.wav
//   inbox/brand/logo.svg               -> remotion/public/brand/logo.svg
//
// Usage: node scripts/ingest.mjs [e01]   (no argument = every episode)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const inbox = path.join(root, "inbox");
const pub = path.join(root, "remotion", "public");
const only = process.argv[2]?.toLowerCase();

const IMG = /\.(png|jpe?g|webp)$/i;
const AUD = /\.(wav|mp3|m4a|aac|flac)$/i;
const moved = [];
const skipped = [];

const move = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  moved.push(`${path.relative(root, from)} -> ${path.relative(root, to)}`);
};

const brandLogo = path.join(inbox, "brand", "logo.svg");
if (fs.existsSync(brandLogo)) move(brandLogo, path.join(pub, "brand", "logo.svg"));

for (const dir of fs.readdirSync(inbox).filter((d) => /^e\d{2}$/.test(d))) {
  if (only && dir !== only) continue;
  for (const file of fs.readdirSync(path.join(inbox, dir))) {
    if (file.startsWith(".")) continue;
    const src = path.join(inbox, dir, file);
    const base = file.replace(new RegExp(`^${dir}_`, "i"), "");
    const ext = path.extname(file).toLowerCase();
    if (AUD.test(file) && /^vo\./i.test(base)) move(src, path.join(pub, "audio", "vo", dir + ext));
    else if (AUD.test(file) && /^music\./i.test(base)) move(src, path.join(pub, "audio", "music", dir + ext));
    else if (IMG.test(file)) move(src, path.join(pub, "assets", dir, base.toLowerCase()));
    else skipped.push(path.relative(root, src));
  }
}

console.log(moved.length ? "Moved:\n  " + moved.join("\n  ") : "Nothing to move.");
if (skipped.length) console.log("Not recognised (left in inbox):\n  " + skipped.join("\n  "));
execFileSync("node", [path.join(root, "scripts", "manifest.mjs")], { stdio: "inherit" });
