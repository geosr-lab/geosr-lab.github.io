/* Definisi alat: uji konsolidasi satu dimensi di laboratorium (form lab UNJA, e–log p, Cc, Cs, cv metode Taylor). */
(function () {
  'use strict';

  var H = window.HitungKonsolidasiLab, f = Umum.f;
  // Baris waktu form lab: 0, 6, 10, 15, 30 detik; 1, 2, 4, 8, 15, 30 menit; 1, 2, 4, 8, 24 jam (dalam menit; 10 detik ≈ 0,1667 menit).
  var WAKTU = [0, 0.1, 0.1667, 0.25, 0.5, 1, 2, 4, 8, 15, 30, 60, 120, 240, 480, 1440];
  // Contoh laporan Consolidation Test.pdf, form pembacaan arloji (halaman PDF 5): beban 1, 3, 7, 3, 1 kg,
  // satu baris per waktu di atas. Angka ditulis apa adanya, termasuk +0,34 NIM penulis yang hanya ada di bacaan 24 jam.
  var BEBAN = [1, 3, 7, 3, 1], T90 = [0.0625, 0.0625, 0.36, 0.25, 0.25];
  var KOLOM = [[6, 18, 20, 22, 23, 24, 24.5, 27, 29, 29.1, 29.4, 29.8, 30, 30.2, 30.5, 31.24],
    [0, 48, 50, 52, 53.5, 54.1, 55, 55.8, 56.1, 56.8, 57.9, 58.2, 38.9, 39.1, 39.9, 40.64],
    [0, 88, 88.4, 88.9, 89, 89.99, 90.2, 91, 91.3, 91.99, 92.9, 93.1, 93.5, 93.8, 92.2, 91.64],
    [0, 92.9, 92.8, 92.8, 92.7, 92.7, 92.6, 92.6, 92.6, 92.6, 92.6, 92.5, 92.2, 92.2, 92.2, 91.64],
    [0, 89.5, 89.4, 89.3, 89.1, 89, 88.9, 88.8, 88.7, 88.6, 88.1, 88, 87.9, 88.8, 88.7, 88.94]];

  function belajar(tujuan, alur, arti) {
    return '<section class="kartu belajar"><h3>Belajar dari pengujian ini</h3><p><strong>Tujuan.</strong> ' + tujuan + '</p>' +
      '<p><strong>Alur pengolahan</strong> (urutan seperti contoh laporan):</p><ol>' + alur.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ol>' +
      (arti ? '<p><strong>Arti hasil.</strong> ' + arti + '</p>' : '') + '</section>';
  }
  function beda(isi) { return '<div class="catatan"><strong>Beda dengan contoh laporan.</strong><ul>' + isi.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>'; }
  function eks(x, d) { return x ? x.toExponential(d).replace('.', ',') : '–'; }

  function kurvaE(r) {
    var T = r.tahap, pmin = Math.min.apply(null, T.map(function (t) { return t.p; })), pmaks = Math.max.apply(null, T.map(function (t) { return t.p; }));
    var es = T.map(function (t) { return t.e; }).concat([r.awal.e0]);
    var muat = T.filter(function (t) { return t.muat; }), lepas = [T[r.iMaks]].concat(T.filter(function (t) { return !t.muat; }));
    return Grafik.plot({ id: 'elogp', judul: 'Kurva e–log p', x: { min: Math.pow(10, Math.floor(Math.log10(pmin))), max: Math.pow(10, Math.ceil(Math.log10(pmaks * 1.01))), log: true, label: 'Tegangan, p (kg/cm², skala log)' },
      y: { min: Math.floor((Math.min.apply(null, es) - 0.02) * 20) / 20, max: Math.ceil((Math.max.apply(null, es) + 0.02) * 20) / 20, label: 'Angka pori, e' },
      horizontal: [{ y: r.awal.e0, teks: 'e₀ = ' + f(r.awal.e0, 3), rata: 'kanan' }],
      seri: [{ titik: muat.map(function (t) { return [t.p, t.e]; }), penanda: true, warna: 'aksen', label: 'Pembebanan' }]
        .concat(lepas.length > 1 ? [{ titik: lepas.map(function (t) { return [t.p, t.e]; }), penanda: true, warna: 'biru', putus: true, label: 'Pelepasan beban' }] : []) });
  }

  function kurvaAkar(t, satuan, arah) {
    var tay = t.taylor, titik = t.kolom.filter(function (b) { return b.t >= 0; });
    var xs = titik.map(function (b) { return Math.sqrt(b.t); }), ys = titik.map(function (b) { return b.d; });
    var xmaks = Math.max.apply(null, xs);
    if (tay && tay.x90) xmaks = Math.min(xmaks, Math.max(6, Math.ceil(tay.x90 * 2.5)));
    var ymin = Math.min.apply(null, ys), ymaks = Math.max.apply(null, ys), pad = (ymaks - ymin) * 0.08 || 1;
    var seri = [{ titik: titik.map(function (b) { return [Math.sqrt(b.t), b.d]; }), penanda: true, warna: 'aksen' }], tanda = [];
    if (tay) {
      // Garis dalam satuan pemampatan s = arah × d × satuan; kembalikan ke bacaan arloji untuk digambar.
      var keD = function (s) { return s / (arah * satuan); };
      seri.push({ titik: [[0, keD(tay.garis.a)], [xmaks, keD(tay.garis.a + tay.garis.b * xmaks)]], warna: 'teks', tebal: 1.4 });
      seri.push({ titik: [[0, keD(tay.garis.a)], [xmaks, keD(tay.garis.a + tay.garis.b / 1.15 * xmaks)]], warna: 'teks', putus: true, tebal: 1.4 });
      if (tay.x90) tanda.push({ x: tay.x90, y: keD(tay.s90), teks: 't₉₀ = ' + f(tay.t90, 2) + ' menit', posisi: 'kanan' });
    }
    return Grafik.plot({ id: 'akar-' + t.nama, judul: 'Tahap ' + t.nama + ': bacaan terhadap akar waktu', lebar: 470, tinggi: 330, x: { min: 0, max: xmaks, label: '√t (√menit)' },
      y: { min: Math.floor(ymin - pad), max: Math.ceil(ymaks + pad), balik: arah > 0, label: 'Bacaan arloji (divisi)' }, seri: seri, tanda: tanda });
  }

  var BARIS_CAWAN = [
    { id: 'W1', label: 'Berat cawan + tanah basah', simbol: 'W<sub>1</sub>', satuan: 'gram' },
    { id: 'W2', label: 'Berat cawan + tanah kering', simbol: 'W<sub>2</sub>', satuan: 'gram' },
    { id: 'W3', label: 'Berat cawan', simbol: 'W<sub>3</sub>', satuan: 'gram' }];

  Praktikum.pasang({
    id: 'konsolidasi-lab', judulEkspor: 'Uji konsolidasi (SNI 2812:2011)', lipat: true,
    nim: { ket: 'semua pembacaan arloji di tabel bacaan waktu (termasuk bacaan 24 jam) dan bacaan akhir yang diisi manual. Bacaan awal sebelum beban pertama tidak ditambah, supaya tambahan ikut masuk ke perubahan tebal', tabel: { tahap: ['akhir'], bacaan: ['*dinamis'] } },
    parameter: [
      { id: 'Gs', label: 'Berat spesifik tanah, G<sub>s</sub>', dariAlat: { alat: 'berat-spesifik', nama: 'berat spesifik', ambil: function (h) { return h.G; }, d: 3 } },
      { id: 'H0', label: 'Tinggi cincin, H<sub>0</sub>', satuan: 'cm' },
      { id: 'cincin', label: 'Berat cincin, W<sub>c</sub>', satuan: 'gram', bantuan: 'Massa ring (form: Penentuan kadar air dan berat isi).' },
      { id: 'diameter', label: 'Diameter cincin, D', satuan: 'cm' },
      { id: 'cincinBasah', label: 'Berat cincin + tanah basah, W<sub>4</sub>', satuan: 'gram', bantuan: 'Massa tanah basah + ring, sebelum pengujian.' },
      { id: 'caraWk', label: 'Berat tanah kering, W<sub>k</sub>', pilihan: [['ring', 'Ditimbang: massa tanah kering + ring setelah dioven'], ['cawan', 'Dari kadar air cawan sebelum percobaan: Wk = Wb / (1 + w₀)']] },
      { id: 'cincinKering', label: 'Massa tanah kering + ring', satuan: 'gram', bantuan: 'Setelah pengujian, benda uji dioven bersama cincin.', tampilJika: function (p) { return p.caraWk !== 'cawan'; } },
      { id: 'satuan', label: 'Satuan arloji', satuan: 'mm/divisi', bantuan: 'Lihat tulisan di muka arloji. Umumnya 0,01 mm/divisi.' },
      { id: 'arloji0', label: 'Bacaan arloji awal', satuan: 'divisi', bantuan: 'Sebelum beban pertama.' },
      { id: 'arah', label: 'Arah arloji saat memampat', pilihan: [['naik', 'Bacaan bertambah'], ['turun', 'Bacaan berkurang']] },
      { id: 'drainase', label: 'Drainase', pilihan: [['dua', 'Dua arah (batu pori atas dan bawah)'], ['satu', 'Satu arah']] },
      { id: 'caraCc', label: 'Indeks kompresi C<sub>c</sub> di kartu ringkasan', pilihan: [['terakhir', 'Dari dua tahap beban tertinggi'], ['maks', 'Dari interval tercuram']] },
      { id: 'LL', label: 'Batas cair, LL', satuan: '%', bantuan: 'Opsional, untuk korelasi C<sub>c</sub> = 0,009 (LL − 10).',
        dariAlat: { alat: 'atterberg', nama: 'Atterberg', ambil: function (h) { return h.LL; }, d: 2 } }],
    tabel: [
      { id: 'tahap', judul: 'Pembacaan arloji: beban tiap tahap', kolom: 'Tahap', awal: 5, min: 2, maks: 12, baris: [
        { id: 'beban', label: 'Beban', simbol: 'P', satuan: 'kg' },
        { id: 'p', label: 'Tekanan', simbol: 'p', satuan: 'kg/cm²', opsional: true },
        { id: 'akhir', label: 'Bacaan arloji akhir', simbol: 'd', satuan: 'divisi', opsional: true },
        { id: 't90', label: 't<sub>90</sub> dari grafik √t', simbol: 't<sub>90</sub>', satuan: 'menit', opsional: true }],
        keterangan: 'Kosongkan tekanan supaya dihitung p = beban / A; isi langsung bila alat memakai lengan beban. Bacaan akhir boleh dikosongkan bila bacaan waktu diisi (diambil bacaan 24 jam). t<sub>90</sub> kosong = dicari otomatis dengan metode Taylor. Tahap pelepasan beban cukup diisi beban dan bacaan.' },
      { id: 'bacaan', jenis: 'daftar', judul: 'Pembacaan arloji terhadap waktu', namaPendek: 'Bacaan waktu', maks: 40, awal: WAKTU.map(function (t) { return { t: t }; }),
        keterangan: 'Waktu sejak beban tahap itu dipasang, dalam menit (6 detik = 0,1; 10 detik = 0,1667; 15 detik = 0,25; 30 detik = 0,5; 1 jam = 60; 24 jam = 1.440). Satu kolom per tahap, mengikuti tabel beban.',
        kolom: [{ id: 't', label: 'Waktu', satuan: 'menit', kunci: true }],
        kolomDari: { tabel: 'tahap', awalan: 'd', label: function (nama) { return 'Tahap ' + nama; }, satuan: 'divisi' } },
      { id: 'cawanSebelum', judul: 'Kadar air sebelum percobaan', kolom: 'Percobaan', awal: 2, min: 1, maks: 4, baris: BARIS_CAWAN,
        keterangan: 'Opsional. Dipakai bila berat tanah kering dihitung dari kadar air (pilihan di atas).' },
      { id: 'cawanSesudah', judul: 'Kadar air sesudah percobaan', kolom: 'Percobaan', awal: 2, min: 1, maks: 4, baris: BARIS_CAWAN, keterangan: 'Opsional.' }],
    // Contoh laporan Consolidation Test.pdf: hlm 140–142 (pengolahan data) dan form halaman PDF 4–6.
    contoh: { param: { Gs: 2.678, H0: 1.4, cincin: 54.2, diameter: 5.01, cincinBasah: 103.335, caraWk: 'ring', cincinKering: 89.452,
      satuan: 0.1, arloji0: 0, arah: 'naik', drainase: 'dua', caraCc: 'terakhir', LL: '' },
      tabel: {
        tahap: BEBAN.map(function (b, i) { return { nama: String(i + 1), beban: b, t90: T90[i] }; }),
        bacaan: WAKTU.map(function (t, j) { var o = { t: t }; KOLOM.forEach(function (k, i) { o['d' + i] = k[j]; }); return o; }),
        cawanSebelum: [{ nama: '1' }, { nama: '2' }],
        cawanSesudah: [{ nama: '1', W1: 26.3, W2: 23.1, W3: 11.2 }, { nama: '2' }] } },
    kosong: { param: { Gs: '', H0: '', cincin: '', diameter: '', cincinBasah: '', caraWk: 'ring', cincinKering: '', satuan: 0.01, arloji0: '', arah: 'naik', drainase: 'dua', caraCc: 'terakhir', LL: '' } },
    hitung: function (m) {
      var p = m.param;
      return H.hitung({ Gs: p.Gs, H0: p.H0, diameter: p.diameter, cincin: p.cincin, cincinBasah: p.cincinBasah, caraWk: p.caraWk, cincinKering: p.cincinKering,
        satuan: p.satuan, arloji0: p.arloji0, arah: p.arah, drainase: p.drainase, caraCc: p.caraCc, LL: p.LL,
        tahap: m.tabel.tahap, bacaan: m.tabel.bacaan, cawanSebelum: m.tabel.cawanSebelum, cawanSesudah: m.tabel.cawanSesudah });
    },
    hasil: function (m, r) { return { e0: r.awal.e0, Cc: r.Cc, Cs: r.Cs, cv: r.cvRata }; },
    tampil: function (m, r, U) {
      var p = m.param, h = '', T = r.tahap, a = r.awal, arah = p.arah === 'turun' ? -1 : 1, dua = p.drainase !== 'satu';
      var kartu = [U.kartu('Angka pori awal', f(a.e0, 3), 'e<sub>0</sub>' + (a.Sr ? '; S = ' + f(a.Sr, 2) + '%' : ''))];
      if (r.Cc !== undefined) kartu.push(U.kartu('Indeks kompresi', f(r.Cc, 3), 'C<sub>c</sub>, tahap ' + r.tahapCc.nama + (r.CcKorelasi ? '; korelasi LL: ' + f(r.CcKorelasi, 3) : '')));
      if (r.Cs !== undefined) kartu.push(U.kartu('Indeks pengembangan', f(r.Cs, 3), 'C<sub>s</sub>; C<sub>s</sub>/C<sub>c</sub> = ' + (r.Cc ? f(r.Cs / r.Cc, 2) : '–')));
      if (r.cvRata) kartu.push(U.kartu('Koefisien konsolidasi', f(r.cvRata * 1000, 3) + ' <small>×10⁻³ cm²/s</small>', 'rata-rata tahap pembebanan; ' + f(r.cvRata * 1e-4 * 365.25 * 86400, 2) + ' m²/tahun'));
      h += U.ringkasan(kartu);

      // Form "Sebelum percobaan"
      var rumusWk = a.caraWk === 'cawan' ? 'W<sub>b</sub> / (1 + w<sub>0</sub>)' : '(tanah kering + ring) − W<sub>c</sub>';
      h += '<h3>Tabel sebelum percobaan (urutan form lab)</h3>' + U.tabel(['Uraian', 'Simbol', 'Satuan', 'Nilai'], [
        ['Berat spesifik tanah', 'G<sub>s</sub>', '–', f(p.Gs, 3)], ['Berat cincin', 'W<sub>c</sub>', 'gram', f(p.cincin, 3)],
        ['Diameter cincin', 'D', 'cm', f(p.diameter, 3)], ['Tinggi cincin', 'H<sub>0</sub>', 'cm', f(p.H0, 3)],
        ['Luas cincin', 'A = ¼ π D²', 'cm²', f(a.A, 3)], ['Volume cincin', 'V = A × H<sub>0</sub>', 'cm³', f(a.V, 3)],
        ['Berat cincin + tanah basah', 'W<sub>4</sub>', 'gram', f(p.cincinBasah, 3)], ['Berat tanah basah', 'W<sub>b</sub> = W<sub>4</sub> − W<sub>c</sub>', 'gram', f(a.Wb, 3)],
        ['Berat tanah kering', 'W<sub>k</sub> = ' + rumusWk, 'gram', f(a.Ws, 3)], ['Berat volume kering', 'γ<sub>d</sub> = W<sub>k</sub> / V', 'gram/cm³', f(a.gammaD, 3)],
        ['Tinggi bagian padat', 'H<sub>s</sub> = W<sub>k</sub> / (G<sub>s</sub> × A)', 'cm', f(a.Hs, 4)], ['Angka pori', 'e<sub>0</sub> = (H<sub>0</sub> − H<sub>s</sub>) / H<sub>s</sub>', '–', f(a.e0, 4)],
        ['Derajat kejenuhan', 'S = w<sub>0</sub> × G<sub>s</sub> / e<sub>0</sub>', '%', f(a.Sr, 2)]]);
      // Form "Penentuan kadar air dan berat isi" (kolom sebelum)
      h += '<h3>Penentuan kadar air dan berat isi (sebelum)</h3>' + U.tabel(['Uraian', 'Simbol', 'Satuan', 'Nilai'], [
        ['Massa tanah basah + ring', 'W<sub>4</sub>', 'gram', f(p.cincinBasah, 3)], ['Massa ring', 'W<sub>c</sub>', 'gram', f(p.cincin, 3)],
        ['Massa tanah basah', 'W<sub>b</sub>', 'gram', f(a.Wb, 3)], ['Massa tanah kering + ring', 'W<sub>k</sub> + W<sub>c</sub>', 'gram', f(a.Ws + p.cincin, 3)],
        ['Massa tanah kering', 'W<sub>k</sub>', 'gram', f(a.Ws, 3)], ['Massa air', 'W<sub>b</sub> − W<sub>k</sub>', 'gram', f(a.air, 3)],
        ['Kadar air', 'w<sub>0</sub>', '%', f(a.w, 2)], ['Berat isi', 'γ = W<sub>b</sub> / V', 'gram/cm³', f(a.gamma, 3)]]);
      var cS = a.cawanSebelum.cawan || [], cA = a.cawanSesudah.cawan || [], semua = cS.map(function (c) { return ['Sebelum ' + c.nama, c]; }).concat(cA.map(function (c) { return ['Sesudah ' + c.nama, c]; }));
      if (semua.length) {
        var kol = function (fn, d) { return semua.map(function (x) { return f(fn(x[1]), d); }); };
        h += '<h3>Kadar air cawan</h3>' + U.tabel(['Uraian', 'Simbol', 'Satuan'].concat(semua.map(function (x) { return x[0]; })), [
          ['Berat cawan + tanah basah', 'W<sub>1</sub>', 'gram'].concat(kol(function (c) { return c.W1; }, 3)),
          ['Berat cawan + tanah kering', 'W<sub>2</sub>', 'gram'].concat(kol(function (c) { return c.W2; }, 3)),
          ['Berat cawan', 'W<sub>3</sub>', 'gram'].concat(kol(function (c) { return c.W3; }, 3)),
          ['Berat tanah kering', 'W<sub>2</sub> − W<sub>3</sub>', 'gram'].concat(kol(function (c) { return c.kering; }, 3)),
          ['Kadar air', '(W<sub>1</sub> − W<sub>2</sub>) / (W<sub>2</sub> − W<sub>3</sub>) × 100%', '%'].concat(kol(function (c) { return c.w; }, 2)),
          ['Kadar air rata-rata', '', '%'].concat(semua.map(function (x, i) {
            var g = x[0].indexOf('Sebelum') === 0 ? a.cawanSebelum : a.cawanSesudah, pertama = x[0].indexOf('Sebelum') === 0 ? i === 0 : i === cS.length;
            return pertama ? f(g.w, 2) : '';
          }))]);
      }

      h += U.grafik(kurvaE(r), 'Kurva angka pori terhadap log tegangan. Garis putus-putus: pelepasan beban.');
      var akar = T.filter(function (t) { return t.muat && t.kolom.length >= 5; });
      if (akar.length) {
        h += '<div class="kisi-grafik">' + akar.map(function (t) {
          return U.grafik(kurvaAkar(t, p.satuan, arah), 'Tahap ' + t.nama + ' (p = ' + f(t.p, 3) + ' kg/cm²). Garis penuh: bagian lurus awal; putus-putus: absis 1,15 kali. ' +
            (t.caraT90 === 'manual' ? 't<sub>90</sub> diisi manual.' : t.taylor && t.taylor.t90 ? 'Perpotongan memberi t<sub>90</sub>.' : 't<sub>90</sub> tidak ditemukan.'));
        }).join('') + '</div>';
      }

      // Form tabel hasil: satu baris awal (tegangan 0) lalu satu baris per tahap.
      h += '<h3>Tabel hasil tiap tahap (urutan form lab)</h3>' + U.tabel([{ teks: 'Tahap' }, { teks: 'Beban (kg)', angka: true }, 'Tegangan p (kg/cm²)', 'Bacaan akhir arloji (divisi)', 'Perubahan tebal Δh (cm)',
        'Δe = Δh/H<sub>s</sub>', 'e = e<sub>0</sub> − Δe', 'C<sub>c</sub> / C<sub>s</sub>', 'Tebal akhir h = H<sub>0</sub> − Δh (cm)', 'Tebal rata-rata d = (h₁ + h₂)/2 (cm)',
        't<sub>90</sub><sup>½</sup> (√menit)', 't<sub>90</sub> (menit)', 't<sub>90</sub> (detik)', 'H<sub>dr</sub> (cm)', 'c<sub>v</sub> (cm²/s)', 'm<sub>v</sub> (cm²/kg)', 'k (cm/s)'],
        [['0', '–', f(0, 3), f(p.arloji0, 2), f(0, 4), f(0, 4), f(a.e0, 4), '–', f(p.H0, 4), '–', '–', '–', '–', '–', '–', '–', '–']].concat(T.map(function (t) {
          return [t.nama + (t.muat ? '' : ' ↑'), t.beban ? f(t.beban, 2) : '–', f(t.p, 4) + (t.pDariBeban ? '' : '*'), f(t.akhir, 2), f(t.dH, 4), f(t.de, 4), f(t.e, 4),
            t.Cc !== undefined ? f(t.Cc, 4) : t.Cs !== undefined ? f(t.Cs, 4) : '–', f(t.H, 4), f(t.Havg, 4),
            t.t90 ? f(Math.sqrt(t.t90), 3) : '–', t.t90 ? f(t.t90, 4) + (t.caraT90 === 'manual' ? '†' : '') : '–', t.t90 ? f(t.t90 * 60, 2) : '–',
            t.cv ? f(t.Hdr, 4) : '–', eks(t.cv, 3), t.mv !== undefined ? f(t.mv, 4) : '–', eks(t.k, 2)];
        })), null, { angkaMulai: 1 });
      h += '<p class="kecil redup">↑ = tahap pelepasan beban (kolom C<sub>c</sub> berisi C<sub>s</sub>). * = tekanan diisi langsung. † = t<sub>90</sub> diisi manual. H<sub>dr</sub> = ' +
        (dua ? 'd/2, setengah tebal rata-rata (drainase dua arah).' : 'd, tebal rata-rata (drainase satu arah).') + ' Kolom setelah c<sub>v</sub> tidak ada di form lab.</p>';

      // Langkah hitungan mengikuti "Pengolahan data" contoh laporan.
      var t1 = T[1] && T[1].muat ? T[1] : T[0], n = 0;
      function no() { n += 1; return n; }
      h += '<h3>Langkah hitungan</h3>';
      h += U.langkah('1) Angka pori dan derajat kejenuhan',
        U.rumus('A = \\tfrac{1}{4}\\pi D^2 = \\tfrac{1}{4}\\pi\\times' + U.t(p.diameter, 2) + '^2 = ' + U.t(a.A, 3) + '\\ \\text{cm}^2') + U.rumus('V = A\\,H_0 = ' + U.t(a.A, 3) + '\\times' + U.t(p.H0, 2) + ' = ' + U.t(a.V, 3) + '\\ \\text{cm}^3 \\qquad (' + no() + ')') +
        U.rumus('W_b = W_4 - W_c = ' + U.t(p.cincinBasah, 3) + ' - ' + U.t(p.cincin, 3) + ' = ' + U.t(a.Wb, 3) + '\\ \\text{gram} \\qquad (' + no() + ')') +
        (a.caraWk === 'cawan' ? U.rumus('W_k = \\dfrac{W_b}{1 + w_0} = \\dfrac{' + U.t(a.Wb, 3) + '}{1 + ' + U.t(a.cawanSebelum.w / 100, 4) + '} = ' + U.t(a.Ws, 3) + '\\ \\text{gram} \\qquad (' + no() + ')')
          : U.rumus('W_k = (W_k + W_c) - W_c = ' + U.t(a.Ws + p.cincin, 3) + ' - ' + U.t(p.cincin, 3) + ' = ' + U.t(a.Ws, 3) + '\\ \\text{gram} \\qquad (' + no() + ')')) +
        U.rumus('\\gamma_d = \\dfrac{W_k}{V} = \\dfrac{' + U.t(a.Ws, 3) + '}{' + U.t(a.V, 3) + '} = ' + U.t(a.gammaD, 3) + '\\ \\text{g/cm}^3 \\qquad (' + no() + ')') +
        U.rumus('H_s = \\dfrac{W_k}{G_s\\times A} = \\dfrac{' + U.t(a.Ws, 3) + '}{' + U.t(p.Gs, 3) + '\\times' + U.t(a.A, 3) + '} = ' + U.t(a.Hs, 4) + '\\ \\text{cm} \\qquad (' + no() + ')') +
        U.rumus('e_0 = \\dfrac{H_0 - H_s}{H_s} = \\dfrac{' + U.t(p.H0, 3) + ' - ' + U.t(a.Hs, 4) + '}{' + U.t(a.Hs, 4) + '} = ' + U.t(a.e0, 4) + ' \\qquad (' + no() + ')') +
        (a.w !== undefined ? U.rumus('w_0 = \\dfrac{W_b - W_k}{W_k}\\times100\\% = \\dfrac{' + U.t(a.air, 3) + '}{' + U.t(a.Ws, 3) + '}\\times100\\% = ' + U.t(a.w, 2) + '\\%') + U.rumus('S = \\dfrac{w_0\\,G_s}{e_0} = \\dfrac{' + U.t(a.w / 100, 4) + '\\times' + U.t(p.Gs, 3) + '}{' + U.t(a.e0, 4) + '} = ' + U.t(a.Sr, 2) + '\\% \\qquad (' + no() + ')') : '') +
        '<p class="ket">ρ<sub>w</sub> = 1 g/cm³, jadi H<sub>s</sub> adalah tinggi butir padat bila dipadatkan tanpa pori. w<sub>0</sub> di S ditulis sebagai pecahan (persen dibagi 100).</p>');
      var c1 = semua[0];
      if (c1) {
        var c = c1[1];
        h += U.langkah('2) Kadar air (cawan ' + c1[0].toLowerCase() + ')', U.rumus('W_2 - W_3 = ' + U.t(c.W2, 3) + ' - ' + U.t(c.W3, 3) + ' = ' + U.t(c.kering, 3) + '\\ \\text{gram}') + U.rumus('W_1 - W_2 = ' + U.t(c.W1, 3) + ' - ' + U.t(c.W2, 3) + ' = ' + U.t(c.air, 3) + '\\ \\text{gram} \\qquad (' + no() + ')') +
          U.rumus('w = \\dfrac{W_1 - W_2}{W_2 - W_3}\\times100\\% = \\dfrac{' + U.t(c.air, 3) + '}{' + U.t(c.kering, 3) + '}\\times100\\% = ' + U.t(c.w, 2) + '\\% \\qquad (' + no() + ')'));
      }
      var k = c1 ? 3 : 2;
      h += U.langkah(k + ') Uji konsolidasi tahap ' + t1.nama,
        (t1.pDariBeban ? U.rumus('p = \\dfrac{\\text{beban}}{A} = \\dfrac{' + U.t(t1.beban, 2) + '}{' + U.t(a.A, 3) + '} = ' + U.t(t1.p, 4) + '\\ \\text{kg/cm}^2 \\qquad (' + no() + ')') : '<p class="ket">Tekanan diisi langsung: p = ' + f(t1.p, 4) + ' kg/cm².</p>') +
        U.rumus('\\Delta H = (d - d_0)\\times\\text{satuan} = (' + U.t(t1.akhir, 2) + ' - ' + U.t(p.arloji0, 2) + ')\\times' + U.t(p.satuan, 3) + '\\ \\text{mm} = ' + U.t(t1.dH, 4) + '\\ \\text{cm} \\qquad (' + no() + ')') +
        U.rumus('\\Delta e = \\dfrac{\\Delta H}{H_s} = \\dfrac{' + U.t(t1.dH, 4) + '}{' + U.t(a.Hs, 4) + '} = ' + U.t(t1.de, 4) + '') + U.rumus('e = e_0 - \\Delta e = ' + U.t(a.e0, 4) + ' - ' + U.t(t1.de, 4) + ' = ' + U.t(t1.e, 4) + ' \\qquad (' + no() + ')') +
        (t1.Cc !== undefined ? U.rumus('C_c = \\dfrac{e_1 - e_2}{\\log (p_2/p_1)} = \\dfrac{' + U.t(t1.eAwal, 4) + ' - ' + U.t(t1.e, 4) + '}{\\log (' + U.t(t1.p, 4) + '/' + U.t(t1.pAwal, 4) + ')} = ' + U.t(t1.Cc, 4) + ' \\qquad (' + no() + ')') : '') +
        U.rumus('h = H_0 - \\Delta H = ' + U.t(p.H0, 3) + ' - ' + U.t(t1.dH, 4) + ' = ' + U.t(t1.H, 4) + '\\ \\text{cm}') + U.rumus('d = \\dfrac{h_1 + h_2}{2} = \\dfrac{' + U.t(t1.Hawal, 4) + ' + ' + U.t(t1.H, 4) + '}{2} = ' + U.t(t1.Havg, 4) + '\\ \\text{cm} \\qquad (' + no() + ')') +
        (t1.t90 ? U.rumus('t_{90} = (\\sqrt{t_{90}})^2 = ' + U.t(Math.sqrt(t1.t90), 3) + '^2 = ' + U.t(t1.t90, 4) + '\\ \\text{menit} = ' + U.t(t1.t90 * 60, 2) + '\\ \\text{detik} \\qquad (' + no() + ')') +
          U.rumus('H_{dr} = ' + (dua ? '\\dfrac{d}{2} = ' : 'd = ') + U.t(t1.Hdr, 4) + '\\ \\text{cm}') + U.rumus('c_v = \\dfrac{0{,}848\\,H_{dr}^2}{t_{90}} = \\dfrac{0{,}848\\times' + U.t(t1.Hdr, 4) + '^2}{' + U.t(t1.t90 * 60, 2) + '} = ' + U.t(t1.cv * 1000, 4) + '\\times10^{-3}\\ \\text{cm}^2/\\text{s} \\qquad (' + no() + ')') +
          '<p class="ket">T<sub>v</sub> = 0,848 untuk derajat konsolidasi 90% (Taylor). H<sub>dr</sub> adalah panjang lintasan drainase: setengah tebal rata-rata bila air keluar ke atas dan ke bawah.</p>' : '') +
        (t1.mv && t1.k ? U.rumus('m_v = \\dfrac{e_1 - e_2}{(1 + e_1)(p_2 - p_1)} = ' + U.t(t1.mv, 4) + '\\ \\text{cm}^2/\\text{kg}') + U.rumus('k = c_v\\,m_v\\,\\gamma_w = ' + U.t(t1.k * 1e7, 3) + '\\times10^{-7}\\ \\text{cm/s} \\qquad (' + no() + ')') : ''));
      if (r.Cs !== undefined) {
        h += U.langkah((k + 1) + ') Indeks pengembangan', U.rumus('C_s = \\dfrac{e_{\\text{akhir}} - e_{\\text{maks}}}{\\log p_{\\text{maks}} - \\log p_{\\text{akhir}}} = \\dfrac{' + U.t(r.tahapCs[1].e, 4) + ' - ' + U.t(r.tahapCs[0].e, 4) + '}{\\log ' + U.t(r.tahapCs[0].p, 4) + ' - \\log ' + U.t(r.tahapCs[1].p, 4) + '} = ' + U.t(r.Cs, 4) + ' \\qquad (' + no() + ')'));
      }
      if (r.CcKorelasi) h += '<p class="ket">Pembanding: C<sub>c</sub> = 0,009 (LL − 10) = 0,009 × (' + f(p.LL, 2) + ' − 10) = ' + f(r.CcKorelasi, 3) + ' (Terzaghi &amp; Peck, 1967), berlaku untuk lempung terkonsolidasi normal dengan kepekaan rendah.</p>';
      h += '<p class="kecil redup">Tegangan prakonsolidasi (metode Casagrande) dibaca dari kurva e–log p dan butuh cukup banyak tahap pembebanan; tidak dihitung otomatis di sini.</p>';

      if (m.contoh) {
        h += beda([
          'Luas cincin: contoh menulis A = 7,8657 cm² (hlm 140; form sebelum percobaan 7,066), yang sama dengan ¼ × 3,14 × 5,01 × 2, bukan ¼ π D². Dengan D = 5,01 cm, A = ' + f(a.A, 3) + ' cm² dan V = ' + f(a.V, 3) + ' cm³ (contoh 11,012). Karena luas terlalu kecil, contoh mendapat γ<sub>d</sub> = 3,201 g/cm³ (lebih besar dari G<sub>s</sub>) dan H<sub>s</sub> = 1,673 cm, lebih tinggi dari cincin 1,4 cm. Alat: γ<sub>d</sub> = ' + f(a.gammaD, 3) + ' g/cm³, H<sub>s</sub> = ' + f(a.Hs, 4) + ' cm, e<sub>0</sub> = ' + f(a.e0, 4) + '.',
          'Angka pori: (1,4 − 1,673)/1,673 = −0,163, tetapi contoh menulis 0,1634 (tanda minus hilang). Angka pori tiap tahap di contoh (0,096; 0,174; 0,598; 0,598; 0,576) juga kehilangan tanda minus.',
          'Derajat kejenuhan: contoh 645,25 memakai w<sub>0</sub> = 39,38 dalam persen tanpa dibagi 100 dan e<sub>0</sub> yang keliru. Alat: S = ' + f(a.Sr, 2) + '%.',
          'Form penentuan kadar air dan berat isi di contoh menulis kadar air 13,853 dan berat isi 11,012 (angka volume). Dari massa air 13,883 g dan massa tanah kering 35,252 g, w<sub>0</sub> = ' + f(a.w, 2) + '%; berat isi = ' + f(a.gamma, 3) + ' g/cm³.',
          'Kadar air cawan sesudah percobaan: contoh 13,8528% = 3,2/23,1 (dibagi berat cawan + tanah kering). Seharusnya 3,2/11,9 × 100% = ' + (cA[0] ? f(cA[0].w, 2) : '26,89') + '%.',
          'Tegangan: contoh membagi beban dengan luas 7,8657 cm² (0,127; 0,381; 0,890 kg/cm²; form pembacaan arloji menulis 0,301 untuk 3 kg). Dengan luas yang benar p = beban/A = ' + T.slice(0, 3).map(function (t) { return f(t.p, 3); }).join('; ') + ' kg/cm². Perbandingan p<sub>2</sub>/p<sub>1</sub> tetap 3 dan 2,33, jadi C<sub>c</sub> tidak terpengaruh. Bila alat lab memakai lengan beban, isi tekanan langsung.',
          'Satuan arloji tidak tertulis di contoh. Contoh membagi bacaan dengan 100 untuk mendapat Δh dalam cm (31,24 → 0,3124 cm), setara 0,1 mm/divisi; data contoh dimuat dengan satuan itu supaya Δh, h, dan d sama dengan contoh. Hasilnya tidak wajar: tahap 3 memampat 0,9164 cm dari 1,4 cm (65%) dan angka porinya negatif (peringatan kuning). Bila arloji lab 0,01 mm/divisi, ganti satuan arloji: Δh sepuluh kali lebih kecil dan semua angka pori positif.',
          'Δe di contoh = 0,831035 × Δh, dengan 0,831035 = (1 + 0,1634)/1,4 dari H<sub>s</sub> yang keliru, sehingga C<sub>c</sub> contoh (0,1637 dan 1,1518) berbeda dari alat; di tabel contoh nilai C<sub>c</sub> juga tergeser satu baris ke atas. Alat memakai Δe = Δh/H<sub>s</sub> seperti rumus di kepala kolom form.',
          'Tebal akhir tahap 4 di contoh 0,2184 cm; seharusnya 1,4 − 0,9164 = 0,4836 cm (kolom d contoh 0,484 sudah memakai angka yang benar).',
          't<sub>90</sub>: kolom √t<sub>90</sub> contoh tahap 3 dan 4 (0,25 dan 0,6) tidak cocok dengan kolom t<sub>90</sub> (0,36 dan 0,25 menit). Alat memakai kolom t<sub>90</sub> menit dan detik, yang saling cocok.',
          'Koefisien konsolidasi: contoh menghitung c<sub>v</sub> = 0,848 d²/t<sub>90</sub> dengan d = tebal rata-rata penuh (0,350; 0,245; 0,021; 0,013; 0,014 cm²/s; langkah hlm 142 menulis 5,01 tetapi hasilnya memakai d = 1,041). Alat memakai H<sub>dr</sub> = d/2 untuk drainase dua arah, sehingga c<sub>v</sub> seperempat nilai contoh. Pilih "Drainase satu arah" untuk mendapatkan angka contoh.',
          'Bacaan 0 detik: tahap 1 tertulis 6, tahap 2–5 tertulis 0, padahal bacaan arloji bersambung antartahap. Dimuat apa adanya; metode Taylor hanya memakai t &gt; 0, dan t<sub>90</sub> diisi dari contoh.',
          'NIM: contoh hanya menambah 0,34 ke bacaan 24 jam (31,24; 40,64; 91,64; 91,64; 88,94). Alat menambah NIM ke semua bacaan arloji di tabel.']);
      }
      h += belajar('Menentukan sifat pemampatan tanah di bawah beban bertahap: angka pori pada tiap tegangan (kurva e–log p), indeks kompresi C<sub>c</sub>, indeks pengembangan C<sub>s</sub>, dan koefisien konsolidasi c<sub>v</sub> (SNI 2812:2011).',
        ['Hitung luas dan volume cincin dari diameter dan tinggi cincin.',
          'Hitung berat tanah basah, berat tanah kering, berat volume kering, tinggi bagian padat H<sub>s</sub>, angka pori awal e<sub>0</sub>, dan derajat kejenuhan.',
          'Hitung kadar air dari cawan (sebelum dan sesudah percobaan).',
          'Untuk tiap tahap: tegangan, perubahan tebal Δh dari bacaan arloji akhir, Δe = Δh/H<sub>s</sub>, e = e<sub>0</sub> − Δe, C<sub>c</sub>, tebal akhir h, dan tebal rata-rata d.',
          'Baca t<sub>90</sub> dari grafik bacaan arloji terhadap √t (metode Taylor), lalu hitung c<sub>v</sub> = 0,848 H<sub>dr</sub>²/t<sub>90</sub>.',
          'Gambar kurva e–log p dari semua tahap.'],
        'C<sub>c</sub> dan e<sub>0</sub> dipakai menghitung besar penurunan konsolidasi lempung terkonsolidasi normal, sedangkan c<sub>v</sub> dipakai memperkirakan lama penurunan (Das).');
      return h;
    },
    ekspor: function (m, r) {
      var a = r.awal, b = [['Luas cincin A', 'cm2', a.A], ['Volume cincin V', 'cm3', a.V], ['Berat tanah basah Wb', 'gram', a.Wb === undefined ? '' : a.Wb], ['Berat tanah kering Wk', 'gram', a.Ws],
        ['Kadar air w0', '%', a.w === undefined ? '' : a.w], ['Berat volume kering', 'g/cm3', a.gammaD], ['Tinggi bagian padat Hs', 'cm', a.Hs], ['Angka pori awal e0', '-', a.e0],
        ['Derajat kejenuhan S', '%', a.Sr === undefined ? '' : a.Sr], [],
        ['Tahap', 'Beban (kg)', 'p (kg/cm2)', 'Arloji akhir', 'dh (cm)', 'de', 'e', 'Cc/Cs', 'h (cm)', 'd (cm)', 't90 (menit)', 't90 (detik)', 'Hdr (cm)', 'cv (cm2/s)', 'mv (cm2/kg)', 'k (cm/s)']];
      r.tahap.forEach(function (t) {
        b.push([t.nama, t.beban || '', t.p, t.akhir, t.dH, t.de, t.e, t.Cc !== undefined ? t.Cc : t.Cs !== undefined ? t.Cs : '', t.H, t.Havg, t.t90 || '', t.t90 ? t.t90 * 60 : '',
          t.cv ? t.Hdr : '', t.cv || '', t.mv === undefined ? '' : t.mv, t.k || '']);
      });
      b.push([], ['Cc', '-', r.Cc === undefined ? '' : r.Cc], ['Cs', '-', r.Cs === undefined ? '' : r.Cs], ['cv rata-rata', 'cm2/s', r.cvRata || '']);
      return b;
    },
    sumber: ['Badan Standardisasi Nasional. SNI 2812:2011, uji konsolidasi tanah satu dimensi.',
      'Badan Standardisasi Nasional. SNI 1965:2008 <em>Cara uji penentuan kadar air untuk tanah dan batuan di laboratorium</em>. Kadar air cawan.',
      'Taylor, D. W. (1948). <em>Fundamentals of soil mechanics</em>. John Wiley &amp; Sons. Metode akar waktu.',
      'Terzaghi, K., &amp; Peck, R. B. (1967). <em>Soil mechanics in engineering practice</em> (2nd ed.). John Wiley &amp; Sons. Korelasi C<sub>c</sub> = 0,009 (LL − 10).',
      'Das, B. M. <em>Principles of geotechnical engineering</em>. Cengage Learning. Kurva e–log p, m<sub>v</sub>, dan c<sub>v</sub>.',
      'Form uji konsolidasi (penentuan kadar air dan berat isi, sebelum percobaan, tabel hasil), Laboratorium Mekanika Tanah, Teknik Sipil Universitas Jambi. Data contoh dari contoh laporan praktikum (Consolidation Test).']
  });
})();
