/* Fungsi bersama untuk semua kalkulator: format angka, rumus KaTeX, dan tautan berbagi. */
(function () {
  'use strict';

  // Desimal koma, ribuan titik.
  function f(x, d) {
    if (d === undefined) d = 2;
    if (!isFinite(x)) return '–';
    return x.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  // Angka untuk di dalam rumus TeX (koma harus dibungkus supaya tidak diberi spasi).
  function t(x, d) { return f(x, d).replace(/,/g, '{,}'); }

  function tex(s, blok) {
    if (window.katex) {
      try { return katex.renderToString(s, { displayMode: !!blok, throwOnError: false }); } catch (e) { /* pakai cadangan */ }
    }
    return '<code>' + s.replace(/</g, '&lt;') + '</code>';
  }
  function rumus(s) { return '<div class="rumus">' + tex(s, true) + '</div>'; }

  function simpanKeHash(keadaan) {
    try { history.replaceState(null, '', '#' + btoa(JSON.stringify(keadaan))); } catch (e) { /* abaikan */ }
  }
  function bacaHash(cek) {
    try {
      if (location.hash.length > 1) {
        var o = JSON.parse(atob(location.hash.slice(1)));
        if (o && (!cek || cek(o))) return o;
      }
    } catch (e) { /* hash rusak diabaikan */ }
    return null;
  }
  // Isi tautan berbagi dianggap tidak tepercaya: teks yang memuat karakter HTML ditolak seluruhnya.
  function tanpaHTML(o) {
    if (typeof o === 'string') return !/[<>"'&`]/.test(o);
    if (o && typeof o === 'object') return Object.keys(o).every(function (k) { return tanpaHTML(k) && tanpaHTML(o[k]); });
    return true;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function salinTautan(elPesan) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(location.href).then(
        function () { elPesan.textContent = 'Tautan disalin. Siapa pun yang membukanya akan melihat data yang sama.'; },
        function () { elPesan.textContent = 'Salin tautan dari bilah alamat browser.'; });
    } else elPesan.textContent = 'Salin tautan dari bilah alamat browser.';
  }

  // Tombol "Laporkan salah hitung": membuka Issue baru dengan templat dan tautan hasil terisi.
  var REPO_ISSUE = 'https://github.com/defsayurinda/defsayurinda.github.io/issues/new';
  function namaAlat(jalur) {
    if (/kalkulator\/tiang-bor/.test(jalur)) return 'Tiang bor N-SPT';
    if (/kalkulator\/pondasi-dangkal/.test(jalur)) return 'Pondasi dangkal';
    if (/kalkulator\/konsolidasi/.test(jalur)) return 'Penurunan konsolidasi';
    if (/praktikum\//.test(jalur)) return 'Praktikum Mekanika Tanah';
    if (/latihan\//.test(jalur)) return 'Latihan soal';
    return 'Lainnya';
  }
  function tautanLaporan() {
    var judul = document.title.split(' · ')[0];
    return REPO_ISSUE + '?template=salah-hitung.yml' +
      '&title=' + encodeURIComponent('Salah hitung: ' + judul) +
      '&alat=' + encodeURIComponent(namaAlat(location.pathname)) +
      '&masukan=' + encodeURIComponent((window.Umum && window.Umum.tautanData && window.Umum.tautanData()) || location.href);
  }
  function pasangLaporan() {
    var main = document.querySelector('main');
    if (!main || !/kalkulator\/|praktikum\/[^/]+\/|latihan\//.test(location.pathname)) return;
    var bagian = document.createElement('section');
    bagian.className = 'tidak-cetak lapor';
    var h = document.createElement('h2'); h.textContent = 'Menemukan salah hitung?';
    var p = document.createElement('p');
    p.textContent = 'Laporkan lewat Issue di GitHub. Tautan hasil dan nama alat sudah terisi; tambahkan hasil yang kamu harapkan beserta sumbernya. ' +
      'Isi Issue terlihat publik, dan tautan hasil memuat data yang sedang kamu isi, jadi jangan kirim data proyek atau data pribadi.';
    var a = document.createElement('a');
    a.className = 'tombol'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Laporkan salah hitung';
    a.href = REPO_ISSUE;
    // Tautan dibuat saat diklik, supaya memuat data terakhir di formulir.
    a.addEventListener('click', function () { a.href = tautanLaporan(); });
    bagian.appendChild(h); bagian.appendChild(p); bagian.appendChild(a);
    // Halaman praktikum bertab: kotak laporan masuk tab "Sumber dan catatan".
    (document.getElementById('panel-sumber') || main).appendChild(bagian);
  }
  // Daftar lompat di halaman kalkulator: Ringkasan · Langkah · Hasil · Grafik · Catatan · Sumber.
  // Dibangun ulang setiap #hasil digambar ulang. Tautan tidak mengubah location.hash, karena hash
  // dipakai untuk menyimpan masukan (simpanKeHash).
  function pasangLompat() {
    var hasil = document.getElementById('hasil');
    if (!hasil || !/kalkulator\//.test(location.pathname)) return;
    var nav = document.createElement('nav');
    nav.className = 'lompat tidak-cetak'; nav.setAttribute('aria-label', 'Lompat ke bagian hasil'); nav.hidden = true;
    hasil.parentNode.insertBefore(nav, hasil);
    function judul(pola, akar) {
      var h = (akar || hasil).querySelectorAll('h2');
      for (var i = 0; i < h.length; i++) if (pola.test(h[i].textContent)) return h[i];
      return null;
    }
    function tandai(el, id) { if (el && !el.id) el.id = id; return el; }
    function bangun() {
      var ringkas = document.getElementById('ringkas');
      // Grafik = figure pertama, atau SVG gambar (role="img") yang lebar; ikon kecil diabaikan.
      var grafik = null;
      Array.prototype.some.call(hasil.querySelectorAll('figure, svg[role="img"]'), function (el) {
        var vb = el.viewBox && el.viewBox.baseVal;
        if (el.tagName === 'FIGURE' || (vb && vb.width >= 300)) { grafik = el.closest('figure') || el; return true; }
        return false;
      });
      var sumber = null, main = hasil.closest('main');
      if (main) Array.prototype.some.call(main.querySelectorAll('h2'), function (h) { return /^Sumber/.test(h.textContent) && (sumber = h); });
      var isi = [
        ['Ringkasan', tandai(judul(/^Ringkasan/) || (ringkas && (ringkas.closest('aside, .kartu') || ringkas)), 'b-ringkasan')],
        ['Langkah', tandai(judul(/^1\./), 'b-langkah')],
        ['Hasil', tandai(judul(/^4\./), 'b-hasil')],
        ['Grafik', tandai(grafik, 'b-grafik')],
        ['Catatan', tandai(judul(/^5\./), 'b-catatan')],
        ['Sumber', tandai(sumber, 'b-sumber')]
      ].filter(function (x) { return x[1]; });
      // Tanpa langkah hitungan (masukan belum lengkap) daftar disembunyikan.
      nav.hidden = !judul(/^1\./);
      if (nav.hidden) { nav.innerHTML = ''; return; }
      nav.innerHTML = '<span class="lompat-label">Lompat</span>' + isi.map(function (x) {
        return '<a href="#' + x[1].id + '" data-ke="' + x[1].id + '">' + x[0] + '</a>';
      }).join('');
      sasaran = isi;
      sorot();
    }
    // Bagian aktif = sasaran terakhir yang bagian atasnya sudah melewati bilah lompat (±140 px dari atas).
    // Di atas sasaran pertama tidak ada yang disorot.
    var sasaran = [], antri = false;
    function sorot() {
      antri = false;
      var aktif = null;
      sasaran.forEach(function (x) { if (x[1].getBoundingClientRect().top <= 140) aktif = x[1].id; });
      Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
        if (a.getAttribute('data-ke') === aktif) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    window.addEventListener('scroll', function () { if (!antri) { antri = true; setTimeout(sorot, 80); } }, { passive: true });
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-ke]');
      if (!a) return;
      e.preventDefault();
      var el = document.getElementById(a.getAttribute('data-ke'));
      if (!el) return;
      var halus = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      el.scrollIntoView({ behavior: halus ? 'smooth' : 'auto', block: 'start' });
    });
    var tunda = 0;
    if ('MutationObserver' in window) {
      new MutationObserver(function () { clearTimeout(tunda); tunda = setTimeout(bangun, 30); }).observe(hasil, { childList: true });
    }
    bangun();
  }
  function pasangSemua() { pasangLaporan(); pasangLompat(); }
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasangSemua);
    else pasangSemua();
  }

  window.Umum = {
    $: function (id) { return document.getElementById(id); },
    salin: function (o) { return JSON.parse(JSON.stringify(o)); },
    f: f, t: t, tex: tex, rumus: rumus, esc: esc, tanpaHTML: tanpaHTML,
    simpanKeHash: simpanKeHash, bacaHash: bacaHash, salinTautan: salinTautan, tautanLaporan: tautanLaporan,
    KN_PER_TON: 9.80665
  };
})();
