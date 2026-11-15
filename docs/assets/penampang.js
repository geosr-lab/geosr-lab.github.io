/*
 * Penampang GeoSR: semua alat dan kalkulator sebagai butir di lapisan tanah yang bergerak tanpa ujung.
 * Hanya tampilan: tidak menyentuh hitungan. Dipasang pada setiap [data-penampang]:
 *   data-penampang="penuh"  halaman /penampang/: panel lapisan, cari, tombol, gulir = perbesar
 *   data-penampang="mini"   hero beranda: tanpa panel, gulir halaman tidak dibajak, label hanya saat disorot
 * Data dibaca dari daftar tautan .lapis-daftar (di dalam .pn-data, atau elemen yang disebut data-sumber).
 *
 * Gambar (kanvas 2D, tanpa pustaka), berurutan:
 *   langit bergradasi dengan cahaya matahari (bulan di tema gelap) dan punggung bukit jauh (paralaks);
 *   muka atas blok tanah dalam perspektif; lapisan bergradasi (terang di atas, gelap di bawah, makin dalam
 *   makin gelap dan dingin), pola simbol log bor, butir halus; bayangan di bawah tiap batas lapisan;
 *   zona jenuh kebiruan di bawah muka air tanah; color grading (soft-light hangat ke dingin) dan vinyet;
 *   kerikil hiasan dan butir alat bervolume (bayangan jatuh, cahaya dari kiri atas, kilap) dengan
 *   kedalaman: butir jauh lebih kecil, lebih pudar, dan hanyut lebih lambat.
 * Kamera meluncur halus ke sasaran (zoom gulir, tombol), tooltip HTML mengikuti kursor, bintang berkelip di
 * langit malam, dan butir sedikit berpendar di tema gelap.
 * Gerak berhenti saat tab tersembunyi atau penampang tidak terlihat. prefers-reduced-motion: penampang diam
 * (tanpa aliran dan inersia, kamera pindah langsung); gerak bisa dinyalakan lewat tombol.
 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  function mod(a, b) { return ((a % b) + b) % b; }
  function batasi(v, a, b) { return v < a ? a : v > b ? b : v; }
  function polos(t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
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
  function campur(a, b, w) { return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w]; }
  function css(c, a) {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')';
  }
  var PUTIH = [255, 255, 255], HITAM = [0, 0, 0];

  function pasang(akar) {
    var mini = akar.getAttribute('data-penampang') === 'mini';
    var q = function (s) { return akar.querySelector(s); };
    var kanvas = q('.pn-kanvas');
    var sumber = akar.getAttribute('data-sumber') ? document.getElementById(akar.getAttribute('data-sumber')) : q('.pn-data');
    if (!kanvas || !kanvas.getContext || !sumber) return;
    var ctx = kanvas.getContext('2d');
    var panggung = kanvas.parentNode;
    var kartu = q('.pn-kartu'), daftarLapis = q('.pn-lapis'), cari = q('.pn-cari'), info = q('.pn-info');
    var tGerak = q('[data-aksi="gerak"]');
    var tip = document.createElement('div');
    tip.className = 'pn-tip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
    var mqHemat = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var hemat = !!(mqHemat && mqHemat.matches);

    // Bilangan acak berbenih tetap: susunan butir sama setiap kali halaman dibuka.
    var benih = 20261115;
    var acak = function () {
      benih = (benih + 0x6D2B79F5) | 0;
      var t = Math.imul(benih ^ (benih >>> 15), 1 | benih);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var bentukAcak = function (n, a, b) { var r = []; for (var k = 0; k < n; k++) r.push(a + acak() * (b - a)); return r; };

    // ---------------------------------------------------------- data dari daftar tautan
    var W = 2600, LANGIT = mini ? 170 : 120, ATAS = 24;   // periode mendatar, udara, tebal muka atas blok (satuan dunia)
    var lapisan = [], butir = [], kerikil = [];
    var bagian = sumber.querySelectorAll('.lapis-daftar');
    var dalam = 0;
    for (var i = 0; i < bagian.length; i++) {
      var s = bagian[i], h3 = s.querySelector('h3, p'), tautan = s.querySelectorAll('a');
      var L = {
        i: i, no: (i < 9 ? '0' : '') + (i + 1), judul: h3.lastChild.textContent.trim(), jenis: s.getAttribute('data-jenis') || '',
        el: s, y0: dalam, tebal: 66 + 12 * tautan.length,
        amp: 5 + acak() * 8, gel: 2 + (i % 3), fase: acak() * TAU, laju: 0.05 + acak() * 0.07,
        arus: (i % 2 ? -1 : 1) * (5 + acak() * 7), warna: [128, 128, 128], butir: []
      };
      dalam += L.tebal;
      for (var j = 0; j < tautan.length; j++) {
        var a = tautan[j], n = tautan.length;
        var b = {
          L: L, judul: a.textContent.trim(), url: a.getAttribute('href'), acuan: a.getAttribute('data-acuan') || '',
          ket: a.getAttribute('data-ket') || '', x: ((j + 0.5) / n + (acak() - 0.5) * 0.45 / n) * W,
          fy: 0.32 + acak() * 0.36, z: acak(), fase: acak() * TAU, putar: acak() * TAU, bentuk: bentukAcak(9, 0.84, 1.1), cocok: false
        };
        b.kata = polos([b.judul, b.acuan, b.ket, L.judul, L.jenis].join(' '));
        L.butir.push(b); butir.push(b);
      }
      for (j = 0; j < 9; j++) {
        kerikil.push({ L: L, x: acak() * W, fy: 0.12 + acak() * 0.76, z: acak(), r: 2.2 + acak() * 3.6, putar: acak() * TAU, bentuk: bentukAcak(6, 0.7, 1.15) });
      }
      lapisan.push(L);
    }
    if (!lapisan.length) return;
    var bintang = [], awan = [];
    for (i = 0; i < 70; i++) bintang.push({ x: acak() * W, y: acak(), r: 0.5 + acak() * 1.1, m: acak() });
    for (i = 0; i < 5; i++) awan.push({ x: acak() * W, y: 0.15 + acak() * 0.45, l: 90 + acak() * 110, z: acak() });
    // butir jauh digambar dulu
    butir.sort(function (p, r) { return p.z - r.z; });
    kerikil.sort(function (p, r) { return p.z - r.z; });
    var H = dalam;
    var iMat = Math.min(3, lapisan.length - 1);   // muka air tanah di lapisan permeabilitas (pasir)
    var adaMat = lapisan[iMat].jenis === 'Praktikum';

    // ---------------------------------------------------------- warna dari token (ikut tema)
    var warna = {}, gelap = false, pola = [], polaButir = null;
    function bacaWarna() {
      var gaya = getComputedStyle(document.documentElement);
      ['latar', 'permukaan', 'permukaan-2', 'garis', 'teks', 'teks-2', 'aksen', 'laterit', 'sukses', 'lapis-1', 'lapis-2'].forEach(function (n) {
        warna[n] = rgb(gaya.getPropertyValue('--' + n));
      });
      gelap = (warna.latar[0] + warna.latar[1] + warna.latar[2]) / 3 < 100;
      var dasar = gelap ? warna.latar : [39, 47, 48];
      lapisan.forEach(function (L, n) {
        var c = rgb(getComputedStyle(L.el).borderLeftColor);
        // color grading kedalaman: makin dalam makin gelap dan dingin
        var k = n / Math.max(1, lapisan.length - 1);
        L.warna = c;
        L.tampil = campur(c, dasar, (gelap ? 0.32 : 0.2) * k);
        L.terang = campur(L.tampil, PUTIH, gelap ? 0.07 : 0.16);
        L.gelap = campur(L.tampil, HITAM, gelap ? 0.28 : 0.2);
      });
      warna.rumput = campur(warna.sukses, warna['lapis-1'], gelap ? 0.55 : 0.4);
      // langit: teal di atas ke kabut hangat di cakrawala (senja di tema gelap)
      warna.langitAtas = gelap ? campur(warna.latar, warna.aksen, 0.16) : campur(warna.aksen, PUTIH, 0.7);
      warna.langitBawah = gelap ? campur(warna.latar, warna.laterit, 0.16) : campur(warna.laterit, PUTIH, 0.82);
      warna.bukit = campur(warna.langitBawah, warna['lapis-2'], gelap ? 0.35 : 0.3);
      buatPola();
    }

    // Pola isian lapisan meniru simbol log bor (ubin 48 × 48 satuan dunia, digambar 2×), ditambah butir halus.
    var UBIN = 48, UBIN_HALUS = 96;
    function buatPola() {
      pola = lapisan.map(function (L, n) {
        var c = document.createElement('canvas');
        c.width = c.height = UBIN * 2;
        var g = c.getContext('2d');
        g.scale(2, 2);
        g.strokeStyle = g.fillStyle = gelap ? css(PUTIH, 0.13) : css(HITAM, 0.16);
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
          case 6: garis(0, 48, 48, 0); garis(-24, 24, 24, -24); garis(24, 72, 72, 24); break;
          case 7: garis(4, 16, 44, 16); garis(4, 40, 44, 40); garis(14, 12, 14, 20); garis(34, 36, 34, 44); break;
          case 8: garis(0, 24, 24, 0); garis(24, 48, 48, 24); garis(0, 24, 24, 48); garis(24, 0, 48, 24); break;
          default: g.strokeRect(1, 1, 22, 14); g.strokeRect(25, 1, 22, 14); g.strokeRect(13, 17, 22, 14); g.strokeRect(-11, 17, 22, 14); g.strokeRect(37, 17, 22, 14); g.strokeRect(1, 33, 22, 14); g.strokeRect(25, 33, 22, 14); // batuan
        }
        return ctx.createPattern(c, 'repeat');
      });
      // butir halus seperti tekstur foto tanah: bintik terang dan gelap acak
      var c = document.createElement('canvas');
      c.width = c.height = UBIN_HALUS * 2;
      var g = c.getContext('2d'), benihLama = benih;
      benih = 7;
      for (var k = 0; k < 2600; k++) {
        g.fillStyle = acak() < 0.5 ? css(HITAM, 0.05 + acak() * 0.09) : css(PUTIH, 0.04 + acak() * (gelap ? 0.05 : 0.1));
        var u = acak() < 0.85 ? 1.4 : 2.6;
        g.fillRect(acak() * c.width, acak() * c.height, u, u);
      }
      benih = benihLama;
      polaButir = ctx.createPattern(c, 'repeat');
    }

    // ---------------------------------------------------------- kamera dan ukuran
    var lebar = 0, tinggi = 0, dpr = 1, s0 = 1;
    // mini (hero beranda): mulai sedikit diperbesar ke bagian atas (langit, matahari, lapisan praktikum)
    var AWAL = mini ? { x: W * 0.06, y: -LANGIT, z: 1.4 } : { x: W * 0.06, y: (H - LANGIT) / 2, z: 1 };
    var cam = { x: AWAL.x, y: AWAL.y, z: AWAL.z };
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

    // ---------------------------------------------------------- bentuk lapisan dan posisi butir
    var t = 0;   // waktu simulasi (detik); hanya berjalan saat gerak otomatis aktif
    function batasAtas(n, x) {
      if (n === 0) return 2.5 * Math.sin(TAU * x * 3 / W + t * 0.04);
      var L = lapisan[n];
      return L.y0 + L.amp * Math.sin(TAU * x * L.gel / W + L.fase + t * L.laju);
    }
    function batasBawah(n, x) { return n + 1 < lapisan.length ? batasAtas(n + 1, x) : H + 60; }
    function posisiDi(L, fy, x, goyang) {
      var a = batasAtas(L.i, x), c = L.i + 1 < lapisan.length ? batasAtas(L.i + 1, x) : H;
      return a + (c - a) * fy + goyang;
    }
    function posisiButir(b, x) { return posisiDi(b.L, b.fy, x, 3 * Math.sin(t * 0.8 + b.fase)); }
    function xButir(b) { return mod(b.x + b.L.arus * (0.7 + 0.6 * b.z) * t, W); }
    function jariButir(b) { return batasi(11 * cam.z + 3, 9, 25) * (0.84 + 0.3 * b.z); }
    function yMat(x) {
      var a = batasAtas(iMat, x), c = batasBawah(iMat, x);
      return a + (c - a) * 0.22 + 1.5 * Math.sin(TAU * x * 9 / W + t * 0.9);
    }

    // ---------------------------------------------------------- keadaan
    var gerak = !hemat, sorot = -1, hover = null, dipilih = null, kataCari = '';
    var bor = null;          // {x, mulai, p, hasil: [{L, b}]}
    var terbang = null;      // {dari, ke, mulai, lama}
    var vx = 0, vy = 0, seret = null, jari = {}, cubit = null;
    var diam = 0;            // waktu terakhir pengguna berinteraksi (ms)
    var sasaranZ = null;     // {z, px, py}: zoom gulir meluncur ke sasaran, jangkar di bawah kursor
    var tampak = [];         // posisi layar butir pada gambar terakhir, untuk klik dan hover

    // ---------------------------------------------------------- menggambar
    function jalur(px, ys) {
      ctx.beginPath();
      ctx.moveTo(px[0], ys[0]);
      for (var q = 1; q < px.length; q++) ctx.lineTo(px[q], ys[q]);
    }
    // Pola diletakkan di ruang dunia supaya ikut bergeser dan membesar bersama tanah.
    function aturPola(p) {
      if (p && p.setTransform && window.DOMMatrix) {
        var s = skala() / 2;
        p.setTransform(new DOMMatrix([s, 0, 0, s, keLayarX(0), keLayarY(0)]));
      }
    }

    function gambar() {
      var s = skala(), w = lebar, h = tinggi, q;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      var wx0 = keDuniaX(0), wx1 = keDuniaX(w), langkah = 10 / s;
      var xs = [];
      for (var x = wx0 - langkah; x <= wx1 + langkah * 2; x += langkah) xs.push(x);
      var px = xs.map(keLayarX);
      var batas = lapisan.map(function (L, n) { return xs.map(function (x) { return keLayarY(batasAtas(n, x)); }); });
      var permukaan = batas[0], belakang = permukaan.map(function (y) { return y - ATAS * s; });

      gambarLangit(px, xs, belakang);
      // muka atas blok tanah: rumput dilihat sedikit dari atas
      jalur(px, belakang);
      for (q = px.length - 1; q >= 0; q--) ctx.lineTo(px[q], permukaan[q]);
      ctx.closePath();
      var gr = ctx.createLinearGradient(0, keLayarY(-ATAS - 4), 0, keLayarY(4));
      gr.addColorStop(0, css(campur(warna.rumput, PUTIH, gelap ? 0.05 : 0.25)));
      gr.addColorStop(1, css(campur(warna.rumput, HITAM, gelap ? 0.25 : 0.12)));
      ctx.fillStyle = gr; ctx.fill();
      if (polaButir) { aturPola(polaButir); ctx.fillStyle = polaButir; ctx.fill(); }

      // lapisan: gradasi terang di atas ke gelap di bawah, pola log bor, butir halus
      lapisan.forEach(function (L, n) {
        var atas = batas[n], bawah = batas[n + 1];
        if (bawah && Math.max.apply(null, bawah) < -4) return;
        if (Math.min.apply(null, atas) > h + 4) return;
        jalur(px, atas);
        if (bawah) for (q = px.length - 1; q >= 0; q--) ctx.lineTo(px[q], bawah[q]);
        else { ctx.lineTo(px[px.length - 1], h + 10); ctx.lineTo(px[0], h + 10); }
        ctx.closePath();
        var g = ctx.createLinearGradient(0, keLayarY(L.y0 - L.amp), 0, keLayarY(L.y0 + L.tebal + 12));
        g.addColorStop(0, css(L.terang)); g.addColorStop(0.55, css(L.tampil)); g.addColorStop(1, css(L.gelap));
        ctx.fillStyle = g; ctx.fill();
        if (pola[n]) { aturPola(pola[n]); ctx.fillStyle = pola[n]; ctx.fill(); }
        if (polaButir) { aturPola(polaButir); ctx.fillStyle = polaButir; ctx.fill(); }
        if (sorot >= 0 && sorot !== n) { ctx.fillStyle = css(gelap ? warna.latar : warna.permukaan, gelap ? 0.5 : 0.45); ctx.fill(); }
      });
      // bayangan di bawah tiap batas: lapisan atas menaungi lapisan di bawahnya
      for (var k = 0; k < lapisan.length; k++) {
        var g2 = batas[k];
        if (Math.min.apply(null, g2) > h + 10 || Math.max.apply(null, g2) < -10) continue;
        ctx.save();
        jalur(px, g2); ctx.lineTo(px[px.length - 1], h + 20); ctx.lineTo(px[0], h + 20); ctx.closePath();
        ctx.clip();
        ctx.shadowColor = css(HITAM, gelap ? 0.6 : 0.38);
        ctx.shadowBlur = Math.max(6, 16 * s); ctx.shadowOffsetY = Math.max(2, 5 * s);
        jalur(px, g2.map(function (y) { return y - 2; }));
        ctx.strokeStyle = css(HITAM, gelap ? 0.5 : 0.3); ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
        jalur(px, g2);
        ctx.strokeStyle = k === 0 ? css(campur(warna.rumput, HITAM, 0.45)) : css(HITAM, gelap ? 0.4 : 0.22);
        ctx.lineWidth = k === 0 ? 1.4 : 1; ctx.stroke();
      }
      // lapisan yang disorot: garis aksen di batas atas dan bawahnya
      if (sorot >= 0) {
        [batas[sorot], batas[sorot + 1]].forEach(function (g) {
          if (!g) return;
          jalur(px, g); ctx.strokeStyle = css(warna.aksen); ctx.lineWidth = 2.5; ctx.stroke();
        });
      }
      gambarRumput(wx0, wx1);
      if (adaMat) gambarMat(px, xs);
      gambarKerikil(wx0, wx1);
      gradasiWarna(w, h);
      if (bor) gambarBor();
      gambarButir(wx0, wx1);
      gambarTandaLapisan();
    }

    function gambarLangit(px, xs, belakang) {
      var w = lebar, dasarLangit = Math.max.apply(null, belakang) + 2;
      if (dasarLangit <= 0) return;
      var g = ctx.createLinearGradient(0, keLayarY(-LANGIT - 20), 0, dasarLangit);
      g.addColorStop(0, css(warna.langitAtas)); g.addColorStop(1, css(warna.langitBawah));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, dasarLangit);
      if (gelap) {
        // bintang berkelip, bergeser sedikit bersama kamera (paralaks jauh)
        bintang.forEach(function (b) {
          var bx = mod(b.x - cam.x * 0.08, W) / W * Math.max(w, 1) * 1.0, by = b.y * (dasarLangit - 6);
          ctx.fillStyle = css(PUTIH, 0.25 + 0.5 * b.m * (0.6 + 0.4 * Math.sin(t * 1.3 + b.m * 20)));
          ctx.fillRect(bx, by, b.r, b.r);
        });
      }
      // matahari (bulan di tema gelap): cahaya lembut dari kiri atas
      var mx = w * 0.16, my = keLayarY(-LANGIT * 0.68), rr = Math.max(w, tinggi) * 0.6;
      var c = gelap ? campur(warna.aksen, PUTIH, 0.4) : campur(warna.laterit, [255, 190, 110], 0.55);
      var cahaya = ctx.createRadialGradient(mx, my, 0, mx, my, rr);
      cahaya.addColorStop(0, css(c, gelap ? 0.22 : 0.6)); cahaya.addColorStop(0.3, css(c, gelap ? 0.07 : 0.2)); cahaya.addColorStop(1, css(c, 0));
      ctx.fillStyle = cahaya; ctx.fillRect(0, 0, w, dasarLangit);
      ctx.beginPath(); ctx.arc(mx, my, Math.max(9, 16 * skala()), 0, TAU);
      ctx.fillStyle = css(campur(c, PUTIH, gelap ? 0.55 : 0.18), gelap ? 0.85 : 1); ctx.fill();
      ctx.beginPath(); ctx.arc(mx, my, Math.max(9, 16 * skala()) * 0.62, 0, TAU);
      ctx.fillStyle = css(campur(c, PUTIH, 0.7), gelap ? 0.6 : 0.9); ctx.fill();
      // awan tipis, hanyut pelan dan bergeser lebih lambat dari kamera
      awan.forEach(function (a) {
        var ax = mod(a.x + t * (4 + 6 * a.z) - cam.x * (0.2 + 0.3 * a.z), W) / W * (w + 400) - 200;
        var ay = keLayarY(-LANGIT) + a.y * (dasarLangit - keLayarY(-LANGIT)), al = a.l * skala() * 1.6;
        for (var k = 0; k < 4; k++) {
          var cx = ax + (k - 1.5) * al * 0.32, cy = ay - Math.sin(k * 1.3) * al * 0.08, cr = al * (0.22 + 0.06 * (k % 2));
          var ga = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
          ga.addColorStop(0, css(gelap ? warna.teks : PUTIH, gelap ? 0.06 : 0.55)); ga.addColorStop(1, css(gelap ? warna.teks : PUTIH, 0));
          ctx.fillStyle = ga; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill();
        }
      });
      // punggung bukit jauh, bergeser lebih lambat dari kamera (paralaks)
      ctx.beginPath();
      for (var q = 0; q < px.length; q++) {
        var u = cam.x * 0.35 + (xs[q] - cam.x);   // bukit jauh: hanya sepertiga gerak kamera yang terasa
        var tb = 18 + 12 * Math.sin(u * TAU / 900) + 8 * Math.sin(u * TAU / 370 + 1.3);
        var y = belakang[q] - tb * skala();
        if (q === 0) ctx.moveTo(px[q], y); else ctx.lineTo(px[q], y);
      }
      for (q = px.length - 1; q >= 0; q--) ctx.lineTo(px[q], belakang[q] + 1);
      ctx.closePath();
      ctx.fillStyle = css(warna.bukit, gelap ? 0.8 : 0.7); ctx.fill();
    }

    function gambarRumput(wx0, wx1) {
      ctx.strokeStyle = css(campur(warna.rumput, HITAM, gelap ? 0.1 : 0.35), 0.85);
      ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      var jarak = 26, mulai = Math.floor(wx0 / jarak) * jarak;
      ctx.beginPath();
      for (var x = mulai; x <= wx1 + jarak; x += jarak) {
        if (mod(x, jarak * 3) === jarak) continue;
        var gx = keLayarX(x), gy = keLayarY(batasAtas(0, x)) - 1, u = Math.max(3, 5 * cam.z), angin = Math.sin(t * 1.3 + x * 0.02) * u * 0.25;
        ctx.moveTo(gx - u * 0.6 + angin, gy - u); ctx.lineTo(gx, gy);
        ctx.moveTo(gx + u * 0.6 + angin, gy - u); ctx.lineTo(gx, gy);
        ctx.moveTo(gx + angin * 1.4, gy - u * 1.25); ctx.lineTo(gx, gy);
      }
      ctx.stroke();
    }

    function gambarMat(px, xs) {
      var y = xs.map(function (x) { return keLayarY(yMat(x)); });
      // zona jenuh: tanah di bawah muka air tanah sedikit kebiruan
      jalur(px, y); ctx.lineTo(px[px.length - 1], tinggi + 10); ctx.lineTo(px[0], tinggi + 10); ctx.closePath();
      var y0 = Math.min.apply(null, y);
      var g = ctx.createLinearGradient(0, y0, 0, Math.max(y0 + 1, tinggi));
      g.addColorStop(0, css(warna.aksen, 0.2)); g.addColorStop(0.25, css(warna.aksen, gelap ? 0.1 : 0.09)); g.addColorStop(1, css(warna.aksen, 0.04));
      ctx.fillStyle = g; ctx.fill();
      // garis muka air: kilap tipis di atas, garis putus mengalir
      jalur(px, y.map(function (v) { return v - 1.5; }));
      ctx.strokeStyle = css(PUTIH, gelap ? 0.25 : 0.55); ctx.lineWidth = 1; ctx.stroke();
      jalur(px, y);
      ctx.setLineDash([10, 7]); ctx.lineDashOffset = -t * 18;
      ctx.strokeStyle = css(warna.aksen, 0.95); ctx.lineWidth = 1.8; ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      var jarak = W / 3;
      for (var x = Math.floor(xs[0] / jarak) * jarak + jarak * 0.4; x <= xs[xs.length - 1]; x += jarak) {
        var sx = keLayarX(x), sy = keLayarY(yMat(x));
        ctx.beginPath(); ctx.moveTo(sx - 7, sy - 12); ctx.lineTo(sx + 7, sy - 12); ctx.lineTo(sx, sy - 2); ctx.closePath();
        ctx.fillStyle = css(warna.permukaan); ctx.fill();
        ctx.strokeStyle = css(warna.aksen); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx - 6, sy + 4); ctx.lineTo(sx + 6, sy + 4); ctx.moveTo(sx - 3, sy + 8); ctx.lineTo(sx + 3, sy + 8); ctx.stroke();
      }
    }

    function gambarKerikil(wx0, wx1) {
      var s = skala();
      kerikil.forEach(function (k) {
        var kx = mod(k.x + k.L.arus * (0.5 + 0.7 * k.z) * t, W);
        var r = Math.max(1.4, k.r * s * (0.7 + 0.5 * k.z));
        for (var m = Math.floor((wx0 - kx) / W); kx + m * W <= wx1 + 10; m++) {
          var X = kx + m * W, sx = keLayarX(X), sy = keLayarY(posisiDi(k.L, k.fy, X, 0));
          if (sx < -10 || sx > lebar + 10 || sy < -10 || sy > tinggi + 10) continue;
          var c = campur(k.L.tampil, k.z > 0.5 ? PUTIH : HITAM, 0.25 + 0.15 * Math.abs(k.z - 0.5));
          ctx.beginPath();
          var n = k.bentuk.length;
          for (var q = 0; q < n; q++) {
            var sd = k.putar + q / n * TAU, rr = r * k.bentuk[q];
            if (q === 0) ctx.moveTo(sx + Math.cos(sd) * rr, sy + Math.sin(sd) * rr); else ctx.lineTo(sx + Math.cos(sd) * rr, sy + Math.sin(sd) * rr);
          }
          ctx.closePath();
          ctx.fillStyle = css(c, 0.55 + 0.4 * k.z); ctx.fill();
          if (r > 2.5) { ctx.fillStyle = css(PUTIH, 0.25 * k.z); ctx.fillRect(sx - r * 0.45, sy - r * 0.5, r * 0.4, r * 0.3); }
        }
      });
    }

    // Color grading: cahaya hangat dari kiri atas ke bayangan dingin di kanan bawah, lalu vinyet.
    function gradasiWarna(w, h) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      var g = ctx.createLinearGradient(0, 0, w * 0.85, h);
      g.addColorStop(0, css([255, 196, 128], gelap ? 0.35 : 0.55));
      g.addColorStop(0.5, css([128, 128, 128], 0));
      g.addColorStop(1, css([20, 70, 92], gelap ? 0.55 : 0.5));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.restore();
      var v = ctx.createRadialGradient(w * 0.45, h * 0.4, Math.min(w, h) * 0.3, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
      v.addColorStop(0, css(HITAM, 0)); v.addColorStop(1, css(HITAM, gelap ? 0.42 : 0.2));
      ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    }

    function gambarBor() {
      var s = skala(), x = bor.x + Math.round((cam.x - bor.x) / W) * W, sx = keLayarX(x);
      if (sx < -60 || sx > lebar + 60) return;
      var yTanah = keLayarY(batasAtas(0, x)), dalamBor = bor.p * H, lb = Math.max(14, 22 * s);
      var tinggiMenara = Math.max(34, 58 * s), yDasar = keLayarY(Math.min(dalamBor, H));
      // bayangan menara di tanah
      ctx.fillStyle = css(HITAM, 0.18);
      ctx.beginPath(); ctx.ellipse(sx + tinggiMenara * 0.3, yTanah - 1, tinggiMenara * 0.55, 3.5, 0, 0, TAU); ctx.fill();
      // menara bor: kaki tiga dan katrol; garis kilap tipis karena logam disinari dari kiri
      ctx.lineCap = 'round';
      [[css(campur(warna.teks, PUTIH, gelap ? 0 : 0.15)), 2.2, 0], [css(PUTIH, gelap ? 0.25 : 0.5), 0.9, -0.8]].forEach(function (g) {
        ctx.strokeStyle = g[0]; ctx.lineWidth = g[1];
        ctx.beginPath();
        ctx.moveTo(sx - tinggiMenara * 0.42 + g[2], yTanah); ctx.lineTo(sx + g[2], yTanah - tinggiMenara);
        ctx.lineTo(sx + tinggiMenara * 0.42 + g[2], yTanah);
        ctx.moveTo(sx - tinggiMenara * 0.21, yTanah - tinggiMenara * 0.5 + g[2]); ctx.lineTo(sx + tinggiMenara * 0.21, yTanah - tinggiMenara * 0.5 + g[2]);
        ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(sx, yTanah - tinggiMenara, 4, 0, TAU); ctx.fillStyle = css(warna.laterit); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx, yTanah - tinggiMenara); ctx.lineTo(sx, yTanah); ctx.strokeStyle = css(warna.teks, 0.6); ctx.lineWidth = 1; ctx.stroke();
      // lubang bor gelap, berisi contoh tanah tiap lapisan yang sudah ditembus (silinder: terang di kiri)
      ctx.save();
      ctx.shadowColor = css(HITAM, 0.4); ctx.shadowBlur = 10; ctx.shadowOffsetX = 3;
      ctx.fillStyle = css(campur(warna.teks, HITAM, 0.3));
      ctx.fillRect(sx - lb / 2, yTanah, lb, yDasar - yTanah);
      ctx.restore();
      lapisan.forEach(function (L, n) {
        var a = batasAtas(n, x), c = Math.min(batasBawah(n, x), H);
        if (a >= dalamBor) return;
        c = Math.min(c, dalamBor);
        var ya = keLayarY(a) + 1.5, yb = keLayarY(c) - 1.5;
        var g = ctx.createLinearGradient(sx - lb / 2, 0, sx + lb / 2, 0);
        g.addColorStop(0, css(campur(L.tampil, PUTIH, 0.3))); g.addColorStop(0.45, css(L.tampil)); g.addColorStop(1, css(campur(L.tampil, HITAM, 0.35)));
        ctx.fillStyle = g;
        ctx.fillRect(sx - lb / 2 + 3, ya, lb - 6, yb - ya);
      });
      ctx.strokeStyle = css(warna.teks); ctx.lineWidth = 2;
      ctx.strokeRect(sx - lb / 2, yTanah, lb, yDasar - yTanah);
      // garis putus dari inti bor ke alat terpilih di tiap lapisan
      bor.hasil.forEach(function (hs) {
        var n = hs.L.i, a = batasAtas(n, x), c = Math.min(batasBawah(n, x), H);
        if ((a + c) / 2 > dalamBor) return;
        var bx = xButir(hs.b), pilih = bx + Math.round((x - bx) / W) * W;
        var tx = keLayarX(pilih), ty = keLayarY(posisiButir(hs.b, pilih)), ky = keLayarY((a + c) / 2);
        var kx = sx + (tx > sx ? lb / 2 : -lb / 2);
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(tx, ty);
        ctx.strokeStyle = css(gelap ? warna.teks : PUTIH, 0.9); ctx.lineWidth = 1.4; ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(kx, ky, 3.2, 0, TAU); ctx.fillStyle = css(warna.laterit); ctx.fill();
      });
    }

    function gambarButir(wx0, wx1) {
      var adaCari = kataCari !== '', label2 = [], sk = skala();
      var semua = !mini && cam.z >= (lebar >= 640 ? 1 : 1.6);
      tampak = [];
      butir.forEach(function (b) {
        var r = jariButir(b), bx = xButir(b);
        for (var k = Math.floor((wx0 - r / sk - bx) / W); bx + k * W <= wx1 + r / sk; k++) {
          var X = bx + k * W, sx = keLayarX(X), sy = keLayarY(posisiButir(b, X));
          if (sx < -r * 2 || sx > lebar + r * 2 || sy < -r * 2 || sy > tinggi + r * 2) continue;
          var aktif = b === hover || b === dipilih || (adaCari && b.cocok);
          var redup = (adaCari && !b.cocok) || (sorot >= 0 && sorot !== b.L.i && !aktif);
          ctx.globalAlpha = redup ? 0.3 : 0.8 + 0.2 * b.z;
          butir3d(b, sx, sy, r, aktif);
          ctx.globalAlpha = 1;
          tampak.push({ b: b, x: sx, y: sy, r: r });
          if (aktif || semua) label2.push([b.judul, sx, sy - r - 8, aktif]);
        }
      });
      label2.forEach(function (l) { label(l[0], l[1], l[2], l[3]); });
    }

    // Butir alat bervolume: bayangan jatuh, badan disinari dari kiri atas, inti berwarna lapisan, kilap.
    function butir3d(b, sx, sy, r, aktif) {
      var bayang = ctx.createRadialGradient(sx + r * 0.3, sy + r * 0.75, 0, sx + r * 0.3, sy + r * 0.75, r * 1.25);
      bayang.addColorStop(0, css(HITAM, gelap ? 0.55 : 0.35)); bayang.addColorStop(1, css(HITAM, 0));
      ctx.fillStyle = bayang;
      ctx.beginPath(); ctx.ellipse(sx + r * 0.3, sy + r * 0.75, r * 1.25, r * 0.55, 0, 0, TAU); ctx.fill();
      if (gelap && !aktif) {
        // tema gelap: butir berpendar lembut dengan warna lapisannya
        var pendar = ctx.createRadialGradient(sx, sy, r * 0.3, sx, sy, r * 2.6);
        pendar.addColorStop(0, css(campur(b.L.warna, PUTIH, 0.2), 0.5)); pendar.addColorStop(1, css(b.L.warna, 0));
        ctx.fillStyle = pendar; ctx.beginPath(); ctx.arc(sx, sy, r * 2.6, 0, TAU); ctx.fill();
      }
      if (aktif) {
        var halo = ctx.createRadialGradient(sx, sy, r * 0.6, sx, sy, r * 3.2);
        halo.addColorStop(0, css(warna.aksen, 0.45)); halo.addColorStop(1, css(warna.aksen, 0));
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(sx, sy, r * 3.2, 0, TAU); ctx.fill();
      }
      ctx.beginPath();
      var m = b.bentuk.length, putar = b.putar + t * 0.06;
      for (var q = 0; q < m; q++) {
        var sd = putar + q / m * TAU, rr = r * b.bentuk[q];
        if (q === 0) ctx.moveTo(sx + Math.cos(sd) * rr, sy + Math.sin(sd) * rr); else ctx.lineTo(sx + Math.cos(sd) * rr, sy + Math.sin(sd) * rr);
      }
      ctx.closePath();
      var badan = ctx.createRadialGradient(sx - r * 0.38, sy - r * 0.42, r * 0.08, sx, sy, r * 1.3);
      badan.addColorStop(0, css(campur(warna.permukaan, PUTIH, 0.7)));
      badan.addColorStop(0.5, css(warna.permukaan));
      badan.addColorStop(1, css(campur(warna.permukaan, gelap ? HITAM : warna.teks, gelap ? 0.45 : 0.3)));
      ctx.fillStyle = badan; ctx.fill();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = aktif ? css(warna.aksen) : css(gelap ? HITAM : warna.teks, gelap ? 0.6 : 0.45);
      ctx.lineWidth = aktif ? 2.4 : 1; ctx.stroke();
      var inti = ctx.createRadialGradient(sx - r * 0.14, sy - r * 0.16, 0, sx, sy, r * 0.42);
      inti.addColorStop(0, css(campur(b.L.warna, PUTIH, 0.35))); inti.addColorStop(1, css(campur(b.L.warna, HITAM, 0.3)));
      ctx.beginPath(); ctx.arc(sx, sy, r * 0.38, 0, TAU); ctx.fillStyle = inti; ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx - r * 0.42, sy - r * 0.46, r * 0.22, r * 0.12, -0.6, 0, TAU);
      ctx.fillStyle = css(PUTIH, gelap ? 0.45 : 0.85); ctx.fill();
      if (b === dipilih) {
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.arc(sx, sy, r + 7, 0, TAU);
        ctx.strokeStyle = css(warna.aksen); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Label berlatar permukaan dengan bayangan lembut, tidak keluar dari kanvas.
    function label(teks, x, y, tegas, kiri) {
      ctx.font = (tegas ? '700' : '600') + ' 13px "Plus Jakarta Sans", system-ui, sans-serif';
      if (teks.length > 44) teks = teks.slice(0, 42) + '…';
      var lb = ctx.measureText(teks).width + 14, tg = 24;
      var x0 = kiri ? x : x - lb / 2, y0 = y - tg;
      x0 = batasi(x0, lebar > 300 ? 46 : 4, lebar - lb - 4); y0 = batasi(y0, 4, tinggi - tg - 4);
      ctx.save();
      ctx.shadowColor = css(HITAM, gelap ? 0.5 : 0.18); ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      ctx.fillStyle = css(warna.permukaan, 0.96);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x0, y0, lb, tg, 5); else ctx.rect(x0, y0, lb, tg);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = tegas ? css(warna.aksen) : css(warna.garis); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = css(warna.teks); ctx.textBaseline = 'middle';
      ctx.fillText(teks, x0 + 7, y0 + tg / 2 + 0.5);
    }

    // Nomor lapisan menempel di tepi kiri, pada bagian lapisan yang terlihat.
    function gambarTandaLapisan() {
      var x = keDuniaX(0);
      ctx.font = '700 13px "Plus Jakarta Sans", system-ui, sans-serif';
      lapisan.forEach(function (L, n) {
        var a = keLayarY(batasAtas(n, x)), c = keLayarY(n + 1 < lapisan.length ? batasAtas(n + 1, x) : H);
        var ta = Math.max(a, 0), tb = Math.min(c, tinggi);
        if (tb - ta < 24) return;
        var teks = !mini && cam.z >= 1.35 ? L.no + '  ' + L.judul : L.no;
        var lb = ctx.measureText(teks).width + 18, y = batasi((a + c) / 2, ta + 12, tb - 12);
        ctx.save();
        ctx.shadowColor = css(HITAM, gelap ? 0.5 : 0.2); ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
        ctx.fillStyle = css(warna.permukaan, 0.95);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(8, y - 11, lb, 22, 4); else ctx.rect(8, y - 11, lb, 22);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = sorot === n ? css(warna.aksen) : css(warna.garis); ctx.lineWidth = sorot === n ? 2 : 1; ctx.stroke();
        ctx.fillStyle = css(L.warna); ctx.fillRect(8, y - 11, 4, 22);
        ctx.fillStyle = css(warna.teks); ctx.textBaseline = 'middle';
        ctx.fillText(teks, 17, y + 0.5);
      });
    }

    // ---------------------------------------------------------- putaran gerak
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
      if (sasaranZ && !terbang) {
        var zBaru = cam.z + (sasaranZ.z - cam.z) * (1 - Math.exp(-dt * 14));
        if (Math.abs(sasaranZ.z - zBaru) < 0.002) zBaru = sasaranZ.z;
        perbesarDi(sasaranZ.px, sasaranZ.py, zBaru);
        if (zBaru === sasaranZ.z) sasaranZ = null;
      }
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
        // kamera hanyut pelan saat dibiarkan
        if (gerak && !seret && !cubit && kini - diam > (mini ? 1500 : 2500)) cam.x += (mini ? 22 : 16) / s * dt;
      }
      if (bor && bor.p < 1) bor.p = Math.min(1, (kini - bor.mulai) / 1700);
      jepitKamera();
      gambar();
      var lanjut = gerak || terbang || sasaranZ || (vx || vy) || (bor && bor.p < 1);
      if (lanjut && terlihat && !document.hidden) requestAnimationFrame(langkahBingkai);
      else jalan = false;
    }

    // ---------------------------------------------------------- kamera: perbesar, terbang
    function perbesarDi(px, py, z) {
      z = batasi(z, Z_MIN, Z_MAKS);
      var wx = keDuniaX(px), wy = keDuniaY(py);
      cam.z = z;
      cam.x = wx - (px - lebar / 2) / skala();
      cam.y = wy - (py - tinggi / 2) / skala();
      jepitKamera();
      aturSentuh(cam.z);
    }
    // Zoom 1×: geser mendatar di kanvas, gulir halaman tetap jalan. Diperbesar: kanvas menangkap semua sentuhan.
    // Penampang mini di beranda selalu membiarkan gulir halaman.
    function aturSentuh(z) { kanvas.style.touchAction = !mini && z > 1.02 ? 'none' : 'pan-y'; }
    function terbangKe(x, y, z) {
      z = batasi(z, Z_MIN, Z_MAKS);
      var dx = mod(x - cam.x + W / 2, W) - W / 2;   // jalur mendatar terpendek di penampang yang berulang
      var ke = { x: cam.x + dx, y: y, z: z };
      vx = vy = 0;
      if (hemat) { cam.x = ke.x; cam.y = ke.y; cam.z = ke.z; jepitKamera(); terbang = null; }
      else terbang = { dari: { x: cam.x, y: cam.y, z: cam.z }, ke: ke, mulai: performance.now(), lama: 600 };
      aturSentuh(z);
      sentuh(); minta();
    }
    function sentuh() { diam = performance.now(); }

    // ---------------------------------------------------------- kartu: alat dan log bor
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
      if (!kartu) { minta(); return; }
      sisiKartu(sx);
      kartu.textContent = '';
      kartu.style.setProperty('--lapis', css(b.L.warna));
      kartu.appendChild(el('p', 'lapis-nama', 'Lapisan ' + b.L.no + ', ' + b.L.judul));
      kartu.appendChild(el('h3', '', b.judul));
      if (b.acuan) kartu.appendChild(el('span', 'chip', b.acuan));
      if (b.ket && !mini) kartu.appendChild(el('p', '', b.ket));
      var aksi = el('div', 'aksi');
      var buka = el('a', 'tombol utama kecil', b.L.jenis === 'Kalkulator' ? 'Buka kalkulator' : b.L.jenis === 'Praktikum' ? 'Buka alat' : 'Buka');
      buka.href = b.url;
      aksi.appendChild(buka); aksi.appendChild(tombolTutup());
      kartu.appendChild(aksi);
      kartu.hidden = false;
      minta();
    }
    function tutupKartu() {
      if (kartu) { kartu.hidden = true; kartu.textContent = ''; }
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
      if (kartu) {
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
      }
      sentuh(); minta();
    }

    // ---------------------------------------------------------- penunjuk: seret, klik, cubit, gulir
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
        if (!seret.gerak && Math.hypot(dx, dy) > 5) { seret.gerak = true; kanvas.classList.add('diseret'); tip.hidden = true; }
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
        if (h) {
          sentuh();
          tip.textContent = h.judul + (h.acuan ? ', ' + h.acuan : '') + '. Lapisan ' + h.L.no + ', ' + h.L.judul;
          tip.hidden = false;
          tip.style.left = Math.min(p.x + 16, lebar - tip.offsetWidth - 8) + 'px';
          tip.style.top = Math.min(p.y + 16, tinggi - tip.offsetHeight - 8) + 'px';
        } else if (!tip.hidden) tip.hidden = true;
        if (!h && lapisanDi(p) < 0) {
          tip.textContent = 'Klik untuk uji bor di titik ini'; tip.hidden = false;
          tip.style.left = Math.min(p.x + 16, lebar - tip.offsetWidth - 8) + 'px'; tip.style.top = (p.y + 16) + 'px';
        }
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
    kanvas.addEventListener('pointerleave', function () { tip.hidden = true; if (hover) { hover = null; minta(); } });
    if (!mini) {
      kanvas.addEventListener('wheel', function (e) {
        e.preventDefault();
        var p = titikLayar(e), d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        terbang = null;
        var z0 = sasaranZ ? sasaranZ.z : cam.z;
        if (hemat) perbesarDi(p.x, p.y, z0 * Math.exp(-d * 0.0015));
        else sasaranZ = { z: batasi(z0 * Math.exp(-d * 0.0015), Z_MIN, Z_MAKS), px: p.x, py: p.y };
        sentuh(); minta();
      }, { passive: false });
    }

    // ---------------------------------------------------------- panel: daftar lapisan, cari, tombol
    var tombolLapis = !daftarLapis ? [] : lapisan.map(function (L, n) {
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
      if (info) {
        if (n >= 0) info.textContent = 'Lapisan ' + lapisan[n].no + ', ' + lapisan[n].judul + ': ' + lapisan[n].butir.length + ' alat.';
        else if (!kataCari) info.textContent = '';
      }
      minta();
    }

    function saring() {
      kataCari = polos(cari.value.trim());
      var n = 0;
      butir.forEach(function (b) { b.cocok = kataCari !== '' && b.kata.indexOf(kataCari) >= 0; if (b.cocok) n++; });
      if (info) info.textContent = kataCari === '' ? '' : n === 1 ? '1 butir cocok, dibuka di penampang.' : n ? n + ' butir cocok. Tekan Enter untuk menuju butir terdekat.' : 'Tidak ada butir yang cocok. Coba kata lain, misalnya nama uji atau nomor SNI.';
      if (n === 1) menujuCocok();
      minta();
    }
    if (cari) {
      cari.addEventListener('input', saring);
      cari.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        menujuCocok();
      });
    }
    // Terbang ke butir cocok yang paling dekat dengan tengah layar dan buka kartunya.
    function menujuCocok() {
      var cocok = butir.filter(function (b) { return b.cocok; });
      if (!cocok.length) return;
      var jarakKe = function (b) { return Math.abs(mod(xButir(b) - cam.x + W / 2, W) - W / 2); };
      cocok.sort(function (a, b) { return jarakKe(a) - jarakKe(b); });
      var b = cocok[0], x = xButir(b);
      terbangKe(x, posisiButir(b, x), Math.max(cam.z, 1.4));
      bukaKartuButir(b, lebar / 2 + 1);
    }

    function aturGerak(nyala) {
      gerak = nyala;
      if (tGerak) tGerak.setAttribute('aria-pressed', nyala ? 'true' : 'false');
      minta();
    }
    aturGerak(gerak);
    var aksi = {
      gerak: function () { aturGerak(!gerak); },
      bor: function () { ujiBor(cam.x); },
      besar: function () { terbangKe(cam.x, cam.y, cam.z * 1.35); },
      kecil: function () { terbangKe(cam.x, cam.y, cam.z / 1.35); },
      ulang: function () {
        tutupKartu(); pilihLapisan(-1, false);
        if (cari) { cari.value = ''; saring(); }
        terbangKe(AWAL.x, AWAL.y, 1);
      }
    };
    Array.prototype.forEach.call(akar.querySelectorAll('[data-aksi]'), function (tb) {
      var f = aksi[tb.getAttribute('data-aksi')];
      if (f) tb.addEventListener('click', f);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && kartu && !kartu.hidden && akar.contains(document.activeElement || null)) tutupKartu();
    });

    // ---------------------------------------------------------- jeda, tema, ukuran
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

    panggung.appendChild(tip);
    akar.hidden = false;
    bacaWarna();
    ukur();
    gambar();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(minta);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-penampang]'), pasang);
})();
