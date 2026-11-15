/* Palet cari: Ctrl+K (⌘K) atau "/" di halaman mana pun membuka kotak cari cepat dari cari.json.
   Saat kosong, menampilkan alat yang terakhir dibuka (riwayat localStorage) dan tujuan utama.
   Tautan "Cari" di menu juga membuka palet; klik dengan Ctrl/Shift tetap membuka halaman Cari. */
(function () {
  'use strict';
  var skrip = document.currentScript;
  var dasar = skrip ? skrip.src.replace(/assets\/palet\.js.*$/, '') : '/';
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var polos = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var UTAMA = [['praktikum/', 'Praktikum Mekanika Tanah', 'Tujuan'], ['alat/', 'Semua kalkulator', 'Tujuan'], ['latihan/', 'Latihan soal', 'Tujuan'], ['notasi/', 'Kamus notasi', 'Tujuan']];
  var data = null, dialog, isian, daftar, hasil = [], pilihan = 0;

  function muat() {
    if (data) return Promise.resolve(data);
    return fetch(dasar + 'cari.json').then(function (r) { return r.json(); }).then(function (d) {
      data = d.map(function (x) { return { x: x, j: polos(x.j), semua: polos(x.j + ' ' + x.d + ' ' + x.h + ' ' + x.k) }; });
      return data;
    }).catch(function () { data = []; return data; });
  }

  function riwayat() {
    try {
      return JSON.parse(localStorage.getItem('geosr-riwayat') || '[]').filter(function (r) { return r && typeof r.u === 'string' && /^\/[\w\-\/.]*$/.test(r.u); }).slice(0, 4);
    } catch (e) { return []; }
  }

  function tampil(butir, judulKelompok) {
    hasil = butir;
    pilihan = butir.length ? 0 : -1;
    var html = '', kelompok = null;
    butir.forEach(function (b, i) {
      if (judulKelompok && b.kelompok !== kelompok) { kelompok = b.kelompok; html += '<li class="palet-kelompok" role="presentation">' + esc(kelompok) + '</li>'; }
      html += '<li role="option" id="palet-' + i + '" aria-selected="' + (i === pilihan) + '"><a href="' + esc(b.u) + '"><span class="jenis">' + esc(b.k) + '</span><span class="judul">' + esc(b.j) + '</span></a></li>';
    });
    if (!butir.length) html = '<li class="palet-kosong">Tidak ada yang cocok. Coba kata lain, misalnya "kadar air", "tiang", atau "OCR".</li>';
    daftar.innerHTML = html;
    isian.setAttribute('aria-activedescendant', pilihan >= 0 ? 'palet-0' : '');
  }

  function awal() {
    var r = riwayat().map(function (x) { return { u: x.u, j: x.j, k: x.k || '', kelompok: 'Terakhir dibuka' }; });
    var u = UTAMA.map(function (x) { return { u: dasar + x[0], j: x[1], k: x[2], kelompok: 'Tujuan utama' }; });
    tampil(r.concat(u), true);
  }

  function cari() {
    var kata = polos(isian.value.trim()).split(/\s+/).filter(Boolean);
    if (!kata.length) { awal(); return; }
    muat().then(function (d) {
      var cocok = d.filter(function (b) { return kata.every(function (k) { return b.semua.indexOf(k) >= 0; }); })
        .map(function (b) { return { b: b, s: kata.reduce(function (s, k) { return s + (b.j.indexOf(k) >= 0 ? 2 : 0); }, 0) }; })
        .sort(function (a, b) { return b.s - a.s; }).slice(0, 8)
        .map(function (h) { return { u: dasar + h.b.x.u, j: h.b.x.j, k: h.b.x.k }; });
      tampil(cocok, false);
    });
  }

  function tandai() {
    Array.prototype.forEach.call(daftar.querySelectorAll('[role="option"]'), function (li, i) { li.setAttribute('aria-selected', String(i === pilihan)); });
    var aktif = document.getElementById('palet-' + pilihan);
    isian.setAttribute('aria-activedescendant', aktif ? aktif.id : '');
    if (aktif) aktif.scrollIntoView({ block: 'nearest' });
  }

  function buat() {
    dialog = document.createElement('dialog');
    dialog.className = 'palet';
    dialog.setAttribute('aria-label', 'Cari cepat');
    dialog.innerHTML = '<form method="dialog" class="palet-kepala" role="search">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/></svg>' +
      '<input type="search" autocomplete="off" placeholder="Cari alat, kalkulator, atau notasi…" aria-label="Cari cepat" role="combobox" aria-expanded="true" aria-controls="palet-daftar">' +
      '<kbd>Esc</kbd></form><ul class="palet-daftar" id="palet-daftar" role="listbox" aria-label="Hasil"></ul>' +
      '<p class="palet-kaki"><span><kbd>↑</kbd><kbd>↓</kbd> pilih</span><span><kbd>Enter</kbd> buka</span><span><kbd>Ctrl</kbd><kbd>K</kbd> buka palet</span></p>';
    document.body.appendChild(dialog);
    isian = dialog.querySelector('input');
    daftar = dialog.querySelector('.palet-daftar');
    isian.addEventListener('input', cari);
    isian.addEventListener('keydown', function (e) {
      var n = hasil.length;
      if (e.key === 'ArrowDown' && n) { e.preventDefault(); pilihan = (pilihan + 1) % n; tandai(); }
      else if (e.key === 'ArrowUp' && n) { e.preventDefault(); pilihan = (pilihan - 1 + n) % n; tandai(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (pilihan >= 0 && hasil[pilihan]) location.href = hasil[pilihan].u; }
    });
    // Klik di luar kotak (latar dialog) menutup palet.
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  }

  function buka() {
    if (!dialog) buat();
    if (dialog.open) return;
    isian.value = '';
    awal();
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    isian.focus();
    muat();
  }

  var punyaCariSendiri = function () { return document.querySelector('#cariBeranda, #cariNotasi, #kataCari, #saring-katalog input'); };
  document.addEventListener('keydown', function (e) {
    var diIsian = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); buka(); }
    else if (e.key === '/' && !diIsian && !punyaCariSendiri()) { e.preventDefault(); buka(); }
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('#menu-utama a[href$="cari/"]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0 || /\/cari\/$/.test(location.pathname)) return;
    e.preventDefault();
    buka();
  });
  window.Palet = { buka: buka };
})();
