/*
 * Blok tanah 3D di dasbor beranda. Hanya tampilan: tidak menyentuh hitungan.
 * Sepuluh lapisan (enam kelompok uji, tiga kategori kalkulator, batuan dasar) menjadi lempeng 3D yang
 * bertumpuk di atas lantai kertas milimeter. Kanvas 2D dengan proyeksi perspektif buatan sendiri.
 *
 * - Seret = putar blok (kiri-kanan) dan miringkan (atas-bawah), dengan inersia. Blok berputar pelan saat dibiarkan.
 * - Klik lempeng (atau tombol nomor lapisan) = lempeng bergeser keluar ke arah pembaca dan menampilkan alatnya
 *   sebagai pin di permukaannya; panel di bawah kanvas berisi tautan alat lapisan itu.
 * - Tombol "Urai lapisan" merenggangkan semua lempeng supaya semua pin terlihat.
 * - Kotak cari beranda (#cariBeranda) menyorot pin yang cocok dan memilih lapisannya.
 * - Alat yang terakhir dibuka (localStorage geosr-riwayat, sama dengan daftar "Lanjutkan") diberi cincin laterit.
 * Cahaya tetap di kiri atas pembaca: sisi atas terang dan hangat, sisi samping lebih gelap dan dingin,
 * bayangan blok jatuh di lantai. Gerak berhenti saat tab tersembunyi atau blok di luar layar;
 * prefers-reduced-motion: tanpa putar otomatis dan tanpa peralihan.
 * Data dibaca dari daftar tautan .lapis-daftar di dalam .pn-data (dibangun bangun_situs.py).
 */
(function () {
  'use strict';
  var akar = document.querySelector('[data-blok3d]');
  if (!akar) return;
  var kanvas = akar.querySelector('.b3-kanvas'), data = akar.querySelector('.pn-data');
  if (!kanvas || !kanvas.getContext || !data) return;
  var ctx = kanvas.getContext('2d'), panggung = kanvas.parentNode;
  var tombolLapisan = akar.querySelector('.b3-lapis'), info = akar.querySelector('.b3-info'), kartu = akar.querySelector('.pn-kartu');
  var hemat = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var TAU = Math.PI * 2;
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
  function css(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')'; }
  var PUTIH = [255, 255, 255], HITAM = [0, 0, 0], HANGAT = [255, 196, 140], DINGIN = [24, 62, 78];
  var benih = 1511;
  function acak() {
    benih = (benih + 0x6D2B79F5) | 0;
    var t = Math.imul(benih ^ (benih >>> 15), 1 | benih);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // ------------------------------------------------------------ data
  var BX = 1.25, BZ = 0.72, RENGGANG = 0.34;   // renggang antarlempeng saat diurai   // setengah lebar dan setengah dalam blok
  var lapisan = [], pin = [];
  Array.prototype.forEach.call(data.querySelectorAll('.lapis-daftar'), function (s, i) {
    var judul = s.querySelector('h3, p'), tautan = s.querySelectorAll('a');
    var L = { i: i, no: (i < 9 ? '0' : '') + (i + 1), judul: judul.lastChild.textContent.trim(), jenis: s.getAttribute('data-jenis') || '',
      el: s, tebal: 0.17 + 0.04 * tautan.length, pin: [], angkat: 0, keluar: 0, bintik: [] };
    Array.prototype.forEach.call(tautan, function (a, j) {
      var n = tautan.length;
      var p = { L: L, judul: a.textContent.trim(), url: a.getAttribute('href'), acuan: a.getAttribute('data-acuan') || '',
        x: (-0.72 + 1.44 * (j + 0.5) / n) * BX + (acak() - 0.5) * 0.18, z: (acak() - 0.5) * 0.9 * BZ, cocok: false, baru: false };
      p.kata = polos([p.judul, p.acuan, L.judul].join(' '));
      L.pin.push(p); pin.push(p);
    });
    for (var k = 0; k < 70; k++) L.bintik.push([acak(), acak(), acak() < 0.5 ? 1 : -1, acak()]);
    lapisan.push(L);
  });
  if (!lapisan.length) return;
  var TINGGI = lapisan.reduce(function (s, L) { return s + L.tebal; }, 0);

  // alat yang terakhir dibuka
  try {
    var riwayat = JSON.parse(localStorage.getItem('geosr-riwayat') || '[]');
    pin.forEach(function (p) {
      var u = p.url.replace(/^\.?\//, '');
      p.baru = riwayat.some(function (r) { return r && r.u && r.u.replace(/^\//, '') === u; });
    });
  } catch (e) { /* penyimpanan tidak tersedia */ }

  // ------------------------------------------------------------ warna
  var warna = {}, gelap = false;
  function bacaWarna() {
    var g = getComputedStyle(document.documentElement);
    ['latar', 'permukaan', 'garis', 'teks', 'teks-2', 'aksen', 'laterit', 'kisi-tebal'].forEach(function (n) { warna[n] = rgb(g.getPropertyValue('--' + n)); });
    gelap = (warna.latar[0] + warna.latar[1] + warna.latar[2]) / 3 < 100;
    lapisan.forEach(function (L) { L.warna = rgb(getComputedStyle(L.el).borderLeftColor); });
  }

  // ------------------------------------------------------------ kamera dan proyeksi
  var lebar = 1, tinggi = 1, dpr = 1;
  var cam = { yaw: -0.62, pitch: 0.4, jarak: 12 };
  var vYaw = 0, putar = !hemat, urai = 0, uraiSasaran = 0, pitchSasaran = cam.pitch;
  var dipilih = 0, hover = null, hoverLapis = -1, diam = 0, terpilihPin = null, kataCari = '';
  function F() {
    var hTot = TINGGI + urai * RENGGANG * (lapisan.length - 1) + 0.6;
    return Math.min(lebar / 5.6, tinggi / (hTot + 1.6)) * cam.jarak;
  }
  var cy, sy, cp, sp, fokus;
  function siapProyeksi() {
    cy = Math.cos(cam.yaw); sy = Math.sin(cam.yaw); cp = Math.cos(cam.pitch); sp = Math.sin(cam.pitch); fokus = F();
  }
  function keKamera(x, y, z) {
    var X = x * cy - z * sy, Z = x * sy + z * cy;
    return [X, y * cp - Z * sp, y * sp + Z * cp];
  }
  function proyeksi(x, y, z) {
    var c = keKamera(x, y, z), zz = c[2] + cam.jarak, f = fokus / zz;
    return { x: lebar * 0.46 + c[0] * f, y: tinggi * 0.57 - c[1] * f, z: c[2], f: f };
  }

  // posisi vertikal tiap lempeng (puncak), memperhitungkan renggang urai, angkat saat disorot, dan geser keluar
  function puncak(L) {
    var y = (TINGGI + urai * RENGGANG * (lapisan.length - 1)) / 2;
    for (var n = 0; n < L.i; n++) y -= lapisan[n].tebal + urai * RENGGANG;
    return y + L.angkat * 0.06;
  }
  function geserKeluar(L) { return L.keluar * 1.05; }
  // Arah geser keluar di bidang x-z, dipatok saat lapisan dipilih: ke kanan layar seperti laci ditarik,
  // sedikit sekali ke arah pembaca. Kanan kamera di dunia = (cos yaw, -sin yaw); arah ke pembaca = (-sin yaw, -cos yaw).
  var arahKeluar = [1, 0];
  function patokArah() {
    var x = Math.cos(cam.yaw) - 0.25 * Math.sin(cam.yaw), z = -Math.sin(cam.yaw) - 0.25 * Math.cos(cam.yaw), p = Math.hypot(x, z) || 1;
    arahKeluar = [x / p, z / p];
  }

  // ------------------------------------------------------------ menggambar
  var CAHAYA = (function () { var v = [-0.5, 0.78, -0.42], p = Math.hypot(v[0], v[1], v[2]); return [v[0] / p, v[1] / p, v[2] / p]; })();
  var bidang = [];   // {path, L} untuk klik lempeng
  var tampakPin = [];
  function warnaSisi(dasar, normal) {
    var n = keKamera(normal[0], normal[1], normal[2]);
    var lam = Math.max(0, n[0] * CAHAYA[0] + n[1] * CAHAYA[1] + n[2] * CAHAYA[2]);
    var terang = 0.5 + 0.62 * lam;
    var c = campur(dasar, terang > 0.85 ? PUTIH : HITAM, terang > 0.85 ? (terang - 0.85) * 0.9 : (0.85 - terang) * 0.85);
    // color grading: bagian terang sedikit hangat, bagian gelap sedikit dingin
    return lam > 0.5 ? campur(c, HANGAT, (lam - 0.5) * (gelap ? 0.12 : 0.18)) : campur(c, DINGIN, (0.5 - lam) * (gelap ? 0.3 : 0.24));
  }
  function terlihat(pusat, normal) {
    var c = keKamera(pusat[0], pusat[1], pusat[2]), n = keKamera(normal[0], normal[1], normal[2]);
    return n[0] * c[0] + n[1] * c[1] + n[2] * (c[2] + cam.jarak) < 0;
  }
  function poligon(titik) {
    var p = new Path2D();
    titik.forEach(function (t, k) { if (k) p.lineTo(t.x, t.y); else p.moveTo(t.x, t.y); });
    p.closePath();
    return p;
  }

  function gambarLantai(yLantai) {
    // kertas milimeter di lantai, memudar menjauh
    ctx.lineWidth = 1;
    for (var k = -12; k <= 12; k++) {
      var u = k * 0.25, a1 = proyeksi(u, yLantai, -3), a2 = proyeksi(u, yLantai, 3), b1 = proyeksi(-3, yLantai, u), b2 = proyeksi(3, yLantai, u);
      var al = (k % 4 === 0 ? 0.22 : 0.1) * (1 - Math.abs(k) / 13);
      var g1 = ctx.createLinearGradient(a1.x, a1.y, a2.x, a2.y), g2 = ctx.createLinearGradient(b1.x, b1.y, b2.x, b2.y);
      [g1, g2].forEach(function (g) {
        g.addColorStop(0, css(warna.aksen, 0)); g.addColorStop(0.5, css(warna.aksen, al)); g.addColorStop(1, css(warna.aksen, 0));
      });
      ctx.strokeStyle = g1; ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.stroke();
      ctx.strokeStyle = g2; ctx.beginPath(); ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
    }
  }

  function bayanganBlok(yLantai) {
    var s = [[-BX, -BZ], [BX, -BZ], [BX, BZ], [-BX, BZ]].map(function (q) { return proyeksi(q[0] + 0.18, yLantai, q[1] + 0.22); });
    ctx.save();
    ctx.shadowColor = css(HITAM, gelap ? 0.75 : 0.4); ctx.shadowBlur = 28; ctx.shadowOffsetY = 6;
    ctx.fillStyle = css(HITAM, gelap ? 0.45 : 0.16);
    ctx.fill(poligon(s));
    ctx.restore();
  }

  function gambarLempeng(L) {
    var y1 = puncak(L), y0 = y1 - L.tebal, dx = arahKeluar[0] * geserKeluar(L), dz = arahKeluar[1] * geserKeluar(L);
    var x0 = -BX + dx, x1 = BX + dx, z0 = -BZ + dz, z1 = BZ + dz;
    var sisi = [
      { n: [0, 1, 0], v: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], atas: true },
      { n: [0, 0, -1], v: [[x0, y1, z0], [x0, y0, z0], [x1, y0, z0], [x1, y1, z0]] },
      { n: [0, 0, 1], v: [[x1, y1, z1], [x1, y0, z1], [x0, y0, z1], [x0, y1, z1]] },
      { n: [-1, 0, 0], v: [[x0, y1, z1], [x0, y0, z1], [x0, y0, z0], [x0, y1, z0]] },
      { n: [1, 0, 0], v: [[x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [x1, y1, z1]] },
      { n: [0, -1, 0], v: [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]] }
    ];
    var pilih = L.i === dipilih, sorot = L.i === hoverLapis;
    sisi.forEach(function (s) {
      var pusat = [0, 1, 2].map(function (k) { return (s.v[0][k] + s.v[2][k]) / 2; });
      if (!terlihat(pusat, s.n)) return;
      var t = s.v.map(function (v) { return proyeksi(v[0], v[1], v[2]); });
      var path = poligon(t), dasar = warnaSisi(L.warna, s.n);
      if (s.atas) {
        var g = ctx.createLinearGradient(t[3].x, t[3].y, t[1].x, t[1].y);
        g.addColorStop(0, css(campur(dasar, PUTIH, gelap ? 0.05 : 0.14))); g.addColorStop(1, css(campur(dasar, HITAM, 0.06)));
        ctx.fillStyle = g;
      } else {
        // sisi tegak: terang di tepi atas, gelap di tepi bawah
        var a = { x: (t[0].x + t[3].x) / 2, y: (t[0].y + t[3].y) / 2 }, b = { x: (t[1].x + t[2].x) / 2, y: (t[1].y + t[2].y) / 2 };
        var g2 = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        g2.addColorStop(0, css(campur(dasar, PUTIH, 0.1))); g2.addColorStop(1, css(campur(dasar, HITAM, 0.2)));
        ctx.fillStyle = g2;
      }
      ctx.fill(path);
      // butir tanah halus di permukaan (titik tetap dalam koordinat sisi, ikut berputar)
      L.bintik.forEach(function (q, k) {
        if (!s.atas && k % 2) return;
        var u = q[0], v = q[1];
        var x = t[0].x + (t[1].x - t[0].x) * v + (t[3].x - t[0].x) * u + ((t[2].x - t[1].x) - (t[3].x - t[0].x)) * u * v;
        var y = t[0].y + (t[1].y - t[0].y) * v + (t[3].y - t[0].y) * u + ((t[2].y - t[1].y) - (t[3].y - t[0].y)) * u * v;
        ctx.fillStyle = q[2] > 0 ? css(PUTIH, 0.1 + 0.12 * q[3]) : css(HITAM, 0.08 + 0.1 * q[3]);
        ctx.fillRect(x, y, 1.4, 1.4);
      });
      if (!s.atas) {
        // garis lapisan halus di sisi tegak
        ctx.strokeStyle = css(HITAM, 0.1); ctx.lineWidth = 1; ctx.beginPath();
        [0.35, 0.7].forEach(function (f) {
          ctx.moveTo(t[0].x + (t[1].x - t[0].x) * f, t[0].y + (t[1].y - t[0].y) * f);
          ctx.lineTo(t[3].x + (t[2].x - t[3].x) * f, t[3].y + (t[2].y - t[3].y) * f);
        });
        ctx.stroke();
      }
      ctx.strokeStyle = pilih || sorot ? css(warna.aksen) : css(HITAM, gelap ? 0.5 : 0.28);
      ctx.lineWidth = pilih ? 2 : 1;
      ctx.stroke(path);
      if (s.atas) {
        // kilap tepi depan permukaan atas
        ctx.beginPath(); ctx.moveTo(t[0].x, t[0].y); ctx.lineTo(t[1].x, t[1].y);
        ctx.strokeStyle = css(PUTIH, gelap ? 0.18 : 0.6); ctx.lineWidth = 1.2; ctx.stroke();
      }
      bidang.push({ path: path, L: L });
    });
    // pin alat di permukaan atas: lapisan teratas, lapisan terpilih, atau saat diurai
    var tampil = L.i === 0 || pilih || urai > 0.5 || L.pin.some(function (p) { return p.cocok; });
    if (!tampil) return;
    var ditutup = !pilih && urai < 0.5 && L.i !== 0;
    L.pin.forEach(function (p) {
      if (ditutup && !p.cocok) return;
      gambarPin(p, p.x + dx, y1, p.z + dz, pilih);
    });
  }

  function gambarPin(p, x, y, z, berlabel) {
    var dasar = proyeksi(x, y, z), atas = proyeksi(x, y + 0.2, z), r = Math.max(5, 0.075 * atas.f);
    var aktif = p === hover || p === terpilihPin || p.cocok;
    // bayangan di permukaan lempeng
    ctx.fillStyle = css(HITAM, gelap ? 0.45 : 0.25);
    ctx.beginPath(); ctx.ellipse(dasar.x + r * 0.5, dasar.y + 1, r * 1.1, r * 0.42, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = css(gelap ? warna.teks : HITAM, 0.55); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(dasar.x, dasar.y); ctx.lineTo(atas.x, atas.y); ctx.stroke();
    if (aktif || p.baru) {
      var halo = ctx.createRadialGradient(atas.x, atas.y, r * 0.5, atas.x, atas.y, r * 3);
      var hc = p.baru && !aktif ? warna.laterit : warna.aksen;
      halo.addColorStop(0, css(hc, 0.5)); halo.addColorStop(1, css(hc, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(atas.x, atas.y, r * 3, 0, TAU); ctx.fill();
    }
    var g = ctx.createRadialGradient(atas.x - r * 0.4, atas.y - r * 0.45, r * 0.1, atas.x, atas.y, r * 1.15);
    g.addColorStop(0, css(campur(p.L.warna, PUTIH, 0.65))); g.addColorStop(0.45, css(p.L.warna)); g.addColorStop(1, css(campur(p.L.warna, HITAM, 0.45)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(atas.x, atas.y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = aktif ? css(warna.aksen) : p.baru ? css(warna.laterit) : css(HITAM, 0.4);
    ctx.lineWidth = aktif || p.baru ? 2 : 1; ctx.stroke();
    ctx.fillStyle = css(PUTIH, 0.85); ctx.beginPath(); ctx.ellipse(atas.x - r * 0.38, atas.y - r * 0.42, r * 0.28, r * 0.17, -0.6, 0, TAU); ctx.fill();
    tampakPin.push({ p: p, x: atas.x, y: atas.y, r: r });
    if (berlabel || aktif) label(p.judul, atas.x, atas.y - r - 7, aktif);
  }

  var antreLabel = [];
  function label(teks, x, y, tegas) { antreLabel.push([teks, x, y, tegas]); }
  function gambarLabel() {
    ctx.font = '600 12.5px "Plus Jakarta Sans", system-ui, sans-serif';
    var kotak = [];
    antreLabel.forEach(function (l) {
      var teks = l[0].length > 34 ? l[0].slice(0, 32) + '…' : l[0];
      var lb = ctx.measureText(teks).width + 12, tg = 22;
      var x0 = batasi(l[1] - lb / 2, 4, lebar - lb - 4), y0 = batasi(l[2] - tg, 4, tinggi - tg - 4);
      // geser ke atas bila bertumpuk dengan label sebelumnya
      for (var k = 0; k < kotak.length; k++) {
        var o = kotak[k];
        if (x0 < o[0] + o[2] && x0 + lb > o[0] && y0 < o[1] + tg && y0 + tg > o[1]) { y0 = o[1] - tg - 3; k = -1; }
      }
      kotak.push([x0, y0, lb]);
      ctx.save();
      ctx.shadowColor = css(HITAM, gelap ? 0.5 : 0.2); ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
      ctx.fillStyle = css(warna.permukaan, 0.95);
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x0, y0, lb, tg, 5); else ctx.rect(x0, y0, lb, tg); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = l[3] ? css(warna.aksen) : css(warna.garis); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = css(warna.teks); ctx.textBaseline = 'middle'; ctx.fillText(teks, x0 + 6, y0 + tg / 2 + 0.5);
    });
    antreLabel = [];
  }

  function gambar() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, lebar, tinggi);
    siapProyeksi();
    bidang = []; tampakPin = [];
    var yLantai = -(TINGGI + urai * RENGGANG * (lapisan.length - 1)) / 2 - 0.08;
    gambarLantai(yLantai);
    bayanganBlok(yLantai);
    // lempeng dari bawah ke atas (yang di atas menutupi yang di bawah); lempeng yang keluar digambar terakhir
    var urut = lapisan.slice().reverse().filter(function (L) { return L.keluar < 0.02; });
    lapisan.filter(function (L) { return L.keluar >= 0.02; }).forEach(function (L) { urut.push(L); });
    urut.forEach(gambarLempeng);
    gambarLabel();
    // vinyet lembut (color grading)
    var v = ctx.createRadialGradient(lebar * 0.45, tinggi * 0.4, Math.min(lebar, tinggi) * 0.35, lebar * 0.5, tinggi * 0.5, Math.max(lebar, tinggi) * 0.8);
    v.addColorStop(0, css(HITAM, 0)); v.addColorStop(1, css(HITAM, gelap ? 0.35 : 0.1));
    ctx.fillStyle = v; ctx.fillRect(0, 0, lebar, tinggi);
  }

  // ------------------------------------------------------------ putaran
  var jalan = false, tampak = true, akhir = 0;
  function minta() {
    if (jalan || !tampak || document.hidden) return;
    jalan = true; akhir = performance.now();
    requestAnimationFrame(langkah);
  }
  function dekati(a, b, dt, laju) { return hemat ? b : a + (b - a) * (1 - Math.exp(-dt * laju)); }
  function langkah(kini) {
    var dt = Math.min(0.05, Math.max(0, (kini - akhir) / 1000)); akhir = kini;
    var bergerak = false;
    if (!seret) {
      if (Math.abs(vYaw) > 0.01) { cam.yaw += vYaw * dt; vYaw *= Math.exp(-dt * 3); bergerak = true; }
      else if (putar && kini - diam > 2200) { cam.yaw += 0.16 * dt; bergerak = true; }
    }
    urai = dekati(urai, uraiSasaran, dt, 6);
    if (!seret) { cam.pitch = dekati(cam.pitch, pitchSasaran, dt, 5); if (Math.abs(cam.pitch - pitchSasaran) > 0.002) bergerak = true; }
    if (Math.abs(urai - uraiSasaran) > 0.002) bergerak = true; else urai = uraiSasaran;
    lapisan.forEach(function (L) {
      var kS = L.i === dipilih ? 1 : 0, aS = L.i === hoverLapis ? 1 : 0;
      L.keluar = dekati(L.keluar, kS, dt, 7); L.angkat = dekati(L.angkat, aS, dt, 10);
      if (Math.abs(L.keluar - kS) > 0.002 || Math.abs(L.angkat - aS) > 0.002) bergerak = true;
    });
    gambar();
    if (bergerak && tampak && !document.hidden) requestAnimationFrame(langkah);
    else jalan = false;
  }

  // ------------------------------------------------------------ pilih lapisan, panel, kartu
  function el(tag, kelas, teks) { var e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; }
  var tombol = lapisan.map(function (L) {
    var b = el('button', 'b3-no', L.no);
    b.type = 'button';
    b.style.setProperty('--lapis', css(L.warna || [128, 128, 128]));
    b.setAttribute('aria-label', 'Lapisan ' + L.no + ', ' + L.judul + ', ' + L.pin.length + ' alat');
    b.addEventListener('click', function () { pilih(L.i === dipilih ? -1 : L.i); });
    tombolLapisan.appendChild(b);
    return b;
  });
  function isiPanel() {
    info.textContent = '';
    var L = lapisan[dipilih];
    if (!L) {
      var baru = pin.filter(function (p) { return p.baru; });
      info.appendChild(el('p', 'b3-judul', pin.length + ' alat di ' + lapisan.length + ' lapisan'));
      info.appendChild(el('p', 'b3-ket', 'Pilih nomor lapisan atau klik lempengnya. Seret blok untuk memutar.'));
      if (baru.length) {
        info.appendChild(el('p', 'b3-ket', 'Terakhir dibuka (bercincin jingga):'));
        info.appendChild(daftarChip(baru));
      }
      return;
    }
    var cocok = L.pin.filter(function (p) { return p.cocok; });
    info.style.setProperty('--lapis', css(L.warna));
    info.appendChild(el('p', 'b3-judul', 'Lapisan ' + L.no + ', ' + L.judul));
    info.appendChild(el('p', 'b3-ket', L.pin.length + ' ' + (L.jenis === 'Kalkulator' ? 'kalkulator' : L.jenis === 'Praktikum' ? 'alat praktikum' : 'halaman') +
      (kataCari ? ', ' + cocok.length + ' cocok dengan pencarian' : '') + '.'));
    info.appendChild(daftarChip(L.pin));
  }
  function daftarChip(isi) {
    var ul = el('ul', 'chip-daftar');
    isi.forEach(function (p) {
      var li = el('li'), a = el('a', 'chip' + (p.cocok ? ' cocok' : ''), p.judul);
      a.href = p.url; a.style.setProperty('--lapis', css(p.L.warna));
      li.appendChild(a); ul.appendChild(li);
    });
    return ul;
  }
  function pilih(n) {
    if (n >= 0 && n !== dipilih) patokArah();
    dipilih = n; terpilihPin = null; if (kartu) kartu.hidden = true;
    tombol.forEach(function (b, k) { b.setAttribute('aria-pressed', k === n ? 'true' : 'false'); });
    isiPanel(); sentuh(); minta();
  }
  function bukaKartu(p) {
    terpilihPin = p;
    if (!kartu) { location.href = p.url; return; }
    kartu.textContent = '';
    kartu.style.setProperty('--lapis', css(p.L.warna));
    kartu.appendChild(el('p', 'lapis-nama', 'Lapisan ' + p.L.no + ', ' + p.L.judul));
    kartu.appendChild(el('h3', '', p.judul));
    if (p.acuan) kartu.appendChild(el('span', 'chip', p.acuan));
    var aksi = el('div', 'aksi'), buka = el('a', 'tombol utama kecil', p.L.jenis === 'Kalkulator' ? 'Buka kalkulator' : p.L.jenis === 'Praktikum' ? 'Buka alat' : 'Buka');
    buka.href = p.url;
    var tutup = el('button', 'tombol kecil', 'Tutup'); tutup.type = 'button';
    tutup.addEventListener('click', function () { kartu.hidden = true; terpilihPin = null; minta(); });
    aksi.appendChild(buka); aksi.appendChild(tutup); kartu.appendChild(aksi);
    kartu.hidden = false; minta();
  }
  function sentuh() { diam = performance.now(); }

  // ------------------------------------------------------------ penunjuk
  var seret = null;
  function titik(e) { var r = kanvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function kenaPin(q) {
    var t = null, d0 = Infinity;
    tampakPin.forEach(function (v) { var d = Math.hypot(v.x - q.x, v.y - q.y); if (d < v.r + 7 && d < d0) { d0 = d; t = v.p; } });
    return t;
  }
  function kenaLapis(q) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (var k = bidang.length - 1; k >= 0; k--) if (ctx.isPointInPath(bidang[k].path, q.x, q.y)) return bidang[k].L.i;
    return -1;
  }
  kanvas.addEventListener('pointerdown', function (e) {
    var q = titik(e);
    seret = { x: q.x, y: q.y, lx: q.x, ly: q.y, t: performance.now(), gerak: false };
    vYaw = 0;
    try { kanvas.setPointerCapture(e.pointerId); } catch (_) { /* abaikan */ }
    sentuh();
  });
  kanvas.addEventListener('pointermove', function (e) {
    var q = titik(e);
    if (seret) {
      var dx = q.x - seret.lx, dy = q.y - seret.ly;
      if (!seret.gerak && Math.hypot(q.x - seret.x, q.y - seret.y) > 5) { seret.gerak = true; kanvas.classList.add('diseret'); }
      if (seret.gerak) {
        var kini = performance.now(), dtk = Math.max(1, kini - seret.t) / 1000;
        cam.yaw += dx * 0.008; vYaw = dx * 0.008 / dtk;
        if (e.pointerType === 'mouse') cam.pitch = pitchSasaran = batasi(cam.pitch + dy * 0.005, 0.18, 1.05);
        seret.lx = q.x; seret.ly = q.y; seret.t = kini;
        sentuh(); minta();
      }
      return;
    }
    if (e.pointerType !== 'mouse') return;
    var p = kenaPin(q), n = p ? -1 : kenaLapis(q);
    if (p !== hover || n !== hoverLapis) { hover = p; hoverLapis = n; minta(); }
    kanvas.style.cursor = p || n >= 0 ? 'pointer' : '';
    if (p || n >= 0) sentuh();
  });
  function lepas(e) {
    if (!seret) return;
    var klik = !seret.gerak, q = titik(e);
    kanvas.classList.remove('diseret');
    if (hemat || performance.now() - seret.t > 90) vYaw = 0;
    seret = null;
    if (klik && e.type === 'pointerup') {
      var p = kenaPin(q);
      if (p) { bukaKartu(p); return; }
      var n = kenaLapis(q);
      pilih(n === dipilih ? -1 : n);
    }
    minta();
  }
  kanvas.addEventListener('pointerup', lepas);
  kanvas.addEventListener('pointercancel', lepas);
  kanvas.addEventListener('pointerleave', function () { if (hover || hoverLapis >= 0) { hover = null; hoverLapis = -1; minta(); } });

  // ------------------------------------------------------------ tombol, cari
  Array.prototype.forEach.call(akar.querySelectorAll('[data-aksi]'), function (b) {
    b.addEventListener('click', function () {
      var a = b.getAttribute('data-aksi');
      if (a === 'urai') { uraiSasaran = uraiSasaran ? 0 : 1; pitchSasaran = uraiSasaran ? 0.66 : 0.4; b.setAttribute('aria-pressed', uraiSasaran ? 'true' : 'false'); }
      if (a === 'putar') { putar = !putar; b.setAttribute('aria-pressed', putar ? 'true' : 'false'); }
      sentuh(); minta();
    });
    if (b.getAttribute('data-aksi') === 'putar') b.setAttribute('aria-pressed', putar ? 'true' : 'false');
  });
  var cari = document.getElementById('cariBeranda');
  if (cari) {
    cari.addEventListener('input', function () {
      kataCari = polos(cari.value.trim());
      var pertama = null;
      pin.forEach(function (p) { p.cocok = kataCari.length > 1 && p.kata.indexOf(kataCari) >= 0; if (p.cocok && !pertama) pertama = p; });
      if (pertama) pilih(pertama.L.i); else { isiPanel(); minta(); }
    });
  }

  // ------------------------------------------------------------ ukuran, tema, jeda
  function ukur() {
    var r = panggung.getBoundingClientRect();
    lebar = Math.max(1, Math.round(r.width)); tinggi = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    kanvas.width = Math.round(lebar * dpr); kanvas.height = Math.round(tinggi * dpr);
    minta();
  }
  if ('ResizeObserver' in window) new ResizeObserver(ukur).observe(panggung); else window.addEventListener('resize', ukur);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { tampak = e[0].isIntersecting; if (tampak) minta(); }).observe(panggung);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) minta(); });
  var gantiTema = function () { bacaWarna(); tombol.forEach(function (b, k) { b.style.setProperty('--lapis', css(lapisan[k].warna)); }); isiPanel(); minta(); };
  new MutationObserver(gantiTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', gantiTema); else if (mq.addListener) mq.addListener(gantiTema);
  }

  bacaWarna();
  tombol.forEach(function (b, k) { b.style.setProperty('--lapis', css(lapisan[k].warna)); });
  patokArah();
  pilih(0);
  lapisan[0].keluar = 1;
  ukur();
  gambar();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(minta);
})();
