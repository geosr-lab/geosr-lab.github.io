/*
 * Kapasitas lateral ultimit tiang tunggal metode Broms (1964a, 1964b).
 * Sumber rumus: Reese, L. C. (1986). Behavior of piles and pile groups under lateral load,
 * FHWA-RD-85-106, Bab 7.1 "Broms Method", hlm. 141–155, pers. (7.1)–(7.26).
 *
 * Tanah kohesif (hlm. 141–148): reaksi tanah 9 cu b, nol pada 1,5b teratas (Gbr. 7.1).
 *   Bebas, pendek     : Mmax = P(e + 1,5b + 0,5f) = 2,25 cu b g², f = P/(9 cu b), L = 1,5b + f + g   (7.2)–(7.5)
 *   Bebas, panjang    : My = P(e + 1,5b + 0,5f)                                                       (7.3)
 *   Terjepit, pendek  : P = 9 cu b (L − 1,5b)                                                         (7.6)
 *   Terjepit, menengah: P(1,5b + 0,5f) − My = 2,25 cu b g², L = 1,5b + f + g, f = P/(9 cu b)          (7.7)–(7.10)
 *   Terjepit, panjang : P = 2My/(1,5b + 0,5f)                                                         (7.11)
 * Tanah nonkohesif (hlm. 149–155): reaksi tanah 3 γ b z Kp, Kp = tan²(45° + φ/2)                     (7.13)–(7.14)
 *   Bebas, pendek     : P = γ b L³ Kp / (2(e + L)); f = 0,816 (P/(γ b Kp))^0,5; Mmax = P(e + f) − P f/3 (7.16), (7.19), (7.20)
 *   Bebas, panjang    : P = My / (e + 0,544 (P/(γ b Kp))^0,5)                                         (7.21)
 *   Terjepit, pendek  : P = 1,5 γ L² b Kp                                                             (7.22)
 *   Terjepit, menengah: P = My/L + 0,5 γ b L² Kp                                                      (7.23)
 *   Terjepit, panjang : P = (My⁺ + My⁻) / (e + 0,544 (P/(γ b Kp))^0,5), My⁺ = My⁻ = My                (7.25)
 * Konstanta 0,816 dan 0,544 ditulis seperti di sumber. Pers. (7.25) memuat e seperti di sumber, sedangkan
 * rumus kepala terjepit di tanah kohesif tidak memuat e.
 * Pult = nilai terkecil dari moda yang berlaku; panjang peralihan antarmoda sama dengan contoh sumber.
 * Satuan konsisten: m, kN, kPa, kN/m³, kN·m (fungsi tidak bergantung satuan).
 */
(function (root) {
  'use strict';

  var rad = function (deg) { return deg * Math.PI / 180; };

  // Akar positif a P² + b P + c = 0
  function akar(a, b, c) { return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); }

  // Akar fungsi naik dengan bisection, untuk pers. (7.21) dan (7.25)
  function bagiDua(fn, atas) {
    var lo = 0, hi = atas;
    while (fn(hi) < 0) hi *= 2;
    for (var i = 0; i < 200; i++) { var mid = (lo + hi) / 2; if (fn(mid) < 0) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  function Kp(phi) { return Math.pow(Math.tan(rad(45 + phi / 2)), 2); }

  // Kandidat setiap moda untuk satu panjang L
  function moda(m, L) {
    var b = m.b, e = m.e, My = m.My, hasil = [];
    if (m.tanah === 'kohesif') {
      var k = 9 * m.cu * b, A = L - 1.5 * b;
      if (m.kepala === 'bebas') {
        if (A > 0) {
          var P1 = akar(1 / (4 * k), e + 1.5 * b + A / 2, -k * A * A / 4);
          var f1 = P1 / k;
          hasil.push({ moda: 'pendek', P: P1, f: f1, g: A - f1, M: P1 * (e + 1.5 * b + 0.5 * f1), pers: '7.2–7.5' });
        }
        var P2 = akar(1 / (2 * k), e + 1.5 * b, -My);
        hasil.push({ moda: 'panjang', P: P2, f: P2 / k, M: My, pers: '7.3' });
      } else {
        if (A > 0) {
          var P3 = k * A;
          hasil.push({ moda: 'pendek', P: P3, M: P3 * L - k * A * A / 2, pers: '7.6' });
          var P4 = akar(1 / (4 * k), 1.5 * b + A / 2, -(My + k * A * A / 4));
          var g4 = A - P4 / k;
          if (g4 >= 0) hasil.push({ moda: 'menengah', P: P4, f: P4 / k, g: g4, M: My, pers: '7.7–7.10' });
        }
        var P5 = akar(1 / (2 * k), 1.5 * b, -2 * My);
        hasil.push({ moda: 'panjang', P: P5, f: P5 / k, M: My, pers: '7.10–7.11' });
      }
    } else {
      var G = m.gamma * b * Kp(m.phi);
      if (m.kepala === 'bebas') {
        var P6 = G * Math.pow(L, 3) / (2 * (e + L));
        var f6 = 0.816 * Math.sqrt(P6 / G);
        hasil.push({ moda: 'pendek', P: P6, f: f6, M: P6 * (e + f6) - P6 * f6 / 3, pers: '7.16, 7.19, 7.20' });
        var P7 = bagiDua(function (P) { return P * (e + 0.544 * Math.sqrt(P / G)) - My; }, My / Math.max(e, b) + 1);
        hasil.push({ moda: 'panjang', P: P7, f: 0.816 * Math.sqrt(P7 / G), M: My, pers: '7.19, 7.21' });
      } else {
        var P8 = 1.5 * G * L * L;
        hasil.push({ moda: 'pendek', P: P8, M: P8 * L - G * Math.pow(L, 3) / 2, pers: '7.22' });
        var P9 = My / L + 0.5 * G * L * L;
        hasil.push({ moda: 'menengah', P: P9, M: My, pers: '7.23' });
        var P10 = bagiDua(function (P) { return P * (e + 0.544 * Math.sqrt(P / G)) - 2 * My; }, 2 * My / Math.max(e, b) + 1);
        hasil.push({ moda: 'panjang', P: P10, f: 0.816 * Math.sqrt(P10 / G), M: My, pers: '7.24–7.25' });
      }
    }
    var kecil = hasil.reduce(function (x, y) { return y.P < x.P ? y : x; });
    return { kandidat: hasil, menentukan: kecil };
  }

  // Panjang peralihan antarmoda: cari L tempat moda yang menentukan berganti (bisection pada L)
  function peralihan(m, Lmaks) {
    var batas = [], n = 400, L0 = m.tanah === 'kohesif' ? 1.5 * m.b : 0;
    var langkah = (Lmaks - L0) / n, Lsbl = L0 + langkah * 0.5, msbl = moda(m, Lsbl).menentukan.moda;
    for (var i = 1; i <= n; i++) {
      var L = L0 + langkah * (i + 0.5), mm = moda(m, L).menentukan.moda;
      if (mm !== msbl) {
        var lo = Lsbl, hi = L;
        for (var j = 0; j < 60; j++) { var mid = (lo + hi) / 2; if (moda(m, mid).menentukan.moda === msbl) lo = mid; else hi = mid; }
        var Lb = (lo + hi) / 2;
        batas.push({ dari: msbl, ke: mm, L: Lb, P: moda(m, Lb).menentukan.P });
      }
      Lsbl = L; msbl = mm;
    }
    return batas;
  }

  function hitung(m) {
    var galat = [], peringatan = [];
    var cek = function (nilai, syarat, pesan) { if (!(isFinite(nilai) && syarat)) galat.push(pesan); };
    cek(m.b, m.b > 0, 'Diameter atau lebar tiang b harus lebih dari 0.');
    cek(m.L, m.L > 0, 'Panjang tiang tertanam L harus lebih dari 0.');
    cek(m.e, m.e >= 0, 'Tinggi beban di atas muka tanah e tidak boleh negatif.');
    cek(m.My, m.My > 0, 'Momen leleh tiang M<sub>y</sub> harus lebih dari 0.');
    cek(m.FS, m.FS >= 1, 'Faktor keamanan minimal 1.');
    if (m.tanah === 'kohesif') {
      cek(m.cu, m.cu > 0, 'Kuat geser undrained c<sub>u</sub> harus lebih dari 0.');
      if (isFinite(m.L) && isFinite(m.b) && m.L <= 1.5 * m.b) galat.push('Untuk tanah kohesif, L harus lebih dari 1,5b karena reaksi tanah di 1,5b teratas diabaikan (Gbr. 7.1).');
    } else {
      cek(m.gamma, m.gamma > 0, 'Berat volume tanah γ harus lebih dari 0.');
      cek(m.phi, m.phi > 0 && m.phi < 50, 'Sudut geser φ harus antara 0° dan 50°.');
    }
    if (galat.length) return { galat: galat, peringatan: peringatan };

    var r = moda(m, m.L);
    var hasil = {
      galat: galat, peringatan: peringatan,
      Kp: m.tanah === 'kohesif' ? null : Kp(m.phi),
      kandidat: r.kandidat, menentukan: r.menentukan,
      Pult: r.menentukan.P, Pizin: r.menentukan.P / m.FS
    };
    var Lmaks = Math.max(m.L * 2, 40 * m.b);
    hasil.peralihan = peralihan(m, Lmaks);
    hasil.Lmaks = Lmaks;
    if (m.tanah === 'kohesif' && m.L < 3 * m.b) peringatan.push('L kurang dari 3b: hampir sepertiga panjang tiang berada di zona 1,5b teratas yang reaksinya diabaikan.');
    if (m.tanah === 'nonkohesif' && r.menentukan.f && r.menentukan.f > m.L) peringatan.push('Kedalaman momen maksimum f melebihi L; periksa ulang masukan.');
    if (r.menentukan.moda === 'pendek' && r.menentukan.M > m.My) peringatan.push('Momen maksimum pada moda pendek melebihi M<sub>y</sub>; periksa ulang masukan.');
    return hasil;
  }

  // Kurva Pult terhadap L untuk grafik
  function kurva(m, Lmaks, n) {
    var titik = [], L0 = m.tanah === 'kohesif' ? 1.5 * m.b : 0;
    n = n || 120;
    for (var i = 1; i <= n; i++) {
      var L = L0 + (Lmaks - L0) * i / n, r = moda(m, L).menentukan;
      titik.push({ L: L, P: r.P, moda: r.moda });
    }
    return titik;
  }

  var api = { hitung: hitung, moda: moda, kurva: kurva, peralihan: peralihan, Kp: Kp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BromsLateral = api;
})(this);
