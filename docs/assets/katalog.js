/*
 * Katalog praktikum: cari langsung di halaman dan saring per kelompok uji.
 * Tanpa JavaScript, kotak cari tetap tersembunyi dan bar kelompok tetap berupa tautan ke bagiannya.
 * Kata kunci dan kelompok disimpan di alamat (?q=…&k=…) supaya hasil saringan bisa dibagikan.
 */
(function () {
  'use strict';
  var wadah = document.getElementById('saring-katalog');
  if (!wadah) return;
  var input = document.getElementById('cari-alat'), info = document.getElementById('hasil-saring');
  var kosong = document.getElementById('kosong-saring');
  var tombol = Array.prototype.slice.call(document.querySelectorAll('[data-saring]'));
  var butir = Array.prototype.slice.call(document.querySelectorAll('.daftar-uji li[data-cari]'));
  var bagian = Array.prototype.slice.call(document.querySelectorAll('.kelompok-uji'));
  var kelompok = '';
  wadah.hidden = false;

  // Bar kelompok (inti bor) menjadi tombol saring; tombol "Semua" mengembalikan semua alat.
  tombol.forEach(function (b) {
    if (b.tagName === 'A') { b.setAttribute('role', 'button'); b.setAttribute('aria-pressed', 'false'); }
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var k = b.getAttribute('data-saring');
      kelompok = k && kelompok === k ? '' : k;
      saring(true);
    });
  });

  function normal(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

  function saring(simpan) {
    var kata = normal(input.value).split(/\s+/).filter(Boolean), n = 0;
    butir.forEach(function (li) {
      var teks = normal(li.getAttribute('data-cari'));
      var cocok = (!kelompok || li.getAttribute('data-kelompok') === kelompok) && kata.every(function (k) { return teks.indexOf(k) >= 0; });
      li.hidden = !cocok;
      if (cocok) n++;
    });
    bagian.forEach(function (s) { s.hidden = !s.querySelector('li[data-cari]:not([hidden])'); });
    tombol.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-saring') === kelompok)); });
    var disaring = kata.length || kelompok;
    info.textContent = disaring ? n + ' alat cocok' : '';
    kosong.hidden = n > 0;
    var keCari = document.getElementById('cari-situs');
    if (keCari) keCari.href = '../cari/' + (input.value.trim() ? '?q=' + encodeURIComponent(input.value.trim()) : '');
    if (simpan) {
      var q = [];
      if (input.value.trim()) q.push('q=' + encodeURIComponent(input.value.trim()));
      if (kelompok) q.push('k=' + encodeURIComponent(kelompok));
      try { history.replaceState(null, '', location.pathname + (q.length ? '?' + q.join('&') : '') + location.hash); } catch (e) { /* abaikan */ }
    }
  }

  var awal = new URLSearchParams(location.search);
  if (awal.get('q')) input.value = awal.get('q');
  if (awal.get('k') && tombol.some(function (b) { return b.getAttribute('data-saring') === awal.get('k'); })) kelompok = awal.get('k');
  input.addEventListener('input', function () { saring(true); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Escape' && input.value) { input.value = ''; saring(true); } });
  // Tombol "/" memusatkan kotak cari, seperti di banyak katalog.
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
  });
  saring(false);
})();
