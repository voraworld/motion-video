// Review stills with one bundle and one browser.
// Usage: node scripts/stills.mjs 0.2,1.5,3 [outDir]   -> out/stills/t<sec>.jpg
// Browser: REMOTION_CHROME env var, else the pre-installed headless shell if present, else Remotion's download.
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const [list = "0.3", outArg] = process.argv.slice(2);
const outDir = outArg ? path.resolve(outArg) : path.join(root, "out", "stills");
fs.mkdirSync(outDir, { recursive: true });
const local = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const browserExecutable = process.env.REMOTION_CHROME || (fs.existsSync(local) ? local : null);
const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), publicDir: path.join(root, "public") });
const puppeteerInstance = await openBrowser("chrome", { browserExecutable });
const composition = await selectComposition({ serveUrl, id: "JDCPoster", puppeteerInstance });
for (const s of list.split(",").map(Number)) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const output = path.join(outDir, `t${s.toFixed(2)}.jpg`);
  await renderStill({ serveUrl, composition, frame, output, puppeteerInstance, imageFormat: "jpeg", jpegQuality: 88 });
  console.log(output);
}
await puppeteerInstance.close({ silent: true });
