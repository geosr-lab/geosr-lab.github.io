/*
 * Beranda, bagian "Dari lembar lab ke laporan": contoh hidup alur data lab → hitung → grafik → laporan
 * dengan uji batas cair. Semua hitungan memakai HitungAtterberg (praktikum/hitung-atterberg.js), modul yang
 * sama dengan alat praktikum dan sudah diuji; berkas ini hanya tampilan.
 *
 * Kadar air diketik langsung, lalu diubah menjadi berat cawan tiruan (W3 = 10 g, tanah kering 20 g) supaya
 * bisa dihitung modul dan dibuka di alat Atterberg lewat tautan berbagi dengan angka yang sama.
 */
(function () {
  'use strict';
  var meja = document.querySelector('.alur-meja');
  var AT = window.HitungAtterberg;
  if (!meja || !AT) return;
  var $ = function (id) { return document.getElementById(id); };
  var f = function (x, d) { return isFinite(x) ? x.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–'; };
  var fm = function (x, d) { return f(x, d).replace('-', '−'); };   // tanda minus tipografis
  var angka = function (s) { var v = parseFloat(String(s).trim().replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : NaN; };
  var gerakDikurangi = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var NAMA = ['A', 'B', 'C'];

  function cawan(nama, w) { return { nama: nama, W3: 10, W2: 30, W1: Math.round((30 + 0.2 * w) * 1000) / 1000 }; }
  function baca() {
    var titik = NAMA.map(function (n, i) { return { nama: n, N: angka($('alurN' + (i + 1)).value), w: angka($('alurW' + (i + 1)).value) }; });
    return { titik: titik, PL: angka($('alurPL').value) };
  }
  function hitung(d) {
    var galat = [];
    d.titik.forEach(function (t) {
      if (!(t.N >= 5 && t.N <= 100)) galat.push('Ketukan titik ' + t.nama + ' harus 5–100.');
      if (!(t.w > 0 && t.w < 300)) galat.push('Kadar air titik ' + t.nama + ' harus lebih dari 0.');
    });
    if (!(d.PL > 0 && d.PL < 300)) galat.push('Isi batas plastis.');
    if (galat.length) return { galat: galat };
    var m = { metodeLL: 'banyak', skalaN: 'log', eksponen: 0.121, wn: '',
      ll: d.titik.map(function (t) { var c = cawan(t.nama, t.w); c.N = t.N; return c; }), pl: [cawan('1', d.PL)] };
    var r = AT.hitung(m);
    r.model = m;
    return r;
  }

  // ------------------------------------------------------------ 2. hitung
  function gambarHitung(r) {
    var el = $('alurHitung');
    if (r.galat.length) { el.innerHTML = '<p class="alur-galat">' + r.galat.join(' ') + '</p>'; return; }
    var k = r.kurva;
    el.innerHTML =
      '<p class="alur-rumus">w = a + b · log N</p>' +
      '<dl class="alur-nilai"><div><dt>a</dt><dd>' + fm(k.a, 2) + '</dd></div><div><dt>b</dt><dd>' + fm(k.b, 2) + '</dd></div><div><dt>R²</dt><dd>' + f(k.r2, 3) + '</dd></div></dl>' +
      '<p>LL = w pada N = 25<br>= ' + fm(k.a, 2) + (k.b < 0 ? ' − ' : ' + ') + f(Math.abs(k.b), 2) + ' · log 25 = <strong>' + f(r.LL, 1) + '%</strong></p>' +
      (r.NP ? '<p>PL ≥ LL, tanah nonplastis.</p>' : '<p>IP = LL − PL<br>= ' + f(r.LL, 1) + ' − ' + f(r.PL, 1) + ' = <strong>' + f(r.IP, 1) + '%</strong></p>');
  }

  // ------------------------------------------------------------ 3. grafik (SVG dibuat sekali, lalu hanya digeser)
  var W = 300, H = 214, KI = 40, KA = 12, AT_ = 12, BA = 36;
  var svg = null, skala = null;
  function el(nama, atr, induk) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', nama);
    Object.keys(atr || {}).forEach(function (k) { e.setAttribute(k, atr[k]); });
    if (induk) induk.appendChild(e);
    return e;
  }
  function siapkanGrafik() {
    var wadah = $('alurGrafik');
    wadah.innerHTML = '';
    svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Grafik batas cair: kadar air terhadap jumlah ketukan (skala log)' }, wadah);
    svg.classList.add('alur-svg');
    svg._sumbu = el('g', { class: 'sumbu' }, svg);
    svg._bantu = el('path', { class: 'bantu', d: '' }, svg);
    svg._garis = el('path', { class: 'kurva', d: '', pathLength: '1' }, svg);
    svg._titik = NAMA.map(function () { var g = el('g', { class: 'titik' }, svg); el('circle', { r: '4.5' }, g); return g; });
    svg._ll = el('g', { class: 'penanda-ll' }, svg);
    el('circle', { r: '5' }, svg._ll);
    svg._llTeks = el('text', { x: '8', y: '-8' }, svg._ll);
  }
  function hitungSkala(r) {
    var N = r.titikLL.map(function (t) { return t.N; }), w = r.titikLL.map(function (t) { return t.w; }).concat([r.LL]);
    var nMin = Math.min(10, Math.min.apply(null, N) * 0.85), nMaks = Math.max(50, Math.max.apply(null, N) * 1.15);
    var wMin = Math.floor((Math.min.apply(null, w) - 2) / 5) * 5, wMaks = Math.ceil((Math.max.apply(null, w) + 2) / 5) * 5;
    var lx0 = Math.log10(nMin), lx1 = Math.log10(nMaks);
    return { nMin: nMin, nMaks: nMaks, wMin: wMin, wMaks: wMaks,
      x: function (n) { return KI + (Math.log10(n) - lx0) / (lx1 - lx0) * (W - KI - KA); },
      y: function (v) { return H - BA - (v - wMin) / (wMaks - wMin) * (H - BA - AT_); } };
  }
  function gambarSumbu(s) {
    var g = svg._sumbu, h = '';
    [10, 15, 20, 25, 30, 40, 50, 60, 80, 100].forEach(function (n) {
      if (n < s.nMin - 1e-9 || n > s.nMaks + 1e-9) return;
      var x = s.x(n).toFixed(1);
      h += '<path class="kisi" d="M' + x + ' ' + AT_ + 'V' + (H - BA) + '"/><text x="' + x + '" y="' + (H - BA + 15) + '" text-anchor="middle">' + n + '</text>';
    });
    var langkah = (s.wMaks - s.wMin) > 30 ? 10 : 5;
    for (var v = s.wMin; v <= s.wMaks + 1e-9; v += langkah) {
      var y = s.y(v).toFixed(1);
      h += '<path class="kisi" d="M' + KI + ' ' + y + 'H' + (W - KA) + '"/><text x="' + (KI - 6) + '" y="' + (+y + 4) + '" text-anchor="end">' + v + '</text>';
    }
    h += '<path class="poros" d="M' + KI + ' ' + AT_ + 'V' + (H - BA) + 'H' + (W - KA) + '"/>' +
      '<text x="' + ((KI + W - KA) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">Ketukan, N (log)</text>' +
      '<text x="' + (KI + 4) + '" y="' + (AT_ + 10) + '">w (%)</text>';
    g.innerHTML = h;
  }
  function gambarGrafik(r, gerak) {
    if (!svg) siapkanGrafik();
    svg.classList.toggle('redup', !!r.galat.length);
    if (r.galat.length) return;
    var s = hitungSkala(r);
    var skalaBerubah = !skala || ['nMin', 'nMaks', 'wMin', 'wMaks'].some(function (k) { return skala[k] !== s[k]; });
    skala = s;
    if (skalaBerubah) gambarSumbu(s);
    var k = r.kurva, wDi = function (n) { return k.a + k.b * Math.log10(n); };
    svg._garis.setAttribute('d', 'M' + s.x(s.nMin).toFixed(1) + ' ' + s.y(wDi(s.nMin)).toFixed(1) + 'L' + s.x(s.nMaks).toFixed(1) + ' ' + s.y(wDi(s.nMaks)).toFixed(1));
    var x25 = s.x(25), yLL = s.y(r.LL);
    svg._bantu.setAttribute('d', 'M' + x25.toFixed(1) + ' ' + (H - BA) + 'V' + yLL.toFixed(1) + 'H' + KI);
    r.titikLL.forEach(function (t, i) { svg._titik[i].style.transform = 'translate(' + s.x(t.N).toFixed(1) + 'px,' + s.y(t.w).toFixed(1) + 'px)'; });
    svg._ll.style.transform = 'translate(' + x25.toFixed(1) + 'px,' + yLL.toFixed(1) + 'px)';
    svg._llTeks.textContent = 'LL ' + f(r.LL, 1) + '%';
    // Label LL pindah ke kiri bila terlalu dekat tepi kanan.
    svg._llTeks.setAttribute('x', x25 > W - 90 ? '-8' : '8');
    svg._llTeks.setAttribute('text-anchor', x25 > W - 90 ? 'end' : 'start');
    if (gerak) { svg.classList.remove('gambar'); void svg.getBoundingClientRect(); svg.classList.add('gambar'); }
  }

  // ------------------------------------------------------------ 4. laporan
  function tautanAlat(r) {
    // Format keadaan alat praktikum (kerangka.js): { param, tabel }, dibaca dari hash sebagai tautan berbagi.
    var k = { param: { metodeLL: 'banyak', skalaN: 'log', eksponen: 0.121, wn: '' }, tabel: { ll: r.model.ll, pl: r.model.pl } };
    try { return 'praktikum/atterberg/#' + btoa(JSON.stringify(k)); } catch (e) { return 'praktikum/atterberg/'; }
  }
  function gambarLaporan(r) {
    var el = $('alurLaporan');
    if (r.galat.length) { el.innerHTML = '<p class="redup">Lengkapi data lab untuk melihat ringkasan.</p>'; return; }
    var kelas = r.NP ? 'Tanah nonplastis (NP).' : r.klas ? 'Titik (LL, IP) ' + (r.IP >= r.garisA ? 'di atas' : 'di bawah') + ' garis A: <strong>' + r.klas.simbol + '</strong>, ' + r.klas.nama.toLowerCase() + '.' : '';
    el.innerHTML =
      '<p class="laporan-judul">Batas Atterberg</p>' +
      '<dl class="laporan-angka">' +
        '<div><dt>Batas cair, LL</dt><dd>' + f(r.LL, 1) + '%</dd></div>' +
        '<div><dt>Batas plastis, PL</dt><dd>' + f(r.PL, 1) + '%</dd></div>' +
        '<div><dt>Indeks plastisitas, IP</dt><dd>' + (r.NP ? 'NP' : f(r.IP, 1) + '%') + '</dd></div>' +
      '</dl>' +
      '<p>' + kelas + '</p>' +
      (r.peringatan.length ? '<p class="laporan-catatan">' + r.peringatan[0] + '</p>' : '') +
      '<p class="laporan-sumber">SNI 1967:2008, SNI 1966:2008; klasifikasi SNI 6371:2015.</p>' +
      '<a class="tombol kecil utama" href="' + tautanAlat(r) + '">Buka di alat Atterberg</a>';
  }

  // ------------------------------------------------------------ alur: data mengalir tahap demi tahap
  var antrean = [];
  function segarkan(tahap) {
    var li = meja.querySelector('.' + tahap);
    li.classList.remove('segar'); void li.offsetWidth; li.classList.add('segar');
  }
  function alirkan(i) {
    var li = meja.children[i];
    li.classList.remove('kirim'); void li.offsetWidth; li.classList.add('kirim');
  }
  function perbarui(gerak) {
    antrean.forEach(clearTimeout); antrean = [];
    var r = hitung(baca());
    if (!gerak || gerakDikurangi()) { gambarHitung(r); gambarGrafik(r, false); gambarLaporan(r); return; }
    alirkan(0);
    antrean.push(setTimeout(function () { gambarHitung(r); segarkan('tahap-hitung'); alirkan(1); }, 280));
    antrean.push(setTimeout(function () { gambarGrafik(r, true); segarkan('tahap-grafik'); alirkan(2); }, 560));
    antrean.push(setTimeout(function () { gambarLaporan(r); segarkan('tahap-laporan'); }, 950));
  }

  // Data acak yang wajar: indeks aliran 8–20, titik di sekitar 15, 25, dan 35 ketukan, PL di bawah garis U.
  function acakData() {
    var rnd = function (a, b) { return a + Math.random() * (b - a); };
    var LL = rnd(32, 70), If = rnd(8, 20), N = [Math.round(rnd(30, 40)), Math.round(rnd(21, 28)), Math.round(rnd(14, 20))];
    N.forEach(function (n, i) {
      $('alurN' + (i + 1)).value = n;
      $('alurW' + (i + 1)).value = f(LL - If * Math.log10(n / 25) + rnd(-0.6, 0.6), 1);
    });
    var PLmin = Math.max(0.1 * LL + 7.5, 14);
    $('alurPL').value = f(rnd(PLmin, Math.min(LL - 6, PLmin + 18)), 1);
    perbarui(true);
  }

  var tunda = 0;
  meja.querySelector('.alur-data').addEventListener('input', function () { clearTimeout(tunda); tunda = setTimeout(function () { perbarui(true); }, 250); });
  $('alurAcak').addEventListener('click', acakData);
  // Butir data di penghubung tahap 1→2, 2→3, dan 3→4.
  Array.prototype.slice.call(meja.children, 0, -1).forEach(function (li) {
    var t = document.createElement('span'); t.className = 'alur-butir'; t.setAttribute('aria-hidden', 'true'); li.appendChild(t);
  });

  // Tampil lengkap sejak awal (tidak pernah kosong); saat pertama terlihat, data mengalir sekali.
  perbarui(false);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !document.hidden) { io.disconnect(); perbarui(true); }
    }, { threshold: 0.45 });
    io.observe(meja);
  }
})();
