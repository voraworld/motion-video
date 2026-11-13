# DHL Express Service Point JDC Cengkareng: "Shipping, Unboxed."

Konsep motion story promosi, vertikal 1080×1920, 30 fps, gaya 2.5D.
Voice-over dan teks layar bahasa Inggris. Durasi master **70 detik** (35 bar @ 120 BPM).

---

## 1. Big idea

**Seluruh dunia di video ini dibuat dari bahan packing.** Kardus bergelombang, lakban, label thermal, tali price tag, stiker.
Penonton memulai video dari *dalam* sebuah kotak kuning, dan kotak itu dibuka, dilipat, dibentangkan jadi adegan demi adegan,
lalu ditutup lagi dan di-*seal* di akhir dengan label pengiriman yang berisi kontak Service Point.

Pesan intinya: kirim paket internasional itu ribet, di JDC Cengkareng ribetnya sudah "di-unbox" buat kamu.

- **Tagline layar:** `SHIPPING, UNBOXED.`
- **Kenapa 2.5D cardboard:** objek datar berlapis (papercraft) yang bergerak di ruang Z dengan parallax. Terasa 3D tanpa render 3D penuh,
  murah diproduksi di HyperFrames/Remotion (layer PNG + transform 3D CSS), dan nyambung langsung dengan dunia ekspedisi.
- **Beda dari referensi:** referensi UGC pakai split-flap dan kartu bundar melayang, referensi Vora pakai carousel kartu di lantai gelap,
  referensi Holo pakai gradien blur. Konsep ini sengaja tidak memakai satu pun dari itu.

---

## 2. Brand system (DHL)

| Token | Nilai | Pemakaian |
|---|---|---|
| DHL Yellow | `#FFCC00` | Background dominan, header band, kardus "hero" |
| DHL Red | `#D40511` | Aksen, lakban promo, laser scanner, footer band, highlight teks |
| Yellow tint | `#FFE57F`, `#FFF0B2` | Layer kedalaman (semakin jauh semakin pucat) |
| Cardboard | `#C8A26B` / shadow `#8E6B3E` | Hanya tekstur sekunder, maksimal ±15% layar supaya brand tetap kuning-merah |
| Ink | `#1A1A1A` | Teks body, garis dieline |
| White | `#FFFFFF` | Label thermal, chat bubble, teks di atas merah |

**Font:** pakai **Delivery** (font korporat DHL) kalau ada file berlisensinya dari DHL. Fallback open-license: **Archivo** (variable, ExtraCondensed ExtraBold, italic tipis −8° untuk headline "speed") + **Plus Jakarta Sans** (sudah ada di `remotion/public/fonts`) untuk body. Angka dan label teknis pakai **JetBrains Mono** (sudah ada).

**Logo:** wajib file resmi DHL Express (SVG) dari DHL brand hub / tim DHL. Jangan digambar ulang, jangan di-generate AI, jangan dianimasikan morph.
Logo merah di atas kuning, clear space minimal setinggi huruf "D". Karena ini materi Service Point partner, sebaiknya dicek ke PIC DHL soal aturan co-branding sebelum tayang.

**Gaya 2.5D:**
- 4 layer kedalaman per adegan: `BG` (yellow tint, blur 0) → `MID` (kardus/diorama) → `HERO` (objek utama) → `FX` (lakban, stiker, partikel serbuk kardus).
- Kamera virtual: `perspective: 1800px`, gerak dolly Z dan tilt maksimal 12°. Parallax rasio 0.3 / 0.6 / 1.0 / 1.3.
- Bayangan: hard drop-shadow pendek merah gelap `rgba(140,0,10,.25)` offset 0/18px, bukan soft glow. Ini yang bikin terasa "papercraft".
- Tepi objek punya ketebalan 6–10px (sisi kardus) yang ikut berubah saat objek miring: ilusi 2.5D utama.

---

## 3. Layout (tanpa safe area WA)

Safe area Status WA tidak dipakai, jadi header naik ke paling atas dan footer turun ke paling bawah.

```
y 0    ┌──────────────────────────────┐
       │  HEADER BAND kuning #FFCC00   │  logo DHL Express resmi, tinggi 64px, center, y 44–108
y 150  ├──────────────────────────────┤  garis merah 4px (ikut "bergetar" di setiap downbeat)
       │                              │
       │          STAGE 2.5D          │  y 150–1600: semua adegan, judul, objek
       │                              │
y 1600 │   caption VO (kecil)         │  y 1600–1676, Plus Jakarta Sans 34px, ink
y 1700 ├──────────────────────────────┤
       │  FOOTER BAND merah #D40511    │  y 1700–1920, teks putih:
       │  DHL Express Service Point · JDC Cengkareng      (Archivo ExtraBold 40px)
       │  [WA] +62 877-7589-7478                          (Archivo Bold 44px, ikon WA putih)
       │  Soewarna Business Park, Lot 7A–7B,              (Plus Jakarta Sans 28px)
       │  Soekarno-Hatta International Airport Area       y teks terakhir ≤ 1880
y 1920 └──────────────────────────────┘
```

Header dan footer **persisten** di semua adegan (masuk di detik 6 bersama drop musik, diam selama video).
Tepi atas footer bukan garis lurus, tapi potongan **sobekan lakban merah** (zig-zag halus) supaya tetap satu dunia dengan konsep.

---

## 4. Musik

**Struktur "epic → pop":** intro sinematik 6 detik, lalu drop ke pop ceria up-beat. 120 BPM, kunci E mayor, 1 bar = 2 detik.
Semua potongan adegan jatuh tepat di garis bar.

| Waktu | Bagian | Isi |
|---|---|---|
| 0:00–0:06 | Epic intro | Taiko rendah, string ostinato, choir pad tanpa lirik, riser, *boom* di 0:05.5 |
| 0:06–0:30 | Pop verse | Four-on-the-floor, clap, bass synth pluck, chord piano terang, "hey" claps |
| 0:30–0:38 | Breakdown | Drum turun, hanya pluck + pad (ruang buat adegan "No registration") |
| 0:38–0:52 | Chorus | Full: synth lead hook, string stab, tambourine |
| 0:52–1:00 | Post-chorus | Groove lebih tipis, arpeggio "terbang" (adegan lokasi + pesawat) |
| 1:00–1:10 | Final lift + button | Semua instrumen, chord akhir di 1:08, ring-out 2 detik |

- Bisa disusun orisinal pakai `scripts/music.py` (perlu ditambah preset "pop"), atau track royalty-free berlisensi dengan BPM 118–124.
- VO di-*duck* −10 dB di bawah musik. Target loudness master −14 LUFS.

**SFX (disintesis, `scripts/sfx.sh`):** lakban ditarik (rip), kardus dijatuhkan (thud), stempel, beep scanner, printer label thermal (whirr), sticker slap, pesawat (whoosh), bubble chat (pop).

---

## 5. Voice-over

Bahasa Inggris, hangat dan ceria, tempo santai (±2.2 kata/detik). Kokoro: `af_heart` speed 1.0 (alternatif `am_michael`).

**Pelafalan:** tulis di naskah TTS secara fonetik.
`Cengkareng` → "Cheng-kah-reng", `Soewarna` → "Soo-war-nah", `Soekarno-Hatta` → "Soo-kar-no Hah-tah", `JDC` → "J. D. C.",
nomor dibaca "zero eight seven seven, seven five eight nine, seven four seven eight".

---

## 6. Beat sheet

Format: waktu · VO · teks layar (OST) · visual · transisi keluar.

### B1 · 0:00–0:06 · HOOK, "Inside the box"
- **VO (0:00.8):** "Shipping overseas? It just got a whole lot easier."
- **OST:** `SHIPPING OVERSEAS?` lalu `MADE EASY.`
- **Visual:** layar gelap kecokelatan. Kita di **dalam kardus** (POV). Garis cahaya kuning tipis di celah flap atas.
  Teks `SHIPPING OVERSEAS?` di-stensil (gaya cat semprot peti kargo) di dinding dalam kardus, huruf muncul per huruf dengan *spray fade*.
  Di "easier" lakban di atas kepala **robek** (SFX rip).
- **Transisi keluar (T1, "Flap burst"):** empat flap kardus membuka ke arah kamera dengan engsel 3D, cahaya kuning DHL membanjiri layar,
  kamera dolly naik keluar dari kotak. Bersamaan dengan *boom* dan drop musik di 0:06. Header & footer meluncur masuk dari tepi atas/bawah.

### B2 · 0:06–0:12 · INTRO
- **VO:** "Meet DHL Express Service Point, JDC Cengkareng."
- **OST:** `SERVICE POINT` / `JDC CENGKARENG` + kecil `Jakarta Distribution Center`
- **Visual:** kardus yang baru terbuka sekarang terlihat dari atas dalam isometrik, berputar pelan. Teks muncul **dari printer label thermal** 2.5D
  (slot printer di tengah stage, label putih keluar baris demi baris dengan SFX whirr), lalu label terkelupas dan **menempel** di sisi kardus (sedikit melengkung mengikuti permukaan).
- **Transisi keluar (T2, "Tape zip"):** dispenser lakban kuning-merah meluncur horizontal melintasi layar; strip lakban menutup frame,
  lalu disobek dari ujung kiri: di bawah sobekan sudah adegan B3.

### B3 · 0:12–0:22 · BENEFIT 01, Book anywhere, anytime
- **VO:** "Book your shipment from anywhere, at any time. At home, at the office, or on the go."
- **OST:** nomor stensil `01` + `BOOK ANYWHERE.` `BOOK ANYTIME.`, chip kecil `HOME` · `OFFICE` · `ON THE GO`
- **Visual, carousel anti-mainstream "Sorting conveyor":** sabuk roller conveyor melengkung (2.5D, berbentuk huruf U yang dilihat dari depan atas).
  Tiga **diorama kardus mini** ikut berjalan di atas sabuk: ruang tamu dengan sofa, meja kantor, mobil di jalan.
  Setiap diorama berhenti di bawah **gerbang scanner** di tengah: laser merah menyapu, beep, dan sebuah tag waktu tercetak (`07:30`, `13:00`, `22:45`).
  Di setiap diorama ada ponsel kecil yang sama dengan bubble chat menyala: menegaskan cukup lewat chat, dari mana saja.
- **Transisi keluar (T3, "Barcode scan"):** laser scanner membesar jadi garis merah selebar layar, menyapu dari atas ke bawah;
  area yang sudah dilewati laser langsung menjadi adegan B4 (efek "di-scan masuk").

### B4 · 0:22–0:30 · BENEFIT 02, Competitive rates + promo
- **VO:** "Enjoy competitive rates, plus special promotional discounts. Just ask us about the current promo."
- **OST:** `02` + `COMPETITIVE RATES` lalu sticker `+ SPECIAL PROMO DISCOUNTS`
- **Visual:** **price tag** kardus raksasa tergantung di tali, berayun dengan fisika pendulum (ketebalan tepi terlihat saat berputar).
  Simbol **`%` dibentuk dari dua gulungan lakban merah dan satu strip lakban diagonal** yang ditarik di antaranya.
  Sticker merah bulat `PROMO` di-*slap* ke tag (SFX slap), sudutnya sedikit melengkung lalu rata.
  Tidak ada angka diskon apa pun di layar.
- **Transisi keluar (T4, "String pull"):** tali price tag ditarik keluar frame ke atas, menyeret seluruh adegan B4 bersamanya
  (whip pan vertikal dengan motion blur arah tali), adegan B5 sudah menunggu di bawah.

### B5 · 0:30–0:38 · BENEFIT 03, No registration
- **VO:** "And there's no registration needed. Skip the sign-up, completely."
- **OST:** `03` + `NO REGISTRATION` (kata `REGISTRATION` lalu dicoret **strip lakban merah** yang ditempel miring) + `NEEDED.`
- **Visual:** formulir pendaftaran super panjang (kolom-kolom kosong tanpa isi data, cuma label generik: Name, Company, Password, Confirm password, ...)
  berdiri sebagai panel-panel kardus. Pada breakdown musik, panel-panel itu **jatuh ke belakang seperti domino** satu per satu (tilt X 0 → 90°),
  berdebu serbuk kardus. Dari tumpukan terakhir, muncul **satu bubble chat WhatsApp** putih yang melambung pelan.
- **Transisi keluar (T5, "Shred to chat"):** formulir yang rebah masuk ke celah mesin penghancur kertas; potongan-potongan stripnya
  keluar di sisi lain dan **menyusun diri** jadi tiga bubble chat, membuka adegan B6.

### B6 · 0:38–0:52 · HOW IT WORKS (3 langkah)
- **VO:** "Just send us a WhatsApp message, tell us what you need to ship, and we'll prepare everything, all the way to done."
- **OST:** tiga langkah, masing-masing di panel *dieline* kardus bernomor:
  `01 CHAT ON WHATSAPP` · `02 TELL US WHAT YOU'RE SHIPPING` · `03 WE PREPARE EVERYTHING, START TO FINISH`
- **Visual:** ponsel 2.5D miring 10°, thread chat (diberi tag kecil `SAMPLE CHAT`). Setiap bubble yang terkirim **keluar dari layar ke ruang Z**
  dan berubah wujud (morph):
  bubble "Hi! I'd like to ship something." → *dieline* kardus datar →
  bubble deskripsi barang → dieline **melipat sendiri jadi kotak** →
  bubble balasan "Got it, we'll prepare everything." → kotak dilakban, label menempel, centang merah stempel.
  Tiga panel langkah tersusun seperti sisi-sisi kotak terbuka (dieline salib) lalu **melipat menjadi satu kubus** di akhir chorus.
- **Transisi keluar (T6, "Pin dive"):** bubble terakhir berubah jadi bubble *location* WhatsApp; kamera **menyelam masuk ke pin** di dalamnya
  dan keluar di atas diorama peta B7.

### B7 · 0:52–1:00 · LOCATION
- **VO:** "Find us at Soewarna Business Park, Lot 7A to 7B, in the Soekarno-Hatta International Airport area."
- **OST:** `FIND US` + `Soewarna Business Park` / `Lot 7A–7B` / `Soekarno-Hatta Int'l Airport Area`
- **Visual:** diorama isometrik kardus (ilustratif, bukan peta akurat): landasan pacu, blok-blok business park.
  Satu blok terangkat dan berubah kuning, pin kertas lipat merah jatuh di atasnya dengan bounce, label `LOT 7A–7B` tercetak.
  Pesawat kardus kecil taxi di landasan lalu **lepas landas** melintas diagonal.
- **Transisi keluar (T7, "Contrail stripes"):** jejak asap pesawat berubah jadi garis-garis merah horizontal ala *speed stripes* yang menyapu layar
  dan membuka end card.

### B8 · 1:00–1:10 · END CARD, "Seal it"
- **VO:** "DHL Express Service Point, JDC Cengkareng. WhatsApp us today: 0877 7589 7478."
- **OST:** kotak kuning menutup flapnya, dilakban, lalu **label pengiriman besar** dicetak dan ditempel di permukaannya berisi:
  `SERVICE POINT JDC CENGKARENG` / tombol putih bergaris merah `CHAT ON WHATSAPP` / `+62 877-7589-7478` (besar, JetBrains Mono) /
  barcode dekoratif (bukan kode nyata). Tagline `SHIPPING, UNBOXED.` muncul di atas kotak di 1:06.
- **Detail:** nomor WA disorot laser scanner merah satu kali saat VO menyebut nomor. Footer berkedip putih sekali (pulse) supaya mata turun ke kontak.
- **Akhir:** chord terakhir 1:08, kotak memantul kecil, freeze 2 detik untuk screenshot.

---

## 7. Ringkasan elemen anti-mainstream

| Jenis | Yang dipakai | Yang sengaja dihindari |
|---|---|---|
| Dekorasi | Serbuk kardus, strip lakban, stiker, dieline putus-putus, tanda "this side up" / "fragile" ikonik (tanpa teks) | Blob gradien, glassmorphism, lens flare, partikel bokeh |
| Transisi | Flap burst, tape zip, barcode scan, string pull, shred-to-chat, pin dive, contrail stripes | Slide/push standar, zoom blur generik, glitch, split-flap |
| Carousel | Sorting conveyor dengan gerbang scanner | Kartu bundar melayang di lingkaran |
| Morph | Bubble chat → dieline → kotak; formulir → strip → bubble; lakban → `%` | Shape morph lingkaran-ke-kotak biasa |
| Kinetic type | Stensil semprot, printer label thermal, coretan lakban, huruf di panel dieline | Teks typewriter, teks fade-up |

---

## 8. Daftar aset gambar (dibuat di GPT, lalu di-ingest)

Gaya bersama untuk semua prompt:
> *2.5D papercraft object built from corrugated cardboard and colored card stock, palette strictly bright yellow #FFCC00, signal red #D40511, white and natural kraft brown, visible cardboard edge thickness, crisp short hard shadow, soft studio light, isolated on plain white background, front three-quarter view, no text, no letters, no numbers, no logos.*

| File | Objek |
|---|---|
| `jdc_box-hero.png` | Kardus kuning tertutup (dan versi `jdc_box-open.png` flap terbuka) |
| `jdc_conveyor.png` | Segmen sabuk roller conveyor melengkung + gerbang scanner kosong |
| `jdc_diorama-home.png` / `-office.png` / `-car.png` | Tiga diorama mini di atas palet kardus |
| `jdc_phone.png` | Smartphone kardus/kertas, layar kosong (isi chat dibuat di kode) |
| `jdc_pricetag.png` | Price tag kardus dengan lubang dan tali, kosong |
| `jdc_taperoll-red.png` | Gulungan lakban merah |
| `jdc_shredder.png` | Mesin penghancur kertas papercraft |
| `jdc_airport-diorama.png` | Diorama isometrik landasan dan blok business park generik |
| `jdc_plane.png` | Pesawat kargo papercraft polos (tanpa livery, tanpa logo) |
| `jdc_pin.png` | Pin lokasi kertas lipat merah |

Semua teks, nomor, alamat, chat dan logo dibuat di kode, tidak pernah di dalam gambar.

---

## 9. Rencana produksi di repo ini

| Bagian | Engine | Catatan |
|---|---|---|
| Header/footer DHL | Remotion | Komponen `DhlFrame` baru (jangan ubah `BrandFrame` UGC) |
| B1 hook, T1 flap burst | HyperFrames | GSAP + CSS 3D, render WebM transparan ke `remotion/public/hf/jdc-hook.webm` |
| Printer label, tape zip, barcode scan | HyperFrames | Klip transisi reusable |
| B3 conveyor, B6 chat morph, B7 diorama | Remotion | Layer PNG + `interpolate`/`spring`, kamera 3D via wrapper `perspective` |
| B8 end card | Remotion | Kontak dari satu konstanta supaya tidak typo |
| VO | `scripts/vo.mjs` | Satu file per beat |
| Musik | `scripts/music.py` (preset pop baru) | Atau track berlisensi 120 BPM |

**Durasi & WA Status:** master 70 detik. Kalau batas durasi Status WhatsApp di akun kamu lebih pendek, WA akan memotong/memecah videonya.
Opsi: cutdown **30 detik** (B1 → B3 → B4 → B5 dipadatkan → B8) untuk Status, master 70 detik untuk Reels/TikTok/YouTube Shorts/broadcast WA.

---

## 10. Yang perlu dikonfirmasi sebelum produksi

1. File logo resmi **DHL Express** (SVG) dan izin co-branding Service Point dari DHL.
2. Font **Delivery**: ada file berlisensi atau pakai fallback Archivo?
3. Promo: tetap tanpa angka (aman, evergreen) atau ada angka/periode promo resmi yang mau ditampilkan?
4. "Anytime": booking via WA 24 jam, atau ada jam operasional yang perlu ditulis kecil?
5. Musik: disusun orisinal dengan kode, atau sudah punya track berlisensi?
