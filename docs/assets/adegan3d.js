/*
 * Mesin adegan 3D bersama GeoSR (dipakai blok3d.js di beranda dan alat3d.js di halaman alat praktikum).
 * Hanya tampilan: tidak menyentuh hitungan. Membutuhkan three.js r147 dan OrbitControls (docs/assets/vendor/three/,
 * lisensi MIT, dicatat di kredit.json).
 *
 * Adegan3D.buat(wadah, opsi) membuat renderer WebGL dengan:
 *   - cahaya langit (hemisphere) + matahari dari kiri atas dengan bayangan lembut (PCFSoft) + cahaya isi dingin;
 *   - tone mapping ACES dan sRGB (color grading yang sama di semua adegan), kabut tipis warna latar;
 *   - lantai bundar penerima bayangan dengan kisi milimeter samar;
 *   - kamera orbit dengan redaman, sudut tegak dibatasi supaya bentuk tidak pernah terlihat dari bawah atau
 *     terbalik, putar otomatis pelan saat dibiarkan (mati bila prefers-reduced-motion);
 *   - warna mengikuti token CSS dan tema (terang/gelap); berhenti menggambar saat tab tersembunyi atau di luar layar.
 * Mengembalikan { THREE, scene, camera, controls, renderer, warna, bahan, teksturTanah, terbangKe, padaBingkai, gambar }.
 */
(function (root) {
  'use strict';
  var THREE = root.THREE;

  function rgbCss(t) {
    t = String(t || '').trim();
    var m;
    if (t.charAt(0) === '#') {
      if (t.length === 4) t = '#' + t[1] + t[1] + t[2] + t[2] + t[3] + t[3];
      return [parseInt(t.substr(1, 2), 16), parseInt(t.substr(3, 2), 16), parseInt(t.substr(5, 2), 16)];
    }
    if ((m = t.match(/color\(srgb\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)/))) return [m[1] * 255, m[2] * 255, m[3] * 255];
    if ((m = t.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/))) return [+m[1], +m[2], +m[3]];
    return [128, 128, 128];
  }
  function warnaThree(c) { return new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255).convertSRGBToLinear(); }
  function tokenWarna(nama) { return rgbCss(getComputedStyle(document.documentElement).getPropertyValue('--' + nama)); }
  function apakahGelap() { var c = tokenWarna('latar'); return (c[0] + c[1] + c[2]) / 3 < 100; }

  // Tekstur tanah: bintik terang/gelap dan butir kecil di kanvas, diulang; warna diberi lewat material.
  var cacheTekstur = {};
  function teksturTanah(jenis) {
    jenis = jenis || 'tanah';
    if (cacheTekstur[jenis]) return cacheTekstur[jenis];
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var g = c.getContext('2d'), benih = jenis.length * 977 + 13;
    var acak = function () { benih = (benih * 16807) % 2147483647; return benih / 2147483647; };
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 256, 256);
    var n = jenis === 'pasir' ? 9000 : jenis === 'batu' ? 2500 : 6000;
    for (var i = 0; i < n; i++) {
      var gelap = acak() < 0.55, a = 0.08 + acak() * 0.22, r = jenis === 'batu' ? 1 + acak() * 4 : jenis === 'pasir' ? 0.6 + acak() * 1.2 : 0.8 + acak() * 2;
      g.fillStyle = gelap ? 'rgba(40,30,20,' + a + ')' : 'rgba(255,255,255,' + a + ')';
      g.beginPath(); g.arc(acak() * 256, acak() * 256, r, 0, Math.PI * 2); g.fill();
    }
    if (jenis === 'lempung') {
      g.strokeStyle = 'rgba(40,30,20,.12)'; g.lineWidth = 1;
      for (var k = 0; k < 14; k++) { var y = acak() * 256; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + 6, 170, y - 6, 256, y + 2); g.stroke(); }
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    cacheTekstur[jenis] = t;
    return t;
  }

  function teksturKisi(warnaGaris) {
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
    for (var i = 0; i <= 256; i += 16) {
      g.fillStyle = i % 64 === 0 ? warnaGaris.tebal : warnaGaris.halus;
      g.fillRect(i, 0, i % 64 === 0 ? 2 : 1, 256); g.fillRect(0, i, 256, i % 64 === 0 ? 2 : 1);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function buat(wadah, opsi) {
    opsi = opsi || {};
    if (!THREE || !THREE.OrbitControls) return null;
    var uji = document.createElement('canvas');
    if (!(uji.getContext('webgl2') || uji.getContext('webgl'))) return null;
    var hemat = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = 'kanvas-3d';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    wadah.insertBefore(renderer.domElement, wadah.firstChild);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(opsi.fov || 34, 1, 0.1, 2000);
    var rumah = { pos: new THREE.Vector3().fromArray(opsi.kamera || [60, 45, 80]), tgt: new THREE.Vector3().fromArray(opsi.sasaran || [0, 8, 0]) };
    camera.position.copy(rumah.pos);

    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(rumah.tgt);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = opsi.zoom !== false;
    controls.minDistance = opsi.jarakMin || 20; controls.maxDistance = opsi.jarakMaks || 260;
    // sudut tegak dibatasi: tidak pernah tepat dari atas dan tidak pernah dari bawah lantai
    controls.minPolarAngle = opsi.polarMin != null ? opsi.polarMin : 0.45;
    controls.maxPolarAngle = opsi.polarMaks != null ? opsi.polarMaks : 1.38;
    controls.autoRotate = !hemat && opsi.putar !== false;
    controls.autoRotateSpeed = opsi.lajuPutar || 0.6;
    controls.update();

    var langit = new THREE.HemisphereLight(0xffffff, 0x5a6268, 0.75);
    scene.add(langit);
    var matahari = new THREE.DirectionalLight(0xfff1dd, 1.05);
    var u = opsi.ukuran || 60;
    matahari.position.set(-u * 0.7, u * 1.6, u * 0.9);   // kiri atas depan
    matahari.castShadow = true;
    matahari.shadow.mapSize.set(2048, 2048);
    Object.assign(matahari.shadow.camera, { left: -u * 1.3, right: u * 1.3, top: u * 1.3, bottom: -u * 1.3, near: 1, far: u * 5 });
    matahari.shadow.bias = -0.0004; matahari.shadow.normalBias = 0.02; matahari.shadow.radius = 4;
    scene.add(matahari);
    var isi = new THREE.DirectionalLight(0xbfd8e0, 0.35);   // cahaya isi dingin dari kanan belakang
    isi.position.set(u, u * 0.5, -u);
    scene.add(isi);

    var lantaiBahan = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
    var lantai = new THREE.Mesh(new THREE.CircleGeometry(u * 2.6, 72), lantaiBahan);
    lantai.rotation.x = -Math.PI / 2; lantai.position.y = opsi.lantai || 0; lantai.receiveShadow = true;
    scene.add(lantai);

    var warna = {};
    function terapkanTema() {
      var gelap = apakahGelap();
      ['latar', 'permukaan', 'permukaan-2', 'teks', 'teks-2', 'aksen', 'laterit', 'garis', 'lapis-1', 'lapis-2', 'lapis-3', 'lapis-4', 'lapis-5', 'lapis-6'].forEach(function (n) { warna[n] = tokenWarna(n); });
      warna.gelap = gelap;
      var latar = warna.latar;
      scene.fog = new THREE.Fog(warnaThree(latar), u * 2.2, u * 5.5);
      lantaiBahan.color.copy(warnaThree(gelap ? [latar[0] + 8, latar[1] + 10, latar[2] + 10] : warna.permukaan));
      var a = warna.aksen;
      lantaiBahan.map = teksturKisi({ tebal: 'rgba(' + a.join(',') + ',' + (gelap ? 0.28 : 0.2) + ')', halus: 'rgba(' + a.join(',') + ',' + (gelap ? 0.12 : 0.08) + ')' });
      lantaiBahan.map.repeat.set(u / 9, u / 9);
      lantaiBahan.needsUpdate = true;
      langit.intensity = gelap ? 0.5 : 0.75;
      langit.groundColor.copy(warnaThree(gelap ? [20, 28, 30] : [90, 98, 104]));
      matahari.intensity = gelap ? 0.75 : 1.05;
      matahari.color.copy(gelap ? new THREE.Color(0xd6e6ff) : new THREE.Color(0xfff1dd));
      if (opsi.padaTema) opsi.padaTema(warna);
      gambar();
    }

    // bahan: logam, plastik, kaca, tanah (warna dari token atau heksadesimal)
    function bahan(jenis, warnaDasar, lain) {
      var c = Array.isArray(warnaDasar) ? warnaThree(warnaDasar) : new THREE.Color(warnaDasar);
      var o = { color: c };
      if (jenis === 'logam') Object.assign(o, { metalness: 0.55, roughness: 0.32 });
      else if (jenis === 'kaca') Object.assign(o, { metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
      else if (jenis === 'tanah') Object.assign(o, { metalness: 0, roughness: 0.95, map: teksturTanah(lain && lain.tekstur) });
      else Object.assign(o, { metalness: 0.05, roughness: 0.55 });
      if (lain) { var l = Object.assign({}, lain); delete l.tekstur; Object.assign(o, l); }
      return new THREE.MeshStandardMaterial(o);
    }

    // ---------------------------------------------------- putaran gambar: hanya saat perlu
    var tampak = true, jalan = false, padaBingkai = [], akhir = 0, terbang = null, diamSejak = 0, berinteraksi = false;
    function perlu() { return controls.autoRotate || terbang || berinteraksi || padaBingkai.some(function (f) { return f.aktif && f.aktif(); }); }
    function gambar() {
      if (jalan || !tampak || document.hidden) return;
      jalan = true; akhir = performance.now();
      requestAnimationFrame(bingkai);
    }
    function bingkai(kini) {
      var dt = Math.min(0.05, (kini - akhir) / 1000); akhir = kini;
      if (terbang) {
        terbang.k = Math.min(1, terbang.k + dt / 0.9);
        var e = 1 - Math.pow(1 - terbang.k, 3);
        camera.position.lerpVectors(terbang.p0, terbang.p1, e);
        controls.target.lerpVectors(terbang.t0, terbang.t1, e);
        if (terbang.k >= 1) terbang = null;
      }
      if (!hemat && opsi.putar !== false && !controls.autoRotate && !berinteraksi && kini - diamSejak > 4000) controls.autoRotate = true;
      padaBingkai.forEach(function (f) { f(dt, kini); });
      var berubah = controls.update();
      renderer.render(scene, camera);
      if ((perlu() || berubah) && tampak && !document.hidden) requestAnimationFrame(bingkai);
      else jalan = false;
    }
    controls.addEventListener('start', function () { berinteraksi = true; controls.autoRotate = false; terbang = null; gambar(); });
    controls.addEventListener('end', function () { berinteraksi = false; diamSejak = performance.now(); gambar(); });
    controls.addEventListener('change', gambar);

    function terbangKe(pos, tgt) {
      var p1 = new THREE.Vector3().fromArray(pos), t1 = new THREE.Vector3().fromArray(tgt);
      if (hemat) { camera.position.copy(p1); controls.target.copy(t1); controls.update(); gambar(); return; }
      terbang = { k: 0, p0: camera.position.clone(), t0: controls.target.clone(), p1: p1, t1: t1 };
      gambar();
    }
    function keRumah() { terbangKe(rumah.pos.toArray(), rumah.tgt.toArray()); }

    function ukur() {
      var w = wadah.clientWidth, h = wadah.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // layar sempit: mundurkan kamera supaya benda tetap utuh
      camera.fov = (opsi.fov || 34) * (w / h < 0.9 ? 1.25 : 1);
      camera.updateProjectionMatrix();
      gambar();
    }
    if ('ResizeObserver' in root) new ResizeObserver(ukur).observe(wadah); else root.addEventListener('resize', ukur);
    if ('IntersectionObserver' in root) new IntersectionObserver(function (e) { tampak = e[0].isIntersecting; if (tampak) gambar(); }).observe(wadah);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) gambar(); });
    new MutationObserver(terapkanTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
    if (root.matchMedia) {
      var mq = root.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', terapkanTema); else if (mq.addListener) mq.addListener(terapkanTema);
    }

    var hasil = {
      THREE: THREE, scene: scene, camera: camera, controls: controls, renderer: renderer, warna: warna, hemat: hemat,
      bahan: bahan, warnaThree: warnaThree, teksturTanah: teksturTanah, terbangKe: terbangKe, keRumah: keRumah,
      padaBingkai: padaBingkai, gambar: gambar, lantai: lantai,
      putarOtomatis: function (nyala) { opsi.putar = nyala; controls.autoRotate = !hemat && nyala; gambar(); }
    };
    setTimeout(function () { terapkanTema(); ukur(); }, 0);
    terapkanTema();
    ukur();
    return hasil;
  }

  root.Adegan3D = { buat: buat, rgbCss: rgbCss, tokenWarna: tokenWarna };
})(this);
