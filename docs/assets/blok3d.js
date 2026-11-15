/*
 * Blok tanah 3D di dasbor beranda (three.js lewat adegan3d.js). Hanya tampilan: tidak menyentuh hitungan.
 * Sepuluh lapisan (enam kelompok uji, tiga kategori kalkulator, batuan dasar) menjadi lempeng tanah 3D bertekstur
 * yang bertumpuk di atas lantai kertas milimeter, disinari matahari dari kiri atas dengan bayangan lembut.
 *
 * - Seret = putar kamera mengelilingi blok (sudut tegak dibatasi supaya bentuk selalu jelas); berputar pelan saat dibiarkan.
 * - Klik lempeng atau tombol nomor lapisan = lempeng ditarik keluar seperti laci; pin alat berdiri di permukaannya
 *   dengan label; panel di bawah kanvas berisi tautan alat lapisan itu (bisa dipakai papan ketik).
 * - "Urai lapisan" merenggangkan semua lempeng supaya semua pin terlihat.
 * - Klik pin = kartu alat dengan tombol Buka. Kotak cari beranda (#cariBeranda) menyorot pin yang cocok.
 * - Alat yang terakhir dibuka (localStorage geosr-riwayat, sama dengan daftar "Lanjutkan") diberi cincin laterit.
 * Data dibaca dari daftar tautan .lapis-daftar di dalam .pn-data (dibangun bangun_situs.py).
 * Tanpa WebGL: tombol lapisan dan panel tautan tetap bekerja, kanvas tidak tampil.
 */
(function () {
  'use strict';
  var akar = document.querySelector('[data-blok3d]');
  if (!akar) return;
  var data = akar.querySelector('.pn-data'), panggung = akar.querySelector('.blok-panggung');
  var tombolLapisan = akar.querySelector('.b3-lapis'), info = akar.querySelector('.b3-info'), kartu = akar.querySelector('.pn-kartu');
  if (!data || !panggung) return;
  function polos(t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function el(tag, kelas, teks) { var e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; }
  function cssRgb(c) { return 'rgb(' + c.map(Math.round).join(',') + ')'; }

  // ------------------------------------------------------------ data
  var TEKSTUR = ['tanah', 'lempung', 'tanah', 'pasir', 'lempung', 'tanah', 'tanah', 'lempung', 'pasir', 'batu'];
  var LEBAR = 60, DALAM = 36, CELAH = 0.7, RENGGANG = 6;
  var lapisan = [], pin = [];
  Array.prototype.forEach.call(data.querySelectorAll('.lapis-daftar'), function (s, i) {
    var judul = s.querySelector('h3, p'), tautan = s.querySelectorAll('a');
    var L = { i: i, no: (i < 9 ? '0' : '') + (i + 1), judul: judul.lastChild.textContent.trim(), jenis: s.getAttribute('data-jenis') || '',
      el: s, tebal: 4.5 + 1.3 * tautan.length, pin: [], keluar: 0, y: 0 };
    Array.prototype.forEach.call(tautan, function (a, j) {
      var n = tautan.length;
      var p = { L: L, judul: a.textContent.trim(), url: a.getAttribute('href'), acuan: a.getAttribute('data-acuan') || '',
        x: (-0.36 + 0.72 * (j + 0.5) / n) * LEBAR, z: ((j % 2) ? 0.18 : -0.12) * DALAM, cocok: false, baru: false };
      p.kata = polos([p.judul, p.acuan, L.judul].join(' '));
      L.pin.push(p); pin.push(p);
    });
    lapisan.push(L);
  });
  if (!lapisan.length) return;
  try {
    var riwayat = JSON.parse(localStorage.getItem('geosr-riwayat') || '[]');
    pin.forEach(function (p) {
      var u = p.url.replace(/^\.?\//, '');
      p.baru = riwayat.some(function (r) { return r && r.u && r.u.replace(/^\//, '') === u; });
    });
  } catch (e) { /* penyimpanan tidak tersedia */ }
  function warnaLapisan(L) { return window.Adegan3D ? window.Adegan3D.rgbCss(getComputedStyle(L.el).borderLeftColor) : [128, 128, 128]; }

  var dipilih = 0, urai = 0, uraiSasaran = 0, kataCari = '', terpilihPin = null, hoverPin = null, hoverLapis = null;
  var adegan = null, THREE = null, kelompok = null, labelLapis = [];

  // ------------------------------------------------------------ panel dan tombol (tetap bekerja tanpa WebGL)
  var tombol = lapisan.map(function (L) {
    var b = el('button', 'b3-no', L.no);
    b.type = 'button';
    b.setAttribute('aria-label', 'Lapisan ' + L.no + ', ' + L.judul + ', ' + L.pin.length + ' alat');
    b.addEventListener('click', function () { pilih(L.i === dipilih ? -1 : L.i); });
    tombolLapisan.appendChild(b);
    return b;
  });
  function warnaiTombol() { tombol.forEach(function (b, k) { b.style.setProperty('--lapis', cssRgb(warnaLapisan(lapisan[k]))); }); }
  function daftarChip(isi) {
    var ul = el('ul', 'chip-daftar');
    isi.forEach(function (p) {
      var li = el('li'), a = el('a', 'chip' + (p.cocok ? ' cocok' : ''), p.judul);
      a.href = p.url; a.style.setProperty('--lapis', cssRgb(warnaLapisan(p.L)));
      li.appendChild(a); ul.appendChild(li);
    });
    return ul;
  }
  function isiPanel() {
    info.textContent = '';
    var L = lapisan[dipilih];
    if (!L) {
      info.style.removeProperty('--lapis');
      var baru = pin.filter(function (p) { return p.baru; });
      info.appendChild(el('p', 'b3-judul', pin.length + ' alat di ' + lapisan.length + ' lapisan'));
      info.appendChild(el('p', 'b3-ket', 'Pilih nomor lapisan atau klik lempengnya. Seret blok untuk memutar.'));
      if (baru.length) { info.appendChild(el('p', 'b3-ket', 'Terakhir dibuka (bercincin jingga):')); info.appendChild(daftarChip(baru)); }
      return;
    }
    var cocok = L.pin.filter(function (p) { return p.cocok; });
    info.style.setProperty('--lapis', cssRgb(warnaLapisan(L)));
    info.appendChild(el('p', 'b3-judul', 'Lapisan ' + L.no + ', ' + L.judul));
    info.appendChild(el('p', 'b3-ket', L.pin.length + ' ' + (L.jenis === 'Kalkulator' ? 'kalkulator' : L.jenis === 'Praktikum' ? 'alat praktikum' : 'halaman') +
      (kataCari ? ', ' + cocok.length + ' cocok dengan pencarian' : '') + '.'));
    info.appendChild(daftarChip(L.pin));
  }
  function pilih(n) {
    dipilih = n; terpilihPin = null; if (kartu) kartu.hidden = true;
    tombol.forEach(function (b, k) { b.setAttribute('aria-pressed', k === n ? 'true' : 'false'); });
    isiPanel();
    if (adegan) { perbaruiPin(); adegan.gambar(); }
  }
  function bukaKartu(p) {
    terpilihPin = p;
    if (!kartu) { location.href = p.url; return; }
    kartu.textContent = '';
    kartu.style.setProperty('--lapis', cssRgb(warnaLapisan(p.L)));
    kartu.appendChild(el('p', 'lapis-nama', 'Lapisan ' + p.L.no + ', ' + p.L.judul));
    kartu.appendChild(el('h3', '', p.judul));
    if (p.acuan) kartu.appendChild(el('span', 'chip', p.acuan));
    var aksi = el('div', 'aksi'), buka = el('a', 'tombol utama kecil', p.L.jenis === 'Kalkulator' ? 'Buka kalkulator' : p.L.jenis === 'Praktikum' ? 'Buka alat' : 'Buka');
    buka.href = p.url;
    var tutup = el('button', 'tombol kecil', 'Tutup'); tutup.type = 'button';
    tutup.addEventListener('click', function () { kartu.hidden = true; terpilihPin = null; if (adegan) { perbaruiPin(); adegan.gambar(); } });
    aksi.appendChild(buka); aksi.appendChild(tutup); kartu.appendChild(aksi);
    kartu.hidden = false;
    if (adegan) { perbaruiPin(); adegan.gambar(); }
  }
  var cari = document.getElementById('cariBeranda');
  if (cari) {
    cari.addEventListener('input', function () {
      kataCari = polos(cari.value.trim());
      var pertama = null;
      pin.forEach(function (p) { p.cocok = kataCari.length > 1 && p.kata.indexOf(kataCari) >= 0; if (p.cocok && !pertama) pertama = p; });
      if (pertama) pilih(pertama.L.i); else { isiPanel(); if (adegan) { perbaruiPin(); adegan.gambar(); } }
    });
  }

  // ------------------------------------------------------------ adegan 3D
  function tinggiTotal() { return lapisan.reduce(function (s, L) { return s + L.tebal; }, 0) + (lapisan.length - 1) * urai * RENGGANG; }
  function aturPosisi() {
    var y = tinggiTotal();
    lapisan.forEach(function (L) {
      y -= L.tebal;
      L.y = y;
      if (L.mesh) {
        L.mesh.position.set(L.keluar * (LEBAR * 0.5), y + (L.tebal - CELAH) / 2, L.keluar * 6);
        L.pinKelompok.position.set(L.mesh.position.x, y + L.tebal - CELAH, L.mesh.position.z);
      }
      y -= urai * RENGGANG;
    });
  }
  function perbaruiPin() {
    lapisan.forEach(function (L) {
      var tampil = L.i === 0 || L.i === dipilih || urai > 0.5 || uraiSasaran > 0.5 || L.pin.some(function (p) { return p.cocok; });
      L.pinKelompok.visible = tampil;
      L.pin.forEach(function (p) {
        var aktif = p === terpilihPin || p.cocok || p === hoverPin;
        p.kepala.material.emissive.setRGB(aktif ? 0.12 : 0, aktif ? 0.32 : 0, aktif ? 0.3 : 0);
        p.kepala.scale.setScalar(aktif ? 1.35 : 1);
        p.label.hidden = !(tampil && (L.i === dipilih || aktif));
        p.label.classList.toggle('aktif', aktif);
      });
      var sorot = L === hoverLapis;
      L.mesh.material.emissive.setRGB(sorot ? 0.06 : 0, sorot ? 0.1 : 0, sorot ? 0.1 : 0);
    });
  }

  function pasang3D() {
    if (!window.Adegan3D || !window.THREE) return false;
    adegan = window.Adegan3D.buat(panggung, {
      kamera: [128, 112, 172], sasaran: [14, 42, 0], ukuran: 70, zoom: false, polarMin: 0.55, polarMaks: 1.3, lajuPutar: 0.5,
      padaTema: function () {
        if (!kelompok) return;
        lapisan.forEach(function (L) {
          L.mesh.material.color.copy(adegan.warnaThree(warnaLapisan(L)));
          L.pin.forEach(function (p) { p.kepala.material.color.copy(L.mesh.material.color); });
        });
        warnaiTombol(); isiPanel();
      }
    });
    if (!adegan) return false;
    THREE = adegan.THREE;
    akar.classList.add('ada-3d');
    kelompok = new THREE.Group();
    adegan.scene.add(kelompok);
    var tiang = new THREE.CylinderGeometry(0.35, 0.35, 6, 10), bola = new THREE.SphereGeometry(1.7, 24, 16), cincin = new THREE.TorusGeometry(2.4, 0.35, 10, 32);
    lapisan.forEach(function (L) {
      var bahan = adegan.bahan('tanah', warnaLapisan(L), { tekstur: TEKSTUR[L.i % TEKSTUR.length] });
      bahan.map = bahan.map.clone(); bahan.map.needsUpdate = true; bahan.map.repeat.set(2.2, Math.max(0.35, L.tebal / 22));
      bahan.emissive = new THREE.Color(0, 0, 0);
      var m = new THREE.Mesh(new THREE.BoxGeometry(LEBAR, L.tebal - CELAH, DALAM), bahan);
      m.castShadow = true; m.receiveShadow = true; m.userData.L = L;
      L.mesh = m; kelompok.add(m);
      // tepi tipis supaya bentuk lempeng tegas dari sudut mana pun
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })));
      L.pinKelompok = new THREE.Group(); kelompok.add(L.pinKelompok);
      L.pin.forEach(function (p) {
        var g = new THREE.Group(); g.position.set(p.x, 0, p.z);
        var t = new THREE.Mesh(tiang, adegan.bahan('logam', [150, 156, 160])); t.position.y = 3; t.castShadow = true; g.add(t);
        var k = new THREE.Mesh(bola, adegan.bahan('plastik', warnaLapisan(L), { roughness: 0.3, metalness: 0.1, emissive: new THREE.Color(0, 0, 0) }));
        k.position.y = 7.4; k.castShadow = true; k.userData.p = p; g.add(k);
        if (p.baru) {
          var c = new THREE.Mesh(cincin, adegan.bahan('plastik', adegan.warna.laterit || [163, 64, 31], { roughness: 0.4 }));
          c.rotation.x = Math.PI / 2; c.position.y = 0.4; g.add(c);
        }
        p.kepala = k;
        p.label = el('button', 'b3-label', p.judul); p.label.type = 'button'; p.label.hidden = true; p.label.tabIndex = -1;
        p.label.addEventListener('click', function () { bukaKartu(p); });
        panggung.appendChild(p.label);
        L.pinKelompok.add(g);
      });
      var lb = el('span', 'b3-label-lapis', L.no); lb.setAttribute('aria-hidden', 'true'); panggung.appendChild(lb); labelLapis.push(lb);
    });
    aturPosisi(); perbaruiPin();

    // animasi laci dan renggang; label HTML mengikuti proyeksi titik 3D
    var v = new THREE.Vector3();
    function gerakLaci(dt) {
      var cepat = adegan.hemat ? 1 : 1 - Math.exp(-dt * 7);
      urai += (uraiSasaran - urai) * cepat;
      lapisan.forEach(function (L) { var s = L.i === dipilih ? 1 : 0; L.keluar += (s - L.keluar) * cepat; });
      aturPosisi();
      var w = panggung.clientWidth, h = panggung.clientHeight, kotak = [];
      lapisan.forEach(function (L) {
        L.pin.forEach(function (p) {
          if (p.label.hidden) return;
          p.kepala.getWorldPosition(v); v.y += 2.6; v.project(adegan.camera);
          kotak.push({ el: p.label, x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, lb: p.label.offsetWidth, tg: p.label.offsetHeight });
        });
      });
      // label yang bertabrakan didorong ke atas satu per satu (dari yang paling bawah di layar)
      kotak.sort(function (a, b) { return b.y - a.y; });
      kotak.forEach(function (k, i) {
        for (var j = 0; j < i; j++) {
          var o = kotak[j];
          if (Math.abs(k.x - o.x) < (k.lb + o.lb) / 2 + 4 && k.y > o.y - o.tg - 3 && k.y - k.tg < o.y) { k.y = o.y - o.tg - 3; j = -1; }
        }
        var x = Math.min(Math.max(k.x, k.lb / 2 + 4), w - k.lb / 2 - 4), y = Math.max(k.y, k.tg + 4);
        k.el.style.transform = 'translate(-50%, -100%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      lapisan.forEach(function (L, n) {
        // nomor lapisan di sudut depan kiri lempeng (sudut yang paling dekat ke kamera di sisi kiri layar)
        v.set(L.mesh.position.x - LEBAR / 2, L.mesh.position.y, L.mesh.position.z + DALAM / 2).project(adegan.camera);
        labelLapis[n].style.transform = 'translate(-115%, -50%) translate(' + ((v.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - v.y) / 2 * h).toFixed(1) + 'px)';
      });
    }
    gerakLaci.aktif = function () {
      return Math.abs(urai - uraiSasaran) > 0.002 || lapisan.some(function (L) { return Math.abs(L.keluar - (L.i === dipilih ? 1 : 0)) > 0.002; });
    };
    adegan.padaBingkai.push(gerakLaci);

    // klik dan sorot: raycaster pada kepala pin lalu lempeng
    var ray = new THREE.Raycaster(), titik = new THREE.Vector2(), turun = null, kanvas = adegan.renderer.domElement;
    function kena(e) {
      var r = kanvas.getBoundingClientRect();
      titik.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(titik, adegan.camera);
      var kepala = [];
      lapisan.forEach(function (L) { if (L.pinKelompok.visible) L.pin.forEach(function (p) { kepala.push(p.kepala); }); });
      var h = ray.intersectObjects(kepala, false);
      if (h.length) return { p: h[0].object.userData.p };
      h = ray.intersectObjects(lapisan.map(function (L) { return L.mesh; }), false);
      return h.length ? { L: h[0].object.userData.L } : null;
    }
    kanvas.addEventListener('pointerdown', function (e) { turun = { x: e.clientX, y: e.clientY }; });
    kanvas.addEventListener('pointerup', function (e) {
      if (!turun || Math.hypot(e.clientX - turun.x, e.clientY - turun.y) > 6) { turun = null; return; }
      turun = null;
      var k = kena(e);
      if (k && k.p) bukaKartu(k.p);
      else if (k && k.L) pilih(k.L.i === dipilih ? -1 : k.L.i);
    });
    var tunda = false;
    kanvas.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || tunda || turun) return;
      tunda = true;
      requestAnimationFrame(function () {
        tunda = false;
        var k = kena(e), hp = (k && k.p) || null, hl = (k && k.L) || null;
        kanvas.style.cursor = k ? 'pointer' : '';
        if (hp !== hoverPin || hl !== hoverLapis) { hoverPin = hp; hoverLapis = hl; perbaruiPin(); adegan.gambar(); }
      });
    });
    kanvas.addEventListener('pointerleave', function () { if (hoverPin || hoverLapis) { hoverPin = hoverLapis = null; perbaruiPin(); adegan.gambar(); } });
    adegan.gambar();
    return true;
  }

  Array.prototype.forEach.call(akar.querySelectorAll('[data-aksi]'), function (b) {
    var a = b.getAttribute('data-aksi');
    if (a === 'putar') b.setAttribute('aria-pressed', window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'false' : 'true');
    b.addEventListener('click', function () {
      if (!adegan) return;
      if (a === 'urai') {
        uraiSasaran = uraiSasaran ? 0 : 1; b.setAttribute('aria-pressed', uraiSasaran ? 'true' : 'false');
        adegan.terbangKe(uraiSasaran ? [185, 160, 245] : [128, 112, 172], uraiSasaran ? [14, 66, 0] : [14, 42, 0]);
        perbaruiPin();
      }
      if (a === 'putar') { var nyala = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', nyala ? 'true' : 'false'); adegan.putarOtomatis(nyala); }
      adegan.gambar();
    });
  });

  warnaiTombol();
  if (!pasang3D()) akar.classList.add('tanpa-3d');
  pilih(0);
})();
