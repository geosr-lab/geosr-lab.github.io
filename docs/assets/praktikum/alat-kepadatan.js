/* Definisi alat: pemadatan laboratorium dan kerucut pasir (sand cone). Halaman memilih lewat data-alat.
 * Formulir, tabel hasil, dan urutan langkah mengikuti form lab UNJA (pemadatan hlm 19, sand cone hlm 7)
 * dan contoh pengolahan data laporan praktikum (Compaction Test, Sand Cone). */
(function () {
  'use strict';

  var H = window.HitungKepadatan, f = Umum.f, jenis = document.getElementById('alat-praktikum').dataset.alat;

  function kolom(daftar, uraian, simbol, satuan, ambil, d) {
    return [uraian, simbol, satuan].concat(daftar.map(function (x) { var v = ambil(x); return v === null || v === undefined ? '–' : f(v, d); }));
  }
  function judulBaris(teks, n) { return ['<strong>' + teks + '</strong>', '', ''].concat(new Array(n).fill('')); }
  // Blok belajar di bawah hasil: tujuan, alur pengolahan bernomor (urutan contoh laporan), dan arti hasil.
  function belajar(tujuan, alur, arti) {
    return '<section class="kartu belajar"><h3>Belajar dari pengujian ini</h3><p><strong>Tujuan.</strong> ' + tujuan + '</p>' +
      '<p><strong>Alur pengolahan</strong> (urutan seperti contoh laporan):</p><ol>' + alur.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ol>' +
      (arti ? '<p><strong>Arti hasil.</strong> ' + arti + '</p>' : '') + '</section>';
  }
  function beda(isi) { return '<div class="catatan"><strong>Beda dengan contoh laporan.</strong><ul>' + isi.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>'; }

  if (jenis === 'pemadatan') {
    // Contoh laporan Compaction Test (hlm 121–122 dan form terisi): 5 cawan A–E, Gs 2,678.
    var CP = { W1: [37.84, 39.74, 37.34, 37.98, 43.84], W2: [35.14, 36.24, 34.04, 33.74, 38.54], W3: [11.1, 11.1, 11, 11.2, 10.9],
      Mtotal: [3431.1, 3585.7, 3644.8, 3631.7, 3602.5], air: [200, 250, 300, 350, 400] };
    Praktikum.pasang({
      id: 'pemadatan', judulEkspor: 'Pengujian kepadatan ringan (SNI 1742:2008)',
      nim: { ket: 'massa tanah basah + cawan (W<sub>1</sub>) dan massa tanah kering + cawan (W<sub>2</sub>)', tabel: { titik: ['W1', 'W2'] } },
      parameter: [
        { id: 'jenis', label: 'Jenis pemadatan', pilihan: [['ringan', 'Ringan (SNI 1742:2008)'], ['berat', 'Berat (SNI 1743:2008)']] },
        { id: 'Gs', label: 'Spesific gravity, G<sub>s</sub>', bantuan: 'Dari pemeriksaan berat spesifik; dipakai untuk garis ZAV.',
          dariAlat: { alat: 'berat-spesifik', nama: 'berat spesifik', ambil: function (h) { return h.G; }, d: 3 } },
        { id: 'Mcetakan', label: 'Massa cetakan', satuan: 'gram', bantuan: 'Sama untuk semua cawan, seperti pada form.' },
        { id: 'V', label: 'Isi cetakan', satuan: 'cm³' },
        { id: 'orde', label: 'Kurva pemadatan', pilihan: [['2', 'Polinomial orde 2'], ['3', 'Polinomial orde 3']],
          bantuan: 'Orde 2 lebih stabil bila titik sedikit atau naik-turun; orde 3 lebih mengikuti bentuk kurva bila titik ≥ 5 dan rapi.' }],
      tabel: [{ id: 'titik', judul: 'Data tiap titik pemadatan', kolom: 'Cawan', awal: 5, min: 3, maks: 8, baris: [
        { id: 'Mpersiapan', label: 'Persiapan contoh uji: massa tanah basah', simbol: '', satuan: 'gram', opsional: true },
        { id: 'wAwal', label: 'Persiapan contoh uji: kadar air awal', simbol: '', satuan: '%', opsional: true },
        { id: 'tambahAir', label: 'Persiapan contoh uji: penambahan air', simbol: '', satuan: 'cc', opsional: true },
        { id: 'W1', label: 'Massa tanah basah + cawan', simbol: 'W<sub>1</sub>', satuan: 'gram' },
        { id: 'W2', label: 'Massa tanah kering + cawan', simbol: 'W<sub>2</sub>', satuan: 'gram' },
        { id: 'W3', label: 'Massa cawan', simbol: 'W<sub>3</sub>', satuan: 'gram' },
        { id: 'Mtotal', label: 'Massa tanah basah + cetakan', simbol: 'W<sub>t</sub>', satuan: 'gram' }],
        keterangan: 'Satu kolom per titik pemadatan, nama kolom = nomor cawan (A, B, C, …) seperti form laboratorium.' }],
      contoh: { param: { jenis: 'ringan', Gs: 2.678, Mcetakan: 1714.9, V: 920.89, orde: '2' }, tabel: { titik: CP.W1.map(function (x, i) {
        return { nama: 'ABCDE'.charAt(i), Mpersiapan: 2500, tambahAir: CP.air[i], W1: x, W2: CP.W2[i], W3: CP.W3[i], Mtotal: CP.Mtotal[i] };
      }) } },
      kosong: { param: { jenis: 'ringan', Gs: '', Mcetakan: '', V: '', orde: '2' } },
      hitung: function (m) {
        return H.pemadatan({ Gs: m.param.Gs, V: m.param.V, Mcetakan: m.param.Mcetakan, gammaW: 1, orde: +m.param.orde, titik: m.tabel.titik });
      },
      hasil: function (m, r) { return { gdmaks: r.gdmaks, wopt: r.wopt, jenis: m.param.jenis }; },
      tampil: function (m, r, U) {
        var t = r.titik, n = t.length, h = '';
        h += U.ringkasan([U.kartu('Kadar air optimum', f(r.wopt, 2) + ' <small>%</small>', 'w<sub>opt</sub>'),
          U.kartu('Kepadatan kering maksimum', f(r.gdmaks, 3) + ' <small>g/cm³</small>', 'γ<sub>d maks</sub> · kurva orde ' + r.orde + ', R² = ' + f(r.kurva.r2, 3))]);
        var w0 = t[0].w, w1 = t[t.length - 1].w, lebar = w1 - w0;
        var xs = [], zav = [];
        for (var i = 0; i <= 80; i++) { var w = w0 + lebar * i / 80; xs.push([w, r.kurva.f(w)]); }
        for (var j = 0; j <= 40; j++) { var wz = (w0 - lebar * 0.15) + lebar * 1.3 * j / 40; zav.push([wz, +m.param.Gs * r.gammaW / (1 + wz / 100 * +m.param.Gs)]); }
        var semuaY = t.map(function (x) { return x.gammaD; }).concat([r.gdmaks]);
        var ymin = Math.floor((Math.min.apply(null, semuaY) - 0.05) * 20) / 20, ymaks = Math.ceil((Math.max.apply(null, semuaY) + 0.08) * 20) / 20;
        h += U.grafik(Grafik.plot({ id: 'proctor', judul: 'Grafik pemadatan', x: { min: Math.floor(w0 - lebar * 0.15), max: Math.ceil(w1 + lebar * 0.15), label: 'Kadar air (%)' },
          y: { min: ymin, max: ymaks, label: 'Kepadatan kering (g/cm³)' },
          seri: [{ titik: zav, warna: 'biru', putus: true, label: 'ZAV (Gs = ' + f(+m.param.Gs, 3) + ')' }, { titik: xs, warna: 'teks', label: 'Kurva orde ' + r.orde },
            { titik: t.map(function (x) { return [x.w, x.gammaD]; }), garis: false, penanda: true, warna: 'aksen', label: 'Titik uji' }],
          tanda: [{ x: r.wopt, y: r.gdmaks, teks: 'optimum (' + f(r.wopt, 2) + '%; ' + f(r.gdmaks, 3) + ')', atas: true, rata: r.wopt > (w0 + w1) / 2 ? 'kiri' : 'kanan' }] }),
          'Grafik pemadatan dengan garis kepadatan zero air void (ZAV). Titik optimum diambil dari puncak kurva di dalam rentang data.');
        var ada = function (k) { return t.some(function (x) { return x[k] !== null && x[k] !== undefined; }); };
        var baris = [['Spesific gravity', 'G<sub>s</sub>', '–', f(+m.param.Gs, 3)].concat(new Array(n - 1).fill(''))];
        if (ada('Mpersiapan') || ada('wAwal') || ada('tambahAir')) {
          baris.push(judulBaris('Persiapan contoh uji', n),
            kolom(t, 'Massa tanah basah', '', 'gram', function (x) { return x.Mpersiapan; }, 0),
            kolom(t, 'Kadar air awal', '', '%', function (x) { return x.wAwal; }, 2),
            kolom(t, 'Penambahan air', '', 'cc', function (x) { return x.tambahAir; }, 0));
        }
        baris.push(judulBaris('Kadar air', n), ['No. cawan', '', ''].concat(t.map(function (x) { return x.nama; })),
          kolom(t, 'Massa tanah basah + cawan', 'W<sub>1</sub>', 'gram', function (x) { return x.W1; }, 2),
          kolom(t, 'Massa tanah kering + cawan', 'W<sub>2</sub>', 'gram', function (x) { return x.W2; }, 2),
          kolom(t, 'Massa air', 'W<sub>1</sub> − W<sub>2</sub>', 'gram', function (x) { return x.air; }, 2),
          kolom(t, 'Massa cawan', 'W<sub>3</sub>', 'gram', function (x) { return x.W3; }, 2),
          kolom(t, 'Massa tanah kering', 'W<sub>2</sub> − W<sub>3</sub>', 'gram', function (x) { return x.kering; }, 2),
          kolom(t, 'Kadar air', 'w', '%', function (x) { return x.w; }, 3),
          judulBaris('Kepadatan', n),
          kolom(t, 'Massa tanah basah + cetakan', 'W<sub>t</sub>', 'gram', function (x) { return x.Mtotal; }, 1),
          kolom(t, 'Massa cetakan', 'W<sub>m</sub>', 'gram', function (x) { return x.Mc; }, 1),
          kolom(t, 'Massa tanah basah', 'W<sub>t</sub> − W<sub>m</sub>', 'gram', function (x) { return x.basah; }, 1),
          kolom(t, 'Isi cetakan', 'V', 'cm³', function (x) { return x.Vc; }, 2),
          kolom(t, 'Kepadatan basah', 'γ', 'g/cm³', function (x) { return x.gamma; }, 3),
          kolom(t, 'Kepadatan kering', 'γ<sub>d</sub>', 'g/cm³', function (x) { return x.gammaD; }, 3),
          kolom(t, 'Kepadatan zero air void', 'ZAV', 'g/cm³', function (x) { return x.zav; }, 3));
        h += '<h3>Tabel hasil</h3>' + U.tabel(['Uraian', 'Simbol', 'Satuan'].concat(t.map(function (x) { return 'Cawan ' + x.nama; })), baris);
        h += '<h3>Kadar air optimum dan kepadatan kering maksimum</h3>' + U.tabel(['Uraian', 'Simbol', 'Satuan', 'Nilai'], [
          ['Kadar air optimum', 'w<sub>opt</sub>', '%', f(r.wopt, 2)], ['Kepadatan kering maksimum', 'γ<sub>d maks</sub>', 'g/cm³', f(r.gdmaks, 3)]]);
        var a = t[0];
        h += '<h3>Langkah hitungan (cawan ' + a.nama + ')</h3>' +
          U.langkah('a. Kadar air', U.rumus('W_4 = W_1 - W_2 = ' + U.t(a.W1, 2) + ' - ' + U.t(a.W2, 2) + ' = ' + U.t(a.air, 2) + '\\ \\text{gram} \\qquad (1)') +
            U.rumus('W_s = W_2 - W_3 = ' + U.t(a.W2, 2) + ' - ' + U.t(a.W3, 2) + ' = ' + U.t(a.kering, 2) + '\\ \\text{gram} \\qquad (2)') +
            U.rumus('w = \\dfrac{W_4}{W_s}\\times 100\\% = \\dfrac{' + U.t(a.air, 2) + '}{' + U.t(a.kering, 2) + '}\\times 100\\% = ' + U.t(a.w, 3) + '\\% \\qquad (3)') +
            '<p class="ket">W<sub>4</sub> = massa air; W<sub>s</sub> = massa tanah kering.</p>') +
          U.langkah('b. Kepadatan basah', U.rumus('\\text{massa tanah basah} = W_t - W_m = ' + U.t(a.Mtotal, 1) + ' - ' + U.t(a.Mc, 1) + ' = ' + U.t(a.basah, 1) + '\\ \\text{gram} \\qquad (4)') +
            U.rumus('\\gamma = \\dfrac{\\text{massa tanah basah}}{V} = \\dfrac{' + U.t(a.basah, 1) + '}{' + U.t(a.Vc, 2) + '} = ' + U.t(a.gamma, 3) + '\\ \\text{g/cm}^3 \\qquad (5)') +
            '<p class="ket">W<sub>t</sub> = massa tanah basah + cetakan; W<sub>m</sub> = massa cetakan; V = isi cetakan.</p>') +
          U.langkah('c. Kepadatan kering', U.rumus('\\gamma_d = \\dfrac{\\gamma\\times 100}{100 + w} = \\dfrac{' + U.t(a.gamma, 4) + '\\times 100}{100 + ' + U.t(a.w, 3) + '} = ' + U.t(a.gammaD, 3) + '\\ \\text{g/cm}^3 \\qquad (6)')) +
          U.langkah('d. Kepadatan zero air void', U.rumus('ZAV = \\dfrac{G_s\\times\\gamma_w}{1 + \\dfrac{w}{100}\\times G_s} = \\dfrac{' + U.t(+m.param.Gs, 3) + '\\times 1}{1 + \\dfrac{' + U.t(a.w, 3) + '}{100}\\times' + U.t(+m.param.Gs, 3) + '} = ' + U.t(a.zav, 3) + '\\ \\text{g/cm}^3 \\qquad (7)') +
            '<p class="ket">γ<sub>w</sub> = berat volume air = 1 g/cm³.</p>') +
          U.langkah('e. Kurva dan titik optimum', U.rumus('\\gamma_d(w) = ' + r.kurva.koef.map(function (c, k) { return (k === 0 ? U.t(c, 5) : (c < 0 ? ' - ' : ' + ') + U.t(Math.abs(c), 6) + (k === 1 ? 'w' : 'w^' + k)); }).join('')) +
            '<p>Puncak kurva di dalam rentang data: w<sub>opt</sub> = ' + f(r.wopt, 2) + '% dan γ<sub>d maks</sub> = ' + f(r.gdmaks, 3) + ' g/cm³. ' +
            'Sebagai pembanding, titik data tertinggi adalah cawan ' + r.titikTertinggi.nama + ' (w = ' + f(r.titikTertinggi.w, 2) + '%, γ<sub>d</sub> = ' + f(r.titikTertinggi.gammaD, 3) + ' g/cm³).</p>');
        h += beda(['Kolom A: form contoh menulis massa tanah basah + cetakan 3.411,1 g, tetapi hitungan laporan memakai 3.431,1 g (3.431,1 − 1.714,9 = 1.716,2 g). Data contoh memakai 3.431,1 g supaya cocok dengan massa tanah basahnya.',
          'Kolom C: angka tertulis 3.644,8 g dan 1.929,9 g; γ = 2,096 dan γ<sub>d</sub> = 1,833 g/cm³ cocok dengan angka itu.',
          'Laporan menghitung γ<sub>d</sub> cawan A dari γ yang sudah dibulatkan (1,86 × 100 / 111,231) sehingga tertulis 1,675 atau 1,676. Alat memakai γ tanpa pembulatan: 1,675 g/cm³.',
          'w<sub>opt</sub> dan γ<sub>d maks</sub> di laporan dibaca dari grafik tangan (sekitar 14%). Alat memakai puncak kurva polinomial yang dicocokkan ke titik data, jadi hasilnya bisa sedikit berbeda dari bacaan grafik.']);
        h += belajar('Mencari kadar air optimum (w<sub>opt</sub>) yang memberi kepadatan kering terbesar (γ<sub>d maks</sub>) untuk energi pemadatan tertentu. Nilai ini dipakai sebagai acuan derajat kepadatan di lapangan (sand cone) dan pembuatan benda uji CBR.',
          ['Hitung kadar air tiap cawan: massa air, massa tanah kering, lalu w.', 'Hitung massa tanah basah = (tanah basah + cetakan) − cetakan.',
            'Hitung kepadatan basah γ = massa tanah basah / isi cetakan.', 'Hitung kepadatan kering γ<sub>d</sub> = γ × 100 / (100 + w).',
            'Hitung kepadatan zero air void (ZAV) dari G<sub>s</sub> dan w.', 'Gambar γ<sub>d</sub> terhadap w bersama garis ZAV, lalu baca puncak kurva: w<sub>opt</sub> dan γ<sub>d maks</sub>.'],
          'Titik uji seharusnya berada di bawah garis ZAV, karena ZAV adalah kepadatan kering saat rongga udara nol (jenuh penuh). Titik di atas ZAV menandakan ada data yang keliru, misalnya G<sub>s</sub>, isi cetakan, atau kadar air.');
        return h + '<p class="kecil redup">Hasil γ<sub>d maks</sub> dan w<sub>opt</sub> tersimpan di browser dan bisa diambil di alat sand cone dan CBR.</p>';
      },
      ekspor: function (m, r) {
        var t = r.titik, b = [['Jenis pemadatan', '', m.param.jenis], ['Spesific gravity Gs', '-', +m.param.Gs], [],
          ['Uraian', 'Satuan'].concat(t.map(function (x) { return 'Cawan ' + x.nama; }))];
        [['Massa tanah basah (persiapan)', 'gram', 'Mpersiapan'], ['Kadar air awal', '%', 'wAwal'], ['Penambahan air', 'cc', 'tambahAir'],
          ['Massa tanah basah + cawan', 'gram', 'W1'], ['Massa tanah kering + cawan', 'gram', 'W2'], ['Massa air', 'gram', 'air'], ['Massa cawan', 'gram', 'W3'],
          ['Massa tanah kering', 'gram', 'kering'], ['Kadar air', '%', 'w'], ['Massa tanah basah + cetakan', 'gram', 'Mtotal'], ['Massa cetakan', 'gram', 'Mc'],
          ['Massa tanah basah', 'gram', 'basah'], ['Isi cetakan', 'cm3', 'Vc'], ['Kepadatan basah', 'g/cm3', 'gamma'], ['Kepadatan kering', 'g/cm3', 'gammaD'], ['Kepadatan ZAV', 'g/cm3', 'zav']]
          .forEach(function (x) { b.push([x[0], x[1]].concat(t.map(function (p) { return p[x[2]] === null || p[x[2]] === undefined ? '' : p[x[2]]; }))); });
        b.push([], ['Kadar air optimum', '%', r.wopt], ['Kepadatan kering maksimum', 'g/cm3', r.gdmaks], ['Kurva', '', 'polinomial orde ' + r.orde]);
        return b;
      },
      sumber: ['Badan Standardisasi Nasional. SNI 1742:2008 <em>Cara uji kepadatan ringan untuk tanah</em>.',
        'Badan Standardisasi Nasional. SNI 1743:2008 <em>Cara uji kepadatan berat untuk tanah</em>.',
        'Form pengujian kepadatan ringan Laboratorium Mekanika Tanah UNJA: γ<sub>d</sub> = γ × 100 / (100 + w) dan ZAV = G<sub>s</sub> / (1 + w/100 × G<sub>s</sub>).',
        'Das, B. M. <em>Principles of geotechnical engineering</em>. Cengage Learning. Garis rongga udara nol.']
    });
  }

  if (jenis === 'sand-cone') {
    var BARIS = [
      ['W6', 'Berat tabung + kerucut + pasir sebelum pengujian (menentukan berat pasir dalam corong)', 'W<sub>6</sub>', true],
      ['W7', 'Berat tabung + kerucut + pasir setelah pengujian (menentukan berat pasir dalam corong)', 'W<sub>7</sub>', true],
      ['W8', 'Berat tabung + kerucut + pasir sebelum pengujian', 'W<sub>8</sub>'],
      ['W9', 'Berat tabung + kerucut + pasir setelah pengujian', 'W<sub>9</sub>'],
      ['W10', 'Berat kaleng', 'W<sub>10</sub>'], ['W11', 'Berat kaleng + tanah galian', 'W<sub>11</sub>'],
      ['W12', 'Berat kontainer', 'W<sub>12</sub>'], ['W13', 'Berat kontainer + tanah basah', 'W<sub>13</sub>'], ['W14', 'Berat kontainer + tanah kering', 'W<sub>14</sub>']];
    Praktikum.pasang({
      id: 'sand-cone', judulEkspor: 'Uji kepadatan lapangan, sand cone (SNI 2828:2011)',
      parameter: [
        { id: 'W4', label: 'Kalibrasi alat: berat tabung + kerucut + pasir awal, W<sub>4</sub>', satuan: 'g' },
        { id: 'W5', label: 'Kalibrasi alat: berat tabung + kerucut + pasir akhir, W<sub>5</sub>', satuan: 'g' },
        { id: 'K3', label: 'Kalibrasi pasir uji: berat tabung kalibrasi + air, W<sub>3</sub>', satuan: 'g' },
        { id: 'K2', label: 'Kalibrasi pasir uji: berat tabung kalibrasi + pasir, W<sub>2</sub>', satuan: 'g' },
        { id: 'K1', label: 'Kalibrasi pasir uji: berat tabung kalibrasi, W<sub>1</sub>', satuan: 'g' },
        { id: 'gammaLab', label: 'Berat isi tanah kering laboratorium, γ<sub>d lab</sub>', satuan: 'g/cm³',
          bantuan: 'Dari pengujian pemadatan standar (γ<sub>d maks</sub>).',
          dariAlat: { alat: 'pemadatan', nama: 'pemadatan', ambil: function (h) { return h.gdmaks; }, d: 3 } },
        { id: 'syarat', label: 'Derajat kepadatan minimum', satuan: '%', bantuan: 'Opsional, sesuai spesifikasi proyek.' }],
      tabel: [{ id: 'titik', judul: 'Data tiap titik uji', kolom: 'Titik', awal: 3, min: 1, maks: 6,
        baris: BARIS.map(function (b) { return { id: b[0], label: b[1], simbol: b[2], satuan: 'g', opsional: !!b[3] }; }),
        keterangan: 'W<sub>6</sub> dan W<sub>7</sub> boleh dikosongkan: alat memakai W<sub>4</sub> dan W<sub>5</sub> dari kalibrasi alat. Kolom kosong tidak ikut dihitung.' }],
      // Contoh laporan Sand Cone (form terisi dan hlm 31–33): satu titik uji.
      contoh: { param: { W4: 8266, W5: 6852, K3: 5478, K2: 7737.5, K1: 139.1, gammaLab: 1.830, syarat: '' }, tabel: { titik: [
        { nama: '1', W6: 8266, W7: 6852, W8: 8266, W9: 5020, W10: 8, W11: 1732, W12: 11.2, W13: 62.2, W14: 52.9 }, { nama: '2' }, { nama: '3' }] } },
      kosong: { param: { W4: '', W5: '', K3: '', K2: '', K1: '', gammaLab: '', syarat: '' } },
      hitung: function (m) {
        return H.sandCone({ kalibrasi: { W1: m.param.K1, W2: m.param.K2, W3: m.param.K3, W4: m.param.W4, W5: m.param.W5 }, titik: m.tabel.titik, gammaLab: m.param.gammaLab, syarat: m.param.syarat });
      },
      tampil: function (m, r, U) {
        var t = r.titik, n = t.length, h = '', kartu = [U.kartu('γ<sub>d</sub> lapangan rata-rata', f(r.gammaD, 3) + ' <small>g/cm³</small>', 'kadar air rata-rata ' + f(r.w, 3) + '%')];
        if (r.D !== undefined) {
          kartu.push(U.kartu('Derajat kepadatan lapangan', f(r.D, 2) + ' <small>%</small>',
            r.memenuhi === undefined ? 'terhadap γ<sub>d lab</sub> ' + f(m.param.gammaLab, 3) + ' g/cm³' : (r.memenuhi ? '✓ memenuhi' : '✗ belum memenuhi') + ' syarat ' + f(m.param.syarat, 0) + '%'));
        }
        kartu.push(U.kartu('Berat isi pasir uji', f(r.gammaPasir, 3) + ' <small>g/cm³</small>', 'γ<sub>sand</sub> dari kalibrasi pasir'));
        h += U.ringkasan(kartu);
        var satu = function (teks, simbol, satuan, nilai, d) { return [teks, simbol, satuan, f(nilai, d)].concat(new Array(n - 1).fill('')); };
        var baris = [judulBaris('Menentukan berat pasir dalam corong', n),
          kolom(t, 'Berat tabung + kerucut + pasir sebelum pengujian', '(W<sub>6</sub>)', 'g', function (x) { return x.W6; }, 1),
          kolom(t, 'Berat tabung + kerucut + pasir setelah pengujian', '(W<sub>7</sub>)', 'g', function (x) { return x.W7; }, 1),
          kolom(t, 'Berat pasir dalam kerucut', '(W<sub>6</sub> − W<sub>7</sub>)', 'g', function (x) { return x.kerucut; }, 1),
          judulBaris('Menentukan berat isi tanah', n),
          kolom(t, 'Berat tabung + kerucut + pasir sebelum pengujian', '(W<sub>8</sub>)', 'g', function (x) { return x.W8; }, 1),
          kolom(t, 'Berat tabung + kerucut + pasir setelah pengujian', '(W<sub>9</sub>)', 'g', function (x) { return x.W9; }, 1),
          kolom(t, 'Berat kaleng', '(W<sub>10</sub>)', 'g', function (x) { return x.W10; }, 1),
          kolom(t, 'Berat kaleng + tanah galian', '(W<sub>11</sub>)', 'g', function (x) { return x.W11; }, 1),
          kolom(t, 'Berat tanah galian', '(W<sub>11</sub> − W<sub>10</sub>)', 'g', function (x) { return x.Wt; }, 1),
          kolom(t, 'Berat kontainer', '(W<sub>12</sub>)', 'g', function (x) { return x.W12; }, 2),
          kolom(t, 'Berat kontainer + tanah basah', '(W<sub>13</sub>)', 'g', function (x) { return x.W13; }, 2),
          kolom(t, 'Berat kontainer + tanah kering', '(W<sub>14</sub>)', 'g', function (x) { return x.W14; }, 2),
          kolom(t, 'Kadar air (w)', '(W<sub>13</sub> − W<sub>14</sub>)/(W<sub>14</sub> − W<sub>12</sub>)', '%', function (x) { return x.w; }, 3),
          satu('Kadar air rata-rata (w)', '', '%', r.w, 3),
          kolom(t, 'Berat kering (W<sub>d</sub>)', '(W<sub>11</sub> − W<sub>10</sub>)/(1 + w)', 'g', function (x) { return x.Wd; }, 3),
          kolom(t, 'Berat pasir dalam kerucut + tanah galian', '(W<sub>8</sub> − W<sub>9</sub>)', 'g', function (x) { return x.total; }, 1),
          kolom(t, 'Berat pasir dalam tanah galian', '(W<sub>8</sub> − W<sub>9</sub>) − (W<sub>6</sub> − W<sub>7</sub>)', 'g', function (x) { return x.lubang; }, 1),
          kolom(t, 'Volume galian (V<sub>tg</sub>)', '((W<sub>8</sub> − W<sub>9</sub>) − (W<sub>6</sub> − W<sub>7</sub>))/γ<sub>sand</sub>', 'cm³', function (x) { return x.V; }, 3),
          kolom(t, 'Berat isi kering tanah', 'W<sub>d</sub>/V<sub>tg</sub>', 'g/cm³', function (x) { return x.gammaD; }, 3),
          satu('Berat isi kering tanah rata-rata', '(γ<sub>d lap</sub>)', 'g/cm³', r.gammaD, 3)];
        if (m.param.gammaLab > 0) baris.push(satu('Berat isi kering tanah laboratorium', '(γ<sub>d lab</sub>)', 'g/cm³', +m.param.gammaLab, 3));
        if (r.D !== undefined) baris.push(satu('Derajat kepadatan lapangan', '(D) = (γ<sub>d lap</sub>/γ<sub>d lab</sub>) × 100%', '%', r.D, 2));
        h += '<h3>Tabel hasil</h3>' + U.tabel(['Uraian', 'Rumus', 'Satuan'].concat(t.map(function (x) { return 'Titik ' + x.nama; })), baris);
        var kal = [];
        if (r.alat) kal.push(['Berat tabung + kerucut + pasir awal', '(W<sub>4</sub>)', f(r.alat.W4, 1), 'g'], ['Berat tabung + kerucut + pasir akhir', '(W<sub>5</sub>)', f(r.alat.W5, 1), 'g'],
          ['Berat pasir dalam kerucut', 'W<sub>6</sub> = (W<sub>4</sub> − W<sub>5</sub>)', f(r.alat.W6, 1), 'g']);
        if (kal.length) h += '<h3>Kalibrasi alat</h3>' + U.tabel(['Uraian', 'Simbol', 'Nilai', 'Satuan'], kal, null, { kanan: [2] });
        h += '<h3>Kalibrasi pasir uji</h3>' + U.tabel(['Uraian', 'Simbol', 'Nilai', 'Satuan'], [
          ['Berat tabung kalibrasi + air', '(W<sub>3</sub>)', f(+m.param.K3, 1), 'g'], ['Berat tabung kalibrasi + pasir', '(W<sub>2</sub>)', f(+m.param.K2, 1), 'g'],
          ['Berat tabung kalibrasi', '(W<sub>1</sub>)', f(+m.param.K1, 1), 'g'], ['Berat air = volume tabung', '(W<sub>3</sub> − W<sub>1</sub>)', f(r.kalibrasi.air, 1), 'cm³'],
          ['Berat pasir', '(W<sub>2</sub> − W<sub>1</sub>)', f(r.kalibrasi.pasir, 1), 'g'], ['Berat isi pasir uji (W<sub>2</sub> − W<sub>1</sub>)/(W<sub>3</sub> − W<sub>1</sub>)', '(γ<sub>sand</sub>)', f(r.gammaPasir, 3), 'g/cm³']], null, { kanan: [2] });
        var a = t[0];
        h += '<h3>Langkah hitungan (titik ' + a.nama + ')</h3>' +
          U.langkah('1. Berat pasir dalam kerucut', U.rumus('A = W_6 - W_7 = ' + U.t(a.W6, 1) + ' - ' + U.t(a.W7, 1) + ' = ' + U.t(a.kerucut, 1) + '\\ \\text{g} \\qquad (1)')) +
          U.langkah('2. Berat tanah galian', U.rumus('B = W_{11} - W_{10} = ' + U.t(a.W11, 1) + ' - ' + U.t(a.W10, 1) + ' = ' + U.t(a.Wt, 1) + '\\ \\text{g} \\qquad (2)')) +
          U.langkah('3. Kadar air', U.rumus('C = w = \\dfrac{W_{13} - W_{14}}{W_{14} - W_{12}} = \\dfrac{' + U.t(a.W13, 2) + ' - ' + U.t(a.W14, 2) + '}{' + U.t(a.W14, 2) + ' - ' + U.t(a.W12, 2) + '} = ' + U.t(a.w, 3) + '\\% \\qquad (3)')) +
          U.langkah('4. Berat kering', U.rumus('D = W_d = \\dfrac{W_{11} - W_{10}}{1 + w} = \\dfrac{' + U.t(a.Wt, 1) + '}{1 + ' + U.t(a.w / 100, 5) + '} = ' + U.t(a.Wd, 3) + '\\ \\text{g} \\qquad (4)') +
            '<p class="ket">w dimasukkan sebagai bilangan desimal (' + f(a.w, 3) + '% = ' + f(a.w / 100, 5) + '), bukan angka persennya.</p>') +
          U.langkah('5. Berat pasir dalam kerucut + tanah galian', U.rumus('E = W_8 - W_9 = ' + U.t(a.W8, 1) + ' - ' + U.t(a.W9, 1) + ' = ' + U.t(a.total, 1) + '\\ \\text{g} \\qquad (5)')) +
          U.langkah('6. Berat pasir dalam tanah galian', U.rumus('F = (W_8 - W_9) - (W_6 - W_7) = ' + U.t(a.total, 1) + ' - ' + U.t(a.kerucut, 1) + ' = ' + U.t(a.lubang, 1) + '\\ \\text{g} \\qquad (6)')) +
          U.langkah('7. Volume galian', U.rumus('\\gamma_{sand} = \\dfrac{W_2 - W_1}{W_3 - W_1} = \\dfrac{' + U.t(+m.param.K2, 1) + ' - ' + U.t(+m.param.K1, 1) + '}{' + U.t(+m.param.K3, 1) + ' - ' + U.t(+m.param.K1, 1) + '} = ' + U.t(r.gammaPasir, 3) + '\\ \\text{g/cm}^3 \\qquad (7)') +
            U.rumus('G = V_{tg} = \\dfrac{F}{\\gamma_{sand}} = \\dfrac{' + U.t(a.lubang, 1) + '}{' + U.t(r.gammaPasir, 4) + '} = ' + U.t(a.V, 3) + '\\ \\text{cm}^3 \\qquad (8)') +
            '<p class="ket">W<sub>3</sub> − W<sub>1</sub> = berat air = volume tabung kalibrasi (γ<sub>w</sub> = 1 g/cm³).</p>') +
          U.langkah('8. Berat isi kering tanah', U.rumus('H = \\gamma_d = \\dfrac{W_d}{V_{tg}} = \\dfrac{' + U.t(a.Wd, 3) + '}{' + U.t(a.V, 3) + '} = ' + U.t(a.gammaD, 3) + '\\ \\text{g/cm}^3 \\qquad (9)')) +
          (r.D !== undefined ? U.langkah('9. Derajat kepadatan lapangan', U.rumus('D = \\dfrac{\\gamma_{d\\,lap}}{\\gamma_{d\\,lab}}\\times 100\\% = \\dfrac{' + U.t(r.gammaD, 3) + '}{' + U.t(+m.param.gammaLab, 3) + '}\\times 100\\% = ' + U.t(r.D, 2) + '\\% \\qquad (10)') +
            '<p class="ket">γ<sub>d lap</sub> = rata-rata berat isi kering semua titik uji.</p>') : '');
        h += beda(['Langkah 4 laporan membagi dengan (1 + 22,302), yaitu memakai angka persen, sehingga W<sub>d</sub> = 73,985 g. Seharusnya (1 + 0,22302): W<sub>d</sub> = 1.409,6 g. Akibatnya laporan mendapat γ<sub>d</sub> = 0,0575 g/cm³ dan D = 1,77%; dengan cara yang benar γ<sub>d</sub> ≈ 1,095 g/cm³ dan D ≈ 59,8%.',
          'Form laporan menulis berat isi kering rata-rata 0,0324, tidak sama dengan 0,0575 dari satu-satunya titik uji.',
          'Form laporan menulis W<sub>3</sub> − W<sub>1</sub> = 5.328,9; seharusnya 5.478 − 139,1 = 5.338,9 cm³. γ<sub>sand</sub> = 1,423 g/cm³ tetap sama.',
          'Laporan membagi F dengan γ<sub>sand</sub> yang sudah dibulatkan (1,423) sehingga V = 1.287,421 cm³; alat memakai γ<sub>sand</sub> tanpa pembulatan: ' + f(1832 / 1.4232145, 1) + ' cm³ untuk data contoh.']);
        h += belajar('Mengukur berat isi kering tanah di lapangan dengan mengganti volume lubang galian memakai pasir yang berat isinya sudah diketahui, lalu membandingkannya dengan γ<sub>d maks</sub> hasil pemadatan di laboratorium.',
          ['Kalibrasi alat: berat pasir yang mengisi kerucut (W<sub>4</sub> − W<sub>5</sub>).', 'Kalibrasi pasir uji: γ<sub>sand</sub> = (W<sub>2</sub> − W<sub>1</sub>)/(W<sub>3</sub> − W<sub>1</sub>).',
            'Berat pasir dalam kerucut A = W<sub>6</sub> − W<sub>7</sub>.', 'Berat tanah galian B = W<sub>11</sub> − W<sub>10</sub>.', 'Kadar air C dari kontainer.',
            'Berat kering D = B/(1 + w).', 'Berat pasir dalam kerucut + galian E = W<sub>8</sub> − W<sub>9</sub>.', 'Berat pasir dalam galian F = E − A.',
            'Volume galian G = F/γ<sub>sand</sub>.', 'Berat isi kering H = D/G.', 'Derajat kepadatan = γ<sub>d lap</sub>/γ<sub>d lab</sub> × 100%.'],
          'Derajat kepadatan dibandingkan dengan syarat spesifikasi proyek (isi kolom syarat bila ada). Nilai jauh di bawah 100% berarti tanah di lapangan belum sepadat hasil pemadatan laboratorium.');
        return h;
      },
      ekspor: function (m, r) {
        var t = r.titik, b = [['Kalibrasi alat W4', 'g', +m.param.W4], ['Kalibrasi alat W5', 'g', +m.param.W5], ['Kalibrasi pasir W3', 'g', +m.param.K3], ['Kalibrasi pasir W2', 'g', +m.param.K2],
          ['Kalibrasi pasir W1', 'g', +m.param.K1], ['Berat isi pasir', 'g/cm3', r.gammaPasir], [], ['Uraian', 'Satuan'].concat(t.map(function (x) { return 'Titik ' + x.nama; }))];
        BARIS.forEach(function (x) { b.push([x[1], 'g'].concat(t.map(function (p) { return p[x[0]]; }))); });
        [['Kadar air', '%', 'w'], ['Berat kering', 'g', 'Wd'], ['Berat pasir dalam tanah galian', 'g', 'lubang'], ['Volume galian', 'cm3', 'V'], ['Berat isi kering', 'g/cm3', 'gammaD'], ['Derajat kepadatan', '%', 'D']]
          .forEach(function (x) { b.push([x[0], x[1]].concat(t.map(function (p) { return p[x[2]] === undefined ? '' : p[x[2]]; }))); });
        b.push([], ['Berat isi kering rata-rata', 'g/cm3', r.gammaD]);
        if (r.D !== undefined) b.push(['Derajat kepadatan', '%', r.D]);
        return b;
      },
      sumber: ['Badan Standardisasi Nasional. SNI 2828:2011 <em>Metode uji densitas tanah di tempat (lapangan) dengan alat konus pasir</em>.',
        'Form uji kepadatan lapangan (sand cone) Laboratorium Mekanika Tanah UNJA: urutan W<sub>4</sub>–W<sub>14</sub> dan rumus tiap baris.']
    });
  }
})();
