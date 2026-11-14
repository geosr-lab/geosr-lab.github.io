/*
 * Analisis saringan (SNI 3423:2008) dan besaran kurva gradasi.
 *
 * % tertahan kumulatif = Σ berat tertahan / berat kering total × 100
 * % lolos = 100 − % tertahan kumulatif
 * D10, D30, D60: interpolasi linier % lolos terhadap log ukuran butir.
 * Cu = D60 / D10,  Cc = D30² / (D10 · D60)
 * Batas fraksi (SNI 6371:2015 / ASTM D2487): kerikil > 4,75 mm; pasir 4,75–0,075 mm; halus < 0,075 mm.
 * Seperti form lab UNJA: baris PAN ikut dijumlahkan (jumlah tertahan = berat kering bila tidak ada yang hilang),
 * dan D10, D30, D60 boleh diisi dari bacaan grafik gradasi; bila diisi, Cu dan Cc memakai bacaan itu.
 */
(function (root) {
  'use strict';

  // Ukuran lubang saringan standar (mm), ASTM E11.
  var SARINGAN = [
    ['3"', 75], ['2"', 50.8], ['1½"', 38.1], ['1"', 25.4], ['¾"', 19.0], ['½"', 12.5], ['⅜"', 9.5],
    ['No. 4', 4.75], ['No. 8', 2.36], ['No. 10', 2.0], ['No. 16', 1.18], ['No. 20', 0.85], ['No. 30', 0.6],
    ['No. 40', 0.425], ['No. 50', 0.3], ['No. 60', 0.25], ['No. 100', 0.15], ['No. 140', 0.106], ['No. 200', 0.075]
  ].map(function (s) { return { nama: s[0], mm: s[1] }; });

  function ukuran(nama) {
    var s = SARINGAN.filter(function (x) { return x.nama === nama; })[0];
    return s ? s.mm : NaN;
  }

  // Ukuran butir untuk % lolos p, dari titik-titik (mm, % lolos) yang diurutkan dari besar ke kecil.
  function diameter(titik, p) {
    for (var i = 0; i < titik.length - 1; i++) {
      var a = titik[i], b = titik[i + 1];
      if ((a.lolos >= p && b.lolos <= p) && a.lolos !== b.lolos) {
        var la = Math.log10(a.mm), lb = Math.log10(b.mm);
        return Math.pow(10, lb + (p - b.lolos) * (la - lb) / (a.lolos - b.lolos));
      }
    }
    return null; // di luar rentang data
  }

  // % lolos pada ukuran d (mm), interpolasi pada log d.
  function lolosPada(titik, d) {
    for (var i = 0; i < titik.length; i++) if (Math.abs(titik[i].mm - d) < 1e-9) return titik[i].lolos;
    for (var j = 0; j < titik.length - 1; j++) {
      var a = titik[j], b = titik[j + 1];
      if (a.mm > d && b.mm < d) {
        return b.lolos + (Math.log10(d) - Math.log10(b.mm)) * (a.lolos - b.lolos) / (Math.log10(a.mm) - Math.log10(b.mm));
      }
    }
    return null;
  }

  function hitung(m) {
    var galat = [], peringatan = [];
    if (!(m.beratTotal > 0)) galat.push('Berat kering total harus lebih dari 0.');
    // Baris PAN (seperti form lab) menggantikan isian m.pan.
    var barisPan = m.ayakan.filter(function (a) { return a.nama === 'PAN' && isFinite(a.tertahan); })[0];
    var ayakan = m.ayakan.filter(function (a) { return a.nama !== 'PAN' && isFinite(a.tertahan); })
      .map(function (a) { return Object.assign({}, a, { mm: ukuran(a.nama) }); })
      .sort(function (a, b) { return b.mm - a.mm; });
    ayakan.forEach(function (a) {
      if (!(a.tertahan >= 0)) galat.push('Berat tertahan saringan ' + a.nama + ' tidak boleh negatif.');
      if (!isFinite(a.mm)) galat.push('Ukuran saringan ' + a.nama + ' tidak dikenal.');
    });
    if (ayakan.length < 2) galat.push('Isi berat tertahan minimal dua saringan.');
    if (galat.length) return { galat: galat };

    var kum = 0;
    ayakan.forEach(function (a) {
      kum += a.tertahan;
      a.kumulatif = kum;
      a.persenTertahan = kum / m.beratTotal * 100;
      a.lolos = 100 - a.persenTertahan;
    });
    var pan = barisPan ? barisPan.tertahan : m.pan >= 0 ? m.pan : 0;
    if (!(pan >= 0)) { galat.push('Berat tertahan PAN tidak boleh negatif.'); return { galat: galat }; }
    var jumlah = kum + pan;
    var hilang = (m.beratTotal - jumlah) / m.beratTotal * 100;
    if (Math.abs(hilang) > 1) {
      peringatan.push('Jumlah berat tertahan termasuk pan berbeda ' + Math.abs(hilang).toFixed(2).replace('.', ',') +
        '% dari berat kering total. Periksa penimbangan (selisih yang wajar biasanya di bawah 1%).');
    }
    if (ayakan.some(function (a) { return a.lolos < -1e-9; })) {
      galat.push('Jumlah berat tertahan melebihi berat kering total.');
      return { galat: galat };
    }

    // Titik kurva: saringan terbesar dianggap 100% lolos bila belum ada titik di atasnya.
    var titik = ayakan.map(function (a) { return { mm: a.mm, lolos: a.lolos }; });
    var atas = SARINGAN.filter(function (s) { return s.mm > ayakan[0].mm; }).pop();
    if (atas && ayakan[0].tertahan > 0) titik.unshift({ mm: atas.mm, lolos: 100 });

    var D10 = diameter(titik, 10), D30 = diameter(titik, 30), D60 = diameter(titik, 60);
    var hasil = { galat: [], peringatan: peringatan, ayakan: ayakan, titik: titik, pan: pan, adaBarisPan: !!barisPan, jumlah: jumlah, hilang: hilang,
      panPersen: jumlah / m.beratTotal * 100, D10: D10, D30: D30, D60: D60 };
    // D10, D30, D60 hasil baca grafik (seperti form lab) bila ketiganya diisi; selain itu hasil interpolasi.
    var baca = m.D10baca > 0 && m.D30baca > 0 && m.D60baca > 0;
    hasil.dariBaca = baca;
    hasil.Dpakai = baca ? { D10: m.D10baca, D30: m.D30baca, D60: m.D60baca } : { D10: D10, D30: D30, D60: D60 };
    var Dp = hasil.Dpakai;
    if (Dp.D10 && Dp.D60) hasil.Cu = Dp.D60 / Dp.D10;
    if (Dp.D10 && Dp.D30 && Dp.D60) hasil.Cc = Dp.D30 * Dp.D30 / (Dp.D10 * Dp.D60);
    if (!D10 && !baca) peringatan.push('D10 tidak dapat ditentukan dari data saringan (% lolos saringan terkecil di atas 10%). Butir halus perlu dianalisis dengan hidrometer.');
    if (baca) {
      [[10, m.D10baca], [30, m.D30baca], [60, m.D60baca]].forEach(function (d) {
        // Bacaan bertentangan dengan titik saringan: ada saringan lebih kecil dengan lolos > p, atau saringan lebih besar dengan lolos < p.
        var salah = titik.filter(function (t) { return (t.mm < d[1] && t.lolos > d[0] + 1e-9) || (t.mm > d[1] && t.lolos < d[0] - 1e-9); })[0];
        if (salah) peringatan.push('D' + d[0] + ' baca grafik = ' + String(d[1]).replace('.', ',') + ' mm tidak cocok dengan data: saringan ' +
          String(salah.mm).replace('.', ',') + ' mm meloloskan ' + salah.lolos.toFixed(2).replace('.', ',') + '%. Baca ulang grafiknya.');
      });
    }

    var l475 = lolosPada(titik, 4.75), l0075 = lolosPada(titik, 0.075);
    if (l475 !== null && l0075 !== null) {
      hasil.fraksi = { kerikil: 100 - l475, pasir: l475 - l0075, halus: l0075 };
    } else {
      peringatan.push('Fraksi kerikil/pasir/halus butuh data saringan No. 4 (4,75 mm) dan No. 200 (0,075 mm).');
    }
    return hasil;
  }

  var api = { SARINGAN: SARINGAN, ukuran: ukuran, diameter: diameter, lolosPada: lolosPada, hitung: hitung };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HitungSaringan = api;
})(this);
