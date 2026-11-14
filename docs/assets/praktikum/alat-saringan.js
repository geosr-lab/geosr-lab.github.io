/* Definisi alat: analisis saringan dan kurva gradasi, mengikuti form Analisa Saringan dan Grafik Gradasi Butiran lab UNJA. */
(function () {
  'use strict';

  var H = window.HitungSaringan, f = Umum.f;
  var NAMA = H.SARINGAN.map(function (s) { return s.nama; }).concat(['PAN']);

  function formatMm(v) { return f(v, v >= 1 ? (v >= 10 ? 1 : 2) : 3); }

  function grafik(r) {
    var dmaks = Math.max(10, Math.pow(10, Math.ceil(Math.log10(r.titik[0].mm)))), dmin = 0.001; // sama dengan grafik form lab: 0,001–10 mm
    var tanda = [], Dp = r.Dpakai;
    [['D₁₀', Dp.D10, 10], ['D₃₀', Dp.D30, 30], ['D₆₀', Dp.D60, 60]].forEach(function (d) {
      if (d[1]) tanda.push({ x: d[1], y: d[2], teks: d[0] + ' = ' + formatMm(d[1]) + ' mm', posisi: d[1] < Math.sqrt(dmin * dmaks) ? 'kanan' : 'kiri' });
    });
    return Grafik.plot({ id: 'gradasi', judul: 'Grafik gradasi butiran', x: { min: dmin, max: dmaks, log: true, balik: false, label: 'Diameter (mm, skala log)' },
      y: { min: 0, max: 100, label: 'Persen lolos (%)', tick: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] },
      vertikal: [{ x: 4.75, teks: 'No. 4' }, { x: 2, teks: 'No. 10' }, { x: 0.425, teks: 'No. 40' }, { x: 0.075, teks: 'No. 200' }],
      seri: [{ titik: r.titik.map(function (t) { return [t.mm, t.lolos]; }), penanda: true, warna: 'aksen' }],
      tanda: tanda });
  }

  function bedaContoh(m, isi) {
    return m.contoh ? '<div class="catatan"><strong>Beda dengan contoh laporan.</strong> ' + isi + '</div>' : '';
  }
  function belajar(tujuan, alur, arti) {
    return '<h3>Belajar dari pengujian ini</h3><div class="kartu belajar"><p><strong>Tujuan.</strong> ' + tujuan + '</p>' +
      '<p><strong>Alur pengolahan</strong></p><ol>' + alur.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ol>' +
      (arti ? '<p><strong>Membaca hasil.</strong> ' + arti + '</p>' : '') + '</div>';
  }

  Praktikum.pasang({
    id: 'saringan', judulEkspor: 'Analisa saringan',
    nim: { ket: 'berat tertahan tiap saringan dan PAN', tabel: { ayakan: ['nilai'] } },
    parameter: [
      { id: 'beratTotal', label: 'Berat kering', satuan: 'gram' },
      { id: 'D10baca', label: 'D<sub>10</sub> baca grafik', satuan: 'mm', bantuan: 'Opsional. Isi D<sub>10</sub>, D<sub>30</sub>, D<sub>60</sub> bila dibaca dari grafik gradasi seperti form; bila ketiganya terisi, C<sub>u</sub> dan C<sub>c</sub> memakai bacaan ini. Kosongkan untuk interpolasi otomatis.' },
      { id: 'D30baca', label: 'D<sub>30</sub> baca grafik', satuan: 'mm' },
      { id: 'D60baca', label: 'D<sub>60</sub> baca grafik', satuan: 'mm' }],
    tabel: [{ id: 'ayakan', jenis: 'baris', judul: 'Berat tertahan tiap saringan', namaBaris: 'Saringan',
      pilihanBaris: NAMA, barisAwal: ['2"', '1½"', '1"', '⅜"', 'No. 4', 'No. 10', 'No. 40', 'No. 200', 'PAN'],
      infoBaris: function (n) { return n === 'PAN' ? '(sisa lolos No. 200)' : '(' + formatMm(H.ukuran(n)) + ' mm)'; },
      kolomNilai: { id: 'tertahan', label: 'Berat tertahan (gram)' },
      keterangan: 'Susunan awal mengikuti form laboratorium (2" sampai PAN). Saringan bisa ditambah atau dihapus; urutan otomatis dari yang terbesar. Baris kosong tidak dihitung.' }],
    // Contoh laporan Sieve Analysis.pdf hlm 89–92: sampel tanah terganggu 500 gram (angka sudah termasuk +0,34 NIM penulis); D dibaca dari grafik hlm 97.
    contoh: { param: { beratTotal: 500, D10baca: 0.081, D30baca: 0.130, D60baca: 0.270 }, tabel: { ayakan: [
      { nama: '2"', nilai: '' }, { nama: '1½"', nilai: '' }, { nama: '1"', nilai: '' }, { nama: '⅜"', nilai: '' },
      { nama: 'No. 4', nilai: 0.34 }, { nama: 'No. 10', nilai: 14.14 }, { nama: 'No. 40', nilai: 115.84 }, { nama: 'No. 200', nilai: 312.84 }, { nama: 'PAN', nilai: 56.84 }] } },
    kosong: { param: { beratTotal: '', D10baca: '', D30baca: '', D60baca: '' } },
    hitung: function (m) {
      var p = m.param;
      return H.hitung({ beratTotal: p.beratTotal, D10baca: p.D10baca, D30baca: p.D30baca, D60baca: p.D60baca,
        ayakan: m.tabel.ayakan.map(function (b) { return { nama: b.nama, tertahan: b.nilai }; }) });
    },
    // Untuk klasifikasi dan hidrometer: persen lolos saringan kunci dan besaran gradasi yang dipakai.
    hasil: function (m, r) {
      return { P4: H.lolosPada(r.titik, 4.75), P10: H.lolosPada(r.titik, 2), P40: H.lolosPada(r.titik, 0.425), P200: H.lolosPada(r.titik, 0.075),
        D10: r.Dpakai.D10, D30: r.Dpakai.D30, D60: r.Dpakai.D60, Cu: r.Cu, Cc: r.Cc };
    },
    tampil: function (m, r, U) {
      var h = '', kartu = [], W = m.param.beratTotal, Dp = r.Dpakai;
      if (r.fraksi) {
        kartu.push(U.kartu('Gravel (kerikil)', f(r.fraksi.kerikil, 2) + ' <small>%</small>', '> 4,75 mm'),
          U.kartu('Sand (pasir)', f(r.fraksi.pasir, 2) + ' <small>%</small>', '4,75 – 0,075 mm'),
          U.kartu('Silt + clay', f(r.fraksi.halus, 2) + ' <small>%</small>', '< 0,075 mm (lolos No. 200)'));
      }
      h += U.ringkasan(kartu.concat([U.kartu('Koefisien gradasi', r.Cu ? 'C<sub>u</sub> ' + f(r.Cu, 3) : '–',
        r.Cc ? 'C<sub>c</sub> = ' + f(r.Cc, 3) + (r.dariBaca ? ' · dari bacaan grafik' : '') : 'D<sub>10</sub> tidak terbaca dari saringan')]));
      // Tabel seperti form: Saringan | Berat tertahan | Jumlah berat tertahan | Jumlah persentase di atas | melalui, ditutup PAN.
      var baris = r.ayakan.map(function (a) { return [a.nama, f(a.tertahan, 2), f(a.kumulatif, 2), f(a.persenTertahan, 2), f(a.lolos, 2)]; });
      if (r.adaBarisPan) baris.push(['PAN', f(r.pan, 2), f(r.jumlah, 2), f(r.panPersen, 2), f(100 - r.panPersen, 2)]);
      h += '<h3>Tabel hasil (urutan form lab)</h3><p class="kecil">Berat kering: ' + f(W, 2) + ' gram</p>' +
        U.tabel([{ teks: 'Saringan' }, 'Berat tertahan (gram)', 'Jumlah berat tertahan (gram)', 'Jumlah persentase di atas (%)', 'Jumlah persentase melalui (%)'], baris, null, { angkaMulai: 1 });
      if (!r.adaBarisPan) h += '<p class="kecil redup">Baris PAN belum diisi. Jumlah tertahan saringan ' + f(r.jumlah, 2) + ' gram dari berat kering ' + f(W, 2) + ' gram.</p>';
      else if (Math.abs(r.hilang) > 1e-9) h += '<p class="kecil redup">Jumlah tertahan termasuk PAN ' + f(r.jumlah, 2) + ' gram, selisih ' + f(r.hilang, 2) + '% dari berat kering.</p>';
      h += U.grafik(grafik(r), 'Grafik gradasi butiran: persen lolos terhadap diameter (log), 0,001–10 mm seperti form. ' +
        (r.dariBaca ? 'Penanda D memakai bacaan grafik yang diisi.' : 'D₁₀, D₃₀, D₆₀ dibaca dengan interpolasi pada skala log.'));
      // Catatan seperti bagian bawah grafik gradasi form (hlm 15).
      var fr = r.fraksi;
      h += '<h3>Catatan grafik gradasi</h3>' + U.tabel(['Fraksi', '%', 'Diameter', 'mm', 'Koefisien', 'Nilai'], [
        ['Clay', fr ? 'butuh hidrometer' : '–', 'D<sub>10</sub>', Dp.D10 ? formatMm(Dp.D10) : '–', 'C<sub>u</sub>', r.Cu ? f(r.Cu, 3) : '–'],
        ['Silt', fr ? 'silt + clay = ' + f(fr.halus, 2) : '–', 'D<sub>30</sub>', Dp.D30 ? formatMm(Dp.D30) : '–', 'C<sub>c</sub>', r.Cc ? f(r.Cc, 3) : '–'],
        ['Sand', fr ? f(fr.pasir, 2) : '–', 'D<sub>60</sub>', Dp.D60 ? formatMm(Dp.D60) : '–', '', ''],
        ['Gravel', fr ? f(fr.kerikil, 2) : '–', '', '', '', '']], null, { kanan: [1, 3, 5] }) +
        '<p class="kecil redup">Batas fraksi mengikuti kepala grafik form: gravel > 4,75 mm (No. 4), sand 4,75–0,075 mm (No. 200), silt dan clay < 0,075 mm. ' +
        'Silt dan clay baru bisa dipisah dengan analisa hidrometer.' + (r.dariBaca ? ' D interpolasi: D<sub>10</sub> ' + (r.D10 ? formatMm(r.D10) : 'tidak terbaca') + ', D<sub>30</sub> ' +
          (r.D30 ? formatMm(r.D30) : '–') + ', D<sub>60</sub> ' + (r.D60 ? formatMm(r.D60) : '–') + ' mm.' : '') + '</p>';

      var isi = r.ayakan.filter(function (a) { return a.tertahan > 0; }), a1 = isi[0] || r.ayakan[0], a2 = isi[1];
      var no = 0;
      h += '<h3>Langkah hitungan</h3>';
      [a1, a2].forEach(function (a, i) {
        if (!a) return;
        var sebelum = a.kumulatif - a.tertahan;
        h += U.langkah((i + 1) + ') Saringan ' + a.nama,
          '<p>Berat tertahan = ' + f(a.tertahan, 2) + ' gram</p>' +
          U.rumus('\\text{Jumlah berat tertahan} = ' + U.t(sebelum, 2) + ' + ' + U.t(a.tertahan, 2) + ' = ' + U.t(a.kumulatif, 2) + '\\ \\text{gram} \\qquad (' + (++no) + ')') +
          U.rumus('\\%\\,\\text{tertahan} = \\dfrac{\\text{jumlah berat tertahan}}{\\text{berat kering}}\\times 100\\% = \\dfrac{' + U.t(a.kumulatif, 2) + '}{' + U.t(W, 2) + '}\\times 100\\% = ' + U.t(a.persenTertahan, 2) + '\\% \\qquad (' + (++no) + ')') +
          U.rumus('\\%\\,\\text{lolos} = 100\\% - ' + U.t(a.persenTertahan, 2) + '\\% = ' + U.t(a.lolos, 2) + '\\% \\qquad (' + (++no) + ')'));
      });
      h += '<p class="kecil redup">Saringan lain dihitung dengan cara yang sama; hasilnya ada di tabel.</p>';
      if (Dp.D10 && Dp.D30 && Dp.D60) {
        h += U.langkah('3) Nilai C<sub>u</sub> dan C<sub>c</sub>',
          '<p>D<sub>10</sub> = ' + formatMm(Dp.D10) + ' mm; D<sub>30</sub> = ' + formatMm(Dp.D30) + ' mm; D<sub>60</sub> = ' + formatMm(Dp.D60) + ' mm (' + (r.dariBaca ? 'dibaca dari grafik' : 'interpolasi log') + ').</p>' +
          U.rumus('C_u = \\dfrac{D_{60}}{D_{10}} = \\dfrac{' + U.t(Dp.D60, 3) + '}{' + U.t(Dp.D10, 3) + '} = ' + U.t(r.Cu, 3) + ' \\qquad (' + (++no) + ')') +
          U.rumus('C_c = \\dfrac{D_{30}^2}{D_{60}\\cdot D_{10}} = \\dfrac{' + U.t(Dp.D30, 3) + '^2}{' + U.t(Dp.D60, 3) + '\\times' + U.t(Dp.D10, 3) + '} = ' + U.t(r.Cc, 3) + ' \\qquad (' + (++no) + ')') +
          (r.dariBaca ? '' : '<p class="ket">D<sub>x</sub> = diameter (mm) dengan x% lolos, diinterpolasi linier pada log diameter di antara dua saringan yang mengapitnya.</p>'));
      }
      h += bedaContoh(m, 'Langkah tulisan tangan (No. 10: 2,896%; No. 40: 26,064%; No. 200: 88,632% tertahan, lolos 11,368%) sama dengan alat. ' +
        'Tabel form di contoh menulis angka lain (2,886 / 97,114; 25,976 / 74,024; 88,332 / 11,668) karena salah hitung. ' +
        'D<sub>10</sub> = 0,081 mm dibaca dari grafik, padahal saringan No. 200 (0,075 mm) masih meloloskan 11,37%, jadi D<sub>10</sub> seharusnya di bawah 0,075 mm dan perlu data hidrometer. ' +
        'Dengan D bacaan grafik, C<sub>u</sub> = 3,333 sama; C<sub>c</sub> contoh 0,772 karena angkanya dipotong (alat membulatkan: 0,773). ' +
        'Interpolasi log memberi D<sub>30</sub> = ' + (r.D30 ? formatMm(r.D30) : '–') + ' dan D<sub>60</sub> = ' + (r.D60 ? formatMm(r.D60) : '–') + ' mm. ' +
        'Contoh sampel tak terganggu 300 gram di laporan yang sama (No. 10 0,34; No. 40 0,74; No. 200 293,84; PAN 5,08) bisa dihitung dengan mengganti data.');
      h += belajar('Menentukan sebaran ukuran butir tanah yang tertahan saringan No. 200 ke atas, lalu menggambar grafik gradasi dan menghitung C<sub>u</sub> dan C<sub>c</sub>.',
        ['Catat berat tertahan tiap saringan dan PAN.', 'Jumlahkan berat tertahan dari saringan teratas sampai saringan itu (jumlah berat tertahan).',
          'Persen tertahan = jumlah berat tertahan / berat kering × 100%.', 'Persen lolos = 100% − persen tertahan.',
          'Gambar persen lolos terhadap diameter (skala log), baca D<sub>10</sub>, D<sub>30</sub>, D<sub>60</sub>, lalu hitung C<sub>u</sub> dan C<sub>c</sub>.'],
        'Persen lolos No. 4 dan No. 200 menentukan gravel, sand, dan butir halus. Kriteria gradasi baik dari C<sub>u</sub> dan C<sub>c</sub> (SNI 6371:2015) dipakai di alat klasifikasi.');
      return h;
    },
    ekspor: function (m, r) {
      var b = [['Berat kering', 'gram', m.param.beratTotal], [], ['Saringan', 'Berat tertahan (gram)', 'Jumlah berat tertahan (gram)', 'Jumlah persentase di atas (%)', 'Jumlah persentase melalui (%)']];
      r.ayakan.forEach(function (a) { b.push([a.nama, a.tertahan, a.kumulatif, a.persenTertahan, a.lolos]); });
      if (r.adaBarisPan) b.push(['PAN', r.pan, r.jumlah, r.panPersen, 100 - r.panPersen]);
      b.push([]);
      ['D10', 'D30', 'D60'].forEach(function (k) { b.push([k, 'mm', r.Dpakai[k] || '', r.dariBaca ? 'baca grafik' : 'interpolasi']); });
      b.push(['Cu', '-', r.Cu || ''], ['Cc', '-', r.Cc || '']);
      if (r.fraksi) b.push(['Gravel', '%', r.fraksi.kerikil], ['Sand', '%', r.fraksi.pasir], ['Silt + clay', '%', r.fraksi.halus]);
      return b;
    },
    sumber: ['Badan Standardisasi Nasional. SNI 3423:2008 <em>Cara uji analisis ukuran butir tanah</em>. Form lab mencantumkan SNI 1968-2008 di kepala form analisa saringan.',
      'Badan Standardisasi Nasional. SNI 6371:2015. Batas fraksi kerikil, pasir, dan butir halus.',
      'ASTM E11. Ukuran lubang saringan standar.',
      'Form analisa saringan dan grafik gradasi butiran, Laboratorium Mekanika Tanah, Teknik Sipil Universitas Jambi.']
  });
})();
