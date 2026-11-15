/* Kamus notasi: saring baris tabel saat mengetik. Semua kata harus cocok; aksen diabaikan. Kata tersimpan di ?q=. */
(function () {
  'use strict';
  var form = document.querySelector('.saring-notasi'), isian = document.getElementById('cariNotasi'), info = document.getElementById('infoNotasi');
  if (!form || !isian) return;
  form.hidden = false;
  var baris = Array.prototype.slice.call(document.querySelectorAll('.tabel-notasi tbody tr'));
  var kelompok = Array.prototype.slice.call(document.querySelectorAll('.kelompok-notasi'));
  var polos = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  baris.forEach(function (tr) { tr._cari = polos(tr.getAttribute('data-cari') || ''); });

  function saring() {
    var kata = polos(isian.value.trim()).split(/\s+/).filter(Boolean), tampil = 0;
    baris.forEach(function (tr) {
      var cocok = kata.every(function (k) { return tr._cari.indexOf(k) >= 0; });
      tr.hidden = !cocok;
      if (cocok) tampil++;
    });
    kelompok.forEach(function (s) { s.hidden = !s.querySelector('tbody tr:not([hidden])'); });
    info.textContent = kata.length ? (tampil ? tampil + ' notasi cocok.' : 'Tidak ada notasi yang cocok.') : '';
    try {
      var url = new URL(location.href);
      if (kata.length) url.searchParams.set('q', isian.value.trim()); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    } catch (e) { /* alamat tidak diubah */ }
  }

  var awal = new URLSearchParams(location.search).get('q');
  if (awal) isian.value = awal;
  isian.addEventListener('input', saring);
  isian.addEventListener('keydown', function (e) { if (e.key === 'Escape') { isian.value = ''; saring(); } });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== isian && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); isian.focus(); }
  });
  if (awal) saring();
})();
