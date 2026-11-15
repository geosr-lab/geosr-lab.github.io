/* Tampilan kalkulator kapasitas lateral tiang metode Broms. Rumus di broms-lateral-hitung.js. */
(function () {
  'use strict';

  var U = window.Umum;
  var $ = U.$, f = U.f, t = U.t, rumus = U.rumus, salin = U.salin, KN_PER_TON = U.KN_PER_TON;
  var CONTOH = { tanah: 'kohesif', kepala: 'bebas', b: 0.6, L: 8, e: 0.5, cu: 40, gamma: 18, phi: 32, My: 450, FS: 2.5 };
  var ANGKA = ['b', 'L', 'e', 'cu', 'gamma', 'phi', 'My', 'FS'];
  var NAMA_MODA = { pendek: 'tiang pendek (tanah runtuh)', menengah: 'tiang menengah (sendi plastis di kepala)', panjang: 'tiang panjang (sendi plastis)' };
  var keadaan;

  function isiFormulir() {
    ANGKA.forEach(function (k) { $(k).value = keadaan[k]; });
    $('tanah').value = keadaan.tanah;
    $('kepala').value = keadaan.kepala;
    aturAktif();
  }

  function aturAktif() {
    var kohesif = keadaan.tanah === 'kohesif';
    Array.prototype.forEach.call(document.querySelectorAll('.isi-kohesif'), function (el) { el.hidden = !kohesif; });
    Array.prototype.forEach.call(document.querySelectorAll('.isi-nonkohesif'), function (el) { el.hidden = kohesif; });
  }

  // ---------- Sketsa tiang dan distribusi reaksi tanah ----------
  function gambarSketsa(m, r) {
    var W = 280, H = 300, tanahY = 70, x = 112, lebar = 18;
    var skala = 200 / Math.max(m.L, 0.5), yUjung = tanahY + m.L * skala;
    var eY = Math.max(tanahY - Math.min(m.e * skala, 56), 14);
    var kohesif = m.tanah === 'kohesif';
    var s = '<svg class="profil-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sketsa tiang dengan beban lateral dan reaksi tanah">';
    s += '<rect x="10" y="' + tanahY + '" width="' + (W - 20) + '" height="' + (H - tanahY - 10) + '" style="fill:var(--' + (kohesif ? 'lempung' : 'pasir') + ');opacity:.55"/>';
    s += '<line x1="10" x2="' + (W - 10) + '" y1="' + tanahY + '" y2="' + tanahY + '" style="stroke:var(--teks);stroke-width:2"/>';
    // reaksi tanah di depan tiang (sisi kanan)
    var x0 = x + lebar, lebarMaks = 96, y15 = tanahY + Math.min(1.5 * m.b * skala, yUjung - tanahY);
    if (kohesif) {
      s += '<rect x="' + x0 + '" y="' + y15 + '" width="' + lebarMaks * 0.7 + '" height="' + Math.max(yUjung - y15, 0) + '" style="fill:var(--aksen);opacity:.22;stroke:var(--aksen)"/>';
      s += '<line x1="' + (x0 + 4) + '" x2="' + (x0 + 4) + '" y1="' + tanahY + '" y2="' + y15 + '" style="stroke:var(--teks)"/>';
      s += '<text x="' + (x0 + 10) + '" y="' + ((tanahY + y15) / 2 + 4) + '" font-size="11" style="fill:var(--teks)">1,5b</text>';
      s += '<text x="' + (x0 + 8) + '" y="' + (y15 + 18) + '" font-size="12" font-weight="700" style="fill:var(--teks)">9 c<tspan font-size="9" dy="3">u</tspan><tspan dy="-3"> b</tspan></text>';
    } else {
      s += '<path d="M' + x0 + ' ' + tanahY + 'L' + (x0 + lebarMaks) + ' ' + yUjung + 'L' + x0 + ' ' + yUjung + 'z" style="fill:var(--aksen);opacity:.22;stroke:var(--aksen)"/>';
      s += '<text x="' + (x0 + 8) + '" y="' + (yUjung - 10) + '" font-size="12" font-weight="700" style="fill:var(--teks)">3 γ b L K<tspan font-size="9" dy="3">p</tspan></text>';
    }
    // tiang
    s += '<rect x="' + x + '" y="' + eY + '" width="' + lebar + '" height="' + (yUjung - eY) + '" style="fill:var(--tiang);stroke:var(--teks)"/>';
    if (m.kepala === 'terjepit') {
      s += '<rect x="' + (x - 26) + '" y="' + (eY - 14) + '" width="' + (lebar + 52) + '" height="14" style="fill:var(--tiang);stroke:var(--teks)"/>';
      s += '<text x="' + (x + lebar / 2) + '" y="' + (eY - 19) + '" text-anchor="middle" font-size="10" style="fill:var(--teks)">kepala terjepit</text>';
    }
    // beban
    s += '<line x1="' + (x - 62) + '" x2="' + (x - 8) + '" y1="' + eY + '" y2="' + eY + '" style="stroke:var(--laterit);stroke-width:2.5"/>';
    s += '<path d="M' + (x - 10) + ' ' + (eY - 6) + 'l9 6l-9 6z" style="fill:var(--laterit)"/>';
    s += '<text x="' + (x - 64) + '" y="' + (eY - 6) + '" font-size="12" font-weight="700" style="fill:var(--teks)">P</text>';
    // ukuran e dan L
    var xu = x - 18;
    if (m.e > 0) {
      var xe = x + lebar + 8;
      s += '<line x1="' + xe + '" x2="' + xe + '" y1="' + eY + '" y2="' + tanahY + '" style="stroke:var(--teks)"/>';
      s += '<text x="' + (xe + 6) + '" y="' + Math.min((eY + tanahY) / 2 + 4, tanahY - 3) + '" font-size="11" style="fill:var(--teks)">e = ' + f(m.e) + ' m</text>';
    }
    s += '<line x1="' + xu + '" x2="' + xu + '" y1="' + tanahY + '" y2="' + yUjung + '" style="stroke:var(--teks)"/>';
    s += '<text x="' + (xu - 4) + '" y="' + ((tanahY + yUjung) / 2 + 4) + '" text-anchor="end" font-size="11" font-weight="700" style="fill:var(--teks)">L = ' + f(m.L) + ' m</text>';
    if (r && !r.galat.length) {
      s += '<text x="' + (W - 14) + '" y="' + (H - 16) + '" text-anchor="end" font-size="11" style="fill:var(--teks)">' +
        (kohesif ? 'c<tspan font-size="8" dy="3">u</tspan><tspan dy="-3"> = ' + f(m.cu, 0) + ' kPa</tspan>' : 'φ = ' + f(m.phi, 0) + '° · K<tspan font-size="8" dy="3">p</tspan><tspan dy="-3"> = ' + f(r.Kp, 3) + '</tspan>') + '</text>';
    }
    s += '</svg>';
    $('sketsa').innerHTML = s;
  }

  // ---------- Grafik Pult terhadap L ----------
  function grafik(m, r) {
    var titik = BromsLateral.kurva(m, r.Lmaks, 160);
    var W = 640, H = 300, kiri = 62, kanan = 16, atas = 16, bawah = 44;
    var Pmaks = Math.max.apply(null, titik.map(function (p) { return p.P; })) * 1.08;
    var X = function (L) { return kiri + L / r.Lmaks * (W - kiri - kanan); };
    var Y = function (P) { return H - bawah - P / Pmaks * (H - atas - bawah); };
    var warna = { pendek: 'var(--lapis-3)', menengah: 'var(--lapis-4)', panjang: 'var(--aksen)' };
    var s = '<svg class="grafik-broms" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Grafik beban lateral ultimit terhadap panjang tiang">';
    var langkahP = Math.pow(10, Math.floor(Math.log10(Pmaks / 4))), n = Math.ceil(Pmaks / langkahP / 5) * langkahP;
    for (var p = 0; p <= Pmaks; p += n) {
      s += '<line x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + Y(p) + '" y2="' + Y(p) + '" style="stroke:var(--garis)"/>';
      s += '<text x="' + (kiri - 6) + '" y="' + (Y(p) + 4) + '" text-anchor="end" font-size="11" style="fill:var(--teks-2)">' + f(p, 0) + '</text>';
    }
    var langkahL = r.Lmaks > 40 ? 10 : r.Lmaks > 16 ? 5 : 2;
    for (var L = 0; L <= r.Lmaks; L += langkahL) {
      s += '<text x="' + X(L) + '" y="' + (H - bawah + 16) + '" text-anchor="middle" font-size="11" style="fill:var(--teks-2)">' + f(L, 0) + '</text>';
    }
    s += '<line x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" style="stroke:var(--teks)"/>';
    s += '<line x1="' + kiri + '" x2="' + kiri + '" y1="' + atas + '" y2="' + Y(0) + '" style="stroke:var(--teks)"/>';
    s += '<text x="' + ((kiri + W - kanan) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12" style="fill:var(--teks)">Panjang tertanam L (m)</text>';
    s += '<text x="14" y="' + ((atas + H - bawah) / 2) + '" text-anchor="middle" font-size="12" transform="rotate(-90 14 ' + ((atas + H - bawah) / 2) + ')" style="fill:var(--teks)">P<tspan font-size="9" dy="3">ult</tspan><tspan dy="-3"> (kN)</tspan></text>';
    // garis per moda
    var seg = [], kini = null;
    titik.forEach(function (q) {
      if (!kini || kini.moda !== q.moda) { if (kini) kini.p.push(q); kini = { moda: q.moda, p: [] }; seg.push(kini); }
      kini.p.push(q);
    });
    seg.forEach(function (sg) {
      s += '<polyline fill="none" style="stroke:' + warna[sg.moda] + ';stroke-width:3" points="' + sg.p.map(function (q) { return X(q.L).toFixed(1) + ',' + Y(q.P).toFixed(1); }).join(' ') + '"/>';
    });
    r.peralihan.forEach(function (b) {
      s += '<line x1="' + X(b.L) + '" x2="' + X(b.L) + '" y1="' + atas + '" y2="' + Y(0) + '" style="stroke:var(--teks-2);stroke-dasharray:4 4"/>';
      s += '<text x="' + (X(b.L) + 4) + '" y="' + (atas + 12) + '" font-size="11" style="fill:var(--teks-2)">L = ' + f(b.L) + ' m</text>';
    });
    s += '<circle cx="' + X(m.L) + '" cy="' + Y(r.Pult) + '" r="6" style="fill:var(--permukaan);stroke:var(--teks);stroke-width:2"/>';
    s += '</svg>';
    var legenda = Object.keys(warna).filter(function (k) { return seg.some(function (sg) { return sg.moda === k; }); }).map(function (k) {
      return '<span><i style="background:' + warna[k] + '"></i>' + NAMA_MODA[k] + '</span>';
    }).join('');
    return '<figure class="grafik-kalk">' + s + '<figcaption class="legenda-broms">' + legenda + '<span><i class="titik"></i>tiang yang dihitung</span></figcaption></figure>';
  }

  // ---------- Langkah hitungan per moda ----------
  function langkahModa(m, r, c) {
    var b = m.b, e = m.e, kohesif = m.tanah === 'kohesif', h = '';
    if (kohesif) {
      var k = 9 * m.cu * b, A = m.L - 1.5 * b;
      if (c.moda === 'pendek' && m.kepala === 'bebas') {
        h += '<p class="ket">Tanah runtuh sebelum tiang leleh. Momen maksimum di kedalaman 1,5b + f dihitung dari bagian atas (7.3) dan bagian bawah (7.4) diagram geser, dengan f = P/(9c<sub>u</sub>b) (7.2) dan L = 1,5b + f + g (7.5):</p>' +
          rumus('P\\,(e + 1{,}5b + 0{,}5f) = 2{,}25\\,c_u b\\,g^2') +
          rumus('P = ' + t(c.P) + '\\ \\text{kN},\\quad f = \\tfrac{P}{9 c_u b} = \\tfrac{' + t(c.P) + '}{' + t(k) + '} = ' + t(c.f) + '\\ \\text{m},\\quad g = ' + t(A) + ' - ' + t(c.f) + ' = ' + t(c.g) + '\\ \\text{m}') +
          rumus('M_{maks} = ' + t(c.P) + '\\,(' + t(e) + ' + ' + t(1.5 * b) + ' + ' + t(0.5 * c.f) + ') = ' + t(c.M) + '\\ \\text{kN·m}');
      } else if (c.moda === 'panjang' && m.kepala === 'bebas') {
        h += '<p class="ket">Sendi plastis terbentuk di kedalaman 1,5b + f. Pers. (7.3) dengan M<sub>maks</sub> = M<sub>y</sub>:</p>' +
          rumus('M_y = P\\,\\left(e + 1{,}5b + 0{,}5\\tfrac{P}{9c_u b}\\right) \\Rightarrow ' + t(m.My) + ' = P\\,\\left(' + t(e + 1.5 * b) + ' + \\tfrac{P}{' + t(2 * k) + '}\\right)') +
          rumus('P = ' + t(c.P) + '\\ \\text{kN},\\quad f = ' + t(c.f) + '\\ \\text{m}');
      } else if (c.moda === 'pendek') {
        h += '<p class="ket">Tiang bergeser utuh; reaksi penuh di bawah 1,5b teratas (7.6):</p>' +
          rumus('P = 9 c_u b\\,(L - 1{,}5b) = ' + t(k) + '\\times(' + t(m.L) + ' - ' + t(1.5 * b) + ') = ' + t(c.P) + '\\ \\text{kN}') +
          rumus('M_{kepala} = P L - 9c_u b\\,\\tfrac{(L - 1{,}5b)^2}{2} = ' + t(c.M) + '\\ \\text{kN·m}');
      } else if (c.moda === 'menengah') {
        h += '<p class="ket">Sendi plastis di kepala tiang (momen = M<sub>y</sub>), tanah runtuh di bawahnya. Pers. (7.7)–(7.10):</p>' +
          rumus('P\\,(1{,}5b + 0{,}5f) - M_y = 2{,}25\\,c_u b\\,g^2,\\quad f = \\tfrac{P}{9c_u b},\\quad g = L - 1{,}5b - f') +
          rumus('P = ' + t(c.P) + '\\ \\text{kN},\\quad f = ' + t(c.f) + '\\ \\text{m},\\quad g = ' + t(c.g) + '\\ \\text{m}');
      } else {
        h += '<p class="ket">Dua sendi plastis: di kepala dan di kedalaman 1,5b + f. Pers. (7.10)–(7.11):</p>' +
          rumus('P = \\dfrac{2M_y}{1{,}5b + 0{,}5f} = \\dfrac{2\\times' + t(m.My) + '}{' + t(1.5 * b) + ' + 0{,}5\\times' + t(c.f) + '} = ' + t(c.P) + '\\ \\text{kN}');
      }
    } else {
      var G = m.gamma * b * r.Kp;
      if (c.moda === 'pendek' && m.kepala === 'bebas') {
        h += '<p class="ket">Tanah runtuh; momen terhadap ujung tiang (7.16), lalu kedalaman geser nol (7.19) dan momen maksimum (7.20):</p>' +
          rumus('P = \\dfrac{\\gamma b L^3 K_p}{2(e + L)} = \\dfrac{' + t(m.gamma, 1) + '\\times' + t(b) + '\\times' + t(m.L) + '^3\\times' + t(r.Kp, 3) + '}{2(' + t(e) + ' + ' + t(m.L) + ')} = ' + t(c.P) + '\\ \\text{kN}') +
          rumus('f = 0{,}816\\sqrt{\\tfrac{P}{\\gamma b K_p}} = ' + t(c.f) + '\\ \\text{m},\\quad M_{maks} = P(e + f) - \\tfrac{P f}{3} = ' + t(c.M) + '\\ \\text{kN·m}');
      } else if (c.moda === 'panjang' && m.kepala === 'bebas') {
        h += '<p class="ket">Sendi plastis di kedalaman f. Pers. (7.21), diselesaikan berulang:</p>' +
          rumus('P = \\dfrac{M_y}{e + 0{,}544\\sqrt{P/(\\gamma b K_p)}} = \\dfrac{' + t(m.My) + '}{' + t(e) + ' + 0{,}544\\sqrt{P/' + t(G, 3) + '}} \\Rightarrow P = ' + t(c.P) + '\\ \\text{kN}');
      } else if (c.moda === 'pendek') {
        h += '<p class="ket">Tiang bergeser utuh; reaksi penuh sepanjang tiang (7.22):</p>' +
          rumus('P = 1{,}5\\,\\gamma L^2 b K_p = 1{,}5\\times' + t(m.gamma, 1) + '\\times' + t(m.L) + '^2\\times' + t(b) + '\\times' + t(r.Kp, 3) + ' = ' + t(c.P) + '\\ \\text{kN}');
      } else if (c.moda === 'menengah') {
        h += '<p class="ket">Sendi plastis di kepala, tanah runtuh di bawahnya (7.23):</p>' +
          rumus('P = \\dfrac{M_y}{L} + 0{,}5\\,\\gamma b L^2 K_p = \\dfrac{' + t(m.My) + '}{' + t(m.L) + '} + 0{,}5\\times' + t(G, 3) + '\\times' + t(m.L) + '^2 = ' + t(c.P) + '\\ \\text{kN}');
      } else {
        h += '<p class="ket">Dua sendi plastis, di kepala dan di kedalaman f. Pers. (7.24)–(7.25) dengan M<sub>y</sub><sup>+</sup> = M<sub>y</sub><sup>−</sup> = M<sub>y</sub>:</p>' +
          rumus('P = \\dfrac{2M_y}{e + 0{,}544\\sqrt{P/(\\gamma b K_p)}} = \\dfrac{2\\times' + t(m.My) + '}{' + t(e) + ' + 0{,}544\\sqrt{P/' + t(G, 3) + '}} \\Rightarrow P = ' + t(c.P) + '\\ \\text{kN}');
      }
    }
    return h;
  }

  // ---------- Hasil ----------
  function gambarHasil(m, r) {
    var el = $('hasil');
    if (r.galat.length) {
      el.innerHTML = '<h2>Hasil</h2>' + r.galat.map(function (g) { return '<div class="catatan galat">' + g + '</div>'; }).join('');
      return;
    }
    var kohesif = m.tanah === 'kohesif', c = r.menentukan, h = '';
    h += '<h2>Ringkasan</h2><div class="ringkasan">' +
      '<div class="kartu"><div class="redup kecil" style="font-weight:700">Beban lateral ultimit</div><div class="nilai-besar">' + f(r.Pult, 1) + ' <small>kN</small></div><div class="redup kecil">P<sub>ult</sub> ≈ ' + f(r.Pult / KN_PER_TON, 2) + ' ton</div></div>' +
      '<div class="kartu"><div class="redup kecil" style="font-weight:700">Beban lateral izin</div><div class="nilai-besar">' + f(r.Pizin, 1) + ' <small>kN</small></div><div class="redup kecil">P<sub>ult</sub>/FS, FS = ' + f(m.FS, 1) + '</div></div>' +
      '<div class="kartu"><div class="redup kecil" style="font-weight:700">Moda yang menentukan</div><div class="nilai-besar" style="font-size:22px">' + c.moda[0].toUpperCase() + c.moda.slice(1) + '</div><div class="redup kecil">' + NAMA_MODA[c.moda] + '</div></div>' +
      '</div>';
    r.peringatan.forEach(function (p) { h += '<div class="catatan">' + p + '</div>'; });

    h += '<h2>1. Diketahui</h2><div class="tabel-gulir"><table><thead><tr><th>Simbol</th><th>Besaran</th><th class="angka">Nilai</th><th>Satuan</th></tr></thead><tbody>' +
      '<tr><td>–</td><td>Kepala tiang</td><td class="angka">' + (m.kepala === 'bebas' ? 'bebas' : 'terjepit') + '</td><td></td></tr>' +
      '<tr><td><i>b</i></td><td>Diameter atau lebar tiang</td><td class="angka">' + f(m.b) + '</td><td>m</td></tr>' +
      '<tr><td><i>L</i></td><td>Panjang tertanam</td><td class="angka">' + f(m.L) + '</td><td>m</td></tr>' +
      '<tr><td><i>e</i></td><td>Tinggi beban di atas muka tanah</td><td class="angka">' + f(m.e) + '</td><td>m</td></tr>' +
      '<tr><td><i>M<sub>y</sub></i></td><td>Momen leleh tiang</td><td class="angka">' + f(m.My, 1) + '</td><td>kN·m</td></tr>' +
      (kohesif ? '<tr><td><i>c<sub>u</sub></i></td><td>Kuat geser undrained</td><td class="angka">' + f(m.cu, 1) + '</td><td>kPa</td></tr>'
        : '<tr><td>γ</td><td>Berat volume tanah</td><td class="angka">' + f(m.gamma, 1) + '</td><td>kN/m³</td></tr>' +
          '<tr><td>φ</td><td>Sudut geser dalam</td><td class="angka">' + f(m.phi, 1) + '</td><td>°</td></tr>') +
      '<tr><td><i>FS</i></td><td>Faktor keamanan</td><td class="angka">' + f(m.FS, 1) + '</td><td>–</td></tr>' +
      '</tbody></table></div>';

    h += '<h2>2. Ditanya</h2><ol><li>Beban lateral ultimit P<sub>ult</sub> dan moda keruntuhan yang menentukan.</li><li>Beban lateral izin P<sub>ult</sub>/FS.</li><li>Panjang tiang tempat moda keruntuhan berganti.</li></ol>';

    h += '<h2>3. Penyelesaian</h2>';
    h += '<div class="langkah"><h4>a. Reaksi tanah ultimit (Broms)</h4>' +
      (kohesif ? '<p class="ket">Reaksi per satuan panjang tiang 9c<sub>u</sub>b, tetap terhadap kedalaman, dan nol pada 1,5b teratas (Reese, 1986, Gbr. 7.1):</p>' +
        rumus('9 c_u b = 9\\times' + t(m.cu, 1) + '\\times' + t(m.b) + ' = ' + t(9 * m.cu * m.b) + '\\ \\text{kN/m}')
        : '<p class="ket">Reaksi per satuan panjang tiga kali tekanan pasif Rankine (7.13)–(7.14):</p>' +
          rumus('K_p = \\tan^2\\!\\left(45^\\circ + \\tfrac{\\phi}{2}\\right) = \\tan^2\\!\\left(45^\\circ + \\tfrac{' + t(m.phi, 1) + '^\\circ}{2}\\right) = ' + t(r.Kp, 3)) +
          rumus('p_z = 3\\,\\gamma\\, b\\, z\\, K_p = 3\\times' + t(m.gamma, 1) + '\\times' + t(m.b) + '\\times' + t(r.Kp, 3) + '\\,z = ' + t(3 * m.gamma * m.b * r.Kp) + '\\,z\\ \\text{kN/m}')) + '</div>';

    var huruf = 'bcdef', i = 0;
    r.kandidat.forEach(function (k) {
      h += '<div class="langkah"><h4>' + huruf[i++] + '. Moda ' + k.moda + ', kepala ' + m.kepala + ' (pers. ' + k.pers + ')</h4>' + langkahModa(m, r, k) + '</div>';
    });
    h += '<div class="langkah"><h4>' + huruf[i] + '. Beban yang menentukan dan beban izin</h4>' +
      '<p class="ket">P<sub>ult</sub> adalah nilai terkecil dari moda yang mungkin terjadi pada panjang ini.</p>' +
      rumus('P_{ult} = \\min(' + r.kandidat.map(function (k) { return t(k.P); }).join(';\\ ') + ') = ' + t(r.Pult) + '\\ \\text{kN}') +
      rumus('P_{izin} = \\dfrac{P_{ult}}{FS} = \\dfrac{' + t(r.Pult) + '}{' + t(m.FS, 1) + '} = ' + t(r.Pizin) + '\\ \\text{kN}') + '</div>';

    h += '<h2>4. Hasil dan penjelasan</h2><div class="tabel-gulir"><table><thead><tr><th>Moda</th><th>Pers.</th><th class="angka">P (kN)</th><th class="angka">Momen (kN·m)</th><th></th></tr></thead><tbody>' +
      r.kandidat.map(function (k) {
        return '<tr' + (k === c ? ' class="baris-menentukan"' : '') + '><td>' + k.moda + '</td><td>' + k.pers + '</td><td class="angka">' + f(k.P, 1) + '</td><td class="angka">' + f(k.M, 1) + '</td><td>' + (k === c ? 'menentukan' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    h += grafik(m, r);
    var teksBatas = r.peralihan.length ? r.peralihan.map(function (b) {
      return 'dari moda ' + b.dari + ' ke ' + b.ke + ' pada L = ' + f(b.L) + ' m (P<sub>ult</sub> = ' + f(b.P, 1) + ' kN)';
    }).join(', lalu ') : 'tidak berganti dalam rentang grafik';
    h += '<p>Dengan masukan ini, moda keruntuhan berganti ' + teksBatas + '. Tiang sepanjang ' + f(m.L) + ' m termasuk ' + NAMA_MODA[c.moda] + '. ' +
      (c.moda === 'panjang' ? 'Menambah panjang tidak lagi menaikkan P<sub>ult</sub>; yang menentukan adalah kekuatan lentur tiang (M<sub>y</sub>).'
        : c.moda === 'pendek' ? 'Kapasitasnya dibatasi tanah, jadi menambah panjang tiang atau memperbaiki tanah masih menaikkan P<sub>ult</sub>.'
          : 'Kepala tiang sudah leleh, tetapi tanah di bawahnya masih menentukan; menambah panjang masih menaikkan P<sub>ult</sub> sampai moda panjang tercapai.') + '</p>';

    h += '<h2>5. Catatan</h2><ul>' +
      '<li>Metode Broms memberi beban ultimit dari kesetimbangan batas. Defleksi kepala tiang tidak dihitung di sini.</li>' +
      '<li>Tanah dianggap homogen sepanjang tiang dan tiang berdiri sendiri (tanpa efek kelompok).</li>' +
      (kohesif ? '<li>Reaksi 9c<sub>u</sub>b berlaku untuk pembebanan statis jangka pendek (undrained).</li>'
        : '<li>Konstanta 0,816 dan 0,544 dipakai seperti tertulis di sumber. Pers. (7.25) untuk kepala terjepit memuat e seperti di sumber.</li>') +
      '<li>Untuk kepala terjepit, kedua sendi plastis dianggap mempunyai M<sub>y</sub> yang sama.</li>' +
      r.peringatan.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>';

    el.innerHTML = h;
  }

  function perbarui() {
    var m = salin(keadaan);
    var r = BromsLateral.hitung(m);
    gambarSketsa(m, r);
    gambarHasil(m, r);
    U.simpanKeHash(keadaan);
  }

  function mulai() {
    keadaan = U.bacaHash(function (o) { return typeof o.tanah === 'string' && typeof o.kepala === 'string' && U.tanpaHTML(o); }) || salin(CONTOH);
    if (['kohesif', 'nonkohesif'].indexOf(keadaan.tanah) < 0) keadaan.tanah = 'kohesif';
    if (['bebas', 'terjepit'].indexOf(keadaan.kepala) < 0) keadaan.kepala = 'bebas';
    isiFormulir();
    ANGKA.forEach(function (k) {
      $(k).addEventListener('input', function () { keadaan[k] = parseFloat($(k).value); perbarui(); });
    });
    $('tanah').addEventListener('change', function () { keadaan.tanah = $('tanah').value; aturAktif(); perbarui(); });
    $('kepala').addEventListener('change', function () { keadaan.kepala = $('kepala').value; perbarui(); });
    $('muatContoh').addEventListener('click', function () { keadaan = salin(CONTOH); isiFormulir(); perbarui(); });
    $('bagikan').addEventListener('click', function () { U.simpanKeHash(keadaan); U.salinTautan($('pesanBagikan')); });
    perbarui();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})();
