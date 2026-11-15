/*
 * Penampang GeoSR (/penampang/): semua alat dan kalkulator sebagai butir di lapisan tanah yang bergerak
 * tanpa ujung. Hanya tampilan: tidak menyentuh hitungan.
 *
 * - Data dibaca dari daftar tautan #isiPenampang (satu sumber; daftar itu juga cadangan untuk papan ketik
 *   dan pembaca layar). Kanvas 2D tanpa pustaka; kanvasnya aria-hidden.
 * - Penampang berulang mendatar tiap W satuan dunia. Batas lapisan bergelombang pelan, butir hanyut di
 *   lapisannya, muka air tanah mengalir. Kamera {x, y, z}: seret = geser (dengan inersia), gulir atau
 *   cubit = perbesar 0,7–2,5×.
 * - Klik butir = kartu alat. Klik permukaan tanah atau tombol Uji bor = lubang bor turun; tiap lapisan
 *   yang ditembus menyumbang satu alat terdekat (log bor).
 * - Gerak berhenti saat tab tersembunyi atau penampang tidak terlihat. prefers-reduced-motion: penampang
 *   diam (tanpa aliran dan inersia, kamera pindah langsung); gerak bisa dinyalakan lewat tombol.
 */
(function () {
  'use strict';
  var jelajah = document.getElementById('jelajah');
  var isi = document.getElementById('isiPenampang');
  var kanvas = document.getElementById('kanvasPenampang');
  if (!jelajah || !isi || !kanvas || !kanvas.getContext) return;
  var ctx = kanvas.getContext('2d');
  var panggung = kanvas.parentNode;
  var kartu = document.getElementById('kartuPenampang');
  var daftarLapis = document.getElementById('daftarLapis');
  var cari = document.getElementById('cariPenampang');
  var info = document.getElementById('infoPenampang');
  var tGerak = document.getElementById('tGerak');
  var mqHemat = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var hemat = !!(mqHemat && mqHemat.matches);

  // Bilangan acak berbenih tetap: susunan butir sama setiap kali halaman dibuka.
  var benih = 20261115;
  function acak() {
    benih = (benih + 0x6D2B79F5) | 0;
    var t = Math.imul(benih ^ (benih >>> 15), 1 | benih);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function mod(a, b) { return ((a % b) + b) % b; }
  function batasi(v, a, b) { return v < a ? a : v > b ? b : v; }
  function polos(t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var TAU = Math.PI * 2;

  // ------------------------------------------------------------ data dari daftar tautan
  var W = 2600;      // satu periode mendatar (satuan dunia)
  var LANGIT = 76;   // udara di atas permukaan tanah
  var lapisan = [], butir = [];
  var bagian = isi.querySelectorAll('.lapis-daftar');
  var dalam = 0;
  for (var i = 0; i < bagian.length; i++) {
    var s = bagian[i], h3 = s.querySelector('h3'), tautan = s.querySelectorAll('a');
    var L = {
      i: i, no: (i < 9 ? '0' : '') + (i + 1), judul: h3.lastChild.textContent.trim(), jenis: s.getAttribute('data-jenis') || '',
      el: s, y0: dalam, tebal: 66 + 12 * tautan.length,
      amp: 5 + acak() * 8, gel: 2 + (i % 3), fase: acak() * TAU, laju: 0.05 + acak() * 0.07,
      arus: (i % 2 ? -1 : 1) * (5 + acak() * 7), warna: [128, 128, 128], butir: []
    };
    dalam += L.tebal;
    for (var j = 0; j < tautan.length; j++) {
      var a = tautan[j], n = tautan.length, bentuk = [];
      for (var k = 0; k < 9; k++) bentuk.push(0.84 + acak() * 0.26);
      var b = {
        L: L, judul: a.textContent.trim(), url: a.getAttribute('href'), acuan: a.getAttribute('data-acuan') || '',
        ket: a.getAttribute('data-ket') || '', x: ((j + 0.5) / n + (acak() - 0.5) * 0.45 / n) * W,
        fy: 0.32 + acak() * 0.36, fase: acak() * TAU, putar: acak() * TAU, bentuk: bentuk, cocok: false
      };
      b.kata = polos([b.judul, b.acuan, b.ket, L.judul, L.jenis].join(' '));
      L.butir.push(b); butir.push(b);
    }
    lapisan.push(L);
  }
  if (!lapisan.length) return;
  var H = dalam;
  var iMat = Math.min(3, lapisan.length - 1);   // muka air tanah di lapisan permeabilitas (pasir)

  // ------------------------------------------------------------ warna dari token (ikut tema)
  var warna = {};
  function rgb(t) {
    t = String(t || '').trim();
    var m;
    if (t.charAt(0) === '#') {
      if (t.length === 4) t = '#' + t[1] + t[1] + t[2] + t[2] + t[3] + t[3];
      return [parseInt(t.substr(1, 2), 16), parseInt(t.substr(3, 2), 16), parseInt(t.substr(5, 2), 16)];
    }
    if ((m = t.match(/color\(srgb\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)/))) return [m[1] * 255, m[2] * 255, m[3] * 255];
    if ((m = t.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/))) return [+m[1], +m[2], +m[3]];
    return [128, 128, 128];
  }
  function css(c, a) {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')';
  }
  function bacaWarna() {
    var gaya = getComputedStyle(document.documentElement);
    ['latar', 'permukaan', 'permukaan-2', 'garis', 'teks', 'teks-2', 'aksen', 'laterit'].forEach(function (n) {
      warna[n] = rgb(gaya.getPropertyValue('--' + n));
    });
    lapisan.forEach(function (L) { L.warna = rgb(getComputedStyle(L.el).borderLeftColor); });
    buatPola();
  }

  // Pola isian lapisan, meniru simbol log bor: tiap lapisan punya ubin 48 × 48 satuan dunia (digambar 2×).
  var UBIN = 48, pola = [];
  function buatPola() {
    pola = lapisan.map(function (L, n) {
      var c = document.createElement('canvas');
      c.width = c.height = UBIN * 2;
      var g = c.getContext('2d');
      g.scale(2, 2);
      g.strokeStyle = g.fillStyle = css(warna.teks, 0.2);
      g.lineWidth = 1.1; g.lineCap = 'round';
      var garis = function (x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
      var titik = function (x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
      var bulat = function (x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); };
      switch (n % 10) {
        case 0: garis(6, 12, 18, 12); titik(30, 12, 1.2); titik(38, 12, 1.2); garis(30, 36, 42, 36); titik(8, 36, 1.2); titik(16, 36, 1.2); break; // lanau
        case 1: garis(4, 12, 20, 12); garis(28, 12, 44, 12); garis(16, 36, 32, 36); garis(40, 36, 48, 36); garis(0, 36, 8, 36); break;      // lempung
        case 2: bulat(12, 14, 3.2); bulat(34, 10, 2.2); bulat(26, 34, 3.6); bulat(6, 38, 1.8); break;                                        // laterit
        case 3: [[5, 6], [17, 11], [29, 4], [41, 13], [9, 22], [23, 26], [37, 24], [3, 37], [15, 41], [30, 38], [43, 43], [24, 15]].forEach(function (p) { titik(p[0], p[1], 1.05); }); break; // pasir
        case 4: garis(4, 12, 16, 12); garis(26, 12, 38, 12); garis(14, 36, 26, 36); garis(36, 36, 48, 36); garis(20, 18, 24, 26); garis(42, 42, 46, 48); break; // lempung kaku
        case 5: [[12, 18], [36, 40]].forEach(function (p) { garis(p[0] - 5, p[1], p[0] + 5, p[1]); garis(p[0], p[1], p[0] - 3, p[1] - 6); garis(p[0], p[1], p[0], p[1] - 7); garis(p[0], p[1], p[0] + 3, p[1] - 6); }); break; // gambut
        case 6: garis(0, 48, 48, 0); garis(-24, 24, 24, -24); garis(24, 72, 72, 24); break;                                                    // arsir miring
        case 7: garis(4, 16, 44, 16); garis(4, 40, 44, 40); garis(14, 12, 14, 20); garis(34, 36, 34, 44); break;
        case 8: garis(0, 24, 24, 0); garis(24, 48, 48, 24); garis(0, 24, 24, 48); garis(24, 0, 48, 24); break;                                 // arsir silang
        default: g.strokeRect(1, 1, 22, 14); g.strokeRect(25, 1, 22, 14); g.strokeRect(13, 17, 22, 14); g.strokeRect(-11, 17, 22, 14); g.strokeRect(37, 17, 22, 14); g.strokeRect(1, 33, 22, 14); g.strokeRect(25, 33, 22, 14); // batuan
      }
      return ctx.createPattern(c, 'repeat');
    });
  }

  // ------------------------------------------------------------ kamera dan ukuran
  var lebar = 0, tinggi = 0, dpr = 1, s0 = 1;
  var AWAL = { x: W * 0.06, y: (H - LANGIT) / 2, z: 1 };
  var cam = { x: AWAL.x, y: AWAL.y, z: 1 };
  var Z_MIN = 0.7, Z_MAKS = 2.5;
  function skala() { return s0 * cam.z; }
  function keLayarX(x) { return (x - cam.x) * skala() + lebar / 2; }
  function keLayarY(y) { return (y - cam.y) * skala() + tinggi / 2; }
  function keDuniaX(px) { return (px - lebar / 2) / skala() + cam.x; }
  function keDuniaY(py) { return (py - tinggi / 2) / skala() + cam.y; }
  function jepitKamera() {
    var setengah = tinggi / 2 / skala(), atas = -LANGIT - 10, bawah = H + 40;
    var a = atas + setengah, b = bawah - setengah;
    cam.y = a > b ? (atas + bawah) / 2 : batasi(cam.y, a, b);
    cam.x = mod(cam.x, W);
  }
  function ukur() {
    var r = panggung.getBoundingClientRect();
    lebar = Math.max(1, Math.round(r.width)); tinggi = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    kanvas.width = Math.round(lebar * dpr); kanvas.height = Math.round(tinggi * dpr);
    s0 = tinggi / (H + LANGIT + 50);
    jepitKamera(); minta();
  }

  // ------------------------------------------------------------ bentuk lapisan dan posisi butir
  var t = 0;   // waktu simulasi (detik); hanya berjalan saat gerak otomatis aktif
  function batasAtas(n, x) {
    if (n === 0) return 2.5 * Math.sin(TAU * x * 3 / W + t * 0.04);
    var L = lapisan[n];
    return L.y0 + L.amp * Math.sin(TAU * x * L.gel / W + L.fase + t * L.laju);
  }
  function batasBawah(n, x) { return n + 1 < lapisan.length ? batasAtas(n + 1, x) : H + 60; }
  function posisiButir(b, x) {
    var n = b.L.i, a = batasAtas(n, x), c = n + 1 < lapisan.length ? batasAtas(n + 1, x) : H;
    return a + (c - a) * b.fy + 3 * Math.sin(t * 0.8 + b.fase);
  }
  function xButir(b) { return mod(b.x + b.L.arus * t, W); }
  function jariButir() { return batasi(11 * cam.z + 3, 9, 25); }

  // ------------------------------------------------------------ keadaan
  var gerak = !hemat, sorot = -1, hover = null, dipilih = null, kataCari = '';
  var bor = null;          // {x, mulai, p, hasil: [{L, b}]}
  var terbang = null;      // {dari, ke, mulai, lama}
  var vx = 0, vy = 0, seret = null, jari = {}, cubit = null;
  var diam = 0;            // waktu terakhir pengguna berinteraksi (ms)
  var tampak = [];         // posisi layar butir pada gambar terakhir, untuk klik dan hover

  // ------------------------------------------------------------ menggambar
  function gambar() {
    var s = skala(), w = lebar, h = tinggi;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var wx0 = keDuniaX(0), wx1 = keDuniaX(w), langkah = 12 / s;
    var xs = [];
    for (var x = wx0 - langkah; x <= wx1 + langkah * 2; x += langkah) xs.push(x);
    var batas = lapisan.map(function (L, n) { return xs.map(function (x) { return keLayarY(batasAtas(n, x)); }); });
    var px = xs.map(keLayarX);

    // langit: kisi halus tipis supaya terasa kertas lab
    var yTanah = keLayarY(0);
    // lapisan
    lapisan.forEach(function (L, n) {
      var atas = batas[n], bawah = batas[n + 1];
      if (bawah && Math.max.apply(null, bawah) < -4) return;
      if (Math.min.apply(null, atas) > h + 4) return;
      ctx.beginPath();
      ctx.moveTo(px[0], atas[0]);
      for (var q = 1; q < px.length; q++) ctx.lineTo(px[q], atas[q]);
      if (bawah) for (q = px.length - 1; q >= 0; q--) ctx.lineTo(px[q], bawah[q]);
      else { ctx.lineTo(px[px.length - 1], h + 10); ctx.lineTo(px[0], h + 10); }
      ctx.closePath();
      var redup = sorot >= 0 && sorot !== n;
      ctx.fillStyle = css(L.warna, redup ? 0.45 : 1);
      ctx.fill();
      var p = pola[n];
      if (p) {
        if (p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix([s / 2, 0, 0, s / 2, keLayarX(0), keLayarY(0)]));
        ctx.fillStyle = p; ctx.fill();
      }
      // batas atas lapisan
      ctx.beginPath();
      ctx.moveTo(px[0], atas[0]);
      for (q = 1; q < px.length; q++) ctx.lineTo(px[q], atas[q]);
      ctx.strokeStyle = n === 0 ? css(warna.teks, 0.85) : css(warna.teks, 0.3);
      ctx.lineWidth = n === 0 ? 1.6 : 1;
      ctx.stroke();
    });
    // lapisan yang disorot: garis aksen di batas atas dan bawahnya
    if (sorot >= 0) {
      [batas[sorot], batas[sorot + 1]].forEach(function (g) {
        if (!g) return;
        ctx.beginPath(); ctx.moveTo(px[0], g[0]);
        for (var q = 1; q < px.length; q++) ctx.lineTo(px[q], g[q]);
        ctx.strokeStyle = css(warna.aksen); ctx.lineWidth = 2.5; ctx.stroke();
      });
    }
    // rumput pendek di permukaan
    ctx.strokeStyle = css(warna.teks, 0.55); ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    var jarak = 34, mulai = Math.floor(wx0 / jarak) * jarak;
    ctx.beginPath();
    for (x = mulai; x <= wx1 + jarak; x += jarak) {
      if (mod(x, jarak * 3) === jarak) continue;
      var gx = keLayarX(x), gy = keLayarY(batasAtas(0, x)), u = Math.max(3, 5 * cam.z);
      ctx.moveTo(gx - u * 0.6, gy - u); ctx.lineTo(gx, gy);
      ctx.moveTo(gx + u * 0.6, gy - u); ctx.lineTo(gx, gy);
    }
    ctx.stroke();

    gambarMat(px, xs);
    if (bor) gambarBor();
    gambarButir(wx0, wx1);
    gambarTandaLapisan(yTanah);
  }

  function gambarMat(px, xs) {
    var L = lapisan[iMat];
    if (!L || L.jenis !== 'Praktikum') return;
    var y = xs.map(function (x) {
      var a = batasAtas(iMat, x), c = batasBawah(iMat, x);
      return keLayarY(a + (c - a) * 0.22 + 1.5 * Math.sin(TAU * x * 9 / W + t * 0.9));
    });
    ctx.beginPath(); ctx.moveTo(px[0], y[0]);
    for (var q = 1; q < px.length; q++) ctx.lineTo(px[q], y[q]);
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -t * 18;
    ctx.strokeStyle = css(warna.aksen, 0.95); ctx.lineWidth = 1.8; ctx.stroke();
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    // simbol muka air tanah (segitiga terbalik dan garis riak) tiap sepertiga periode
    var wx0 = xs[0], wx1 = xs[xs.length - 1], jarak = W / 3;
    for (var x = Math.floor(wx0 / jarak) * jarak + jarak * 0.4; x <= wx1; x += jarak) {
      var a = batasAtas(iMat, x), c = batasBawah(iMat, x);
      var sx = keLayarX(x), sy = keLayarY(a + (c - a) * 0.22 + 1.5 * Math.sin(TAU * x * 9 / W + t * 0.9));
      ctx.beginPath(); ctx.moveTo(sx - 7, sy - 12); ctx.lineTo(sx + 7, sy - 12); ctx.lineTo(sx, sy - 2); ctx.closePath();
      ctx.fillStyle = css(warna.permukaan); ctx.fill();
      ctx.strokeStyle = css(warna.aksen); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx - 6, sy + 4); ctx.lineTo(sx + 6, sy + 4); ctx.moveTo(sx - 3, sy + 8); ctx.lineTo(sx + 3, sy + 8); ctx.stroke();
      if (sx > 150) label('Muka air tanah', sx + 14, sy + 12, false, true);
    }
  }

  function gambarBor() {
    var s = skala(), x = bor.x, sx = keLayarX(x);
    // bor tetap di tempatnya di dunia; gambar di salinan periode yang paling dekat dengan layar
    var geser = Math.round((cam.x - x) / W) * W;
    x += geser; sx = keLayarX(x);
    if (sx < -60 || sx > lebar + 60) return;
    var yTanah = keLayarY(batasAtas(0, x)), dalamBor = bor.p * H, lb = Math.max(14, 22 * s);
    // menara bor: kaki tiga dan katrol
    var tinggiMenara = Math.max(34, 58 * s);
    ctx.strokeStyle = css(warna.teks); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx - tinggiMenara * 0.42, yTanah); ctx.lineTo(sx, yTanah - tinggiMenara);
    ctx.lineTo(sx + tinggiMenara * 0.42, yTanah);
    ctx.moveTo(sx - tinggiMenara * 0.21, yTanah - tinggiMenara * 0.5); ctx.lineTo(sx + tinggiMenara * 0.21, yTanah - tinggiMenara * 0.5);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, yTanah - tinggiMenara, 3.5, 0, TAU); ctx.fillStyle = css(warna.laterit); ctx.fill();
    // inti bor: tabung berlatar permukaan, di dalamnya contoh tanah tiap lapisan yang sudah ditembus
    var yDasar0 = keLayarY(Math.min(dalamBor, H));
    ctx.fillStyle = css(warna.permukaan);
    ctx.fillRect(sx - lb / 2, yTanah, lb, yDasar0 - yTanah);
    lapisan.forEach(function (L, n) {
      var a = batasAtas(n, x), c = Math.min(batasBawah(n, x), H);
      if (a >= dalamBor) return;
      c = Math.min(c, dalamBor);
      ctx.fillStyle = css(L.warna);
      ctx.fillRect(sx - lb / 2 + 3, keLayarY(a) + 1.5, lb - 6, keLayarY(c) - keLayarY(a) - 3);
    });
    var yDasar = keLayarY(Math.min(dalamBor, H));
    ctx.strokeStyle = css(warna.teks); ctx.lineWidth = 2;
    ctx.strokeRect(sx - lb / 2, yTanah, lb, yDasar - yTanah);
    ctx.beginPath(); ctx.moveTo(sx, yTanah - tinggiMenara); ctx.lineTo(sx, yTanah); ctx.strokeStyle = css(warna.teks, 0.6); ctx.lineWidth = 1; ctx.stroke();
    // garis putus dari inti bor ke alat terpilih di tiap lapisan
    bor.hasil.forEach(function (h) {
      var n = h.L.i, a = batasAtas(n, x), c = Math.min(batasBawah(n, x), H);
      if ((a + c) / 2 > dalamBor) return;
      var bx = xButir(h.b), pilih = bx + Math.round((x - bx) / W) * W;
      var tx = keLayarX(pilih), ty = keLayarY(posisiButir(h.b, pilih)), ky = keLayarY((a + c) / 2);
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(sx + (tx > sx ? lb / 2 : -lb / 2), ky); ctx.lineTo(tx, ty);
      ctx.strokeStyle = css(warna.teks, 0.75); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(sx + (tx > sx ? lb / 2 : -lb / 2), ky, 3, 0, TAU); ctx.fillStyle = css(warna.teks); ctx.fill();
    });
  }

  function gambarButir(wx0, wx1) {
    var r = jariButir(), adaCari = kataCari !== '';
    var label2 = [];
    tampak = [];
    butir.forEach(function (b) {
      var bx = xButir(b);
      var k0 = Math.floor((wx0 - r / skala() - bx) / W), k1 = Math.ceil((wx1 + r / skala() - bx) / W);
      for (var k = k0; k <= k1; k++) {
        var X = bx + k * W, sx = keLayarX(X), sy = keLayarY(posisiButir(b, X));
        if (sx < -r * 2 || sx > lebar + r * 2 || sy < -r * 2 || sy > tinggi + r * 2) continue;
        var aktif = b === hover || b === dipilih || (adaCari && b.cocok);
        var redup = (adaCari && !b.cocok) || (sorot >= 0 && sorot !== b.L.i && !aktif);
        ctx.globalAlpha = redup ? 0.32 : 1;
        // butir: segi banyak tak beraturan, berputar pelan
        ctx.beginPath();
        var m = b.bentuk.length, putar = b.putar + t * 0.06;
        for (var q = 0; q < m; q++) {
          var sudut = putar + q / m * TAU, rr = r * b.bentuk[q];
          var xx = sx + Math.cos(sudut) * rr, yy = sy + Math.sin(sudut) * rr;
          if (q === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.closePath();
        ctx.fillStyle = css(warna.permukaan); ctx.fill();
        ctx.lineJoin = 'round';
        ctx.strokeStyle = aktif ? css(warna.aksen) : css(warna.teks, 0.85);
        ctx.lineWidth = aktif ? 2.6 : 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, sy, r * 0.36, 0, TAU);
        ctx.fillStyle = css(b.L.warna); ctx.fill();
        ctx.strokeStyle = css(warna.teks, 0.5); ctx.lineWidth = 1; ctx.stroke();
        if (b === dipilih) {
          ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.arc(sx, sy, r + 6, 0, TAU);
          ctx.strokeStyle = css(warna.aksen); ctx.lineWidth = 1.5; ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.globalAlpha = 1;
        tampak.push({ b: b, x: sx, y: sy, r: r });
        if (aktif || cam.z >= (lebar >= 640 ? 1 : 1.6)) label2.push([b.judul, sx, sy - r - 8, aktif]);
      }
    });
    label2.forEach(function (l) { label(l[0], l[1], l[2], l[3]); });
  }

  // Label berlatar permukaan, tidak keluar dari kanvas. kiri = jangkar di kiri teks (bukan di tengah).
  function label(teks, x, y, tegas, kiri) {
    ctx.font = (tegas ? '700' : '600') + ' 13px "Plus Jakarta Sans", system-ui, sans-serif';
    if (teks.length > 44) teks = teks.slice(0, 42) + '…';
    var lb = ctx.measureText(teks).width + 14, tg = 24;
    var x0 = kiri ? x : x - lb / 2, y0 = y - tg;
    x0 = batasi(x0, lebar > 300 ? 46 : 4, lebar - lb - 4); y0 = batasi(y0, 4, tinggi - tg - 4);
    ctx.fillStyle = css(warna.permukaan, 0.94);
    ctx.strokeStyle = tegas ? css(warna.aksen) : css(warna.garis);
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0, y0, lb, tg, 4); else ctx.rect(x0, y0, lb, tg);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = css(warna.teks);
    ctx.textBaseline = 'middle';
    ctx.fillText(teks, x0 + 7, y0 + tg / 2 + 0.5);
  }

  // Nomor lapisan menempel di tepi kiri, pada bagian lapisan yang terlihat.
  function gambarTandaLapisan() {
    var x = keDuniaX(0);
    ctx.font = '700 13px "Plus Jakarta Sans", system-ui, sans-serif';
    lapisan.forEach(function (L, n) {
      var a = keLayarY(batasAtas(n, x)), c = keLayarY(n + 1 < lapisan.length ? batasAtas(n + 1, x) : H);
      var ta = Math.max(a, 0), tb = Math.min(c, tinggi);
      if (tb - ta < 26) return;
      var teks = cam.z >= 1.35 ? L.no + '  ' + L.judul : L.no;
      var lb = ctx.measureText(teks).width + 18, y = batasi((a + c) / 2, ta + 13, tb - 13);
      ctx.fillStyle = css(warna.permukaan, sorot === n ? 1 : 0.9);
      ctx.strokeStyle = sorot === n ? css(warna.aksen) : css(warna.teks, 0.35);
      ctx.lineWidth = sorot === n ? 2 : 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(8, y - 11, lb, 22, 4); else ctx.rect(8, y - 11, lb, 22);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = css(L.warna); ctx.fillRect(8, y - 11, 4, 22);
      ctx.fillStyle = css(warna.teks); ctx.textBaseline = 'middle';
      ctx.fillText(teks, 17, y + 0.5);
    });
  }

  // ------------------------------------------------------------ putaran gerak
  var jalan = false, terlihat = true, akhir = 0;
  function minta() {
    if (jalan || !terlihat || document.hidden) return;
    jalan = true; akhir = performance.now();
    requestAnimationFrame(langkahBingkai);
  }
  function langkahBingkai(kini) {
    var dt = Math.min(0.05, Math.max(0, (kini - akhir) / 1000));
    akhir = kini;
    if (gerak) t += dt;
    var s = skala();
    if (terbang) {
      var p = Math.min(1, (kini - terbang.mulai) / terbang.lama), e = 1 - Math.pow(1 - p, 3);
      cam.x = terbang.dari.x + (terbang.ke.x - terbang.dari.x) * e;
      cam.y = terbang.dari.y + (terbang.ke.y - terbang.dari.y) * e;
      cam.z = terbang.dari.z + (terbang.ke.z - terbang.dari.z) * e;
      if (p >= 1) terbang = null;
    } else if (!seret && (Math.abs(vx) + Math.abs(vy)) * s > 4) {
      cam.x += vx * dt; cam.y += vy * dt;
      var redam = Math.exp(-dt * 3.5); vx *= redam; vy *= redam;
    } else {
      vx = vy = 0;
      if (gerak && !seret && !cubit && kini - diam > 2500) cam.x += 16 / s * dt;   // kamera hanyut pelan saat dibiarkan
    }
    if (bor && bor.p < 1) bor.p = Math.min(1, (kini - bor.mulai) / 1700);
    jepitKamera();
    gambar();
    var lanjut = gerak || terbang || (vx || vy) || (bor && bor.p < 1);
    if (lanjut && terlihat && !document.hidden) requestAnimationFrame(langkahBingkai);
    else jalan = false;
  }

  // ------------------------------------------------------------ kamera: perbesar, terbang
  function perbesarDi(px, py, z) {
    z = batasi(z, Z_MIN, Z_MAKS);
    var wx = keDuniaX(px), wy = keDuniaY(py);
    cam.z = z;
    cam.x = wx - (px - lebar / 2) / skala();
    cam.y = wy - (py - tinggi / 2) / skala();
    jepitKamera();
    kanvas.style.touchAction = cam.z > 1.02 ? 'none' : 'pan-y';
  }
  function terbangKe(x, y, z) {
    z = batasi(z, Z_MIN, Z_MAKS);
    // ambil jalur mendatar terpendek di penampang yang berulang
    var dx = mod(x - cam.x + W / 2, W) - W / 2;
    var ke = { x: cam.x + dx, y: y, z: z };
    vx = vy = 0;
    if (hemat) { cam.x = ke.x; cam.y = ke.y; cam.z = ke.z; jepitKamera(); terbang = null; }
    else terbang = { dari: { x: cam.x, y: cam.y, z: cam.z }, ke: ke, mulai: performance.now(), lama: 600 };
    kanvas.style.touchAction = z > 1.02 ? 'none' : 'pan-y';
    sentuh(); minta();
  }
  function sentuh() { diam = performance.now(); }

  // ------------------------------------------------------------ kartu: alat dan log bor
  function el(tag, kelas, teks) {
    var e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = teks;
    return e;
  }
  function tombolTutup() {
    var tb = el('button', 'tombol kecil', 'Tutup');
    tb.type = 'button';
    tb.addEventListener('click', tutupKartu);
    return tb;
  }
  // Kartu diletakkan di sisi yang berseberangan dengan titik yang diklik supaya tidak menutupinya.
  function sisiKartu(sx) { kartu.classList.toggle('kanan', sx != null && sx < lebar / 2); }
  function bukaKartuButir(b, sx) {
    dipilih = b; bor = null;
    sisiKartu(sx);
    kartu.textContent = '';
    kartu.style.setProperty('--lapis', css(b.L.warna));
    kartu.appendChild(el('p', 'lapis-nama', 'Lapisan ' + b.L.no + ', ' + b.L.judul));
    kartu.appendChild(el('h3', '', b.judul));
    if (b.acuan) kartu.appendChild(el('span', 'chip', b.acuan));
    if (b.ket) kartu.appendChild(el('p', '', b.ket));
    var aksi = el('div', 'aksi');
    var buka = el('a', 'tombol utama kecil', b.L.jenis === 'Kalkulator' ? 'Buka kalkulator' : b.L.jenis === 'Praktikum' ? 'Buka alat' : 'Buka');
    buka.href = b.url;
    aksi.appendChild(buka); aksi.appendChild(tombolTutup());
    kartu.appendChild(aksi);
    kartu.hidden = false;
    minta();
  }
  function tutupKartu() {
    kartu.hidden = true; kartu.textContent = '';
    dipilih = null; bor = null; minta();
  }
  function ujiBor(x) {
    dipilih = null;
    var hasil = lapisan.map(function (L) {
      var terbaik = null, jarakMin = Infinity;
      L.butir.forEach(function (b) {
        var d = Math.abs(mod(xButir(b) - x + W / 2, W) - W / 2);
        if (d < jarakMin) { jarakMin = d; terbaik = b; }
      });
      return { L: L, b: terbaik };
    }).filter(function (h) { return h.b; });
    bor = { x: mod(x, W), mulai: performance.now(), p: hemat ? 1 : 0, hasil: hasil };
    sisiKartu(keLayarX(cam.x + mod(x - cam.x + W / 2, W) - W / 2));
    kartu.textContent = '';
    kartu.style.removeProperty('--lapis');
    kartu.appendChild(el('p', 'lapis-nama', 'Uji bor di titik ini'));
    kartu.appendChild(el('h3', '', 'Log bor: ' + hasil.length + ' alat'));
    var ol = el('ol', 'log-bor');
    hasil.forEach(function (h) {
      var li = el('li');
      li.style.setProperty('--lapis', css(h.L.warna));
      li.appendChild(el('span', 'no', h.L.no));
      var a = el('a', '', h.b.judul);
      a.href = h.b.url;
      li.appendChild(a);
      ol.appendChild(li);
    });
    kartu.appendChild(ol);
    var aksi = el('div', 'aksi');
    var lagi = el('button', 'tombol kecil', 'Bor di tempat lain');
    lagi.type = 'button';
    lagi.addEventListener('click', function () { ujiBor(cam.x + (acak() - 0.5) * W * 0.6); terbangKe(bor.x, cam.y, cam.z); });
    aksi.appendChild(lagi); aksi.appendChild(tombolTutup());
    kartu.appendChild(aksi);
    kartu.hidden = false;
    sentuh(); minta();
  }

  // ------------------------------------------------------------ penunjuk: seret, klik, cubit, gulir
  function titikLayar(e) {
    var r = kanvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function kena(p) {
    var terbaik = null, d0 = Infinity;
    tampak.forEach(function (v) {
      var d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < v.r + 8 && d < d0) { d0 = d; terbaik = v.b; }
    });
    return terbaik;
  }
  function lapisanDi(p) {
    var x = keDuniaX(p.x), y = keDuniaY(p.y);
    if (y < batasAtas(0, x) + 6) return -1;
    for (var n = lapisan.length - 1; n >= 0; n--) if (y >= batasAtas(n, x)) return n;
    return -1;
  }
  kanvas.addEventListener('pointerdown', function (e) {
    var p = titikLayar(e);
    jari[e.pointerId] = p;
    var id = Object.keys(jari);
    if (id.length === 1) {
      seret = { x: p.x, y: p.y, cx: cam.x, cy: cam.y, gerak: false, tx: p.x, ty: p.y, tt: performance.now() };
      terbang = null; vx = vy = 0;
      try { kanvas.setPointerCapture(e.pointerId); } catch (_) { /* abaikan */ }
    } else if (id.length === 2) {
      var a = jari[id[0]], b = jari[id[1]];
      cubit = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cam.z };
      seret = null;
    }
    sentuh();
  });
  kanvas.addEventListener('pointermove', function (e) {
    var p = titikLayar(e);
    if (jari[e.pointerId]) jari[e.pointerId] = p;
    var id = Object.keys(jari);
    if (cubit && id.length === 2) {
      var a = jari[id[0]], b = jari[id[1]];
      perbesarDi((a.x + b.x) / 2, (a.y + b.y) / 2, cubit.z * Math.hypot(a.x - b.x, a.y - b.y) / cubit.d);
      sentuh(); minta(); return;
    }
    if (seret) {
      var dx = p.x - seret.x, dy = p.y - seret.y;
      if (!seret.gerak && Math.hypot(dx, dy) > 5) { seret.gerak = true; kanvas.classList.add('diseret'); }
      if (seret.gerak) {
        var s = skala(), kini = performance.now(), dtk = Math.max(1, kini - seret.tt) / 1000;
        cam.x = seret.cx - dx / s; cam.y = seret.cy - dy / s; jepitKamera();
        vx = -(p.x - seret.tx) / s / dtk; vy = -(p.y - seret.ty) / s / dtk;
        seret.tx = p.x; seret.ty = p.y; seret.tt = kini;
        sentuh(); minta();
      }
      return;
    }
    if (e.pointerType === 'mouse') {
      var h = kena(p);
      if (h !== hover) { hover = h; minta(); }
      kanvas.style.cursor = h ? 'pointer' : lapisanDi(p) < 0 ? 'crosshair' : '';
    }
  });
  function lepas(e) {
    var p = titikLayar(e);
    delete jari[e.pointerId];
    if (cubit) { if (Object.keys(jari).length < 2) cubit = null; return; }
    if (!seret) return;
    var klik = !seret.gerak;
    kanvas.classList.remove('diseret');
    if (!klik && (hemat || performance.now() - seret.tt > 80)) vx = vy = 0;
    seret = null;
    if (klik && e.type === 'pointerup') {
      var b = kena(p);
      if (b) { bukaKartuButir(b, p.x); return; }
      var n = lapisanDi(p);
      if (n < 0) { ujiBor(keDuniaX(p.x)); return; }
      pilihLapisan(n === sorot ? -1 : n, false);
    }
    minta();
  }
  kanvas.addEventListener('pointerup', lepas);
  kanvas.addEventListener('pointercancel', lepas);
  kanvas.addEventListener('pointerleave', function () { if (hover) { hover = null; minta(); } });
  kanvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var p = titikLayar(e), d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    terbang = null;
    perbesarDi(p.x, p.y, cam.z * Math.exp(-d * 0.0015));
    sentuh(); minta();
  }, { passive: false });

  // ------------------------------------------------------------ panel: daftar lapisan, cari, tombol
  var tombolLapis = lapisan.map(function (L, n) {
    var li = el('li'), b = el('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    li.style.setProperty('--lapis', getComputedStyle(L.el).borderLeftColor);
    b.appendChild(el('span', 'no', L.no));
    var w = el('span', 'warna'); w.setAttribute('aria-hidden', 'true');
    b.appendChild(w);
    b.appendChild(el('span', 'judul', L.judul));
    b.appendChild(el('span', 'jumlah', String(L.butir.length)));
    b.addEventListener('click', function () { pilihLapisan(sorot === n ? -1 : n, true); });
    li.appendChild(b); daftarLapis.appendChild(li);
    return b;
  });
  function pilihLapisan(n, terbangkan) {
    sorot = n;
    tombolLapis.forEach(function (b, q) { b.setAttribute('aria-pressed', q === n ? 'true' : 'false'); });
    if (n >= 0 && terbangkan) {
      var L = lapisan[n];
      terbangKe(cam.x, L.y0 + L.tebal / 2, Math.max(1.15, Math.min(2.2, tinggi * 0.45 / (L.tebal * s0))));
    }
    if (n >= 0) info.textContent = 'Lapisan ' + lapisan[n].no + ', ' + lapisan[n].judul + ': ' + lapisan[n].butir.length + ' alat.';
    else if (!kataCari) info.textContent = '';
    minta();
  }

  function saring() {
    kataCari = polos(cari.value.trim());
    var n = 0;
    butir.forEach(function (b) { b.cocok = kataCari !== '' && b.kata.indexOf(kataCari) >= 0; if (b.cocok) n++; });
    info.textContent = kataCari === '' ? '' : n ? n + ' butir cocok. Tekan Enter untuk menuju butir pertama.' : 'Tidak ada butir yang cocok. Coba kata lain, misalnya nama uji atau nomor SNI.';
    minta();
  }
  cari.addEventListener('input', saring);
  cari.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var cocok = butir.filter(function (b) { return b.cocok; });
    if (!cocok.length) return;
    // butir cocok yang paling dekat dengan tengah layar
    cocok.sort(function (a, b) {
      return Math.abs(mod(xButir(a) - cam.x + W / 2, W) - W / 2) - Math.abs(mod(xButir(b) - cam.x + W / 2, W) - W / 2);
    });
    var b = cocok[0], x = xButir(b);
    terbangKe(x, posisiButir(b, x), Math.max(cam.z, 1.4));
    bukaKartuButir(b);
  });

  function aturGerak(nyala) {
    gerak = nyala;
    tGerak.setAttribute('aria-pressed', nyala ? 'true' : 'false');
    minta();
  }
  aturGerak(gerak);
  tGerak.addEventListener('click', function () { aturGerak(!gerak); });
  document.getElementById('tBor').addEventListener('click', function () { ujiBor(cam.x); });
  document.getElementById('tBesar').addEventListener('click', function () { terbangKe(cam.x, cam.y, cam.z * 1.35); });
  document.getElementById('tKecil').addEventListener('click', function () { terbangKe(cam.x, cam.y, cam.z / 1.35); });
  document.getElementById('tUlang').addEventListener('click', function () {
    tutupKartu(); pilihLapisan(-1, false);
    cari.value = ''; saring();
    terbangKe(AWAL.x, AWAL.y, 1);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !kartu.hidden && jelajah.contains(document.activeElement || null)) tutupKartu();
  });

  // ------------------------------------------------------------ jeda, tema, ukuran
  document.addEventListener('visibilitychange', function () { if (!document.hidden) minta(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { terlihat = e[0].isIntersecting; if (terlihat) minta(); }).observe(panggung);
  }
  if (mqHemat) {
    var gantiHemat = function (m) { hemat = m.matches; if (hemat) aturGerak(false); };
    if (mqHemat.addEventListener) mqHemat.addEventListener('change', gantiHemat); else if (mqHemat.addListener) mqHemat.addListener(gantiHemat);
  }
  var gantiTema = function () { bacaWarna(); minta(); };
  new MutationObserver(gantiTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
  if (window.matchMedia) {
    var mqGelap = window.matchMedia('(prefers-color-scheme: dark)');
    if (mqGelap.addEventListener) mqGelap.addEventListener('change', gantiTema); else if (mqGelap.addListener) mqGelap.addListener(gantiTema);
  }
  if ('ResizeObserver' in window) new ResizeObserver(ukur).observe(panggung);
  else window.addEventListener('resize', ukur);

  jelajah.hidden = false;
  bacaWarna();
  ukur();
  gambar();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(minta);
})();
