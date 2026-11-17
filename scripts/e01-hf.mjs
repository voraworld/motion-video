// Builds the E01 per-handoff overlay clips from one spec, so every handoff gets the same kind of moment:
// a "steps" strip on the bottom of the carousel card (what happens in this handoff, in order), plus a document
// that lands on the card (booking, export declaration, bill of lading) or a badge. Text repeats the VO only.
// Times are relative to each clip's placement in remotion/src/episodes/E01ExportRelay.tsx (VO word times from
// whisper on remotion/public/audio/vo/e01/*.wav).
// Usage (repo root): node scripts/e01-hf.mjs   then check + render --format webm in each hyperframes/<id>.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const ICONS = process.env.PHOSPHOR_DIR ?? "/tmp/claude-0/-home-user-motion-video/6b1e54bc-e4d3-57f4-ac75-a60c86325b65/scratchpad/phos/package/assets/fill";
const icon = (name) => readFileSync(join(ICONS, `${name}-fill.svg`), "utf8").replace(/<svg[^>]*>/, '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">').trim();

// Card on screen: x 190–890, y 510–1250. Strip covers the card's bottom band.
const CLIPS = {
  "e01-s01": {
    note: "Handoff 01 booking (placed at 4.3 s): space on a vessel → cut-off set.",
    dur: 5.5,
    strip: { in: 0.5, out: 5.1, items: [
      { icon: "boat", top: "BOOKED", text: "SPACE ON<br />A VESSEL", at: 0.65 },
      { icon: "clock-countdown", top: "EVERY SHIP", text: "HAS A<br />CUT-OFF", at: 2.2 },
    ] },
  },
  "e01-s02": {
    note: "Handoff 02 (placed at 10.2 s): stuffed → weighed; VGM badge on \"weighed\".",
    dur: 3.0,
    strip: { in: 0.9, out: 2.7, items: [
      { icon: "package", top: "FIRST", text: "CONTAINER<br />STUFFED", at: 1.1 },
      { icon: "scales", top: "THEN", text: "WEIGHED<br />(VGM)", at: 1.9 },
    ] },
    badge: { icon: "scales", text: "VGM", at: 1.95 },
  },
  "e01-s03": {
    note: "Handoff 03 (placed at 13.3 s): a truck runs the container from the warehouse to the port.",
    dur: 3.6,
    strip: { in: 0.15, out: 3.25, mover: { icon: "truck", from: 0.55, to: 1.65 }, items: [
      { icon: "warehouse", top: "FROM", text: "WAREHOUSE", at: 0.25 },
      { icon: "anchor", top: "TO", text: "PORT", at: 1.6 },
    ] },
  },
  "e01-declare": {
    note: "Handoff 04 first half (placed at 17.9 s): the export declaration is filed before the container enters the port (PMK 155/2022: the PEB is due before the goods enter the customs area at the port of loading).",
    dur: 4.4,
    doc: { title: "EXPORT<br />DECLARATION", sub: "(PEB)", stamp: "FILED", in: 0.45, stampAt: 1.72, out: 3.75 },
    strip: { in: 2.1, out: 4.05, items: [
      { icon: "file-text", top: "FIRST", text: "DECLARATION<br />FILED", at: 2.2 },
      { icon: "truck", top: "THEN", text: "CONTAINER<br />ENTERS PORT", at: 2.75 },
    ] },
  },
  "e01-s05": {
    note: "Handoff 05 (placed at 29.1 s): loaded on board → bill of lading issued.",
    dur: 2.65,
    doc: { title: "BILL OF<br />LADING", sub: "(B/L)", stamp: "ISSUED", in: 0.1, stampAt: 1.98, out: 2.3 },
    strip: { in: 0.2, out: 2.35, items: [
      { icon: "boat", top: "FIRST", text: "LOADED<br />ON BOARD", at: 0.25 },
      { icon: "file-text", top: "THEN", text: "B/L<br />ISSUED", at: 2.0 },
    ] },
  },
  "e01-s06": {
    note: "Handoffs 06–07 (placed at 31.8 s): destination port → your buyer.",
    dur: 4.0,
    strip: { in: 0.2, out: 3.7, mover: { icon: "map-pin", from: 1.25, to: 2.1 }, items: [
      { icon: "anchor", top: "06", text: "DESTINATION<br />PORT", at: 0.3 },
      { icon: "storefront", top: "07", text: "YOUR<br />BUYER", at: 2.1 },
    ] },
  },
};

const page = (id, c) => {
  const s = c.strip;
  const items = s.items
    .map((it, k) => `${k ? (s.mover ? `<div class="track"><div class="trk-line"></div><div class="mover">${icon(s.mover.icon)}</div></div>` : `<div class="arr" id="arr${k}"></div>`) : ""}<div class="step" id="st${k}"><div class="badge${k ? " dark" : ""}">${icon(it.icon)}</div><div><div class="num">${it.top}</div>${it.text}</div></div>`)
    .join("\n        ");
  const doc = c.doc
    ? `<div id="doc" class="clip" data-start="0" data-duration="${c.dur}" data-track-index="0">
        <div id="doc-head"><div class="t1">${c.doc.title}</div><div class="t2">${c.doc.sub}</div><div id="doc-ico">${icon("file-text")}</div></div>
        <div class="ln" style="top:172px;width:300px"></div>
        <div class="ln" style="top:210px;width:356px"></div>
        <div class="ln" style="top:248px;width:240px"></div>
        <div class="ln" style="top:286px;width:330px"></div>
        <div class="ln" style="top:462px;width:200px"></div>
        <div id="stamp">${icon("seal-check")}<span>${c.doc.stamp}</span></div>
      </div>`
    : "";
  const badge = c.badge
    ? `<div id="vbadge" class="clip" data-start="0" data-duration="${c.dur}" data-track-index="2">${icon(c.badge.icon)}<span>${c.badge.text}</span></div>`
    : "";
  const tl = [];
  if (c.doc) {
    const d = c.doc;
    tl.push(`tl.fromTo("#doc", { y: 260, rotation: -8, opacity: 0, scale: 0.9 }, { y: 0, rotation: -3, opacity: 1, scale: 1, duration: 0.55, ease: "power3.out" }, ${d.in});`);
    tl.push(`tl.fromTo(".ln", { scaleX: 0 }, { scaleX: 1, duration: 0.32, ease: "power2.out", stagger: 0.1 }, ${(d.in + 0.4).toFixed(2)});`);
    tl.push(`tl.fromTo("#stamp", { scale: 2.4, opacity: 0, rotation: -14 }, { scale: 1, opacity: 1, rotation: -10, duration: 0.18, ease: "power4.in" }, ${d.stampAt});`);
    tl.push(`tl.fromTo("#doc", { x: 0 }, { x: -8, duration: 0.05, yoyo: true, repeat: 3, ease: "none", immediateRender: false }, ${(d.stampAt + 0.18).toFixed(2)});`);
    tl.push(`tl.to("#doc", { y: -60, scale: 0.86, opacity: 0, duration: 0.4, ease: "power2.in" }, ${d.out});`);
  }
  tl.push(`tl.fromTo("#steps", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, ${s.in});`);
  s.items.forEach((it, k) => {
    if (k && !s.mover) tl.push(`tl.fromTo("#arr${k}", { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power2.inOut" }, ${Math.max(s.in, it.at - 0.3).toFixed(2)});`);
    tl.push(`tl.fromTo("#st${k}", { opacity: 0, x: ${k ? 30 : -30} }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, ${it.at});`);
    tl.push(`tl.fromTo("#st${k} .badge", { scale: 0.5 }, { scale: 1, duration: 0.45, ease: "back.out(2.2)" }, ${it.at});`);
  });
  if (s.mover) {
    tl.push(`tl.fromTo(".trk-line", { scaleX: 0 }, { scaleX: 1, duration: ${(s.mover.to - s.mover.from).toFixed(2)}, ease: "power1.inOut" }, ${s.mover.from});`);
    tl.push(`tl.fromTo(".mover", { x: 0, opacity: 0 }, { x: 128, opacity: 1, duration: ${(s.mover.to - s.mover.from).toFixed(2)}, ease: "power1.inOut" }, ${s.mover.from});`);
  }
  if (c.badge) {
    tl.push(`tl.fromTo("#vbadge", { scale: 0, rotation: -25, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.45, ease: "back.out(2.4)" }, ${c.badge.at});`);
    tl.push(`tl.to("#vbadge", { scale: 0.6, opacity: 0, duration: 0.25, ease: "power2.in" }, ${(c.dur - 0.3).toFixed(2)});`);
  }
  tl.push(`tl.to("#steps", { opacity: 0, y: 20, duration: 0.28, ease: "power2.in" }, ${s.out});`);
  return `<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <!-- ${id}: generated by scripts/e01-hf.mjs (edit the generator, not this file). ${c.note}
         Transparent WebM → remotion/public/hf/${id}.webm -->
    <style>
      :root { --ink: #2b1c15; --orange: #f26a1f; --deep: #c8471a; --font-display: "Archivo Black", sans-serif; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: transparent; }
      #root { position: relative; width: 100%; height: 100%; font-family: var(--font-display); }
      #doc { position: absolute; left: 330px; top: 540px; width: 420px; height: 505px; border-radius: 18px; background: #fff; box-shadow: 0 30px 60px rgba(43,28,21,.28), 0 4px 12px rgba(43,28,21,.12); overflow: hidden; }
      #doc-head { position: absolute; left: 0; top: 0; width: 420px; height: 142px; background: linear-gradient(120deg, var(--deep), var(--orange) 75%, #f2822c); color: #fff; padding: 22px 28px; }
      #doc-head .t1 { font-size: 30px; line-height: 1.05; }
      #doc-head .t2 { font-size: 24px; margin-top: 6px; text-shadow: 0 1px 6px rgba(120,30,0,.55); }
      #doc-ico { position: absolute; right: 22px; top: 26px; width: 60px; height: 60px; color: rgba(255,255,255,.9); }
      #doc-ico svg { width: 100%; height: 100%; }
      .ln { position: absolute; left: 32px; height: 16px; border-radius: 8px; background: #ece4dc; transform-origin: 0% 50%; }
      #stamp { position: absolute; left: 130px; top: 330px; height: 110px; padding: 0 22px; border: 7px solid var(--deep); border-radius: 16px; color: var(--deep); display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 46px; letter-spacing: .04em; background: rgba(255,255,255,.88); }
      #stamp svg { width: 50px; height: 50px; }
      #steps { position: absolute; left: 200px; top: 1080px; width: 680px; height: 160px; border-radius: 0 0 40px 40px; background: #fff; display: flex; align-items: center; justify-content: center; gap: 18px; }
      .step { display: flex; align-items: center; gap: 14px; font-size: 25px; line-height: 1.1; color: var(--ink); white-space: nowrap; }
      .badge { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; background: var(--orange); color: #fff; }
      .badge.dark { background: var(--ink); }
      .badge svg { width: 36px; height: 36px; }
      .num { color: var(--deep); font-size: 20px; letter-spacing: .1em; }
      .arr { width: 54px; height: 6px; border-radius: 3px; background: var(--orange); transform-origin: 0% 50%; }
      .track { position: relative; width: 170px; height: 56px; }
      .trk-line { position: absolute; left: 0; top: 25px; width: 170px; height: 6px; border-radius: 3px; background: repeating-linear-gradient(90deg, var(--orange) 0 14px, transparent 14px 24px); transform-origin: 0% 50%; }
      .mover { position: absolute; left: 0; top: 0; width: 42px; height: 42px; color: var(--ink); }
      .mover svg { width: 100%; height: 100%; }
      #vbadge { position: absolute; left: 726px; top: 548px; width: 150px; height: 150px; border-radius: 50%; background: var(--ink); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 34px; box-shadow: 0 18px 36px rgba(43,28,21,.3); border: 6px solid var(--orange); }
      #vbadge svg { width: 54px; height: 54px; color: var(--orange); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${id}" data-start="0" data-duration="${c.dur}" data-width="1080" data-height="1920">
      ${doc}
      <div id="steps" class="clip" data-start="0" data-duration="${c.dur}" data-track-index="1">
        ${items}
      </div>
      ${badge}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${tl.join("\n      ")}
      window.__timelines["${id}"] = tl;
    </script>
  </body>
</html>
`;
};

for (const [id, c] of Object.entries(CLIPS)) {
  const dir = join(root, "hyperframes", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(id, c));
  if (!existsSync(join(dir, "hyperframes.json"))) copyFileSync(join(root, "hyperframes", "e01-lanes", "hyperframes.json"), join(dir, "hyperframes.json"));
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ id, name: id }, null, 2) + "\n");
  console.log("wrote", id);
}
