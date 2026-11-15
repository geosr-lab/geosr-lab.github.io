/*
 * Korelasi parameter tanah dari N-SPT.
 * Sumber: Warman, H. (penyusun) (2019). Kumpulan Korelasi Parameter Geoteknik dan Fondasi.
 * Kementerian PUPR. Bab 4, hlm. 43–50 (nomor halaman buku).
 *
 *   N60 = (Ef/60) NM                                              hlm. 43
 *   (N1)60 = NM × CN × CE × CB × CR × CS                          hlm. 44
 *   CN = 2,2 / (1,2 + σ'vo/Pa), CN ≤ 1,70; CE, CB, CR, CS Tabel 4.1 (SNI 4153:2008), hlm. 44
 *   Pasir:
 *     Dr (%) = 25 (σ'o, kN/m²)^−0,12 N60^0,46          Bowles (1996), hlm. 46
 *     φ = 28 + 0,15 Dr                                 Meyerhof (1959), hlm. 46
 *     φ = √(20 (N1)60) + 20                            Hatanaka dan Uchida (1996), hlm. 46
 *     E/Pa = 5 N60 | 10 N60 | 15 N60                   Kulhawy dan Mayne (1990), hlm. 47
 *     Tabel 4.2 (Terzaghi dan Peck, 1967) dan 4.3 (Bowles, 1977), hlm. 45
 *   Lempung:
 *     cu/Pa = α' N60, α' dari Tabel 4.6 (interpolasi PI) Stroud (1975), hlm. 48
 *     Tabel 4.4 (Terzaghi dan Peck, 1967) dan 4.5 (Szechy dan Varga, 1978), hlm. 47–48
 *   Semua: vs (m/s) Imai (1977), Tabel 4.7, hlm. 50
 * Pa = 101,3 kPa (Daftar Konversi Warman, 2019).
 * Di sini N60 dihitung dengan semua koreksi alat: N60 = NM CE CB CR CS (CE = Ef/60), sehingga
 * (N1)60 = CN N60 sama dengan rumus hlm. 44. Bila CB = CR = CS = 1, N60 sama dengan rumus hlm. 43.
 */
(function (root) {
  'use strict';

  var PA = 101.3, GAMMA_W = 9.81;
  var CB = { '65-115': 1.0, '150': 1.05, '200': 1.15 };
  // Tabel 4.1 panjang batang: batas atas (m) dan CR
  var CR = [[3, 0.75], [4, 0.8], [6, 0.85], [10, 0.95], [30, 1.0]];
  var ALFA = [[15, 0.068], [20, 0.055], [25, 0.048], [30, 0.045], [40, 0.044], [60, 0.043]];
  var KASUS_E = { halus: 5, nc: 10, oc: 15 };
  var IMAI = { semua: [91, 0.337], pasir: [80.6, 0.331], lempung: [80.2, 0.292] };
  // Tabel 4.2: N-SPT dan kepadatan relatif (Terzaghi dan Peck, 1967)
  var TP_PASIR = [[4, 'sangat lepas'], [10, 'lepas'], [30, 'menengah'], [50, 'padat'], [Infinity, 'sangat padat']];
  // Tabel 4.3 (Bowles, 1977): batas atas N' terkoreksi, Dr, φ (°), γ (kN/m³)
  var BOWLES = [
    [4, 'sangat lepas', '0–0,15', '25–30', '11,0–15,7'],
    [10, 'lepas', '0,15–0,35', '27–32', '14,1–18,1'],
    [30, 'sedang', '0,35–0,65', '30–35', '17,4–20,4'],
    [50, 'padat', '0,65–0,85', '35–40', '17,3–22'],
    [Infinity, 'sangat padat', '0,85–1,00', '38–43', '20,4–23,6']
  ];
  // Tabel 4.4 (Terzaghi dan Peck, 1967): batas atas N, konsistensi, cu (kN/m²)
  var TP_LEMPUNG = [[2, 'sangat lunak', '< 12'], [4, 'lunak', '12–25'], [8, 'sedang', '25–50'], [15, 'kaku', '50–100'], [30, 'sangat kaku', '100–200'], [Infinity, 'keras', '> 200']];
  // Tabel 4.5 (Szechy dan Varga, 1978): batas atas N, CI, konsistensi, cu (kN/m²)
  var SZECHY = [[2, '< 0,5', 'sangat lunak', '< 12,5'], [8, '0,5–0,75', 'lunak ke sedang', '12,5–40'], [15, '0,75–1,0', 'kaku', '40–75'], [30, '1,0–1,5', 'sangat kaku', '75–200'], [Infinity, '> 1,5', 'keras', '> 200']];

  function cari(tabel, N) { for (var i = 0; i < tabel.length; i++) if (N < tabel[i][0]) return tabel[i]; return tabel[tabel.length - 1]; }

  function faktorCR(panjang) {
    for (var i = 0; i < CR.length; i++) if (panjang < CR[i][0] || i === CR.length - 1) return CR[i][1];
  }

  function alfaStroud(PI) {
    if (PI <= ALFA[0][0]) return ALFA[0][1];
    if (PI >= ALFA[ALFA.length - 1][0]) return ALFA[ALFA.length - 1][1];
    for (var i = 1; i < ALFA.length; i++) {
      if (PI <= ALFA[i][0]) {
        var a = ALFA[i - 1], b = ALFA[i];
        return a[1] + (b[1] - a[1]) * (PI - a[0]) / (b[0] - a[0]);
      }
    }
  }

  // Tegangan vertikal efektif di kedalaman z (MAT di dw; di bawah MAT dipakai γsat − γw)
  function teganganEfektif(m) {
    if (!m.adaMAT || m.dw >= m.z) return { sv: m.gamma * m.z, u: 0 };
    var sv = m.gamma * m.dw + m.gammaSat * (m.z - m.dw), u = GAMMA_W * (m.z - m.dw);
    return { sv: sv - u, total: sv, u: u };
  }

  function hitung(m) {
    var galat = [], peringatan = [];
    var cek = function (v, syarat, pesan) { if (!(isFinite(v) && syarat)) galat.push(pesan); };
    cek(m.NM, m.NM > 0, 'N-SPT terukur harus lebih dari 0.');
    cek(m.Ef, m.Ef > 0 && m.Ef <= 100, 'Efisiensi palu E<sub>f</sub> harus antara 0 dan 100%.');
    cek(m.z, m.z > 0, 'Kedalaman uji harus lebih dari 0.');
    cek(m.gamma, m.gamma > 0, 'Berat volume tanah γ harus lebih dari 0.');
    cek(m.batang, m.batang > 0, 'Panjang batang harus lebih dari 0.');
    cek(m.CS, m.CS >= 1 && m.CS <= 1.3, 'C<sub>S</sub> harus antara 1,0 dan 1,3 (Tabel 4.1).');
    if (!CB.hasOwnProperty(m.bor)) galat.push('Diameter bor tidak dikenal.');
    if (m.adaMAT) {
      cek(m.dw, m.dw >= 0, 'Kedalaman muka air tanah tidak boleh negatif.');
      cek(m.gammaSat, m.gammaSat > GAMMA_W, 'γ<sub>sat</sub> harus lebih dari γ<sub>w</sub> = 9,81 kN/m³.');
    }
    if (m.tanah === 'lempung') cek(m.PI, m.PI >= 0, 'Indeks plastisitas PI tidak boleh negatif.');
    if (galat.length) return { galat: galat, peringatan: peringatan };

    var T = teganganEfektif(m), sv = T.sv;
    var CE = m.Ef / 60, cb = CB[m.bor], cr = faktorCR(m.batang);
    var N60 = m.NM * CE * cb * cr * m.CS;
    var CNmentah = 2.2 / (1.2 + sv / PA), CN = Math.min(CNmentah, 1.7);
    var N160 = CN * N60;
    var r = {
      galat: galat, peringatan: peringatan, PA: PA, sv: sv, svTotal: T.total, u: T.u,
      CE: CE, CB: cb, CR: cr, CS: m.CS, N60: N60, CNmentah: CNmentah, CN: CN, N160: N160
    };
    var im = IMAI[m.tanah] || IMAI.semua;
    r.vs = im[0] * Math.pow(N60, im[1]);
    r.vsSemua = IMAI.semua[0] * Math.pow(N60, IMAI.semua[1]);
    r.imai = im;

    if (m.tanah === 'pasir') {
      r.Dr = 25 * Math.pow(sv, -0.12) * Math.pow(N60, 0.46);
      r.phiMeyerhof = 28 + 0.15 * r.Dr;
      r.phiHatanaka = Math.sqrt(20 * N160) + 20;
      r.E = {};
      Object.keys(KASUS_E).forEach(function (k) { r.E[k] = KASUS_E[k] * N60 * PA; });
      r.tp = cari(TP_PASIR, N60);
      r.bowles = cari(BOWLES, N160);
      if (r.Dr > 100) peringatan.push('D<sub>r</sub> hasil korelasi lebih dari 100%; batasi pada 100% dan periksa data N.');
    } else {
      r.alfa = alfaStroud(m.PI);
      r.cu = r.alfa * N60 * PA;
      r.tp = cari(TP_LEMPUNG, N60);
      r.szechy = cari(SZECHY, N60);
      if (m.PI < 15 || m.PI > 60) peringatan.push('PI di luar rentang Tabel 4.6 (15–60); α\' diambil dari nilai ujung tabel.');
    }
    if (CNmentah > 1.7) peringatan.push('C<sub>N</sub> dibatasi 1,70 (hlm. 44) karena tegangan efektif kecil.');
    if (N60 > 50 && m.tanah === 'pasir') peringatan.push('N<sub>60</sub> di atas 50: tanah sangat padat, korelasi di batas atas rentang tabel.');
    return r;
  }

  var api = { hitung: hitung, faktorCR: faktorCR, alfaStroud: alfaStroud, teganganEfektif: teganganEfektif, PA: PA, CB: CB, KASUS_E: KASUS_E, IMAI: IMAI };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KorelasiSPT = api;
})(this);
