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

  // ---------------------------------------------------------------- bagian bersama untuk alat dengan rangka beban
  // arloji ukur: rumah logam, muka berskala, jarum; kembalikan { g, jarum }
  function arloji(A, r) {
    var THREE = A.THREE, g = new THREE.Group();
    var rumah = silinder(THREE, r, r, r * 0.5, A.bahan('logam', [70, 76, 80])); rumah.rotation.x = PI / 2; g.add(rumah);
    var muka = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 40), new THREE.MeshStandardMaterial({ map: teksturDial(), roughness: 0.4 }));
    muka.position.z = r * 0.26; g.add(muka);
    var j = kotak(THREE, r * 0.07, r * 0.8, r * 0.03, A.bahan('plastik', [190, 40, 30])); j.geometry.translate(0, r * 0.36, 0); j.position.z = r * 0.29; j.castShadow = false; g.add(j);
    return { g: g, jarum: j };
  }
  // rangka beban: alas, dua tiang, palang atas; kembalikan grup
  function rangka(A, lebar, tinggi, warna) {
    var THREE = A.THREE, g = new THREE.Group(), cat = A.bahan('plastik', warna || [64, 104, 120], { roughness: 0.45 }), baja = A.bahan('logam', [150, 156, 160]);
    var alas = kotak(THREE, lebar + 8, 4, 26, cat); alas.position.y = 2; g.add(alas);
    [-lebar / 2, lebar / 2].forEach(function (x) { var t = silinder(THREE, 1.4, 1.4, tinggi, baja, 20); t.position.set(x, 4 + tinggi / 2, 0); g.add(t); });
    var palang = kotak(THREE, lebar + 6, 5, 10, cat); palang.position.y = 4 + tinggi - 2.5; g.add(palang);
    return g;
  }
  // cincin uji (proving ring) dengan arloji di dalamnya
  function cincinUji(A, r) {
    var THREE = A.THREE, g = new THREE.Group();
    var c = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.12, 16, 48), A.bahan('logam', [160, 166, 170])); c.castShadow = true; g.add(c);
    var a = arloji(A, r * 0.42); a.g.position.z = r * 0.05; g.add(a.g);
    return { g: g, jarum: a.jarum };
  }

  // ---------------------------------------------------------------- CBR laboratorium (1 = 1 cm)
  function cbr(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var r = rangka(A, 36, 70, [64, 104, 120]); s.add(r);
    var baja = A.bahan('logam', [120, 128, 134]), bajaGelap = A.bahan('logam', [70, 76, 80]);
    var keping = silinder(THREE, 10, 10, 1.2, bajaGelap); keping.position.y = 4.6; s.add(keping);
    var mould = dinding(THREE, 7.6, 8.4, 17.8, baja, 0.6); mould.position.y = 5.2; s.add(mould);
    var tanah = silinder(THREE, 7.58, 7.58, 17.2, A.bahan('tanah', [150, 118, 82], { tekstur: 'tanah' }), 48); tanah.position.y = 5.2 + 8.6; s.add(tanah);
    [0, 1].forEach(function (k) { var b = dinding(THREE, 2.7, 7.2, 1.2, A.bahan('logam', [176, 150, 92])); b.position.y = 22.4 + k * 1.3; s.add(b); });   // keping beban
    var ci = cincinUji(A, 7); ci.g.position.set(0, 58, 0); s.add(ci.g);
    var torak = silinder(THREE, 2.48, 2.48, 26, baja, 24); s.add(torak);
    var batangAtas = silinder(THREE, 1.4, 1.4, 6, baja, 16); batangAtas.position.y = 68; s.add(batangAtas);
    var arPen = arloji(A, 3.2); arPen.g.position.set(9, 34, 2); s.add(arPen.g);
    var lengan = kotak(THREE, 9, 0.8, 0.8, baja); lengan.position.set(4.5, 34, 0); s.add(lengan);
    var engkol = new THREE.Group(); engkol.position.set(24, 10, 8); s.add(engkol);
    var ro = silinder(THREE, 4, 4, 1, bajaGelap, 32); ro.rotation.x = PI / 2; engkol.add(ro);
    var pg = silinder(THREE, 0.6, 0.6, 5, A.bahan('plastik', [40, 44, 48]), 12); pg.rotation.x = PI / 2; pg.position.set(3, 0, 2.5); engkol.add(pg);
    var k = { t: 0, jeda: false, pen: 0 };
    function atur() {
      var y0 = 22.4 - k.pen;          // ujung torak menekan permukaan tanah; penetrasi digambar 4× supaya terlihat
      torak.position.y = y0 + 13; ci.g.position.y = 58 - k.pen * 0.25;
      ci.jarum.rotation.z = -k.pen * 0.9; arPen.jarum.rotation.z = -k.pen * 2.4;
      hud.textContent = 'Penetrasi ' + (k.pen / 4 * 10).toFixed(2).replace('.', ',') + ' mm; beban dibaca pada setiap penetrasi';
    }
    function mulai() { k.t = 0; k.pen = 0; atur(); }
    function akhir() { k.pen = 2.032; atur(); }
    function langkah(dt) {
      if (k.jeda) return;
      k.t += dt; engkol.rotation.z -= dt * 3;
      k.pen = Math.min(2.032, k.t * 0.22);   // sampai 5,08 mm (digambar 4×)
      atur();
      if (k.t > 13) mulai();
    }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Kerucut pasir (sand cone) (1 = 1 cm)
  function sandCone(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var tanahB = A.bahan('tanah', [150, 120, 86], { tekstur: 'tanah' }), pasirB = A.bahan('tanah', [214, 190, 140], { tekstur: 'pasir' });
    // tanah lapangan dipotong berbentuk L (seperempat depan-kanan dibuang) supaya potongan lubang galian (dalam 10 cm) terlihat di sudutnya
    var tebal = 22;
    var belakang = kotak(THREE, 80, tebal, 40, tanahB); belakang.position.set(0, -tebal / 2, -20); s.add(belakang);
    var kiri = kotak(THREE, 40, tebal, 40, tanahB); kiri.position.set(-20, -tebal / 2, 20); s.add(kiri);
    var lubangDasar = silinder(THREE, 8.2, 8.2, 0.2, A.bahan('tanah', [110, 86, 60], { tekstur: 'tanah' })); lubangDasar.position.y = -10; s.add(lubangDasar);
    var isiLubang = silinder(THREE, 8.2, 8.2, 1, pasirB, 40); s.add(isiLubang);
    // pelat corong (lubang 16,51 cm) di permukaan
    var pelat = new THREE.Mesh(new THREE.RingGeometry(8.26, 15, 4, 1, PI / 4), A.bahan('logam', [120, 128, 134], { side: THREE.DoubleSide }));
    pelat.rotation.x = -PI / 2; pelat.position.y = 0.3; pelat.receiveShadow = true; s.add(pelat);
    // corong dan botol terbalik
    var corong = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 8.2, 9, 40, 1, true), A.bahan('logam', [140, 148, 154], { side: THREE.DoubleSide })); corong.position.y = 5; corong.castShadow = true; s.add(corong);
    var keran = silinder(THREE, 1.6, 1.6, 2.4, A.bahan('logam', [176, 150, 92])); keran.position.y = 10.6; s.add(keran);
    var botol = silinder(THREE, 7.5, 7.5, 20, A.bahan('kaca', [210, 220, 226]), 40); botol.castShadow = false; botol.position.y = 22; s.add(botol);
    var isiBotol = silinder(THREE, 7.2, 7.2, 1, pasirB, 40); s.add(isiBotol);
    var aliran = silinder(THREE, 0.5, 0.5, 1, pasirB, 10); s.add(aliran);
    // kantong plastik berisi tanah galian dan timbangan
    var kantong = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), A.bahan('kaca', [230, 236, 240], { opacity: 0.45 })); kantong.scale.set(1, 0.8, 1); kantong.position.set(-26, 4.8, 22); s.add(kantong);
    var isiKantong = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 12), tanahB); isiKantong.scale.set(1, 0.7, 1); isiKantong.position.set(-26, 3.6, 22); isiKantong.castShadow = true; s.add(isiKantong);
    var k = { t: 0, jeda: false, p: 0 };
    function atur() {
      var hb = 18 * (1 - k.p * 0.55), hl = 10 * k.p;
      isiBotol.scale.y = hb; isiBotol.position.y = 12.2 + hb / 2;          // botol terbalik: pasir mengumpul di sisi leher (bawah), permukaannya turun
      isiLubang.scale.y = Math.max(0.01, hl); isiLubang.position.y = -10 + hl / 2;
      aliran.visible = k.p > 0 && k.p < 1; aliran.scale.y = 22; aliran.position.y = 0;
      hud.textContent = k.p < 1 ? 'Keran dibuka: pasir mengalir dari botol, memenuhi lubang dan corong' : 'Lubang penuh; botol diangkat dan sisa pasir ditimbang';
    }
    function mulai() { k.t = 0; k.p = 0; atur(); }
    function akhir() { k.p = 1; atur(); }
    function langkah(dt) {
      if (k.jeda) return;
      k.t += dt; k.p = Math.min(1, Math.max(0, (k.t - 1) / 7));
      atur();
      if (k.t > 11) mulai();
    }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Kuat geser langsung (1 = 1 cm)
  function geserLangsung(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var cat = A.bahan('plastik', [64, 104, 120], { roughness: 0.45 }), baja = A.bahan('logam', [140, 148, 154]), bajaGelap = A.bahan('logam', [70, 76, 80]);
    var meja = kotak(THREE, 70, 4, 26, cat); meja.position.y = 2; s.add(meja);
    var bak = kotak(THREE, 20, 6, 14, A.bahan('logam', [110, 118, 124])); bak.position.y = 7; s.add(bak);   // bak air pembasah
    var air = kotak(THREE, 18.6, 0.4, 12.6, A.bahan('kaca', [120, 180, 210], { opacity: 0.5 })); air.position.y = 9.6; s.add(air);
    var kotakBawah = new THREE.Group(); s.add(kotakBawah);
    // kotak geser digambar dari logam tembus pandang supaya sampel dan bidang belahnya terlihat
    var logamTembus = A.bahan('kaca', [150, 160, 168], { opacity: 0.38, metalness: 0.5, roughness: 0.25 });
    var kb = kotak(THREE, 10, 3.6, 10, logamTembus); kb.castShadow = false; kb.position.y = 11.8; kotakBawah.add(kb);
    var sampelBawah = kotak(THREE, 6, 2.4, 6, A.bahan('tanah', [130, 112, 92], { tekstur: 'lempung' })); sampelBawah.position.y = 12.4; kotakBawah.add(sampelBawah);
    var kotakAtas = new THREE.Group(); s.add(kotakAtas);
    var ka = kotak(THREE, 10, 3.6, 10, logamTembus); ka.castShadow = false; ka.position.y = 15.4; kotakAtas.add(ka);
    var sampelAtas = kotak(THREE, 6, 2.4, 6, A.bahan('tanah', [138, 118, 96], { tekstur: 'lempung' })); sampelAtas.position.y = 14.8; kotakAtas.add(sampelAtas);
    // batu pori dan beban normal
    var batu = kotak(THREE, 6, 0.6, 6, A.bahan('tanah', [200, 196, 186], { tekstur: 'batu' })); batu.position.y = 16.3; kotakAtas.add(batu);
    var gantungan = silinder(THREE, 0.6, 0.6, 26, baja, 12); gantungan.position.y = 30; s.add(gantungan);
    [0, 1, 2].forEach(function (i) { var b = silinder(THREE, 6, 6, 1.6, A.bahan('logam', [176, 150, 92])); b.position.y = 40 + i * 1.8; s.add(b); });
    // pendorong mendatar dengan engkol, arloji geser dan cincin uji
    var pendorong = silinder(THREE, 0.8, 0.8, 18, baja, 16); pendorong.rotation.z = PI / 2; pendorong.position.set(-15, 11.6, 0); s.add(pendorong);
    var engkol = new THREE.Group(); engkol.position.set(-28, 11.6, 0); s.add(engkol);
    var roda = silinder(THREE, 5, 5, 1, bajaGelap, 32); roda.rotation.z = PI / 2; engkol.add(roda);
    var ci = cincinUji(A, 5); ci.g.rotation.y = PI / 2; ci.g.position.set(14, 15.8, 0); s.add(ci.g);
    var ar = arloji(A, 2.6); ar.g.position.set(0, 24, 7); s.add(ar.g);
    var k = { t: 0, jeda: false, d: 0 };
    function atur() {
      kotakBawah.position.x = k.d; pendorong.position.x = -15 + k.d;
      ci.jarum.rotation.z = -Math.min(1.6, k.d * 1.2); ar.jarum.rotation.z = -k.d * 3;
      hud.textContent = k.d < 1.2 ? 'Engkol diputar: kotak bawah bergeser terhadap kotak atas, arloji dibaca berkala' : 'Bidang geser terbentuk di antara kedua kotak';
    }
    function mulai() { k.t = 0; k.d = 0; atur(); }
    function akhir() { k.d = 1.5; atur(); }
    function langkah(dt) {
      if (k.jeda) return;
      k.t += dt; engkol.rotation.x -= dt * 2.5;
      k.d = Math.min(1.5, Math.max(0, (k.t - 0.6) * 0.18));
      atur();
      if (k.t > 11) mulai();
    }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Kuat tekan bebas (UCS) (1 = 1 cm)
  function tekanBebas(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var r = rangka(A, 26, 52, [150, 86, 52]); s.add(r);
    var baja = A.bahan('logam', [140, 148, 154]);
    var pelatBawah = silinder(THREE, 5, 5, 1.2, baja); pelatBawah.position.y = 4.6; s.add(pelatBawah);
    var tanahB = A.bahan('tanah', [138, 116, 92], { tekstur: 'lempung' });
    var sampel = silinder(THREE, 3.6, 3.6, 1, tanahB, 40); s.add(sampel);
    // retak geser: dua belahan miring yang muncul saat runtuh
    var retak = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.25), new THREE.MeshBasicMaterial({ color: 0x3a2a1c, side: THREE.DoubleSide })); retak.rotation.z = 0.95; retak.position.z = 3.62; s.add(retak);
    var pelatAtas = silinder(THREE, 5, 5, 1.2, baja); s.add(pelatAtas);
    var torak = silinder(THREE, 1.4, 1.4, 22, baja, 16); s.add(torak);
    var ci = cincinUji(A, 6); ci.g.position.set(0, 46, 0); s.add(ci.g);
    var ar = arloji(A, 2.6); ar.g.position.set(8, 24, 3); s.add(ar.g);
    var TINGGI = 15.2;   // tinggi sampel dua kali diameter (gambar)
    var k = { t: 0, jeda: false, e: 0 };
    function atur() {
      var h = TINGGI * (1 - k.e), lebar = 1 + k.e * 0.9;   // memendek dan menggembung
      sampel.scale.set(lebar, h, lebar); sampel.position.y = 5.2 + h / 2;
      pelatAtas.position.y = 5.2 + h + 0.6; torak.position.y = pelatAtas.position.y + 11.6;
      retak.visible = k.e > 0.12; retak.position.y = 5.2 + h / 2;
      ci.jarum.rotation.z = -Math.min(1.8, k.e * 14) * (k.e > 0.12 ? 0.7 : 1); ar.jarum.rotation.z = -k.e * 30;
      hud.textContent = k.e <= 0.12 ? 'Beban ditambah, arloji dibaca setiap 30 detik' : 'Sampel runtuh: bidang geser miring terbentuk';
    }
    function mulai() { k.t = 0; k.e = 0; atur(); }
    function akhir() { k.e = 0.14; atur(); }
    function langkah(dt) {
      if (k.jeda) return;
      k.t += dt; k.e = Math.min(0.14, k.t * 0.016);
      atur();
      if (k.t > 12) mulai();
    }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Konsolidasi laboratorium (1 = 1 cm)
  function konsolidasi(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var cat = A.bahan('plastik', [64, 104, 120], { roughness: 0.45 }), baja = A.bahan('logam', [140, 148, 154]), kuningan = A.bahan('logam', [176, 150, 92]);
    var meja = kotak(THREE, 80, 4, 24, cat); meja.position.y = 2; s.add(meja);
    var tiang = kotak(THREE, 4, 46, 6, cat); tiang.position.set(-30, 27, 0); s.add(tiang);
    // sel konsolidometer: bak air kaca, cincin, batu pori atas-bawah, sampel
    var bak = silinder(THREE, 8, 8, 8, A.bahan('kaca', [200, 220, 228]), 40); bak.castShadow = false; bak.position.y = 8; s.add(bak);
    var air = silinder(THREE, 7.6, 7.6, 6, A.bahan('kaca', [110, 170, 200], { opacity: 0.35 }), 40); air.position.y = 7.2; s.add(air);
    var batuBawah = silinder(THREE, 3.4, 3.4, 1, A.bahan('tanah', [200, 196, 186], { tekstur: 'batu' })); batuBawah.position.y = 4.8; s.add(batuBawah);
    var cincin = dinding(THREE, 3.2, 3.7, 2.2, baja, 0.6); cincin.position.y = 5.3; s.add(cincin);
    var sampel = silinder(THREE, 3.18, 3.18, 1, A.bahan('tanah', [128, 112, 96], { tekstur: 'lempung' }), 40); s.add(sampel);
    var batuAtas = silinder(THREE, 3.1, 3.1, 1, A.bahan('tanah', [200, 196, 186], { tekstur: 'batu' })); s.add(batuAtas);
    var bola = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), baja); s.add(bola);
    // lengan beban berengsel di tiang, gantungan dan keping beban di ujung
    var lengan = new THREE.Group(); lengan.position.set(-30, 18, 0); s.add(lengan);
    var batang = kotak(THREE, 66, 2, 2.6, A.bahan('logam', [110, 118, 124])); batang.position.x = 33; lengan.add(batang);
    var gantung = silinder(THREE, 0.4, 0.4, 8, baja, 10); gantung.position.set(62, -4, 0); lengan.add(gantung);
    var kuk = silinder(THREE, 0.5, 0.5, 8.4, baja, 10); kuk.position.set(30, -4.2, 0); lengan.add(kuk);   // batang penekan dari lengan ke bola di atas batu pori
    var keping = [];
    for (var i = 0; i < 5; i++) { var kp = silinder(THREE, 4.5, 4.5, 1.4, kuningan); kp.position.set(62, -7.4 + i * 1.6, 0); kp.visible = false; lengan.add(kp); keping.push(kp); }
    var ar = arloji(A, 2.8); ar.g.position.set(0, 22, 3); s.add(ar.g);
    var tangkaiAr = silinder(THREE, 0.3, 0.3, 8, baja, 8); s.add(tangkaiAr);
    var k = { t: 0, jeda: false, n: 1, u: 0 };
    function atur() {
      var turun = 0.35 * (k.n - 1) + 0.35 * k.u;    // tebal sampel berkurang tiap tahap beban (gambar)
      var h = 2 - turun * 0.5;
      sampel.scale.y = h; sampel.position.y = 5.3 + h / 2;
      batuAtas.position.y = 5.3 + h + 0.5; bola.position.y = batuAtas.position.y + 1.2;
      lengan.rotation.z = -0.02 - turun * 0.004;
      keping.forEach(function (kp, j) { kp.visible = j < k.n; });
      tangkaiAr.position.y = bola.position.y + 4.6; ar.jarum.rotation.z = -turun * 2.2;
      hud.textContent = 'Tahap beban ' + k.n + ': arloji dibaca pada waktu yang ditentukan, beban ditambah setelah 24 jam';
    }
    function mulai() { k.t = 0; k.n = 1; k.u = 0; atur(); }
    function akhir() { k.n = 5; k.u = 1; atur(); }
    function langkah(dt) {
      if (k.jeda) return;
      k.t += dt;
      // penurunan cepat di awal tiap tahap lalu melambat
      k.u = 1 - Math.exp(-k.t * 1.4);
      if (k.t > 2.6) { if (k.n < 5) { k.n++; k.t = 0; } else if (k.t > 5) mulai(); }
      atur();
    }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // tulisan kecil yang selalu menghadap kamera (sprite), untuk nama bagian di dalam model
  function tulisan(A, teks, tinggi) {
    var THREE = A.THREE, c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = '700 40px "Plus Jakarta Sans", sans-serif';
    var lb = Math.ceil(g.measureText(teks).width) + 28;
    c.width = lb; c.height = 60;
    g.font = '700 40px "Plus Jakarta Sans", sans-serif';
    g.fillStyle = 'rgba(251,251,248,.92)'; g.strokeStyle = 'rgba(28,36,39,.35)'; g.lineWidth = 3;
    g.beginPath(); if (g.roundRect) g.roundRect(2, 2, lb - 4, 56, 10); else g.rect(2, 2, lb - 4, 56); g.fill(); g.stroke();
    g.fillStyle = '#1c2427'; g.textBaseline = 'middle'; g.fillText(teks, 14, 31);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    var h = tinggi || 1.6; s.scale.set(h * lb / 60, h, 1); s.renderOrder = 10;
    return s;
  }
  function lathe(A, titik, bahan, seg) {
    var THREE = A.THREE, m = new THREE.Mesh(new THREE.LatheGeometry(titik.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), seg || 48), bahan);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  // ---------------------------------------------------------------- Batas cair Casagrande (1 = 1 cm)
  function atterberg(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var karet = A.bahan('plastik', [52, 56, 60], { roughness: 0.85 }), kuningan = A.bahan('logam', [184, 150, 88]), baja = A.bahan('logam', [150, 156, 160]);
    var alas = kotak(THREE, 15, 4, 12.5, karet); alas.position.y = 2; s.add(alas);
    var tiang = kotak(THREE, 3, 7, 2.4, baja); tiang.position.set(0, 7.5, -5); s.add(tiang);
    var mangkuk = new THREE.Group(); mangkuk.position.set(0, 4.6, -4.4); s.add(mangkuk);   // berengsel di belakang
    var isi = new THREE.Group(); isi.position.z = 4.4; mangkuk.add(isi);
    var cup = lathe(A, [[0.01, 0.2], [2.5, 0.3], [4.3, 1.1], [5.4, 2.6], [5.5, 2.8], [5.3, 2.7], [4.1, 1.3], [2.4, 0.55], [0.01, 0.45]], A.bahan('logam', [184, 150, 88], { side: THREE.DoubleSide }));
    isi.add(cup);
    var tanahB = A.bahan('tanah', [150, 122, 92], { tekstur: 'lempung' });
    var kiri = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 1.1, 32, 1, false, 0, PI), tanahB), kanan = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 1.1, 32, 1, false, PI, PI), tanahB);
    [kiri, kanan].forEach(function (m) { m.position.y = 1.3; m.castShadow = true; isi.add(m); });
    var engsel = silinder(THREE, 0.6, 0.6, 3.4, baja, 16); engsel.rotation.z = PI / 2; engsel.position.set(0, 0.4, 0); mangkuk.add(engsel);
    var engkol = new THREE.Group(); engkol.position.set(8.2, 8, -5); s.add(engkol);
    var poros = silinder(THREE, 0.5, 0.5, 3, baja, 12); poros.rotation.z = PI / 2; engkol.add(poros);
    var lengan = kotak(THREE, 0.5, 4, 0.5, baja); lengan.position.set(1.4, 2, 0); engkol.add(lengan);
    var pegangan = silinder(THREE, 0.45, 0.45, 2, A.bahan('plastik', [40, 44, 48]), 12); pegangan.rotation.z = PI / 2; pegangan.position.set(2, 3.8, 0); engkol.add(pegangan);
    // pelat kaca dengan adonan tanah, pembuat alur, spatula, cawan
    var kaca = kotak(THREE, 14, 0.4, 14, A.bahan('kaca', [200, 220, 226], { opacity: 0.45 })); kaca.position.set(-17, 0.2, 4); s.add(kaca);
    var adonan = new THREE.Mesh(new THREE.SphereGeometry(3.4, 24, 12, 0, PI * 2, 0, PI / 2), tanahB); adonan.scale.y = 0.35; adonan.position.set(-17, 0.4, 4); adonan.castShadow = true; s.add(adonan);
    var alur = kotak(THREE, 1.2, 0.3, 9, baja); alur.position.set(-12, 0.15, -6); alur.rotation.y = 0.5; s.add(alur);
    var spatula = kotak(THREE, 2, 0.15, 11, baja); spatula.position.set(-20, 0.6, -5); spatula.rotation.y = -0.3; s.add(spatula);
    [[14, 6], [17, 1]].forEach(function (p) { var c = silinder(THREE, 2.4, 2, 1.6, A.bahan('logam', [200, 204, 206])); c.position.set(p[0], 0.8, p[1]); s.add(c); });
    var k = { t: 0, jeda: false, n: 0 }, N = 25;
    function atur(angkat) {
      mangkuk.rotation.x = -angkat * 0.17;   // cam mengangkat mangkuk lalu menjatuhkannya ke alas
      var celah = 0.55 * Math.max(0, 1 - k.n / N);
      kiri.position.x = -celah / 2; kanan.position.x = celah / 2;
      hud.textContent = k.n < N ? 'Ketukan ' + k.n + ': engkol diputar dua ketukan per detik' : 'Alur merapat (±13 mm): jumlah ketukan dicatat';
    }
    function mulai() { k.t = 0; k.n = 0; atur(0); }
    function akhir() { k.n = N; atur(0); }
    function langkah(dt) {
      if (k.jeda) return;
      k.t += dt;
      if (k.n < N) {
        engkol.rotation.x -= dt * PI * 2 * 2;            // dua putaran per detik = dua ketukan per detik
        var fase = (k.t * 2) % 1, angkat = fase < 0.8 ? fase / 0.8 : 0;
        if (k.t * 2 >= k.n + 1) k.n++;
        atur(angkat);
      } else { atur(0); if (k.t > N / 2 + 3) mulai(); }
    }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Analisa saringan (1 = 1 cm)
  function saringan(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var kuningan = A.bahan('logam', [190, 156, 92]), baja = A.bahan('logam', [150, 156, 160]);
    var mesin = kotak(THREE, 30, 6, 30, A.bahan('plastik', [64, 104, 120], { roughness: 0.45 })); mesin.position.y = 3; s.add(mesin);
    var susun = new THREE.Group(); susun.position.y = 6; s.add(susun);
    var NAMA = ['Tutup', 'No. 4', 'No. 10', 'No. 40', 'No. 200', 'Pan'], TINGGI = 5, R = 10.2;
    var tanahB = A.bahan('tanah', [158, 128, 92], { tekstur: 'pasir' });
    var tumpukan = [];
    NAMA.forEach(function (nm, i) {
      var y = (NAMA.length - 1 - i) * TINGGI;
      if (nm === 'Tutup') { var tp = silinder(THREE, R + 0.4, R + 0.4, 1, kuningan); tp.position.y = y + 0.5; susun.add(tp); return; }
      var w = dinding(THREE, R, R + 0.4, TINGGI, kuningan, 0.6); w.position.y = y; susun.add(w);
      if (nm !== 'Pan') {
        var kasa = new THREE.Mesh(new THREE.CircleGeometry(R, 40), A.bahan('logam', [170, 172, 170], { transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
        kasa.rotation.x = -PI / 2; kasa.position.y = y + 0.4; susun.add(kasa);
      } else { var dasar = silinder(THREE, R, R, 0.4, kuningan); dasar.position.y = y + 0.2; susun.add(dasar); }
      // butir tertahan: gundukan makin kecil ke bawah (gambar)
      var g = new THREE.Mesh(new THREE.SphereGeometry(R * 0.8, 24, 10, 0, PI * 2, 0, PI / 2), tanahB);
      g.position.y = y + 0.45; g.castShadow = true; susun.add(g); tumpukan.push(g);
      var lb = tulisan(A, nm, 1.7); lb.position.set(R + 6, y + TINGGI / 2, 0); susun.add(lb);
    });
    // butir jatuh melewati kasa
    var butir = [];
    for (var i = 0; i < 26; i++) {
      var b = new THREE.Mesh(new THREE.SphereGeometry(0.18 + Math.random() * 0.22, 8, 6), tanahB);
      b.userData = { x: (Math.random() - 0.5) * 12, z: -Math.random() * 5, y: Math.random() * 24, v: 3 + Math.random() * 4 }; susun.add(b); butir.push(b);
    }
    var k = { t: 0, jeda: false };
    var AKHIR = [0.42, 0.55, 0.62, 0.48, 0.3];
    function atur(p) {
      tumpukan.forEach(function (g, j) { var h = 0.04 + AKHIR[j] * p; g.scale.set(Math.max(0.15, p), h, Math.max(0.15, p)); });
      hud.textContent = 'Susunan saringan No. 4, 10, 40, 200 dan pan diayak; butir tertahan ditimbang per saringan';
    }
    function mulai() { k.t = 0; atur(0.05); }
    function akhir() { atur(1); butir.forEach(function (b) { b.visible = false; }); }
    function langkah(dt) {
      if (k.jeda) return;
      k.t += dt;
      var p = Math.min(1, k.t / 8);
      susun.position.x = Math.sin(k.t * 40) * 0.25; susun.rotation.y = Math.sin(k.t * 23) * 0.02;
      butir.forEach(function (b) {
        var u = b.userData; b.visible = p < 1;
        u.y -= u.v * dt; if (u.y < 0.6) u.y = 24;
        b.position.set(u.x * (0.4 + (u.y / 24) * 0.6), u.y, u.z);
      });
      atur(p);
      if (k.t > 11) mulai();
    }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Berat spesifik (piknometer) (1 = 1 cm)
  function piknometer(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var labu = [[0.01, 0], [3.2, 0.1], [4.6, 1.4], [5, 3.4], [4.4, 5.6], [2.6, 7.2], [1.3, 8.2], [1.2, 13], [1.35, 13.2]];
    var gelas = lathe(A, labu, A.bahan('kaca', [210, 226, 232], { opacity: 0.28 }), 48); gelas.castShadow = false; s.add(gelas);
    var tutup = silinder(THREE, 1.25, 1.1, 1.6, A.bahan('kaca', [200, 216, 222], { opacity: 0.5 })); tutup.position.y = 13.8; s.add(tutup);
    var tanahB = A.bahan('tanah', [128, 100, 72], { tekstur: 'pasir' });
    var endapan = lathe(A, [[0.01, 0.1], [3.1, 0.15], [4, 0.9], [0.01, 1.3]], tanahB, 40); s.add(endapan);
    var airB = A.bahan('kaca', [110, 170, 205], { opacity: 0.45 });
    var air = new THREE.Group(); s.add(air);
    // air: potongan labu yang dipotong pada ketinggian h (dibangun ulang saat tinggi berubah)
    function profilAir(h) {
      var p = [];
      labu.forEach(function (q) { if (q[1] <= h) p.push([Math.max(0.01, q[0] - 0.15), q[1]]); });
      for (var i = 1; i < labu.length; i++) if (labu[i - 1][1] < h && labu[i][1] > h) { var a = labu[i - 1], b = labu[i], u = (h - a[1]) / (b[1] - a[1]); p.push([a[0] + (b[0] - a[0]) * u - 0.15, h]); break; }
      p.push([0.01, h]);
      return p;
    }
    var mAir = null, hAir = -1;
    function isiAir(h) {
      if (Math.abs(h - hAir) < 0.05) return; hAir = h;
      if (mAir) { air.remove(mAir); mAir.geometry.dispose(); }
      if (h < 0.3) { mAir = null; return; }
      mAir = lathe(A, profilAir(h), airB, 40); mAir.castShadow = false; air.add(mAir);
    }
    // pelat pemanas, termometer, botol semprot, timbangan
    var pemanas = kotak(THREE, 14, 3, 14, A.bahan('plastik', [214, 218, 220])); pemanas.position.y = -1.5; s.add(pemanas);
    var lempeng = silinder(THREE, 5.5, 5.5, 0.4, A.bahan('logam', [90, 94, 96], { emissive: new THREE.Color(0, 0, 0) })); lempeng.position.y = 0.05; s.add(lempeng);
    var termo = new THREE.Group(); termo.position.set(1.2, 6, 0.2); termo.rotation.z = -0.12; s.add(termo);
    var batangT = silinder(THREE, 0.18, 0.18, 14, A.bahan('kaca', [230, 236, 240], { opacity: 0.6 }), 10); termo.add(batangT);
    var raksa = silinder(THREE, 0.08, 0.08, 1, A.bahan('plastik', [200, 40, 30], { roughness: 0.3 }), 8); termo.add(raksa);
    var semprot = lathe(A, [[0.01, 0], [3, 0], [3.2, 6], [2.4, 8.2], [0.8, 9], [0.01, 9]], A.bahan('plastik', [236, 240, 242], { roughness: 0.35 })); semprot.position.set(-14, -3, 6); s.add(semprot);
    var corot = silinder(THREE, 0.2, 0.2, 7, A.bahan('plastik', [236, 240, 242]), 8); corot.rotation.z = 1.1; corot.position.set(-11.5, 7.6, 6); s.add(corot);
    var gelembung = [];
    for (var i = 0; i < 14; i++) { var g = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.15, 8, 6), A.bahan('kaca', [235, 245, 250], { opacity: 0.7 })); g.userData = { x: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 6, y: Math.random() * 5 }; g.visible = false; s.add(g); gelembung.push(g); }
    var LANGKAH = [['Air suling ditambahkan sampai sekitar 2/3 tinggi piknometer', 3], ['Piknometer dipanaskan sekitar 10 menit untuk mengeluarkan udara', 4], ['Didinginkan, lalu diisi air suling sampai penuh dan ditutup', 3], ['Ditimbang dan suhu isinya diukur dengan termometer', 3]];
    var k = { t: 0, jeda: false };
    function fase() { var t = k.t, i = 0; while (i < LANGKAH.length - 1 && t > LANGKAH[i][1]) { t -= LANGKAH[i][1]; i++; } return { i: i, u: Math.min(1, t / LANGKAH[i][1]) }; }
    function atur() {
      var f = fase(), h = f.i === 0 ? 8.6 * f.u : f.i === 1 ? 8.6 : f.i === 2 ? 8.6 + (12.8 - 8.6) * f.u : 12.8;
      isiAir(h);
      tutup.visible = f.i >= 2 && f.u > 0.6 || f.i > 2;
      var panas = f.i === 1 ? Math.sin(f.u * PI) : 0;
      lempeng.material.emissive.setRGB(0.6 * panas, 0.12 * panas, 0.02 * panas);
      gelembung.forEach(function (g) { g.visible = panas > 0.2; });
      var tinggiRaksa = 2 + 4 * panas + (f.i === 3 ? 0.5 : 0); raksa.scale.y = tinggiRaksa; raksa.position.y = -7 + tinggiRaksa / 2;
      hud.textContent = LANGKAH[f.i][0];
    }
    function mulai() { k.t = 0; atur(); }
    function akhir() { k.t = 99; atur(); }
    function langkah(dt) {
      if (k.jeda) return;
      k.t += dt;
      gelembung.forEach(function (g) { var u = g.userData; u.y += dt * 4; if (u.y > 8) u.y = 0.8; g.position.set(u.x * (1 - u.y / 12), u.y, u.z * (1 - u.y / 12)); });
      atur();
      if (k.t > 16) mulai();
    }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Permeabilitas tinggi tekan tetap / turun (1 = 1 cm)
  function permeabilitas(turun) {
    return function (A, hud) {
      var THREE = A.THREE, s = A.scene;
      var baja = A.bahan('logam', [150, 156, 160]), kacaB = A.bahan('kaca', [210, 226, 232], { opacity: 0.3 }), airB = A.bahan('kaca', [110, 170, 205], { opacity: 0.5 });
      var alas = kotak(THREE, 30, 2, 18, A.bahan('plastik', [64, 104, 120], { roughness: 0.45 })); alas.position.y = 1; s.add(alas);
      var tiang = silinder(THREE, 0.6, 0.6, 70, baja, 12); tiang.position.set(-10, 37, -4); s.add(tiang);
      var penjepit = kotak(THREE, 6, 1.2, 1.2, baja); penjepit.position.set(-8, 50, -3); s.add(penjepit);
      // buret dengan skala, keran
      var buret = silinder(THREE, 0.9, 0.9, 50, kacaB, 20); buret.castShadow = false; buret.position.set(-5, 42, -2); s.add(buret);
      var airBuret = silinder(THREE, 0.75, 0.75, 1, airB, 16); s.add(airBuret);
      for (var y = 20; y <= 66; y += 2) { var tk = kotak(THREE, y % 10 ? 0.6 : 1.2, 0.08, 0.05, A.bahan('plastik', [30, 30, 30])); tk.castShadow = false; tk.position.set(-5 + 0.95, y, -2 + 0.3); s.add(tk); }
      var keran = kotak(THREE, 2.4, 0.8, 0.8, A.bahan('plastik', [40, 44, 48])); keran.position.set(-5, 16.5, -2); s.add(keran);
      // selang dari buret ke permeameter
      var kurva = new THREE.CatmullRomCurve3([new THREE.Vector3(-5, 16, -2), new THREE.Vector3(-5, 13, -2), new THREE.Vector3(2, 26, 0), new THREE.Vector3(6, 23.5, 0)]);
      var selang = new THREE.Mesh(new THREE.TubeGeometry(kurva, 40, 0.35, 10, false), A.bahan('kaca', [210, 230, 236], { opacity: 0.55 })); s.add(selang);
      // permeameter: tabung kaca, batu pori atas-bawah, sampel tanah
      var tabung = silinder(THREE, 3.6, 3.6, 18, kacaB, 32); tabung.castShadow = false; tabung.position.set(6, 13, 0); s.add(tabung);
      [5.2, 20.8].forEach(function (yy) { var bp = silinder(THREE, 3.4, 3.4, 1.2, A.bahan('tanah', [200, 196, 186], { tekstur: 'batu' })); bp.position.set(6, yy, 0); s.add(bp); });
      var sampel = silinder(THREE, 3.4, 3.4, 14.4, A.bahan('tanah', [196, 170, 116], { tekstur: 'pasir' }), 32); sampel.position.set(6, 13, 0); s.add(sampel);
      var tutupA = silinder(THREE, 3.9, 3.9, 1, baja); tutupA.position.set(6, 22.5, 0); s.add(tutupA);
      var tutupB = silinder(THREE, 3.9, 3.9, 1, baja); tutupB.position.set(6, 3.5, 0); s.add(tutupB);
      var keluar = silinder(THREE, 0.3, 0.3, 6, baja, 8); keluar.rotation.z = PI / 2; keluar.position.set(9.5, 3.5, 0); s.add(keluar);
      // gelas ukur menampung air yang keluar
      var gelasUkur = silinder(THREE, 2.6, 2.6, 12, kacaB, 28); gelasUkur.castShadow = false; gelasUkur.position.set(14, 8, 0); s.add(gelasUkur);
      var airGelas = silinder(THREE, 2.4, 2.4, 1, airB, 24); s.add(airGelas);
      var tetes = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), airB); s.add(tetes);
      var k = { t: 0, jeda: false };
      var H1 = 64, H2 = 34;
      function atur() {
        var u = Math.min(1, k.t / 9);
        var muka = turun ? H1 - (H1 - H2) * (1 - Math.exp(-u * 1.6)) / (1 - Math.exp(-1.6)) : H1;
        var bawah = 17;
        airBuret.scale.y = muka - bawah; airBuret.position.set(-5, (muka + bawah) / 2, -2);
        var vol = turun ? (H1 - muka) / (H1 - H2) : u;
        airGelas.scale.y = 0.3 + 9 * vol; airGelas.position.set(14, 2.3 + airGelas.scale.y / 2, 0);
        tetes.position.set(12.6, 3.3 - ((k.t * 2.2) % 1) * 1.2, 0); tetes.visible = u < 1;
        hud.textContent = turun ? (u < 1 ? 'Keran dibuka, stopwatch berjalan: muka air di buret turun dari h₁ ke h₂' : 'Stopwatch dihentikan; tinggi h₂ dan waktu dicatat')
          : 'Muka air di buret dijaga tetap; air yang keluar ditampung gelas ukur selama waktu tertentu';
      }
      function mulai() { k.t = 0; atur(); }
      function akhir() { k.t = 9; atur(); }
      function langkah(dt) { if (k.jeda) return; k.t += dt; atur(); if (k.t > 12) mulai(); }
      langkah.aktif = function () { return !A.hemat && !k.jeda; };
      return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
    };
  }

  // ---------------------------------------------------------------- SPT (1 = 5 cm)
  function spt(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var baja = A.bahan('logam', [112, 120, 126]), bajaGelap = A.bahan('logam', [58, 64, 68]), cat = A.bahan('plastik', [196, 92, 52], { roughness: 0.45 });
    // tanah terpotong L seperti sondir, lubang bor di sudut potongan
    [[0, 12, [150, 126, 94], 'tanah'], [12, 26, [118, 128, 118], 'lempung'], [26, 44, [190, 162, 104], 'pasir']].forEach(function (l) {
      var bhn = A.bahan('tanah', l[2], { tekstur: l[3] }), h = l[1] - l[0];
      var a = kotak(THREE, 70, h, 35, bhn); a.position.set(0, -(l[0] + l[1]) / 2, -17.5); s.add(a);
      var b = kotak(THREE, 35, h, 35, bhn); b.position.set(-17.5, -(l[0] + l[1]) / 2, 17.5); s.add(b);
    });
    var rumput = A.bahan('tanah', [124, 146, 92], { tekstur: 'tanah' });
    var r1 = kotak(THREE, 70, 0.5, 35, rumput); r1.position.set(0, 0.25, -17.5); s.add(r1);
    var r2 = kotak(THREE, 35, 0.5, 35, rumput); r2.position.set(-17.5, 0.25, 17.5); s.add(r2);
    // kaki tiga, katrol, tali
    var PUNCAK = new THREE.Vector3(0, 46, 0);
    [[-16, -10], [16, -10], [0, 18]].forEach(function (p) {
      var bawah = new THREE.Vector3(p[0], 0, p[1]), arah = new THREE.Vector3().subVectors(PUNCAK, bawah), pj = arah.length();
      var kaki = silinder(THREE, 0.7, 0.7, pj, cat, 12); kaki.position.copy(bawah).addScaledVector(arah, 0.5);
      kaki.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arah.normalize()); s.add(kaki);
    });
    var katrol = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.4, 10, 24), bajaGelap); katrol.position.copy(PUNCAK).add(new THREE.Vector3(0, -1.6, 0)); s.add(katrol);
    var tali = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x8a6a3a })); s.add(tali);
    // batang bor, landasan, batang peluncur, palu; tabung belah di ujung bawah
    var batang = silinder(THREE, 0.5, 0.5, 1, baja, 12); s.add(batang);
    var landasan = silinder(THREE, 1.6, 1.6, 1.2, bajaGelap); s.add(landasan);
    var peluncur = silinder(THREE, 0.35, 0.35, 20, baja, 10); s.add(peluncur);
    var palu = silinder(THREE, 2.2, 2.2, 3.6, cat); s.add(palu);
    var tabungBelah = silinder(THREE, 0.75, 0.75, 4, A.bahan('logam', [176, 150, 92]), 16); s.add(tabungBelah);
    var ujung = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1, 16), A.bahan('logam', [176, 150, 92])); ujung.rotation.x = PI; s.add(ujung);
    var JATUH = 76 / 5;   // tinggi jatuh 76 cm dalam satuan adegan
    var TIAP = 6;          // jumlah pukulan per 15 cm pada ilustrasi ini
    var k = { t: 0, jeda: false, pukul: 0 };
    function atur(angkat) {
      var masuk = Math.min(9, k.pukul * (3 / TIAP));   // 15 cm = 3 satuan; tiga penetrasi = 9 satuan
      var dasar = -30 - masuk, atasBatang = 9 - masuk;
      tabungBelah.position.y = dasar + 2; ujung.position.y = dasar - 0.5;
      batang.scale.y = atasBatang - (dasar + 4); batang.position.y = (atasBatang + dasar + 4) / 2;
      landasan.position.y = atasBatang + 0.6; peluncur.position.y = atasBatang + 11;
      palu.position.y = atasBatang + 3 + JATUH * angkat;
      tali.geometry.setFromPoints([new THREE.Vector3(0, palu.position.y + 1.8, 0), katrol.position.clone(), new THREE.Vector3(6, 6, 10)]);
      var ke = Math.min(3, Math.floor(k.pukul / TIAP) + 1), dalam = k.pukul % TIAP;
      hud.textContent = k.pukul >= TIAP * 3 ? 'Tiga penetrasi 15 cm selesai: N = N₂ + N₃ (pukulan di sini ilustrasi)' :
        'Palu 63,5 kg dijatuhkan bebas 76 cm; penetrasi 15 cm ke-' + ke + ', pukulan ' + dalam;
    }
    function mulai() { k.t = 0; k.pukul = 0; atur(0); }
    function akhir() { k.pukul = TIAP * 3; atur(0); }
    function langkah(dt) {
      if (k.jeda) return;
      k.t += dt;
      if (k.pukul < TIAP * 3) {
        var siklus = 1.1, u = (k.t % siklus) / siklus;
        var angkat = u < 0.7 ? u / 0.7 : 1 - Math.pow((u - 0.7) / 0.3, 2);
        if (k.t >= (k.pukul + 1) * siklus) k.pukul++;
        atur(Math.max(0, angkat));
      } else { atur(0); if (k.t > TIAP * 3 * 1.1 + 3) mulai(); }
    }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Kadar air (1 = 1 cm)
  function kadarAir(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var baja = A.bahan('logam', [200, 204, 206]), tanahBasah = A.bahan('tanah', [110, 84, 60], { tekstur: 'tanah' });
    // oven: badan, ruang dalam, pintu kaca, rak, elemen pemanas yang menyala
    var oven = new THREE.Group(); oven.position.set(14, 0, -2); s.add(oven);
    var badan = kotak(THREE, 26, 22, 20, A.bahan('plastik', [228, 230, 228], { roughness: 0.4 })); badan.position.y = 11; oven.add(badan);
    var ruang = kotak(THREE, 21, 15, 0.4, A.bahan('logam', [60, 62, 64])); ruang.position.set(-1, 12, 10.05); oven.add(ruang);
    var pintu = kotak(THREE, 21, 15, 0.3, A.bahan('kaca', [180, 200, 210], { opacity: 0.35 })); pintu.position.set(-1, 12, 10.6); oven.add(pintu);
    var panas = kotak(THREE, 18, 0.5, 0.3, A.bahan('logam', [80, 40, 30], { emissive: new THREE.Color(0, 0, 0) })); panas.position.set(-1, 5.5, 10.3); oven.add(panas);
    var panel = kotak(THREE, 3, 15, 0.4, A.bahan('plastik', [50, 54, 58])); panel.position.set(11, 12, 10.2); oven.add(panel);
    var layarOven = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: teksturLayar('110 °C', { warna: '#ff9b6a' }) })); layarOven.position.set(11, 16, 10.45); oven.add(layarOven);
    // timbangan dan dua cawan
    var timb = kotak(THREE, 14, 3, 12, A.bahan('plastik', [214, 218, 220])); timb.position.set(-14, 1.5, 4); s.add(timb);
    var piring = silinder(THREE, 5, 5, 0.5, A.bahan('logam', [150, 156, 160])); piring.position.set(-14, 3.25, 3); s.add(piring);
    var layar = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.8), new THREE.MeshBasicMaterial({ map: teksturLayar('0,00 g') })); layar.rotation.x = -PI / 2 + 0.5; layar.position.set(-14, 3.1, 9.3); s.add(layar);
    var cawan = [0, 1].map(function (i) {
      var g = new THREE.Group(); s.add(g);
      g.add(lathe(A, [[0.01, 0], [2.4, 0], [2.8, 1.6], [2.6, 1.6], [2.2, 0.2], [0.01, 0.2]], baja, 32));
      var isi = new THREE.Mesh(new THREE.SphereGeometry(2.3, 20, 10, 0, PI * 2, 0, PI / 2), tanahBasah.clone()); isi.scale.y = 0.45; isi.position.y = 0.3; isi.castShadow = true; g.add(isi);
      var lb = tulisan(A, 'Cawan ' + (i + 1), 1.1); lb.position.y = 3.6; g.add(lb);
      return { g: g, isi: isi };
    });
    var uap = [];
    for (var i = 0; i < 10; i++) { var u = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), A.bahan('kaca', [240, 244, 246], { opacity: 0.35 })); u.userData = { k: i % 2, f: Math.random() }; u.visible = false; s.add(u); uap.push(u); }
    var BASAH = [110, 84, 60], KERING = [176, 148, 112];
    var k = { t: 0, jeda: false };
    function atur() {
      var t = k.t, fase, p;
      if (t < 2.5) { fase = 0; p = t / 2.5; } else if (t < 4) { fase = 1; p = (t - 2.5) / 1.5; } else if (t < 9) { fase = 2; p = (t - 4) / 5; } else if (t < 10.5) { fase = 3; p = (t - 9) / 1.5; } else { fase = 4; p = 1; }
      var posTimb = [[-15.8, 3.5, 2.6], [-12.2, 3.5, 3.4]], posOven = [[9, 7, 2], [17, 7, 2]];
      cawan.forEach(function (c, j) {
        var a = posTimb[j], b = posOven[j], u = fase === 1 ? p : fase === 3 ? 1 - p : fase === 2 ? 1 : 0;
        var e = u * u * (3 - 2 * u);
        c.g.position.set(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e + Math.sin(e * PI) * 6, a[2] + (b[2] - a[2]) * e);
        var kering = fase >= 3 ? 1 : fase === 2 ? p : 0;
        c.isi.material.color.copy(A.warnaThree([BASAH[0] + (KERING[0] - BASAH[0]) * kering, BASAH[1] + (KERING[1] - BASAH[1]) * kering, BASAH[2] + (KERING[2] - BASAH[2]) * kering]));
        c.isi.scale.y = 0.45 - 0.08 * kering;
      });
      var nyala = fase === 2 ? 0.7 + 0.3 * Math.sin(t * 6) : 0.15;
      panas.material.emissive.setRGB(0.9 * nyala, 0.3 * nyala, 0.06 * nyala);
      uap.forEach(function (u) { u.visible = fase === 2 && !A.hemat; });
      hud.textContent = ['Cawan berisi tanah basah ditimbang', 'Cawan dimasukkan ke oven', 'Dikeringkan sekitar 110 °C selama 24 jam atau sampai beratnya tetap', 'Cawan dikeluarkan dari oven', 'Cawan berisi tanah kering ditimbang'][fase];
    }
    function mulai() { k.t = 0; atur(); }
    function akhir() { k.t = 12; atur(); }
    function langkah(dt) {
      if (k.jeda) return;
      k.t += dt;
      uap.forEach(function (u) { var d = u.userData; d.f = (d.f + dt * 0.5) % 1; var c = cawan[d.k].g.position; u.position.set(c.x + Math.sin(d.f * 9) * 0.6, c.y + 1 + d.f * 6, c.z); u.scale.setScalar(0.5 + d.f); u.material.opacity = 0.35 * (1 - d.f); });
      atur();
      if (k.t > 13) mulai();
    }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Analisa hidrometer (1 = 1 cm)
  function hidrometer(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var gelas = new THREE.Group(); s.add(gelas);
    var kaca = silinder(THREE, 3.2, 3.2, 46, A.bahan('kaca', [210, 226, 232], { opacity: 0.25 }), 36); kaca.castShadow = false; kaca.position.y = 23.5; gelas.add(kaca);
    var kaki = silinder(THREE, 5, 5.4, 1, A.bahan('kaca', [210, 226, 232], { opacity: 0.45 }), 36); kaki.position.y = 0.5; gelas.add(kaki);
    for (var y = 6; y <= 44; y += 2) { var tk = kotak(THREE, y % 10 ? 0.7 : 1.4, 0.08, 0.05, A.bahan('plastik', [30, 30, 30])); tk.castShadow = false; tk.position.set(0, y, 3.22); gelas.add(tk); }
    var keruh = silinder(THREE, 3.05, 3.05, 1, A.bahan('kaca', [168, 136, 100], { opacity: 0.85 }), 32); gelas.add(keruh);
    var jernih = silinder(THREE, 3.05, 3.05, 1, A.bahan('kaca', [200, 196, 176], { opacity: 0.35 }), 32); gelas.add(jernih);
    var endapan = silinder(THREE, 3.05, 3.05, 1, A.bahan('tanah', [130, 104, 76], { tekstur: 'pasir' }), 32); gelas.add(endapan);
    // hidrometer: bola apung dan batang berskala
    var hidro = new THREE.Group(); s.add(hidro);
    hidro.add(lathe(A, [[0.01, 0], [0.8, 0.6], [1.3, 2.4], [1.3, 6.4], [0.9, 8], [0.35, 8.6], [0.3, 22], [0.01, 22.2]], A.bahan('kaca', [226, 232, 236], { opacity: 0.6 }), 28));
    var pemberat = silinder(THREE, 0.9, 0.9, 1.4, A.bahan('logam', [70, 76, 80]), 16); pemberat.position.y = 1.4; hidro.add(pemberat);
    var skala = silinder(THREE, 0.26, 0.26, 12, A.bahan('plastik', [240, 236, 220]), 10); skala.position.y = 15; hidro.add(skala);
    // gelas kedua berisi air suling (pembanding) dan termometer
    var pemb = silinder(THREE, 3.2, 3.2, 46, A.bahan('kaca', [210, 226, 232], { opacity: 0.2 }), 36); pemb.castShadow = false; pemb.position.set(12, 23.5, -4); s.add(pemb);
    var airPemb = silinder(THREE, 3.05, 3.05, 40, A.bahan('kaca', [130, 180, 210], { opacity: 0.3 }), 32); airPemb.position.set(12, 21, -4); s.add(airPemb);
    var lb = tulisan(A, '1000 ml', 1.5); lb.position.set(0, 47.5, 0); s.add(lb);
    // poros jungkir balik di tengah gelas (bukan di dasarnya), supaya gelas tidak menembus lantai
    var PUSAT = 23.5; gelas.position.y = PUSAT; gelas.children.forEach(function (c) { c.position.y -= PUSAT; });
    var k = { t: 0, jeda: false };
    var ATAS = 41, DASAR = 1;
    function atur() {
      var t = k.t, fase = t < 3 ? 0 : t < 5 ? 1 : 2;
      gelas.rotation.z = fase === 0 ? Math.sin(t / 3 * PI * 3) * PI * 0.9 * (1 - t / 3) : 0;   // dijungkirbalikkan supaya merata
      var u = fase === 2 ? Math.min(1, (t - 5) / 9) : 0;
      var batas = ATAS - (ATAS - DASAR - 2) * (1 - Math.exp(-u * 2.2));      // butir besar turun lebih dulu; bagian atas makin jernih
      var tebalEndap = 0.2 + 1.4 * u;
      jernih.scale.y = Math.max(0.01, ATAS - batas); jernih.position.y = (ATAS + batas) / 2 - PUSAT;
      keruh.scale.y = Math.max(0.01, batas - DASAR - tebalEndap); keruh.position.y = (batas + DASAR + tebalEndap) / 2 - PUSAT;
      endapan.scale.y = tebalEndap; endapan.position.y = DASAR + tebalEndap / 2 - PUSAT;
      hidro.visible = fase >= 1;
      hidro.position.set(0, fase === 1 ? 40 - 16 * ((t - 3) / 2) : 24 - 4 * u, 0);   // makin jernih, makin dalam hidrometer tenggelam
      hud.textContent = ['Gelas ukur ditutup telapak tangan dan dijungkirbalikkan sampai campuran merata', 'Hidrometer dimasukkan perlahan', 'Hidrometer dibaca pada waktu-waktu yang ditentukan; butir mengendap dan larutan bagian atas makin jernih'][fase];
    }
    function mulai() { k.t = 0; atur(); }
    function akhir() { k.t = 14; atur(); }
    function langkah(dt) { if (k.jeda) return; k.t += dt; atur(); if (k.t > 17) mulai(); }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Batas susut (1 = 1 cm)
  function batasSusut(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var porselin = A.bahan('plastik', [240, 240, 236], { roughness: 0.25 });
    var kaca = kotak(THREE, 26, 0.5, 18, A.bahan('kaca', [200, 220, 226], { opacity: 0.4 })); kaca.position.y = 0.25; s.add(kaca);
    var cawanSusut = lathe(A, [[0.01, 0], [3.6, 0], [4.4, 0.3], [4.6, 2.2], [4.4, 2.2], [4.2, 0.45], [0.01, 0.45]], porselin, 40); cawanSusut.position.y = 0.5; s.add(cawanSusut);
    var pasta = silinder(THREE, 4.15, 4.15, 1, A.bahan('tanah', [102, 80, 60], { tekstur: 'lempung' }), 40); s.add(pasta);
    var cawanAduk = lathe(A, [[0.01, 0], [3, 0], [5.6, 2.6], [5.8, 2.8], [5.5, 2.8], [2.8, 0.3], [0.01, 0.3]], porselin, 40); cawanAduk.position.set(-10, 0.5, -2); s.add(cawanAduk);
    var adonan = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 10, 0, PI * 2, 0, PI / 2), A.bahan('tanah', [102, 80, 60], { tekstur: 'lempung' })); adonan.scale.y = 0.4; adonan.position.set(-10, 1, -2); adonan.castShadow = true; s.add(adonan);
    var spatula = kotak(THREE, 1.6, 0.15, 10, A.bahan('logam', [180, 184, 186])); spatula.position.set(-4, 3, -1); spatula.rotation.set(0.3, 0.6, 0.2); s.add(spatula);
    var mistar = kotak(THREE, 12, 0.2, 1.4, A.bahan('logam', [170, 174, 176])); mistar.position.set(6, 0.6, 6); s.add(mistar);
    var BASAH = [102, 80, 60], KERING = [184, 160, 126];
    var k = { t: 0, jeda: false };
    function atur() {
      var t = k.t, fase = t < 4.5 ? 0 : t < 6 ? 1 : 2, tinggi, lebar = 1, kering = 0;
      // tiga tahap pengisian, masing-masing sekitar 1/3 volume cawan
      tinggi = fase === 0 ? 1.75 * (Math.floor(t / 1.5) + Math.min(1, (t % 1.5) / 0.8)) / 3 : 1.75;
      if (fase === 2) { kering = Math.min(1, (t - 6) / 7); lebar = 1 - 0.16 * kering; tinggi = 1.75 * (1 - 0.18 * kering); }
      pasta.scale.set(lebar, Math.max(0.01, tinggi), lebar); pasta.position.y = 0.95 + Math.max(0.01, tinggi) / 2;
      pasta.material.color.copy(A.warnaThree([BASAH[0] + (KERING[0] - BASAH[0]) * kering, BASAH[1] + (KERING[1] - BASAH[1]) * kering, BASAH[2] + (KERING[2] - BASAH[2]) * kering]));
      mistar.position.set(fase === 1 ? -4 + 8 * ((t - 4.5) / 1.5) : 6, fase === 1 ? 2.9 : 0.6, fase === 1 ? 0 : 6);
      hud.textContent = ['Pasta tanah dimasukkan ke cawan susut dalam tiga tahap, diketuk tiap tahap', 'Kelebihan tanah diratakan dengan mistar baja', 'Tanah mengering dan menyusut: warnanya berubah lebih terang, lalu dikeringkan di oven'][fase];
    }
    function mulai() { k.t = 0; atur(); }
    function akhir() { k.t = 13; atur(); }
    function langkah(dt) { if (k.jeda) return; k.t += dt; atur(); if (k.t > 16) mulai(); }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Hubungan berat-volume: diagram fase 3D
  function hubunganFase(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var S = 14;   // sisi kubus elemen tanah
    var udara = kotak(THREE, S, 1, S, A.bahan('kaca', [230, 236, 240], { opacity: 0.22 })); udara.castShadow = false; s.add(udara);
    var air = kotak(THREE, S, 1, S, A.bahan('kaca', [110, 170, 205], { opacity: 0.55 })); s.add(air);
    var padat = kotak(THREE, S, 1, S, A.bahan('tanah', [150, 120, 86], { tekstur: 'pasir' })); s.add(padat);
    var butir = [];
    for (var i = 0; i < 70; i++) { var b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + Math.random() * 0.7, 0), A.bahan('tanah', [150, 120, 86], { tekstur: 'pasir' })); b.userData = { x: (Math.random() - 0.5) * (S - 2), y: Math.random() * (S - 2) + 1, z: (Math.random() - 0.5) * (S - 2), r: Math.random() * PI }; b.castShadow = true; s.add(b); butir.push(b); }
    var label = [tulisan(A, 'Udara: Va, Wa ≈ 0', 1.3), tulisan(A, 'Air: Vw, Ww', 1.3), tulisan(A, 'Butir: Vs, Ws', 1.3)];
    label.forEach(function (l) { s.add(l); });
    var Hs = 7, Hw = 4, Ha = 3;   // proporsi gambar (bukan data)
    var k = { t: 0, jeda: false };
    function atur() {
      var t = k.t, u = Math.min(1, Math.max(0, (t - 2) / 3)), e = u * u * (3 - 2 * u);
      // keadaan awal: kubus campuran (butir di dalam air, udara di atas); keadaan akhir: fase dipisah bertumpuk dan direnggangkan
      var celah = 1.4 * e, hPadat = Hs * e, hAir = (S - Ha) * (1 - e) + Hw * e;
      padat.visible = e > 0.02; padat.scale.y = Math.max(0.01, hPadat); padat.position.y = hPadat / 2;
      air.scale.y = hAir; air.position.y = hPadat + celah + hAir / 2;
      udara.scale.y = Ha; udara.position.y = hPadat + 2 * celah + hAir + Ha / 2;
      butir.forEach(function (b) { var d = b.userData; b.visible = e < 0.98; b.position.set(d.x, d.y * (1 - e) + (Hs / 2) * e, d.z); b.scale.setScalar(1 - e); b.rotation.set(d.r, d.r * 2, 0); });
      label[2].position.set(S / 2 + 6, Hs / 2, 0); label[1].position.set(S / 2 + 6, air.position.y, 0); label[0].position.set(S / 2 + 6, udara.position.y, 0);
      label.forEach(function (l) { l.visible = e > 0.6; l.material.opacity = Math.min(1, (e - 0.6) / 0.4); });
      hud.textContent = e < 1 ? 'Elemen tanah: butir, air, dan udara bercampur' : 'Fase dipisah: volume dan berat tiap fase dihitung satu per satu (proporsi gambar, bukan data)';
    }
    function mulai() { k.t = 0; atur(); }
    function akhir() { k.t = 6; atur(); }
    function langkah(dt) { if (k.jeda) return; k.t += dt; atur(); if (k.t > 11) mulai(); }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Klasifikasi: contoh tanah per kelompok butir
  function klasifikasi(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var rak = kotak(THREE, 46, 2, 14, A.bahan('plastik', [120, 96, 70], { roughness: 0.7 })); rak.position.y = 1; s.add(rak);
    var JENIS = [['Kerikil (G)', [150, 140, 128], 'batu', 1.2], ['Pasir (S)', [206, 178, 120], 'pasir', 0.5], ['Lanau (M)', [176, 160, 132], 'tanah', 0.15], ['Lempung (C)', [128, 112, 98], 'lempung', 0.05]];
    var tabung = JENIS.map(function (j, i) {
      var g = new THREE.Group(); g.position.set(-16.5 + i * 11, 2, 0); s.add(g);
      var kaca = silinder(THREE, 3.6, 3.6, 16, A.bahan('kaca', [214, 228, 234], { opacity: 0.25 }), 32); kaca.castShadow = false; kaca.position.y = 8; g.add(kaca);
      var isi = silinder(THREE, 3.4, 3.4, 11, A.bahan('tanah', j[1], { tekstur: j[2] }), 32); isi.position.y = 5.5; g.add(isi);
      if (j[3] > 0.3) for (var n = 0; n < 14; n++) { var b = new THREE.Mesh(new THREE.DodecahedronGeometry(j[3] * (0.6 + Math.random() * 0.6), 0), A.bahan('tanah', j[1], { tekstur: 'batu' })); var a = Math.random() * PI * 2; b.position.set(Math.cos(a) * 3.05, 1 + Math.random() * 9.5, Math.sin(a) * 3.05); g.add(b); }
      var lb = tulisan(A, j[0], 2.3); lb.position.y = 19.5; g.add(lb);
      return g;
    });
    var k = { t: 0, jeda: false };
    function atur() {
      var aktif = Math.floor(k.t / 2.4) % tabung.length;
      tabung.forEach(function (g, i) { var s2 = i === aktif ? 1.08 : 1; g.scale.set(s2, s2, s2); g.position.y = 2 + (i === aktif ? 1 : 0); });
      hud.textContent = 'USCS memakai huruf kelompok butir: ' + JENIS[aktif][0] + '. Simbol akhir dari gradasi dan batas Atterberg.';
    }
    function mulai() { k.t = 0; atur(); }
    function akhir() { k.t = 0; atur(); }
    function langkah(dt) { if (k.jeda) return; k.t += dt; atur(); }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- bagian bersama kalkulator: tanah terpotong L dan panah beban
  function tanahL(A, LAPIS, X, Z) {
    var THREE = A.THREE, s = A.scene;
    LAPIS.forEach(function (l) {
      var bhn = A.bahan('tanah', l[2], { tekstur: l[3] }), h = l[1] - l[0];
      var a = kotak(THREE, X, h, Z / 2, bhn); a.position.set(0, -(l[0] + l[1]) / 2, -Z / 4); s.add(a);
      var b = kotak(THREE, X / 2, h, Z / 2, bhn); b.position.set(-X / 4, -(l[0] + l[1]) / 2, Z / 4); s.add(b);
    });
  }
  function panah3d(A, warna, panjang) {
    var THREE = A.THREE, g = new THREE.Group(), b = A.bahan('plastik', warna || [181, 83, 46], { roughness: 0.35, emissive: new THREE.Color(0, 0, 0) });
    var batang = silinder(THREE, 0.9, 0.9, panjang, b, 16); batang.position.y = panjang / 2 + 3; g.add(batang);
    var ujung = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3.2, 24), b); ujung.rotation.x = PI; ujung.position.y = 1.6; ujung.castShadow = true; g.add(ujung);
    g.userData.bahan = b;
    return g;
  }
  function denyut(g, t, kuat) { var e = 0.5 + 0.5 * Math.sin(t * 3); g.userData.bahan.emissive.setRGB(0.35 * e * kuat, 0.1 * e * kuat, 0.03 * e * kuat); }

  // ---------------------------------------------------------------- Kalkulator pondasi dangkal (1 = 10 cm)
  function pondasiDangkal(A, hud) {
    var THREE = A.THREE, s = A.scene;
    tanahL(A, [[0, 12, [158, 132, 98], 'tanah'], [12, 26, [128, 136, 120], 'lempung'], [26, 40, [194, 166, 108], 'pasir']], 70, 50);
    var beton = A.bahan('plastik', [176, 178, 172], { roughness: 0.8 });
    var telapak = kotak(THREE, 14, 3, 14, beton); telapak.position.set(0, -7.5, 0); s.add(telapak);
    var kolom = kotak(THREE, 4, 18, 4, beton); kolom.position.set(0, 3, 0); s.add(kolom);
    var bola = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, PI * 2, PI / 2, PI / 2), A.bahan('kaca', [210, 110, 70], { opacity: 0.28 }));
    bola.position.set(0, -9, 0); s.add(bola);
    var panah = panah3d(A, null, 12); panah.position.set(0, 12, 0); s.add(panah);
    var lb = tulisan(A, 'Df', 1.6); lb.position.set(9, -3.5, 9); s.add(lb);
    var lbB = tulisan(A, 'B', 1.6); lbB.position.set(0, -11.5, 9); s.add(lbB);
    var k = { t: 0, jeda: false };
    function atur() {
      var u = 0.5 + 0.5 * Math.sin(k.t * 1.2);
      bola.scale.set(10 + 4 * u, 12 + 6 * u, 10 + 4 * u);
      panah.position.y = 12 + 1.2 * Math.sin(k.t * 3); denyut(panah, k.t, 1);
      hud.textContent = 'Beban kolom disalurkan telapak ke tanah; tegangan menyebar dan mengecil terhadap kedalaman (gambar)';
    }
    function mulai() { k.t = 0; atur(); }
    function akhir() { k.t = PI / 2.4; atur(); }
    function langkah(dt) { if (k.jeda) return; k.t += dt; atur(); }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Kalkulator tiang bor (1 = 20 cm)
  function tiangBor(A, hud) {
    var THREE = A.THREE, s = A.scene;
    tanahL(A, [[0, 14, [158, 132, 98], 'tanah'], [14, 30, [128, 136, 120], 'lempung'], [30, 52, [194, 166, 108], 'pasir']], 70, 50);
    var beton = A.bahan('plastik', [176, 178, 172], { roughness: 0.8 });
    var tiang = silinder(THREE, 2.6, 2.6, 48, beton, 32); tiang.position.set(0, -20, 0); s.add(tiang);
    var kepala = kotak(THREE, 12, 4, 12, beton); kepala.position.set(0, 4, 0); s.add(kepala);
    var kolom = kotak(THREE, 4, 10, 4, beton); kolom.position.set(0, 11, 0); s.add(kolom);
    var panah = panah3d(A, null, 10); panah.position.set(0, 16, 0); s.add(panah);
    // panah gesekan selimut (ke atas) di sisi tiang yang terlihat, dan tahanan ujung
    var gesek = [], hijau = A.bahan('plastik', [29, 106, 99], { roughness: 0.35, emissive: new THREE.Color(0, 0, 0) });
    [-6, -12, -18, -24, -30, -36].forEach(function (y, i) {
      [0.4, 1.2].forEach(function (sudut) {
        var c = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 14), hijau.clone()); c.position.set(Math.cos(sudut) * 3.6, y, Math.sin(sudut) * 3.6); c.castShadow = true; s.add(c); gesek.push({ m: c, i: i });
      });
    });
    var ujungB = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.4, 24), hijau.clone()); ujungB.position.set(0, -46.5, 0); s.add(ujungB);
    var lb1 = tulisan(A, 'Gesekan selimut', 1.4); lb1.position.set(10, -18, 6); s.add(lb1);
    var lb2 = tulisan(A, 'Tahanan ujung', 1.4); lb2.position.set(9, -46, 6); s.add(lb2);
    var k = { t: 0, jeda: false };
    function atur() {
      gesek.forEach(function (g) { var e = Math.max(0, Math.sin(k.t * 2 - g.i * 0.5)); g.m.material.emissive.setRGB(0.05 * e, 0.3 * e, 0.27 * e); g.m.scale.setScalar(0.8 + 0.4 * e); });
      var e2 = Math.max(0, Math.sin(k.t * 2 - 3.4)); ujungB.material.emissive.setRGB(0.05 * e2, 0.3 * e2, 0.27 * e2);
      denyut(panah, k.t, 1);
      hud.textContent = 'Beban ditahan gesekan selimut di tiap lapisan dan tahanan ujung tiang (gambar)';
    }
    function mulai() { k.t = 0; atur(); }
    function akhir() { k.t = 1; atur(); }
    function langkah(dt) { if (k.jeda) return; k.t += dt; atur(); }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Kalkulator lateral tiang Broms (1 = 20 cm)
  function broms(A, hud) {
    var THREE = A.THREE, s = A.scene;
    tanahL(A, [[0, 20, [158, 132, 98], 'tanah'], [20, 44, [128, 136, 120], 'lempung']], 70, 50);
    var beton = A.bahan('plastik', [176, 178, 172], { roughness: 0.8 });
    var poros = new THREE.Group(); poros.position.set(0, -24, 0); s.add(poros);   // tiang pendek berotasi di sekitar titik ini (gambar)
    var tiang = silinder(THREE, 1.8, 1.8, 34, beton, 28); tiang.position.y = 24 + 4 - 17; poros.add(tiang);
    var panah = new THREE.Group(); poros.add(panah);
    var pb = A.bahan('plastik', [181, 83, 46], { roughness: 0.35, emissive: new THREE.Color(0, 0, 0) });
    var batang = silinder(THREE, 0.8, 0.8, 1, pb, 14); batang.rotation.z = PI / 2; panah.add(batang);
    var ujung = new THREE.Mesh(new THREE.ConeGeometry(2, 3, 20), pb); ujung.rotation.z = -PI / 2; panah.add(ujung);
    panah.userData.bahan = pb;
    var reaksi = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), A.bahan('kaca', [29, 106, 99], { opacity: 0.32 })); s.add(reaksi);
    var lb = tulisan(A, 'Beban lateral', 1.4); s.add(lb);
    var k = { t: 0, jeda: false };
    function atur() {
      var u = 0.5 - 0.5 * Math.cos(k.t * 1.1), pj = 6 + 8 * u;
      batang.scale.y = pj; batang.position.set(-pj / 2 - 3, 0, 0); ujung.position.set(-1.6 + 0.1, 0, 0);
      panah.position.set(-1.8, 24 + 2, 0);
      poros.rotation.z = -0.06 * u;
      // tanah di depan tiang (dekat permukaan) memberi tahanan
      reaksi.scale.set(10 * u + 0.1, 12, 10); reaksi.position.set(1.8 + 5 * u, -6, 0);
      lb.position.set(-14, 6, 6);
      denyut(panah, k.t, u);
      hud.textContent = 'Beban lateral di kepala tiang; tiang berotasi dan tanah di depannya memberi tahanan (gambar moda tiang pendek)';
    }
    function mulai() { k.t = 0; atur(); }
    function akhir() { k.t = PI / 1.1; atur(); }
    function langkah(dt) { if (k.jeda) return; k.t += dt; atur(); }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  // ---------------------------------------------------------------- Kalkulator penurunan konsolidasi (1 = 20 cm)
  function konsolidasiKalk(A, hud) {
    var THREE = A.THREE, s = A.scene;
    var X = 70, Z = 50;
    var pasirAtas = A.bahan('tanah', [194, 166, 108], { tekstur: 'pasir' }), lempung = A.bahan('tanah', [118, 126, 112], { tekstur: 'lempung' }), pasirBawah = A.bahan('tanah', [186, 158, 102], { tekstur: 'pasir' });
    function dua(bhn) {
      var a = kotak(THREE, X, 1, Z / 2, bhn); a.position.z = -Z / 4; s.add(a);
      var b = kotak(THREE, X / 2, 1, Z / 2, bhn); b.position.set(-X / 4, 0, Z / 4); s.add(b);
      return [a, b];
    }
    var lapAtas = dua(pasirAtas), lapLempung = dua(lempung), lapBawah = dua(pasirBawah);
    var timbunan = kotak(THREE, 34, 6, 40, A.bahan('tanah', [150, 124, 90], { tekstur: 'tanah' })); s.add(timbunan);
    var air = [];
    for (var i = 0; i < 24; i++) { var d = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), A.bahan('kaca', [70, 150, 210], { opacity: 0.85 })); d.userData = { x: (Math.random() - 0.5) * 30, z: -Math.random() * 20, f: Math.random(), atas: i % 2 === 0 }; s.add(d); air.push(d); }
    var lb = tulisan(A, 'Lempung', 1.6); lb.position.set(14, -18, 8); s.add(lb);
    var k = { t: 0, jeda: false };
    function letak(pasang, y0, y1) { pasang.forEach(function (m) { m.scale.y = y1 - y0; m.position.y = -(y0 + y1) / 2; }); }
    function atur() {
      var u = 1 - Math.exp(-k.t / 4), turun = 3 * u;     // penurunan cepat di awal lalu melambat (gambar)
      var tebalL = 20 - turun;
      letak(lapAtas, turun, turun + 8); letak(lapLempung, 8 + turun, 8 + turun + tebalL); letak(lapBawah, 28, 40);
      timbunan.position.y = 3 - turun;
      air.forEach(function (d) {
        var g = d.userData, p = (g.f + k.t * 0.25) % 1, ytengah = -(8 + turun + tebalL / 2);
        var yb = g.atas ? -(8 + turun) : -28;
        d.position.set(g.x, ytengah + (yb - ytengah) * p, g.z); d.visible = u < 0.97; d.scale.setScalar(1 - p * 0.5);
      });
      hud.textContent = 'Air pori keluar ke lapisan pasir di atas dan bawah; lempung memampat dan permukaan turun seiring waktu (gambar)';
    }
    function mulai() { k.t = 0; atur(); }
    function akhir() { k.t = 30; atur(); }
    function langkah(dt) { if (k.jeda) return; k.t += dt; atur(); if (k.t > 16) mulai(); }
    langkah.aktif = function () { return !A.hemat && !k.jeda; };
    return { mulai: function () { if (A.hemat) akhir(); else mulai(); }, langkah: langkah, keadaan: k, akhir: akhir };
  }

  var ADEGAN = {
    pemadatan: { buat: proctor, ukuran: 40, lantai: 0, kamera: [66, 58, 92], sasaran: [0, 17, 0], judul: 'Model 3D mould Proctor, penumbuk, timbangan, dan wadah tanah' },
    sondir: { buat: sondir, ukuran: 60, lantai: -52.5, kamera: [118, 58, 150], sasaran: [0, -10, 0], judul: 'Model 3D mesin sondir dengan angker, manometer, dan konus di dalam tanah' },
    cbr: { buat: cbr, ukuran: 50, lantai: 0, kamera: [92, 72, 136], sasaran: [0, 36, 0], judul: 'Model 3D alat CBR: rangka beban, cincin uji, torak penetrasi, dan mould berisi tanah' },
    'sand-cone': { buat: sandCone, ukuran: 45, lantai: -22.2, kamera: [62, 48, 80], sasaran: [0, 4, 0], judul: 'Model 3D kerucut pasir: botol terbalik, corong, pelat, dan lubang galian di tanah terpotong' },
    'geser-langsung': { buat: geserLangsung, ukuran: 45, lantai: 0, kamera: [62, 56, 88], sasaran: [-2, 20, 0], judul: 'Model 3D alat geser langsung: kotak geser terbelah, beban normal, engkol, dan arloji' },
    'tekan-bebas': { buat: tekanBebas, ukuran: 40, lantai: 0, kamera: [70, 54, 102], sasaran: [0, 27, 0], judul: 'Model 3D alat tekan bebas: rangka beban, cincin uji, dan sampel silinder' },
    'konsolidasi-lab': { buat: konsolidasi, ukuran: 50, lantai: 0, kamera: [58, 46, 84], sasaran: [2, 14, 0], judul: 'Model 3D konsolidometer: sel berisi air, cincin dan batu pori, serta lengan beban' },
    atterberg: { buat: atterberg, ukuran: 30, lantai: 0, kamera: [22, 21, 30], sasaran: [-1, 4, 0], judul: 'Model 3D alat batas cair Casagrande dengan engkol, mangkuk berisi tanah beralur, pelat kaca, dan pembuat alur' },
    saringan: { buat: saringan, ukuran: 45, lantai: 0, kamera: [52, 44, 70], sasaran: [3, 18, 0], judul: 'Model 3D susunan saringan No. 4, 10, 40, 200 dan pan di atas mesin pengayak' },
    'berat-spesifik': { buat: piknometer, ukuran: 30, lantai: -3, kamera: [22, 17, 30], sasaran: [-2, 6, 0], judul: 'Model 3D piknometer di atas pelat pemanas, dengan termometer dan botol semprot' },
    'permeabilitas-tetap': { buat: permeabilitas(false), ukuran: 50, lantai: 0, kamera: [74, 56, 108], sasaran: [3, 33, 0], judul: 'Model 3D permeameter tinggi tekan tetap: buret, permeameter berisi tanah, dan gelas ukur' },
    'permeabilitas-turun': { buat: permeabilitas(true), ukuran: 50, lantai: 0, kamera: [74, 56, 108], sasaran: [3, 33, 0], judul: 'Model 3D permeameter tinggi tekan turun: buret, permeameter berisi tanah, dan gelas ukur' },
    spt: { buat: spt, ukuran: 55, lantai: -44.5, kamera: [104, 66, 138], sasaran: [0, 9, 0], judul: 'Model 3D uji SPT: kaki tiga, katrol, palu, batang bor, dan tabung belah di tanah terpotong' },
    'kadar-air': { buat: kadarAir, ukuran: 40, lantai: 0, kamera: [42, 40, 66], sasaran: [0, 9, 0], judul: 'Model 3D uji kadar air: dua cawan, timbangan, dan oven 110 °C' },
    hidrometer: { buat: hidrometer, ukuran: 40, lantai: 0, kamera: [58, 48, 84], sasaran: [3, 24, 0], judul: 'Model 3D analisa hidrometer: gelas ukur 1000 ml berisi suspensi tanah, hidrometer, dan gelas air pembanding' },
    'batas-susut': { buat: batasSusut, ukuran: 25, lantai: 0, kamera: [18, 17, 24], sasaran: [-1, 1.5, 0], judul: 'Model 3D uji batas susut: cawan susut, cawan pencampur, spatula, dan mistar baja di atas pelat kaca' },
    'hubungan-fase': { buat: hubunganFase, ukuran: 30, lantai: 0, kamera: [32, 26, 42], sasaran: [3, 8, 0], judul: 'Model 3D diagram fase: elemen tanah dipisah menjadi udara, air, dan butir' },
    klasifikasi: { buat: klasifikasi, ukuran: 40, lantai: 0, kamera: [26, 34, 62], sasaran: [0, 9, 0], judul: 'Model 3D contoh tanah per kelompok butir: kerikil, pasir, lanau, lempung' },
    'pondasi-dangkal': { buat: pondasiDangkal, ukuran: 55, lantai: -40.5, kamera: [92, 52, 118], sasaran: [0, -6, 0], judul: 'Model 3D pondasi telapak di tanah berlapis yang terpotong, dengan beban kolom dan sebaran tegangan' },
    'tiang-bor': { buat: tiangBor, ukuran: 60, lantai: -52.5, kamera: [104, 50, 132], sasaran: [0, -14, 0], judul: 'Model 3D tiang bor menembus tanah berlapis, dengan gesekan selimut dan tahanan ujung' },
    'broms-lateral': { buat: broms, ukuran: 55, lantai: -44.5, kamera: [96, 44, 122], sasaran: [0, -8, 0], judul: 'Model 3D tiang dengan beban lateral di kepalanya dan tahanan tanah di depannya' },
    konsolidasi: { buat: konsolidasiKalk, ukuran: 55, lantai: -40.5, kamera: [92, 50, 118], sasaran: [0, -12, 0], judul: 'Model 3D timbunan di atas lapisan lempung di antara dua lapisan pasir, dengan aliran air pori' },
    'korelasi-spt': { buat: spt, ukuran: 55, lantai: -44.5, kamera: [104, 66, 138], sasaran: [0, 9, 0], judul: 'Model 3D uji SPT sebagai asal nilai N untuk korelasi' },
    'korelasi-cpt': { buat: sondir, ukuran: 60, lantai: -52.5, kamera: [118, 58, 150], sasaran: [0, -10, 0], judul: 'Model 3D sondir sebagai asal nilai qc dan fs untuk korelasi' }
  };

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
