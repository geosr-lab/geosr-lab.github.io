/* Definisi alat: batas Atterberg (batas cair, batas plastis, indeks plastisitas) dan batas susut. Halaman memilih lewat data-alat. */
(function () {
  'use strict';

  var H = window.HitungAtterberg, f = Umum.f, jenis = document.getElementById('alat-praktikum').dataset.alat;

  function kolom(daftar, uraian, simbol, satuan, ambil, d) {
    return [uraian, simbol, satuan].concat(daftar.map(function (x) { return f(ambil(x), d); }));
  }

  function grafikAliran(r) {
    var t = r.titikLL, ws = t.map(function (x) { return x.w; });
    var ymin = Math.floor(Math.min.apply(null, ws.concat([r.LL])) - 2), ymaks = Math.ceil(Math.max.apply(null, ws.concat([r.LL])) + 2);
    var linier = r.kurva && r.kurva.skala === 'linier';
    var seri = [{ titik: t.map(function (x) { return [x.N, x.w]; }), garis: false, penanda: true, warna: 'aksen', label: 'Titik uji' }];
    if (r.kurva) {
      var ujung = linier ? [5, 55] : [10, 100];
      seri.unshift({ titik: ujung.map(function (N) { return [N, r.kurva.a + r.kurva.b * (linier ? N : Math.log10(N))]; }), warna: 'teks', label: 'Kurva aliran' });
    }
    var x = linier ? { min: 5, max: 55, label: 'Jumlah pukulan, N (skala linier seperti form)', tick: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] } :
      { min: 10, max: 100, log: true, label: 'Jumlah pukulan, N (skala log)', tick: [10, 15, 20, 25, 30, 40, 50, 70, 100] };
    return Grafik.plot({ id: 'aliran', judul: 'Grafik batas cair', x: x,
      y: { min: ymin, max: ymaks, label: 'Kadar air, w (%)' }, seri: seri, vertikal: [{ x: 25, teks: 'N = 25' }],
      tanda: [{ x: 25, y: r.LL, teks: 'LL = ' + f(r.LL, 2) + '%', posisi: 'kanan' }] });
  }

  function bagan(r) {
    var LLm = Math.max(100, Math.ceil((r.LL + 10) / 10) * 10), IPm = Math.max(60, Math.ceil((r.IP + 10) / 10) * 10);
    var gA = [[20, 0], [LLm, H.garisA(LLm)]], gU = [[8, 0], [LLm, H.garisU(LLm)]];
    // Label zona diletakkan jauh dari titik tanah supaya tidak bertumpuk.
    var teks = [[44, 27, 'CL'], [70, 48, 'CH'], [42, 6, 'ML'], [80, 22, 'MH']]
      .filter(function (z) { return r.NP || Math.abs(z[0] - r.LL) > 7 || Math.abs(z[1] - r.IP) > 5; })
      .map(function (z) { return { x: z[0], y: z[1], teks: z[2], titik: false }; });
    return Grafik.plot({ id: 'plastisitas', judul: 'Bagan plastisitas', x: { min: 0, max: LLm, label: 'Batas cair, LL (%)' }, y: { min: 0, max: IPm, label: 'Indeks plastisitas, IP (%)' },
      area: [{ titik: [[25.48, 4], [29.59, 7], [7 / 0.9 + 8, 7], [4 / 0.9 + 8, 4]], warna: 'teks' }],
      seri: [{ titik: gA, warna: 'teks', label: 'Garis A: IP = 0,73 (LL − 20)' }, { titik: gU, warna: 'redup', putus: true, label: 'Garis U: IP = 0,9 (LL − 8)' }],
      vertikal: [{ x: 50 }],
      tanda: teks.concat(r.NP ? [] : [{ x: r.LL, y: r.IP, teks: (r.klas ? r.klas.simbol : '') + ' (' + f(r.LL, 1) + '; ' + f(r.IP, 1) + ')', posisi: r.LL > LLm * 0.7 ? 'kiri' : 'kanan' }]) });
  }

  // Catatan beda dengan contoh laporan: hanya tampil selama data contoh yang dimuat.
  function bedaContoh(m, isi) {
    return m.contoh ? '<div class="catatan"><strong>Beda dengan contoh laporan.</strong> ' + isi + '</div>' : '';
  }
  function belajar(tujuan, alur, arti) {
    return '<h3>Belajar dari pengujian ini</h3><div class="kartu belajar"><p><strong>Tujuan.</strong> ' + tujuan + '</p>' +
      '<p><strong>Alur pengolahan</strong></p><ol>' + alur.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ol>' +
      (arti ? '<p><strong>Membaca hasil.</strong> ' + arti + '</p>' : '') + '</div>';
  }

  if (jenis === 'atterberg') Praktikum.pasang({
    id: 'atterberg', judulEkspor: 'Pengujian konsistensi Atterberg (SNI 1967:2008 & SNI 1966:2008)',
    nim: { ket: 'berat cawan + tanah basah dan berat cawan + tanah kering (batas cair dan batas plastis)', tabel: { ll: ['W1', 'W2'], pl: ['W1', 'W2'] } },
    parameter: [
      { id: 'metodeLL', label: 'Cara menentukan batas cair', pilihan: [['banyak', 'Banyak titik (grafik batas cair)'], ['satu', 'Satu titik']],
        bantuan: 'Banyak titik: garis lurus kadar air terhadap jumlah pukulan, LL dibaca pada 25 pukulan. Satu titik: tiap titik dikoreksi ke 25 pukulan.' },
      { id: 'skalaN', label: 'Sumbu jumlah pukulan', pilihan: [['log', 'Skala log (SNI 1967:2008)'], ['linier', 'Skala linier (seperti grafik form lab)']],
        bantuan: 'Grafik di form lab memakai sumbu linier 5–55. Standar memakai skala log. Hanya dipakai pada metode banyak titik.',
        tampilJika: function (p) { return p.metodeLL !== 'satu'; } },
      { id: 'eksponen', label: 'Eksponen metode satu titik, β', bantuan: '0,121 (ASTM D4318). Hanya dipakai pada metode satu titik.',
        tampilJika: function (p) { return p.metodeLL === 'satu'; } },
      { id: 'wn', label: 'Kadar air asli, w<sub>n</sub>', satuan: '%', bantuan: 'Opsional, untuk indeks cair dan indeks konsistensi.',
        dariAlat: { alat: 'kadar-air', nama: 'kadar air', ambil: function (h) { return h.w; }, d: 2 } }],
    tabel: [
      { id: 'll', judul: 'Batas cair (LL)', kolom: 'Cawan', awal: 4, min: 1, maks: 6, baris: [
        { id: 'N', label: 'Banyaknya pukulan', simbol: 'N', satuan: '–' },
        { id: 'W1', label: 'Berat cawan + tanah basah', simbol: 'W<sub>1</sub>', satuan: 'gr' },
        { id: 'W2', label: 'Berat cawan + tanah kering', simbol: 'W<sub>2</sub>', satuan: 'gr' },
        { id: 'W3', label: 'Berat cawan', simbol: 'W<sub>3</sub>', satuan: 'gr' }],
        keterangan: 'Nama kolom = nomor cawan. Berat air dan berat tanah kering dihitung otomatis.' },
      { id: 'pl', judul: 'Batas plastis (PL)', kolom: 'Cawan', awal: 2, min: 1, maks: 4, baris: [
        { id: 'W1', label: 'Berat cawan + tanah basah', simbol: 'W<sub>1</sub>', satuan: 'gr' },
        { id: 'W2', label: 'Berat cawan + tanah kering', simbol: 'W<sub>2</sub>', satuan: 'gr' },
        { id: 'W3', label: 'Berat cawan', simbol: 'W<sub>3</sub>', satuan: 'gr' }] }],
    // Contoh laporan Liquid Limit Test.pdf hlm 66–69 dan Plastic Limit Test.pdf hlm 75–76 (angka sudah termasuk +0,34 NIM penulis).
    contoh: { param: { metodeLL: 'banyak', skalaN: 'log', eksponen: 0.121, wn: '' }, tabel: {
      ll: [{ nama: 'A', N: 20, W1: 21.9, W2: 19.48, W3: 11 }, { nama: 'B', N: 25, W1: 20.54, W2: 18.64, W3: 11.2 },
        { nama: 'C', N: 28, W1: 21.84, W2: 19.84, W3: 11 }, { nama: 'D', N: 33, W1: 25.24, W2: 22.44, W3: 11.1 }],
      pl: [{ nama: 'D', W1: 26.34, W2: 24.64, W3: 11 }, { nama: '2', W1: 26.64, W2: 24.64, W3: 11.3 }] } },
    kosong: { param: { metodeLL: 'banyak', skalaN: 'log', eksponen: 0.121, wn: '' } },
    hitung: function (m) {
      return H.hitung({ ll: m.tabel.ll, pl: m.tabel.pl, metodeLL: m.param.metodeLL, skalaN: m.param.skalaN, eksponen: m.param.eksponen, wn: m.param.wn });
    },
    hasil: function (m, r) { return { LL: r.LL, PL: r.PL, IP: r.IP, NP: r.NP }; },
    tampil: function (m, r, U) {
      var L = r.titikLL, P = r.titikPL, h = '', semua = L.concat(P);
      var logN = !r.kurva || r.kurva.skala !== 'linier';
      h += U.ringkasan([
        U.kartu('Batas cair', f(r.LL, 2) + ' <small>%</small>', r.kurva ? 'grafik ' + (logN ? 'log N' : 'N linier') + ', R² = ' + f(r.kurva.r2, 3) : 'metode satu titik'),
        U.kartu('Batas plastis', f(r.PL, 2) + ' <small>%</small>', P.length + ' cawan'),
        U.kartu('Indeks plastisitas', r.NP ? 'NP' : f(r.IP, 2) + ' <small>%</small>', r.klas ? r.klas.simbol + ' · ' + r.klas.nama : 'nonplastis')]);
      // Satu tabel seperti form: kolom batas cair lalu kolom batas plastis.
      function bar(uraian, satuan, ambilL, ambilP, d) {
        return [uraian, satuan].concat(L.map(function (x) { return f(ambilL(x), d); }), P.map(function (x) { return ambilP ? f(ambilP(x), d) : ''; }));
      }
      var ambil = function (k) { return function (x) { return x[k]; }; };
      h += '<h3>Tabel hasil (urutan form lab)</h3>' + U.tabel(['', 'Satuan'].concat(L.map(function () { return 'LL'; }), P.map(function () { return 'PL'; })), [
        bar('Banyaknya pukulan', '', ambil('N'), null, 0),
        ['Nomor cawan', ''].concat(semua.map(function (x) { return x.nama; })),
        bar('Berat cawan + tanah basah', 'gr', ambil('W1'), ambil('W1'), 3),
        bar('Berat cawan + tanah kering', 'gr', ambil('W2'), ambil('W2'), 3),
        bar('Berat air', 'gr', ambil('air'), ambil('air'), 3),
        bar('Berat cawan', 'gr', ambil('W3'), ambil('W3'), 3),
        bar('Berat tanah kering', 'gr', ambil('kering'), ambil('kering'), 3),
        bar('Kadar air', '%', ambil('w'), ambil('w'), 2)].concat(m.param.metodeLL === 'satu' ? [bar('LL satu titik, w (N/25)<sup>β</sup>', '%', ambil('LL1'), null, 2)] : [])
        .concat([['Rata-rata PL', '%'].concat(L.map(function () { return ''; }), [f(r.PL, 2)], P.slice(1).map(function () { return ''; }))]), null, { angkaMulai: 2 });
      h += U.tabel(['LL (%)', 'PL (%)', 'PI (%)'], [[f(r.LL, 2), f(r.PL, 2), r.NP ? 'NP' : f(r.IP, 2)]], null, { angkaMulai: 0 });
      h += U.grafik(grafikAliran(r), 'Grafik batas cair: kadar air terhadap jumlah pukulan' + (logN ? ' (skala log)' : ' (skala linier seperti form)') + '. LL dibaca pada N = 25.');
      if (!r.NP) h += U.grafik(bagan(r), 'Bagan plastisitas untuk tanah berbutir halus (SNI 6371:2015). Area berarsir: zona CL-ML.');

      var a = L[0], b = P[0], no = 0;
      h += '<h3>Langkah hitungan</h3>';
      h += U.langkah('1) Batas cair, pukulan ' + f(a.N, 0) + ' (cawan ' + a.nama + ')',
        U.rumus('\\text{Berat air} = W_1 - W_2 = ' + U.t(a.W1, 3) + ' - ' + U.t(a.W2, 3) + ' = ' + U.t(a.air, 3) + '\\ \\text{gram} \\qquad (' + (++no) + ')') +
        U.rumus('\\text{Berat tanah kering} = W_2 - W_3 = ' + U.t(a.W2, 3) + ' - ' + U.t(a.W3, 3) + ' = ' + U.t(a.kering, 3) + '\\ \\text{gram} \\qquad (' + (++no) + ')') +
        U.rumus('w = \\dfrac{\\text{berat air}}{\\text{berat tanah kering}}\\times 100\\% = \\dfrac{' + U.t(a.air, 3) + '}{' + U.t(a.kering, 3) + '}\\times 100\\% = ' + U.t(a.w, 2) + '\\% \\qquad (' + (++no) + ')') +
        (L.length > 1 ? '<p class="ket">Cawan lain dihitung sama: ' + L.slice(1).map(function (x) { return x.nama + ' (N = ' + f(x.N, 0) + ') w = ' + f(x.w, 2) + '%'; }).join('; ') + '.</p>' : ''));
      if (r.kurva) {
        var sx = logN ? '\\log N' : 'N', s25 = logN ? '\\log 25' : '25', v25 = logN ? Math.log10(25) : 25;
        h += U.langkah('2) Batas cair dari grafik', U.rumus('w = a + b\\,' + sx + ' \\qquad (' + (++no) + ')') +
          U.rumus('a = ' + U.t(r.kurva.a, 3) + ',\\quad b = ' + U.t(r.kurva.b, logN ? 3 : 4) + ',\\quad R^2 = ' + U.t(r.kurva.r2, 3)) +
          U.rumus('LL = a + b\\,' + s25 + ' = ' + U.t(r.kurva.a, 3) + ' + (' + U.t(r.kurva.b, logN ? 3 : 4) + ')\\times ' + U.t(v25, logN ? 4 : 0) + ' = ' + U.t(r.LL, 2) + '\\%') +
          '<p class="ket">Garis lurus dari ' + L.length + ' titik dengan kuadrat terkecil, lalu dibaca pada N = 25.' + (logN ? ' Indeks aliran I<sub>f</sub> = −b = ' + f(-r.kurva.b, 2) + '.' : '') + '</p>');
      } else {
        h += U.langkah('2) Batas cair metode satu titik', U.rumus('LL = w_N\\left(\\dfrac{N}{25}\\right)^{\\beta},\\ \\beta = ' + U.t(r.eksponen, 3) + ' \\qquad (' + (++no) + ')') +
          U.rumus('LL_{' + a.nama + '} = ' + U.t(a.w, 2) + '\\times\\left(\\dfrac{' + U.t(a.N, 0) + '}{25}\\right)^{' + U.t(r.eksponen, 3) + '} = ' + U.t(a.LL1, 2) + '\\%') +
          (L.length > 1 ? U.rumus('LL = \\text{rata-rata} = ' + U.t(r.LL, 2) + '\\%') : ''));
      }
      h += U.langkah('3) Batas plastis, cawan ' + b.nama,
        U.rumus('\\text{Berat air} = ' + U.t(b.W1, 3) + ' - ' + U.t(b.W2, 3) + ' = ' + U.t(b.air, 3) + '\\ \\text{gram};\\quad \\text{berat tanah kering} = ' + U.t(b.W2, 3) + ' - ' + U.t(b.W3, 3) + ' = ' + U.t(b.kering, 3) + '\\ \\text{gram}') +
        U.rumus('w = \\dfrac{' + U.t(b.air, 3) + '}{' + U.t(b.kering, 3) + '}\\times 100\\% = ' + U.t(b.w, 2) + '\\%'));
      h += U.langkah('4) Nilai batas plastis (PL)', U.rumus('PL = \\dfrac{' + P.map(function (x) { return U.t(x.w, 2); }).join(' + ') + '}{' + P.length + '} = ' + U.t(r.PL, 2) + '\\% \\qquad (' + (++no) + ')'));
      h += U.langkah('5) Indeks plastisitas (PI)', r.NP ? '<p>PL ≥ LL, sehingga tanah dilaporkan nonplastis (NP).</p>' :
        U.rumus('PI = LL - PL = ' + U.t(r.LL, 2) + ' - ' + U.t(r.PL, 2) + ' = ' + U.t(r.IP, 2) + '\\% \\qquad (' + (++no) + ')'));
      if (r.LI !== undefined) {
        h += U.langkah('Indeks cair dan indeks konsistensi', U.rumus('LI = \\dfrac{w_n - PL}{IP} = \\dfrac{' + U.t(m.param.wn, 2) + ' - ' + U.t(r.PL, 2) + '}{' + U.t(r.IP, 2) + '} = ' + U.t(r.LI, 2)) +
          U.rumus('CI = \\dfrac{LL - w_n}{IP} = \\dfrac{' + U.t(r.LL, 2) + ' - ' + U.t(m.param.wn, 2) + '}{' + U.t(r.IP, 2) + '} = ' + U.t(r.CI, 2)));
      }
      if (r.klas) {
        h += U.langkah('Posisi di bagan plastisitas', U.rumus('IP_{\\text{garis A}} = 0{,}73\\,(LL - 20) = 0{,}73\\times(' + U.t(r.LL, 2) + ' - 20) = ' + U.t(r.garisA, 2) + '\\%') +
          '<p>IP = ' + f(r.IP, 2) + '% ' + (r.IP >= r.garisA ? 'di atas atau pada' : 'di bawah') + ' garis A dan LL ' + (r.LL < 50 ? '< 50%' : '≥ 50%') +
          ', sehingga tanah halus ini bersimbol <strong>' + r.klas.simbol + '</strong> (' + r.klas.nama.toLowerCase() + '). Klasifikasi lengkap juga membutuhkan data gradasi.</p>');
      }
      h += bedaContoh(m, 'Kadar air tiap cawan dan PL = 13,728% sama dengan contoh. Contoh menulis LL = 26,313% dari garis yang ditarik tangan pada grafik, ' +
        'padahal keempat titik tidak segaris (N = 28 memberi 22,624%, lebih kecil dari N = 33 dengan 24,691%). Garis kuadrat terkecil memberi LL = 25,73% (skala log) ' +
        'atau 25,84% (skala linier seperti form), sehingga PI alat 12,00% atau 12,11%, bukan 12,585%. Kotak PL di form contoh juga tertulis 13,7215, sedangkan langkahnya 13,728%.');
      h += belajar('Menentukan batas cair (LL) dan batas plastis (PL), yaitu kadar air saat tanah berubah dari keadaan cair ke plastis dan dari plastis ke semipadat, lalu indeks plastisitasnya.',
        ['Untuk tiap cawan batas cair: hitung berat air, berat tanah kering, dan kadar air.', 'Gambar kadar air terhadap jumlah pukulan, tarik garis lurus, dan baca kadar air pada 25 pukulan (LL).',
          'Untuk tiap cawan batas plastis: hitung berat air, berat tanah kering, dan kadar air.', 'Rata-ratakan kadar air cawan batas plastis (PL).', 'Hitung PI = LL − PL.'],
        'Posisi (LL, PI) pada bagan plastisitas memberi simbol tanah halus (garis A dan garis U dari SNI 6371:2015). Nilai LL dan PL dipakai di alat klasifikasi.');
      return h;
    },
    ekspor: function (m, r) {
      var L = r.titikLL, P = r.titikPL, b = [['BATAS CAIR'], ['Uraian', 'Satuan'].concat(L.map(function (x) { return 'Cawan ' + x.nama; }))];
      [['Banyaknya pukulan (N)', '-', 'N'], ['Berat cawan + tanah basah', 'gr', 'W1'], ['Berat cawan + tanah kering', 'gr', 'W2'],
        ['Berat air', 'gr', 'air'], ['Berat cawan', 'gr', 'W3'], ['Berat tanah kering', 'gr', 'kering'], ['Kadar air', '%', 'w']]
        .forEach(function (x) { b.push([x[0], x[1]].concat(L.map(function (t) { return t[x[2]]; }))); });
      b.push([], ['BATAS PLASTIS'], ['Uraian', 'Satuan'].concat(P.map(function (x) { return 'Cawan ' + x.nama; })));
      [['Berat cawan + tanah basah', 'gr', 'W1'], ['Berat cawan + tanah kering', 'gr', 'W2'], ['Berat air', 'gr', 'air'], ['Berat cawan', 'gr', 'W3'],
        ['Berat tanah kering', 'gr', 'kering'], ['Kadar air', '%', 'w']]
        .forEach(function (x) { b.push([x[0], x[1]].concat(P.map(function (t) { return t[x[2]]; }))); });
      b.push([], ['Batas cair (LL)', '%', r.LL], ['Batas plastis (PL)', '%', r.PL], ['Indeks plastisitas (PI)', '%', r.NP ? 'NP' : r.IP]);
      if (r.klas) b.push(['Simbol bagan plastisitas', '', r.klas.simbol]);
      return b;
    },
    sumber: ['Badan Standardisasi Nasional. SNI 1967:2008 <em>Cara uji penentuan batas cair tanah</em>.',
      'Badan Standardisasi Nasional. SNI 1966:2008 <em>Cara uji penentuan batas plastis dan indeks plastisitas tanah</em>.',
      'Badan Standardisasi Nasional. SNI 6371:2015 <em>Tata cara pengklasifikasian tanah untuk keperluan teknik dengan sistem klasifikasi unifikasi tanah</em>. Garis A dan garis U bagan plastisitas.',
      'ASTM D4318. <em>Standard test methods for liquid limit, plastic limit, and plasticity index of soils</em>. Metode satu titik (β = 0,121).',
      'Form pengujian konsistensi Atterberg, Laboratorium Mekanika Tanah, Teknik Sipil Universitas Jambi (grafik batas cair bersumbu linier 5–55 pukulan).']
  });
  if (jenis === 'batas-susut') {
    var RAKSA = function (p) { return p.caraVolume === 'raksa'; };
    Praktikum.pasang({
      id: 'batas-susut', judulEkspor: 'Pengujian batas susut (SNI 3422:2008)',
      parameter: [
        { id: 'caraVolume', label: 'Cara mengukur volume', pilihan: [['langsung', 'Volume langsung (cm³)'], ['raksa', 'Massa air raksa (gram)']],
          bantuan: 'Volume langsung cocok untuk cara lilin atau alat ukur lain. Air raksa beracun; ikuti prosedur keselamatan laboratorium.' },
        { id: 'rhoHg', label: 'Massa jenis air raksa', satuan: 'g/cm³', bantuan: '13,546 g/cm³ pada 20 °C.', tampilJika: RAKSA },
        { id: 'Gs', label: 'Berat spesifik, G<sub>s</sub>', bantuan: 'Opsional, untuk pembanding SL dari rasio susut.',
          dariAlat: { alat: 'berat-spesifik', nama: 'berat spesifik', ambil: function (h) { return h.G; }, d: 3 } },
        { id: 'LL', label: 'Batas cair, LL', satuan: '%', bantuan: 'Opsional, untuk pemeriksaan kewajaran.',
          dariAlat: { alat: 'atterberg', nama: 'Atterberg', ambil: function (h) { return h.LL; }, d: 2 } }],
      tabel: [{ id: 'cawan', judul: 'Data cawan susut', kolom: 'Cawan', awal: 2, min: 1, maks: 4, baris: [
        { id: 'W1', label: 'Berat cawan + tanah basah', simbol: 'W<sub>1</sub>', satuan: 'gram' },
        { id: 'W2', label: 'Berat cawan + tanah kering', simbol: 'W<sub>2</sub>', satuan: 'gram' },
        { id: 'W3', label: 'Berat cawan susut', simbol: 'W<sub>3</sub>', satuan: 'gram' },
        { id: 'V', label: function (p) { return RAKSA(p) ? 'Massa air raksa pengisi cawan (= volume tanah basah)' : 'Volume tanah basah (isi cawan)'; }, simbol: 'V', satuan: function (p) { return RAKSA(p) ? 'gram' : 'cm³'; } },
        { id: 'V0', label: function (p) { return RAKSA(p) ? 'Massa air raksa yang dipindahkan tanah kering' : 'Volume tanah kering'; }, simbol: 'V<sub>0</sub>', satuan: function (p) { return RAKSA(p) ? 'gram' : 'cm³'; } }],
        keterangan: 'Tanah dibuat mendekati batas cair, diisikan ke cawan susut, lalu dikeringkan perlahan sebelum dioven.' }],
      contoh: { param: { caraVolume: 'langsung', rhoHg: 13.546, Gs: 2.68, LL: 42.8 }, tabel: { cawan: [
        { nama: '1', W1: 48.62, W2: 40.15, W3: 21.34, V: 15.5, V0: 10.4 }, { nama: '2', W1: 49.10, W2: 40.52, W3: 21.60, V: 15.6, V0: 10.5 }] } },
      kosong: { param: { caraVolume: 'langsung', rhoHg: 13.546, Gs: '', LL: '' } },
      hitung: function (m) {
        var raksa = RAKSA(m.param), rho = m.param.rhoHg > 0 ? m.param.rhoHg : 13.546;
        if (raksa && !(m.param.rhoHg > 0)) return { galat: ['Isi massa jenis air raksa.'] };
        var r = H.batasSusut({ Gs: m.param.Gs, LL: m.param.LL, cawan: m.tabel.cawan.map(function (c) {
          return Object.assign({}, c, raksa ? { V: c.V / rho, V0: c.V0 / rho, MHg: c.V, MHg0: c.V0 } : {});
        }) });
        r.raksa = raksa; r.rhoHg = rho;
        return r;
      },
      hasil: function (m, r) { return { SL: r.SL, R: r.R }; },
      tampil: function (m, r, U) {
        var c = r.cawan, h = '';
        h += U.ringkasan([U.kartu('Batas susut', f(r.SL, 2) + ' <small>%</small>', 'SL rata-rata ' + c.length + ' cawan'),
          U.kartu('Rasio susut', f(r.R, 3), 'R = W<sub>o</sub> / (V<sub>0</sub> ρ<sub>w</sub>)')].concat(r.SLGs !== undefined ?
          [U.kartu('SL dari G<sub>s</sub>', f(r.SLGs, 2) + ' <small>%</small>', 'pembanding, (1/R − 1/G<sub>s</sub>) × 100')] : []));
        h += '<h3>Tabel hasil</h3>' + U.tabel(['Uraian', 'Simbol', 'Satuan'].concat(c.map(function (x) { return 'Cawan ' + x.nama; })), [
          kolom(c, 'Berat air', 'W<sub>1</sub> − W<sub>2</sub>', 'gram', function (x) { return x.air; }, 3),
          kolom(c, 'Berat tanah kering', 'W<sub>o</sub> = W<sub>2</sub> − W<sub>3</sub>', 'gram', function (x) { return x.Wo; }, 3),
          kolom(c, 'Kadar air awal', 'w', '%', function (x) { return x.w; }, 2),
          kolom(c, 'Volume tanah basah', 'V', 'cm³', function (x) { return x.V; }, 3),
          kolom(c, 'Volume tanah kering', 'V<sub>0</sub>', 'cm³', function (x) { return x.V0; }, 3),
          kolom(c, 'Batas susut', 'SL', '%', function (x) { return x.SL; }, 2),
          kolom(c, 'Rasio susut', 'R', '–', function (x) { return x.R; }, 3)]);
        var a = c[0];
        h += '<h3>Langkah hitungan (cawan ' + a.nama + ')</h3>';
        if (r.raksa) {
          h += U.langkah('Volume dari massa air raksa', U.rumus('V = \\dfrac{M_{Hg}}{\\rho_{Hg}} = \\dfrac{' + U.t(a.MHg, 2) + '}{' + U.t(r.rhoHg, 3) + '} = ' + U.t(a.V, 3) + '\\ \\text{cm}^3 \\qquad (1)') +
            U.rumus('V_0 = \\dfrac{' + U.t(a.MHg0, 2) + '}{' + U.t(r.rhoHg, 3) + '} = ' + U.t(a.V0, 3) + '\\ \\text{cm}^3'));
        }
        h += U.langkah('Kadar air awal', U.rumus('w = \\dfrac{W_1 - W_2}{W_2 - W_3}\\times 100\\% = \\dfrac{' + U.t(a.air, 3) + '}{' + U.t(a.Wo, 3) + '}\\times 100\\% = ' + U.t(a.w, 2) + '\\% \\qquad (2)'));
        h += U.langkah('Batas susut', U.rumus('SL = w - \\dfrac{(V - V_0)\\,\\rho_w}{W_o}\\times 100\\% = ' + U.t(a.w, 2) + ' - \\dfrac{(' + U.t(a.V, 3) + ' - ' + U.t(a.V0, 3) + ')\\times 1}{' + U.t(a.Wo, 3) + '}\\times 100 = ' + U.t(a.SL, 2) + '\\% \\qquad (3)') +
          '<p class="ket">Kadar air saat volume tanah berhenti berkurang walaupun air terus menguap.</p>');
        h += U.langkah('Rasio susut', U.rumus('R = \\dfrac{W_o}{V_0\\,\\rho_w} = \\dfrac{' + U.t(a.Wo, 3) + '}{' + U.t(a.V0, 3) + '\\times 1} = ' + U.t(a.R, 3) + ' \\qquad (4)') +
          (a.SLGs !== undefined ? U.rumus('SL_{G_s} = \\left(\\dfrac{1}{R} - \\dfrac{1}{G_s}\\right)\\times 100 = \\left(\\dfrac{1}{' + U.t(a.R, 3) + '} - \\dfrac{1}{' + U.t(m.param.Gs, 3) + '}\\right)\\times 100 = ' + U.t(a.SLGs, 2) + '\\% \\qquad (5)') +
            '<p class="ket">Pembanding dengan anggapan tanah masih jenuh saat mencapai batas susut. Selisih besar menandakan ada udara atau kesalahan volume.</p>' : ''));
        h += '<div class="catatan">Form lab UNJA tidak memuat lembar batas susut dan tidak ada contoh laporannya, jadi angka contoh di alat ini hanya ilustrasi.</div>';
        h += belajar('Menentukan batas susut (SL), yaitu kadar air ketika volume tanah berhenti berkurang walaupun air terus menguap.',
          ['Hitung berat air dan berat tanah kering, lalu kadar air awal w.', 'Tentukan volume tanah basah V dan volume tanah kering V<sub>0</sub>' + (r.raksa ? ' dari massa air raksa' : '') + '.',
            'Hitung SL = w − (V − V<sub>0</sub>) ρ<sub>w</sub> / W<sub>o</sub> × 100%.', 'Hitung rasio susut R = W<sub>o</sub> / (V<sub>0</sub> ρ<sub>w</sub>).'],
          'Batas susut harus lebih kecil dari batas plastis dan batas cair dari contoh yang sama.');
        return h;
      },
      ekspor: function (m, r) {
        var c = r.cawan, b = [['Uraian', 'Satuan'].concat(c.map(function (x) { return 'Cawan ' + x.nama; }))];
        [['W1 cawan + tanah basah', 'gram', 'W1'], ['W2 cawan + tanah kering', 'gram', 'W2'], ['W3 cawan', 'gram', 'W3'], ['Volume tanah basah V', 'cm3', 'V'],
          ['Volume tanah kering V0', 'cm3', 'V0'], ['Kadar air awal', '%', 'w'], ['Batas susut', '%', 'SL'], ['Rasio susut', '-', 'R']]
          .forEach(function (x) { b.push([x[0], x[1]].concat(c.map(function (t) { return t[x[2]]; }))); });
        b.push([], ['Batas susut rata-rata', '%', r.SL], ['Rasio susut rata-rata', '-', r.R]);
        return b;
      },
      sumber: ['Badan Standardisasi Nasional. SNI 3422:2008 <em>Cara uji penentuan batas susut tanah</em>.',
        'ASTM D4943. <em>Standard test method for shrinkage factors of cohesive soils by the water submersion method</em>. Cara lilin sebagai pengganti air raksa.',
        'Das, B. M. <em>Principles of geotechnical engineering</em>. Cengage Learning. Batas susut dan rasio susut.']
    });
  }
})();
