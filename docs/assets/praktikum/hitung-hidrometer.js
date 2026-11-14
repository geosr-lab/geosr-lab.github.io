/*
 * Analisis hidrometer (SNI 3423:2008, mengacu ASTM D422) dengan hidrometer 152H, digabung dengan saringan.
 * ASTM D422 ditarik pada 2016 (pengganti D7928); rumus di bawah belum dicocokkan dengan D7928 [BELUM TERVERIFIKASI].
 *
 * Cara form lab UNJA dan contoh laporan (Hydrometer Analysis.pdf hlm 104–108):
 *   L dan K dibaca dari tabel ASTM D422 (Tabel 2 dan Tabel 3) dengan interpolasi linier,
 *   D = K √(L / t), L dalam cm, t dalam menit (satuan tabel K), D dalam mm,
 *   k = koreksi suhu (diisi pengguna), c = a = faktor koreksi berat jenis (ASTM D422 Tabel 1),
 *   N = (Rh + k) · c / Ws × 100%,   N′ = N / 100 × % lolos saringan No. 200   (rumus tercetak di form).
 * Pilihan rumus (cara lama alat ini):
 *   L = 16,29 − 0,164 (R + Cm) [cm];  a = 1,65 Gs / [(Gs − 1) 2,65];
 *   K = √[30 η / (980 (Gs − G1))], η dalam poise, G1 = berat jenis air pada suhu uji (Tanaka dkk., 2001);
 *   η = 2,414 × 10⁻⁵ × 10^(247,8 / (T + 273,15 − 140)) Pa·s (persamaan tipe Vogel; dicek terhadap IAPWS 20 dan 25 °C).
 * Kurva gradasi:
 *   'form' : titik hidrometer = N′ (bawaan halaman alat),
 *   'astm' : titik hidrometer = N × F10 / 100, F10 = persen lolos No. 10 seluruh contoh (bawaan modul bila tidak dipilih).
 * Bacaan terkoreksi: Rc = Rh + k − Cd (Cd = koreksi nol/dispersan, opsional, 0 bila k sudah mencakupnya).
 *
 * Nilai Tabel 1–3 ASTM D422-63 di bawah ditulis dari standar; halaman standarnya belum dilampirkan di sesi
 * [BELUM TERVERIFIKASI]. Pemeriksaan silang: Tabel 2 berselisih ≤ 0,06 cm dari rumus L, Tabel 3 berselisih ≤ 0,4%
 * dari rumus K (kecuali 16 °C, Gs 2,45), dan contoh laporan memakai nilai yang sama (R 54 → 7,4 cm, R 55 → 7,3 cm;
 * K 27 °C = 0,01258 untuk Gs 2,65 dan 0,01239 untuk Gs 2,70; a = 1,00 untuk Gs 2,65 dan 0,99 untuk Gs 2,70).
 */
(function (root) {
  'use strict';

  var node = typeof module !== 'undefined' && module.exports;
  var SF = node ? require('./hitung-sifat-fisik.js') : root.HitungSifatFisik;
  var HS = node ? require('./hitung-saringan.js') : root.HitungSaringan;

  // ASTM D422 Tabel 2: kedalaman efektif L (cm) hidrometer 152H untuk bacaan R = 0…60.
  var TABEL_L = [16.3, 16.1, 16.0, 15.8, 15.6, 15.5, 15.3, 15.2, 15.0, 14.8, 14.7, 14.5, 14.3, 14.2, 14.0, 13.8, 13.7, 13.5, 13.3, 13.2,
    13.0, 12.9, 12.7, 12.5, 12.4, 12.2, 12.0, 11.9, 11.7, 11.5, 11.4, 11.2, 11.1, 10.9, 10.7, 10.6, 10.4, 10.2, 10.1, 9.9,
    9.7, 9.6, 9.4, 9.2, 9.1, 8.9, 8.8, 8.6, 8.4, 8.3, 8.1, 7.9, 7.8, 7.6, 7.4, 7.3, 7.1, 7.0, 6.8, 6.6, 6.5];
  // ASTM D422 Tabel 3: K untuk T = 16…30 °C (baris) dan Gs = 2,45…2,85 (kolom).
  var TABEL_K_GS = [2.45, 2.50, 2.55, 2.60, 2.65, 2.70, 2.75, 2.80, 2.85];
  var TABEL_K = {
    16: [0.01510, 0.01505, 0.01481, 0.01457, 0.01435, 0.01414, 0.01394, 0.01374, 0.01356],
    17: [0.01511, 0.01486, 0.01462, 0.01439, 0.01417, 0.01396, 0.01376, 0.01356, 0.01338],
    18: [0.01492, 0.01467, 0.01443, 0.01421, 0.01399, 0.01378, 0.01359, 0.01339, 0.01321],
    19: [0.01474, 0.01449, 0.01425, 0.01403, 0.01382, 0.01361, 0.01342, 0.01323, 0.01305],
    20: [0.01456, 0.01431, 0.01408, 0.01386, 0.01365, 0.01344, 0.01325, 0.01307, 0.01289],
    21: [0.01438, 0.01414, 0.01391, 0.01369, 0.01348, 0.01328, 0.01309, 0.01291, 0.01273],
    22: [0.01421, 0.01397, 0.01374, 0.01353, 0.01332, 0.01312, 0.01294, 0.01276, 0.01258],
    23: [0.01404, 0.01381, 0.01358, 0.01337, 0.01317, 0.01297, 0.01279, 0.01261, 0.01243],
    24: [0.01388, 0.01365, 0.01342, 0.01321, 0.01301, 0.01282, 0.01264, 0.01246, 0.01229],
    25: [0.01372, 0.01349, 0.01327, 0.01306, 0.01286, 0.01267, 0.01249, 0.01232, 0.01215],
    26: [0.01357, 0.01334, 0.01312, 0.01291, 0.01272, 0.01253, 0.01235, 0.01218, 0.01201],
    27: [0.01342, 0.01319, 0.01297, 0.01277, 0.01258, 0.01239, 0.01221, 0.01204, 0.01188],
    28: [0.01327, 0.01304, 0.01283, 0.01264, 0.01244, 0.01225, 0.01208, 0.01191, 0.01175],
    29: [0.01312, 0.01290, 0.01269, 0.01249, 0.01230, 0.01212, 0.01195, 0.01178, 0.01162],
    30: [0.01298, 0.01276, 0.01256, 0.01236, 0.01217, 0.01199, 0.01182, 0.01165, 0.01149]
  };
  // ASTM D422 Tabel 1: faktor koreksi a untuk Gs (Gs naik).
  var TABEL_A = [[2.45, 1.05], [2.50, 1.03], [2.55, 1.02], [2.60, 1.01], [2.65, 1.00], [2.70, 0.99], [2.75, 0.98], [2.80, 0.97], [2.85, 0.96], [2.90, 0.95], [2.95, 0.94]];

  function viskositasAir(T) { return 2.414e-5 * Math.pow(10, 247.8 / (T + 273.15 - 140)); } // Pa·s
  function faktorA(Gs) { return 1.65 * Gs / ((Gs - 1) * 2.65); }
  function kedalamanL(R) { return 16.29 - 0.164 * R; }
  function konstantaK(T, Gs) { return Math.sqrt(30 * viskositasAir(T) * 10 / (980 * (Gs - SF.massaJenisAir(T)))); }

  function interp(x, x1, x2, y1, y2) { return x2 === x1 ? y1 : y1 + (x - x1) * (y2 - y1) / (x2 - x1); }
  // Nilai tabel dengan interpolasi linier; null di luar rentang tabel.
  function faktorATabel(Gs) {
    if (!(Gs >= TABEL_A[0][0] - 1e-9 && Gs <= TABEL_A[TABEL_A.length - 1][0] + 1e-9)) return null;
    for (var i = 0; i < TABEL_A.length - 1; i++) {
      if (Gs <= TABEL_A[i + 1][0] + 1e-9) return interp(Gs, TABEL_A[i][0], TABEL_A[i + 1][0], TABEL_A[i][1], TABEL_A[i + 1][1]);
    }
    return TABEL_A[TABEL_A.length - 1][1];
  }
  function kedalamanLTabel(R) {
    if (!(R >= 0 && R <= 60)) return null;
    var i = Math.min(Math.floor(R), 59);
    return interp(R, i, i + 1, TABEL_L[i], TABEL_L[i + 1]);
  }
  function konstantaKTabel(T, Gs) {
    var G = TABEL_K_GS;
    if (!(T >= 16 && T <= 30 && Gs >= G[0] - 1e-9 && Gs <= G[G.length - 1] + 1e-9)) return null;
    function padaT(t) {
      var b = TABEL_K[t];
      for (var j = 0; j < G.length - 1; j++) if (Gs <= G[j + 1] + 1e-9) return interp(Gs, G[j], G[j + 1], b[j], b[j + 1]);
      return b[G.length - 1];
    }
    var t1 = Math.min(Math.floor(T), 29);
    return interp(T, t1, t1 + 1, padaT(t1), padaT(t1 + 1));
  }

  function hitung(m) {
    var galat = [], peringatan = [];
    if (!(m.W > 0)) galat.push('Isi massa tanah kering contoh hidrometer, Ws.');
    if (!(m.Gs > 1.5 && m.Gs < 4)) galat.push('Isi berat spesifik Gs (biasanya 2,6–2,8).');
    var F10 = m.F10 > 0 ? m.F10 : 100;
    if (F10 > 100) galat.push('Persen lolos No. 10 seluruh contoh tidak boleh lebih dari 100%.');
    if (!m.bacaan.length) galat.push('Isi minimal satu bacaan hidrometer.');
    m.bacaan.forEach(function (b) {
      if (!(b.t > 0)) galat.push('Bacaan ' + b.no + ': waktu harus lebih dari 0.');
      if (!(b.T > 0 && b.T <= 40)) galat.push('Bacaan ' + b.no + ': suhu harus antara 0 dan 40 °C.');
    });
    if (galat.length) return { galat: galat };

    var tabelLK = m.caraLK === 'tabel', luarTabel = { L: false, K: false };
    // Faktor c = a: isian manual, tabel ASTM D422 Tabel 1, atau rumus.
    var aRumus = faktorA(m.Gs), aTabel = faktorATabel(m.Gs), a, aSumber;
    if (m.a > 0) { a = m.a; aSumber = 'manual'; }
    else if (m.caraA === 'tabel' && aTabel !== null) { a = aTabel; aSumber = 'tabel'; }
    else {
      a = aRumus; aSumber = 'rumus';
      if (m.caraA === 'tabel') peringatan.push('Gs di luar Tabel 1 ASTM D422 (2,45–2,95), jadi faktor a dihitung dengan rumus.');
    }
    var Cm = isFinite(m.Cm) ? m.Cm : 0, Cd = isFinite(m.Cd) ? m.Cd : 0;

    // Saringan contoh hidrometer (tabel atas form): persen terhadap Ws, lalu terhadap seluruh contoh.
    var kum = 0, ayakan = m.ayakan.filter(function (x) { return isFinite(x.tertahan); })
      .map(function (x) { return Object.assign({}, x, { mm: HS.ukuran(x.nama) }); }).sort(function (x, y) { return y.mm - x.mm; });
    ayakan.forEach(function (x) {
      kum += x.tertahan;
      x.kumulatif = kum;
      x.persenTertahan = kum / m.W * 100;
      x.lolos = 100 - x.persenTertahan;
      x.lolosTotal = x.lolos * F10 / 100;
    });
    if (kum > m.W * 1.001) return { galat: ['Jumlah berat tertahan saringan melebihi massa contoh Ws.'] };

    // % lolos No. 200 untuk N′: isian pengguna, atau lolos No. 200 dari tabel atas form.
    var s200 = ayakan.filter(function (x) { return Math.abs(x.mm - 0.075) < 1e-9; })[0];
    var P200N = m.P200form > 0 ? m.P200form : s200 ? s200.lolos : null;
    var P200Nsumber = m.P200form > 0 ? 'isian' : s200 ? 'tabel' : null;

    var bacaan = m.bacaan.slice().sort(function (x, y) { return x.t - y.t; }).map(function (b) {
      var k = isFinite(b.k) && b.k !== null ? b.k : 0;
      var Rc = b.R + k - Cd, RL = b.R + Cm;
      var L, Lsumber, K, Ksumber;
      if (b.L > 0) { L = b.L; Lsumber = 'manual'; }
      else if (tabelLK && kedalamanLTabel(RL) !== null) { L = kedalamanLTabel(RL); Lsumber = 'tabel'; }
      else { L = kedalamanL(RL); Lsumber = 'rumus'; if (tabelLK) luarTabel.L = true; }
      if (b.K > 0) { K = b.K; Ksumber = 'manual'; }
      else if (tabelLK && konstantaKTabel(b.T, m.Gs) !== null) { K = konstantaKTabel(b.T, m.Gs); Ksumber = 'tabel'; }
      else { K = konstantaK(b.T, m.Gs); Ksumber = 'rumus'; if (tabelLK) luarTabel.K = true; }
      var akar = Math.sqrt(L / b.t), D = K * akar, P = a * Rc / m.W * 100;
      var Nform = P200N !== null ? P * P200N / 100 : null;
      return Object.assign({}, b, { k: k, Rc: Rc, RL: RL, L: L, Lsumber: Lsumber, Lmanual: Lsumber === 'manual', K: K, Ksumber: Ksumber, Kmanual: Ksumber === 'manual',
        eta: viskositasAir(b.T), akar: akar, D: D, P: P, Ptotal: P * F10 / 100, Nform: Nform });
    });
    if (luarTabel.L) peringatan.push('Ada bacaan di luar Tabel 2 ASTM D422 (R 0–60), jadi L baris itu dihitung dengan rumus 16,29 − 0,164 R.');
    if (luarTabel.K) peringatan.push('Ada suhu atau Gs di luar Tabel 3 ASTM D422 (16–30 °C, Gs 2,45–2,85), jadi K baris itu dihitung dari viskositas air.');
    bacaan.forEach(function (b) {
      if (b.P > 100.5) peringatan.push('Bacaan menit ke-' + String(b.t).replace('.', ',') + ' memberi N lebih dari 100%. Periksa Ws, faktor c, atau koreksi.');
      if (b.P < 0) peringatan.push('Bacaan menit ke-' + String(b.t).replace('.', ',') + ' memberi N negatif. Periksa koreksi nol atau koreksi suhu.');
    });

    var kurva = m.kurva === 'form' ? 'form' : 'astm';
    if (kurva === 'form' && P200N === null) {
      kurva = 'astm';
      peringatan.push('N′ butuh % lolos No. 200 (isi saringan No. 200 di tabel atas atau isian % lolos No. 200). Kurva sementara memakai N × F10/100.');
    }

    var titik = [];
    if (F10 < 100) {
      if (m.P4 >= F10) titik.push({ mm: 4.75, lolos: m.P4, asal: 'saringan' });
      if (ayakan.some(function (x) { return x.mm > 2; })) peringatan.push('F10 < 100%: saringan di atas No. 10 pada contoh hidrometer tidak dipakai. Bagian kasar diambil dari analisa saringan seluruh contoh.');
      titik.push({ mm: 2, lolos: F10, asal: 'saringan' });
    }
    ayakan.forEach(function (x) { if (F10 >= 100 || x.mm < 2) titik.push({ mm: x.mm, lolos: x.lolosTotal, asal: 'saringan' }); });
    bacaan.forEach(function (b) { titik.push({ mm: b.D, lolos: kurva === 'form' ? b.Nform : b.Ptotal, asal: 'hidrometer' }); });
    titik.sort(function (x, y) { return y.mm - x.mm; });
    // Buang titik ganda pada ukuran yang sama.
    titik = titik.filter(function (x, i) { return i === 0 || Math.abs(x.mm - titik[i - 1].mm) > 1e-12; });
    if (titik.length && titik[0].asal === 'saringan' && titik[0].lolos < 100 - 1e-9 && F10 >= 100) {
      var atas = HS.SARINGAN.filter(function (s) { return s.mm > titik[0].mm; }).pop();
      if (atas) titik.unshift({ mm: atas.mm, lolos: 100, asal: 'saringan' });
    }
    var monoton = titik.every(function (x, i) { return i === 0 || x.lolos <= titik[i - 1].lolos + 0.5; });
    if (!monoton) peringatan.push('Kurva gabungan tidak turun terus' + (kurva === 'form' ? '' : ' di sekitar sambungan saringan–hidrometer') +
      '. Periksa Ws, faktor c, koreksi, atau dasar kurva. Diameter karakteristik diambil dari perpotongan pertama.');

    var batas = m.batasLempung > 0 ? m.batasLempung : 0.002;
    function lolos(d) { return HS.lolosPada(titik, d); }
    var p475 = F10 >= 100 && titik[0].mm <= 4.75 ? 100 : lolos(4.75), p0075 = lolos(0.075), pLempung = lolos(batas);
    var fraksi = null;
    if (p475 !== null && p0075 !== null) {
      fraksi = { kerikil: 100 - p475, pasir: p475 - p0075, lanau: pLempung !== null ? p0075 - pLempung : null, lempung: pLempung, halus: p0075 };
      if (pLempung === null) peringatan.push('Bacaan hidrometer belum mencapai ' + String(batas).replace('.', ',') + ' mm, jadi fraksi lempung belum bisa dipisahkan dari lanau. Tambah bacaan waktu lebih lama.');
    } else if (F10 < 100 && !(m.P4 >= 0)) {
      peringatan.push('Isi persen lolos No. 4 seluruh contoh untuk memisahkan kerikil dari pasir.');
    } else if (p0075 === null) {
      peringatan.push('Isi berat tertahan saringan contoh hidrometer sampai No. 200 supaya pasir dan butir halus bisa dipisahkan.');
    }
    var D10 = HS.diameter(titik, 10), D30 = HS.diameter(titik, 30), D60 = HS.diameter(titik, 60);
    var hasil = { galat: [], peringatan: peringatan, a: a, aRumus: aRumus, aTabel: aTabel, aSumber: aSumber, aManual: aSumber === 'manual', F10: F10,
      P200form: m.P200form > 0 ? m.P200form : null, P200N: P200N, P200Nsumber: P200Nsumber, kurva: kurva, caraLK: tabelLK ? 'tabel' : 'rumus',
      Cm: Cm, Cd: Cd, bacaan: bacaan, ayakan: ayakan,
      titik: titik, fraksi: fraksi, batasLempung: batas, D10: D10, D30: D30, D60: D60,
      P4: p475, P10: lolos(2), P40: lolos(0.425), P200: p0075 };
    if (D10 && D60) hasil.Cu = D60 / D10;
    if (D10 && D30 && D60) hasil.Cc = D30 * D30 / (D10 * D60);
    return hasil;
  }

  var api = { hitung: hitung, viskositasAir: viskositasAir, faktorA: faktorA, kedalamanL: kedalamanL, konstantaK: konstantaK,
    faktorATabel: faktorATabel, kedalamanLTabel: kedalamanLTabel, konstantaKTabel: konstantaKTabel,
    TABEL_L: TABEL_L, TABEL_K: TABEL_K, TABEL_K_GS: TABEL_K_GS, TABEL_A: TABEL_A };
  if (node) module.exports = api;
  else root.HitungHidrometer = api;
})(this);
