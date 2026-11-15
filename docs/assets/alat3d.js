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

  var ADEGAN = {
    pemadatan: { buat: proctor, ukuran: 40, lantai: 0, kamera: [66, 58, 92], sasaran: [0, 17, 0], judul: 'Model 3D mould Proctor, penumbuk, timbangan, dan wadah tanah' },
    sondir: { buat: sondir, ukuran: 60, lantai: -52.5, kamera: [118, 58, 150], sasaran: [0, -10, 0], judul: 'Model 3D mesin sondir dengan angker, manometer, dan konus di dalam tanah' },
    cbr: { buat: cbr, ukuran: 50, lantai: 0, kamera: [92, 72, 136], sasaran: [0, 36, 0], judul: 'Model 3D alat CBR: rangka beban, cincin uji, torak penetrasi, dan mould berisi tanah' },
    'sand-cone': { buat: sandCone, ukuran: 45, lantai: -22.2, kamera: [62, 48, 80], sasaran: [0, 4, 0], judul: 'Model 3D kerucut pasir: botol terbalik, corong, pelat, dan lubang galian di tanah terpotong' },
    'geser-langsung': { buat: geserLangsung, ukuran: 45, lantai: 0, kamera: [62, 56, 88], sasaran: [-2, 20, 0], judul: 'Model 3D alat geser langsung: kotak geser terbelah, beban normal, engkol, dan arloji' },
    'tekan-bebas': { buat: tekanBebas, ukuran: 40, lantai: 0, kamera: [70, 54, 102], sasaran: [0, 27, 0], judul: 'Model 3D alat tekan bebas: rangka beban, cincin uji, dan sampel silinder' },
    'konsolidasi-lab': { buat: konsolidasi, ukuran: 50, lantai: 0, kamera: [58, 46, 84], sasaran: [2, 14, 0], judul: 'Model 3D konsolidometer: sel berisi air, cincin dan batu pori, serta lengan beban' }
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
