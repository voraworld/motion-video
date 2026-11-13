# Clay lab

Pabrik aset clay 3D untuk promo JDC Cengkareng (Three.js 0.169.0, render headless di Chromium).

- `factory.html`: semua builder aset (A01–A24, I01–I06, N01–N03, D01–D02) + plate A03.
- `render.cjs`: render ke `inbox/jdc/jdc_<KODE>_<nama>.png` (PNG transparan 1024px; A03 1024×1536; A07, A21, D01, D02 1536×1024).
- `ArchivoBlack.ttf`: dikonversi dari `remotion/public/fonts/ArchivoBlack-400.woff2` (SIL OFL) untuk angka 3D.

```bash
cd jdc-cengkareng/clay-lab && npm i
python3 -m http.server 8765 &      # sajikan folder ini
node render.cjs                    # semua aset, atau: node render.cjs A04 A07
```
