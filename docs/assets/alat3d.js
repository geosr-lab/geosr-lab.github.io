/*
 * Adegan 3D alat praktikum (three.js lewat adegan3d.js). Hanya tampilan: tidak menyentuh hitungan.
 * Dipasang di tab Pengantar halaman alat praktikum yang punya adegan (lihat ADEGAN di bawah), di atas sketsa 2D.
 * Sketsa 2D tetap ada (tombol "Sketsa 2D") dan tetap dipakai saat cetak atau bila WebGL tidak tersedia.
 *
 * Urutan kerja mengikuti "Alat dan langkah praktikum" di konten/praktikum.json:
 *   pemadatan: tanah dimasukkan ke mould dalam 3 lapis, tiap lapis ditumbuk 25 kali sesuai pola, lalu leher dilepas
 *              dan permukaan diratakan. Mould dan leher digambar terpotong supaya lapisan di dalamnya terlihat.
 *   sondir:    mesin sondir diapit dua angker dan besi kanal; engkol diputar, konus ditekan, manometer dibaca setiap
 *              20 cm. Tanah digambar terpotong di bidang batang sondir; garis di bidang potong hanya ilustrasi, bukan data.
 * Satuan adegan: Proctor 1 = 1 cm; sondir 1 = 5 cm.
 */
(function (root) {
  'use strict';
  var PI = Math.PI;

  function teksturLayar(teks, opsi) {
    opsi = opsi || {};
    var c = document.createElement('canvas'); c.width = 256; c.height = 96;
    var g = c.getContext('2d');
    g.fillStyle = opsi.latar || '#1d2a24'; g.fillRect(0, 0, 256, 96);
    g.fillStyle = opsi.warna || '#8ff0c4'; g.font = '700 46px "Courier New", monospace'; g.textAlign = 'right'; g.textBaseline = 'middle';
    g.fillText(teks, 238, 50);
    var t = new root.THREE.CanvasTexture(c); t.encoding = root.THREE.sRGBEncoding;
    return t;
  }
  function teksturDial() {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#f6f4ee'; g.beginPath(); g.arc(128, 128, 124, 0, PI * 2); g.fill();
    g.strokeStyle = '#2a2f33'; g.lineWidth = 6; g.stroke();
    for (var i = 0; i <= 40; i++) {
      var a = PI * 0.75 + i / 40 * PI * 1.5, r1 = i % 5 ? 96 : 84;
      g.lineWidth = i % 5 ? 2 : 4;
      g.beginPath(); g.moveTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1); g.lineTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108); g.stroke();
    }
    g.fillStyle = '#2a2f33'; g.font = '700 22px sans-serif'; g.textAlign = 'center'; g.fillText('kg/cm²', 128, 190);
    var t = new root.THREE.CanvasTexture(c); t.encoding = root.THREE.sRGBEncoding;
    return t;
  }
  // cincin berongga (dinding mould) dengan potongan supaya isi terlihat
  function dinding(THREE, rDalam, rLuar, tinggi, bahan, potong) {
    var titik = [[rDalam, 0], [rLuar, 0], [rLuar, tinggi], [rDalam, tinggi], [rDalam, 0]].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    var geo = new THREE.LatheGeometry(titik, 64, potong || 0, PI * 2 - (potong ? 1.25 : 0));
    var m = new THREE.Mesh(geo, bahan);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function kotak(THREE, w, h, d, bahan) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bahan); m.castShadow = true; m.receiveShadow = true; return m; }
  function silinder(THREE, r1, r2, h, bahan, seg) { var m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 40), bahan); m.castShadow = true; m.receiveShadow = true; return m; }

  // ---------------------------------------------------------------- Proctor (pemadatan)
  function proctor(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var baja = A.bahan('logam', [118, 126, 132]), bajaGelap = A.bahan('logam', [70, 76, 80]), kuningan = A.bahan('logam', [176, 150, 92]);
    var tanah = A.bahan('tanah', [150, 118, 82], { tekstur: 'tanah' }), tanahLepas = A.bahan('tanah', [168, 134, 96], { tekstur: 'pasir' });
    var alas = kotak(THREE, 30, 2.4, 30, bajaGelap); alas.position.y = 1.2; s.add(alas);
    var pelat = silinder(THREE, 7.4, 7.4, 1.2, baja); pelat.position.y = 3; s.add(pelat);
    var mould = dinding(THREE, 5.08, 5.8, 11.64, baja, 0.6); mould.position.y = 3.6; s.add(mould);
    var leher = dinding(THREE, 5.08, 5.7, 6, A.bahan('logam', [150, 158, 164]), 0.6); leher.position.y = 15.24; s.add(leher);
    // tiga lapis tanah di dalam mould; tinggi awal lepas lalu memadat setiap tumbukan
    var lapis = [0, 1, 2].map(function (k) {
      var m = silinder(THREE, 5.06, 5.06, 1, k % 2 ? tanahLepas : tanah, 48);
      m.visible = false; s.add(m); return m;
    });
    var PADAT = 11.64 / 3 + 0.25, LEPAS = PADAT * 1.45;
    // pemandu dan penumbuk
    var penumbuk = new THREE.Group(); s.add(penumbuk);
    var pemandu = silinder(THREE, 2.9, 2.9, 30, A.bahan('kaca', [200, 214, 222]), 32); pemandu.castShadow = false; pemandu.position.y = 15; penumbuk.add(pemandu);
    var tutup = silinder(THREE, 3.1, 3.1, 1, bajaGelap); tutup.position.y = 30.5; penumbuk.add(tutup);
    var palu = new THREE.Group(); penumbuk.add(palu);
    var kepalaPalu = silinder(THREE, 2.54, 2.54, 6.5, bajaGelap); kepalaPalu.position.y = 3.25; palu.add(kepalaPalu);
    var tangkai = silinder(THREE, 0.55, 0.55, 30, baja, 16); tangkai.position.y = 20; palu.add(tangkai);
    var gagang = silinder(THREE, 1.2, 1.2, 6, A.bahan('plastik', [40, 44, 48], { roughness: 0.7 }), 20); gagang.position.y = 36; palu.add(gagang);
    // perlengkapan: wadah tanah, timbangan, cawan, pisau perata
    var wadah = new THREE.Mesh(new THREE.LatheGeometry([[0.01, 0], [8, 0], [10, 3.2], [10.4, 3.4]].map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 48), A.bahan('logam', [184, 190, 194], { side: THREE.DoubleSide }));
    wadah.position.set(-22, 0, 14); wadah.castShadow = true; wadah.receiveShadow = true; s.add(wadah);
    var gundukan = new THREE.Mesh(new THREE.SphereGeometry(8, 32, 12, 0, PI * 2, 0, PI / 2), tanahLepas); gundukan.scale.y = 0.3; gundukan.position.set(-22, 1, 14); gundukan.castShadow = true; s.add(gundukan);
    var timbangan = kotak(THREE, 16, 3, 13, A.bahan('plastik', [214, 218, 220])); timbangan.position.set(24, 1.5, 12); s.add(timbangan);
    var piring = silinder(THREE, 5.5, 5.5, 0.6, baja); piring.position.set(24, 3.3, 11); s.add(piring);
    var layar = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.2), new THREE.MeshBasicMaterial({ map: teksturLayar('0,000 g') }));
    layar.rotation.x = -PI / 2 + 0.5; layar.position.set(24, 3.2, 17.8); s.add(layar);
    [[20, -16], [26, -14]].forEach(function (p) { var c = silinder(THREE, 2.4, 2, 1.6, A.bahan('logam', [200, 204, 206])); c.position.set(p[0], 0.8, p[1]); s.add(c); });
    var pisau = kotak(THREE, 18, 0.3, 2.4, baja); pisau.position.set(-20, 0.2, -14); pisau.rotation.y = 0.4; s.add(pisau);

    // urutan: lapis k, tumbukan b (0..25), lalu leher dilepas dan permukaan diratakan, lalu ulang
    var keadaan = { k: 0, b: 0, fase: 'isi', t: 0, jeda: false };
    var POLA = 8;   // posisi tumbukan berpindah melingkar sesuai pola
    function atur(k, b) {
      lapis.forEach(function (m, i) {
        var h = i < k ? PADAT : i === k ? LEPAS - (LEPAS - PADAT) * Math.min(1, b / 25) : 0;
        m.visible = h > 0; m.scale.y = Math.max(0.001, h);
        var y0 = 3.6; for (var j = 0; j < i; j++) y0 += PADAT;
        m.position.y = y0 + h / 2;
      });
    }
    function puncakTanah() { var y = 3.6; lapis.forEach(function (m) { if (m.visible) y = Math.max(y, m.position.y + m.scale.y / 2); }); return y; }
    function tulisHud() {
      hud.textContent = keadaan.fase === 'rata' ? 'Leher dilepas, permukaan diratakan dengan pisau perata.' :
        'Lapis ' + (keadaan.k + 1) + ' dari 3, tumbukan ' + keadaan.b + ' dari 25';
    }
    function akhir() {   // keadaan akhir (gerak dikurangi): tiga lapis padat, leher sudah dilepas
      atur(3, 25); leher.position.y = 15.24; leher.visible = false;
      penumbuk.position.set(0, puncakTanah(), 0); palu.position.y = 0;
      keadaan.fase = 'rata'; tulisHud();
    }
    function mulai() { keadaan.k = 0; keadaan.b = 0; keadaan.fase = 'isi'; keadaan.t = 0; leher.visible = true; leher.position.y = 15.24; atur(0, 0); tulisHud(); }
    function langkah(dt) {
      if (keadaan.jeda) return;
      keadaan.t += dt;
      if (keadaan.fase === 'isi') {
        // tanah lepas dimasukkan (lapis tumbuh) lalu penumbuk dipasang
        var p = Math.min(1, keadaan.t / 0.8);
        atur(keadaan.k, 0); lapis[keadaan.k].scale.y = Math.max(0.001, LEPAS * p);
        penumbuk.position.set(0, puncakTanah() + 40 * (1 - p), 0);
        if (p >= 1) { keadaan.fase = 'tumbuk'; keadaan.t = 0; }
      } else if (keadaan.fase === 'tumbuk') {
        var siklus = 0.42, u = keadaan.t / siklus;
        var sudut = (keadaan.b % POLA) / POLA * PI * 2, r = keadaan.b % 3 === 2 ? 0 : 2.4;
        penumbuk.position.set(Math.cos(sudut) * r, puncakTanah(), Math.sin(sudut) * r);
        // palu diangkat (pelan) lalu jatuh bebas (makin cepat)
        palu.position.y = u < 0.55 ? 22.8 * (u / 0.55) : 22.8 * (1 - Math.pow((u - 0.55) / 0.45, 2));
        if (u >= 1) {
          keadaan.t = 0; keadaan.b++; atur(keadaan.k, keadaan.b); tulisHud();
          if (keadaan.b >= 25) { keadaan.k++; keadaan.b = 0; if (keadaan.k >= 3) { keadaan.k = 2; keadaan.b = 25; keadaan.fase = 'rata'; } else keadaan.fase = 'isi'; keadaan.t = 0; tulisHud(); }
        }
      } else if (keadaan.fase === 'rata') {
        var q = Math.min(1, keadaan.t / 1.6);
        penumbuk.position.y = puncakTanah() + 50 * q;
        leher.position.y = 15.24 + 18 * Math.max(0, q - 0.3);
        pisau.position.set(-20 + 20 * Math.max(0, q - 0.5), 0.2 + 15.4 * Math.min(1, q * 3), -14 + 14 * Math.max(0, q - 0.5));
        if (keadaan.t > 4) { pisau.position.set(-20, 0.2, -14); mulai(); }
      }
    }
    langkah.aktif = function () { return !A.hemat && !keadaan.jeda; };
    return {
      mulai: function () { if (A.hemat) akhir(); else mulai(); },
      langkah: langkah, keadaan: keadaan, akhir: akhir,
      kamera: { pos: [52, 46, 70], tgt: [0, 12, 0] }
    };
  }

  // ---------------------------------------------------------------- Sondir (CPT)
  function sondir(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var baja = A.bahan('logam', [112, 120, 126]), bajaGelap = A.bahan('logam', [58, 64, 68]), cat = A.bahan('plastik', [196, 92, 52], { roughness: 0.45 });
    // tanah dipotong berbentuk L: seperempat depan-kanan (x > 0, z > 0) dibuang supaya batang dan konus di sudut potongan terlihat
    var LAPIS = [[0, 14, [166, 142, 104], 'tanah', 0.35], [14, 30, [120, 132, 122], 'lempung', 0.2], [30, 52, [196, 168, 108], 'pasir', 0.85]];
    function potongL(y0, y1, warnaL, tekstur) {
      var bhn = A.bahan('tanah', warnaL, { tekstur: tekstur }), h = y1 - y0;
      var belakang = kotak(THREE, 90, h, 40, bhn); belakang.position.set(0, -(y0 + y1) / 2, -20); s.add(belakang);
      var kiri = kotak(THREE, 45, h, 40, bhn); kiri.position.set(-22.5, -(y0 + y1) / 2, 20); s.add(kiri);
    }
    LAPIS.forEach(function (l) { potongL(l[0], l[1], l[2], l[3]); });
    potongL(-0.6, 0, [124, 146, 92], 'tanah');
    // angker kiri-kanan, besi kanal panjang dan pendek
    [-18, 18].forEach(function (x) {
      var a = silinder(THREE, 0.5, 0.5, 26, baja, 12); a.position.set(x, -12, 0); s.add(a);
      var daun = silinder(THREE, 2.4, 2.4, 0.4, baja, 24); daun.position.set(x, -24, 0); s.add(daun);
      var kepala = kotak(THREE, 3, 2, 3, bajaGelap); kepala.position.set(x, 1.6, 0); s.add(kepala);
    });
    [-3.5, 3.5].forEach(function (z) { var k = kotak(THREE, 44, 2, 1.6, bajaGelap); k.position.set(0, 3.2, z); s.add(k); });
    [-12, 12].forEach(function (x) { var k = kotak(THREE, 2, 1.6, 12, bajaGelap); k.position.set(x, 4.9, 0); s.add(k); });
    // rangka mesin: dua tiang, palang atas, badan hidrolik, manometer, engkol
    var mesin = new THREE.Group(); s.add(mesin);
    [-7, 7].forEach(function (x) { var t = kotak(THREE, 1.8, 30, 1.8, cat); t.position.set(x, 20, 0); mesin.add(t); });
    var palang = kotak(THREE, 18, 2.4, 3, cat); palang.position.set(0, 35.5, 0); mesin.add(palang);
    var dasarMesin = kotak(THREE, 18, 1.6, 8, cat); dasarMesin.position.set(0, 5.5, 0); mesin.add(dasarMesin);
    var badan = new THREE.Group(); mesin.add(badan);
    var silinderHidrolik = silinder(THREE, 2.6, 2.6, 7, baja); silinderHidrolik.position.y = 0; badan.add(silinderHidrolik);
    var dialBahan = new THREE.MeshStandardMaterial({ map: teksturDial(), roughness: 0.4, metalness: 0 });
    var jarum = [];
    [-1, 1].forEach(function (sisi, i) {
      var g = new THREE.Group(); g.position.set(sisi * 6.2, 1.5, 2.2); badan.add(g);
      var rumah = silinder(THREE, 2.6, 2.6, 1.2, bajaGelap); rumah.rotation.x = PI / 2; g.add(rumah);
      var muka = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), dialBahan); muka.position.z = 0.62; g.add(muka);
      var kaca = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), A.bahan('kaca', [220, 230, 236], { opacity: 0.18 })); kaca.position.z = 0.7; g.add(kaca);
      var j = kotak(THREE, 0.16, 1.9, 0.08, A.bahan('plastik', i ? [30, 30, 30] : [190, 40, 30])); j.geometry.translate(0, 0.85, 0); j.position.z = 0.66; j.castShadow = false; g.add(j);
      jarum.push(j);
      var pipa = silinder(THREE, 0.25, 0.25, 4, baja, 8); pipa.rotation.z = PI / 2; pipa.position.set(-sisi * 2.4, -1.4, -2.2); g.add(pipa);
    });
    var engkol = new THREE.Group(); engkol.position.set(9.5, 0, 0); badan.add(engkol);
    var poros = silinder(THREE, 0.45, 0.45, 4, baja, 12); poros.rotation.z = PI / 2; engkol.add(poros);
    var lengan = kotak(THREE, 0.6, 6, 0.6, baja); lengan.position.set(2, 3, 0); engkol.add(lengan);
    var pegangan = silinder(THREE, 0.5, 0.5, 2.6, A.bahan('plastik', [40, 44, 48], { roughness: 0.7 }), 12); pegangan.rotation.z = PI / 2; pegangan.position.set(3.2, 6, 0); engkol.add(pegangan);
    // batang sondir dan bikonus (ujung konus dan selimut geser)
    var batang = silinder(THREE, 0.9, 0.9, 1, baja, 20); s.add(batang);
    var selimut = silinder(THREE, 1.15, 1.15, 3, A.bahan('logam', [150, 158, 164]), 24); s.add(selimut);
    var konus = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.2, 32), A.bahan('logam', [150, 158, 164])); konus.rotation.x = PI; konus.castShadow = true; s.add(konus);
    // tanda kedalaman dan garis ilustrasi tahanan di bidang potong
    var tandaBahan = new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.6 });
    var jejak = [], garisJejak = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xb5532e }));
    s.add(garisJejak);
    for (var d = 0; d <= 50; d += 4) {
      var g2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(1.4, -d, 0.12), new THREE.Vector3(3, -d, 0.12)]);
      s.add(new THREE.Line(g2, tandaBahan));
    }

    var TINGGI_BADAN_ATAS = 31, LANGKAH = 4;   // 4 satuan = 20 cm
    var keadaan = { dalam: 0, sasaran: LANGKAH, t: 0, fase: 'tekan', jeda: false };
    function kekuatan(d) {   // tahanan relatif per lapis (ilustrasi): lapisan atas sedang, lempung lunak, pasir padat
      for (var i = 0; i < LAPIS.length; i++) if (d < LAPIS[i][1]) return LAPIS[i][4] + 0.06 * Math.sin(d * 1.7);
      return 0.85;
    }
    function atur() {
      var d = keadaan.dalam, ujung = -d - 2.2;
      konus.position.set(0, ujung + 1.1, 0);
      selimut.position.set(0, ujung + 2.2 + 1.5, 0);
      var atas = TINGGI_BADAN_ATAS - d * 0.12, panjang = atas - (ujung + 3.7);
      batang.scale.y = panjang; batang.position.set(0, (atas + ujung + 3.7) / 2, 0);
      badan.position.y = atas + 1;
    }
    function tulisHud() { hud.textContent = 'Kedalaman ' + (keadaan.dalam / LANGKAH * 0.2).toFixed(2).replace('.', ',') + ' m, konus ditekan dan manometer dibaca setiap 20 cm'; }
    function mulai() { keadaan.dalam = 0; keadaan.sasaran = LANGKAH; keadaan.t = 0; keadaan.fase = 'tekan'; jejak = [new THREE.Vector3(4, 0, 0.15)]; garisJejak.geometry.setFromPoints(jejak); atur(); tulisHud(); }
    function akhir() {
      keadaan.dalam = 44; jejak = [];
      for (var d2 = 0; d2 <= 44; d2 += LANGKAH) jejak.push(new THREE.Vector3(4 + 16 * kekuatan(d2), -d2, 0.15));
      garisJejak.geometry.setFromPoints(jejak); atur();
      jarum.forEach(function (j, i) { j.rotation.z = 2.2 - 4.4 * kekuatan(44) * (i ? 0.8 : 1); });
      tulisHud();
    }
    function langkah(dt) {
      if (keadaan.jeda) return;
      keadaan.t += dt;
      if (keadaan.fase === 'tekan') {
        engkol.rotation.x -= dt * 7;
        keadaan.dalam = Math.min(keadaan.sasaran, keadaan.dalam + dt * 5);
        var k = kekuatan(keadaan.dalam);
        jarum.forEach(function (j, i) { j.rotation.z += ((2.2 - 4.4 * k * (i ? 0.8 : 1)) - j.rotation.z) * Math.min(1, dt * 6); });
        if (keadaan.dalam >= keadaan.sasaran) {
          keadaan.fase = 'baca'; keadaan.t = 0;
          jejak.push(new THREE.Vector3(4 + 16 * k, -keadaan.dalam, 0.15)); garisJejak.geometry.setFromPoints(jejak);
          tulisHud();
        }
      } else if (keadaan.fase === 'baca') {
        if (keadaan.t > 0.7) {
          if (keadaan.sasaran >= 44) { keadaan.fase = 'selesai'; keadaan.t = 0; }
          else { keadaan.sasaran += LANGKAH; keadaan.fase = 'tekan'; keadaan.t = 0; }
        }
      } else if (keadaan.fase === 'selesai' && keadaan.t > 3) mulai();
      atur();
    }
    langkah.aktif = function () { return !A.hemat && !keadaan.jeda; };
    return {
      mulai: function () { if (A.hemat) akhir(); else mulai(); },
      langkah: langkah, keadaan: keadaan, akhir: akhir,
      kamera: { pos: [70, 40, 92], tgt: [0, 2, -4] }, lantai: -52.5
    };
  }

  var ADEGAN = { pemadatan: { buat: proctor, ukuran: 40, lantai: 0, kamera: [66, 58, 92], sasaran: [0, 17, 0], judul: 'Model 3D mould Proctor, penumbuk, timbangan, dan wadah tanah' },
                 sondir: { buat: sondir, ukuran: 60, lantai: -52.5, kamera: [118, 58, 150], sasaran: [0, -10, 0], judul: 'Model 3D mesin sondir dengan angker, manometer, dan konus di dalam tanah' } };

  function pasang(fig) {
    var id = fig.getAttribute('data-sketsa'), def = ADEGAN[id];
    if (!def || !root.Adegan3D || fig.previousElementSibling && fig.previousElementSibling.classList.contains('alat3d')) return;
    var wadah = document.createElement('figure');
    wadah.className = 'alat3d';
    wadah.innerHTML = '<div class="alat3d-panggung"><p class="alat3d-hud" aria-hidden="true"></p></div>' +
      '<figcaption><span></span><span class="alat3d-tombol">' +
      '<button type="button" class="tombol kecil" data-aksi="jeda" aria-pressed="false">Jeda</button>' +
      '<button type="button" class="tombol kecil" data-aksi="ulang">Putar ulang</button>' +
      '<button type="button" class="tombol kecil" data-aksi="awal">Tampak awal</button>' +
      '<button type="button" class="tombol kecil" data-aksi="sketsa" aria-pressed="false">Sketsa 2D</button></span></figcaption>';
    fig.parentNode.insertBefore(wadah, fig);
    var panggung = wadah.querySelector('.alat3d-panggung'), hud = wadah.querySelector('.alat3d-hud');
    wadah.querySelector('figcaption span').textContent = def.judul + '. Seret untuk memutar, gulir di dalam model untuk memperbesar.';
    var A = root.Adegan3D.buat(panggung, { kamera: def.kamera, sasaran: def.sasaran, ukuran: def.ukuran, lantai: def.lantai, jarakMin: def.ukuran * 0.6, jarakMaks: def.ukuran * 4, putar: false });
    if (!A) { wadah.remove(); return; }
    panggung.setAttribute('role', 'img'); panggung.setAttribute('aria-label', def.judul);
    var model = def.buat(A, hud);
    A.padaBingkai.push(model.langkah);
    model.mulai(); A.gambar();
    fig.hidden = true;
    fig.classList.add('sketsa-cadangan');
    wadah.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-aksi]');
      if (!b) return;
      var a = b.getAttribute('data-aksi');
      if (a === 'jeda') { model.keadaan.jeda = !model.keadaan.jeda; b.setAttribute('aria-pressed', model.keadaan.jeda ? 'true' : 'false'); b.textContent = model.keadaan.jeda ? 'Lanjut' : 'Jeda'; }
      if (a === 'ulang') { model.keadaan.jeda = false; var j = wadah.querySelector('[data-aksi="jeda"]'); j.setAttribute('aria-pressed', 'false'); j.textContent = 'Jeda'; if (A.hemat) model.akhir(); else model.mulai(); }
      if (a === 'awal') A.keRumah();
      if (a === 'sketsa') { var tampil = fig.hidden; fig.hidden = !tampil; b.setAttribute('aria-pressed', tampil ? 'true' : 'false'); if (tampil && root.Sketsa) root.Sketsa.putar && root.Sketsa.putar(fig); }
      A.gambar();
    });
  }

  function cari() {
    Array.prototype.forEach.call(document.querySelectorAll('figure.sketsa[data-sketsa]:not(.sketsa-mini)'), pasang);
  }
  // kerangka.js membuat tab Pengantar setelah halaman siap; tunggu sketsanya muncul
  function tunggu() {
    cari();
    var n = 0, t = setInterval(function () { cari(); if (++n > 20 || document.querySelector('.alat3d')) clearInterval(t); }, 150);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tunggu); else tunggu();
  root.Alat3D = { ADEGAN: ADEGAN };
})(this);
