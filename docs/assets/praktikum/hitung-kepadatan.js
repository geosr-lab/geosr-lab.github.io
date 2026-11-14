/*
 * Pemadatan di laboratorium (SNI 1742:2008 ringan, SNI 1743:2008 berat) dan
 * kepadatan lapangan dengan kerucut pasir (SNI 2828:2011).
 *
 * Pemadatan (urutan form lab UNJA dan contoh laporan):
 *   kadar air tiap cawan: w = (W1 − W2) / (W2 − W3) × 100%
 *   massa tanah basah = massa tanah basah + cetakan − massa cetakan
 *   γ = massa tanah basah / isi cetakan
 *   γd = γ × 100 / (100 + w)   (sama dengan γ / (1 + w/100))
 *   Garis rongga udara nol (ZAV): γzav = Gs·γw / (1 + w·Gs)
 *   w_opt dan γd maks dari kurva polinomial orde 2 atau 3 (dipilih pengguna) yang dicocokkan pada titik data.
 *
 * Kerucut pasir (urutan form lab UNJA):
 *   Kalibrasi alat: pasir dalam kerucut W6 = W4 − W5 (dipakai bila W6/W7 titik uji kosong)
 *   γ pasir = (W2 − W1) / (W3 − W1)            W1 tabung, W2 tabung + pasir, W3 tabung + air (γw = 1 g/cm³)
 *   Pasir dalam lubang = (W8 − W9) − (W6 − W7)
 *   V lubang = pasir dalam lubang / γ pasir
 *   w = (W13 − W14) / (W14 − W12);  Wd = (W11 − W10) / (1 + w);  γd = Wd / V
 *   Derajat kepadatan D = γd lapangan / γd maks laboratorium × 100%
 */
(function (root) {
  'use strict';

  var node = typeof module !== 'undefined' && module.exports;
  var D = node ? require('./hitung-dasar.js') : root.HitungDasar;

  function pemadatan(m) {
    var galat = [], peringatan = [];
    if (!(m.Gs > 1)) galat.push('Gs harus diisi (biasanya 2,6–2,8).');
    var perKolom = function (k) { return m.titik.length && m.titik.every(function (t) { return t[k] > 0; }); };
    if (!(m.V > 0) && !perKolom('V')) galat.push('Isi cetakan harus lebih dari 0.');
    if (!(m.Mcetakan > 0) && !perKolom('Mcetakan')) galat.push('Massa cetakan harus lebih dari 0.');
    var gw = m.gammaW > 0 ? m.gammaW : 1;
    var titik = m.titik.map(function (t) {
      var k = D.kadarAir(t.W1, t.W2, t.W3);
      // Massa dan isi cetakan boleh diisi per kolom seperti form; bila kosong memakai nilai umum.
      var Mc = t.Mcetakan > 0 ? t.Mcetakan : m.Mcetakan, V = t.V > 0 ? t.V : m.V;
      var basah = t.Mtotal - Mc;
      if (!(basah > 0)) galat.push('Titik ' + t.nama + ': massa tanah basah + cetakan harus lebih besar dari massa cetakan.');
      if (!(t.W2 > t.W3)) galat.push('Titik ' + t.nama + ': W2 harus lebih besar dari W3 (cawan).');
      if (!(t.W1 >= t.W2)) galat.push('Titik ' + t.nama + ': massa tanah basah + cawan tidak boleh lebih kecil dari massa tanah kering + cawan.');
      var g = basah / V, gd = g * 100 / (100 + k.w);
      return Object.assign({}, t, k, { Mc: Mc, Vc: V, basah: basah, gamma: g, gammaD: gd, zav: m.Gs * gw / (1 + k.w / 100 * m.Gs) });
    });
    var orde = m.orde === 3 ? 3 : 2;
    if (titik.length < orde + 1) galat.push('Kurva orde ' + orde + ' membutuhkan minimal ' + (orde + 1) + ' titik data (disarankan 5 titik atau lebih).');
    if (galat.length) return { galat: galat };

    titik.sort(function (a, b) { return a.w - b.w; });
    var xs = titik.map(function (t) { return t.w; }), ys = titik.map(function (t) { return t.gammaD; });
    var kurva = D.regresiPolinomial(xs, ys, orde);
    var wmin = xs[0], wmaks = xs[xs.length - 1];
    // Cari puncak kurva di dalam rentang data: sampel rapat lalu perhalus dengan pencarian emas.
    var terbaik = wmin, n = 2000;
    for (var i = 0; i <= n; i++) {
      var w = wmin + (wmaks - wmin) * i / n;
      if (kurva.f(w) > kurva.f(terbaik)) terbaik = w;
    }
    var lo = Math.max(wmin, terbaik - (wmaks - wmin) / n), hi = Math.min(wmaks, terbaik + (wmaks - wmin) / n), r = (Math.sqrt(5) - 1) / 2;
    for (var j = 0; j < 60; j++) {
      var c = hi - r * (hi - lo), d = lo + r * (hi - lo);
      if (kurva.f(c) > kurva.f(d)) hi = d; else lo = c;
    }
    var wopt = (lo + hi) / 2, gdmaks = kurva.f(wopt);
    var tepi = (wopt - wmin) < 0.02 * (wmaks - wmin) || (wmaks - wopt) < 0.02 * (wmaks - wmin);
    if (tepi) peringatan.push('Puncak kurva berada di tepi rentang data. Titik data belum mengapit kadar air optimum; tambah titik di sisi ' + ((wopt - wmin) < (wmaks - wopt) ? 'kering' : 'basah') + '.');
    var terbanyak = titik.reduce(function (a, b) { return b.gammaD > a.gammaD ? b : a; });
    titik.forEach(function (t) {
      if (t.gammaD > t.zav * 1.001) peringatan.push('Titik ' + t.nama + ' berada di atas garis ZAV (derajat kejenuhan > 100%). Periksa Gs, isi cetakan, atau kadar air.');
    });
    if (kurva.r2 < 0.9) peringatan.push('Kurva orde ' + orde + ' kurang cocok dengan titik data (R² = ' + kurva.r2.toFixed(3).replace('.', ',') + ').');
    return { galat: [], peringatan: peringatan, titik: titik, orde: orde, kurva: kurva, wopt: wopt, gdmaks: gdmaks,
      titikTertinggi: terbanyak, gammaW: gw, tepi: tepi };
  }

  function sandCone(m) {
    var galat = [], peringatan = [];
    var k = m.kalibrasi;
    var gammaPasir = (k.W2 - k.W1) / (k.W3 - k.W1);
    if (!(k.W3 > k.W1 && k.W2 > k.W1)) galat.push('Kalibrasi pasir: W2 dan W3 harus lebih besar dari W1 (tabung kosong).');
    var alat = null;
    if (k.W4 > 0 && k.W5 > 0) {
      alat = { W4: k.W4, W5: k.W5, W6: k.W4 - k.W5 };
      if (!(alat.W6 > 0)) galat.push('Kalibrasi alat: W4 (pasir awal) harus lebih besar dari W5 (pasir akhir).');
    }
    var titik = m.titik.map(function (t) {
      // W6 dan W7 titik uji boleh kosong: dipakai hasil kalibrasi alat (W4, W5) seperti pada contoh laporan.
      var W6 = t.W6 !== null && t.W6 !== undefined ? t.W6 : (alat ? alat.W4 : null);
      var W7 = t.W7 !== null && t.W7 !== undefined ? t.W7 : (alat ? alat.W5 : null);
      if (W6 === null || W7 === null) galat.push('Titik ' + t.nama + ': isi W6 dan W7, atau isi kalibrasi alat W4 dan W5.');
      var kerucut = W6 - W7, total = t.W8 - t.W9, lubang = total - kerucut;
      if (!(kerucut > 0)) galat.push('Titik ' + t.nama + ': W6 harus lebih besar dari W7.');
      if (!(lubang > 0)) galat.push('Titik ' + t.nama + ': pasir dalam lubang harus positif, yaitu (W8 − W9) > (W6 − W7).');
      if (!(t.W11 > t.W10)) galat.push('Titik ' + t.nama + ': W11 harus lebih besar dari W10.');
      if (!(t.W14 > t.W12)) galat.push('Titik ' + t.nama + ': W14 harus lebih besar dari W12.');
      var w = (t.W13 - t.W14) / (t.W14 - t.W12);
      var Wt = t.W11 - t.W10, V = lubang / gammaPasir, Wd = Wt / (1 + w);
      return Object.assign({}, t, { W6: W6, W7: W7, kerucut: kerucut, total: total, lubang: lubang, V: V, Wt: Wt, w: w * 100, Wd: Wd,
        gamma: Wt / V, gammaD: Wd / V });
    });
    if (!titik.length) galat.push('Isi data minimal satu titik uji.');
    if (galat.length) return { galat: galat };
    var gd = D.rata(titik.map(function (t) { return t.gammaD; }));
    var hasil = { galat: [], peringatan: peringatan, gammaPasir: gammaPasir, alat: alat,
      kalibrasi: { air: k.W3 - k.W1, pasir: k.W2 - k.W1 }, titik: titik, gammaD: gd,
      w: D.rata(titik.map(function (t) { return t.w; })) };
    if (alat) titik.forEach(function (t) { if (Math.abs(t.kerucut - alat.W6) > 1e-9) peringatan.push('Titik ' + t.nama + ': pasir dalam kerucut (W6 − W7) berbeda dengan hasil kalibrasi alat (W4 − W5). Periksa data.'); });
    if (m.gammaLab > 0) {
      titik.forEach(function (t) { t.D = t.gammaD / m.gammaLab * 100; });
      hasil.D = gd / m.gammaLab * 100;
      if (m.syarat > 0) hasil.memenuhi = hasil.D >= m.syarat;
    } else {
      peringatan.push('Isi γd maks laboratorium (dari uji pemadatan) untuk menghitung derajat kepadatan.');
    }
    if (gammaPasir < 1.2 || gammaPasir > 1.8) peringatan.push('Berat isi pasir uji di luar kisaran umum pasir kalibrasi. Periksa data kalibrasi.');
    return hasil;
  }

  var api = { pemadatan: pemadatan, sandCone: sandCone };
  if (node) module.exports = api;
  else root.HitungKepadatan = api;
})(this);
