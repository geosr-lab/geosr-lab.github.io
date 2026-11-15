/*
 * Korelasi parameter tanah dari uji sondir (CPT).
 * Sumber: Warman, H. (penyusun) (2019). Kumpulan Korelasi Parameter Geoteknik dan Fondasi.
 * Kementerian PUPR. Bab 5, hlm. 53–61 (nomor halaman buku).
 *
 *   Rf = fs/qc × 100 %                                                (rasio gesekan, notasi hlm. xiii)
 *   Pasir:
 *     Dr = (1/C2) ln[qc / (C0 (σ'vo)^0,55)], C0 = 157, C2 = 2,41, qc dan σ'vo dalam kPa   Baldi dkk. (1986), hlm. 55–56
 *     Tabel 5.1 qc → kepadatan dan φ (Meyerhof, 1956); Tabel 5.2 qc → φ' (Bergdahl dkk., 1993), hlm. 56
 *   Lempung:
 *     cu = (qc − σvo)/Nc, Nc = faktor konus                            hlm. 57
 *     St = Ns/Rf, Ns rata-rata dengan rentang 6–9 (Lunne dkk., 1997)   Schmertmann (1978), hlm. 57
 *     σ'p = k (qt − σv), k rata-rata 0,33 (0,2–0,5); OCR = σ'p/σ'v      hlm. 58
 *     OCR = 0,37 [(qc − σo)/σ'o]^1,01                                   Mayne dan Kemper (1988), hlm. 58
 *     1/CR = qc/(2,3 β σ'v) → CR = 2,3 β σ'v / qc; β Tabel 5.5          CUR (1996), hlm. 59
 *     vs = 1,75 qc^0,627 (qc dalam kPa, vs dalam m/s)                   Mayne dan Rix (1995), hlm. 59
 *   Semua: qc = 4N (Meyerhof, 1956), hlm. 60 [BELUM TERVERIFIKASI: satuan qc tidak ditulis; dipakai kg/cm²].
 * Pada sondir mekanis qt tidak diukur; qt diambil sama dengan qc.
 * 1 kg/cm² = 98,0665 kPa.
 */
(function (root) {
  'use strict';

  var KGCM2 = 98.0665, GAMMA_W = 9.81, C0 = 157, C2 = 2.41;
  // Tabel 5.1 (Meyerhof, 1956): batas atas qc (MPa), kepadatan, Dr, N-SPT, φ triaksial
  var MEYERHOF = [[2, 'sangat lepas', '< 0,2', '< 4', '< 30'], [4, 'lepas', '0,2–0,4', '4–10', '30–35'], [12, 'padat sedang', '0,4–0,6', '10–30', '35–40'],
    [20, 'padat', '0,6–0,8', '30–50', '40–45'], [Infinity, 'sangat padat', '> 0,8', '> 50', '> 45']];
  // Tabel 5.2 (Bergdahl dkk., 1993): batas atas qc (MPa), kepadatan relatif, φ'
  var BERGDAHL = [[2.5, 'sangat lemah', '29–32'], [5, 'lemah', '32–35'], [10, 'sedang', '35–37'], [20, 'besar', '37–40'], [Infinity, 'sangat besar', '40–42']];
  // Tabel 5.5 (CUR, 1996): rentang β
  var BETA = { 'lempung-pasiran': [0.2, 0.4], 'lempung-murni': [0.4, 0.8], gambut: [0.8, 1.6] };

  function cari(tabel, x) { for (var i = 0; i < tabel.length; i++) if (x < tabel[i][0]) return tabel[i]; return tabel[tabel.length - 1]; }

  function tegangan(m) {
    var basah = !m.adaMAT || m.dw >= m.z;
    var sv = basah ? m.gamma * m.z : m.gamma * m.dw + m.gammaSat * (m.z - m.dw);
    var u = basah ? 0 : GAMMA_W * (m.z - m.dw);
    return { sv: sv, u: u, svEf: sv - u };
  }

  function hitung(m) {
    var galat = [], peringatan = [];
    var cek = function (v, syarat, pesan) { if (!(isFinite(v) && syarat)) galat.push(pesan); };
    cek(m.qc, m.qc > 0, 'Tahanan konus q<sub>c</sub> harus lebih dari 0.');
    cek(m.fs, m.fs >= 0, 'Tahanan gesek f<sub>s</sub> tidak boleh negatif.');
    cek(m.z, m.z > 0, 'Kedalaman harus lebih dari 0.');
    cek(m.gamma, m.gamma > 0, 'Berat volume γ harus lebih dari 0.');
    if (m.adaMAT) {
      cek(m.dw, m.dw >= 0, 'Kedalaman muka air tanah tidak boleh negatif.');
      cek(m.gammaSat, m.gammaSat > GAMMA_W, 'γ<sub>sat</sub> harus lebih dari 9,81 kN/m³.');
    }
    if (m.tanah === 'lempung') {
      cek(m.Nc, m.Nc > 0, 'Faktor konus N<sub>c</sub> harus lebih dari 0.');
      cek(m.Ns, m.Ns > 0, 'Konstanta N<sub>S</sub> harus lebih dari 0.');
      cek(m.k, m.k > 0, 'Faktor konus prakonsolidasi k harus lebih dari 0.');
      cek(m.beta, m.beta > 0, 'Koefisien β harus lebih dari 0.');
    }
    if (galat.length) return { galat: galat, peringatan: peringatan };

    var T = tegangan(m), qc = m.qc * KGCM2, fs = m.fs * KGCM2;
    var r = { galat: galat, peringatan: peringatan, sv: T.sv, u: T.u, svEf: T.svEf, qcKPa: qc, qcMPa: qc / 1000, fsKPa: fs,
      Rf: fs / qc * 100, N: m.qc / 4 };
    if (m.tanah === 'pasir') {
      r.Dr = Math.log(qc / (C0 * Math.pow(T.svEf, 0.55))) / C2;
      r.meyerhof = cari(MEYERHOF, r.qcMPa);
      r.bergdahl = cari(BERGDAHL, r.qcMPa);
      if (r.Dr < 0) peringatan.push('D<sub>r</sub> hasil korelasi negatif: q<sub>c</sub> terlalu kecil untuk pasir; mungkin tanahnya bukan pasir.');
      if (r.Dr > 1) peringatan.push('D<sub>r</sub> hasil korelasi lebih dari 100%; periksa data.');
    } else {
      r.qn = qc - T.sv;
      r.cu = r.qn / m.Nc;
      r.St = r.Rf > 0 ? m.Ns / r.Rf : Infinity;
      r.spK = m.k * r.qn;
      r.ocrK = r.spK / T.svEf;
      r.ocrMK = 0.37 * Math.pow(r.qn / T.svEf, 1.01);
      r.CR = 2.3 * m.beta * T.svEf / qc;
      r.vs = 1.75 * Math.pow(qc, 0.627);
      if (r.qn <= 0) { galat.push('q<sub>c</sub> lebih kecil dari tegangan total σ<sub>vo</sub>; korelasi lempung tidak bisa dipakai.'); return { galat: galat, peringatan: peringatan }; }
      if (!(r.Rf > 0)) peringatan.push('f<sub>s</sub> = 0 sehingga sensitivitas tidak terhitung.');
    }
    return r;
  }

  var api = { hitung: hitung, tegangan: tegangan, KGCM2: KGCM2, BETA: BETA, C0: C0, C2: C2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KorelasiCPT = api;
})(this);
