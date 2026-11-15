/* Definisi alat: sondir dan SPT dengan boring log. Halaman memilih lewat data-alat.
 * Kolom dan urutan mengikuti form lab UNJA (SPT hlm 1, uji penetrasi konus hlm 4–6, boring log hlm 8) dan contoh
 * pengolahan data laporan praktikum (Cone Penetration Test, Boring and Sampling). */
(function () {
  'use strict';

  var H = window.HitungLapangan, f = Umum.f, jenisAlat = document.getElementById('alat-praktikum').dataset.alat;

  function belajar(tujuan, alur, arti) {
    return '<section class="kartu belajar"><h3>Belajar dari pengujian ini</h3><p><strong>Tujuan.</strong> ' + tujuan + '</p>' +
      '<p><strong>Alur pengolahan</strong> (urutan seperti contoh laporan):</p><ol>' + alur.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ol>' +
      (arti ? '<p><strong>Arti hasil.</strong> ' + arti + '</p>' : '') + '</section>';
  }
  function beda(isi) { return '<div class="catatan"><strong>Beda dengan contoh laporan.</strong><ul>' + isi.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>'; }

  if (jenisAlat === 'sondir') {
    // Kedalaman MT seperti form: 0,00 sampai 11,00 m tiap 0,20 m (hlm 4–5).
    var Z = [];
    for (var i = 0; i <= 55; i++) Z.push(Math.round(i * 0.2 * 100) / 100);
    // Contoh laporan Cone Penetration Test.pdf hlm 1–2 (form terisi): PK dan JP 0,00–10,80 m, angka sudah termasuk +0,34 NIM penulis.
    var PK_C = [11.77, 24.09, 9.53, 15.13, 14.01, 16.25, 7.29, 6.17, 3.93, 5.05, 5.05, 2.81, 2.81, 2.81, 3.37, 6.73, 11.77, 14.01, 21.85, 27.45, 36.41, 38.65, 40.89, 36.41, 31.93, 31.93,
      42.01, 33.05, 22.97, 22.97, 22.97, 27.45, 22.97, 19.61, 20.73, 27.45, 37.53, 43.13, 43.13, 31.93, 50.97, 67.77, 34.17, 17.37, 11.77, 22.97, 28.57, 17.37, 11.77, 17.37, 28.57, 45.37, 62.17, 62.17, 56.57];
    var JP_C = [15.57, 29.32, 18.07, 21.82, 16.82, 20.57, 15.57, 13.07, 15.57, 14.07, 18.57, 27.57, 25.32, 34.32, 23.07, 29.82, 24.57, 26.82, 31.82, 49.32, 50.57, 46.82, 50.57, 44.32, 39.32, 40.57,
      49.32, 38.07, 31.82, 30.57, 35.57, 41.57, 37.57, 40.57, 42.57, 52.57, 50.57, 56.82, 61.82, 41.82, 63.07, 88.07, 79.32, 56.82, 68.07, 68.07, 101.82, 68.07, 79.32, 68.07, 79.32, 124.32, 146.82, 158.07, 135.57];
    var contohSondir = Z.map(function (z, k) { return k < PK_C.length ? { kedalaman: z, PK: PK_C[k], JP: JP_C[k] } : { kedalaman: z }; });

    var grafikTegak = function (id, judul, labelX, seri, zmaks, xmaks, mat) {
      return Grafik.plot({ id: id, judul: judul, lebar: 330, tinggi: 520, x: { min: 0, max: xmaks, label: labelX },
        y: { min: 0, max: zmaks, balik: true, label: 'Kedalaman penetrasi (m)' }, seri: seri,
        horizontal: mat >= 0 ? [{ y: mat, teks: 'MAT', rata: 'kanan' }] : [] });
    };

    var langkahTitik = function (U, r, k, huruf) {
      var t = r.titik[k], a = U.t(r.interval, 0), b = U.t(r.faktor, 0), sebelum = k > 0 ? r.titik[k - 1] : null;
      return U.langkah(huruf + ') Kedalaman ' + f(t.kedalaman, 2) + ' m',
        '<p>PK = ' + f(t.PK, 2) + ' kg/cm², JP = ' + f(t.JP, 2) + ' kg/cm².</p>' +
        U.rumus('1.\\ \\ HL = JP - PK = ' + U.t(t.JP, 2) + ' - ' + U.t(t.PK, 2) + ' = ' + U.t(t.HL, 2) + '\\ \\text{kg/cm}^2') +
        U.rumus('2.\\ \\ HL\\times\\dfrac{' + a + '}{' + b + '} = ' + U.t(t.HL, 2) + '\\times\\dfrac{' + a + '}{' + b + '} = ' + U.t(t.HLper, 2) + '\\ \\text{kg/cm}') +
        U.rumus('3.\\ \\ JHL = ' + (sebelum ? 'JHL_{' + U.t(sebelum.kedalaman, 2) + '} + HL\\times\\dfrac{' + a + '}{' + b + '} = ' + U.t(sebelum.JHL, 2) + ' + ' + U.t(t.HLper, 2) + ' = '
          : 'HL\\times\\dfrac{' + a + '}{' + b + '} = ') + U.t(t.JHL, 2) + '\\ \\text{kg/cm}') +
        U.rumus('4.\\ \\ HS = \\dfrac{HL}{' + b + '} = \\dfrac{' + U.t(t.HL, 2) + '}{' + b + '} = ' + U.t(t.HS, 3) + '\\ \\text{kg/cm}^2'));
    };

    Praktikum.pasang({
      id: 'sondir', judulEkspor: 'Uji penetrasi konus / sondir (SNI 2827:2008)',
      nim: { ket: 'perlawanan penetrasi konus (PK) dan jumlah perlawanan (JP)', tabel: { bacaan: ['PK', 'JP'] } },
      parameter: [
        { id: 'MAT', label: 'Muka air tanah (MAT)', satuan: 'm', bantuan: 'Opsional, digambar di grafik.' },
        { id: 'interval', label: 'Interval pembacaan', satuan: 'cm', bantuan: 'Angka 20 pada kolom "HL × 20/10" di form.' },
        { id: 'faktor', label: 'Pembagi luas', bantuan: 'Angka 10 pada "HL × 20/10" dan "HS = HL/10" di form.' }],
      tabel: [{ id: 'bacaan', jenis: 'daftar', judul: 'Bacaan manometer', namaPendek: 'Bacaan sondir', maks: 200, awal: Z.map(function (z) { return { kedalaman: z }; }),
        keterangan: 'Kolom seperti form uji penetrasi konus. MT sudah terisi tiap 0,20 m sampai 11,00 m; baris tanpa PK dan JP tidak dihitung.',
        kolom: [{ id: 'kedalaman', label: 'MT', satuan: 'meter', kunci: true }, { id: 'PK', label: 'Perlawanan penetrasi konus, PK', satuan: 'kg/cm²' },
          { id: 'JP', label: 'Jumlah perlawanan, JP', satuan: 'kg/cm²' }] }],
      contoh: { param: { MAT: '', interval: 20, faktor: 10 }, tabel: { bacaan: contohSondir } },
      kosong: { param: { MAT: '', interval: 20, faktor: 10 } },
      hitung: function (m) { return H.sondir({ interval: m.param.interval, faktor: m.param.faktor, bacaan: m.tabel.bacaan }); },
      hasil: function (m, r) { return { PKmaks: r.maks.PK, kedalaman: r.akhir.kedalaman, JHL: r.JHL, qc: r.qc, qf: r.qf }; },
      tampil: function (m, r, U) {
        var T = r.titik, h = '', mat = m.param.MAT >= 0 ? m.param.MAT : -1, a = U.t(r.interval, 0), b = U.t(r.faktor, 0);
        var zmaks = Math.max(1, Math.ceil(r.akhir.kedalaman - 1e-9));
        h += U.ringkasan([U.kartu('Rata-rata nilai konus', f(r.qc, 3) + ' <small>kg/cm²</small>', 'q̄<sub>c</sub> = Σ PK / ' + r.n),
          U.kartu('Rata-rata JHL', f(r.qf, 3) + ' <small>kg/cm</small>', 'q̄<sub>f</sub> = Σ JHL / ' + r.n),
          U.kartu('JHL akhir', f(r.JHL, 2) + ' <small>kg/cm</small>', 'pada ' + f(r.akhir.kedalaman, 2) + ' m'),
          U.kartu('PK terbesar', f(r.maks.PK, 2) + ' <small>kg/cm²</small>', 'pada ' + f(r.maks.kedalaman, 2) + ' m (' + f(r.maks.qcMPa, 2) + ' MPa)')]);
        var pkMaks = Math.max.apply(null, T.map(function (t) { return t.JP; }));
        var bulat = function (v, k) { return Math.ceil(v * 1.08 / k) * k; };
        h += '<div class="kisi-grafik kisi-3">' +
          U.grafik(grafikTegak('pk', 'Nilai konus (qc = PK) dan JP', 'kg/cm²', [{ titik: T.map(function (t) { return [t.PK, t.kedalaman]; }), warna: 'aksen', label: 'qc (PK)' },
            { titik: T.map(function (t) { return [t.JP, t.kedalaman]; }), warna: 'teks', putus: true, label: 'JP' }], zmaks, bulat(pkMaks, 20), mat), 'Nilai konus q<sub>c</sub> (PK) dan jumlah perlawanan (JP) terhadap kedalaman.') +
          U.grafik(grafikTegak('jhl', 'Jumlah hambatan lekat terkoreksi', 'JHL (kg/cm)', [{ titik: T.map(function (t) { return [t.JHL, t.kedalaman]; }), warna: 'biru' }], zmaks, bulat(r.JHL, 150), mat),
            'Jumlah hambatan lekat terkoreksi (JHL, tf pada lembar grafik form).') +
          U.grafik(grafikTegak('fr', 'Rasio gesekan terhadap kedalaman', 'FR (%)', [{ titik: T.filter(function (t) { return t.FR !== null; }).map(function (t) { return [t.FR, t.kedalaman]; }), warna: 'hijau' }], zmaks,
            Math.max(8, Math.ceil(Math.max.apply(null, T.map(function (t) { return t.FR || 0; })) + 1)), mat), 'Rasio gesekan FR = HS / PK × 100% pada tiap kedalaman.') + '</div>';
        h += '<h3>Tabel hasil (urutan form lab)</h3>' + U.tabel(['MT (m)', 'Perlawanan penetrasi konus PK (kg/cm²)', 'Jumlah perlawanan JP (kg/cm²)', 'Hambatan lekat HL = JP − PK (kg/cm²)',
          'HL × ' + f(r.interval, 0) + '/' + f(r.faktor, 0) + ' (kg/cm)', 'Jumlah hambatan lekat JHL (kg/cm)', 'Hambatan setempat HS = HL/' + f(r.faktor, 0) + ' (kg/cm²)', 'FR = HS/PK (%)'],
          T.map(function (t) { return [f(t.kedalaman, 2), f(t.PK, 2), f(t.JP, 2), f(t.HL, 2), f(t.HLper, 2), f(t.JHL, 2), f(t.HS, 3), t.FR !== null ? f(t.FR, 2) : '–']; }), null, { angkaMulai: 0 }) +
          '<p class="kecil redup">Kolom FR tidak ada di form; ditambahkan dari langkah e contoh laporan. HS ditulis kg/cm² karena HL dalam kg/cm² dibagi angka tanpa satuan (form menulis kg/cm).</p>';
        h += '<h3>Jumlah dan rata-rata</h3>' + U.tabel(['Besaran', 'Simbol', 'Satuan', 'Nilai'], [
          ['Jumlah sampel (baris bacaan)', 'n', '–', String(r.n)], ['Jumlah perlawanan penetrasi konus', 'Σ PK', 'kg/cm²', f(r.sumPK, 2)], ['Jumlah kolom jumlah perlawanan', 'Σ JP', 'kg/cm²', f(r.sumJP, 2)],
          ['Jumlah JHL semua baris', 'Σ JHL', 'kg/cm', f(r.sumJHL, 2)], ['Nilai rata-rata jumlah hambatan lekat', 'q̄<sub>f</sub> = Σ JHL / n', 'kg/cm', f(r.qf, 3)],
          ['Nilai rata-rata konus (daya dukung)', 'q̄<sub>c</sub> = Σ PK / n', 'kg/cm²', f(r.qc, 3)]]);

        var contohK = T.length >= 3 ? [1, 2] : [0];
        h += '<h3>Langkah hitungan</h3>';
        contohK.forEach(function (k, j) { h += langkahTitik(U, r, k, 'ab'[j]); });
        var e = T[contohK[contohK.length - 1]];
        h += U.langkah('c) Nilai rata-rata jumlah hambatan lekat', U.rumus('\\bar{q}_f = \\dfrac{\\sum JHL}{n} = \\dfrac{' + U.t(r.sumJHL, 2) + '}{' + r.n + '} = ' + U.t(r.qf, 3) + '\\ \\text{kg/cm}'));
        h += U.langkah('d) Nilai rata-rata daya dukung tanah (nilai konus)', U.rumus('\\bar{q}_c = \\dfrac{\\sum PK}{n} = \\dfrac{' + U.t(r.sumPK, 2) + '}{' + r.n + '} = ' + U.t(r.qc, 3) + '\\ \\text{kg/cm}^2') +
          '<p class="ket">n = jumlah baris bacaan (sampel). q<sub>c</sub> = perlawanan penetrasi konus PK.</p>');
        h += U.langkah('e) Rasio gesekan (kedalaman ' + f(e.kedalaman, 2) + ' m)', e.FR === null ? '<p>PK = 0, rasio gesekan tidak dapat dihitung.</p>' :
          U.rumus('FR = \\dfrac{HS}{q_c}\\times 100\\% = \\dfrac{' + U.t(e.HS, 3) + '}{' + U.t(e.PK, 2) + '}\\times 100\\% = ' + U.t(e.FR, 3) + '\\%') +
          '<p class="ket">q<sub>c</sub> = PK pada kedalaman yang sama. Kolom FR di tabel hasil memakai cara yang sama untuk tiap kedalaman. Rumus HL, HL × ' + a + '/' + b + ', JHL, dan HS mengikuti kolom form lab; PK dalam MPa = PK × 0,0980665.</p>');
        if (m.contoh) {
          h += beda(['Kolom HL, HL × 20/10, JHL, dan HS di form contoh sama dengan alat untuk ke-55 kedalaman (0,00–10,80 m), begitu juga Σ JHL = 45.501,4.',
            'Langkah c: 45.501,4 / 55 = 827,298 kg/cm; contoh menulis 827,299 (pembulatan).',
            'Langkah d: contoh menulis q̄<sub>c</sub> = 2.739,85 / 55 = 49,815. Angka 2.739,85 adalah jumlah kolom JP (jumlah perlawanan konus + selimut), bukan PK. Nilai konus q<sub>c</sub> adalah perlawanan penetrasi konus (kolom PK; grafik form memakai judul "Nilai Konus (qc)"), jadi alat memakai Σ PK = 1.380,95 → q̄<sub>c</sub> = 25,108 kg/cm². Σ JP tetap ditampilkan di tabel jumlah.',
            'Langkah e: contoh menghitung FR = 0,854 / 55 × 100% = 1,553%; yang menjadi pembagi adalah jumlah sampel (55), bukan q<sub>c</sub>. Dengan q<sub>c</sub> = PK pada 0,40 m (9,53 kg/cm²) FR = 8,961%. Bila memakai q̄<sub>c</sub> contoh 49,815 pun hasilnya 1,714%, bukan 1,553%.',
            'Satuan: langkah tulisan tangan menulis PK, JP, dan HL dalam kg/m² (seharusnya kg/cm² seperti form), dan HS dalam kg/cm. HS = HL/10 dengan HL dalam kg/cm², jadi alat menulis HS dalam kg/cm².']);
        }
        h += belajar('Mengukur perlawanan tanah terhadap ujung konus (PK) dan perlawanan konus + selimut (JP) tiap 20 cm kedalaman, lalu menghitung hambatan lekat dan rasio gesekan untuk menggambarkan lapisan tanah.',
          ['Hitung hambatan lekat tiap kedalaman: HL = JP − PK.', 'Hitung hambatan lekat terkoreksi: HL × 20/10.', 'Jumlahkan dari atas: JHL = kumulatif HL × 20/10.',
            'Hitung hambatan setempat: HS = HL/10.', 'Rata-ratakan JHL semua baris: q̄<sub>f</sub> = Σ JHL / n.', 'Rata-ratakan nilai konus: q̄<sub>c</sub> = Σ PK / n.',
            'Hitung rasio gesekan: FR = HS / q<sub>c</sub> × 100%.', 'Gambar q<sub>c</sub> dan JHL terhadap kedalaman seperti lembar grafik form.'], null);
        return h;
      },
      ekspor: function (m, r) {
        var b = [['MT (m)', 'PK (kg/cm2)', 'JP (kg/cm2)', 'HL = JP - PK (kg/cm2)', 'HL x ' + r.interval + '/' + r.faktor + ' (kg/cm)', 'JHL (kg/cm)', 'HS = HL/' + r.faktor + ' (kg/cm2)', 'FR = HS/PK (%)']];
        r.titik.forEach(function (t) { b.push([t.kedalaman, t.PK, t.JP, t.HL, t.HLper, t.JHL, t.HS, t.FR === null ? '' : t.FR]); });
        b.push([], ['Jumlah sampel n', r.n], ['Jumlah PK (kg/cm2)', r.sumPK], ['Jumlah JP (kg/cm2)', r.sumJP], ['Jumlah JHL (kg/cm)', r.sumJHL],
          ['Rata-rata JHL qf (kg/cm)', r.qf], ['Rata-rata nilai konus qc (kg/cm2)', r.qc]);
        return b;
      },
      sumber: ['Badan Standardisasi Nasional. SNI 2827:2008, uji penetrasi lapangan dengan alat sondir.',
        'Form uji penetrasi konus, Laboratorium Mekanika Tanah, Teknik Sipil Universitas Jambi: kolom MT, PK, JP, HL = JP − PK, HL × 20/10, JHL, HS = HL/10, dan grafik nilai konus (qc) serta jumlah hambatan lekat terkoreksi terhadap kedalaman.',
        'Contoh laporan praktikum (Cone Penetration Test): langkah q̄<sub>f</sub> = Σ JHL / n, q̄<sub>c</sub> = Σ PK / n, dan FR = HS / q<sub>c</sub> × 100%. Pemakaian q<sub>c</sub> = PK pada kedalaman yang sama untuk FR belum dicocokkan dengan pasal SNI 2827:2008 [BELUM TERVERIFIKASI].']
    });
  }

  if (jenisAlat === 'spt') {
    var JENIS = [['lempung', 'Lempung'], ['lempung-pasir', 'Lempung berpasir'], ['lanau', 'Lanau'], ['pasir', 'Pasir'], ['kerikil', 'Kerikil'], ['organik', 'Organik/gambut'],
      ['urugan', 'Tanah urug'], ['batuan', 'Batuan']];
    var NAMA = {};
    JENIS.forEach(function (j) { NAMA[j[0]] = j[1]; });

    // Pola arsir lapisan untuk kolom Log.
    var POLA = {
      lempung: '<rect width="10" height="8" style="fill:var(--lempung);fill-opacity:.45"/><line x1="0" y1="4" x2="10" y2="4" style="stroke:var(--teks-2);stroke-width:.8"/>',
      'lempung-pasir': '<rect width="10" height="8" style="fill:var(--lempung);fill-opacity:.35"/><line x1="0" y1="4" x2="10" y2="4" style="stroke:var(--teks-2);stroke-width:.8"/><circle cx="2.5" cy="2" r=".8" style="fill:var(--teks-2)"/><circle cx="7.5" cy="6.2" r=".8" style="fill:var(--teks-2)"/>',
      lanau: '<rect width="10" height="8" style="fill:var(--lempung);fill-opacity:.25"/><line x1="0" y1="4" x2="5" y2="4" style="stroke:var(--teks-2);stroke-width:.8"/>',
      pasir: '<rect width="10" height="8" style="fill:var(--pasir);fill-opacity:.8"/><circle cx="2.5" cy="2" r=".9" style="fill:var(--teks-2)"/><circle cx="7.5" cy="6" r=".9" style="fill:var(--teks-2)"/>',
      kerikil: '<rect width="10" height="8" style="fill:var(--pasir);fill-opacity:.5"/><circle cx="5" cy="4" r="2.4" style="fill:none;stroke:var(--teks-2);stroke-width:.8"/>',
      organik: '<rect width="10" height="8" style="fill:var(--teks-2);fill-opacity:.25"/><line x1="0" y1="8" x2="10" y2="0" style="stroke:var(--teks-2);stroke-width:.8"/>',
      urugan: '<rect width="10" height="8" style="fill:var(--permukaan)"/><path d="M2 2 L5 5 M5 2 L2 5 M7 5 L9 7 M9 5 L7 7" style="stroke:var(--teks-2);stroke-width:.7"/>',
      batuan: '<rect width="10" height="8" style="fill:var(--teks-2);fill-opacity:.15"/><path d="M0 4 H10 M5 0 V4 M0 8 H10" style="stroke:var(--teks-2);stroke-width:.8"/>'
    };

    var logBor = function (r) {
      var W = 640, Hg = 580, atas = 44, bawah = 34, lh = Hg - atas - bawah;
      var zmaks = Math.max(2, Math.ceil(r.dalam / 2) * 2), fy = function (z) { return atas + z / zmaks * lh; };
      var Nmaks = Math.max(50, Math.ceil(Math.max.apply(null, r.uji.map(function (u) { return u.N60 !== undefined ? Math.max(u.N, u.N60) : u.N; }).concat([0])) / 10) * 10);
      var x0 = 250, xw = 360, fx = function (n) { return x0 + n / Nmaks * xw; };
      var s = '<svg class="grafik" viewBox="0 0 ' + W + ' ' + Hg + '" role="img" aria-label="Boring log dan N-SPT"><defs>' +
        Object.keys(POLA).map(function (k) { return '<pattern id="pola-' + k + '" width="10" height="8" patternUnits="userSpaceOnUse">' + POLA[k] + '</pattern>'; }).join('') + '</defs>';
      s += '<text x="140" y="24" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--teks)">Log</text>';
      s += '<text x="' + (x0 + xw / 2) + '" y="24" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--teks)">Diagram SPT jumlah pukulan</text>';
      for (var z = 0; z <= zmaks + 1e-9; z += zmaks > 20 ? 2 : 1) {
        s += '<line x1="84" x2="' + (x0 + xw) + '" y1="' + fy(z) + '" y2="' + fy(z) + '" style="stroke:var(--garis)"/>';
        s += '<text x="76" y="' + (fy(z) + 4) + '" text-anchor="end" font-size="12" style="fill:var(--teks-2)">' + f(z, 0) + '</text>';
      }
      s += '<text x="22" y="' + (atas + lh / 2) + '" text-anchor="middle" font-size="13" transform="rotate(-90 22 ' + (atas + lh / 2) + ')" style="fill:var(--teks)">Kedalaman (m)</text>';
      r.lapisan.forEach(function (l) {
        var y1 = fy(l.dari), y2 = fy(Math.min(l.sampai, zmaks));
        s += '<rect x="90" y="' + y1 + '" width="100" height="' + (y2 - y1) + '" style="fill:url(#pola-' + l.jenis + ');stroke:var(--teks);stroke-width:1"/>';
        if (y2 - y1 >= 18) s += '<text x="140" y="' + ((y1 + y2) / 2 + 4) + '" text-anchor="middle" font-size="11" font-weight="700" style="fill:var(--teks);paint-order:stroke;stroke:var(--permukaan);stroke-width:3px">' + NAMA[l.jenis] + '</text>';
        if (l.sampel) s += '<rect x="196" y="' + ((y1 + y2) / 2 - 7) + '" width="10" height="14" rx="2" style="fill:var(--permukaan);stroke:var(--teks);stroke-width:1.2"><title>Sampel</title></rect>';
      });
      for (var n = 0; n <= Nmaks; n += 10) {
        s += '<line x1="' + fx(n) + '" x2="' + fx(n) + '" y1="' + atas + '" y2="' + (atas + lh) + '" style="stroke:var(--garis)"/>';
        s += '<text x="' + fx(n) + '" y="' + (atas - 6) + '" text-anchor="middle" font-size="11.5" style="fill:var(--teks-2)">' + n + '</text>';
      }
      s += '<rect x="' + x0 + '" y="' + atas + '" width="' + xw + '" height="' + lh + '" style="fill:none;stroke:var(--teks-2)"/>';
      if (r.MAT >= 0 && r.MAT <= zmaks) {
        s += '<line x1="84" x2="' + (x0 + xw) + '" y1="' + fy(r.MAT) + '" y2="' + fy(r.MAT) + '" style="stroke:#3a7fc1;stroke-width:1.6;stroke-dasharray:6 4"/>';
        s += '<text x="' + (x0 + xw - 4) + '" y="' + (fy(r.MAT) - 5) + '" text-anchor="end" font-size="12" font-weight="700" style="fill:#3a7fc1">MAT ' + f(r.MAT, 2) + ' m</text>';
      }
      var u = r.uji;
      if (!u.length) s += '<text x="' + (x0 + xw / 2) + '" y="' + (atas + lh / 2) + '" text-anchor="middle" font-size="12.5" style="fill:var(--teks-2)">Belum ada data pukulan SPT</text>';
      if (u.length > 1) s += '<polyline points="' + u.map(function (x) { return fx(x.N) + ',' + fy(x.kedalaman); }).join(' ') + '" style="fill:none;stroke:var(--aksen);stroke-width:2.2"/>';
      if (u.length > 1 && u[0].N60 !== undefined) s += '<polyline points="' + u.map(function (x) { return fx(x.N60) + ',' + fy(x.kedalaman); }).join(' ') + '" style="fill:none;stroke:var(--teks-2);stroke-width:1.6;stroke-dasharray:6 4"/>';
      u.forEach(function (x) {
        s += '<circle cx="' + fx(x.N) + '" cy="' + fy(x.kedalaman) + '" r="4.5" style="fill:var(--permukaan);stroke:var(--aksen);stroke-width:2.2"/>';
        s += '<text x="' + (fx(x.N) + 9) + '" y="' + (fy(x.kedalaman) + 4) + '" font-size="12" font-weight="700" style="fill:var(--teks);paint-order:stroke;stroke:var(--permukaan);stroke-width:4px">' + x.N + (x.tolak ? '*' : '') + '</text>';
      });
      if (u.length && u[0].N60 !== undefined) {
        s += '<line x1="' + (x0 + 10) + '" x2="' + (x0 + 32) + '" y1="' + (Hg - 12) + '" y2="' + (Hg - 12) + '" style="stroke:var(--aksen);stroke-width:2.2"/><text x="' + (x0 + 38) + '" y="' + (Hg - 8) + '" font-size="12" style="fill:var(--teks)">N<tspan font-size="9" dy="3">m</tspan></text>';
        s += '<line x1="' + (x0 + 140) + '" x2="' + (x0 + 162) + '" y1="' + (Hg - 12) + '" y2="' + (Hg - 12) + '" style="stroke:var(--teks-2);stroke-width:1.6;stroke-dasharray:6 4"/><text x="' + (x0 + 168) + '" y="' + (Hg - 8) + '" font-size="12" style="fill:var(--teks)">N₆₀</text>';
      }
      return s + '</svg>';
    };

    // Baris yang memuat muka air tanah: tanda ▼ di kolom MAT / GWL.
    var tandaMAT = function (mat, dari, sampai, terakhir) {
      return mat >= 0 && mat >= dari - 1e-9 && (terakhir ? mat <= sampai + 1e-9 : mat < sampai - 1e-9) ? '▼ ' + f(mat, 2) + ' m' : '';
    };

    Praktikum.pasang({
      id: 'spt', judulEkspor: 'Standard Penetration Test (SNI 4153:2008) dan boring log',
      parameter: [
        { id: 'MAT', label: 'Muka air tanah (GWL)', satuan: 'm', bantuan: 'Opsional. Ditandai ▼ di kolom muka air tanah (form SPT) dan GWL (boring log).' },
        { id: 'Er', label: 'Efisiensi energi palu, E<sub>r</sub>', satuan: '%', bantuan: 'Opsional, untuk N<sub>60</sub> = N E<sub>r</sub> / 60. Koreksi lain (batang, tabung, lubang bor) tidak dihitung.' }],
      tabel: [
        { id: 'uji', jenis: 'daftar', judul: 'Standard penetration test', namaPendek: 'SPT', maks: 60, awal: 8,
          keterangan: 'Kolom seperti form SPT. Jumlah pukulan tiap 15 cm; N<sub>m</sub> = N<sub>2</sub> + N<sub>3</sub>. Kedalaman = awal pengujian.',
          kolom: [{ id: 'kedalaman', label: 'Kedalaman', satuan: 'm' }, { id: 'deskripsi', label: 'Deskripsi tanah', teks: true },
            { id: 'N1', label: 'N₁', satuan: 'pukulan' }, { id: 'N2', label: 'N₂', satuan: 'pukulan' }, { id: 'N3', label: 'N₃', satuan: 'pukulan' }] },
        { id: 'lapisan', jenis: 'daftar', judul: 'Boring log', namaPendek: 'Lapisan', maks: 40, awal: 7,
          keterangan: 'Kolom seperti form boring log: Depth dari–sampai, Log (pola lapisan), deskripsi jenis dan warna, Sample, dan Remarks. Thick dihitung dari Depth.',
          kolom: [{ id: 'dari', label: 'Depth dari', satuan: 'm' }, { id: 'sampai', label: 'Depth sampai', satuan: 'm' }, { id: 'jenis', label: 'Log', pilihan: JENIS },
            { id: 'deskripsi', label: 'Soil description type, color', teks: true }, { id: 'sampel', label: 'Sample', teks: true }, { id: 'ket', label: 'Remarks', teks: true }] }],
      // Contoh laporan Boring and Sampling.pdf hlm 1 (boring log terisi). Contoh laporan tidak memuat data pukulan SPT.
      contoh: { param: { MAT: '', Er: '' }, tabel: {
        uji: [{}, {}, {}, {}, {}, {}, {}, {}],
        lapisan: [[0, 0.28, 'lempung-pasir', 'Warna: merah kecoklatan; ukuran: berpasir', '', 'Lempung berpasir'],
          [0.28, 1.06, 'lempung-pasir', 'Warna: coklat kekuningan; ukuran: berpasir', '', 'Lempung berpasir'],
          [1.06, 2.21, 'lempung-pasir', 'Warna: coklat kemerahan; ukuran: berbutir kasar', '', 'Lempung berpasir'],
          [2.21, 2.48, 'lempung-pasir', 'Warna: kuning kecoklatan; ukuran: berbutir kasar', '', 'Lempung berpasir'],
          [2.48, 2.60, 'lempung-pasir', 'Warna: kuning kekuningan; ukuran: berbutir halus', '', 'Lempung berpasir'],
          [2.60, 2.91, 'lempung', 'Warna: oren keputihan; ukuran: berbutir halus', '', 'Lempung berbutir halus'],
          [2.91, 3.25, 'lempung', 'Warna: putih', 'Tabung contoh', 'Lempung berbutir halus']]
          .map(function (l) { return { dari: l[0], sampai: l[1], jenis: l[2], deskripsi: l[3], sampel: l[4], ket: l[5] }; }) } },
      kosong: { param: { MAT: '', Er: '' } },
      hitung: function (m) { return H.spt({ MAT: m.param.MAT, Er: m.param.Er, uji: m.tabel.uji, lapisan: m.tabel.lapisan }); },
      tampil: function (m, r, U) {
        var h = '', u = r.uji, L = r.lapisan, n60 = r.Er > 0;
        var Nmaks = u.length ? u.reduce(function (a, x) { return x.N > a.N ? x : a; }) : null;
        h += U.ringkasan([U.kartu('Kedalaman bor', f(r.dalam, 2) + ' <small>m</small>', L.length + ' lapisan, ' + u.length + ' titik SPT'),
          U.kartu('N<sub>m</sub> terbesar', Nmaks ? Nmaks.N + (Nmaks.tolak ? '*' : '') : '–', Nmaks ? 'pada ' + f(Nmaks.kedalaman, 2) + ' m' + (Nmaks.keadaan ? ', ' + Nmaks.keadaan.toLowerCase() : '') : 'belum ada data SPT'),
          U.kartu('Muka air tanah', r.MAT >= 0 ? f(r.MAT, 2) + ' <small>m</small>' : '–', 'dari permukaan')]);
        h += U.grafik(logBor(r), 'Log lapisan dan diagram SPT jumlah pukulan terhadap kedalaman.' + (u.some(function (x) { return x.tolak; }) ? ' Tanda * = penolakan (50 pukulan).' : '') +
          (L.some(function (l) { return l.sampel; }) ? ' Kotak kecil di kanan log = sampel.' : ''));
        if (u.length) {
          h += '<h3>Tabel hasil SPT (urutan form lab)</h3>' + U.tabel(['Kedalaman (m)', 'Muka air tanah', 'Deskripsi tanah', 'N<sub>1</sub>', 'N<sub>2</sub>', 'N<sub>3</sub>', 'N<sub>m</sub> = N<sub>2</sub> + N<sub>3</sub>']
            .concat(n60 ? ['N<sub>60</sub>'] : []).concat(['Kepadatan / konsistensi']),
            u.map(function (x, i) {
              var des = x.deskripsi || (x.lapisan ? (x.lapisan.ket || NAMA[x.lapisan.jenis]) : '');
              return [f(x.kedalaman, 2), tandaMAT(r.MAT, x.kedalaman, i + 1 < u.length ? u[i + 1].kedalaman : Infinity, false), des || '–', x.N1, x.N2, x.N3, x.N + (x.tolak ? '*' : '')]
                .concat(n60 ? [f(x.N60, 1)] : []).concat([x.keadaan || '–']);
            }), null, { kanan: n60 ? [0, 3, 4, 5, 6, 7] : [0, 3, 4, 5, 6] });
        }
        if (L.length) {
          h += '<h3>Boring log (urutan form lab)</h3>' + U.tabel(['Depth (m)', 'Thick (m)', 'Log', 'Soil description type, color', 'Sample', 'GWL', 'Remarks'],
            L.map(function (l, i) { return [f(l.dari, 2) + ' – ' + f(l.sampai, 2), f(l.tebal, 2), NAMA[l.jenis], l.deskripsi || '', l.sampel || '', tandaMAT(r.MAT, l.dari, l.sampai, i === L.length - 1), l.ket || '']; }),
            null, { kanan: [1] });
        }
        h += '<h3>Langkah hitungan</h3>';
        if (L.length) {
          var l0 = L[0];
          h += U.langkah('1) Tebal lapisan (Thick)', U.rumus('\\text{Thick} = \\text{sampai} - \\text{dari} = ' + U.t(l0.sampai, 2) + ' - ' + U.t(l0.dari, 2) + ' = ' + U.t(l0.tebal, 2) + '\\ \\text{m}') +
            '<p class="ket">Lapisan berikutnya: ' + L.slice(1).map(function (l) { return f(l.sampai, 2) + ' − ' + f(l.dari, 2) + ' = ' + f(l.tebal, 2) + ' m'; }).join('; ') + '.</p>');
        }
        if (u.length) {
          var a = u[0];
          h += U.langkah((L.length ? '2' : '1') + ') Nilai N (kedalaman ' + f(a.kedalaman, 2) + ' m)', U.rumus('N_m = N_2 + N_3 = ' + a.N2 + ' + ' + a.N3 + ' = ' + a.N) +
            (n60 ? U.rumus('N_{60} = \\dfrac{N\\,E_r}{60} = \\dfrac{' + a.N + '\\times' + U.t(r.Er, 0) + '}{60} = ' + U.t(a.N60, 1)) : '') +
            '<p class="ket">N<sub>1</sub> (15 cm pertama) dianggap dudukan dan tidak dihitung. Kepadatan pasir dan konsistensi lempung dibaca dari rentang N menurut Terzaghi &amp; Peck.</p>');
          h += '<h3>Rentang N (Terzaghi &amp; Peck)</h3>' + U.tabel([{ teks: 'Pasir: N' }, { teks: 'Kepadatan' }, { teks: 'Lempung: N' }, { teks: 'Konsistensi' }],
            [['0 – 4', 'Sangat lepas', '< 2', 'Sangat lunak'], ['4 – 10', 'Lepas', '2 – 4', 'Lunak'], ['10 – 30', 'Sedang', '4 – 8', 'Sedang'], ['30 – 50', 'Padat', '8 – 15', 'Kaku'],
              ['> 50', 'Sangat padat', '15 – 30', 'Sangat kaku'], ['', '', '> 30', 'Keras']], null, { angkaMulai: 99 });
        }
        if (m.contoh) {
          h += beda(['Kolom Thick (m) di contoh berisi kedalaman bawah lapisan (0,28; 1,06; 2,21; 2,48; 2,60; 2,91; 3,25), bukan tebal. Alat menghitung Thick = sampai − dari: 0,28; 0,78; 1,15; 0,27; 0,12; 0,31; 0,34 m (jumlah 3,25 m = kedalaman bor).',
            'Contoh laporan tidak memuat data pukulan SPT, jadi tabel SPT dan diagram N kosong sampai N<sub>1</sub>, N<sub>2</sub>, N<sub>3</sub> diisi.',
            'Simbol tabung sampel di contoh tergambar di sekitar batas 2,91 m; alat menaruhnya di kolom Sample lapisan 2,91–3,25 m. Pola Log dipilih dari Remarks (lempung berpasir atau lempung berbutir halus). Kolom GWL di contoh kosong.']);
        }
        h += belajar('Mencatat lapisan tanah dari pengeboran (boring log) dan, bila ada uji SPT, jumlah pukulan N untuk memperkirakan kepadatan atau konsistensi tiap lapisan.',
          ['Catat Depth dari–sampai tiap lapisan, warna dan ukuran butir, letak sampel, muka air tanah, dan Remarks.', 'Hitung tebal lapisan: Thick = sampai − dari.',
            'Untuk SPT, jumlahkan pukulan 15 cm kedua dan ketiga: N<sub>m</sub> = N<sub>2</sub> + N<sub>3</sub>.', 'Baca kepadatan pasir atau konsistensi lempung dari rentang N.',
            'Gambar log lapisan dan diagram N terhadap kedalaman.'],
          'Rentang N untuk kepadatan pasir dan konsistensi lempung mengikuti Terzaghi &amp; Peck (1967), tabel di atas.');
        return h;
      },
      ekspor: function (m, r) {
        var b = [['Kedalaman (m)', 'Deskripsi tanah', 'N1', 'N2', 'N3', 'Nm = N2 + N3', 'N60', 'Kepadatan / konsistensi']];
        r.uji.forEach(function (x) { b.push([x.kedalaman, x.deskripsi || '', x.N1, x.N2, x.N3, x.N, x.N60 === undefined ? '' : x.N60, x.keadaan || '']); });
        b.push([], ['Depth dari (m)', 'Depth sampai (m)', 'Thick (m)', 'Log', 'Soil description type, color', 'Sample', 'Remarks']);
        r.lapisan.forEach(function (l) { b.push([l.dari, l.sampai, l.tebal, NAMA[l.jenis], l.deskripsi || '', l.sampel || '', l.ket || '']); });
        if (r.MAT >= 0) b.push([], ['Muka air tanah (m)', r.MAT]);
        return b;
      },
      sumber: ['Badan Standardisasi Nasional. SNI 4153:2008, uji penetrasi lapangan dengan SPT.',
        'Form standard penetration test dan form boring log, Laboratorium Mekanika Tanah, Teknik Sipil Universitas Jambi. Data contoh dari contoh laporan praktikum (Boring and Sampling).',
        'Terzaghi, K., &amp; Peck, R. B. (1967). <em>Soil mechanics in engineering practice</em> (2nd ed.). John Wiley &amp; Sons. Hubungan N dengan kepadatan dan konsistensi.',
        'Skempton, A. W. (1986). Standard penetration test procedures and the effects in sands of overburden pressure, relative density, particle size, ageing and overconsolidation. <em>Géotechnique, 36</em>(3), 425–447. Koreksi energi N<sub>60</sub>.']
    });
  }
})();
