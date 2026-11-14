/* Definisi alat: analisa hidrometer 152H dan kurva gradasi gabungan, mengikuti form Analisa Hidrometer lab UNJA (hlm 14). */
(function () {
  'use strict';

  var H = window.HitungHidrometer, HS = window.HitungSaringan, f = Umum.f;
  var WAKTU = [0.5, 1, 2, 4, 8, 15, 30, 60, 240, 480, 1440, 2880];
  var SUMBER_NAMA = { tabel: 'tabel ASTM D422', rumus: 'rumus', manual: 'diisi manual' };

  function formatMm(v) { return f(v, v >= 1 ? 2 : v >= 0.01 ? 3 : 4); }
  function fw(t) { return f(t, t < 1 ? 1 : 0); }

  function grafik(r) {
    var dmin = Math.min(0.001, Math.pow(10, Math.floor(Math.log10(Math.min.apply(null, r.titik.map(function (t) { return t.mm; }))))));
    var dmaks = Math.max(10, Math.pow(10, Math.ceil(Math.log10(r.titik[0].mm))));
    var saringan = r.titik.filter(function (t) { return t.asal === 'saringan'; }), hidro = r.titik.filter(function (t) { return t.asal === 'hidrometer'; });
    var tanda = [];
    [['D₁₀', r.D10, 10], ['D₃₀', r.D30, 30], ['D₆₀', r.D60, 60]].forEach(function (d) {
      if (d[1]) tanda.push({ x: d[1], y: d[2], teks: d[0] + ' = ' + formatMm(d[1]) + ' mm', posisi: d[1] < Math.sqrt(dmin * dmaks) ? 'kanan' : 'kiri' }); // seperti form lab: butir kecil di kiri
    });
    return Grafik.plot({ id: 'gradasi-gabungan', judul: 'Grafik gradasi butiran (saringan + hidrometer)', x: { min: dmin, max: dmaks, log: true, balik: false, label: 'Diameter (mm, skala log)' },
      y: { min: 0, max: 100, label: 'Persen lolos (%)', tick: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] },
      vertikal: [{ x: 4.75, teks: 'No. 4' }, { x: 0.075, teks: 'No. 200' }, { x: r.batasLempung, teks: String(r.batasLempung).replace('.', ',') + ' mm' }],
      seri: [{ titik: r.titik.map(function (t) { return [t.mm, t.lolos]; }), warna: 'teks', tebal: 1.8 },
        { titik: saringan.map(function (t) { return [t.mm, t.lolos]; }), garis: false, penanda: true, warna: 'aksen', label: 'Saringan' },
        { titik: hidro.map(function (t) { return [t.mm, t.lolos]; }), garis: false, penanda: true, warna: 'biru', label: r.kurva === 'form' ? 'Hidrometer (N′)' : 'Hidrometer (N × F₁₀/100)' }],
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
    id: 'hidrometer', judulEkspor: 'Analisa hidrometer (SNI 3423:2008)',
    nim: { ket: 'berat tertahan saringan dan bacaan hidrometer Rh', tabel: { ayakan: ['nilai'], bacaan: ['R'] } },
    parameter: [
      { id: 'W', label: 'Massa tanah kering, W<sub>s</sub>', satuan: 'gram', bantuan: 'Contoh yang didispersikan untuk uji hidrometer.' },
      { id: 'Gs', label: 'Berat jenis, G<sub>s</sub>', dariAlat: { alat: 'berat-spesifik', nama: 'berat spesifik', ambil: function (h) { return h.G; }, d: 3 } },
      { id: 'caraA', label: 'Koreksi c = a', pilihan: [['tabel', 'Tabel 1 ASTM D422 (interpolasi G<sub>s</sub>)'.replace(/<[^>]+>/g, '')], ['rumus', 'Rumus a = 1,65 Gs / [(Gs − 1) 2,65]']],
        bantuan: 'Form tercetak menulis c = a = 0,995; isi kotak di bawah bila ingin memakai angka itu.' },
      { id: 'a', label: 'c = a diisi sendiri', bantuan: 'Opsional. Bila diisi, menggantikan tabel atau rumus.' },
      { id: 'caraLK', label: 'L dan K', pilihan: [['tabel', 'Tabel 2 dan 3 ASTM D422 (interpolasi, seperti contoh laporan)'], ['rumus', 'Rumus L = 16,29 − 0,164 R dan K dari viskositas air']] },
      { id: 'kurva', label: 'Dasar kurva gradasi', pilihan: [['form', 'N′ = N/100 × % lolos No. 200 (rumus form)'], ['astm', 'N × F10/100 (ASTM D422)']],
        bantuan: 'Form lab memakai N′. ASTM D422 mengalikan N dengan persen lolos No. 10 seluruh contoh.' },
      { id: 'P200form', label: '% lolos saringan No. 200 untuk N′', satuan: '%', bantuan: 'Kosongkan untuk memakai lolos No. 200 dari tabel saringan di atas (contoh hidrometer). Bisa juga diambil dari analisa saringan.',
        dariAlat: { alat: 'saringan', nama: 'analisa saringan', ambil: function (h) { return h.P200; }, d: 3 } },
      { id: 'F10', label: 'Lolos No. 10 seluruh contoh, F<sub>10</sub>', satuan: '%', bantuan: '100 bila seluruh contoh lolos No. 10. Dipakai untuk kolom persen lewat terhadap seluruh contoh dan kurva ASTM.',
        dariAlat: { alat: 'saringan', nama: 'analisa saringan', ambil: function (h) { return h.P10; }, d: 2 } },
      { id: 'P4', label: 'Lolos No. 4 seluruh contoh', satuan: '%', bantuan: 'Hanya dipakai bila F<sub>10</sub> < 100%.',
        dariAlat: { alat: 'saringan', nama: 'analisa saringan', ambil: function (h) { return h.P4; }, d: 2 } },
      { id: 'Cm', label: 'Koreksi meniskus, C<sub>m</sub>', bantuan: 'Ditambahkan ke bacaan hanya untuk mencari L. Contoh laporan tidak memakainya (0).' },
      { id: 'Cd', label: 'Koreksi nol/dispersan, C<sub>d</sub>', bantuan: 'Dikurangkan dari Rh + k. Isi 0 bila koreksi suhu k sudah mencakupnya.' },
      { id: 'batasLempung', label: 'Batas lanau–lempung', pilihan: [['0.002', '0,002 mm'], ['0.005', '0,005 mm (ASTM D422)']] }],
    tabel: [
      { id: 'ayakan', jenis: 'baris', judul: 'Saringan contoh hidrometer (tabel atas form)', namaBaris: 'No. saringan',
        pilihanBaris: HS.SARINGAN.map(function (s) { return s.nama; }), barisAwal: ['No. 4', 'No. 10', 'No. 20', 'No. 40', 'No. 60', 'No. 140', 'No. 200'],
        infoBaris: function (n) { return '(' + formatMm(HS.ukuran(n)) + ' mm)'; },
        kolomNilai: { id: 'tertahan', label: 'Berat tertahan (gram)' },
        keterangan: 'Contoh dicuci di atas No. 200 setelah pembacaan terakhir, dikeringkan, lalu disaring. Baris kosong tidak dihitung.' },
      { id: 'bacaan', jenis: 'daftar', judul: 'Bacaan hidrometer (tabel bawah form)', namaPendek: 'Bacaan hidrometer', maks: 30,
        keterangan: 'Waktu dalam menit sejak pengocokan. k = koreksi suhu (isi dari tabel lab). L dan K boleh diisi manual; bila kosong dibaca dari tabel ASTM atau dihitung, sesuai pilihan di atas.',
        awal: WAKTU.map(function (t) { return { t: t }; }),
        kolom: [{ id: 'R', label: 'Rh' }, { id: 't', label: 'Waktu percobaan', satuan: 'menit', kunci: true }, { id: 'T', label: 'Suhu', satuan: '°C' },
          { id: 'L', label: 'L manual', satuan: 'cm', opsional: true }, { id: 'K', label: 'K manual', opsional: true }, { id: 'k', label: 'Koreksi suhu (k)', opsional: true }] }],
    // Contoh laporan Hydrometer Analysis.pdf hlm 104–108 (Rh dan berat tertahan sudah termasuk +0,34 NIM penulis).
    contoh: { param: { W: 100, Gs: 2.678, caraA: 'tabel', a: '', caraLK: 'tabel', kurva: 'form', P200form: '', F10: 100, P4: '', Cm: 0, Cd: 0, batasLempung: '0.002' }, tabel: {
      ayakan: [['No. 4', ''], ['No. 10', 0], ['No. 20', ''], ['No. 40', 2.04], ['No. 60', ''], ['No. 140', ''], ['No. 200', 58.64]]
        .map(function (b) { return { nama: b[0], nilai: b[1] }; }),
      bacaan: [[54.34, 0.5], [55.34, 1], [56.34, 2], [57.34, 4], [57.54, 8], [52.34, 15], [51.34, 30], [50.34, 60], [39.34, 240], [28.34, 480], [27.34, 1440], [26.34, 2880]]
        .map(function (b) { return { R: b[0], t: b[1], T: 27, k: -0.5 }; }) } },
    kosong: { param: { W: '', Gs: '', caraA: 'tabel', a: '', caraLK: 'tabel', kurva: 'form', P200form: '', F10: 100, P4: '', Cm: 0, Cd: 0, batasLempung: '0.002' } },
    hitung: function (m) {
      var p = m.param;
      return H.hitung({ W: p.W, Gs: p.Gs, caraA: p.caraA, a: p.a, caraLK: p.caraLK, kurva: p.kurva, F10: p.F10, P4: p.P4, P200form: p.P200form, Cm: p.Cm, Cd: p.Cd,
        batasLempung: +p.batasLempung, bacaan: m.tabel.bacaan, ayakan: m.tabel.ayakan.map(function (b) { return { nama: b.nama, tertahan: b.nilai }; }) });
    },
    hasil: function (m, r) { return { P4: r.P4, P10: r.P10, P40: r.P40, P200: r.P200, D10: r.D10, D30: r.D30, D60: r.D60, Cu: r.Cu, Cc: r.Cc, fraksi: r.fraksi }; },
    tampil: function (m, r, U) {
      var p = m.param, h = '', fr = r.fraksi, kartu = [], form = r.kurva === 'form';
      if (fr) {
        kartu.push(U.kartu('Gravel', f(fr.kerikil, 2) + ' <small>%</small>', '> 4,75 mm'), U.kartu('Sand', f(fr.pasir, 2) + ' <small>%</small>', '4,75 – 0,075 mm'));
        kartu.push(U.kartu('Silt', fr.lanau !== null ? f(fr.lanau, 2) + ' <small>%</small>' : '–', '0,075 – ' + String(r.batasLempung).replace('.', ',') + ' mm'),
          U.kartu('Clay', fr.lempung !== null ? f(fr.lempung, 2) + ' <small>%</small>' : '–', '< ' + String(r.batasLempung).replace('.', ',') + ' mm'));
      }
      h += U.ringkasan(kartu.concat([U.kartu('Koefisien gradasi', r.Cu ? 'C<sub>u</sub> ' + f(r.Cu, 2) : '–', r.Cc ? 'C<sub>c</sub> = ' + f(r.Cc, 2) : 'D<sub>10</sub> belum terbaca')]));

      h += '<h3>Tabel hasil (urutan form lab)</h3><p class="kecil">Massa tanah kering W<sub>s</sub> = ' + f(p.W, 2) + ' gram · Berat jenis G<sub>s</sub> = ' + f(p.Gs, 3) +
        ' · Koreksi c = a = ' + f(r.a, 4) + ' (' + SUMBER_NAMA[r.aSumber] + ')</p>';
      if (r.ayakan.length) {
        h += U.tabel([{ teks: 'No. saringan' }, 'Berat tertahan (gram)', 'Jumlah berat tertahan (gram)', 'Tertahan (%)', 'Lolos (%)', 'Persen lewat terhadap seluruh contoh (%)'],
          r.ayakan.map(function (a) { return [a.nama.replace('No. ', ''), f(a.tertahan, 2), f(a.kumulatif, 2), f(a.persenTertahan, 2), f(a.lolos, 2), f(a.lolosTotal, 2)]; }), null, { angkaMulai: 1 });
      }
      var b = r.bacaan;
      h += U.tabel(['Rh', 'Waktu percobaan (menit)', 'Suhu (°C)', 'L (cm)', 'K', '(L/t)<sup>½</sup>', 'Diameter (mm)', 'Koreksi suhu (k)', r.Cd ? 'Rh + k − C<sub>d</sub>' : 'Rh + k', 'N (%)', 'N′ (%)']
        .concat(form ? [] : ['N × F<sub>10</sub>/100 (%)']),
        b.map(function (x) {
          return [f(x.R, 2), fw(x.t), f(x.T, 1), f(x.L, 3) + (x.Lmanual ? '*' : ''), f(x.K, 6) + (x.Kmanual ? '*' : ''), f(x.akar, 3), f(x.D, 4), f(x.k, 2), f(x.Rc, 2), f(x.P, 3),
            x.Nform === null ? '–' : f(x.Nform, 3)].concat(form ? [] : [f(x.Ptotal, 3)]);
        }), null, { angkaMulai: 0 });
      h += '<p class="kecil redup">L dan K: ' + SUMBER_NAMA[r.caraLK] + (b.some(function (x) { return x.Lsumber !== r.caraLK || x.Ksumber !== r.caraLK; }) ? ' (ada baris dengan sumber lain; * = diisi manual)' : '') +
        '. N = persen lolos terhadap W<sub>s</sub>; N′ = N/100 × ' + (r.P200N !== null ? f(r.P200N, 3) + '% lolos No. 200 (' + (r.P200Nsumber === 'isian' ? 'isian' : 'tabel saringan di atas') + ')' : '% lolos No. 200 (belum ada)') +
        '. Kurva gradasi memakai ' + (form ? 'N′ seperti form.' : 'N × F<sub>10</sub>/100 (ASTM D422).') + '</p>';
      h += U.grafik(grafik(r), 'Grafik gradasi butiran gabungan saringan dan hidrometer.');

      var x = b[0], no = 0, Gs = p.Gs;
      h += '<h3>Langkah hitungan (Rh = ' + f(x.R, 2) + ', t = ' + fw(x.t) + ' menit)</h3>';
      // a) L
      var Lisi;
      if (x.Lsumber === 'manual') Lisi = '<p>L diisi manual: ' + f(x.L, 3) + ' cm.</p>';
      else if (x.Lsumber === 'tabel') {
        var r1 = Math.min(Math.floor(x.RL), 59), L1 = H.TABEL_L[r1], L2 = H.TABEL_L[r1 + 1];
        Lisi = '<p>Dari Tabel 2 ASTM D422 (hidrometer 152H): R = ' + r1 + ' → L = ' + f(L1, 1) + ' cm; R = ' + (r1 + 1) + ' → L = ' + f(L2, 1) + ' cm.</p>' +
          U.rumus('L = ' + U.t(L1, 1) + ' + \\dfrac{' + U.t(x.RL, 2) + ' - ' + r1 + '}{' + (r1 + 1) + ' - ' + r1 + '}\\,(' + U.t(L2, 1) + ' - ' + U.t(L1, 1) + ') = ' + U.t(x.L, 3) + '\\ \\text{cm} \\qquad (' + (++no) + ')');
      } else Lisi = U.rumus('L = 16{,}29 - 0{,}164\\,(R + C_m) = 16{,}29 - 0{,}164\\times' + U.t(x.RL, 2) + ' = ' + U.t(x.L, 3) + '\\ \\text{cm} \\qquad (' + (++no) + ')');
      h += U.langkah('a) Nilai L (kedalaman efektif)', Lisi);
      // b) K
      var Kisi;
      if (x.Ksumber === 'manual') Kisi = '<p>K diisi manual: ' + f(x.K, 6) + '.</p>';
      else if (x.Ksumber === 'tabel') {
        var G = H.TABEL_K_GS, j = 0;
        while (j < G.length - 2 && Gs > G[j + 1] + 1e-9) j++;
        var T1 = Math.min(Math.floor(x.T), 29), satuSuhu = Math.abs(x.T - T1) < 1e-9;
        Kisi = '<p>Dari Tabel 3 ASTM D422 pada ' + f(T1, 0) + ' °C: G<sub>s</sub> ' + f(G[j], 2) + ' → K = ' + f(H.TABEL_K[T1][j], 5) + '; G<sub>s</sub> ' + f(G[j + 1], 2) + ' → K = ' + f(H.TABEL_K[T1][j + 1], 5) + '.</p>' +
          (satuSuhu ? U.rumus('K = ' + U.t(H.TABEL_K[T1][j], 5) + ' + \\dfrac{' + U.t(Gs, 3) + ' - ' + U.t(G[j], 2) + '}{' + U.t(G[j + 1], 2) + ' - ' + U.t(G[j], 2) + '}\\,(' + U.t(H.TABEL_K[T1][j + 1], 5) + ' - ' + U.t(H.TABEL_K[T1][j], 5) + ') = ' + U.t(x.K, 6) + ' \\qquad (' + (++no) + ')') :
            '<p>Suhu ' + f(x.T, 1) + ' °C di antara baris tabel, jadi K diinterpolasi juga terhadap suhu: K = ' + f(x.K, 6) + '.</p>');
      } else {
        Kisi = U.rumus('\\eta = 2{,}414\\times10^{-5}\\times 10^{\\,247{,}8/(' + U.t(x.T, 1) + ' + 273{,}15 - 140)} = ' + U.t(x.eta * 1000, 4) + '\\ \\text{mPa}\\cdot\\text{s}') +
          U.rumus('K = \\sqrt{\\dfrac{30\\,\\eta}{980\\,(G_s - G_1)}} = ' + U.t(x.K, 6) + ' \\qquad (' + (++no) + ')') +
          '<p class="ket">η dalam poise (1 mPa·s = 0,01 poise), G<sub>1</sub> = berat jenis air pada T (Tanaka dkk., 2001).</p>';
      }
      h += U.langkah('b) Nilai K', Kisi);
      h += U.langkah('c) Nilai (L/t)<sup>½</sup>', U.rumus('\\left(\\dfrac{L}{t}\\right)^{1/2} = \\left(\\dfrac{' + U.t(x.L, 3) + '}{' + U.t(x.t, x.t < 1 ? 1 : 0) + '}\\right)^{1/2} = ' + U.t(x.akar, 3) + ' \\qquad (' + (++no) + ')') +
        '<p class="ket">L dalam <strong>cm</strong> dan t dalam <strong>menit</strong>, satuan yang dipakai Tabel 3 ASTM D422.</p>');
      h += U.langkah('d) Nilai diameter', U.rumus('D = K\\sqrt{\\dfrac{L}{t}} = ' + U.t(x.K, 6) + '\\times' + U.t(x.akar, 3) + ' = ' + U.t(x.D, 4) + '\\ \\text{mm} \\qquad (' + (++no) + ')'));
      h += U.langkah('e) Koreksi suhu', '<p>T = ' + f(x.T, 1) + ' °C, k = ' + f(x.k, 2) + ' (diisi dari tabel koreksi suhu lab).</p>');
      h += U.langkah('f) Nilai Rh + k', U.rumus('R_h + k' + (r.Cd ? ' - C_d' : '') + ' = ' + U.t(x.R, 2) + ' + (' + U.t(x.k, 2) + ')' + (r.Cd ? ' - ' + U.t(r.Cd, 2) : '') + ' = ' + U.t(x.Rc, 2) + ' \\qquad (' + (++no) + ')'));
      var cIsi;
      if (r.aSumber === 'tabel') {
        var A = H.TABEL_A, i = 0;
        while (i < A.length - 2 && Gs > A[i + 1][0] + 1e-9) i++;
        cIsi = '<p>c = a dari Tabel 1 ASTM D422: G<sub>s</sub> ' + f(A[i][0], 2) + ' → ' + f(A[i][1], 2) + '; G<sub>s</sub> ' + f(A[i + 1][0], 2) + ' → ' + f(A[i + 1][1], 2) + '.</p>' +
          U.rumus('c = ' + U.t(A[i][1], 2) + ' + \\dfrac{' + U.t(Gs, 3) + ' - ' + U.t(A[i][0], 2) + '}{' + U.t(A[i + 1][0], 2) + ' - ' + U.t(A[i][0], 2) + '}\\,(' + U.t(A[i + 1][1], 2) + ' - ' + U.t(A[i][1], 2) + ') = ' + U.t(r.a, 4));
      } else if (r.aSumber === 'manual') cIsi = '<p>c = a diisi manual: ' + f(r.a, 4) + ' (tabel memberi ' + (r.aTabel !== null ? f(r.aTabel, 4) : '–') + ', rumus ' + f(r.aRumus, 4) + ').</p>';
      else cIsi = U.rumus('c = a = \\dfrac{1{,}65\\,G_s}{(G_s - 1)\\,2{,}65} = \\dfrac{1{,}65\\times' + U.t(Gs, 3) + '}{(' + U.t(Gs, 3) + ' - 1)\\times 2{,}65} = ' + U.t(r.a, 4));
      h += U.langkah('g) Nilai N', cIsi + U.rumus('N = \\dfrac{(R_h + k)\\cdot c}{W_s}\\times 100\\% = \\dfrac{' + U.t(x.Rc, 2) + '\\times' + U.t(r.a, 4) + '}{' + U.t(p.W, 2) + '}\\times 100\\% = ' + U.t(x.P, 3) + '\\% \\qquad (' + (++no) + ')'));
      if (x.Nform !== null) {
        h += U.langkah('h) Nilai N′', U.rumus('N\' = \\dfrac{N}{100}\\times \\%\\,\\text{lolos saringan No. 200} = \\dfrac{' + U.t(x.P, 3) + '}{100}\\times' + U.t(r.P200N, 3) + ' = ' + U.t(x.Nform, 3) + '\\% \\qquad (' + (++no) + ')') +
          '<p class="ket">Rumus tercetak di form lab.' + (form ? ' N′ dipakai sebagai titik hidrometer pada grafik.' : '') + '</p>');
      }
      if (!form) {
        h += U.langkah('Persen terhadap seluruh contoh (ASTM D422)', U.rumus('N\\times\\dfrac{F_{10}}{100} = ' + U.t(x.P, 3) + '\\times\\dfrac{' + U.t(r.F10, 2) + '}{100} = ' + U.t(x.Ptotal, 3) + '\\%'));
      }
      h += bedaContoh(m, '<br>1) Satuan: contoh menulis L dalam mm (73,66) dan t dalam detik (0,5 menit = 30 detik), sehingga (L/t)<sup>½</sup> = 1,567 dan D = 0,0196 mm. ' +
        'Tabel K ASTM D422 dibuat untuk L dalam cm dan t dalam menit; alat memakai L = 7,366 cm dan t = 0,5 menit, sehingga (L/t)<sup>½</sup> = ' + f(b[0].akar, 3) + ' dan D = ' + formatMm(b[0].D) + ' mm. ' +
        'Semua diameter contoh sekitar 0,41 kali diameter alat (√(10/60)).<br>' +
        '2) Interpolasi K dan c di contoh memakai selisih G<sub>s</sub> 0,02, padahal 2,678 − 2,65 = 0,028. Contoh: K = 0,012504 dan c = 0,96 (langkahnya pun salah hitung; ' +
        'dengan selisih 0,02 hasilnya 0,996). Alat: K = ' + f(b[0].K, 6) + ' dan c = ' + f(r.a, 4) + ', sehingga N baris pertama ' + f(b[0].P, 3) + '%, bukan 51,686%.<br>' +
        '3) L di form contoh untuk Rh 57,34; 57,54; 52,34; 39,34; 28,34; 26,34 tidak sama dengan interpolasi Tabel 2 (contoh 72,72; 74,32; 77,66; 95,02; 114,66; 121,66 mm, alat 6,932; 6,892; 7,732; 9,832; 11,632; 11,966 cm).<br>' +
        '4) N′ di form contoh sama dengan N × 38,98%, sedangkan langkah tulisan tangan menyebut % lolos No. 200 = 11,368% (dari analisa saringan). ' +
        'Alat memakai lolos No. 200 dari tabel atas form ini (' + (r.P200N !== null ? f(r.P200N, 2) : '–') + '%); isi kotak % lolos No. 200 bila asisten meminta angka lain.');
      h += belajar('Menentukan sebaran ukuran butir halus (lolos No. 200) dari kecepatan mengendap butir di air (hukum Stokes), lalu menggabungkannya dengan data saringan menjadi satu grafik gradasi.',
        ['Baca L dari Rh (Tabel 2 ASTM D422, interpolasi).', 'Baca K dari G<sub>s</sub> dan suhu (Tabel 3 ASTM D422, interpolasi).', 'Hitung (L/t)<sup>½</sup> dengan L dalam cm dan t dalam menit.',
          'Hitung diameter D = K (L/t)<sup>½</sup>.', 'Tentukan koreksi suhu k.', 'Hitung Rh + k.', 'Hitung N = (Rh + k) c / W<sub>s</sub> × 100% dengan c = a dari Tabel 1.',
          'Hitung N′ = N/100 × % lolos No. 200, lalu gambar N′ terhadap D bersama titik saringan.'],
        'Bagian kurva di bawah 0,075 mm memisahkan lanau (silt) dan lempung (clay). Persen lempung dan D<sub>10</sub> yang tidak terbaca dari saringan saja bisa dibaca di sini, lalu dipakai di alat klasifikasi.');
      return h;
    },
    ekspor: function (m, r) {
      var b = [['Massa tanah kering Ws', 'gram', m.param.W], ['Berat jenis Gs', '-', m.param.Gs], ['Koreksi c = a', '-', r.a], ['% lolos No. 200 untuk N\'', '%', r.P200N === null ? '' : r.P200N], ['F10', '%', r.F10], []];
      if (r.ayakan.length) {
        b.push(['No. saringan', 'Berat tertahan (gram)', 'Jumlah berat tertahan (gram)', 'Tertahan (%)', 'Lolos (%)', 'Persen lewat terhadap seluruh contoh (%)']);
        r.ayakan.forEach(function (a) { b.push([a.nama, a.tertahan, a.kumulatif, a.persenTertahan, a.lolos, a.lolosTotal]); });
        b.push([]);
      }
      b.push(['Rh', 'Waktu (menit)', 'Suhu (°C)', 'L (cm)', 'K', '(L/t)^0,5', 'Diameter (mm)', 'Koreksi suhu k', 'Rh + k', 'N (%)', 'N\' (%)', 'N x F10/100 (%)']);
      r.bacaan.forEach(function (x) { b.push([x.R, x.t, x.T, x.L, x.K, x.akar, x.D, x.k, x.Rc, x.P, x.Nform === null ? '' : x.Nform, x.Ptotal]); });
      b.push([], ['D10', 'mm', r.D10 || ''], ['D30', 'mm', r.D30 || ''], ['D60', 'mm', r.D60 || ''], ['Cu', '-', r.Cu || ''], ['Cc', '-', r.Cc || '']);
      if (r.fraksi) b.push(['Gravel', '%', r.fraksi.kerikil], ['Sand', '%', r.fraksi.pasir], ['Silt', '%', r.fraksi.lanau === null ? '' : r.fraksi.lanau], ['Clay', '%', r.fraksi.lempung === null ? '' : r.fraksi.lempung]);
      return b;
    },
    sumber: ['Badan Standardisasi Nasional. SNI 3423:2008 <em>Cara uji analisis ukuran butir tanah</em>.',
      'ASTM D422-63 (2002). <em>Standard test method for particle-size analysis of soils</em>. Tabel 1 (faktor a), Tabel 2 (L hidrometer 152H), Tabel 3 (K), rumus kedalaman efektif dan K. ' +
        'Nilai tabel di alat ini belum dicocokkan dengan halaman standar yang dilampirkan; diperiksa silang dengan rumusnya dan dengan contoh laporan [BELUM TERVERIFIKASI]. Standar ini ditarik ASTM pada 2016 dan diganti ASTM D7928.',
      'Form analisa hidrometer (rumus N dan N′), Laboratorium Mekanika Tanah, Teknik Sipil Universitas Jambi.',
      'Tanaka, M., Girard, G., Davis, R., Peuto, A., &amp; Bignell, N. (2001). Recommended table for the density of water between 0 °C and 40 °C based on recent experimental reports. <em>Metrologia, 38</em>(4), 301–309.',
      'Viskositas air: persamaan tipe Vogel η = A·10<sup>B/(T−C)</sup> dengan A = 2,414 × 10⁻⁵ Pa·s, B = 247,8 K, C = 140 K; dicek terhadap nilai IAPWS (2008) pada 20 °C dan 25 °C.']
  });
})();
