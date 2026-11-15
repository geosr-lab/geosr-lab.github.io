/*
 * Gerak tampilan situs. Hanya tampilan: tidak menyentuh hitungan.
 * 1. Beranda: penampang lapisan tanah. Lapisan mengendap satu per satu, pondasi diletakkan, lalu batas
 *    lapisan berubah bentuk (morph) menjadi cekungan penurunan. Tombol "Sebelum beban / Sesudah
 *    konsolidasi" memindahkan bentuk di antara dua keadaan.
 * 2. Halaman alat: kartu hasil yang angkanya berubah diberi kilat singkat; hasil yang baru muncul
 *    tampil bertahap dan garis grafik tergambar.
 * 3. Tombol tema (ikut sistem, terang, gelap), tersimpan di localStorage; tema.js memasangnya sebelum halaman tergambar.
 * 4. Menu lipat di layar sempit (tombol menu, tutup dengan Esc, klik tautan, atau klik di luar).
 * Semua gerak dimatikan bila pengguna memilih prefers-reduced-motion.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var hemat = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------ menu lipat (ponsel)
  (function () {
    var nav = document.querySelector('.nav');
    var tombol = nav && nav.querySelector('.nav-tombol');
    if (!tombol) return;
    function atur(buka) {
      nav.classList.toggle('terbuka', buka);
      tombol.setAttribute('aria-expanded', buka ? 'true' : 'false');
    }
    tombol.addEventListener('click', function () { atur(tombol.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#menu-utama a')) atur(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('terbuka')) { atur(false); tombol.focus(); }
    });
    document.addEventListener('click', function (e) { if (nav.classList.contains('terbuka') && !nav.contains(e.target)) atur(false); });
    // Bila layar dilebarkan, menu kembali ke keadaan biasa.
    if (window.matchMedia) {
      var lebar = window.matchMedia('(min-width: 721px)');
      var tutup = function (m) { if (m.matches) atur(false); };
      if (lebar.addEventListener) lebar.addEventListener('change', tutup); else if (lebar.addListener) lebar.addListener(tutup);
    }
  })();

  // ------------------------------------------------------------ tombol tema
  (function () {
    var tombol = document.querySelector('.tema-tombol');
    if (!tombol) return;
    var akar = document.documentElement;
    var URUT = ['', 'terang', 'gelap'];
    var NAMA = { '': 'ikut sistem', terang: 'terang', gelap: 'gelap' };
    function label() { tombol.setAttribute('aria-label', 'Tema: ' + NAMA[akar.getAttribute('data-tema') || ''] + '. Klik untuk ganti.'); }
    label();
    tombol.addEventListener('click', function () {
      var kini = akar.getAttribute('data-tema') || '';
      var lanjut = URUT[(URUT.indexOf(kini) + 1) % URUT.length];
      if (lanjut) akar.setAttribute('data-tema', lanjut); else akar.removeAttribute('data-tema');
      try { if (lanjut) localStorage.setItem('tema', lanjut); else localStorage.removeItem('tema'); } catch (e) { /* tidak tersimpan */ }
      label();
    });
  })();

  // ------------------------------------------------------------ penampang beranda
  var NS = 'http://www.w3.org/2000/svg';
  var W = 560, H = 430, N = 57;                 // N titik per batas lapisan (sama untuk dua keadaan)
  var CX = 250;                                  // sumbu pondasi
  // Batas lapisan: kedalaman dasar, amplitudo gelombang, fase, penurunan maksimum, lebar cekungan.
  var BATAS = [
    { y: 112, a: 3, f: 0.0, s: 26, w: 78 },      // muka tanah
    { y: 176, a: 6, f: 1.3, s: 18, w: 96 },
    { y: 262, a: 9, f: 2.4, s: 9, w: 122 },
    { y: 338, a: 7, f: 4.1, s: 3.5, w: 150 }
  ];
  var LAPIS = [
    { nama: 'Laterit', warna: 'var(--lapis-3)', pola: 'pola-laterit' },
    { nama: 'Lempung lunak', warna: 'var(--lempung)', pola: 'pola-lempung' },
    { nama: 'Pasir', warna: 'var(--pasir)', pola: 'pola-pasir' },
    { nama: 'Lempung kaku', warna: 'var(--lapis-5)', pola: 'pola-lempung' }
  ];

  // Pengujian yang biasa dipakai untuk tiap lapisan penampang (urutan sama dengan LAPIS) dan untuk pondasinya.
  var UJI_LAPIS = [
    { ket: 'Tanah permukaan yang sering dipakai sebagai timbunan atau tanah dasar jalan.',
      alat: [['kadar-air', 'Kadar air'], ['atterberg', 'Batas Atterberg'], ['pemadatan', 'Pemadatan (Proctor)'], ['cbr', 'CBR laboratorium'], ['sand-cone', 'Kerucut pasir (sand cone)']] },
    { ket: 'Lapisan yang mudah mampat; besar dan lama penurunannya dibaca dari uji konsolidasi.',
      alat: [['atterberg', 'Batas Atterberg'], ['hidrometer', 'Analisa hidrometer'], ['konsolidasi-lab', 'Konsolidasi laboratorium'], ['tekan-bebas', 'Kuat tekan bebas (UCS)'], ['sondir', 'Sondir']] },
    { ket: 'Dinilai dari sebaran ukuran butir, kemampuan meloloskan air, dan kepadatannya di lapangan.',
      alat: [['saringan', 'Analisa saringan'], ['berat-spesifik', 'Berat spesifik (piknometer)'], ['permeabilitas-tetap', 'Permeabilitas tinggi tekan tetap'], ['geser-langsung', 'Kuat geser langsung'], ['spt', 'SPT dan log bor']] },
    { ket: 'Lapisan pendukung; kekuatannya dibaca dari uji geser, uji tekan, dan nilai N.',
      alat: [['tekan-bebas', 'Kuat tekan bebas (UCS)'], ['geser-langsung', 'Kuat geser langsung'], ['konsolidasi-lab', 'Konsolidasi laboratorium'], ['spt', 'SPT dan log bor'], ['sondir', 'Sondir']] }
  ];
  var UJI_PONDASI = { nama: 'Pondasi telapak', ket: 'Daya dukung dan penurunan pondasi dihitung di kalkulator.',
    tautan: [['kalkulator/pondasi-dangkal.html', 'Kapasitas dukung pondasi dangkal'], ['kalkulator/konsolidasi.html', 'Penurunan konsolidasi'], ['kalkulator/tiang-bor.html', 'Tiang bor dari N-SPT']] };

  function el(nama, atr, induk) {
    var e = document.createElementNS(NS, nama);
    for (var k in atr) e.setAttribute(k, atr[k]);
    if (induk) induk.appendChild(e);
    return e;
  }

  // Titik batas ke-i untuk faktor penurunan u (0 = sebelum beban, 1 = sesudah konsolidasi).
  function titik(i, u) {
    var b = BATAS[i], hasil = [];
    for (var j = 0; j < N; j++) {
      var x = (W * j) / (N - 1);
      var y = b.y + b.a * Math.sin(x / 70 + b.f) + u * b.s * Math.exp(-Math.pow((x - CX) / b.w, 2));
      hasil.push([x, y]);
    }
    return hasil;
  }
  function jalur(p) {
    // Kurva halus melewati semua titik (Catmull-Rom ke Bezier).
    var d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' +
        (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' +
        p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  function pasangPenampang(fig) {
    var bingkai = fig.querySelector('.penampang-bingkai');
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-labelledby': 'penampang-judul' });
    el('title', { id: 'penampang-judul' }, svg).textContent = 'Ilustrasi penampang empat lapisan tanah di bawah pondasi telapak. Batas lapisan melengkung turun di bawah pondasi setelah konsolidasi.';
    var defs = el('defs', {}, svg);
    var pl = el('pattern', { id: 'pola-lempung', width: 18, height: 9, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M2 3h7M11 7.5h6', style: 'stroke:var(--teks);stroke-opacity:.28;stroke-width:1.1' }, pl);
    var pp = el('pattern', { id: 'pola-pasir', width: 9, height: 9, patternUnits: 'userSpaceOnUse' }, defs);
    el('circle', { cx: 2, cy: 2, r: 0.9, style: 'fill:var(--teks);fill-opacity:.35' }, pp);
    el('circle', { cx: 6.5, cy: 6.5, r: 0.7, style: 'fill:var(--teks);fill-opacity:.3' }, pp);
    var pt = el('pattern', { id: 'pola-laterit', width: 16, height: 14, patternUnits: 'userSpaceOnUse' }, defs);
    el('circle', { cx: 4, cy: 4, r: 1.8, style: 'fill:none;stroke:var(--teks);stroke-opacity:.3' }, pt);
    el('circle', { cx: 12, cy: 10, r: 1.3, style: 'fill:var(--teks);fill-opacity:.22' }, pt);

    // Latar kertas milimeter di atas muka tanah.
    var pk = el('pattern', { id: 'pola-kisi', width: 40, height: 40, patternUnits: 'userSpaceOnUse' }, defs);
    el('path', { d: 'M0 .5H40M.5 0V40', style: 'fill:none;stroke:var(--aksen);stroke-opacity:.16' }, pk);
    el('path', { d: 'M0 8.5H40M0 16.5H40M0 24.5H40M0 32.5H40M8.5 0V40M16.5 0V40M24.5 0V40M32.5 0V40', style: 'fill:none;stroke:var(--aksen);stroke-opacity:.07' }, pk);
    el('rect', { width: W, height: H, fill: 'url(#pola-kisi)' }, svg);

    // Lapisan: diisi dari batas atas ke batas bawah (lapisan terakhir sampai dasar gambar).
    var gLapis = el('g', {}, svg), isi = [], tekstur = [];
    for (var i = LAPIS.length - 1; i >= 0; i--) {
      var g = el('g', { class: 'anim-lapis lapis', style: 'animation-delay:' + (0.12 + (LAPIS.length - 1 - i) * 0.16) + 's' }, gLapis);
      isi[i] = el('path', { style: 'fill:' + LAPIS[i].warna }, g);
      tekstur[i] = el('path', { fill: 'url(#' + LAPIS[i].pola + ')' }, g);
    }
    // Garis batas dan garis muka tanah semula (putus-putus).
    var gGaris = el('g', { class: 'anim-telat', style: 'animation-delay:.85s' }, svg), garis = [];
    for (i = 0; i < BATAS.length; i++) garis[i] = el('path', { style: 'fill:none;stroke:var(--teks);stroke-width:' + (i === 0 ? 2 : 1.1) + ';stroke-opacity:' + (i === 0 ? 0.9 : 0.55) }, gGaris);
    var semula = el('path', { d: jalur(titik(0, 0)), class: 'anim-telat', style: 'animation-delay:1.5s;fill:none;stroke:var(--laterit);stroke-width:1.5;stroke-dasharray:5 5' }, svg);

    // Label lapisan di kanan, seperti kolom deskripsi pada log bor.
    var gLabel = el('g', { class: 'anim-telat', style: 'animation-delay:1s' }, svg);
    var tengah = [144, 219, 300, 384];
    LAPIS.forEach(function (l, k) {
      var t = el('text', { x: W - 14, y: tengah[k] + 6, 'text-anchor': 'end', 'font-size': 17, 'font-weight': 700,
        style: 'fill:var(--teks);paint-order:stroke;stroke:var(--permukaan);stroke-width:4px;stroke-linejoin:round' }, gLabel);
      t.textContent = l.nama;
    });

    // Pondasi telapak dan kolom.
    var gPondasi = el('g', { class: 'anim-pondasi', style: 'animation-delay:1.05s' }, svg);
    var gGeser = el('g', {}, gPondasi);
    el('rect', { x: CX - 13, y: 34, width: 26, height: 62, style: 'fill:var(--tiang);stroke:var(--teks);stroke-width:1.5' }, gGeser);
    el('rect', { x: CX - 58, y: 94, width: 116, height: 18, style: 'fill:var(--tiang);stroke:var(--teks);stroke-width:1.5' }, gGeser);
    var gBeban = el('g', { style: 'color:var(--laterit)' }, gGeser);
    [-30, 0, 30].forEach(function (dx) {
      el('path', { d: 'M' + (CX + dx) + ' 6v18', style: 'stroke:currentColor;stroke-width:2.2' }, gBeban);
      el('path', { d: 'M' + (CX + dx - 5) + ' 20l5 8l5-8z', style: 'fill:currentColor' }, gBeban);
    });
    var teksBeban = el('text', { x: CX + 44, y: 24, 'font-size': 16, 'font-weight': 700, style: 'fill:var(--laterit)' }, gGeser);
    teksBeban.textContent = 'beban';

    // Garis ukur penurunan s.
    var gUkur = el('g', { style: 'opacity:0;transition:opacity .4s ease' }, svg);
    var ukur = el('path', { style: 'fill:none;stroke:var(--laterit);stroke-width:1.5' }, gUkur);
    var teksS = el('text', { 'font-size': 17, 'font-weight': 800, style: 'fill:var(--laterit);font-style:italic' }, gUkur);
    teksS.textContent = 's';

    bingkai.appendChild(svg);

    // Lapisan dan pondasi bisa diklik (atau dipilih dengan papan ketik) untuk melihat pengujian yang relevan.
    var info = document.getElementById('penampang-info'), dipilih = null;
    function pilih(target, data, nama) {
      if (dipilih) dipilih.classList.remove('dipilih');
      dipilih = target; target.classList.add('dipilih'); svg.classList.add('ada-pilihan');
      if (!info) return;
      var tautan = data.tautan || data.alat.map(function (a) { return ['praktikum/' + a[0] + '/', a[1]]; });
      info.innerHTML = '<p><strong>' + nama + '.</strong> ' + data.ket + '</p><ul class="chip-daftar">' +
        tautan.map(function (t) { return '<li><a class="chip" href="' + t[0] + '">' + t[1] + '</a></li>'; }).join('') + '</ul>';
    }
    function bisaDipilih(target, data, nama) {
      target.setAttribute('tabindex', '0');
      target.setAttribute('role', 'button');
      target.setAttribute('aria-label', nama + ': lihat pengujian yang relevan');
      target.classList.add('bisa-pilih');
      target.addEventListener('click', function () { pilih(target, data, nama); });
      target.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pilih(target, data, nama); } });
    }
    for (var li = 0; li < LAPIS.length; li++) bisaDipilih(isi[li].parentNode, UJI_LAPIS[li], LAPIS[li].nama);
    bisaDipilih(gGeser, UJI_PONDASI, UJI_PONDASI.nama);

    function gambar(u) {
      var p = BATAS.map(function (_, k) { return titik(k, u); });
      for (var k = 0; k < LAPIS.length; k++) {
        var atas = p[k], bawah = p[k + 1];
        var d = jalur(atas);
        if (bawah) {
          var mundur = bawah.slice().reverse(), dm = jalur(mundur);
          d += 'L' + mundur[0][0].toFixed(1) + ' ' + mundur[0][1].toFixed(1) + dm.slice(dm.indexOf('C')) + 'Z';
        } else d += 'L' + W + ' ' + H + 'L0 ' + H + 'Z';
        isi[k].setAttribute('d', d);
        tekstur[k].setAttribute('d', d);
      }
      for (k = 0; k < BATAS.length; k++) garis[k].setAttribute('d', jalur(p[k]));
      var turun = u * BATAS[0].s;
      gGeser.setAttribute('transform', 'translate(0 ' + turun.toFixed(2) + ')');
      var y0 = BATAS[0].y + BATAS[0].a * Math.sin(CX / 70 + BATAS[0].f), x = CX + 74;
      ukur.setAttribute('d', 'M' + (x - 6) + ' ' + y0 + 'h12M' + x + ' ' + y0 + 'V' + (y0 + turun) + 'M' + (x - 6) + ' ' + (y0 + turun) + 'h12');
      teksS.setAttribute('x', x + 8); teksS.setAttribute('y', (y0 + turun / 2 + 5).toFixed(1));
      gUkur.style.opacity = u > 0.6 ? 1 : 0;
      semula.style.visibility = u > 0.02 ? 'visible' : 'hidden';
    }

    var sekarang = 0, minta = null;
    // Penurunan konsolidasi: cepat di awal lalu melambat; balik ke keadaan awal dengan kurva biasa.
    function lerp(dari, ke, lama, selesai) {
      if (minta) cancelAnimationFrame(minta);
      if (hemat) { sekarang = ke; gambar(ke); if (selesai) selesai(); return; }
      var t0 = null;
      function langkah(t) {
        if (t0 === null) t0 = t;
        var r = Math.min(1, (t - t0) / lama);
        var e = ke > dari ? 1 - Math.pow(1 - r, 3.2) : r < 0.5 ? 4 * r * r * r : 1 - Math.pow(-2 * r + 2, 3) / 2;
        sekarang = dari + (ke - dari) * e;
        gambar(sekarang);
        if (r < 1) minta = requestAnimationFrame(langkah); else { minta = null; if (selesai) selesai(); }
      }
      minta = requestAnimationFrame(langkah);
    }

    var tombol = fig.querySelectorAll('[data-keadaan]');
    function tandai(u) {
      Array.prototype.forEach.call(tombol, function (b) { b.setAttribute('aria-pressed', String(+b.dataset.keadaan === u)); });
    }
    Array.prototype.forEach.call(tombol, function (b) {
      b.addEventListener('click', function () {
        var ke = +b.dataset.keadaan;
        tandai(ke);
        lerp(sekarang, ke, ke ? 1900 : 900);
      });
    });

    if (hemat) { gambar(1); sekarang = 1; tandai(1); return; }
    // Keadaan akhir digambar dulu, supaya penampang tidak pernah tampil kosong (mis. tab latar, ponsel lambat).
    // Animasi baru diputar saat penampang terlihat: mulai dari keadaan awal, lapisan mengendap, lalu menurun.
    gambar(1); sekarang = 1; tandai(1);
    var sudah = false;
    function mulai() {
      if (sudah || document.hidden) return;
      sudah = true;
      gambar(0); sekarang = 0; tandai(0);
      fig.classList.add('mulai');
      setTimeout(function () {
        tandai(1);
        // Sesudah menurun, lapisan berdenyut sekali sebagai tanda bisa diklik.
        lerp(0, 1, 2300, function () { svg.classList.add('ajak'); setTimeout(function () { svg.classList.remove('ajak'); }, 2200); });
      }, 1750);
    }
    var r = fig.getBoundingClientRect();
    if (r.top < innerHeight * 0.8 && r.bottom > 0 && !document.hidden) mulai();
    else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting && !document.hidden) { io.disconnect(); mulai(); } }, { threshold: 0.35 });
      io.observe(fig);
    }
  }

  // ------------------------------------------------------------ hasil hitungan
  // Angka hasil menghitung naik dari 0 (± 0,55 s) saat hasil baru muncul atau tab Hasil dibuka.
  // Teks asli dikembalikan persis di akhir; ekspor membaca angka dari hitungan, bukan dari teks ini.
  function hitungNaik(wadah) {
    if (hemat || !wadah) return;
    Array.prototype.forEach.call(wadah.querySelectorAll('.nilai-besar'), function (n) {
      var tn = Array.prototype.filter.call(n.childNodes, function (c) { return c.nodeType === 3 && /\d/.test(c.nodeValue); })[0];
      if (!tn) return;
      if (tn._anim) { cancelAnimationFrame(tn._anim); tn.nodeValue = tn._asli; }
      var asli = tn.nodeValue, m = asli.match(/-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/);
      if (!m) return;
      var teks = m[0], des = (teks.split(',')[1] || '').length, nilai = parseFloat(teks.replace(/\./g, '').replace(',', '.'));
      if (!isFinite(nilai) || nilai === 0) return;
      var t0 = null;
      tn._asli = asli;
      function langkah(t) {
        if (t0 === null) t0 = t;
        var r = Math.min(1, (t - t0) / 550), e = 1 - Math.pow(1 - r, 3);
        if (r < 1) {
          tn.nodeValue = asli.replace(teks, (nilai * e).toLocaleString('id-ID', { minimumFractionDigits: des, maximumFractionDigits: des }));
          tn._anim = requestAnimationFrame(langkah);
        } else { tn.nodeValue = asli; tn._anim = null; }
      }
      tn._anim = requestAnimationFrame(langkah);
    });
  }
  window.Gerak = { hitungNaik: hitungNaik };

  function amatiHasil(wadah) {
    var lama, adaHasil;
    function kunci(kartu, i) {
      var label = kartu.querySelector('.redup, .kecil');
      return (label ? label.textContent : '') + '#' + i;
    }
    function baca() {
      var nilai = {};
      Array.prototype.forEach.call(wadah.querySelectorAll('.nilai-besar'), function (n, i) {
        var kartu = n.closest('.kartu') || n;
        nilai[kunci(kartu, i)] = { teks: n.textContent, el: kartu };
      });
      return nilai;
    }
    function adaIsi(nilai) { return Object.keys(nilai).length > 0 || !!wadah.querySelector('.grafik, .langkah'); }
    lama = baca(); adaHasil = adaIsi(lama);
    var jadwal = null;
    var mo = new MutationObserver(function () {
      if (jadwal) return;
      jadwal = requestAnimationFrame(function () {
        jadwal = null;
        var baru = baca(), ada = adaIsi(baru);
        if (!hemat) {
          if (ada && !adaHasil) {
            wadah.classList.remove('hasil-baru'); void wadah.offsetWidth; wadah.classList.add('hasil-baru');
            clearTimeout(wadah._hb); wadah._hb = setTimeout(function () { wadah.classList.remove('hasil-baru'); }, 1800);
            hitungNaik(wadah);
          } else if (ada) {
            Object.keys(baru).forEach(function (k) {
              if (lama[k] && lama[k].teks !== baru[k].teks) {
                var e = baru[k].el; e.classList.remove('berubah'); void e.offsetWidth; e.classList.add('berubah');
              }
            });
          }
        }
        lama = baru; adaHasil = ada;
      });
    });
    mo.observe(wadah, { childList: true, subtree: true });
  }

  function amatiNim(akar) {
    var teks = null;
    new MutationObserver(function () {
      var n = document.getElementById('nim-angka');
      if (!n) return;
      var t = n.textContent;
      if (teks !== null && t !== teks && !hemat) { n.classList.remove('berubah'); void n.offsetWidth; n.classList.add('berubah'); }
      teks = t;
    }).observe(akar, { childList: true, subtree: true, characterData: true });
  }

  function pasang() {
    var fig = document.getElementById('penampang');
    if (fig) pasangPenampang(fig);
    ['hasil-praktikum', 'hasil'].forEach(function (id) {
      var w = document.getElementById(id);
      if (w && w.tagName === 'SECTION') amatiHasil(w);
    });
    // #hasil-praktikum dibuat oleh kerangka.js setelah halaman siap; tunggu sebentar bila belum ada.
    var ap = document.getElementById('alat-praktikum');
    if (ap) {
      amatiNim(ap);
      if (!document.getElementById('hasil-praktikum')) {
        var tunggu = new MutationObserver(function () {
          var w = document.getElementById('hasil-praktikum');
          if (w) { tunggu.disconnect(); amatiHasil(w); }
        });
        tunggu.observe(ap, { childList: true, subtree: true });
      }
    }
  }
  // Skrip dimuat dengan defer: tunggu sampai kerangka praktikum dan kalkulator selesai menggambar.
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', pasang);
  else pasang();
})();
