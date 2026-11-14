# Perlindungan video JDC Cengkareng dari edit ulang

Tujuannya: service point lain tidak bisa dengan mudah mengganti "JDC Cengkareng", nomor WhatsApp atau alamat dengan miliknya sendiri.

Tidak ada video yang 100% tidak bisa diedit. Yang bisa dilakukan adalah membuat penggantian nama **sangat mahal** (harus rotoscoping frame demi frame dan membuat ulang seluruh audio) dan **mudah ketahuan** kalau ada yang mencoba.

## 1. Di dalam gambar

| Lapisan | Di mana | Kenapa sulit diganti |
|---|---|---|
| Nama di objek 3D | Lakban di flap kardus (adegan 1), lakban dan label di box (2, 9), price tag "JDC" (4), bubble chat "Hi, JDC Cengkareng!" (5), papan nama gedung dan sisi van "JDC CENGKARENG · PICKUP" (6), header chat, nomor dan label di box (7), label pin lokasi (8), layar HP yang mengetik nomor dan kartu kontak "JDC Cengkareng" (9), kartu carousel berisi semua adegan (transisi) | Teksnya ikut berputar, miring, kena bayangan dan tertutup objek lain. Menutupnya harus frame demi frame mengikuti perspektif. |
| Micro-print latar | Seluruh latar dari detik 0–86: teks kecil diagonal "JDC CENGKARENG · SERVICE POINT · +62 877-7589-7478 · SOEWARNA BUSINESS PARK LOT 7A–7B" | Teksnya bergerak terus di belakang semua objek, jadi tidak bisa ditambal dengan gambar diam. Mengganti nama berarti membuat ulang seluruh latar. |
| Reveal nama | Detik 9: huruf JDC CENGKARENG terlempar dari kardus, berputar dan mendarat, dengan cahaya dan konfeti di atasnya | Setiap huruf bergerak sendiri-sendiri di jalur melengkung; tidak bisa ditimpa teks lain tanpa animasi ulang per huruf. |
| Header | Logo plus baris "SERVICE POINT · JDC CENGKARENG", latar garis diagonal bergerak | Ada animasi di belakang teks, jadi kotak penutup langsung kelihatan. |
| Footer kartu label | Nama, alamat, nomor, chip pickup, strip micro-text bergulir, kilau yang melintas tiap 8 detik, garis diagonal bergerak | Ada tiga elemen bergerak di belakang dan di atas teks. Tambalan statis akan memotong kilau dan micro-text. |
| Transisi carousel | Setiap pergantian adegan, semua adegan (yang berisi nama, nomor dan alamat) berputar sebagai kartu 3D; di detik 70,6–72,5 kesembilan kartu berputar satu putaran penuh | Nama muncul di banyak kartu sekaligus dalam perspektif dan blur gerak. |
| Elemen grafis | Ikon, ring, konfeti dan percikan yang menempel ke objek tiap adegan | Bergerak di atas dan sekitar area yang mungkin ditambal. |
| Caption | Kata per kata, termasuk nama dan nomor | Sinkron dengan suara. Kalau suaranya diganti, caption-nya ikut salah. |

## 2. Di dalam audio

- Voice-over menyebut "JDC Cengkareng" 3 kali dan membacakan nomor WhatsApp satu per satu.
- VO, musik dan efek suara digabung jadi satu track. Musiknya otomatis mengecil setiap ada narasi, jadi VO tidak bisa dipotong tanpa merusak musik.
- Stem audio terpisah (VO, musik, SFX) **jangan dibagikan**. Tanpa stem, mengganti nama di audio berarti membuat ulang seluruh audio.

## 3. Di dalam file

- Metadata MP4 berisi judul, pemilik, hak cipta dan ID `JDC-CGK-2026-11-V1`.
- File `.sha256` berisi sidik jari file asli. Kalau ada versi yang beredar, bisa dicek: hash berbeda berarti file sudah diubah.
- Metadata gampang dihapus orang, jadi anggap ini bukti pendukung, bukan perlindungan utama.

## 4. Cara distribusi yang disarankan

1. Upload pertama di akun resmi JDC Cengkareng (Instagram, TikTok, WhatsApp Business). Tanggal upload itu jadi bukti siapa pemilik pertama.
2. Bagikan hanya file MP4 final. Jangan bagikan folder project, aset 3D, PNG, logo SVG, stem audio atau file render mentah.
3. Simpan file asli dan file `.sha256` di tempat aman (misalnya Google Drive pribadi).
4. Kalau menemukan versi editan: simpan link dan tanggalnya, bandingkan dengan file asli (nama dan nomor di lakban, papan nama, van, chat, micro-print), lalu laporkan ke platform atau ke PIC DHL area.
5. Repo `voraworld/motion-video` berisi source lengkap. Pastikan repo-nya **private**.
