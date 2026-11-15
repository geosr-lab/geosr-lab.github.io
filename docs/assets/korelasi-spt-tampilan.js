/* Tampilan kalkulator korelasi parameter tanah dari N-SPT. Rumus di korelasi-spt-hitung.js. */
(function () {
  'use strict';

  var U = window.Umum;
  var $ = U.$, f = U.f, t = U.t, rumus = U.rumus, salin = U.salin;
  var CONTOH = { tanah: 'pasir', NM: 18, Ef: 70, bor: '65-115', batang: 7, CS: 1, z: 6, gamma: 18, adaMAT: true, dw: 2, gammaSat: 19.5, PI: 25 };
  var ANGKA = ['NM', 'Ef', 'batang', 'CS', 'z', 'gamma', 'dw', 'gammaSat', 'PI'];
  var NAMA_E = { halus: 'pasir bertanah halus', nc: 'pasir bersih terkonsolidasi normal', oc: 'pasir bersih terkonsolidasi lebih' };
  var keadaan;

  function isiFormulir() {
    ANGKA.forEach(function (k) { $(k).value = keadaan[k]; });
    $('tanah').value = keadaan.tanah;
    $('bor').value = keadaan.bor;
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
      '<div><dt>N<sub>60</sub></dt><dd>' + f(r.N60, 1) + '</dd></div>' +
      '<div><dt>(N<sub>1</sub>)<sub>60</sub></dt><dd>' + f(r.N160, 1) + '</dd></div>';
    if (m.tanah === 'pasir') {
      h += '<div><dt>D<sub>r</sub></dt><dd>' + f(Math.min(r.Dr, 100), 0) + '%</dd></div>' +
        '<div><dt>φ</dt><dd>' + f(r.phiHatanaka, 1) + '°</dd></div>' +
        '<div><dt>Kepadatan</dt><dd>' + r.tp[1] + '</dd></div>';
    } else {
      h += '<div><dt>c<sub>u</sub></dt><dd>' + f(r.cu, 0) + ' kPa</dd></div>' +
        '<div><dt>Konsistensi</dt><dd>' + r.tp[1] + '</dd></div>';
    }
    h += '<div><dt>v<sub>s</sub></dt><dd>' + f(r.vs, 0) + ' m/s</dd></div></dl>';
    $('ringkas').innerHTML = h;
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
      '<tr><td><i>N<sub>M</sub></i></td><td>N-SPT terukur</td><td class="angka">' + f(m.NM, 0) + '</td><td>pukulan/30 cm</td></tr>' +
      '<tr><td><i>E<sub>f</sub></i></td><td>Efisiensi palu</td><td class="angka">' + f(m.Ef, 0) + '</td><td>%</td></tr>' +
      '<tr><td>–</td><td>Diameter lubang bor</td><td class="angka">' + $('bor').options[$('bor').selectedIndex].text + '</td><td></td></tr>' +
      '<tr><td>–</td><td>Panjang batang</td><td class="angka">' + f(m.batang, 1) + '</td><td>m</td></tr>' +
      '<tr><td><i>z</i></td><td>Kedalaman uji</td><td class="angka">' + f(m.z, 1) + '</td><td>m</td></tr>' +
      '<tr><td>γ</td><td>Berat volume tanah</td><td class="angka">' + f(m.gamma, 1) + '</td><td>kN/m³</td></tr>' +
      (m.adaMAT ? '<tr><td><i>d<sub>w</sub></i></td><td>Kedalaman muka air tanah</td><td class="angka">' + f(m.dw, 1) + '</td><td>m</td></tr>' +
        '<tr><td>γ<sub>sat</sub></td><td>Berat volume jenuh</td><td class="angka">' + f(m.gammaSat, 1) + '</td><td>kN/m³</td></tr>' : '') +
      (pasir ? '' : '<tr><td>PI</td><td>Indeks plastisitas</td><td class="angka">' + f(m.PI, 0) + '</td><td>%</td></tr>') +
      '</tbody></table></div>';

    h += '<h2>2. Ditanya</h2><ol><li>N<sub>60</sub> dan (N<sub>1</sub>)<sub>60</sub>.</li><li>' +
      (pasir ? 'Kepadatan relatif, sudut geser, dan modulus elastisitas pasir.' : 'Kuat geser undrained dan konsistensi lempung.') +
      '</li><li>Kecepatan gelombang geser v<sub>s</sub>.</li></ol>';

    h += '<h2>3. Penyelesaian</h2>';
    var sv = r.sv;
    h += '<div class="langkah"><h4>a. Tegangan vertikal efektif di kedalaman uji</h4>' +
      (m.adaMAT && m.dw < m.z
        ? rumus('\\sigma\'_{vo} = \\gamma d_w + (\\gamma_{sat} - \\gamma_w)(z - d_w) = ' + t(m.gamma, 1) + '\\times' + t(m.dw, 1) + ' + (' + t(m.gammaSat, 1) + ' - 9{,}81)(' + t(m.z, 1) + ' - ' + t(m.dw, 1) + ') = ' + t(sv) + '\\ \\text{kPa}')
        : rumus('\\sigma\'_{vo} = \\gamma z = ' + t(m.gamma, 1) + '\\times' + t(m.z, 1) + ' = ' + t(sv) + '\\ \\text{kPa}')) + '</div>';
    h += '<div class="langkah"><h4>b. Koreksi energi dan alat (hlm. 43–44, Tabel 4.1)</h4>' +
      rumus('C_E = \\tfrac{E_f}{60} = \\tfrac{' + t(m.Ef, 0) + '}{60} = ' + t(r.CE, 3) + ',\\quad C_B = ' + t(r.CB) + ',\\quad C_R = ' + t(r.CR) + ',\\quad C_S = ' + t(r.CS)) +
      rumus('N_{60} = N_M\\,C_E C_B C_R C_S = ' + t(m.NM, 0) + '\\times' + t(r.CE, 3) + '\\times' + t(r.CB) + '\\times' + t(r.CR) + '\\times' + t(r.CS) + ' = ' + t(r.N60)) +
      '<p class="ket">Bila C<sub>B</sub> = C<sub>R</sub> = C<sub>S</sub> = 1, rumus ini sama dengan N<sub>60</sub> = (E<sub>f</sub>/60) N<sub>M</sub> di hlm. 43.</p></div>';
    h += '<div class="langkah"><h4>c. Koreksi tegangan efektif (hlm. 44)</h4>' +
      rumus('C_N = \\dfrac{2{,}2}{1{,}2 + \\sigma\'_{vo}/P_a} = \\dfrac{2{,}2}{1{,}2 + ' + t(sv) + '/101{,}3} = ' + t(r.CNmentah, 3) + (r.CNmentah > 1.7 ? '\\ \\Rightarrow\\ C_N = 1{,}70' : '\\ \\le 1{,}70')) +
      rumus('(N_1)_{60} = C_N\\,N_{60} = ' + t(r.CN, 3) + '\\times' + t(r.N60) + ' = ' + t(r.N160)) + '</div>';

    if (pasir) {
      h += '<div class="langkah"><h4>d. Kepadatan relatif (Bowles, 1996; hlm. 46)</h4>' +
        rumus('D_r = 25\\,(\\sigma\'_o)^{-0{,}12} N_{60}^{0{,}46} = 25\\times' + t(sv) + '^{-0{,}12}\\times' + t(r.N60) + '^{0{,}46} = ' + t(r.Dr, 1) + '\\%') + '</div>';
      h += '<div class="langkah"><h4>e. Sudut geser (hlm. 46)</h4>' +
        rumus('\\phi = 28 + 0{,}15 D_r = 28 + 0{,}15\\times' + t(Math.min(r.Dr, 100), 1) + ' = ' + t(28 + 0.15 * Math.min(r.Dr, 100), 1) + '^\\circ\\quad\\text{(Meyerhof, 1959)}') +
        rumus('\\phi = \\sqrt{20\\,(N_1)_{60}} + 20 = \\sqrt{20\\times' + t(r.N160) + '} + 20 = ' + t(r.phiHatanaka, 1) + '^\\circ\\quad\\text{(Hatanaka dan Uchida, 1996)}') + '</div>';
      h += '<div class="langkah"><h4>f. Modulus elastisitas (Kulhawy dan Mayne, 1990; hlm. 47)</h4>' +
        rumus('E = k\\,N_{60}\\,P_a,\\quad k = 5,\\ 10,\\ 15') + '</div>';
    } else {
      h += '<div class="langkah"><h4>d. Kuat geser undrained (Stroud, 1975; hlm. 48)</h4>' +
        '<p class="ket">α\' dari Tabel 4.6 dengan interpolasi linear terhadap PI = ' + f(m.PI, 0) + '%.</p>' +
        rumus('c_u = \\alpha\' N_{60} P_a = ' + t(r.alfa, 4) + '\\times' + t(r.N60) + '\\times 101{,}3 = ' + t(r.cu, 1) + '\\ \\text{kPa}') + '</div>';
    }
    h += '<div class="langkah"><h4>' + (pasir ? 'g' : 'e') + '. Kecepatan gelombang geser (Imai, 1977; Tabel 4.7, hlm. 50)</h4>' +
      rumus('v_s = ' + t(r.imai[0], 1) + '\\,N^{' + t(r.imai[1], 3) + '} = ' + t(r.imai[0], 1) + '\\times' + t(r.N60) + '^{' + t(r.imai[1], 3) + '} = ' + t(r.vs, 0) + '\\ \\text{m/s}') +
      '<p class="ket">Tabel 4.7 tidak merinci koreksi N; di sini dipakai N<sub>60</sub>.</p></div>';

    h += '<h2>4. Hasil dan penjelasan</h2><div class="tabel-gulir"><table><thead><tr><th>Parameter</th><th class="angka">Nilai</th><th>Satuan</th><th>Korelasi</th></tr></thead><tbody>' +
      baris('N<sub>60</sub>', f(r.N60, 1), '–', 'hlm. 43–44') +
      baris('(N<sub>1</sub>)<sub>60</sub>', f(r.N160, 1), '–', 'hlm. 44');
    if (pasir) {
      h += baris('Kepadatan (dari N<sub>60</sub>)', r.tp[1], '', 'Terzaghi dan Peck (1967), Tabel 4.2') +
        baris('D<sub>r</sub>', f(Math.min(r.Dr, 100), 1), '%', 'Bowles (1996)') +
        baris('φ', f(28 + 0.15 * Math.min(r.Dr, 100), 1), '°', 'Meyerhof (1959)') +
        baris('φ', f(r.phiHatanaka, 1), '°', 'Hatanaka dan Uchida (1996)') +
        Object.keys(r.E).map(function (k) { return baris('E (' + NAMA_E[k] + ')', f(r.E[k] / 1000, 1), 'MPa', 'Kulhawy dan Mayne (1990)'); }).join('') +
        baris('Rentang D<sub>r</sub> dari (N<sub>1</sub>)<sub>60</sub>', r.bowles[2], '–', 'Bowles (1977), Tabel 4.3: ' + r.bowles[1]) +
        baris('Rentang φ', r.bowles[3], '°', 'Bowles (1977), Tabel 4.3') +
        baris('Rentang γ', r.bowles[4], 'kN/m³', 'Bowles (1977), Tabel 4.3');
    } else {
      h += baris('c<sub>u</sub>', f(r.cu, 1), 'kPa', 'Stroud (1975), α\' = ' + f(r.alfa, 4)) +
        baris('Konsistensi; rentang c<sub>u</sub>', r.tp[1] + '; ' + r.tp[2], 'kPa', 'Terzaghi dan Peck (1967), Tabel 4.4') +
        baris('Konsistensi; CI; rentang c<sub>u</sub>', r.szechy[2] + '; ' + r.szechy[1] + '; ' + r.szechy[3], 'kPa', 'Szechy dan Varga (1978), Tabel 4.5');
    }
    h += baris('v<sub>s</sub> (' + (pasir ? 'pasir' : 'lempung') + ')', f(r.vs, 0), 'm/s', 'Imai (1977)') +
      baris('v<sub>s</sub> (semua tanah)', f(r.vsSemua, 0), 'm/s', 'Imai (1977)') + '</tbody></table></div>';
    h += '<p>' + (pasir
      ? 'Dua korelasi sudut geser memberi ' + f(28 + 0.15 * Math.min(r.Dr, 100), 1) + '° dan ' + f(r.phiHatanaka, 1) + '°. Selisihnya menunjukkan sebaran korelasi empiris; pilih nilai desain dengan membandingkan rentang Tabel 4.3 dan hasil uji laboratorium.'
      : 'Nilai c<sub>u</sub> dari Stroud (' + f(r.cu, 0) + ' kPa) dapat dibandingkan dengan rentang Tabel 4.4 (' + r.tp[2] + ' kPa). Bila jauh berbeda, periksa PI dan kualitas data N.') + '</p>';

    h += '<h2>5. Catatan</h2><ul>' +
      '<li>Semua korelasi bersifat empiris dan hanya untuk perkiraan awal.</li>' +
      '<li>P<sub>a</sub> = 101,3 kPa (tekanan atmosfer).</li>' +
      (pasir ? '<li>Rumus D<sub>r</sub> Bowles (1996) memakai σ\'<sub>o</sub> dalam kN/m² dan anggapan N ≈ N<sub>60</sub> (hlm. 46).</li>'
        : '<li>Korelasi Stroud hanya berlaku untuk tanah lempung (hlm. 48).</li>') +
      r.peringatan.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>';
    el.innerHTML = h;
  }

  function perbarui() {
    var m = salin(keadaan);
    var r = KorelasiSPT.hitung(m);
    gambarRingkas(m, r);
    gambarHasil(m, r);
    U.simpanKeHash(keadaan);
  }

  function mulai() {
    keadaan = U.bacaHash(function (o) { return typeof o.tanah === 'string' && U.tanpaHTML(o); }) || salin(CONTOH);
    if (['pasir', 'lempung'].indexOf(keadaan.tanah) < 0) keadaan.tanah = 'pasir';
    if (!KorelasiSPT.CB.hasOwnProperty(keadaan.bor)) keadaan.bor = '65-115';
    isiFormulir();
    ANGKA.forEach(function (k) {
      $(k).addEventListener('input', function () { keadaan[k] = parseFloat($(k).value); perbarui(); });
    });
    $('tanah').addEventListener('change', function () { keadaan.tanah = $('tanah').value; aturAktif(); perbarui(); });
    $('bor').addEventListener('change', function () { keadaan.bor = $('bor').value; perbarui(); });
    $('adaMAT').addEventListener('change', function () { keadaan.adaMAT = $('adaMAT').checked; aturAktif(); perbarui(); });
    $('muatContoh').addEventListener('click', function () { keadaan = salin(CONTOH); isiFormulir(); perbarui(); });
    $('bagikan').addEventListener('click', function () { U.simpanKeHash(keadaan); U.salinTautan($('pesanBagikan')); });
    perbarui();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})();
