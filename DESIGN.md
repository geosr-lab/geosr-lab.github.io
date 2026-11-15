# DESIGN.md: sistem tampilan GeoSR

Dibaca sebelum mengubah tampilan situs (manusia maupun AI). Berkas ini merangkum aturan yang sudah berlaku di [`docs/assets/gaya.css`](docs/assets/gaya.css) dan "Aturan tulisan dan tampilan" di [`.claude/rencana.md`](.claude/rencana.md). Kalau ada perbedaan, `gaya.css` yang berlaku, lalu berkas ini diperbarui. Ditulis November 2026.

## Karakter

GeoSR terasa seperti lembar data laboratorium dan log bor: tinta gelap di kertas milimeter, warna dari lapisan tanah, dan angka hasil berwarna laterit. Gambar dan animasi berasal dari dunia mekanika tanah (sketsa alat uji, penampang tanah, kurva aliran), dibuat sendiri dengan SVG/CSS. Situs ini alat kerja mahasiswa, bukan halaman promosi: isi langsung, angka bisa dicek, sumber selalu disebut.

## Warna

Token di `:root`. Tema gelap ditulis dua kali: di `@media (prefers-color-scheme: dark)` dengan `:root:not([data-tema="terang"])`, dan di `:root[data-tema="gelap"]`. Pilihan pengguna disimpan oleh `tema.js`.

| Token | Terang | Gelap | Peran |
|---|---|---|---|
| `--latar` | `#f1f2ec` | `#10181a` | Kertas lab, latar halaman |
| `--permukaan` | `#fbfbf8` | `#162124` | Kartu, tabel, isian |
| `--permukaan-2` | `#e8eae1` | `#1e2c2f` | Permukaan kedua |
| `--garis` | `#d2d6ca` | `#2d3e41` | Garis tipis, batas kartu |
| `--teks` | `#1c2427` | `#e5e8e1` | Tinta utama |
| `--teks-2` | `#515a5b` | `#a2aca6` | Keterangan, label |
| `--aksen` | `#1d6a63` | `#62c7b8` | Lempung gley: tautan, tombol utama, fokus |
| `--laterit` | `#a3401f` | `#ee966b` | Tanah laterit: angka hasil dan sorotan data |
| `--lapis-1` … `--lapis-6` | lanau, lempung, laterit, pasir, lempung kaku, gambut | versi gelap | Warna enam kelompok uji (pita kartu, chip, ikon) |
| `--sukses`, `--peringatan`, `--galat` | | | Status; peringatan kuning = cek kewajaran, bukan ketentuan standar |

- Semua pasangan teks/latar ≥ 4,5:1 (WCAG AA); dicek terang dan gelap.
- Kisi milimeter (`--kisi-halus`, `--kisi-tebal`) hanya di hero dan bidang grafik, bukan di seluruh latar.
- Jangan menambah warna baru tanpa token terang dan gelapnya.

## Huruf

| Peran | Huruf | Aturan |
|---|---|---|
| Judul, angka besar | Archivo (variabel lebar, lokal `docs/assets/font/`) | `font-stretch` 104–122%, berat 700–800, `letter-spacing` sedikit negatif |
| Teks, label, tabel | Plus Jakarta Sans 400/600/700/800 (lokal) | 16 px, `line-height` 1,6 |

Skala: h1 `clamp(30px, 4vw, 40px)` (judul beranda 44–92 px), h2 `clamp(22px, 2.4vw, 27px)`, h3 18 px, lead 17–19 px, teks 16 px, tombol 15 px (kecil 14 px), label minimal 13 px. Angka di tabel dan hasil memakai `font-variant-numeric: tabular-nums`.

Panjang baris teks bacaan paling banyak 42em (±80 karakter); lead 64ch.

## Jarak dan bentuk

- Skala jarak `--j-1` … `--j-8`: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 72 px.
- Radius: 8 px kartu (`--radius`), 6 px tombol dan isian, 4 px chip dan lencana, 999 px hanya untuk chip daftar lompat. Radius lain (2, 3, 5, 11–14 px) hanya untuk detail kecil seperti kotak warna dan sakelar.
- Wadah konten maksimal 1120 px, tepi 16 px (ponsel) dan 28 px (≥ 720 px).
- Titik patah utama: 720 px (menu lipat, tata letak satu kolom) dan 560 px (ponsel kecil); sisanya per komponen (420, 520, 640, 760, 820, 880, 900, 1060 px). Semua halaman wajib tanpa gulir horizontal di 390 px.

## Komponen

- **Kartu** `.kartu`: permukaan, garis 1 px, radius 8. Kartu yang berupa tautan (`a.kartu`) punya pita kiri 5 px berwarna kelompok (seperti contoh inti bor) yang melebar saat disorot. Satu gaya kartu untuk seluruh situs; jangan membuat varian bayangan baru.
- **Tabel**: garis bawah tipis, angka rata kanan dan tabular, tabel panjang menggulir di dalam `.tabel-gulir` dengan kepala menempel.
- **Tombol** `.tombol`: sekunder bergaris; `.utama` berlatar aksen dengan bayangan bawah 2 px; `.kecil` untuk aksi sekunder. Saat ditekan turun 1 px.
- **Chip** `.chip`: kotak warna kelompok 8 px di kiri; dipakai untuk kategori dan acuan SNI.
- **Tab** halaman praktikum: garis bawah yang bergeser ke tab aktif; tersimpan di URL (`#data`, `#hasil`).
- **Sketsa** `figure.sketsa`: SVG garis buatan sendiri (`docs/assets/praktikum/sketsa.js`), bingkai kertas milimeter.
- **Grafik**: SVG dari `grafik.js` (praktikum) atau ditulis di berkas tampilan kalkulator; sumbu dan label memakai warna token.
- **Hasil hitungan**: urutan diketahui → ditanya → penyelesaian (rumus, sumber, substitusi) → hasil dan penjelasan → catatan. Desimal koma, ribuan titik.

## Gerak

- Gerak hanya **menjawab aksi** (klik, ketik, buka tab) atau berjalan **sekali saat pertama terlihat**. Tidak ada animasi muncul di setiap bagian.
- Interaksi ≤ 600 ms; kurva `--mulus` (`cubic-bezier(.2, .7, .2, 1)`).
- Keadaan akhir selalu tampil lebih dulu: elemen tidak boleh mulai kosong atau pudar lalu muncul (lihat `Sketsa.sapa`, penampang beranda, alur Atterberg).
- Animasi berhenti saat tab tersembunyi; `prefers-reduced-motion: reduce` menampilkan keadaan akhir tanpa gerak.
- Transisi antarhalaman memakai View Transitions bila didukung.
- Contoh yang sudah benar: alur "Dari lembar lab ke laporan" di beranda (`alur-atterberg.js`), angka hasil yang menghitung naik, garis tab yang bergeser.

## Teks

- Bahasa Indonesia santai tapi rapi. Nama tombol menyebut aksinya ("Muat data contoh", "Buka di alat Atterberg").
- Desimal koma dan ribuan titik; aturan angka panduan laporan (berat dan volume 3 desimal, persen 2 desimal, Gs dan berat isi 3 desimal).
- Galat menjelaskan apa yang salah dan cara memperbaikinya, tanpa minta maaf.
- Setiap rumus menyebut sumbernya (Aturan Sumber di rencana).

## Larangan

Ciri template dan tulisan AI yang tidak dipakai:
- Label kecil berhuruf kapital berspasi di atas judul (eyebrow), titik tengah sebagai hiasan di antara label, panah "→" di teks tautan.
- Latar krem dengan aksen oranye bata; kartu bundar seragam dengan bayangan sama; gradasi sebagai hiasan; cahaya (glow) dekoratif; pil status acak.
- Animasi muncul di setiap bagian; latar video atau 3D.
- Pembuka kosong, kata penekanan tanpa angka (sangat, krusial, signifikan), daftar tiga hal yang dipaksakan, nada iklan.
- Gambar atau video buatan AI. Aset luar hanya berlisensi jelas (CC0, CC BY, MIT, OFL, dsb.), disimpan lokal, dicatat di `docs/assets/kredit.json`.
- Memuat aset dari CDN.

## Pemeriksaan setiap perubahan tampilan

1. `python skrip/bangun_situs.py` lalu `--periksa`, dan semua `tests/verifikasi_*.py`.
2. Browser 390 px dan 1280 px, terang dan gelap: tanpa gulir horizontal, 0 `.katex-error`, 0 galat konsol.
3. Fokus papan ketik terlihat; tombol dan isian punya label.
4. Naikkan `version` di `CITATION.cff` bila aset berubah (versi cache service worker), tulis entri `CHANGELOG.md`.
