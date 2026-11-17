# Berkontribusi

Terima kasih sudah mau membantu. Repo ini dikelola satu orang (Defsa Yurinda) sebagai bagian dari kuliah, jadi Pull Request diperiksa sesempatnya.

## Cara paling berguna: laporkan salah hitung

Kalau hasil kalkulator berbeda dengan buku atau hitungan tangan, buka Issue dengan templat **Laporkan salah hitung**. Sertakan:

- tautan hasil (tombol *Salin tautan hasil* di kalkulator) atau data masukan;
- hasil kalkulator dan hasil yang kamu harapkan;
- sumbernya: judul buku atau standar, edisi, dan halaman.

Laporan tanpa sumber tetap diterima, tapi perbaikan rumus hanya dilakukan setelah sumbernya bisa diperiksa.

## Usul alat baru

Pakai templat **Usul alat**. Alat baru hanya dibuat bila rumusnya punya sumber yang memenuhi [Aturan Sumber](#aturan-sumber) di bawah: SNI atau pedoman kementerian, buku teks standar dengan bab dan halaman, atau jurnal bereputasi. Situs pekerjaan rumah, blog tanpa penulis, dan salinan standar yang diunggah pihak lain tidak dipakai.

## Pull Request

1. Baca [PANDUAN.md](../PANDUAN.md) untuk struktur repo.
2. Buat branch dari `main`. Pesan commit dalam bahasa Indonesia, kalimat perintah singkat.
3. Jalankan sebelum membuka PR:
   ```
   pip install -r skrip/kebutuhan.txt
   python3 skrip/bangun_situs.py
   python3 skrip/bangun_situs.py --periksa
   for f in tests/verifikasi_*.py; do python3 "$f"; done
   ```
4. Perubahan rumus wajib disertai contoh soal buku (judul dan halaman di komentar) dan uji sifat di `tests/`.
5. Isi checklist di templat PR.

## Yang tidak diterima

- Data pribadi siapa pun, termasuk nama dosen, asisten, atau mahasiswa dari form lab.
- Rumus atau nilai tabel tanpa sumber.

Dengan berkontribusi, kamu setuju kodenya dirilis dengan lisensi [MIT](../LICENSE) dan tulisannya dengan [CC BY 4.0](../LICENSE-TULISAN), dan mengikuti [Kode Etik](CODE_OF_CONDUCT.md).

## Aturan Sumber

Sumber yang boleh dipakai untuk rumus, koefisien, dan nilai tabel, berurutan:

1. Buku, modul, dan form laboratorium yang dipakai di perkuliahan.
2. SNI dan pedoman kementerian (PUPR, Bina Marga), dikutip dengan nomor dan pasal.
3. Buku teks standar (Das, Hardiyatmo, Bowles, Craig), dengan bab dan halaman.
4. Jurnal terakreditasi atau bereputasi.
5. Halaman resmi BSN, ASTM, atau AASHTO, hanya untuk judul dan status standar.

Tidak dipakai: salinan dokumen standar yang diunggah pihak lain, situs pekerjaan rumah, blog atau kalkulator online tanpa penulis, dan forum. Standar yang sudah ditarik tidak menjadi acuan utama (ASTM D422 ditarik 2016; penggantinya D6913 dan D7928). Nilai yang belum bisa diverifikasi ditandai `[BELUM TERVERIFIKASI]`.
