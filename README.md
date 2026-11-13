# UGC Motion Series

Proyek produksi 12 motion video vertikal (1080×1920, 30 fps) untuk UGC Logistics.
Content plan, naskah, prompt aset dan checklist produksi ada di halaman content plan (artifact "UGC Motion Series").

## Struktur

```
data/episodes.json   Naskah per beat (VO, teks layar, engine R/H), arah visual, musik, prompt aset. Sumber tunggal.
inbox/eXX/           Tempat aset masuk (gambar GPT, VO, musik) sebelum dipindah ke remotion/public.
inbox/brand/         logo.svg resmi UGC Logistics.
remotion/            Timeline utama: BrandFrame (logo header + website footer), Captions, EndCard, episode E01–E12.
hyperframes/         Klip H per episode (hook, morph, teks glitch), dirender sebagai WebM transparan ke remotion/public/hf/.
scripts/             ingest, manifest, sfx, stills, vo.
```

## Alur per episode

1. Aset gambar dibuat di GPT dengan prompt dari content plan, lalu dilampirkan di chat Claude bersama prompt produksi.
2. Claude menaruh file ke `inbox/eXX/` dengan nama `eXX_<nama-aset>.png`, menjalankan `npm run ingest` di `remotion/`, lalu commit dan push.
   Claude membuat voice-over (Kokoro, `scripts/vo.mjs`) dan menyusun musik orisinal dengan kode.
3. Klip HyperFrames dibangun dan dirender (`hyperframes/<eXX-klip>/index.html` → `remotion/public/hf/<eXX-klip>.webm`).
4. Komposisi Remotion episode dibangun (`remotion/src/episodes/`), lalu didaftarkan di `BESPOKE` pada `remotion/src/Root.tsx`.
5. Gambar cek: `node scripts/stills.mjs E01 0.3,1.5,5` → `remotion/out/stills/`.
6. Draft dan final: `cd remotion && npx remotion render E01 out/e01-draft.mp4`.

## Perintah

```bash
cd remotion && npm i            # sekali
npm run dev                     # Remotion Studio (menulis manifest dulu)
npm run ingest                  # pindahkan file dari inbox/ ke public/ dan perbarui manifest
bash scripts/sfx.sh             # buat ulang efek suara (disintesis FFmpeg, tanpa lisensi pihak ketiga)
pip install kokoro-onnx soundfile   # sekali per container, untuk Kokoro
node scripts/vo.mjs E01         # voice-over bahasa Inggris dengan Kokoro (on-device), satu file per beat
cd hyperframes && npx --yes hyperframes@0.8.217 render e01-hook --format webm --fps 30 -o ../remotion/public/hf/e01-hook.webm
```

## Aturan tetap

- Semua teks berada di antara y 168 dan 1330 px (zona UI TikTok/Reels). Logo y 180–300, subtitle y 1100–1250, website y 1280–1330.
- Teks, angka, logo dan URL dibuat di kode, tidak pernah di dalam gambar.
- Naskah VO dan teks layar sudah dicek fakta. Jangan menambah angka atau klaim tanpa sumber.
- Font ada di `remotion/public/fonts` (SIL Open Font License), jadi render tidak butuh internet.
- Logo saat ini masih stand-in tipografi. Taruh `logo.svg` resmi di `inbox/brand/` lalu `npm run ingest`.

## Status

- Proyek dasar siap. Produksi dimulai berurutan dari E01 setelah asetnya dikirim.
- E01–E12 saat ini kerangka timing (teks layar, subtitle, bingkai brand, efek suara), ditandai "DRAFT SCAFFOLD".
- Logo masih stand-in tipografi sampai `logo.svg` resmi diberikan.
