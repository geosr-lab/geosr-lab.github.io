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
- Pengecualian yang disengaja (keputusan Defsa, 15 Nov 2026): Penampang GeoSR (`penampang.js`, hero beranda dan `/penampang/`) bergerak terus tanpa ujung dan interaktif. Syaratnya: berhenti saat tab tersembunyi atau di luar layar, diam saat `prefers-reduced-motion`, ada sakelar "Gerak otomatis", dan isinya juga tersedia sebagai daftar tautan biasa.

## Cahaya dan kedalaman

Keputusan Defsa, 15 November 2026: tampilan datar terasa seperti buatan AI, jadi gradasi, bayangan, cahaya, dan color grading dipakai **bila memodelkan cahaya atau materi**, bukan sebagai hiasan acak.
- Satu sumber cahaya: kiri atas, hangat. Bayangan jatuh ke kanan bawah, dingin. Color grading di kanvas penampang: lapisan `soft-light` hangat (kiri atas) ke teal gelap (kanan bawah), lalu vinyet.
- Tanah: makin dalam makin gelap dan dingin; tiap lapisan bergradasi terang di atas ke gelap di bawah; lapisan atas menaungi lapisan bawah (bayangan di bawah batas); tanah di bawah muka air tanah sedikit kebiruan (jenuh). Butir dan kerikil punya bayangan jatuh, sisi terang, dan kilap.
- Tema gelap adalah malam: bulan dan bintang, butir berpendar tipis dengan warna lapisannya.
- Antarmuka di atas kanvas memakai kaca buram (`--kaca`, `backdrop-filter`). Kartu dasbor (`.petak`) memakai `--cahaya-atas` (garis terang 1 px di tepi atas), `--bayang-dalam`, dan sorot lembut yang mengikuti kursor (`--mx`, `--my`, diisi `gerak.js`).
- Warna turunan dihitung dari token (campuran dengan putih atau hitam), bukan warna baru tanpa pasangan gelap.
- Berlaku di seluruh situs (token `--kilap`, `--kilap-tipis`, `--cekung`): tombol seperti tuts timbul (tebal 3 px, turun saat ditekan); isian sedikit cekung; kartu dan panel bercahaya dari atas dengan sorot kursor; pita kelompok dan kotak warna seperti silinder inti bor (terang kiri, gelap kanan); hero tiap halaman disinari dari kiri atas.
- Sketsa alat: isian bentuk memakai filter SVG `#geosr-timbul` (cahaya difus dan kilap dari azimut 225°, bayangan jatuh), garis memakai `#geosr-garis`. Filter disisipkan `gerak.js`, lalu kelas `ada-timbul` dipasang di `<html>`; tanpa skrip sketsa tetap datar dan utuh.
- Grafik hanya di layar: bidang plot disinari, garis data dan titik berbayang. Ekspor PNG dan Word memakai gaya inline, jadi tidak berubah.

## 3D

Keputusan Defsa, 15 November 2026: beberapa elemen dibuat 3D, bukan hanya 2D, asal bermakna dan bisa dipakai.
- Mesin 3D: three.js r147 dan OrbitControls (MIT), disimpan lokal di `docs/assets/vendor/three/` dan dicatat di `kredit.json` (izin Defsa 15 Nov 2026). Hanya dimuat di halaman yang punya model 3D. `adegan3d.js` menyeragamkan semua adegan: cahaya langit + matahari kiri atas dengan bayangan lembut + cahaya isi dingin, tone mapping ACES (color grading), kabut warna latar, lantai kertas milimeter, kamera orbit berredam dengan sudut tegak dibatasi (bentuk tidak pernah terlihat dari bawah atau terbalik), warna dari token dan ikut tema.
- Model dibangun dari bentuk dasar three.js di kode (kotak, silinder, lathe, kerucut) dengan tekstur kanvas buatan sendiri, bukan model unduhan. Benda yang isinya penting digambar terpotong (mould Proctor, tanah di bawah mesin sondir).
- Blok tanah 3D di dasbor beranda (`blok3d.js`): sepuluh lempeng tanah bertekstur di atas lantai milimeter. Seret untuk memutar, klik lempeng atau nomor lapisan untuk menariknya keluar seperti laci dengan pin alat berlabel, "Urai lapisan" merenggangkan semua lempeng. Panel di bawahnya berisi tautan alat (bisa dipakai papan ketik). Kotak cari beranda menyorot pin yang cocok; alat yang terakhir dibuka bercincin laterit. Gulir halaman tidak dibajak (zoom mati di beranda).
- Model 3D alat praktikum (`alat3d.js`, daftar `ALAT_3D` di `bangun_situs.py`): di tab Pengantar, di atas sketsa 2D; sketsa tetap tersedia (tombol "Sketsa 2D") dan dipakai saat cetak atau tanpa WebGL. Sudah ada untuk semua 18 alat praktikum dan keenam kalkulator (di kepala halaman kalkulator, kolom kanan). Animasi mengikuti langkah di `praktikum.json` (Proctor: 3 lapis × 25 tumbukan; sondir: dibaca setiap 20 cm; tekan bebas: dibaca setiap 30 detik sampai runtuh; konsolidasi: beban ditambah setelah 24 jam). Garis atau angka yang bukan data diberi keterangan "ilustrasi".
- Kartu kecil (kartu alat, katalog praktikum, "Lanjutkan") miring paling banyak 5° ke arah kursor dengan perspektif 700 px. Petak dasbor yang besar tidak dimiringkan.
- Cahaya 3D mengikuti aturan "Cahaya dan kedalaman": cahaya tetap di kiri atas pembaca, sisi atas terang dan hangat, sisi samping gelap dan dingin.
- Semua gerak 3D mati saat `prefers-reduced-motion` dan berhenti saat tab tersembunyi atau di luar layar.

## Teks

- Bahasa Indonesia santai tapi rapi. Nama tombol menyebut aksinya ("Muat data contoh", "Buka di alat Atterberg").
- Desimal koma dan ribuan titik; aturan angka panduan laporan (berat dan volume 3 desimal, persen 2 desimal, Gs dan berat isi 3 desimal).
- Galat menjelaskan apa yang salah dan cara memperbaikinya, tanpa minta maaf.
- Setiap rumus menyebut sumbernya (Aturan Sumber di rencana).

## Larangan

Ciri template dan tulisan AI yang tidak dipakai:
- Label kecil berhuruf kapital berspasi di atas judul (eyebrow), titik tengah sebagai hiasan di antara label, panah "→" di teks tautan.
- Latar krem dengan aksen oranye bata; kartu bundar seragam dengan bayangan sama; gradasi atau cahaya (glow) yang tidak memodelkan cahaya atau materi (lihat "Cahaya dan kedalaman"); pil status acak.
- Animasi muncul di setiap bagian; latar video; 3D sebagai hiasan yang tidak bisa dipakai (lihat "3D").
- Pembuka kosong, kata penekanan tanpa angka (sangat, krusial, signifikan), daftar tiga hal yang dipaksakan, nada iklan.
- Gambar atau video buatan AI. Aset luar hanya berlisensi jelas (CC0, CC BY, MIT, OFL, dsb.), disimpan lokal, dicatat di `docs/assets/kredit.json`.
- Memuat aset dari CDN.

## Pemeriksaan setiap perubahan tampilan

1. `python skrip/bangun_situs.py` lalu `--periksa`, dan semua `tests/verifikasi_*.py`.
2. Browser 390 px dan 1280 px, terang dan gelap: tanpa gulir horizontal, 0 `.katex-error`, 0 galat konsol.
3. Fokus papan ketik terlihat; tombol dan isian punya label.
4. Naikkan `version` di `CITATION.cff` bila aset berubah (versi cache service worker), tulis entri `CHANGELOG.md`.
