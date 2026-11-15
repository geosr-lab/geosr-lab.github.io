/* Tampilan kalkulator korelasi parameter tanah dari sondir (CPT). Rumus di korelasi-cpt-hitung.js. */
(function () {
  'use strict';

  var U = window.Umum;
  var $ = U.$, f = U.f, t = U.t, rumus = U.rumus, salin = U.salin;
  var CONTOH = { tanah: 'pasir', qc: 80, fs: 0.8, z: 6, gamma: 18, adaMAT: true, dw: 2, gammaSat: 19.5, Nc: 15, Ns: 7.5, k: 0.33, jenisBeta: 'lempung-murni', beta: 0.6 };
  var ANGKA = ['qc', 'fs', 'z', 'gamma', 'dw', 'gammaSat', 'Nc', 'Ns', 'k', 'beta'];
  var keadaan;

  function isiFormulir() {
    ANGKA.forEach(function (k) { $(k).value = keadaan[k]; });
    $('tanah').value = keadaan.tanah;
    $('jenisBeta').value = keadaan.jenisBeta;
    $('adaMAT').checked = keadaan.adaMAT;
    aturAktif();
  }

  function aturAktif() {
    Array.prototype.forEach.call(document.querySelectorAll('.isi-lempung'), function (el) { el.hidden = keadaan.tanah !== 'lempung'; });
    $('dw').disabled = $('gammaSat').disabled = !keadaan.adaMAT;
  }

  function baris(param, nilai, satuan, sumber) {
    return '<tr><td>' + param + '</td><td class="angka">' + nilai + '</td><td>' + satuan + '</td><td class="kecil">' + sumber + '</td></tr>';
  }

  function gambarRingkas(m, r) {
    if (r.galat.length) { $('ringkas').innerHTML = '<p class="redup kecil">Lengkapi masukan.</p>'; return; }
    var h = '<dl class="ringkas-spt">' +
      '<div><dt>q<sub>c</sub></dt><dd>' + f(r.qcMPa, 2) + ' MPa</dd></div>' +
      '<div><dt>R<sub>f</sub></dt><dd>' + f(r.Rf, 2) + '%</dd></div>';
    if (m.tanah === 'pasir') {
      h += '<div><dt>D<sub>r</sub></dt><dd>' + f(Math.max(0, Math.min(r.Dr, 1)) * 100, 0) + '%</dd></div>' +
        '<div><dt>φ\'</dt><dd>' + r.bergdahl[2] + '°</dd></div>' +
        '<div><dt>Kepadatan</dt><dd>' + r.meyerhof[1] + '</dd></div>';
    } else {
      h += '<div><dt>c<sub>u</sub></dt><dd>' + f(r.cu, 0) + ' kPa</dd></div>' +
        '<div><dt>OCR</dt><dd>' + f(r.ocrMK, 1) + '</dd></div>' +
        '<div><dt>v<sub>s</sub></dt><dd>' + f(r.vs, 0) + ' m/s</dd></div>';
    }
    $('ringkas').innerHTML = h + '</dl>';
  }

  function gambarHasil(m, r) {
    var el = $('hasil');
    if (r.galat.length) {
      el.innerHTML = '<h2>Hasil</h2>' + r.galat.map(function (g) { return '<div class="catatan galat">' + g + '</div>'; }).join('');
      return;
    }
    var pasir = m.tanah === 'pasir', h = '';
    r.peringatan.forEach(function (p) { h += '<div class="catatan">' + p + '</div>'; });

    h += '<h2>1. Diketahui</h2><div class="tabel-gulir"><table><thead><tr><th>Simbol</th><th>Besaran</th><th class="angka">Nilai</th><th>Satuan</th></tr></thead><tbody>' +
      '<tr><td><i>q<sub>c</sub></i></td><td>Tahanan konus</td><td class="angka">' + f(m.qc, 1) + '</td><td>kg/cm²</td></tr>' +
      '<tr><td><i>f<sub>s</sub></i></td><td>Tahanan gesek selimut</td><td class="angka">' + f(m.fs, 2) + '</td><td>kg/cm²</td></tr>' +
      '<tr><td><i>z</i></td><td>Kedalaman</td><td class="angka">' + f(m.z, 1) + '</td><td>m</td></tr>' +
      '<tr><td>γ</td><td>Berat volume tanah</td><td class="angka">' + f(m.gamma, 1) + '</td><td>kN/m³</td></tr>' +
      (m.adaMAT ? '<tr><td><i>d<sub>w</sub></i></td><td>Kedalaman muka air tanah</td><td class="angka">' + f(m.dw, 1) + '</td><td>m</td></tr>' +
        '<tr><td>γ<sub>sat</sub></td><td>Berat volume jenuh</td><td class="angka">' + f(m.gammaSat, 1) + '</td><td>kN/m³</td></tr>' : '') +
      (pasir ? '' : '<tr><td><i>N<sub>c</sub>, N<sub>S</sub>, k, β</i></td><td>Faktor korelasi lempung</td><td class="angka">' + [f(m.Nc, 1), f(m.Ns, 1), f(m.k, 2), f(m.beta, 2)].join('; ') + '</td><td>–</td></tr>') +
      '</tbody></table></div>';

    h += '<h2>2. Ditanya</h2><ol><li>' + (pasir ? 'Kepadatan relatif dan sudut geser pasir.' : 'Kuat geser undrained, sensitivitas, OCR, rasio kompresi, dan kecepatan gelombang geser lempung.') + '</li></ol>';

    h += '<h2>3. Penyelesaian</h2>';
    h += '<div class="langkah"><h4>a. Satuan dan rasio gesekan</h4>' +
      rumus('q_c = ' + t(m.qc, 1) + '\\times 98{,}07 = ' + t(r.qcKPa, 1) + '\\ \\text{kPa} = ' + t(r.qcMPa, 3) + '\\ \\text{MPa}') +
      rumus('R_f = \\dfrac{f_s}{q_c}\\times 100\\% = \\dfrac{' + t(m.fs, 2) + '}{' + t(m.qc, 1) + '}\\times 100\\% = ' + t(r.Rf, 2) + '\\%') + '</div>';
    h += '<div class="langkah"><h4>b. Tegangan di kedalaman z</h4>' +
      (m.adaMAT && m.dw < m.z
        ? rumus('\\sigma_{vo} = \\gamma d_w + \\gamma_{sat}(z - d_w) = ' + t(r.sv) + '\\ \\text{kPa},\\quad u = 9{,}81(z - d_w) = ' + t(r.u) + '\\ \\text{kPa}')
        : rumus('\\sigma_{vo} = \\gamma z = ' + t(m.gamma, 1) + '\\times' + t(m.z, 1) + ' = ' + t(r.sv) + '\\ \\text{kPa},\\quad u = 0')) +
      rumus('\\sigma\'_{vo} = \\sigma_{vo} - u = ' + t(r.svEf) + '\\ \\text{kPa}') + '</div>';

    if (pasir) {
      h += '<div class="langkah"><h4>c. Kepadatan relatif (Baldi dkk., 1986; hlm. 55–56)</h4>' +
        rumus('D_r = \\dfrac{1}{C_2}\\ln\\!\\left[\\dfrac{q_c}{C_0\\,(\\sigma\'_{vo})^{0{,}55}}\\right] = \\dfrac{1}{2{,}41}\\ln\\!\\left[\\dfrac{' + t(r.qcKPa, 0) + '}{157\\times' + t(r.svEf) + '^{0{,}55}}\\right] = ' + t(r.Dr, 3)) +
        '<p class="ket">Korelasi ini untuk pasir terkonsolidasi normal, dengan q<sub>c</sub> dan σ\'<sub>vo</sub> dalam kPa.</p></div>';
      h += '<div class="langkah"><h4>d. Sudut geser dari tabel (hlm. 56)</h4><p class="ket">q<sub>c</sub> = ' + f(r.qcMPa, 2) + ' MPa masuk baris "' + r.meyerhof[1] + '" di Tabel 5.1 dan "' + r.bergdahl[1] + '" di Tabel 5.2.</p></div>';
    } else {
      var qn = r.qcKPa - r.sv;
      h += '<div class="langkah"><h4>c. Kuat geser undrained (hlm. 57)</h4>' +
        rumus('c_u = \\dfrac{q_c - \\sigma_{vo}}{N_c} = \\dfrac{' + t(r.qcKPa, 1) + ' - ' + t(r.sv) + '}{' + t(m.Nc, 1) + '} = ' + t(r.cu, 1) + '\\ \\text{kPa}') + '</div>';
      h += '<div class="langkah"><h4>d. Sensitivitas (Schmertmann, 1978; hlm. 57)</h4>' +
        rumus('S_t = \\dfrac{N_S}{R_f} = \\dfrac{' + t(m.Ns, 1) + '}{' + t(r.Rf, 2) + '} = ' + t(r.St, 2)) + '</div>';
      h += '<div class="langkah"><h4>e. Rasio overkonsolidasi (hlm. 58)</h4>' +
        rumus('\\sigma\'_p = k\\,(q_t - \\sigma_v) = ' + t(m.k, 2) + '\\times' + t(qn, 1) + ' = ' + t(r.spK, 1) + '\\ \\text{kPa},\\quad OCR = \\dfrac{\\sigma\'_p}{\\sigma\'_v} = ' + t(r.ocrK, 2)) +
        rumus('OCR = 0{,}37\\left(\\dfrac{q_c - \\sigma_o}{\\sigma\'_o}\\right)^{1{,}01} = 0{,}37\\left(\\dfrac{' + t(qn, 1) + '}{' + t(r.svEf) + '}\\right)^{1{,}01} = ' + t(r.ocrMK, 2) + '\\quad\\text{(Mayne dan Kemper, 1988)}') +
        '<p class="ket">Sondir mekanis tidak mengukur tekanan pori, jadi q<sub>t</sub> diambil sama dengan q<sub>c</sub>.</p></div>';
      h += '<div class="langkah"><h4>f. Rasio kompresi (CUR, 1996; hlm. 59)</h4>' +
        rumus('\\dfrac{1}{CR} = \\dfrac{q_c}{2{,}3\\,\\beta\\,\\sigma\'_v} \\Rightarrow CR = \\dfrac{2{,}3\\times' + t(m.beta, 2) + '\\times' + t(r.svEf) + '}{' + t(r.qcKPa, 1) + '} = ' + t(r.CR, 3)) + '</div>';
      h += '<div class="langkah"><h4>g. Kecepatan gelombang geser (Mayne dan Rix, 1995; hlm. 59)</h4>' +
        rumus('v_s = 1{,}75\\,q_c^{0{,}627} = 1{,}75\\times' + t(r.qcKPa, 0) + '^{0{,}627} = ' + t(r.vs, 0) + '\\ \\text{m/s}') + '</div>';
    }

    h += '<h2>4. Hasil dan penjelasan</h2><div class="tabel-gulir"><table><thead><tr><th>Parameter</th><th class="angka">Nilai</th><th>Satuan</th><th>Korelasi</th></tr></thead><tbody>' +
      baris('R<sub>f</sub>', f(r.Rf, 2), '%', 'f<sub>s</sub>/q<sub>c</sub>');
    if (pasir) {
      h += baris('D<sub>r</sub>', f(r.Dr * 100, 1), '%', 'Baldi dkk. (1986)') +
        baris('Kepadatan; D<sub>r</sub>; N-SPT', r.meyerhof[1] + '; ' + r.meyerhof[2] + '; ' + r.meyerhof[3], '–', 'Meyerhof (1956), Tabel 5.1') +
        baris('φ triaksial', r.meyerhof[4], '°', 'Meyerhof (1956), Tabel 5.1') +
        baris('φ\'', r.bergdahl[2], '°', 'Bergdahl dkk. (1993), Tabel 5.2');
    } else {
      h += baris('c<sub>u</sub>', f(r.cu, 1), 'kPa', 'hlm. 57, N<sub>c</sub> = ' + f(m.Nc, 1)) +
        baris('S<sub>t</sub>', f(r.St, 2), '–', 'Schmertmann (1978)') +
        baris('OCR', f(r.ocrK, 2), '–', 'k(q<sub>t</sub> − σ<sub>v</sub>)/σ\'<sub>v</sub>, k = ' + f(m.k, 2)) +
        baris('OCR', f(r.ocrMK, 2), '–', 'Mayne dan Kemper (1988)') +
        baris('CR', f(r.CR, 3), '–', 'CUR (1996), β = ' + f(m.beta, 2)) +
        baris('v<sub>s</sub>', f(r.vs, 0), 'm/s', 'Mayne dan Rix (1995)');
    }
    h += baris('N-SPT ≈ q<sub>c</sub>/4 <span class="redup">[BELUM TERVERIFIKASI]</span>', f(r.N, 0), '–', 'Meyerhof (1956), hlm. 60; satuan q<sub>c</sub> tidak ditulis di buku, dipakai kg/cm²') +
      '</tbody></table></div>';
    h += '<p>' + (pasir
      ? 'Tabel 5.1 dan 5.2 memberi rentang, bukan satu angka. Nilai D<sub>r</sub> dari Baldi dkk. bisa dibandingkan dengan kolom D<sub>r</sub> Tabel 5.1 untuk melihat apakah keduanya sejalan.'
      : 'Dua cara OCR memberi ' + f(r.ocrK, 2) + ' dan ' + f(r.ocrMK, 2) + '. OCR mendekati 1 berarti lempung terkonsolidasi normal; makin besar, makin terkonsolidasi lebih.') + '</p>';

    h += '<h2>5. Catatan</h2><ul><li>Semua korelasi bersifat empiris dan hanya untuk perkiraan awal.</li>' +
      '<li>Hubungan N-SPT dengan q<sub>c</sub> sangat dipengaruhi kondisi setempat (hlm. 60).</li>' +
      r.peringatan.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>';
    el.innerHTML = h;
  }

  function perbarui() {
    var m = salin(keadaan);
    var r = KorelasiCPT.hitung(m);
    gambarRingkas(m, r);
    gambarHasil(m, r);
    U.simpanKeHash(keadaan);
  }

  function mulai() {
    keadaan = U.bacaHash(function (o) { return typeof o.tanah === 'string' && U.tanpaHTML(o); }) || salin(CONTOH);
    if (['pasir', 'lempung'].indexOf(keadaan.tanah) < 0) keadaan.tanah = 'pasir';
    if (!KorelasiCPT.BETA.hasOwnProperty(keadaan.jenisBeta)) keadaan.jenisBeta = 'lempung-murni';
    isiFormulir();
    ANGKA.forEach(function (k) {
      $(k).addEventListener('input', function () { keadaan[k] = parseFloat($(k).value); perbarui(); });
    });
    $('tanah').addEventListener('change', function () { keadaan.tanah = $('tanah').value; aturAktif(); perbarui(); });
    $('jenisBeta').addEventListener('change', function () {
      keadaan.jenisBeta = $('jenisBeta').value;
      var b = KorelasiCPT.BETA[keadaan.jenisBeta];
      keadaan.beta = Math.round((b[0] + b[1]) / 2 * 100) / 100;
      $('beta').value = keadaan.beta;
      perbarui();
    });
    $('adaMAT').addEventListener('change', function () { keadaan.adaMAT = $('adaMAT').checked; aturAktif(); perbarui(); });
    $('muatContoh').addEventListener('click', function () { keadaan = salin(CONTOH); isiFormulir(); perbarui(); });
    $('bagikan').addEventListener('click', function () { U.simpanKeHash(keadaan); U.salinTautan($('pesanBagikan')); });
    perbarui();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})();
