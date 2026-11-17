/*
 * Antarmuka GeoFEM 3D di GeoSR: formulir proyek, kirim ke pekerja.js (Pyodide), lalu tampilkan
 * model 3D (three.js lewat Adegan3D), ringkasan, dan kurva. Hitungan seluruhnya di solver Python;
 * berkas ini hanya mengumpulkan masukan dan menggambar hasil.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KOLOM = [
    ['gamma_unsat', 'γ<sub>unsat</sub>', 17], ['gamma_sat', 'γ<sub>sat</sub>', 20], ['E', 'E (kPa)', 20000],
    ['nu', 'ν', 0.3], ['c', 'c (kPa)', 5], ['phi', 'φ (°)', 28], ['psi', 'ψ (°)', 0],
    ['E50ref', 'E<sub>50</sub><sup>ref</sup>', 20000], ['Eurref', 'E<sub>ur</sub><sup>ref</sup>', 60000], ['m', 'm', 0.5]
  ];
  var CONTOH = {
    lapisan: [
      { name: 'Pasir', model: 'Mohr-Coulomb', top: 0, bottom: -4, gamma_unsat: 17, gamma_sat: 20, E: 30000, nu: 0.3, c: 1, phi: 32, psi: 2, E50ref: 30000, Eurref: 90000, m: 0.5 },
      { name: 'Lempung', model: 'Mohr-Coulomb', top: -4, bottom: -15, gamma_unsat: 16, gamma_sat: 18, E: 12000, nu: 0.33, c: 12, phi: 24, psi: 0, E50ref: 12000, Eurref: 36000, m: 0.8 }
    ],
    B: 2, L: 2, q: 150, jenis: 'flexible', mat: -2, Lx: 20, Ly: 20, kerapatan: 'kasar', sf: true
  };
  var WARNA_LAPIS = ['--lapis-4', '--lapis-2', '--lapis-1', '--lapis-5', '--lapis-3', '--lapis-6'];
  var BESARAN = [
    ['u', 'Perpindahan total |u| (mm)', 'titik'], ['uz', 'Perpindahan vertikal u<sub>z</sub> (mm)', 'titik'],
    ['szz', "Tegangan vertikal efektif σ'<sub>zz</sub> (kPa, tekan +)", 'muka'],
    ['plastis', 'Titik plastis (fraksi per elemen)', 'muka'], ['du', 'Perpindahan inkremental fase |Δu| (mm)', 'titik']
  ];

  var hasil = null, adegan = null, objek = null, pekerja = null;

  function angka(x, d) {
    if (x === null || x === undefined || !isFinite(x)) return '–';
    return Number(x).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function nilai(id) { return parseFloat(String($(id).value).replace(',', '.')); }

  // ------------------------------------------------------------------ formulir
  function barisLapisan(l) {
    var tr = document.createElement('tr');
    var sel = '<select aria-label="Model tanah"><option>Mohr-Coulomb</option><option>Hardening Soil</option></select>';
    tr.innerHTML = '<td><input aria-label="Nama lapisan" value="' + l.name + '" style="width:8em"></td><td>' + sel + '</td>' +
      '<td><input type="number" step="0.5" aria-label="Puncak (m)" value="' + l.top + '"></td>' +
      '<td><input type="number" step="0.5" aria-label="Dasar (m)" value="' + l.bottom + '"></td>' +
      KOLOM.map(function (k) { return '<td><input type="number" step="any" aria-label="' + k[0] + '" data-k="' + k[0] + '" value="' + l[k[0]] + '"></td>'; }).join('');
    tr.querySelector('select').value = l.model;
    tr.querySelector('select').style.minWidth = '10.5em';
    tr.querySelectorAll('input').forEach(function (i) { i.style.minWidth = '5.5em'; });
    $('lapisan').appendChild(tr);
  }
  function isiContoh() {
    $('lapisan').innerHTML = '';
    CONTOH.lapisan.forEach(barisLapisan);
    $('B').value = CONTOH.B; $('L').value = CONTOH.L; $('q').value = CONTOH.q; $('jenis').value = CONTOH.jenis;
    $('mat').value = CONTOH.mat; $('Lx').value = CONTOH.Lx; $('Ly').value = CONTOH.Ly;
    $('kerapatan').value = CONTOH.kerapatan; $('hitungSF').checked = CONTOH.sf;
    gambarGeometri();
  }
  function bacaLapisan() {
    return Array.prototype.map.call($('lapisan').querySelectorAll('tr'), function (tr) {
      var i = tr.querySelectorAll('input'), l = { name: i[0].value.trim() || 'Lapisan', model: tr.querySelector('select').value,
        top: parseFloat(i[1].value), bottom: parseFloat(i[2].value) };
      tr.querySelectorAll('[data-k]').forEach(function (x) { l[x.dataset.k] = parseFloat(String(x.value).replace(',', '.')); });
      return l;
    });
  }
  function proyek() {
    var lap = bacaLapisan(), nama = {};
    var mats = lap.map(function (l, k) {
      var n = l.name; while (nama[n]) n += "'"; nama[n] = 1; l.name = n;
      var w = Adegan3D.tokenWarna(WARNA_LAPIS[k % 6].slice(2));
      return { name: n, model: l.model, gamma_unsat: l.gamma_unsat, gamma_sat: l.gamma_sat, E: l.E, nu: l.nu, c: l.c,
        phi: l.phi, psi: l.psi, E50ref: l.E50ref, Eoedref: l.E50ref, Eurref: l.Eurref, m: l.m, pref: 100, nu_ur: 0.2, Rf: 0.9,
        color: '#' + w.map(function (v) { return Math.round(v).toString(16).padStart(2, '0'); }).join('') };
    });
    return {
      name: 'GeoFEM 3D di GeoSR', materials: mats, gamma_w: 10,
      borehole: { layers: lap.map(function (l) { return { top: l.top, bottom: l.bottom, material: l.name }; }), water_level: nilai('mat') },
      domain: { Lx: nilai('Lx'), Ly: nilai('Ly'), symmetry: true },
      footing: { B: nilai('B'), L: nilai('L'), q: nilai('q'), kind: $('jenis').value },
      mesh: {}, phases: { method: 'modified_newton', run_safety: $('hitungSF').checked }
    };
  }

  // ------------------------------------------------------------------ 3D
  function siapkanAdegan() {
    if (adegan || !window.Adegan3D) return adegan;
    adegan = Adegan3D.buat($('panggung'), { kamera: [62, 34, 70], sasaran: [0, -16, 0], ukuran: 46, lantai: -40.5, jarakMin: 30, jarakMaks: 220, putar: false });
    if (!adegan) $('panggung').innerHTML = '<p class="catatan">Browser ini tidak mendukung WebGL, jadi model 3D tidak bisa digambar. Ringkasan dan kurva tetap tersedia.</p>';
    return adegan;
  }
  function skala(p) { return 46 / Math.max(p.domain.Lx, p.domain.Ly, p.borehole.layers[0].top - p.borehole.layers[p.borehole.layers.length - 1].bottom); }
  function buang() {
    if (objek && adegan) { adegan.scene.remove(objek); objek.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    objek = null;
  }
  function gambarGeometri() {
    var A = siapkanAdegan(); if (!A) return;
    var T = A.THREE, p = proyek(), s = skala(p), z0 = p.borehole.layers[0].top;
    buang(); objek = new T.Group();
    p.borehole.layers.forEach(function (l, k) {
      var h = (l.top - l.bottom) * s;
      if (!(h > 0)) return;
      var m = new T.Mesh(new T.BoxGeometry(p.domain.Lx * s, h, p.domain.Ly * s),
        new T.MeshStandardMaterial({ color: A.warnaThree(Adegan3D.rgbCss(p.materials[k].color)), roughness: 0.9, transparent: true, opacity: 0.82 }));
      m.position.y = ((l.top + l.bottom) / 2 - z0) * s; m.castShadow = m.receiveShadow = true; objek.add(m);
    });
    var f = new T.Mesh(new T.BoxGeometry(p.footing.B * s, 0.8, p.footing.L * s), new T.MeshStandardMaterial({ color: A.warnaThree(Adegan3D.tokenWarna('teks-2')) }));
    f.position.y = 0.4; objek.add(f);
    A.scene.add(objek); A.gambar();
    $('ketPanggung').textContent = 'Geometri model. Seret untuk memutar, gulir di dalam model untuk memperbesar.';
  }
  function warnaSkala(t, A) {
    var c = [Adegan3D.tokenWarna('aksen'), Adegan3D.tokenWarna('lapis-4'), Adegan3D.tokenWarna('laterit')];
    t = Math.max(0, Math.min(1, t)); var i = t < 0.5 ? 0 : 1, f = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    return A.warnaThree([0, 1, 2].map(function (j) { return c[i][j] + (c[i + 1][j] - c[i][j]) * f; }));
  }
  function gambarHasil() {
    var A = siapkanAdegan(); if (!A || !hasil) return;
    var T = A.THREE, ph = hasil.fase[+$('fase').value], kode = $('besaran').value, jenis = BESARAN.filter(function (b) { return b[0] === kode; })[0];
    var potong = $('tampilan').value === 'potong';
    var P = hasil.titik, S = potong ? hasil.segitiga_potong : hasil.segitiga, U = ph.u, n = P.length / 3, nilaiT, nilaiM, i;
    var p = proyek(), s = skala(p), z0 = p.borehole.layers[0].top;
    if (jenis[2] === 'titik') {
      nilaiT = new Float32Array(n);
      for (i = 0; i < n; i++) {
        var ux = (kode === 'du' ? ph.du : U);
        nilaiT[i] = kode === 'uz' ? U[3 * i + 2] : Math.hypot(ux[3 * i], ux[3 * i + 1], ux[3 * i + 2]);
      }
    } else nilaiM = ph[potong ? kode + '_p' : kode];
    var arr;
    if (nilaiT) {   // skala warna hanya dari titik yang tampil
      arr = []; for (i = 0; i < S.length; i++) arr.push(nilaiT[S[i]]);
    } else arr = Array.prototype.slice.call(nilaiM);
    var lo = Infinity, hi = -Infinity;
    for (i = 0; i < arr.length; i++) { if (arr[i] < lo) lo = arr[i]; if (arr[i] > hi) hi = arr[i]; }
    if (hi - lo < 1e-12) hi = lo + 1;
    var umax = 0; for (i = 0; i < U.length; i++) umax = Math.max(umax, Math.abs(U[i]));
    var fk = umax > 0 ? 0.06 * Math.max(p.domain.Lx, p.domain.Ly) * 1000 / umax : 0;
    var pos = new Float32Array(S.length * 3), col = new Float32Array(S.length * 3);
    for (i = 0; i < S.length; i++) {
      var v = S[i], x = P[3 * v] + fk * U[3 * v] / 1000, y = P[3 * v + 1] + fk * U[3 * v + 1] / 1000, z = P[3 * v + 2] + fk * U[3 * v + 2] / 1000;
      pos[3 * i] = x * s; pos[3 * i + 1] = (z - z0) * s; pos[3 * i + 2] = -y * s;
      var w = nilaiT ? nilaiT[v] : nilaiM[Math.floor(i / 3)], c = warnaSkala((w - lo) / (hi - lo), A);
      col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b;
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.computeVertexNormals();
    buang(); objek = new T.Group();
    var m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: T.DoubleSide }));
    m.castShadow = m.receiveShadow = true; objek.add(m);
    A.scene.add(objek); A.gambar();
    $('legenda').innerHTML = '<span>' + angka(lo, 2) + '</span><span aria-hidden="true" style="flex:1;height:10px;border-radius:4px;background:linear-gradient(90deg,var(--aksen),var(--lapis-4),var(--laterit))"></span><span>' + angka(hi, 2) + '</span>';
    $('ketPanggung').innerHTML = ph.nama + '. ' + jenis[1] + '. Deformasi diperbesar ' + angka(fk, 0) + '×.';
  }

  // ------------------------------------------------------------------ kurva dan ringkasan
  function kurva() {
    var ph = hasil.fase[+$('fase').value], sf = ph.kode === 'Safety';
    var src = sf ? ph : hasil.fase.filter(function (f) { return f.kode === 'Load'; })[0];
    if (!src || src.kurva.length < 2) { $('kurva').innerHTML = '<p class="kecil redup">Belum ada kurva untuk fase ini.</p>'; return; }
    var pts = src.kurva.map(function (c) { return [c[1] * 1000, c[0]]; });
    var W = 320, H = 220, ml = 46, mb = 34, mt = 10, mr = 10;
    var xmax = Math.max.apply(null, pts.map(function (q) { return q[0]; })) || 1, ymax = Math.max.apply(null, pts.map(function (q) { return q[1]; })) || 1;
    var ymin = sf ? 1 : 0;
    var X = function (v) { return ml + (W - ml - mr) * v / xmax; }, Y = function (v) { return H - mb - (H - mb - mt) * (v - ymin) / ((ymax - ymin) || 1); };
    var garis = pts.map(function (q, k) { return (k ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1); }).join(' ');
    var titik = pts.map(function (q) { return '<circle cx="' + X(q[0]).toFixed(1) + '" cy="' + Y(q[1]).toFixed(1) + '" r="2.6"/>'; }).join('');
    $('kurvaJudul').textContent = sf ? 'Kurva reduksi φ-c' : 'Kurva beban-penurunan';
    $('kurva').innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (sf ? 'Kurva ΣMsf terhadap perpindahan' : 'Kurva beban terhadap penurunan pondasi') + '" style="width:100%;height:auto">' +
      '<rect x="' + ml + '" y="' + mt + '" width="' + (W - ml - mr) + '" height="' + (H - mb - mt) + '" fill="var(--permukaan-2)"/>' +
      '<path d="' + garis + '" fill="none" stroke="var(--' + (sf ? 'laterit' : 'aksen') + ')" stroke-width="2"/>' +
      '<g fill="var(--' + (sf ? 'laterit' : 'aksen') + ')">' + titik + '</g>' +
      '<g fill="var(--teks-2)" font-size="11">' +
      '<text x="' + ml + '" y="' + (H - 8) + '">0</text><text x="' + (W - mr) + '" y="' + (H - 8) + '" text-anchor="end">' + angka(xmax, 1) + ' mm</text>' +
      '<text x="' + (ml - 6) + '" y="' + (mt + 10) + '" text-anchor="end">' + angka(ymax, sf ? 2 : 0) + '</text>' +
      '<text x="' + (ml - 6) + '" y="' + (H - mb) + '" text-anchor="end">' + angka(ymin, sf ? 2 : 0) + '</text>' +
      '<text x="' + ((W + ml) / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + (sf ? '|Δu| maks.' : 'penurunan pondasi') + '</text>' +
      '<text transform="translate(12 ' + ((H - mb) / 2) + ') rotate(-90)" text-anchor="middle">' + (sf ? 'ΣMsf' : 'q (kPa)') + '</text></g></svg>';
  }
  function ringkas() {
    var r = hasil.ringkasan, kartu = function (judul, isi, satuan) {
      return '<div class="kartu"><p class="kecil redup" style="margin:0">' + judul + '</p><p class="nilai-besar">' + isi + (satuan ? ' <small>' + satuan + '</small>' : '') + '</p></div>';
    };
    $('ringkasan').innerHTML = kartu('Penurunan pondasi', angka(r.penurunan_pondasi_mm, 2), 'mm') +
      kartu('Angka keamanan SF', r.SF === null ? 'tidak dihitung' : angka(r.SF, 3), '') +
      kartu('Beban tercapai', angka(r.beban_tercapai_kPa, 1), 'dari ' + angka(r.q_kPa, 1) + ' kPa') +
      kartu('Jaring', angka(r.jaring.elemen, 0), 'elemen tet-10, ' + angka(r.waktu_s, 1) + ' detik');
    $('log').textContent = hasil.log.join('\n');
    $('fase').innerHTML = hasil.fase.map(function (f, k) { return '<option value="' + k + '">' + (f.ok ? '' : '(gagal) ') + f.nama + '</option>'; }).join('');
    $('fase').value = String(Math.min(1, hasil.fase.length - 1));
  }

  // ------------------------------------------------------------------ hitung
  function hitung() {
    var p = proyek();
    $('galat').hidden = true;
    if (!pekerja) {
      pekerja = new Worker('../assets/geofem3d/pekerja.js');
      pekerja.onmessage = function (e) {
        var d = e.data;
        if (d.jenis === 'status') { $('bilah').value = Math.round(1000 * (d.frac || 0)); $('status').textContent = d.teks; return; }
        $('hitung').disabled = false;
        if (d.jenis === 'galat') { tampilGalat('Hitungan berhenti: ' + d.teks); return; }
        var out = JSON.parse(d.data);
        if (out.galat) { tampilGalat(out.galat.join(' ')); return; }
        hasil = out; $('hasil').hidden = false; ringkas(); gambarHasil(); kurva();
        $('status').textContent = 'Selesai. ' + hasil.fase[hasil.fase.length - 1].pesan;
        $('bilah').value = 1000;
      };
      pekerja.onerror = function (e) { $('hitung').disabled = false; tampilGalat('Pekerja hitungan gagal dimuat: ' + (e.message || 'galat tidak diketahui')); };
    }
    $('hitung').disabled = true; $('bilah').value = 0; $('status').textContent = 'Menyiapkan ...';
    pekerja.postMessage({ proyek: JSON.stringify(p), kerapatan: $('kerapatan').value });
  }
  function tampilGalat(t) { $('galat').hidden = false; $('galat').textContent = t; $('status').textContent = ''; }

  function mulai() {
    $('besaran').innerHTML = BESARAN.map(function (b) { return '<option value="' + b[0] + '">' + b[1].replace(/<[^>]+>/g, '') + '</option>'; }).join('');
    isiContoh();
    $('muatContoh').addEventListener('click', isiContoh);
    $('tambah').addEventListener('click', function () {
      var l = bacaLapisan(), akhir = l.length ? l[l.length - 1].bottom : 0;
      barisLapisan({ name: 'Tanah ' + (l.length + 1), model: 'Mohr-Coulomb', top: akhir, bottom: akhir - 5, gamma_unsat: 17, gamma_sat: 19, E: 20000, nu: 0.3, c: 5, phi: 28, psi: 0, E50ref: 20000, Eurref: 60000, m: 0.5 });
      gambarGeometri();
    });
    $('hapus').addEventListener('click', function () { var t = $('lapisan'); if (t.rows.length > 1) { t.deleteRow(-1); gambarGeometri(); } });
    $('formulir').addEventListener('change', function () { if (!hasil) gambarGeometri(); });
    $('hitung').addEventListener('click', hitung);
    $('fase').addEventListener('change', function () { gambarHasil(); kurva(); });
    $('besaran').addEventListener('change', gambarHasil);
    $('tampilan').addEventListener('change', gambarHasil);
    $('awal').addEventListener('click', function () { if (adegan) adegan.keRumah(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
})();
