// E03 navigation plates: real streets (OpenStreetMap via OpenFreeMap vector tiles) rendered once with MapLibre
// in headless Chromium, in a light "navigation app" style, for the two city legs. Also stores the OSRM truck
// routes (data/e03-osrm-*.json) in world coordinates with their street-name steps.
//
// Output: remotion/public/assets/e03/plate-<city>.png and the `plates` / `roads` keys of
//         remotion/src/generated/e03-map.json (world px = the same Mercator as scripts/e03-map.mjs).
// Map data © OpenStreetMap contributors (ODbL), tiles © OpenFreeMap / OpenMapTiles.
// Usage (repo root): node scripts/e03-plates.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(path.join(root, "remotion", "package.json"));
const d3 = require("d3-geo");
const { chromium } = require("playwright");

// Same world projection as scripts/e03-map.mjs
const PX_PER_DEG = 120;
const S = (PX_PER_DEG * 180) / Math.PI;
const proj = d3.geoMercator().scale(S).translate([0, 0]);
const p0 = proj([94, 8]);
proj.translate([-p0[0], -p0[1]]);
const W = (lon, lat) => proj([lon, lat]).map((v) => Math.round(v * 10000) / 10000);

const MAX_PX = 4096;
const MARGIN = 0.02; // degrees around the route

const style = JSON.parse(await (await fetch("https://tiles.openfreemap.org/styles/positron")).text());
const paint = {
  background: { "background-color": "#EEEFEA" },
  water: { "fill-color": "#A6D1F0" },
  park: { "fill-color": "#CFE6C4" },
  landcover_wood: { "fill-color": "#CFE6C4" },
  landuse_residential: { "fill-color": "#ECECE6" },
  building: { "fill-color": "#DDDDD6" },
  waterway: { "line-color": "#A6D1F0" },
  highway_minor: { "line-color": "#FFFFFF" },
  highway_major_casing: { "line-color": "#CDD2D8" },
  highway_major_inner: { "line-color": "#FFFFFF" },
  highway_major_subtle: { "line-color": "#FFFFFF" },
  highway_motorway_casing: { "line-color": "#E3C17E" },
  highway_motorway_inner: { "line-color": "#FCE6B0" },
  highway_motorway_subtle: { "line-color": "#FCE6B0" },
  highway_motorway_bridge_casing: { "line-color": "#E3C17E" },
  highway_motorway_bridge_inner: { "line-color": "#FCE6B0" },
};
style.layers = style.layers.filter((l) => !/^(label_country|label_state|boundary|highway-shield|road_shield|airport)/.test(l.id));
for (const l of style.layers) {
  if (paint[l.id]) l.paint = { ...(l.paint ?? {}), ...paint[l.id] };
  if (l.type === "symbol" && l.paint) {
    l.paint["text-color"] = "#5A6370";
    l.paint["text-halo-color"] = "#FFFFFF";
    l.paint["text-halo-width"] = 1.6;
  }
  if (l.id === "highway_minor") {
    l.paint["line-width"] = ["interpolate", ["exponential", 1.5], ["zoom"], 13, 1.5, 16, 7, 18, 18];
  }
}
// a casing under minor roads, like navigation apps
const minorIdx = style.layers.findIndex((l) => l.id === "highway_minor");
if (minorIdx >= 0) {
  const m = style.layers[minorIdx];
  style.layers.splice(minorIdx, 0, { ...m, id: "highway_minor_casing", paint: { ...m.paint, "line-color": "#D6D9DE", "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 13, 2.5, 16, 9.5, 18, 22] } });
}

const cities = {
  jakarta: JSON.parse(fs.readFileSync(path.join(root, "data", "e03-osrm-jakarta.json"), "utf8")),
  sorong: JSON.parse(fs.readFileSync(path.join(root, "data", "e03-osrm-sorong.json"), "utf8")),
};

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
page.on("console", (m) => (m.type() === "error" ? console.log("page:", m.text()) : null));
const lib = path.join(root, "remotion", "node_modules", "maplibre-gl", "dist");
await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:#fff}</style></head><body><div id="m"></div></body></html>`);
await page.addStyleTag({ path: path.join(lib, "maplibre-gl.css") });
await page.addScriptTag({ path: path.join(lib, "maplibre-gl.js") });

const mapJson = path.join(root, "remotion", "src", "generated", "e03-map.json");
const MAP = JSON.parse(fs.readFileSync(mapJson, "utf8"));
MAP.plates = {};
MAP.roads = {};

for (const [name, osrm] of Object.entries(cities)) {
  const route = osrm.routes[0];
  const coords = route.geometry.coordinates;
  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const bb = [Math.min(...lons) - MARGIN, Math.min(...lats) - MARGIN, Math.max(...lons) + MARGIN, Math.max(...lats) + MARGIN];
  const centre = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
  // largest zoom (in 0.25 steps) whose plate fits MAX_PX (512-px tiles, Web Mercator)
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  let z = 17;
  let wPx = 0;
  let hPx = 0;
  for (; z > 10; z -= 0.25) {
    const k = (512 * 2 ** z) / (2 * Math.PI);
    wPx = Math.ceil(k * ((bb[2] - bb[0]) * Math.PI) / 180);
    hPx = Math.ceil(k * (mercY(bb[3]) - mercY(bb[1])));
    if (wPx <= MAX_PX && hPx <= MAX_PX) break;
  }
  console.log(`${name}: zoom ${z}, plate ${wPx}×${hPx}`);
  const result = await page.evaluate(
    async ({ style, centre, z, wPx, hPx }) => {
      const el = document.getElementById("m");
      el.style.width = `${wPx}px`;
      el.style.height = `${hPx}px`;
      const map = new maplibregl.Map({
        container: el,
        style,
        center: centre,
        zoom: z,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        pixelRatio: 1.5, // sharper streets and labels at street level
        maxCanvasSize: [8192, 8192],
        preserveDrawingBuffer: true,
      });
      await new Promise((res) => map.once("idle", res));
      await new Promise((res) => setTimeout(res, 800));
      const tl = map.unproject([0, 0]);
      const br = map.unproject([wPx, hPx]);
      const data = map.getCanvas().toDataURL("image/jpeg", 0.9);
      map.remove();
      return { data, tl: [tl.lng, tl.lat], br: [br.lng, br.lat] };
    },
    { style, centre, z, wPx, hPx },
  );
  const file = path.join(root, "remotion", "public", "assets", "e03", `plate-${name}.jpg`);
  fs.writeFileSync(file, Buffer.from(result.data.split(",")[1], "base64"));
  const [x0, y0] = W(...result.tl);
  const [x1, y1] = W(...result.br);
  MAP.plates[name] = { file: `assets/e03/plate-${name}.jpg`, w: wPx, h: hPx, zoom: z, x0, y0, x1, y1 };
  // route in world px, plus the street-name steps with their position along the route (0..1)
  let acc = 0;
  const steps = route.legs[0].steps.map((s) => {
    const at = acc / route.distance;
    acc += s.distance;
    return { at, type: s.maneuver.type, modifier: s.maneuver.modifier ?? "", name: s.name };
  });
  MAP.roads[name] = { pts: coords.map(([lon, lat]) => W(lon, lat)), steps, distance: route.distance };
  console.log(`  wrote ${path.relative(root, file)}`);
}
await browser.close();
fs.writeFileSync(mapJson, JSON.stringify(MAP));
console.log("updated", path.relative(root, mapJson));
