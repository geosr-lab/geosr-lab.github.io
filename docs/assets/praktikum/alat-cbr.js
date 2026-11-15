/* Definisi alat: CBR laboratorium. Formulir dan tabel hasil mengikuti form CBR lab UNJA (hlm 20):
 * pengembangan (tanggal, jam, pembacaan, perubahan), penetrasi Waktu | Penurunan | Beban penetrasi tiap cetakan,
 * berat isi dan kadar air sebelum/sesudah, HARGA CBR atas/bawah = P/13,35 × 100 dan P/20,02 × 100.
 * Data contoh: laporan praktikum CBR (CBR.pdf hlm 4–6 form terisi PK 3 × 10, 3 × 30, 3 × 65; hlm 1–3 pengolahan data).
 * Langkah hasil mengikuti urutan "Pengolahan data" laporan: per cetakan kadar air, lalu harga CBR 2,54 dan 5,08 mm. */
(function () {
  'use strict';

  var H = window.HitungCBR, f = Umum.f;
  var CETAKAN = 3;
  var BEBAN_STD = H.BEBAN_STD; // kN pada penetrasi 2,54 dan 5,08 mm, seperti form CBR lab UNJA
  var WARNA = [['aksen', 'aksen'], ['biru', 'biru'], ['hijau', 'hijau']];

  function waktu() { var a = []; for (var t = 0; t <= 410; t += 10) a.push({ t: t }); return a; }
  function kolomPenetrasi() {
    return [{ id: 't', label: 'Waktu', satuan: 'menit', kunci: true, opsional: true },
      { id: 'xA', label: 'Penurunan atas', satuan: 'mm' }, { id: 'PA', label: 'Beban penetrasi atas', satuan: 'kN' },
      { id: 'xB', label: 'Penurunan bawah', satuan: 'mm', opsional: true }, { id: 'PB', label: 'Beban penetrasi bawah', satuan: 'kN', opsional: true }];
  }
  function keKN(v, p) { return p.satuanBeban === 'arloji' ? v * p.kalibrasi : v; }
  function belajar(tujuan, alur, arti) {
    return '<section class="kartu belajar"><h3>Belajar dari pengujian ini</h3><p><strong>Tujuan.</strong> ' + tujuan + '</p>' +
      '<p><strong>Alur pengolahan</strong> (urutan seperti contoh laporan):</p><ol>' + alur.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ol>' +
      (arti ? '<p><strong>Arti hasil.</strong> ' + arti + '</p>' : '') + '</section>';
  }
  // Catatan beda dengan contoh laporan: hanya tampil selama data contoh yang dimuat.
  function bedaContoh(m, isi) {
    return m.contoh ? '<div class="catatan"><strong>Beda dengan contoh laporan.</strong><ul>' + isi.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>' : '';
  }

  // Contoh laporan CBR (CBR.pdf hlm 4–6, form terisi PK 3 × 10, 3 × 30, 3 × 65). Penurunan dan beban per baris waktu
  // 0, 10, 20, … menit. Beban penetrasi, W1, dan W2 sudah termasuk +0,34 dari NIM penulis (beban pada 0 mm = 0,34 kN).
  var CONTOH = [
    { nama: '3 × 10', pukulan: 10, ka: [[28.84, 27.64, 11], [43.94, 41.84, 11]],
      x: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.13, 0.44, 1.03, 1.64, 2.22, 2.84, 3.46, 4.03, 4.62, 5.23, 5.79, 6.94, 7.05, 7.59, 8.21, 8.78, 9.4, 9.97, 10.6, 11.2, 11.77, 12.54],
      P: [0.34, 0.34, 0.34, 0.37, 0.50, 0.60, 0.74, 1.09, 1.95, 2.73, 3.12, 3.34, 3.49, 3.62, 3.74, 3.68, 3.96, 4.07, 4.17, 4.26, 4.36, 4.46, 4.56, 4.65, 4.74, 4.84, 4.92, 5.02, 5.11, 5.19, 5.28, 5.36, 5.45, 5.53, 5.62, 5.70, 5.78, 5.87] },
    { nama: '3 × 30', pukulan: 30, ka: [[44.24, 41.74, 11.2], [34.64, 33.04, 11]],
      x: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.22, 0.45, 0.70, 0.98, 1.24, 1.5, 1.9, 2.5, 3.07, 3.63, 4.05, 4.37, 4.68, 5.02, 5.69, 6.28, 6.95, 7.50, 8.16, 8.82, 9.39, 9.90, 10.49, 10.97, 11.47, 11.94, 12.35, 12.64],
      P: [0.34, 0.38, 0.54, 0.88, 1.38, 1.98, 2.59, 3.18, 3.74, 4.34, 5.4, 6.55, 7.46, 8.14, 8.64, 9.09, 9.46, 9.82, 10.14, 10.46, 10.74, 11.03, 11.3, 11.58, 11.83, 12.09, 12.34, 12.58, 12.82, 13.07, 13.30, 13.53, 13.76, 13.76, 14.19, 14.39, 14.59, 14.79] },
    { nama: '3 × 65', pukulan: 65, ka: [[37.44, 35.34, 11], [46.14, 44.34, 11]],
      x: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.08, 0.42, 0.72, 1.72, 1.83, 2.58, 2.98, 3.57, 4.09, 4.66, 5.23, 5.76, 6.32, 6.88, 7.44, 7.96, 8.55, 9.08, 9.65, 10.24, 10.81, 11.34, 11.93, 12.54],
      P: [0.34, 0.36, 0.41, 0.49, 0.60, 0.75, 0.97, 1.26, 1.65, 2.05, 2.59, 3.11, 3.66, 4.16, 4.67, 5.13, 5.66, 6.13, 6.63, 7.15, 7.84, 8.2, 8.73, 9.2, 9.64, 10.19, 10.66, 11.13, 11.58, 12.05, 12.50, 13.02, 13.47, 13.95, 14.43, 15.34, 15.78, 16.25, 16.25] }];

  function grafik(c, i) {
    var xmaks = 0, ymaks = 0, seri = [], tanda = [];
    c.set.forEach(function (s, k) {
      s.titik.forEach(function (t) { xmaks = Math.max(xmaks, t.x); ymaks = Math.max(ymaks, t.y); });
      seri.push({ titik: s.titik.map(function (t) { return [t.x, t.y]; }), penanda: true, warna: k === 0 ? WARNA[i % 3][0] : 'teks', putus: k === 1, label: s.nama === 'Atas' ? 'Atas' : 'Bawah' });
      if (s.koreksi.x0 > 0 && s.koreksi.segmen >= 0) {
        var t0 = s.titik[s.koreksi.segmen];
        seri.push({ titik: [[s.koreksi.x0, 0], [t0.x + 1.5, t0.y + s.koreksi.lereng * 1.5]], warna: 'redup', putus: true, tebal: 1.4 });
      }
      var letak = k === 0 ? { posisi: 'kiri', atas: true } : { posisi: 'kanan', bawah: true };
      if (s.P1 !== null) tanda.push(Object.assign({ x: s.x1, y: s.P1, teks: f(s.P1, 3) + ' kN' }, letak));
      if (s.P2 !== null) tanda.push(Object.assign({ x: s.x2, y: s.P2, teks: f(s.P2, 3) + ' kN' }, letak));
    });
    return Grafik.plot({ id: 'cbr-' + (i + 1), judul: 'Cetakan ' + c.nama + ': beban terhadap penurunan', x: { min: 0, max: Math.ceil(Math.max(xmaks, 6) / 2) * 2, label: 'Penurunan (mm)' },
      y: { min: 0, max: Math.ceil(ymaks * 1.15) || 1, label: 'Beban (kN)' }, seri: seri, vertikal: [{ x: 2.54, teks: '2,54' }, { x: 5.08, teks: '5,08' }], tanda: tanda });
  }

  var tabelPenetrasi = [], nimTabel = { cetakan: ['WtA', 'WtB', 'W1A', 'W2A', 'W1B', 'W2B'] };
  for (var c = 1; c <= CETAKAN; c++) {
    tabelPenetrasi.push({ id: 'pen' + c, jenis: 'daftar', judul: 'Penetrasi cetakan ' + c, namaPendek: 'Penetrasi cetakan ' + c, maks: 60, awal: waktu(), kolom: kolomPenetrasi(),
      keterangan: c === 1 ? 'Seperti form: waktu 0–410 menit tiap 10 menit sudah terisi; isi penurunan (mm) dan beban penetrasi (kN). Kolom bawah diisi bila permukaan bawah juga diuji. Urutan cetakan sama dengan kolom tabel cetakan.' : '' });
    nimTabel['pen' + c] = ['PA', 'PB'];
  }

  Praktikum.pasang({
    id: 'cbr', judulEkspor: 'Pemeriksaan CBR (SNI 1744:2012)',
    nim: { ket: 'pembacaan arloji beban penetrasi, berat tanah + cetakan, tanah basah + cawan, dan tanah kering + cawan', tabel: nimTabel },
    parameter: [
      { id: 'jenis', label: 'Standard/modified', pilihan: [['standard', 'Standard'], ['modified', 'Modified']] },
      { id: 'satuanBeban', label: 'Kolom beban penetrasi berisi', pilihan: [['kN', 'Beban dalam kN (seperti form lab)'], ['arloji', 'Bacaan arloji cincin beban']] },
      { id: 'kalibrasi', label: 'Kalibrasi cincin beban', satuan: 'kN/divisi', tampilJika: function (p) { return p.satuanBeban === 'arloji'; } },
      { id: 'caraStd', label: 'Harga CBR', pilihan: [['form', 'Beban standar 13,35 kN dan 20,02 kN (seperti form lab)'], ['tegangan', 'Tegangan standar dalam MPa (ASTM D1883)']] },
      { id: 'A', label: 'Luas piston', satuan: 'mm²', bantuan: 'Piston standar 1935 mm² (3 in²).', tampilJika: function (p) { return p.caraStd === 'tegangan'; } },
      { id: 'std1', label: 'Tegangan standar pada 2,54 mm', satuan: 'MPa', bantuan: '6,9 MPa (1000 psi), ASTM D1883.', tampilJika: function (p) { return p.caraStd === 'tegangan'; } },
      { id: 'std2', label: 'Tegangan standar pada 5,08 mm', satuan: 'MPa', bantuan: '10,3 MPa (1500 psi), ASTM D1883.', tampilJika: function (p) { return p.caraStd === 'tegangan'; } },
      { id: 'koreksi', label: 'Koreksi titik nol', pilihan: [['tidak', 'Tanpa koreksi (seperti contoh laporan)'], ['otomatis', 'Otomatis bila awal kurva cekung'], ['manual', 'Geser manual']] },
      { id: 'koreksiManual', label: 'Pergeseran titik nol', satuan: 'mm', tampilJika: function (p) { return p.koreksi === 'manual'; } },
      { id: 'H0', label: 'Tinggi benda uji', satuan: 'mm', bantuan: 'Untuk persen pengembangan. Cetakan ASTM D1883: 116,4 mm.' },
      { id: 'satuanArloji', label: 'Satuan arloji pengembangan', pilihan: [['0.0254', '0,001 inci (0,0254 mm), seperti form'], ['0.01', '0,01 mm'], ['0.002', '0,002 mm']] },
      { id: 'gdmaks', label: 'γ<sub>d maks</sub> laboratorium', satuan: 'g/cm³', bantuan: 'Opsional, untuk derajat kepadatan benda uji.',
        dariAlat: { alat: 'pemadatan', nama: 'pemadatan', ambil: function (h) { return h.gdmaks; }, d: 3 } }],
    tabel: [
      { id: 'swell', jenis: 'daftar', judul: 'Pengembangan (0,001 inch)', namaPendek: 'Pengembangan', maks: 20, awal: 5,
        keterangan: 'Opsional, untuk benda uji yang direndam. Perubahan dihitung otomatis dari pembacaan pertama.',
        kolom: [{ id: 'tanggal', label: 'Tanggal', teks: true }, { id: 'jam', label: 'Jam', teks: true }, { id: 'bacaan', label: 'Pembacaan', satuan: 'divisi' }] },
      { id: 'cetakan', judul: 'Nomor cetakan, berat isi, dan kadar air', kolom: 'Cetakan', awal: 3, min: 1, maks: CETAKAN, baris: [
        { id: 'pukulan', label: 'Jumlah tumbukan per lapis (PK)', simbol: '', satuan: 'kali' },
        { id: 'WtA', label: 'Berat tanah + cetakan, sebelum', simbol: '', satuan: 'gram', opsional: true },
        { id: 'WtB', label: 'Berat tanah + cetakan, sesudah', simbol: '', satuan: 'gram', opsional: true },
        { id: 'Wm', label: 'Berat cetakan', simbol: '', satuan: 'gram', opsional: true },
        { id: 'V', label: 'Isi cetakan', simbol: '', satuan: 'cm³', opsional: true },
        { id: 'W1A', label: 'Kadar air sebelum: tanah basah + cawan', simbol: 'W<sub>1</sub>', satuan: 'gram', opsional: true },
        { id: 'W2A', label: 'Kadar air sebelum: tanah kering + cawan', simbol: 'W<sub>2</sub>', satuan: 'gram', opsional: true },
        { id: 'W3A', label: 'Kadar air sebelum: berat cawan', simbol: 'W<sub>3</sub>', satuan: 'gram', opsional: true },
        { id: 'W1B', label: 'Kadar air sesudah: tanah basah + cawan', simbol: 'W<sub>1</sub>', satuan: 'gram', opsional: true },
        { id: 'W2B', label: 'Kadar air sesudah: tanah kering + cawan', simbol: 'W<sub>2</sub>', satuan: 'gram', opsional: true },
        { id: 'W3B', label: 'Kadar air sesudah: berat cawan', simbol: 'W<sub>3</sub>', satuan: 'gram', opsional: true }],
        keterangan: 'Satu kolom per cetakan; nama kolom = nomor cetakan (mis. 3 × 10, seperti PK di form). Kolom ke-1 memakai tabel penetrasi cetakan 1, dan seterusnya. ' +
          'Baris berat isi dan kadar air mengikuti blok "Nomor Cetakan" dan "Kadar Air" (sebelum/sesudah) di form; nomor cawan cukup ditulis di laporan.' }]
      .concat(tabelPenetrasi),
    contoh: { param: { jenis: 'standard', satuanBeban: 'kN', kalibrasi: '', caraStd: 'form', A: 1935, std1: 6.9, std2: 10.3, koreksi: 'tidak', koreksiManual: '', H0: 116.4, satuanArloji: '0.0254', gdmaks: '' },
      tabel: (function () {
        var tb = { swell: [{}, {}, {}, {}, {}], cetakan: CONTOH.map(function (c) {
          return { nama: c.nama, pukulan: c.pukulan, W1A: c.ka[0][0], W2A: c.ka[0][1], W3A: c.ka[0][2], W1B: c.ka[1][0], W2B: c.ka[1][1], W3B: c.ka[1][2] };
        }) };
        CONTOH.forEach(function (c, i) { tb['pen' + (i + 1)] = waktu().map(function (b, k) { if (k < c.x.length) { b.xA = c.x[k]; b.PA = c.P[k]; } return b; }); });
        return tb;
      })() },
    kosong: { param: { jenis: 'standard', satuanBeban: 'kN', kalibrasi: '', caraStd: 'form', A: 1935, std1: 6.9, std2: 10.3, koreksi: 'tidak', koreksiManual: '', H0: 116.4, satuanArloji: '0.0254', gdmaks: '' },
      tabel: { cetakan: [{ nama: '1' }, { nama: '2' }, { nama: '3' }] } },
    hitung: function (m) {
      var p = m.param;
      if (p.satuanBeban === 'arloji' && !(p.kalibrasi > 0)) return { galat: ['Isi kalibrasi cincin beban (kN per divisi).'] };
      var A = p.A > 0 ? p.A : 1935, form = p.caraStd !== 'tegangan';
      var semua = m.tabel.cetakan, isiCetakan = [];
      // Kolom cetakan ke-i memakai tabel penetrasi ke-i, berapa pun kolom yang terisi.
      for (var i = 0; i < CETAKAN; i++) {
        var pen = m.tabel['pen' + (i + 1)], c = semua[i] || null;
        if (!pen.length && !c) continue;
        var atas = pen.map(function (b) { return { no: b.no, penetrasi: b.xA, beban: keKN(b.PA, p), bacaan: b.PA }; });
        var bawah = pen.filter(function (b) { return b.xB !== null && b.PB !== null; }).map(function (b) { return { no: b.no, penetrasi: b.xB, beban: keKN(b.PB, p), bacaan: b.PB }; });
        isiCetakan.push({ nama: c ? c.nama : String(i + 1), pukulan: c ? c.pukulan : null, atas: atas, bawah: bawah,
          kondisi: c ? [{ nama: 'Sebelum', Wt: c.WtA, Wm: c.Wm, V: c.V, W1: c.W1A, W2: c.W2A, W3: c.W3A }, { nama: 'Sesudah', Wt: c.WtB, Wm: c.Wm, V: c.V, W1: c.W1B, W2: c.W2B, W3: c.W3B }] : [] });
      }
      // Form lab: CBR = P / 13,35 kN × 100 dan P / 20,02 kN × 100 (setara tegangan standar = P_std / A).
      return H.hitungCetakan({ A: A, std1: form ? BEBAN_STD[0] * 1000 / A : p.std1, std2: form ? BEBAN_STD[1] * 1000 / A : p.std2, bebanStd: form ? BEBAN_STD : null,
        koreksi: p.koreksi, koreksiManual: p.koreksiManual,
        gdmaks: p.gdmaks, H0: p.H0, satuanArloji: +p.satuanArloji, cetakan: isiCetakan, swell: m.tabel.swell });
    },
    hasil: function (m, r) {
      var c = r.cetakan.filter(function (x) { return x.CBR !== undefined; });
      return { CBR: c.length ? c[c.length - 1].CBR : undefined, cetakan: c.map(function (x) { return { nama: x.nama, CBR: x.CBR }; }), pengembangan: r.pengembangan };
    },
    tampil: function (m, r, U) {
      var p = m.param, h = '', C = r.cetakan.filter(function (c) { return c.set.length; }), form = p.caraStd !== 'tegangan';
      var kartu = C.map(function (c) {
        var s = c.set[0];
        return U.kartu('CBR cetakan ' + c.nama, s.CBR1 !== undefined ? f(s.CBR1, 3) + ' <small>%</small>' : '–', '2,54 mm' + (s.CBR2 !== undefined ? '; 5,08 mm: ' + f(s.CBR2, 3) + '%' : '') + (c.set.length > 1 ? ' (atas)' : ''));
      });
      if (r.pengembangan !== undefined) kartu.push(U.kartu('Pengembangan', f(r.pengembangan, 2) + ' <small>%</small>', 'terhadap tinggi ' + f(p.H0, 1) + ' mm'));
      h += U.ringkasan(kartu);
      h += '<div class="kisi-grafik">' + C.map(function (c, i) { return U.grafik(grafik(c, i), 'Cetakan ' + c.nama + ': kurva beban terhadap penurunan. Tanda pada 2,54 dan 5,08 mm = beban hasil interpolasi.'); }).join('') + '</div>';
      // HARGA CBR seperti form
      var harga = [];
      C.forEach(function (c) {
        c.set.forEach(function (s) {
          harga.push([c.nama, s.nama.toUpperCase(), s.P1 !== null ? f(s.P1, 3) : '–', s.CBR1 !== undefined ? f(s.CBR1, 3) : '–', s.P2 !== null ? f(s.P2, 3) : '–', s.CBR2 !== undefined ? f(s.CBR2, 3) : '–']);
        });
      });
      h += '<h3>Harga CBR</h3>' + U.tabel([{ teks: 'Cetakan' }, { teks: 'Permukaan' }, { teks: 'P<sub>2,54</sub> (kN)', angka: true }, form ? 'CBR 2,54 mm = P/13,35 × 100 (%)' : 'CBR 2,54 mm (%)',
        'P<sub>5,08</sub> (kN)', form ? 'CBR 5,08 mm = P/20,02 × 100 (%)' : 'CBR 5,08 mm (%)'], harga, null, { angkaMulai: 2 });
      // Kadar air dan berat isi sebelum/sesudah per cetakan (baris seperti blok "Kadar Air" dan "Nomor Cetakan" di form)
      var kc = r.cetakan.filter(function (c) { return c.kondisi.some(function (k) { return k.w !== undefined || k.gamma !== undefined; }); });
      if (kc.length) {
        var kepala = ['Uraian', 'Simbol', 'Satuan'], kol = [];
        kc.forEach(function (c) { c.kondisi.forEach(function (k) { kepala.push(c.nama + ' ' + k.nama.toLowerCase()); kol.push(k); }); });
        var b = function (uraian, simbol, sat, ambil, d) { return [uraian, simbol, sat].concat(kol.map(function (k) { var v = ambil(k); return v === undefined || v === null ? '–' : f(v, d); })); };
        if (kc.some(function (c) { return c.kondisi.some(function (k) { return k.w !== undefined; }); })) {
          h += '<h3>Kadar air</h3>' + U.tabel(kepala, [b('Tanah basah + cawan', 'W<sub>1</sub>', 'gram', function (k) { return k.W1; }, 2),
            b('Tanah kering + cawan', 'W<sub>2</sub>', 'gram', function (k) { return k.W2; }, 2), b('Air', 'W<sub>4</sub>', 'gram', function (k) { return k.air; }, 2),
            b('Berat cawan', 'W<sub>3</sub>', 'gram', function (k) { return k.W3; }, 2), b('Tanah kering', 'W<sub>5</sub>', 'gram', function (k) { return k.kering; }, 2),
            b('Kadar air', 'w', '%', function (k) { return k.w; }, 3)]);
        }
        if (kc.some(function (c) { return c.kondisi.some(function (k) { return k.gamma !== undefined; }); })) {
          h += '<h3>Berat isi</h3>' + U.tabel(kepala, [b('Berat tanah + cetakan', '', 'gram', function (k) { return k.Wt; }, 1), b('Berat cetakan', '', 'gram', function (k) { return k.Wm; }, 1),
            b('Berat tanah basah', '', 'gram', function (k) { return k.basah; }, 1), b('Isi cetakan', '', 'cm³', function (k) { return k.V; }, 2),
            b('Berat isi basah', 'γ', 'g/cm³', function (k) { return k.gamma; }, 3), b('Berat isi kering', 'γ<sub>d</sub>', 'g/cm³', function (k) { return k.gammaD; }, 3)]);
        }
      }
      if (r.swell) {
        h += '<h3>Pengembangan</h3>' + U.tabel([{ teks: 'Tanggal' }, { teks: 'Jam' }, { teks: 'Pembacaan', angka: true }, 'Perubahan (divisi)', 'Perubahan tinggi (mm)', 'Pengembangan (%)'],
          r.swell.map(function (s) { return [s.tanggal || '–', s.jam || '–', f(s.bacaan, 1), f(s.perubahan, 1), f(s.dh, 3), f(s.persen, 2)]; }), null, { angkaMulai: 2 });
      }

      // Langkah hitungan, urutan seperti "Pengolahan data" contoh laporan: untuk tiap cetakan kadar air, lalu harga CBR.
      h += '<h3>Langkah hitungan</h3>';
      if (p.satuanBeban === 'arloji') h += '<p class="ket">Beban diubah ke kN: bacaan × ' + f(p.kalibrasi, 5) + ' kN/divisi.</p>';
      function interp(seg, x, P, no) {
        if (!seg) return '';
        return U.rumus('P = P_1 + (P_2 - P_1)\\dfrac{x - x_1}{x_2 - x_1} = ' + U.t(seg[0].y, 2) + ' + (' + U.t(seg[1].y, 2) + ' - ' + U.t(seg[0].y, 2) + ')\\dfrac{' + U.t(x, 2) + ' - ' + U.t(seg[0].x, 2) + '}{' + U.t(seg[1].x, 2) + ' - ' + U.t(seg[0].x, 2) + '} = ' + U.t(P, 3) + '\\ \\text{kN} \\qquad (' + no + ')');
      }
      var no = 0, pers = 0;
      function judulCetakan(c) { return c.pukulan > 0 ? 'pukulan ' + c.nama : 'cetakan ' + c.nama; }
      C.forEach(function (c) {
        var k0 = c.kondisi.filter(function (k) { return k.w !== undefined; })[0];
        if (k0) {
          h += U.langkah((++no) + '. Untuk ' + judulCetakan(c) + ': kadar air (' + k0.nama.toLowerCase() + ')',
            U.rumus('W_4 = W_1 - W_2 = ' + U.t(k0.W1, 2) + ' - ' + U.t(k0.W2, 2) + ' = ' + U.t(k0.air, 2) + '\\ \\text{gram} \\qquad (' + (++pers) + ')') +
            U.rumus('W_5 = W_2 - W_3 = ' + U.t(k0.W2, 2) + ' - ' + U.t(k0.W3, 2) + ' = ' + U.t(k0.kering, 2) + '\\ \\text{gram} \\qquad (' + (++pers) + ')') +
            U.rumus('w = \\dfrac{W_4}{W_5}\\times 100\\% = \\dfrac{' + U.t(k0.air, 2) + '}{' + U.t(k0.kering, 2) + '}\\times 100\\% = ' + U.t(k0.w, 3) + '\\% \\qquad (' + (++pers) + ')') +
            '<p class="ket">W<sub>1</sub> = tanah basah + cawan, W<sub>2</sub> = tanah kering + cawan, W<sub>3</sub> = berat cawan, W<sub>4</sub> = berat air, W<sub>5</sub> = berat tanah kering (simbol seperti contoh laporan).</p>');
        }
        c.set.forEach(function (s) {
          var bawah = c.set.length > 1 ? ' (' + s.nama.toLowerCase() + ')' : '';
          var isi = '';
          if (s.koreksi.x0 > 0) isi += '<p class="ket">Titik nol digeser ' + f(s.koreksi.x0, 3) + ' mm, jadi beban dibaca pada ' + f(s.x1, 2) + ' mm dan ' + f(s.x2, 2) + ' mm.</p>';
          if (s.P1 !== null) {
            isi += '<p><strong>a. Pada 2,54 mm</strong></p>' + interp(s.seg1, s.x1, s.P1, ++pers) +
              (form ? U.rumus('CBR_{2{,}54} = \\dfrac{\\text{Beban}}{13{,}35}\\times 100\\% = \\dfrac{' + U.t(s.P1, 3) + '}{13{,}35}\\times 100\\% = ' + U.t(s.CBR1, 3) + '\\% \\qquad (' + (++pers) + ')')
                : U.rumus('CBR_{2{,}54} = \\dfrac{P/A}{\\sigma_{std}}\\times 100\\% = \\dfrac{' + U.t(s.P1, 3) + '\\times 1000 / ' + U.t(+p.A, 0) + '}{' + U.t(p.std1, 1) + '}\\times 100\\% = ' + U.t(s.CBR1, 3) + '\\% \\qquad (' + (++pers) + ')'));
          }
          if (s.P2 !== null) {
            isi += '<p><strong>b. Pada 5,08 mm</strong></p>' + interp(s.seg2, s.x2, s.P2, ++pers) +
              (form ? U.rumus('CBR_{5{,}08} = \\dfrac{\\text{Beban}}{20{,}02}\\times 100\\% = \\dfrac{' + U.t(s.P2, 3) + '}{20{,}02}\\times 100\\% = ' + U.t(s.CBR2, 3) + '\\% \\qquad (' + (++pers) + ')')
                : U.rumus('CBR_{5{,}08} = \\dfrac{' + U.t(s.P2, 3) + '\\times 1000 / ' + U.t(+p.A, 0) + '}{' + U.t(p.std2, 1) + '}\\times 100\\% = ' + U.t(s.CBR2, 3) + '\\% \\qquad (' + (++pers) + ')'));
          }
          if (isi) {
            h += U.langkah((++no) + '. Harga CBR ' + judulCetakan(c) + bawah, isi +
              '<p class="ket">Beban pada 2,54 mm dan 5,08 mm diinterpolasi linier dari dua baris penurunan yang mengapitnya; harga CBR dihitung dari beban sebelum dibulatkan. ' +
              (form ? '13,35 kN dan 20,02 kN = beban standar pada penetrasi 2,54 mm dan 5,08 mm (form lab).' : '') + '</p>');
          }
        });
      });
      C.forEach(function (c) {
        var kb = c.kondisi.filter(function (k) { return k.gammaD !== undefined; })[0];
        if (!kb) return;
        h += U.langkah((++no) + '. Berat isi kering ' + judulCetakan(c) + ' (' + kb.nama.toLowerCase() + ')', U.rumus('\\gamma = \\dfrac{W_t - W_m}{V} = ' + U.t(kb.gamma, 3) + '\\ \\text{g/cm}^3,\\qquad \\gamma_d = \\dfrac{\\gamma}{1 + w} = \\dfrac{' + U.t(kb.gamma, 3) + '}{1 + ' + U.t(kb.w / 100, 4) + '} = ' + U.t(kb.gammaD, 3) + '\\ \\text{g/cm}^3 \\qquad (' + (++pers) + ')') +
          (c.D !== undefined ? U.rumus('D = \\dfrac{' + U.t(kb.gammaD, 3) + '}{' + U.t(p.gdmaks, 3) + '}\\times 100\\% = ' + U.t(c.D, 2) + '\\% \\qquad (' + (++pers) + ')') : ''));
      });
      if (r.swell) {
        var sa = r.swell[r.swell.length - 1];
        h += U.langkah((++no) + '. Pengembangan', U.rumus('\\text{Pengembangan} = \\dfrac{(' + U.t(sa.bacaan, 1) + ' - ' + U.t(r.swell[0].bacaan, 1) + ')\\times' + U.t(+p.satuanArloji, 4) + '}{' + U.t(p.H0, 1) + '}\\times 100\\% = ' + U.t(r.pengembangan, 2) + '\\% \\qquad (' + (++pers) + ')'));
      }
      h += bedaContoh(m, [
        'Langkah 1 (pukulan 3 × 10): hitungan laporan menulis berat air (W<sub>4</sub>) = 2,1, tetapi pembaginya memakai 1,2 (= 28,84 − 27,64, juga tertulis di form). Kadar air 7,212 % sama dengan alat.',
        'Harga CBR 2,54 mm pukulan 3 × 10: form menulis 33,0406 %, halaman hitungan 33,046 %. Hasil yang benar 4,4116 / 13,35 × 100 = 33,046 %.',
        'Beban 5,08 mm pukulan 3 × 10: halaman hitungan menulis 4,816 kN, form 4,815 kN; hasil interpolasi 4,8154 kN. CBR 24,053 % di laporan dihitung dari beban sebelum dibulatkan, sama dengan alat.',
        'Kadar air sesudah pukulan 3 × 30: form menulis tanah kering + cawan 3,04 gram; air 1,60 gram dan kadar air 7,26 % cocok dengan 33,04 gram, jadi data contoh memakai 33,04.',
        'Kadar air sesudah tidak dihitung di halaman pengolahan data laporan; angkanya diambil dari form (6,809 %, 7,26 %, 5,40 %).',
        'Blok berat isi (Nomor Cetakan) dan pengembangan pada form contoh kosong, jadi data contoh juga kosong.']);
      h += belajar('Mengukur daya dukung tanah yang dipadatkan dengan membandingkan beban penetrasi piston terhadap beban standar: 13,35 kN pada penetrasi 2,54 mm dan 20,02 kN pada 5,08 mm (form lab). Contoh laporan memakai tiga cetakan dengan jumlah tumbukan per lapis 10, 30, dan 65 (PK 3 × 10, 3 × 30, 3 × 65).',
        ['Untuk tiap cetakan, hitung kadar air: berat air W<sub>4</sub> = W<sub>1</sub> − W<sub>2</sub>, tanah kering W<sub>5</sub> = W<sub>2</sub> − W<sub>3</sub>, w = W<sub>4</sub>/W<sub>5</sub> × 100 %.',
          'Baca beban pada penurunan 2,54 mm dan 5,08 mm dengan interpolasi linier dari kolom penurunan dan beban penetrasi.',
          'Hitung harga CBR = beban / 13,35 × 100 % (2,54 mm) dan beban / 20,02 × 100 % (5,08 mm).',
          'Ulangi untuk cetakan berikutnya; gambar beban terhadap penurunan tiap cetakan.',
          'Bila blok berat isi dan pengembangan diisi, hitung berat isi kering dan pengembangan.'],
        'CBR yang dilaporkan biasanya nilai pada 2,54 mm. Bila CBR 5,08 mm lebih besar, uji diulang; bila hasilnya tetap, nilai 5,08 mm yang dipakai (ASTM D1883).');
      return h;
    },
    ekspor: function (m, r) {
      var b = [['Beban standar 2,54 mm', 'kN', BEBAN_STD[0]], ['Beban standar 5,08 mm', 'kN', BEBAN_STD[1]], []];
      r.cetakan.forEach(function (c) {
        c.set.forEach(function (s) {
          b.push(['Cetakan ' + c.nama + ' ' + s.nama.toLowerCase()], ['Penurunan (mm)', 'Beban (kN)']);
          s.titik.forEach(function (t) { b.push([t.x, t.y]); });
          b.push(['Beban 2,54 mm (kN)', s.P1 === null ? '' : s.P1], ['CBR 2,54 mm (%)', s.CBR1 === undefined ? '' : s.CBR1], ['Beban 5,08 mm (kN)', s.P2 === null ? '' : s.P2], ['CBR 5,08 mm (%)', s.CBR2 === undefined ? '' : s.CBR2], []);
        });
        c.kondisi.forEach(function (k) { if (k.w !== undefined) b.push(['Kadar air ' + k.nama.toLowerCase() + ' cetakan ' + c.nama, '%', k.w]); if (k.gammaD !== undefined) b.push(['Berat isi kering ' + k.nama.toLowerCase() + ' cetakan ' + c.nama, 'g/cm3', k.gammaD]); });
      });
      if (r.pengembangan !== undefined) b.push(['Pengembangan', '%', r.pengembangan]);
      return b;
    },
    sumber: ['Badan Standardisasi Nasional. SNI 1744:2012 <em>Metode uji CBR laboratorium</em>. Mengacu AASHTO T 193 dan ASTM D1883.',
      'Form pemeriksaan CBR Laboratorium Mekanika Tanah UNJA: harga CBR = beban / 13,35 × 100 dan beban / 20,02 × 100.',
      'ASTM D1883. <em>Standard test method for California Bearing Ratio (CBR) of laboratory-compacted soils</em>. Tegangan standar 6,9 MPa dan 10,3 MPa, koreksi kurva cekung.']
  });
})();
