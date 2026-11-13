// Renders review stills for one composition at given seconds, with a single bundle.
// Usage (from the repo root): node scripts/stills.mjs E01 0.3,1.5,5,10 [outDir]
// Output: remotion/out/stills/<id>-<sec>.png   (set CHROME=/path/to/chrome to use a specific browser)
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const rem = path.join(root, "remotion");
const require = createRequire(path.join(rem, "package.json"));
const { bundle } = require("@remotion/bundler");
const { selectComposition, renderStill } = require("@remotion/renderer");

const [id = "E01", list = "0.3", outArg] = process.argv.slice(2);
const outDir = outArg ? path.resolve(outArg) : path.join(rem, "out", "stills");
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(rem, "src", "index.ts"), publicDir: path.join(rem, "public") });
const browserExecutable = process.env.CHROME || null;
const composition = await selectComposition({ serveUrl, id, browserExecutable });
for (const s of list.split(",").map(Number)) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const output = path.join(outDir, `${id.toLowerCase()}-${String(s).replace(".", "_")}.png`);
  await renderStill({ serveUrl, composition, frame, output, browserExecutable, imageFormat: "png" });
  console.log(output);
}
