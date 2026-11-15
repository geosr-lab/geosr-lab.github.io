/*
 * Sampul 3D di kartu katalog (praktikum, kalkulator, beranda). Hanya tampilan: tidak menyentuh hitungan.
 * Satu adegan three.js tersembunyi (adegan3d.js) dipakai bergantian: untuk tiap figure.sketsa-mini[data-sketsa]
 * yang punya model di Alat3D.ADEGAN dan masuk layar, model dibangun dalam keadaan akhir, digambar sekali,
 * disalin ke kanvas 2D di dalam kartu, lalu dibuang. Jadi hanya ada satu konteks WebGL berapa pun jumlah
 * kartunya. Sketsa 2D tetap ada di bawahnya sebagai cadangan (tanpa WebGL, cetak) dan hanya disembunyikan
 * setelah sampul berhasil digambar. Sampul digambar ulang saat tema berganti.
 */
(function (root) {
  'use strict';
  if (!root.Adegan3D || !root.Alat3D || !root.THREE || !('IntersectionObserver' in root)) return;
  var LB = 480, TG = 270, A = null, antre = [], jalan = false, selesai = [];

  function siapkan() {
    if (A) return A;
    var wadah = document.createElement('div');
    wadah.setAttribute('aria-hidden', 'true');
    wadah.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + LB + 'px;height:' + TG + 'px;pointer-events:none;';
    document.body.appendChild(wadah);
    A = root.Adegan3D.buat(wadah, { ukuran: 60, putar: false, zoom: false });
    if (A) A.renderer.setPixelRatio(Math.min(2, root.devicePixelRatio || 1));
    return A;
  }

  function gambar(fig) {
    var def = root.Alat3D.ADEGAN[fig.getAttribute('data-sketsa')];
    if (!def || !siapkan()) return;
    var THREE = A.THREE, grup = new THREE.Group();
    A.scene.add(grup);
    var B = Object.assign({}, A, { scene: grup, hemat: true });
    try {
      var model = def.buat(B, { textContent: '' });
      if (model.akhir) model.akhir();
      A.lantai.position.y = def.lantai || 0;
      // lantai dan kabut memakai warna permukaan kartu supaya sampul menyatu dengan kartunya (terutama tema gelap)
      var muka = A.warnaThree(A.warna.permukaan || [251, 251, 248]);
      A.lantai.material.color.copy(muka);
      A.lantai.material.toneMapped = false; A.lantai.material.needsUpdate = true;
      if (A.scene.fog) A.scene.fog.color.copy(muka);
      A.camera.aspect = LB / TG; A.camera.fov = 34; A.camera.updateProjectionMatrix();
      A.camera.position.fromArray(def.kamera); A.controls.target.fromArray(def.sasaran);
      A.camera.position.lerp(A.controls.target, 0.12);   // sampul sedikit lebih dekat
      A.controls.update();
      A.renderer.render(A.scene, A.camera);
      var kanvas = fig.querySelector('canvas.sampul-3d');
      if (!kanvas) { kanvas = document.createElement('canvas'); kanvas.className = 'sampul-3d'; kanvas.setAttribute('aria-hidden', 'true'); fig.appendChild(kanvas); }
      var src = A.renderer.domElement;
      kanvas.width = src.width; kanvas.height = src.height;
      kanvas.getContext('2d').drawImage(src, 0, 0);
      fig.classList.add('ada-sampul');
      if (selesai.indexOf(fig) < 0) selesai.push(fig);
    } catch (e) { /* model gagal: sketsa 2D tetap tampil */ }
    A.scene.remove(grup);
    grup.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
  }

  function proses() {
    if (!antre.length) { jalan = false; return; }
    jalan = true;
    gambar(antre.shift());
    requestAnimationFrame(proses);
  }
  function masukkan(fig) { if (antre.indexOf(fig) < 0) antre.push(fig); if (!jalan) requestAnimationFrame(proses); }

  var amati = new IntersectionObserver(function (isi) {
    isi.forEach(function (e) { if (e.isIntersecting) { amati.unobserve(e.target); masukkan(e.target); } });
  }, { rootMargin: '200px' });
  function pasang() {
    Array.prototype.forEach.call(document.querySelectorAll('figure.sketsa-mini[data-sketsa]'), function (f) {
      if (root.Alat3D.ADEGAN[f.getAttribute('data-sketsa')]) amati.observe(f);
    });
  }
  // tema berganti: gambar ulang sampul yang sudah ada (warna lantai, kabut, cahaya ikut tema)
  new MutationObserver(function () { setTimeout(function () { selesai.forEach(masukkan); }, 60); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
})(this);
