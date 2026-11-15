/* Definisi alat: kuat geser langsung dan kuat tekan bebas. Halaman memilih lewat data-alat.
 * Kolom dan urutan mengikuti form lab UNJA (geser langsung hlm 17, kuat tekan bebas hlm 18) dan contoh pengolahan
 * data laporan praktikum (Direct Shear Test, UCS). */
(function () {
  'use strict';

  var H = window.HitungKekuatan, f = Umum.f, jenis = document.getElementById('alat-praktikum').dataset.alat;
  var WARNA = ['aksen', 'biru', 'hijau', 'ungu', 'teks'];
  function belajar(tujuan, alur, arti) {
    return '<section class="kartu belajar"><h3>Belajar dari pengujian ini</h3><p><strong>Tujuan.</strong> ' + tujuan + '</p>' +
      '<p><strong>Alur pengolahan</strong> (urutan seperti contoh laporan):</p><ol>' + alur.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ol>' +
      (arti ? '<p><strong>Arti hasil.</strong> ' + arti + '</p>' : '') + '</section>';
  }
  function beda(isi) { return '<div class="catatan"><strong>Beda dengan contoh laporan.</strong><ul>' + isi.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>'; }

  if (jenis === 'geser-langsung') {
    var GESER = [];
    for (var g = 0.25; g <= 6.001; g += 0.25) GESER.push({ geser: Math.round(g * 100) / 100 });
    // Contoh laporan Direct Shear Test (form terisi): waktu, penggeseran, dial reading tiap benda uji (sudah + 0,34).
    var WAKTU_C = [0.25, 0.5, 0.75, 1, 1.15, 1.30, 1.45, 2, 2.15, 2.30];
    var DIAL = [
      [1.84, 2.84, 4.34, 4.84, 5.84, 6.84, 7.34, 8.84, 9.34, 8.34],
      [2.64, 3.34, 5.34, 7.34, 8.34, 9.34, 10.34, 11.84, 10.34, null],
      [1.84, 2.84, 11.84, 14.34, 17.34, 17.84, 19.34, 20.34, 21.34, 21.34]];

    Praktikum.pasang({
      id: 'geser-langsung', judulEkspor: 'Pemeriksaan kuat geser langsung (SNI 3420:2016)',
      nim: { ket: 'pembacaan arloji gaya geser (dial reading) semua benda uji', tabel: { bacaan: ['*dinamis'] } },
      parameter: [
        { id: 'bentuk', label: 'Bentuk benda uji', pilihan: [['bulat', 'Bulat (cincin)'], ['persegi', 'Persegi']] },
        { id: 'ukuran', label: 'Diameter (atau sisi) contoh', satuan: 'cm' },
        { id: 'tinggi', label: 'Tinggi contoh', satuan: 'cm', bantuan: 'Untuk dicatat di laporan.' },
        { id: 'luas', label: 'Luas contoh', satuan: 'cm²', bantuan: 'Opsional. Isi bila luas sudah tertulis di form lab; bila kosong dihitung ¼ π D².' },
        { id: 'kalibrasi', label: 'Kalibrasi proving ring', satuan: 'kg/divisi', bantuan: 'Form lab: 0,540.' },
        { id: 'koreksiLuas', label: 'Luas bidang geser', pilihan: [['tidak', 'Luas awal (seperti form lab)'], ['ya', 'Luas terkoreksi terhadap penggeseran']],
          bantuan: 'Koreksi luas memperhitungkan berkurangnya luas kontak saat kotak bergeser.' }],
      tabel: [
        { id: 'benda', judul: 'Gaya normal tiap benda uji', kolom: 'Benda uji', awal: 3, min: 2, maks: 5, baris: [
          { id: 'P', label: 'Gaya normal', simbol: 'P', satuan: 'kg' }] },
        { id: 'bacaan', jenis: 'daftar', judul: 'Dial reading gaya geser', namaPendek: 'Bacaan geser', maks: 60, awal: GESER,
          keterangan: 'Satu kolom dial reading per benda uji, mengikuti jumlah kolom di tabel gaya normal. Waktu boleh kosong; penggeseran dalam mm.',
          kolom: [{ id: 'waktu', label: 'Waktu', satuan: 'menit', opsional: true, kunci: true }, { id: 'geser', label: 'Penggeseran', satuan: 'mm', kunci: true }],
          kolomDari: { tabel: 'benda', awalan: 'd', label: function (nama) { return 'Dial reading BU ' + nama; }, satuan: 'divisi' } }],
      contoh: { param: { bentuk: 'bulat', ukuran: 6.31, tinggi: 2, luas: 31.256, kalibrasi: 0.54, koreksiLuas: 'tidak' }, tabel: {
        benda: [{ nama: '1', P: 3.229 }, { nama: '2', P: 6.437 }, { nama: '3', P: 13.165 }],
        bacaan: WAKTU_C.map(function (w, i) { var o = { waktu: w, geser: Math.round(0.25 * (i + 1) * 100) / 100 }; DIAL.forEach(function (d, j) { if (d[i] !== null) o['d' + j] = d[i]; }); return o; }) } },
      kosong: { param: { bentuk: 'bulat', ukuran: '', tinggi: '', luas: '', kalibrasi: 0.54, koreksiLuas: 'tidak' } },
      hitung: function (m) {
        return H.geserLangsung({ bentuk: m.param.bentuk, ukuran: m.param.ukuran, luas: m.param.luas, kalibrasi: m.param.kalibrasi, koreksiLuas: m.param.koreksiLuas,
          benda: m.tabel.benda, bacaan: m.tabel.bacaan });
      },
      hasil: function (m, r) { return { c: r.c, phi: r.phi }; },
      tampil: function (m, r, U) {
        var h = '', B = r.benda;
        h += U.ringkasan([U.kartu('Kohesi', f(r.c, 3) + ' <small>kg/cm²</small>', 'c = ' + f(r.c * r.kPa, 1) + ' kPa'),
          U.kartu('Sudut geser dalam', f(r.phi, 2) + ' <small>°</small>', 'φ; tan φ = ' + f(r.tanPhi, 3) + (B.length > 2 ? '; R² = ' + f(r.r2, 3) : ''))]);
        var tmaks = 0, gmaks = 0;
        B.forEach(function (b) { b.kurva.forEach(function (k) { tmaks = Math.max(tmaks, k.tau); gmaks = Math.max(gmaks, k.geser); }); });
        var smaks = Math.max.apply(null, B.map(function (b) { return b.puncak.sigma; })) * 1.25;
        var ymaks = Math.max(tmaks, r.c + r.tanPhi * smaks) * 1.15;
        h += '<div class="kisi-grafik">' + U.grafik(Grafik.plot({ id: 'mohr', judul: 'Tegangan geser terhadap tegangan normal', x: { min: 0, max: Math.ceil(smaks * 10) / 10, label: 'σ (kg/cm²)' },
          y: { min: 0, max: Math.ceil(ymaks * 20) / 20, label: 'τ (kg/cm²)' },
          seri: [{ titik: [[0, r.c], [smaks, r.c + r.tanPhi * smaks]], warna: 'teks', label: 'τ = ' + f(r.c, 3) + ' + σ tan ' + f(r.phi, 1) + '°' },
            { titik: B.map(function (b) { return [b.puncak.sigma, b.puncak.tau]; }), garis: false, penanda: true, warna: 'aksen' }],
          tanda: B.map(function (b) { return { x: b.puncak.sigma, y: b.puncak.tau, teks: 'BU ' + b.nama, posisi: 'kanan', titik: false, atas: true }; }) }),
          'Grafik τ terhadap σ seperti form: garis keruntuhan dari tegangan geser puncak tiap benda uji (kuadrat terkecil).') +
          U.grafik(Grafik.plot({ id: 'geser', judul: 'Tegangan geser terhadap penggeseran', x: { min: 0, max: Math.ceil(gmaks), label: 'Penggeseran (mm)' },
            y: { min: 0, max: Math.ceil(tmaks * 1.15 * 20) / 20, label: 'τ (kg/cm²)' },
            seri: B.map(function (b, i) { return { titik: b.kurva.map(function (k) { return [k.geser, k.tau]; }), penanda: true, warna: WARNA[i], label: 'BU ' + b.nama + ' (σ = ' + f(b.sigma0, 3) + ')' }; }) }),
          'Tegangan geser terhadap penggeseran tiap benda uji. Nilai puncak dipakai untuk garis keruntuhan.') + '</div>';
        h += '<h3>Gaya normal dan tegangan normal</h3>' + U.tabel(['Uraian', 'Simbol', 'Satuan'].concat(B.map(function (b) { return 'BU ' + b.nama; })), [
          ['Gaya normal', 'P', 'kg'].concat(B.map(function (b) { return f(b.P, 3); })),
          ['Tegangan normal', 'σ = P/A', 'kg/cm²'].concat(B.map(function (b) { return f(b.sigma0, 3); })),
          ['Dial reading puncak', '', 'divisi'].concat(B.map(function (b) { return f(b.puncak.bacaan, 2); })),
          ['Gaya geser puncak', '', 'kg'].concat(B.map(function (b) { return f(b.puncak.gaya, 3); })),
          ['Penggeseran saat puncak', '', 'mm'].concat(B.map(function (b) { return f(b.puncak.geser, 2); })),
          ['Tegangan geser puncak', 'τ<sub>f</sub>', 'kg/cm²'].concat(B.map(function (b) { return f(b.puncak.tau, 3); }))]);
        // Tabel bacaan seperti form: Waktu | Penggeseran | (Dial reading, Gaya geser, Tegangan geser) per benda uji
        var baris = r.bacaanUrut.map(function (row) {
          var sel = [row.waktu === null || row.waktu === undefined ? '–' : f(row.waktu, 2), f(row.geser, 2)];
          B.forEach(function (b) {
            var k = b.kurva.filter(function (q) { return q.geser === row.geser; })[0];
            sel.push(k ? f(k.bacaan, 2) : '–', k ? f(k.gaya, 3) : '–', k ? f(k.tau, 3) : '–');
          });
          return sel;
        });
        var kepala = [{ teks: 'Waktu (menit)' }, { teks: 'Penggeseran (mm)', angka: true }];
        B.forEach(function (b) { kepala.push('BU ' + b.nama + ': dial reading', 'BU ' + b.nama + ': gaya geser (kg)', 'BU ' + b.nama + ': tegangan geser (kg/cm²)'); });
        h += '<h3>Tabel hasil pembacaan</h3>' + U.tabel(kepala, baris, null, { angkaMulai: 0 });
        h += '<h3>Contoh, alat, dan hasil</h3>' + U.tabel(['Uraian', 'Nilai', 'Satuan'], [
          ['Contoh: diameter', m.param.ukuran > 0 ? f(+m.param.ukuran, 2) : '–', 'cm'], ['Contoh: tinggi', m.param.tinggi > 0 ? f(+m.param.tinggi, 2) : '–', 'cm'],
          ['Contoh: luas', f(r.A0, 3), 'cm²'], ['Alat: kalibrasi proving ring', f(+m.param.kalibrasi, 3), 'kg/divisi'],
          ['Hasil: c', f(r.c, 3), 'kg/cm²'], ['Hasil: φ', f(r.phi, 2), '°']], null, { kanan: [1] });
        var b0 = B[0], k0 = b0.kurva[0];
        h += '<h3>Langkah hitungan</h3>';
        h += U.langkah('Luas contoh', m.param.luas > 0 ? '<p>Luas contoh diambil dari form lab: A = ' + f(r.A0, 3) + ' cm²' + (m.param.ukuran > 0 ? ' (¼ π D² = ' + f(Math.PI * m.param.ukuran * m.param.ukuran / 4, 3) + ' cm² bila memakai π penuh)' : '') + '.</p>'
          : U.rumus((m.param.bentuk === 'persegi' ? 'A = B^2 = ' + U.t(m.param.ukuran, 2) + '^2' : 'A = \\pi r^2 = \\pi\\times' + U.t(m.param.ukuran / 2, 3) + '^2') + ' = ' + U.t(r.A0, 3) + '\\ \\text{cm}^2 \\qquad (1)'));
        h += U.langkah('a. Tegangan normal (BU ' + b0.nama + ')', U.rumus('\\sigma = \\dfrac{\\text{gaya normal}}{\\text{luas}} = \\dfrac{' + U.t(b0.P, 3) + '}{' + U.t(r.A0, 3) + '} = ' + U.t(b0.sigma0, 3) + '\\ \\text{kg/cm}^2 \\qquad (2)'));
        h += U.langkah('b. Gaya geser (BU ' + b0.nama + ', penggeseran ' + f(k0.geser, 2) + ' mm)', U.rumus('P = \\text{dial reading}\\times\\text{kalibrasi proving ring} = ' + U.t(k0.bacaan, 2) + '\\times' + U.t(+m.param.kalibrasi, 3) + ' = ' + U.t(k0.gaya, 3) + '\\ \\text{kg} \\qquad (3)'));
        h += U.langkah('c. Tegangan geser', U.rumus('\\tau = \\dfrac{P}{\\text{luas}} = \\dfrac{' + U.t(k0.gaya, 3) + '}{' + U.t(k0.A, 3) + '} = ' + U.t(k0.tau, 3) + '\\ \\text{kg/cm}^2 \\qquad (4)') +
          (m.param.koreksiLuas === 'ya' ? '<p class="ket">Luas terkoreksi pada penggeseran δ: ' + (m.param.bentuk === 'persegi' ? 'A<sub>c</sub> = B (B − δ).' : 'A<sub>c</sub> = (D²/2)(θ − sin θ cos θ), θ = arccos(δ/D).') + '</p>' : ''));
        h += U.langkah('d. Kohesi dan sudut geser dalam', U.rumus('\\tau_f = c + \\sigma\\tan\\varphi \\qquad (5)') +
          U.rumus('\\tan\\varphi = ' + U.t(r.tanPhi, 4) + '\\ \\Rightarrow\\ \\varphi = ' + U.t(r.phi, 2) + '^{\\circ},\\qquad c = ' + U.t(r.c, 3) + '\\ \\text{kg/cm}^2 = ' + U.t(r.c * r.kPa, 1) + '\\ \\text{kPa}') +
          '<p class="ket">c dan tan φ dari kuadrat terkecil ' + B.length + ' titik (σ, τ<sub>f</sub> puncak). 1 kg/cm² = 98,0665 kPa.</p>');
        h += beda(['Laporan menghitung luas = 3,14 × 3,155² = 31,256 cm²; angka ini juga tertulis di form data lab, jadi contoh memakai luas 31,256 cm². Dengan π penuh luasnya 31,273 cm².',
          'Halaman hitungan laporan menulis gaya normal 3,21 kg dan pembagi 31,6, tetapi hasil 0,103 kg/cm² sesuai 3,229 / 31,256.',
          'Gaya normal BU 2 tertulis 6,437 kg di laporan dan 6,473 kg di form data lab; contoh memakai angka laporan (6,437).',
          'BU 3 baris ke-7 tertulis 19,64, tetapi gaya geser 10,444 kg = 19,34 × 0,540 (data mentah 19 + 0,34); contoh memakai 19,34.',
          'Dua tegangan geser di form laporan tidak sama dengan gaya geser / 31,256: BU 1 baris ke-4 (2,614 / 31,256 = 0,084, tertulis 0,085) dan BU 2 baris pertama (1,426 / 31,256 = 0,046, tertulis 0,040). Alat menghitung ulang semuanya.',
          'Nilai c dan φ di form laporan kosong; alat menghitungnya dari tegangan geser puncak.']);
        h += belajar('Menentukan parameter kuat geser tanah, kohesi c dan sudut geser dalam φ, dari beberapa benda uji yang digeser di bawah gaya normal berbeda.',
          ['Hitung luas contoh (π r²).', 'Hitung tegangan normal σ = gaya normal / luas tiap benda uji.', 'Hitung gaya geser = dial reading × kalibrasi proving ring.',
            'Hitung tegangan geser τ = gaya geser / luas.', 'Ambil τ puncak tiap benda uji, gambar τ terhadap σ, lalu tarik garis lurus: titik potong = c, kemiringan = tan φ.'],
          'Garis τ = c + σ tan φ adalah kriteria keruntuhan Mohr–Coulomb (Das). Makin besar gaya normal, makin besar tegangan geser yang dibutuhkan untuk meruntuhkan tanah.');
        return h;
      },
      ekspor: function (m, r) {
        var B = r.benda, b = [['Diameter', 'cm', m.param.ukuran], ['Luas', 'cm2', r.A0], ['Kalibrasi', 'kg/div', m.param.kalibrasi], [],
          ['Waktu (menit)', 'Penggeseran (mm)'].concat([].concat.apply([], B.map(function (x) { return ['Dial BU ' + x.nama, 'Gaya geser BU ' + x.nama + ' (kg)', 'Tau BU ' + x.nama + ' (kg/cm2)']; })))];
        r.bacaanUrut.forEach(function (row) {
          var sel = [row.waktu === null || row.waktu === undefined ? '' : row.waktu, row.geser];
          B.forEach(function (x) { var q = x.kurva.filter(function (k) { return k.geser === row.geser; })[0]; sel.push(q ? q.bacaan : '', q ? q.gaya : '', q ? q.tau : ''); });
          b.push(sel);
        });
        b.push([], ['Benda uji', 'P (kg)', 'Sigma (kg/cm2)', 'Tau puncak (kg/cm2)']);
        B.forEach(function (x) { b.push([x.nama, x.P, x.puncak.sigma, x.puncak.tau]); });
        b.push([], ['Kohesi c', 'kg/cm2', r.c], ['Sudut geser dalam', 'derajat', r.phi]);
        return b;
      },
      sumber: ['Badan Standardisasi Nasional. SNI 3420:2016, uji kuat geser langsung tanah (nomor standar sesuai form laboratorium).',
        'Form pemeriksaan kuat geser langsung Laboratorium Mekanika Tanah UNJA: kalibrasi proving ring 0,540; kolom waktu, penggeseran, dial reading, gaya geser, tegangan geser.',
        'Das, B. M. <em>Principles of geotechnical engineering</em>. Cengage Learning. Kriteria keruntuhan Mohr–Coulomb.']
    });
  }

  if (jenis === 'tekan-bebas') {
    var WAKTU_UCS = [0, 0.5].concat(Array.apply(null, Array(20)).map(function (_, i) { return i + 1; }));
    // Contoh laporan UCS.pdf hlm 2 (form terisi): pembacaan arloji deformasi dan arloji beban (beban sudah + 0,34).
    // Baris waktu 0 (regangan 0) kolom beban kosong di form, jadi BEB mulai dari baris waktu 0,5.
    var REG = [0, 35, 70, 140, 210, 280, 350, 420, 490], BEB = [null, 1.84, 2.84, 4.34, 5.34, 6.24, 7.04, 7.44, 6.74];
    // Tegangan kecil (satuan kg dengan kalibrasi 0,0045) tetap dibaca dengan cukup desimal.
    function fs(v) { return f(v, Math.abs(v) > 0 && Math.abs(v) < 0.01 ? 7 : 4); }
    function ts(U, v) { return U.t(v, Math.abs(v) > 0 && Math.abs(v) < 0.01 ? 7 : 4); }
    Praktikum.pasang({
      id: 'tekan-bebas', judulEkspor: 'Pemeriksaan kuat tekan bebas (SNI 3638:2012)',
      nim: { ket: 'pembacaan arloji beban (dial reading)', tabel: { bacaan: ['beban'] } },
      parameter: [
        { id: 'diameter', label: 'Diameter contoh', satuan: 'cm' },
        { id: 'tinggi', label: 'Tinggi contoh', satuan: 'cm' },
        { id: 'luas', label: 'Luas perawal', satuan: 'cm²', bantuan: 'Opsional. Isi bila luas sudah tertulis di form lab; bila kosong dihitung ¼ π D².' },
        { id: 'berat', label: 'Berat contoh', satuan: 'gram', bantuan: 'Opsional, untuk berat isi.' },
        { id: 'tinggiSetelah', label: 'Tinggi setelah', satuan: 'cm', bantuan: 'Opsional, dicatat seperti form.' },
        { id: 'kalibrasi', label: 'Kalibrasi proving ring', satuan: 'per divisi', bantuan: 'Form lab: 0,0045.' },
        { id: 'satuanBeban', label: 'Satuan kalibrasi proving ring', pilihan: [['kg', 'kg per divisi (seperti form: beban dalam kg)'], ['kN', 'kN per divisi']] },
        { id: 'satuanRegangan', label: 'Satuan arloji deformasi', satuan: 'mm/divisi', bantuan: 'Umumnya 0,01 mm per divisi.' },
        { id: 'w', label: 'Kadar air', satuan: '%', bantuan: 'Opsional, untuk berat isi kering.', dariAlat: { alat: 'kadar-air', nama: 'kadar air', ambil: function (h) { return h.w; }, d: 2 } },
        { id: 'quRemas', label: 'q<sub>u</sub> contoh teremas', satuan: 'kPa', bantuan: 'Opsional, untuk sensitivitas.' }],
      tabel: [{ id: 'bacaan', jenis: 'daftar', judul: 'Pembacaan arloji', namaPendek: 'Bacaan', maks: 60, awal: WAKTU_UCS.map(function (t) { return { t: t }; }),
        keterangan: 'Seperti form: waktu 0; 0,5; 1 … 20 menit sudah terisi. Isi pembacaan arloji deformasi (regangan) dan pembacaan arloji beban. Pada baris waktu 0 arloji beban dibiarkan kosong seperti di form; baris itu menjadi titik nol.',
        kolom: [{ id: 't', label: 'Waktu', satuan: 'menit', opsional: true, kunci: true }, { id: 'regangan', label: 'Pembacaan arloji deformasi', satuan: 'divisi' }, { id: 'beban', label: 'Pembacaan arloji beban', satuan: 'divisi', opsional: true }] }],
      contoh: { param: { diameter: 3.5, tinggi: 6, luas: 9.616, berat: '', tinggiSetelah: '', kalibrasi: 0.0045, satuanBeban: 'kg', satuanRegangan: 0.01, w: '', quRemas: '' },
        tabel: { bacaan: WAKTU_UCS.map(function (t, i) { var o = { t: t }; if (i < REG.length) { o.regangan = REG[i]; if (BEB[i] !== null) o.beban = BEB[i]; } return o; }) } },
      kosong: { param: { diameter: '', tinggi: '', luas: '', berat: '', tinggiSetelah: '', kalibrasi: 0.0045, satuanBeban: 'kg', satuanRegangan: 0.01, w: '', quRemas: '' } },
      hitung: function (m) {
        var p = m.param;
        return H.tekanBebas({ diameter: p.diameter, tinggi: p.tinggi, luas: p.luas, satuanRegangan: p.satuanRegangan, satuanBeban: p.satuanBeban, kalibrasi: p.kalibrasi,
          berat: p.berat, w: p.w, quRemas: p.quRemas, bacaan: m.tabel.bacaan });
      },
      hasil: function (m, r) { return { qu: r.quKPa, cu: r.cuKPa }; },
      tampil: function (m, r, U) {
        var p = m.param, h = '', T = r.titik, kg = p.satuanBeban !== 'kN', satB = kg ? 'kg' : 'kN', sat = satB + '/cm²';
        var kartu = [U.kartu('Kuat tekan bebas', fs(r.qu) + ' <small>' + sat + '</small>', 'q<sub>u</sub> (' + r.caraQu + ') = ' + f(r.quKPa, 3) + ' kPa'),
          U.kartu('Kohesi tak terdrainase', fs(r.cu) + ' <small>' + sat + '</small>', 'c<sub>u</sub> = q<sub>u</sub>/2 · ' + r.konsistensi.toLowerCase())];
        if (r.St) kartu.push(U.kartu('Sensitivitas', f(r.St, 2), 'S<sub>t</sub> = q<sub>u</sub> / q<sub>u,teremas</sub>'));
        if (r.E50) kartu.push(U.kartu('Modulus sekan', f(r.E50, 1) + ' <small>kPa</small>', 'E<sub>50</sub> pada ε = ' + f(r.eps50, 2) + '%'));
        h += U.ringkasan(kartu);
        var emaks = Math.max(2, Math.ceil(T[T.length - 1].eps / 2) * 2), smaks = Math.max.apply(null, T.map(function (t) { return t.sigma; }));
        h += U.grafik(Grafik.plot({ id: 'ucs', judul: 'Kurva tegangan regangan', x: { min: 0, max: emaks, label: 'Regangan (%)' },
          y: { min: 0, max: smaks * 1.2, label: 'Tegangan (' + sat + ')' },
          seri: [{ titik: T.map(function (t) { return [t.eps, t.sigma]; }), penanda: true, warna: 'aksen' }],
          vertikal: emaks >= 15 ? [{ x: 15, teks: 'ε = 15%' }] : [], horizontal: [{ y: r.qu / 2, teks: 'qu/2' }],
          tanda: [{ x: r.epsQu, y: r.qu, teks: 'qu = ' + fs(r.qu), posisi: r.epsQu > emaks * 0.6 ? 'kiri' : 'kanan', atas: true }] }),
          'Tegangan terhadap regangan dengan luas terkoreksi. Garis putus-putus mendatar: q<sub>u</sub>/2 untuk E<sub>50</sub>.');
        h += '<h3>Tabel hasil</h3>' + U.tabel([{ teks: 'Waktu (menit)' }, { teks: 'Regangan: pembacaan arloji', angka: true }, { teks: 'Regangan (%)', angka: true }, 'Beban: pembacaan arloji', 'Kalibrasi proving ring', 'Beban (' + satB + ')',
          'Luas: angka koreksi', 'Luas terkoreksi (cm²)', 'Tegangan (' + sat + ')'],
          T.map(function (t) {
            return [t.t === null || t.t === undefined ? '–' : f(t.t, t.t % 1 ? 1 : 0), f(t.regangan, 0), f(t.eps, 5), t.kosong ? '–' : f(t.beban, 2), f(+p.kalibrasi, 4), t.kosong ? '–' : f(t.P, 5),
              f(t.koreksi, 4), f(t.A, 4), t.kosong ? '–' : fs(t.sigma)];
          }), null, { angkaMulai: 0 });
        // Urutan kotak data contoh di form lab: berat isi, diameter, tinggi, luas perawal, volume, berat, tinggi setelah.
        var ber = [['Berat isi', r.gamma ? f(r.gamma, 3) : '–', 'g/cm³'], ['Diameter contoh', f(+p.diameter, 2), 'cm'], ['Tinggi contoh', f(+p.tinggi, 2), 'cm'], ['Luas perawal', f(r.A0, 4), 'cm²'],
          ['Volume contoh semula', f(r.V0, 3), 'cm³'], ['Berat contoh', p.berat > 0 ? f(+p.berat, 2) : '–', 'gram'], ['Tinggi setelah', p.tinggiSetelah > 0 ? f(+p.tinggiSetelah, 2) : '–', 'cm']];
        h += '<h3>Data contoh</h3>' + U.tabel(['Uraian', 'Nilai', 'Satuan'], ber, null, { kanan: [1] });
        // Contoh langkah memakai baris beban kedua, sama dengan contoh laporan (dial reading 2,84).
        var isi = T.filter(function (t) { return !t.kosong && t.beban > 0; }), t1 = isi[1] || isi[0] || T[1], pk = r.puncak;
        h += '<h3>Langkah hitungan</h3>';
        h += U.langkah('Luas perawal', r.luasForm ? '<p>Luas perawal diambil dari form lab: A<sub>0</sub> = ' + f(r.A0, 4) + ' cm² (¼ π D² = ' + f(Math.PI * p.diameter * p.diameter / 4, 4) + ' cm² bila memakai π penuh).</p>' : U.rumus('A_0 = \\pi r^2 = \\pi\\times' + U.t(p.diameter / 2, 3) + '^2 = ' + U.t(r.A0, 4) + '\\ \\text{cm}^2 \\qquad (1)'));
        h += U.langkah('Regangan (pembacaan ' + f(t1.regangan, 0) + ' divisi)', U.rumus('\\varepsilon = \\dfrac{\\Delta L}{L_0}\\times 100\\% = \\dfrac{' + U.t(t1.regangan, 0) + '\\times' + U.t(+p.satuanRegangan, 3) + '\\ \\text{mm}}{' + U.t(p.tinggi * 10, 1) + '\\ \\text{mm}}\\times 100\\% = ' + U.t(t1.eps, 5) + '\\% \\qquad (2)'));
        h += U.langkah('a. Beban', U.rumus('P = \\text{pembacaan arloji}\\times\\text{kalibrasi proving ring} = ' + U.t(t1.beban, 2) + '\\times' + U.t(+p.kalibrasi, 4) + ' = ' + U.t(t1.P, 5) + '\\ \\text{' + satB + '} \\qquad (3)'));
        h += U.langkah('b. Luas terkoreksi', U.rumus('A = \\dfrac{A_0}{1 - \\dfrac{\\varepsilon}{100}} = \\dfrac{' + U.t(r.A0, 4) + '}{1 - \\dfrac{' + U.t(t1.eps, 5) + '}{100}} = ' + U.t(t1.A, 4) + '\\ \\text{cm}^2 \\qquad (4)') +
          '<p class="ket">Angka koreksi = 1 / (1 − ε/100) = ' + f(t1.koreksi, 4) + '.</p>');
        h += U.langkah('c. Tegangan', U.rumus('\\sigma = \\dfrac{P}{A} = \\dfrac{' + U.t(t1.P, 5) + '}{' + U.t(t1.A, 4) + '} = ' + ts(U, t1.sigma) + '\\ \\text{' + sat + '} \\qquad (5)'));
        h += U.langkah('d. Kuat tekan bebas dan kohesi', U.rumus('q_u = \\sigma_{\\text{puncak}} = ' + ts(U, r.qu) + '\\ \\text{' + sat + '}\\ (\\varepsilon = ' + U.t(r.epsQu, 2) + '\\%),\\qquad c_u = \\dfrac{q_u}{2} = ' + ts(U, r.cu) + '\\ \\text{' + sat + '} \\qquad (6)') +
          '<p class="ket">' + (r.caraQu === 'puncak' ? 'q<sub>u</sub> = tegangan puncak pada regangan ≤ 15% (ASTM D2166). Puncak di pembacaan regangan ' + f(pk.regangan, 0) + '.' : 'Tegangan belum mencapai puncak sampai regangan 15%, jadi q<sub>u</sub> diambil pada ε = 15%.') +
          ' Dalam kPa: q<sub>u</sub> = ' + f(r.quKPa, 3) + ' kPa (1 kg/cm² = 98,0665 kPa; 1 kN/cm² = 10.000 kPa). Konsistensi menurut rentang q<sub>u</sub> (Das): <strong>' + r.konsistensi.toLowerCase() + '</strong>.</p>');
        if (r.gamma) h += U.langkah('Berat isi', U.rumus('\\gamma = \\dfrac{W}{A_0 L_0} = \\dfrac{' + U.t(p.berat, 2) + '}{' + U.t(r.A0, 3) + '\\times' + U.t(p.tinggi, 2) + '} = ' + U.t(r.gamma, 3) + '\\ \\text{g/cm}^3 \\qquad (7)') +
          (r.gammaD ? U.rumus('\\gamma_d = \\dfrac{\\gamma}{1 + w} = ' + U.t(r.gammaD, 3) + '\\ \\text{g/cm}^3') : ''));
        h += beda(['Laporan menghitung luas dalam mm² lalu dikali 0,000001, sehingga luas terkoreksi dalam m² dan tegangan tertulis 8,560 … 32,379 (kg/m²). Alat memakai satuan form: luas cm² dan tegangan kg/cm², jadi angkanya 10.000 kali lebih kecil (0,0008560 … 0,0032380 kg/cm²).',
          'Luas perawal laporan = 3,14 × 17,5² = 961,6 mm² (di halaman hitungan tertulis 3,14 × 17,5, kuadratnya terlewat) dan ditulis di kotak cm² form. Contoh memakai luas perawal 9,616 cm²; dengan π penuh luasnya 9,621 cm² (selisih sekitar 0,05%).',
          'Contoh hitungan laporan memakai dial reading 2,84 dengan pembagi 1 − 0,58333/100 = 0,99417 (regangan baris sebelumnya), tetapi hasilnya 0,000973 m² sesuai regangan 1,16667% (pembagi 0,98833), sama dengan tabel form. Alat memakai regangan dari baris yang sama dengan bebannya.',
          'Tegangan 19,83; 24,114; 27,838; 31,022; 32,379 di laporan berbeda di digit terakhir karena luas terkoreksi dibulatkan lebih dulu. Tanpa pembulatan: 19,836; 24,115; 27,839; 31,023; 32,380 (× 10⁻⁴ kg/cm²). Baris terakhir tertulis 28,9654; hitungan ulang 28,9653.',
          'Luas terkoreksi pada regangan 3,5% tertulis 0,000997 m²; 961,6 / 0,965 = 996,48 mm² = 0,000996 m² (9,9648 cm²).',
          'Kolom angka koreksi di form laporan (1,005; 1,010; 1,020 …) tidak sama dengan 1/(1 − ε) (1,006; 1,012; 1,024 …), tetapi luas terkoreksinya sudah memakai A<sub>0</sub>/(1 − ε). Alat menulis angka koreksi = 1/(1 − ε).',
          'Bila kalibrasi 0,0045 sebenarnya dalam kN per divisi, pilih "kN per divisi": q<sub>u</sub> contoh menjadi sekitar 32 kPa.',
          'Form data lab mentah menulis diameter 38,2 dan tinggi 66 dengan pembacaan beban lain; contoh memakai angka yang dipakai laporan (35 mm dan 60 mm). Kolom beban baris waktu 0 kosong di form dan di contoh.']);
        h += belajar('Mengukur kuat tekan tanah kohesif tanpa tekanan samping (q<sub>u</sub>); setengahnya dipakai sebagai kohesi tak terdrainase c<sub>u</sub>.',
          ['Hitung luas perawal A<sub>0</sub> = π r².', 'Hitung regangan dari pembacaan arloji deformasi.', 'Hitung beban = pembacaan arloji beban × kalibrasi proving ring.',
            'Hitung luas terkoreksi = A<sub>0</sub> / (1 − ε).', 'Hitung tegangan = beban / luas terkoreksi.', 'Ambil tegangan puncak (atau pada ε = 15%) sebagai q<sub>u</sub>; c<sub>u</sub> = q<sub>u</sub>/2.'],
          'Konsistensi lempung menurut q<sub>u</sub> (Das): sangat lunak &lt; 25 kPa, lunak 25–50, sedang 50–100, kaku 100–200, sangat kaku 200–400, keras &gt; 400 kPa.');
        return h;
      },
      ekspor: function (m, r) {
        var b = [['Diameter', 'cm', m.param.diameter], ['Tinggi', 'cm', m.param.tinggi], ['Luas perawal', 'cm2', r.A0], ['Volume', 'cm3', r.V0], [],
          ['Waktu', 'Arloji regangan', 'Regangan (%)', 'Arloji beban', 'Kalibrasi', 'Beban', 'Angka koreksi', 'Luas terkoreksi (cm2)', 'Tegangan']];
        r.titik.forEach(function (t) { b.push([t.t === null || t.t === undefined ? '' : t.t, t.regangan, t.eps, t.kosong ? '' : t.beban, m.param.kalibrasi, t.kosong ? '' : t.P, t.koreksi, t.A, t.kosong ? '' : t.sigma]); });
        b.push([], ['qu', m.param.satuanBeban + '/cm2', r.qu], ['qu', 'kPa', r.quKPa], ['cu', 'kPa', r.cuKPa], ['Konsistensi', '', r.konsistensi]);
        if (r.St) b.push(['Sensitivitas', '-', r.St]);
        if (r.E50) b.push(['E50', 'kPa', r.E50]);
        return b;
      },
      sumber: ['Badan Standardisasi Nasional. SNI 3638:2012, uji kuat tekan bebas tanah kohesif. Berdasarkan ASTM D2166.',
        'Form pemeriksaan kuat tekan bebas Laboratorium Mekanika Tanah UNJA: kolom regangan, beban (kalibrasi proving ring 0,0045), luas (angka koreksi, luas terkoreksi), tegangan kg/cm².',
        'ASTM D2166. <em>Standard test method for unconfined compressive strength of cohesive soil</em>. Koreksi luas dan batas regangan 15%.',
        'Das, B. M. <em>Principles of geotechnical engineering</em>. Cengage Learning. Hubungan konsistensi lempung dan q<sub>u</sub>.']
    });
  }
})();
