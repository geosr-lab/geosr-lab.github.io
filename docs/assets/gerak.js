/*
 * Gerak tampilan situs. Hanya tampilan: tidak menyentuh hitungan.
 * 1. Filter cahaya timbul untuk sketsa, sorot kursor dan kartu miring 3D (dasbor beranda kini memakai blok3d.js).
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

  // ------------------------------------------------------------ filter cahaya timbul untuk sketsa
  // Satu sumber cahaya di kiri atas (azimut 225°). #geosr-timbul: tepi bentuk yang menghadap cahaya lebih
  // terang, tepi seberangnya lebih gelap, sedikit kilap, dan bayangan jatuh ke kanan bawah. #geosr-garis:
  // bayangan tipis di bawah garis. Kelas "ada-timbul" di <html> baru dipasang setelah filter tersedia.
  (function () {
    if (!document.body || document.getElementById('geosr-filter')) return;
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('id', 'geosr-filter'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    svg.innerHTML =
      '<filter id="geosr-timbul" x="-15%" y="-15%" width="140%" height="145%" color-interpolation-filters="sRGB">' +
        '<feGaussianBlur in="SourceAlpha" stdDeviation="1.8" result="b"/>' +
        '<feDiffuseLighting in="b" surfaceScale="3" diffuseConstant="1" lighting-color="#fff" result="d"><feDistantLight azimuth="225" elevation="50"/></feDiffuseLighting>' +
        '<feComposite in="d" in2="SourceGraphic" operator="arithmetic" k1="0.55" k2="0" k3="0.6" k4="0" result="lit"/>' +
        '<feSpecularLighting in="b" surfaceScale="3" specularConstant=".55" specularExponent="28" lighting-color="#fff" result="s"><feDistantLight azimuth="225" elevation="40"/></feSpecularLighting>' +
        '<feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>' +
        '<feComposite in="lit" in2="s2" operator="arithmetic" k1="0" k2="1" k3="0.55" k4="0" result="kilap"/>' +
        '<feComposite in="kilap" in2="SourceAlpha" operator="in" result="isi"/>' +
        '<feOffset in="SourceAlpha" dx="1.2" dy="2" result="o"/><feGaussianBlur in="o" stdDeviation="1.6" result="ob"/>' +
        '<feComponentTransfer in="ob" result="bayang"><feFuncA type="linear" slope=".28"/></feComponentTransfer>' +
        '<feMerge><feMergeNode in="bayang"/><feMergeNode in="isi"/></feMerge>' +
      '</filter>' +
      '<filter id="geosr-garis" x="-10%" y="-10%" width="125%" height="130%">' +
        '<feOffset in="SourceAlpha" dx=".7" dy="1.1" result="o"/><feGaussianBlur in="o" stdDeviation=".7" result="ob"/>' +
        '<feComponentTransfer in="ob" result="bayang"><feFuncA type="linear" slope=".3"/></feComponentTransfer>' +
        '<feMerge><feMergeNode in="bayang"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      '</filter>';
    document.body.insertBefore(svg, document.body.firstChild);
    document.documentElement.classList.add('ada-timbul');
  })();

  // ------------------------------------------------------------ cahaya kursor dan kartu miring 3D
  // Sorot lembut mengikuti kursor (CSS memakai --mx dan --my) di kartu dan petak dasbor. Kartu kecil juga
  // sedikit miring ke arah kursor (perspektif 700 px, paling banyak 5°). Hanya tetikus; tanpa miring bila
  // pengguna memilih gerak dikurangi.
  (function () {
    var SOROT = '.petak, .kartu, .kartu-praktikum, .daftar-uji a, .daftar-lanjutkan a, .alur-tahap, .sketsa-bingkai';
    var MIRING = 'a.kartu, .daftar-uji a, .daftar-lanjutkan a, .kartu-praktikum, .alur-alat a';
    var diam = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var miring = null;
    function lepas() { if (miring) { miring.style.transform = ''; miring = null; } }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !e.target.closest) return;
      var p = e.target.closest(SOROT);
      if (p) {
        var r = p.getBoundingClientRect();
        p.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        p.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }
      var m = diam ? null : e.target.closest(MIRING);
      if (m !== miring) lepas();
      if (!m) return;
      miring = m;
      var k = m.getBoundingClientRect(), u = (e.clientX - k.left) / k.width - 0.5, v = (e.clientY - k.top) / k.height - 0.5;
      m.style.transform = 'perspective(700px) rotateX(' + (-v * 5).toFixed(2) + 'deg) rotateY(' + (u * 5).toFixed(2) + 'deg) translateY(-2px)';
    }, { passive: true });
    document.addEventListener('pointerleave', lepas);
    window.addEventListener('blur', lepas);
  })();

  // ------------------------------------------------------------ riwayat untuk "Lanjutkan" di beranda
  // Hanya disimpan di localStorage browser pengguna: alamat, judul, jenis, waktu. Maksimal 6, terbaru di depan.
  (function () {
    var p = location.pathname, jenis = null;
    if (/\/praktikum\/[a-z0-9-]+\/$/.test(p)) jenis = 'Praktikum';
    else if (/\/kalkulator\/[a-z0-9-]+\.html$/.test(p)) jenis = 'Kalkulator';
    else if (/\/latihan\/$/.test(p)) jenis = 'Latihan';
    else if (/\/notasi\/$/.test(p)) jenis = 'Notasi';
    if (!jenis) return;
    try {
      var daftar = JSON.parse(localStorage.getItem('geosr-riwayat') || '[]').filter(function (r) { return r && r.u !== p; });
      daftar.unshift({ u: p, j: document.title.split(' · ')[0].replace(/^Kalkulator /, ''), k: jenis, t: Date.now() });
      localStorage.setItem('geosr-riwayat', JSON.stringify(daftar.slice(0, 6)));
    } catch (e) { /* penyimpanan tidak tersedia */ }
  })();

  // ------------------------------------------------------------ tombol tema
  (function () {
    var tombol = document.querySelector('.tema-tombol');
    if (!tombol) return;
    var akar = document.documentElement;
    var URUT = ['', 'terang', 'gelap'];
    var en = /^en\b/i.test(akar.lang || '');
    var NAMA = en ? { '': 'follow system', terang: 'light', gelap: 'dark' }
                  : { '': 'ikut sistem', terang: 'terang', gelap: 'gelap' };
    function label() {
      var nama = NAMA[akar.getAttribute('data-tema') || ''];
      tombol.setAttribute('aria-label', en ? 'Theme: ' + nama + '. Click to change.' : 'Tema: ' + nama + '. Klik untuk ganti.');
    }
    label();
    tombol.addEventListener('click', function () {
      var kini = akar.getAttribute('data-tema') || '';
      var lanjut = URUT[(URUT.indexOf(kini) + 1) % URUT.length];
      if (lanjut) akar.setAttribute('data-tema', lanjut); else akar.removeAttribute('data-tema');
      try { if (lanjut) localStorage.setItem('tema', lanjut); else localStorage.removeItem('tema'); } catch (e) { /* tidak tersimpan */ }
      label();
    });
  })();

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
