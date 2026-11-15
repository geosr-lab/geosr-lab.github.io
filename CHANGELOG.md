# Catatan perubahan

Semua perubahan penting dicatat di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan nomor versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Belum dirilis]

### Ditambahkan
- Kalkulator tiang bor N-SPT, pondasi dangkal, dan penurunan konsolidasi dengan langkah hitungan.
- Bank soal latihan geoteknik dengan angka acak dan pembahasan.
- Enam belas alat pengolah data Praktikum Mekanika Tanah dengan ekspor Word dan Excel.
- Alat permeabilitas tinggi tekan tetap dan tinggi tekan turun; alat saringan, hidrometer, CBR, pemadatan, UCS, dan geser langsung disesuaikan dengan form lab (versi cache 0.9.1 supaya browser memuat skrip baru).
- Kotak NIM di setiap alat praktikum: dua digit terakhir NIM dibagi 100 ditambahkan ke kolom data individu sesuai aturan asisten lab, dan NIM ikut di cetak, Word, dan Excel.
- Contoh data dari contoh laporan praktikum di semua alat, uji `tests/verifikasi_contoh_laporan_*.py` yang mencocokkan hasil alat dengan angka laporan, blok belajar per pengujian, dan catatan "Beda dengan contoh laporan" bila laporan salah hitung.
- Registri alat `konten/alat.json`, `skrip/buat.py`, uji registri, dan workflow yang membangun ulang situs saat `konten/` berubah.
- Skill proyek `/tambah-alat`, `/tambah-catatan`, `/tambah-soal`, `/audit-rumus`, `/rilis`, dan `PANDUAN.md`.
- Pencarian seluruh situs (`/cari/`), mode offline dengan service worker, tombol "Laporkan salah hitung" di setiap alat, dan lencana status sumber dari registri.
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, terjemahan resmi), templat Issue dan PR, `CITATION.cff`, Dependabot untuk GitHub Actions.

### Diubah
- Sistem desain GeoSR: skala jarak 4–72 px, judul halaman ±40 px di desktop dan ±30 px di ponsel, label minimal 13 px, satu gaya kartu, tombol tema (ikut sistem, terang, gelap) yang tersimpan di browser, dan ikon kelompok pengujian yang digambar sendiri. Versi cache 0.12.0.
- Nama situs menjadi GeoSR (Geotechnical Soil Report). Menu utama: Praktikum, Kalkulator, Latihan, Cari, dengan menu lipat di layar sempit. Profil, catatan belajar, cara memakai AI, dan skill dipindah ke `/pembuat/` dan hanya ditautkan dari kaki halaman; alamat lama mengarah ke alamat baru. Status sumber pindah ke bawah halaman alat. Versi cache 0.11.0.
- Tampilan baru bertema lembar data lab: kertas milimeter, warna lapisan tanah per kelompok pengujian, huruf Archivo dan Plus Jakarta Sans lokal, animasi penampang tanah di beranda, dan transisi halaman yang menghormati `prefers-reduced-motion`. Warna aksen menjadi `#1d6a63`, termasuk grafik yang diekspor.
- Formulir dan tabel hasil alat praktikum disamakan dengan nama, urutan, simbol, dan satuan form lab; versi cache 0.10.0.
- Alamat situs menjadi https://defsayurinda.github.io/ dan akun menjadi `defsayurinda`.
- Tahanan ujung Reese & Wright disamakan dengan Lastiasih dkk. (2013), hlm. 136: (2/3)N/0,3048² t/m² untuk N ≤ 60 dan 40/0,3048² untuk N > 60.
- Lisensi dipisah: kode MIT, tulisan CC BY 4.0.
- KaTeX dan huruf Plus Jakarta Sans disimpan lokal, tanpa CDN.
- Klaim sumber dan pengujian di beranda dan README disesuaikan dengan status tiap alat.

### Diperbaiki
- Teks dari tautan berbagi dan isian formulir praktikum di-escape sebelum masuk HTML (XSS).
- Syarat data 4d di bawah ujung tiang hanya untuk Meyerhof.

### Dihapus
- Hasil Meyerhof (1976) dan soal `meyerhof-selimut` disembunyikan sampai rumusnya dicocokkan dengan PUPR (2019).
- Opsi tiang pancang di kalkulator tiang bor.
