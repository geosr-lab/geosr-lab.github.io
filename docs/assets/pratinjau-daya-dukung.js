/*
 * Halaman /alat/, bagian "Coba cepat": faktor daya dukung Nc, Nq, Nγ terhadap φ'.
 * Angka dihitung PondasiDangkal.faktorDayaDukung (pondasi-dangkal-hitung.js, modul kalkulator yang sudah diuji);
 * berkas ini hanya tampilan. Grafik digambar sekali; saat penggeser digeser hanya penanda yang berpindah.
 */
(function () {
  'use strict';
  var PD = window.PondasiDangkal, wadah = document.getElementById('cobaDayaDukung');
  if (!PD || !wadah) return;
  var $ = function (id) { return document.getElementById(id); };
  var f = function (x, d) { return x.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var NS = 'http://www.w3.org/2000/svg';
  var W = 360, H = 230, KI = 44, KA = 14, AT = 12, BA = 34, YMIN = 1, YMAKS = 1000;
  var x = function (p) { return KI + p / 45 * (W - KI - KA); };
  var y = function (n) { return H - BA - (Math.log10(Math.max(n, YMIN)) - Math.log10(YMIN)) / (Math.log10(YMAKS) - Math.log10(YMIN)) * (H - BA - AT); };
  var JENIS = [['Nc', 'c'], ['Nq', 'q'], ['Ng', 'g']];

  function el(nama, atr, induk) {
    var e = document.createElementNS(NS, nama);
    Object.keys(atr).forEach(function (k) { e.setAttribute(k, atr[k]); });
    induk.appendChild(e);
    return e;
  }
  function siapkanGrafik() {
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Grafik faktor daya dukung Nc, Nq, dan Nγ terhadap sudut geser dalam (sumbu tegak logaritmik)' }, $('grafikDayaDukung'));
    var h = '';
    [1, 10, 100, 1000].forEach(function (n) {
      h += '<path class="kisi" d="M' + KI + ' ' + y(n).toFixed(1) + 'H' + (W - KA) + '"/><text x="' + (KI - 6) + '" y="' + (y(n) + 4).toFixed(1) + '" text-anchor="end">' + f(n, 0) + '</text>';
    });
    for (var p = 0; p <= 45; p += 5) {
      h += '<path class="kisi" d="M' + x(p).toFixed(1) + ' ' + AT + 'V' + (H - BA) + '"/><text x="' + x(p).toFixed(1) + '" y="' + (H - BA + 15) + '" text-anchor="middle">' + p + '</text>';
    }
    h += '<path class="poros" d="M' + KI + ' ' + AT + 'V' + (H - BA) + 'H' + (W - KA) + '"/>' +
      '<text x="' + ((KI + W - KA) / 2) + '" y="' + (H - 3) + '" text-anchor="middle">Sudut geser dalam, φ\' (°)</text>';
    // Kurva dari modul hitung, titik setiap 0,5°; bagian di bawah 1 tidak digambar (sumbu log).
    JENIS.forEach(function (j) {
      var d = '';
      for (var q = 0; q <= 45.001; q += 0.5) {
        var n = PD.faktorDayaDukung(q)[j[0]];
        if (n < YMIN - 1e-9) continue;
        d += (d ? 'L' : 'M') + x(q).toFixed(1) + ' ' + y(n).toFixed(1);
      }
      h += '<path class="kurva kurva-' + j[1] + '" d="' + d + '"/>';
    });
    svg.innerHTML = h;
    svg._garis = el('path', { class: 'penanda-garis', d: 'M0 ' + AT + 'V' + (H - BA) }, svg);
    svg._titik = JENIS.map(function (j) { return el('circle', { class: 'penanda-titik titik-' + j[1], r: '4.5', cx: '0', cy: '0' }, svg); });
    return svg;
  }

  var svg = siapkanGrafik(), geser = $('phiCoba');
  function perbarui() {
    var phi = +geser.value, N = PD.faktorDayaDukung(phi);
    $('phiNilai').textContent = phi + '°';
    geser.setAttribute('aria-valuetext', phi + ' derajat');
    $('nilaiNc').textContent = f(N.Nc, 2);
    $('nilaiNq').textContent = f(N.Nq, 2);
    $('nilaiNg').textContent = f(N.Ng, 2);
    svg._garis.style.transform = 'translateX(' + x(phi).toFixed(1) + 'px)';
    JENIS.forEach(function (j, i) {
      var n = N[j[0]], t = svg._titik[i];
      t.style.transform = 'translate(' + x(phi).toFixed(1) + 'px,' + y(n).toFixed(1) + 'px)';
      t.style.opacity = n < YMIN - 1e-9 ? '0' : '1';
    });
    // Tautan membuka kalkulator dengan data contoh dan φ' yang dipilih (format tautan berbagi kalkulator).
    var k = { bentuk: 'persegi', B: 2, L: 2, Df: 1.5, c: 10, phi: phi, gamma: 18, adaMAT: false, dw: 3, gammaSat: 19.5, FS: 3 };
    $('bukaDayaDukung').href = '../kalkulator/pondasi-dangkal.html#' + btoa(JSON.stringify(k));
    $('bukaDayaDukung').textContent = 'Buka kalkulator dengan φ\' = ' + phi + '°';
  }
  geser.addEventListener('input', perbarui);
  perbarui();
})();
