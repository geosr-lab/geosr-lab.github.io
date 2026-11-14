/*
 * CBR laboratorium (SNI 1744:2012, mengacu AASHTO T 193 dan ASTM D1883).
 *
 * Tegangan penetrasi  σ = P / A_piston.
 * CBR = σ / σ_standar × 100%, dengan σ_standar 6,9 MPa (1000 psi) pada 2,54 mm dan 10,3 MPa (1500 psi) pada 5,08 mm
 * (ASTM D1883). Luas piston standar 1935 mm² (3 in²). Beban pada penetrasi yang tidak dibaca langsung diinterpolasi linier.
 * Koreksi titik nol bila awal kurva cekung ke atas: garis singgung pada bagian tercuram diperpanjang ke sumbu penetrasi;
 * titik potongnya menjadi titik nol baru, lalu beban dibaca pada 2,54 + x0 dan 5,08 + x0 mm.
 * Pengembangan = (bacaan akhir − bacaan awal) × satuan arloji / tinggi benda uji × 100%.
 * Berat isi: γ = (W cetakan+tanah − W cetakan) / V,  γd = γ / (1 + w).
 * Form CBR lab UNJA: HARGA CBR = P / 13,35 × 100 (2,54 mm) dan P / 20,02 × 100 (5,08 mm), P dalam kN,
 * dihitung langsung bila m.bebanStd = [13,35, 20,02] (setara σ / σ_standar dengan σ_standar = 13,35 kN / A dan
 * 20,02 kN / A). Beban pada 2,54 dan 5,08 mm diinterpolasi linier dari kolom penurunan, seperti contoh laporan.
 * hitungCetakan: beberapa cetakan (mis. 3 × 10, 3 × 30, 3 × 65 tumbukan), masing-masing dengan permukaan atas/bawah
 * dan kadar air serta berat isi sebelum/sesudah.
 */
(function (root) {
  'use strict';

  var node = typeof module !== 'undefined' && module.exports;
  var D = node ? require('./hitung-dasar.js') : root.HitungDasar;

  // Beban pada penetrasi x dari titik (penetrasi, beban) terurut, interpolasi linier.
  function bebanPada(titik, x) {
    for (var i = 0; i < titik.length - 1; i++) {
      var a = titik[i], b = titik[i + 1];
      if (x >= a.x - 1e-12 && x <= b.x + 1e-12) return b.x === a.x ? b.y : a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
    }
    return null;
  }

  // Dua titik yang mengapit penetrasi x (untuk menulis langkah interpolasi).
  function segmenPada(titik, x) {
    for (var i = 0; i < titik.length - 1; i++) {
      var a = titik[i], b = titik[i + 1];
      if (x >= a.x - 1e-12 && x <= b.x + 1e-12 && b.x > a.x) return [a, b];
    }
    return null;
  }

  // Koreksi titik nol: garis singgung melalui segmen tercuram sebelum 5,08 mm.
  function koreksiNol(titik) {
    var terbaik = -1, lereng = 0;
    for (var i = 0; i < titik.length - 1 && titik[i].x < 5.08; i++) {
      if (!(titik[i + 1].x > titik[i].x)) continue; // titik dengan penurunan sama (mis. dudukan di 0 mm) tidak membentuk lereng
      var m = (titik[i + 1].y - titik[i].y) / (titik[i + 1].x - titik[i].x);
      if (m > lereng) { lereng = m; terbaik = i; }
    }
    if (terbaik <= 0) return { x0: 0, segmen: terbaik, lereng: lereng };
    var x0 = titik[terbaik].x - titik[terbaik].y / lereng;
    return { x0: Math.max(0, x0), segmen: terbaik, lereng: lereng };
  }

  function satuSet(nama, bacaan, m) {
    var titik = bacaan.map(function (b) { return { x: b.penetrasi, y: b.beban }; }).sort(function (a, b) { return a.x - b.x; });
    if (!titik.length || titik[0].x > 0) titik.unshift({ x: 0, y: 0 });
    var kor = m.koreksi === 'tidak' ? { x0: 0, segmen: -1, lereng: 0 } : koreksiNol(titik);
    if (m.koreksiManual >= 0 && m.koreksi === 'manual') kor = { x0: m.koreksiManual, segmen: -1, lereng: 0, manual: true };
    var x1 = 2.54 + kor.x0, x2 = 5.08 + kor.x0;
    var P1 = bebanPada(titik, x1), P2 = bebanPada(titik, x2);
    var hasil = { nama: nama, titik: titik, koreksi: kor, x1: x1, x2: x2, P1: P1, P2: P2, seg1: segmenPada(titik, x1), seg2: segmenPada(titik, x2) };
    // Form lab: CBR = P / beban standar × 100 langsung; ASTM D1883: CBR = (P / A) / tegangan standar × 100.
    var B = m.bebanStd;
    if (P1 !== null) { hasil.s1 = P1 * 1000 / m.A; hasil.CBR1 = B ? P1 / B[0] * 100 : hasil.s1 / m.std1 * 100; }
    if (P2 !== null) { hasil.s2 = P2 * 1000 / m.A; hasil.CBR2 = B ? P2 / B[1] * 100 : hasil.s2 / m.std2 * 100; }
    if (hasil.CBR1 !== undefined) {
      hasil.CBR = hasil.CBR2 !== undefined && hasil.CBR2 > hasil.CBR1 ? hasil.CBR2 : hasil.CBR1;
      hasil.dari = hasil.CBR2 !== undefined && hasil.CBR2 > hasil.CBR1 ? 5.08 : 2.54;
    }
    return hasil;
  }

  function hitung(m) {
    var galat = [], peringatan = [];
    if (!(m.A > 0)) galat.push('Isi luas piston.');
    if (!m.bebanStd && !(m.std1 > 0 && m.std2 > 0)) galat.push('Isi tegangan standar pada 2,54 mm dan 5,08 mm.');
    var set = [];
    [['Atas', m.atas], ['Bawah', m.bawah]].forEach(function (s) {
      if (!s[1] || !s[1].length) return;
      s[1].forEach(function (b) { if (!(b.penetrasi >= 0) || !(b.beban >= 0)) galat.push(s[0] + ' baris ' + b.no + ': penetrasi dan beban tidak boleh negatif.'); });
      set.push(s);
    });
    if (!set.length) galat.push('Isi bacaan beban penetrasi minimal untuk satu permukaan.');
    if (galat.length) return { galat: galat };
    var hasil = { galat: [], peringatan: peringatan, set: set.map(function (s) { return satuSet(s[0], s[1], m); }) };
    hasil.set.forEach(function (s) {
      if (s.P1 === null) peringatan.push(s.nama + ': bacaan belum mencapai ' + (2.54 + s.koreksi.x0).toFixed(2).replace('.', ',') + ' mm.');
      else if (s.P2 === null) peringatan.push(s.nama + ': bacaan belum mencapai ' + (5.08 + s.koreksi.x0).toFixed(2).replace('.', ',') + ' mm, jadi CBR 5,08 mm tidak dihitung.');
      if (s.CBR2 !== undefined && s.CBR2 > s.CBR1) {
        peringatan.push(s.nama + ': CBR pada 5,08 mm lebih besar dari 2,54 mm. ASTM D1883 meminta pengujian diulang; bila hasilnya serupa, nilai 5,08 mm yang dipakai (seperti di sini).');
      }
    });
    var nilai = hasil.set.filter(function (s) { return s.CBR !== undefined; }).map(function (s) { return s.CBR; });
    if (nilai.length) hasil.CBR = D.rata(nilai);

    // Berat isi dan kadar air sebelum/sesudah perendaman
    hasil.kondisi = kondisiDari(m.kondisi);
    var awal = hasil.kondisi.filter(function (k) { return k.gammaD !== undefined; })[0];
    if (awal && m.gdmaks > 0) hasil.D = awal.gammaD / m.gdmaks * 100;

    // Pengembangan
    var sw = pengembangan(m.swell, m.H0, m.satuanArloji);
    if (sw) {
      hasil.swell = sw.swell; hasil.pengembangan = sw.pengembangan;
      if (sw.pengembangan < 0) peringatan.push('Pengembangan negatif: bacaan akhir lebih kecil dari bacaan awal. Periksa arah arloji.');
    }
    return hasil;
  }

  function kondisiDari(daftar) {
    return (daftar || []).map(function (k) {
      var o = Object.assign({}, k);
      if (k.Wt > 0 && k.Wm > 0 && k.V > 0) { o.basah = k.Wt - k.Wm; o.gamma = o.basah / k.V; }
      if (k.W1 > 0 && k.W2 > k.W3) { var ka = D.kadarAir(k.W1, k.W2, k.W3); o.air = ka.air; o.kering = ka.kering; o.w = ka.w; }
      if (o.gamma !== undefined && o.w !== undefined) o.gammaD = o.gamma / (1 + o.w / 100);
      return o;
    });
  }

  // Pengembangan: perubahan = bacaan − bacaan awal (divisi arloji), tinggi = perubahan × satuan arloji.
  function pengembangan(daftar, H0, satuanArloji) {
    var sw = (daftar || []).filter(function (s) { return isFinite(s.bacaan) && s.bacaan !== null; });
    if (sw.length < 2 || !(H0 > 0)) return null;
    var satuan = satuanArloji > 0 ? satuanArloji : 0.0254;
    var hasil = sw.map(function (s) {
      var ubah = s.bacaan - sw[0].bacaan, dh = ubah * satuan;
      return Object.assign({}, s, { perubahan: ubah, dh: dh, persen: dh / H0 * 100 });
    });
    return { swell: hasil, pengembangan: hasil[hasil.length - 1].persen };
  }

  // Beberapa cetakan sekaligus. m.cetakan: [{ nama, pukulan, atas, bawah, kondisi }]
  function hitungCetakan(m) {
    var galat = [], peringatan = [];
    if (!(m.A > 0)) galat.push('Isi luas piston.');
    if (!m.bebanStd && !(m.std1 > 0 && m.std2 > 0)) galat.push('Isi beban atau tegangan standar pada 2,54 mm dan 5,08 mm.');
    if (galat.length) return { galat: galat };
    var cetakan = (m.cetakan || []).map(function (c) {
      var o = { nama: c.nama, pukulan: c.pukulan, set: [], kondisi: kondisiDari(c.kondisi) };
      if ((c.atas && c.atas.length) || (c.bawah && c.bawah.length)) {
        var r = hitung({ A: m.A, std1: m.std1, std2: m.std2, bebanStd: m.bebanStd, koreksi: m.koreksi, koreksiManual: m.koreksiManual, atas: c.atas, bawah: c.bawah });
        if (r.galat.length) r.galat.forEach(function (g) { galat.push('Cetakan ' + c.nama + ': ' + g); });
        else {
          o.set = r.set; o.CBR = r.CBR;
          r.peringatan.forEach(function (p) { peringatan.push('Cetakan ' + c.nama + ', ' + p.charAt(0).toLowerCase() + p.slice(1)); });
        }
      }
      var awal = o.kondisi.filter(function (k) { return k.gammaD !== undefined; })[0];
      if (awal && m.gdmaks > 0) o.D = awal.gammaD / m.gdmaks * 100;
      return o;
    });
    if (!cetakan.some(function (c) { return c.set.length; })) galat.push('Isi penurunan dan beban penetrasi minimal untuk satu cetakan.');
    if (galat.length) return { galat: galat };
    var hasil = { galat: [], peringatan: peringatan, cetakan: cetakan };
    var sw = pengembangan(m.swell, m.H0, m.satuanArloji);
    if (sw) {
      hasil.swell = sw.swell; hasil.pengembangan = sw.pengembangan;
      if (sw.pengembangan < 0) peringatan.push('Pengembangan negatif: bacaan akhir lebih kecil dari bacaan awal. Periksa arah arloji.');
    }
    return hasil;
  }

  // Beban standar form CBR lab UNJA (kN) pada penetrasi 2,54 mm dan 5,08 mm: HARGA CBR = P / 13,35 × 100 dan P / 20,02 × 100.
  var BEBAN_STD = [13.35, 20.02];

  var api = { BEBAN_STD: BEBAN_STD, hitung: hitung, hitungCetakan: hitungCetakan, bebanPada: bebanPada, segmenPada: segmenPada, koreksiNol: koreksiNol, pengembangan: pengembangan };
  if (node) module.exports = api;
  else root.HitungCBR = api;
})(this);
