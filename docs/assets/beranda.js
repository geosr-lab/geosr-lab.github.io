/* Beranda: kotak cari langsung (dari cari.json) dan daftar "Lanjutkan" (riwayat di localStorage browser pengguna). */
(function () {
  'use strict';
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var polos = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };

  // ------------------------------------------------------------ cari langsung
  var form = document.querySelector('.cari-beranda'), isian = document.getElementById('cariBeranda'), daftar = document.getElementById('hasilBeranda');
  if (form && isian && daftar) {
    var data = null, pilihan = -1, hasil = [];
    var muat = function () {
      if (data) return Promise.resolve(data);
      return fetch('cari.json').then(function (r) { return r.json(); }).then(function (d) {
        data = d.map(function (x) { return { x: x, j: polos(x.j), semua: polos(x.j + ' ' + x.d + ' ' + x.h + ' ' + x.k) }; });
        return data;
      }).catch(function () { data = []; return data; });
    };
    var tutup = function () { daftar.hidden = true; pilihan = -1; isian.setAttribute('aria-expanded', 'false'); };
    var tandai = function () {
      Array.prototype.forEach.call(daftar.children, function (li, i) { li.setAttribute('aria-selected', String(i === pilihan)); });
    };
    var cari = function () {
      var kata = polos(isian.value.trim()).split(/\s+/).filter(Boolean);
      if (!kata.length) { tutup(); return; }
      muat().then(function (d) {
        hasil = d.filter(function (b) { return kata.every(function (k) { return b.semua.indexOf(k) >= 0; }); })
          .map(function (b) { return { b: b, skor: kata.reduce(function (s, k) { return s + (b.j.indexOf(k) >= 0 ? 2 : 0); }, 0) }; })
          .sort(function (a, b) { return b.skor - a.skor; }).slice(0, 6).map(function (h) { return h.b.x; });
        daftar.innerHTML = hasil.length
          ? hasil.map(function (x, i) {
              return '<li role="option" id="hasil-' + i + '" aria-selected="false"><a href="' + esc(x.u) + '"><span class="jenis">' + esc(x.k) + '</span><span class="judul">' + esc(x.j) + '</span></a></li>';
            }).join('') + '<li class="semua"><a href="cari/?q=' + encodeURIComponent(isian.value.trim()) + '">Lihat semua hasil di halaman Cari</a></li>'
          : '<li class="kosong">Tidak ada yang cocok. Coba kata lain, misalnya "kadar air" atau "tiang".</li>';
        pilihan = -1; tandai();
        daftar.hidden = false; isian.setAttribute('aria-expanded', 'true');
      });
    };
    isian.addEventListener('input', cari);
    isian.addEventListener('focus', function () { muat(); if (isian.value.trim()) cari(); });
    isian.addEventListener('keydown', function (e) {
      if (daftar.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // -1 berarti kembali ke kotak isian; panah berputar melewati semua hasil.
        if (e.key === 'ArrowDown') pilihan = pilihan + 1 >= hasil.length ? -1 : pilihan + 1;
        else pilihan = pilihan - 1 < -1 ? hasil.length - 1 : pilihan - 1;
        tandai();
        isian.setAttribute('aria-activedescendant', pilihan >= 0 ? 'hasil-' + pilihan : '');
      } else if (e.key === 'Enter' && pilihan >= 0) {
        e.preventDefault(); location.href = hasil[pilihan].u;
      } else if (e.key === 'Escape') { tutup(); }
    });
    document.addEventListener('click', function (e) { if (!form.contains(e.target)) tutup(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); isian.focus(); }
    });
  }


  // ------------------------------------------------------------ lanjutkan
  var bagian = document.getElementById('lanjutkan'), wadah = document.getElementById('daftarLanjutkan');
  if (!bagian || !wadah) return;
  var riwayat = [];
  try { riwayat = JSON.parse(localStorage.getItem('geosr-riwayat') || '[]'); } catch (e) { riwayat = []; }
  riwayat = riwayat.filter(function (r) { return r && typeof r.u === 'string' && /^\/[\w\-\/.]*$/.test(r.u) && typeof r.j === 'string'; }).slice(0, 4);
  if (!riwayat.length) return;
  var lalu = function (t) {
    var menit = Math.round((Date.now() - t) / 60000);
    if (menit < 1) return 'baru saja';
    if (menit < 60) return menit + ' menit lalu';
    var jam = Math.round(menit / 60);
    if (jam < 24) return jam + ' jam lalu';
    return Math.round(jam / 24) + ' hari lalu';
  };
  wadah.innerHTML = riwayat.map(function (r) {
    return '<li><a href="' + esc(r.u) + '"><span class="jenis">' + esc(r.k || '') + '</span><span class="judul">' + esc(r.j) + '</span><span class="waktu">' + esc(lalu(r.t || Date.now())) + '</span></a></li>';
  }).join('');
  bagian.hidden = false;
  document.getElementById('hapusRiwayat').addEventListener('click', function () {
    try { localStorage.removeItem('geosr-riwayat'); } catch (e) { /* tidak tersimpan */ }
    bagian.hidden = true;
  });
})();
