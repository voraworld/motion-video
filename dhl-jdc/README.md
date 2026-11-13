# DHL Express Service Point JDC Cengkareng — vertical motion commercial

Remotion (React/TypeScript) project. 1080×1920, 30 fps, 86.4 s. Concept and storyboard: `CONCEPT.md`.

## Rebuild from scratch

```bash
npm i
pip install numpy kokoro-onnx soundfile        # audio tools (Kokoro TTS runs on-device via the HyperFrames CLI)
python3 scripts/prep_assets.py                 # originals → public/assets/processed (trim, de-glow, resize)
node scripts/vo.mjs                            # English VO, one file per scene (src/content/vo.json)
python3 scripts/music.py                       # original soundtrack → public/audio/stems/music.wav
python3 scripts/sfx.py                         # synthesised SFX → public/audio/stems/sfx.wav
python3 scripts/mix.py                         # ducking + master → public/audio/mix.wav (-14 LUFS, -1 dBTP)
npx remotion render JDCCommercial out/master_raw.mp4 --codec=h264 --crf=18
bash scripts/finalize.sh                       # yuv420p (TV range) + mastered audio → out/JDC_CENGKARENG_DHL_EXPRESS_MASTER.mp4
node scripts/stills.mjs 0.3,12,60              # review stills → out/stills
bash scripts/deliver.sh                        # poster, contact sheet, status segments, audio, zip
```
If Remotion cannot download its browser, pass `--browser-executable=/path/to/chrome-headless-shell`
(the stills script reads `REMOTION_CHROME`).

## Where things live

- `src/content/copy.ts` — service point name, WhatsApp number, address (single source).
- `src/content/timeline.json` — scene windows and VO start times (used by Remotion and the audio scripts).
- `src/design/tokens.ts` — DHL colours (#FFCC00, #D40511, #191919, #FFFFFF), fonts, layout zones.
- `src/components/LivingRibbon.tsx` — the procedural red ribbon (spline + twist + 3-D shading).
- `src/scenes/S01…S08` — one file per scene; each documents its choreography at the top.
- `src/components/PersistentHeader.tsx / PersistentFooter.tsx` — fixed layers outside every scene camera.

## Licences

Fonts: Archivo and Inter (SIL OFL, `public/fonts`). Icons: Phosphor (MIT), WhatsApp glyph from Simple Icons (CC0;
the WhatsApp mark is a trademark of WhatsApp LLC). Music and SFX are synthesised in `scripts/` and carry no
third-party rights. Voice: Kokoro-82M (Apache-2.0). DHL logo and product renders are supplied by the client.
