/*
 * Kerangka alat praktikum: membangun formulir, menyimpan data, menghitung, dan menampilkan hasil
 * dari satu definisi alat. Alat baru cukup memanggil Praktikum.pasang({...}); lihat alat-*.js.
 *
 * Definisi alat:
 *   id, judulEkspor,
 *   parameter: [{ id, label, satuan, pilihan: [[nilai, label]], bantuan, tampilJika: fn(param) → bool,
 *                 dariAlat: { alat, nama, ambil: fn(hasil) → angka, d } }]
 *   impor: [{ alat, nama, isi: fn(hasil) → { idParameter: nilai } }]      tombol "ambil dari alat lain"
 *   tabel: tiga jenis
 *     kolom (bawaan): kolom = benda uji/cawan, baris = besaran
 *       { id, judul, kolom: 'Cawan', awal, min, maks, baris: [{ id, label, simbol, satuan, opsional }] }
 *     baris: satu nilai per baris yang dipilih dari daftar (mis. saringan)
 *       { id, jenis: 'baris', judul, namaBaris, pilihanBaris: [nama…], barisAwal, kolomNilai: { id, label }, infoBaris }
 *     daftar: baris bebas dengan beberapa kolom (mis. bacaan waktu, kedalaman)
 *       { id, jenis: 'daftar', judul, namaPendek, awal: n | [{…}], maks,
 *         kolom: [{ id, label, satuan, opsional, kunci, teks, pilihan }],
 *         kolomDari: { tabel, awalan, label: fn(nama, i), satuan } }        kolom tambahan mengikuti tabel lain
 *       Kolom 'kunci' (mis. waktu yang sudah terisi) tidak membuat baris dianggap terisi.
 *   contoh: { param: {…}, tabel: { id: [ {…} ] } },   kosong: { param: {…}, tabel: {…} }
 *   hitung(masukan) → { galat: [], peringatan: [], … }
 *   tampil(masukan, hasil, U) → HTML hasil
 *   ekspor(masukan, hasil) → [[sel, …], …] untuk CSV / salin ke Excel
 *   hasil(masukan, hasil) → objek yang disimpan untuk dipakai alat lain (opsional)
 *   sumber: [HTML, …]
 */
(function (root) {
  'use strict';

  var U0 = root.Umum;
  var KUNCI_IDENTITAS = 'praktikum-identitas';
  var IDENTITAS = [['proyek', 'Proyek'], ['lokasi', 'Lokasi'], ['sampel', 'No. sampel / titik'], ['kedalaman', 'Kedalaman'],
    ['tanggal', 'Tanggal'], ['dikerjakan', 'Dikerjakan'], ['diperiksa', 'Diperiksa']];

  // Laporan individu: data mentah ditambah dua digit terakhir NIM / 100 (aturan asisten lab),
  // mis. NIM berakhiran 34 → 0,34. Hanya kolom yang disebut di def.nim yang ditambah.
  var KUNCI_NIM = 'praktikum-nim';
  function tambahanNim(nim) {
    var d = String(nim || '').replace(/\D/g, '');
    return d.length < 2 ? null : +d.slice(-2) / 100;
  }

  function simpan(kunci, nilai) { try { localStorage.setItem(kunci, JSON.stringify(nilai)); } catch (e) { /* tidak tersedia */ } }
  function baca(kunci) { try { return JSON.parse(localStorage.getItem(kunci)); } catch (e) { return null; } }
  var esc = U0.esc;
  // Kebalikan esc, untuk ekspor teks (CSV dan papan klip).
  function unesc(s) { return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); }
  // Nilai pilihan dari tautan berbagi harus salah satu pilihan yang sah.
  function pilihanSah(daftar, v) { return daftar.some(function (o) { return String(o[0]) === String(v); }) ? v : daftar[0][0]; }

  // Terima "45,31", "45.31", "1.234,5".
  function angka(s) {
    if (s === null || s === undefined) return NaN;
    if (typeof s === 'number') return s;
    s = String(s).trim().replace(/\s/g, '');
    if (!s) return NaN;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    return Number(s);
  }
  function teksAngka(v) { return v === null || v === undefined || v === '' ? '' : String(v).replace('.', ','); }

  // Hasil antaralat: disimpan per alat di browser, dengan waktu dan tanda data contoh.
  function simpanHasil(id, nilai, contoh) { simpan('praktikum-hasil-' + id, { waktu: Date.now(), contoh: !!contoh, nilai: nilai }); }
  function bacaHasil(id) {
    var o = baca('praktikum-hasil-' + id);
    if (!o) return null;
    return o.nilai ? o : { waktu: null, contoh: false, nilai: o }; // format lama: nilai langsung
  }
  function waktuSingkat(t) {
    if (!t) return '';
    var d = new Date(t);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  // ---------------------------------------------------------------- bantuan tampilan untuk definisi alat
  var bantu = {
    f: U0.f, t: U0.t, rumus: U0.rumus, tex: U0.tex, esc: esc,
    kartu: function (label, nilai, ket) {
      return '<div class="kartu"><div class="redup kecil" style="font-weight:700">' + label + '</div><div class="nilai-besar">' + nilai + '</div>' +
        (ket ? '<div class="redup kecil">' + ket + '</div>' : '') + '</div>';
    },
    ringkasan: function (kartu) { return '<div class="ringkasan">' + kartu.join('') + '</div>'; },
    // Kolom ke-0..2 teks (uraian, simbol, satuan), sisanya angka. o.angkaMulai mengubah batas itu;
    // o.kanan: [indeks kolom] menentukan sendiri kolom yang rata kanan.
    tabel: function (kepala, baris, kaki, o) {
      o = o || {};
      var mulai = o.angkaMulai === undefined ? 3 : o.angkaMulai;
      function kanan(i) { return o.kanan ? o.kanan.indexOf(i) >= 0 : i >= mulai; }
      return '<div class="tabel-gulir"><table><thead><tr>' + kepala.map(function (k, i) { return '<th' + (kanan(i) || (!o.kanan && k.angka) ? ' class="angka"' : '') + '>' + (k.teks || k) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + baris.map(function (b) {
          return '<tr>' + b.map(function (c, i) { return '<td' + (kanan(i) ? ' class="angka"' : '') + '>' + (c === null || c === undefined ? '–' : c) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody>' + (kaki ? '<tfoot><tr>' + kaki.map(function (c, i) { return '<td' + (kanan(i) ? ' class="angka"' : '') + '>' + c + '</td>'; }).join('') + '</tr></tfoot>' : '') +
        '</table></div>';
    },
    langkah: function (judul, isi) { return '<div class="langkah"><h4>' + judul + '</h4>' + isi + '</div>'; },
    grafik: function (svg, ket) {
      return '<figure class="kartu grafik-bingkai">' + svg + '<figcaption class="kecil redup">' + (ket || '') +
        '</figcaption><div class="tidak-cetak" style="margin-top:8px"><button type="button" class="tombol kecil" data-png>Unduh PNG</button></div></figure>';
    }
  };

  // ---------------------------------------------------------------- pemasangan alat
  function pasang(def) {
    var akar = document.getElementById('alat-praktikum');
    var KUNCI = 'praktikum-' + def.id;
    var identitas = baca(KUNCI_IDENTITAS) || {};
    var nimData = baca(KUNCI_NIM) || { nim: '', aktif: true };
    var keadaan = muatAwal();

    function salin(o) { return JSON.parse(JSON.stringify(o)); }
    function tabelDef(id) { return def.tabel.filter(function (x) { return x.id === id; })[0]; }

    function barisKosongDaftar(tb) {
      if (Array.isArray(tb.awal)) return salin(tb.awal);
      var hasil = [];
      for (var i = 0; i < (tb.awal || 5); i++) hasil.push({});
      return hasil;
    }
    function kosong() {
      var k = { param: salin((def.kosong && def.kosong.param) || {}), tabel: {} };
      def.tabel.forEach(function (tb) {
        if (def.kosong && def.kosong.tabel && def.kosong.tabel[tb.id]) k.tabel[tb.id] = salin(def.kosong.tabel[tb.id]);
        else if (tb.jenis === 'baris') k.tabel[tb.id] = (tb.barisAwal || []).map(function (n) { return { nama: n }; });
        else if (tb.jenis === 'daftar') k.tabel[tb.id] = barisKosongDaftar(tb);
        else {
          k.tabel[tb.id] = [];
          for (var i = 0; i < (tb.awal || 3); i++) k.tabel[tb.id].push({ nama: String(i + 1) });
        }
      });
      return k;
    }
    function contoh() { var c = salin(def.contoh); c.contoh = true; return c; }
    // Keadaan tersimpan dilengkapi bila definisi alat bertambah tabel atau parameter.
    function lengkapi(k) {
      k.param = k.param || {};
      k.tabel = k.tabel || {};
      var dasar = kosong();
      Object.keys(dasar.param).forEach(function (p) { if (!(p in k.param)) k.param[p] = dasar.param[p]; });
      def.tabel.forEach(function (tb) { if (!Array.isArray(k.tabel[tb.id])) k.tabel[tb.id] = dasar.tabel[tb.id]; });
      return k;
    }
    function muatAwal() {
      var dariTautan = U0.bacaHash(function (o) { return o && o.param && o.tabel; });
      return lengkapi(dariTautan || baca(KUNCI) || contoh());
    }

    // Kolom tabel daftar, termasuk kolom yang mengikuti jumlah kolom tabel lain.
    function kolomDaftar(tb) {
      var k = tb.kolom.slice();
      if (tb.kolomDari) {
        (keadaan.tabel[tb.kolomDari.tabel] || []).forEach(function (s, i) {
          k.push({ id: tb.kolomDari.awalan + i, label: tb.kolomDari.label(esc(s.nama || String(i + 1)), i), satuan: tb.kolomDari.satuan, opsional: true, dinamis: i });
        });
      }
      return k;
    }
    function kolomAngka(k) { return !k.teks && !k.pilihan; }
    // Label dan satuan baris boleh berupa fungsi dari parameter (mis. berubah menurut cara uji).
    function teks(v) { return typeof v === 'function' ? v(keadaan.param) : (v || ''); }

    // Kumpulkan masukan lengkap untuk fungsi hitung; kolom atau baris setengah terisi dilaporkan.
    // Nama kolom dan isian teks sudah di-escape di sini, karena hitung dan tampil memasukkannya ke HTML
    // (pesan galat, judul tabel, judul langkah). Nama baris dan pilihan dibatasi ke daftar yang sah.
    function masukan() {
      var m = { param: {}, tabel: {}, tidakLengkap: [], contoh: !!keadaan.contoh };
      (def.parameter || []).forEach(function (p) {
        var v = keadaan.param[p.id];
        m.param[p.id] = p.pilihan ? pilihanSah(p.pilihan, v) : angka(v);
      });
      def.tabel.forEach(function (tb) {
        if (tb.jenis === 'baris') {
          m.tabel[tb.id] = keadaan.tabel[tb.id].filter(function (b) { return tb.pilihanBaris.indexOf(b.nama) >= 0; })
            .map(function (b) { return { nama: b.nama, nilai: angka(b.nilai) }; });
          return;
        }
        m.tabel[tb.id] = [];
        if (tb.jenis === 'daftar') {
          var kol = kolomDaftar(tb);
          keadaan.tabel[tb.id].forEach(function (b, i) {
            var terisi = kol.filter(function (k) { return kolomAngka(k) && !k.kunci && isFinite(angka(b[k.id])); }).length;
            var adaTeks = kol.some(function (k) { return k.teks && String(b[k.id] || '').trim(); });
            if (!terisi && !adaTeks) return;
            var kurang = kol.filter(function (k) { return kolomAngka(k) && !k.opsional && !isFinite(angka(b[k.id])); });
            if (kurang.length) { m.tidakLengkap.push((tb.namaPendek || tb.judul) + ', baris ' + (i + 1)); return; }
            var o = { no: i + 1 };
            kol.forEach(function (k) {
              if (k.dinamis !== undefined) return;
              if (k.teks) o[k.id] = esc(String(b[k.id] || '').trim());
              else if (k.pilihan) o[k.id] = pilihanSah(k.pilihan, b[k.id]);
              else { var v = angka(b[k.id]); o[k.id] = isFinite(v) ? v : null; }
            });
            if (tb.kolomDari) {
              o.nilai = kol.filter(function (k) { return k.dinamis !== undefined; }).map(function (k) { var v = angka(b[k.id]); return isFinite(v) ? v : null; });
            }
            m.tabel[tb.id].push(o);
          });
          return;
        }
        keadaan.tabel[tb.id].forEach(function (k, i) {
          var wajib = tb.baris.filter(function (b) { return !b.opsional; });
          var terisi = wajib.filter(function (b) { return isFinite(angka(k[b.id])); }).length;
          if (terisi === 0) return;
          if (terisi < wajib.length) { m.tidakLengkap.push(tb.kolom + ' ' + esc(k.nama || i + 1)); return; }
          var o = { nama: esc(k.nama || String(i + 1)) };
          tb.baris.forEach(function (b) { var v = angka(k[b.id]); o[b.id] = isFinite(v) ? v : null; });
          m.tabel[tb.id].push(o);
        });
      });
      terapkanNim(m);
      return m;
    }

    // ---------------- NIM (laporan individu)
    function nimBerlaku() { return def.nim && nimData.aktif && !keadaan.contoh ? tambahanNim(nimData.nim) : null; }
    function labelNim(tbId, k) {
      if (!tbId) { var p = (def.parameter || []).filter(function (x) { return x.id === k; })[0]; return p ? p.label : k; }
      var tb = tabelDef(tbId);
      if (tb.jenis === 'baris') return tb.kolomNilai.label + ' (' + tb.namaBaris.toLowerCase() + ' {n})';
      if (tb.jenis === 'daftar') {
        if (k === '*dinamis') return (tb.namaPendek || tb.judul) + ' ({n})';
        var kol = kolomDaftar(tb).filter(function (x) { return x.id === k; })[0];
        return (kol ? kol.label : k) + ' ({n})';
      }
      var b = tb.baris.filter(function (x) { return x.id === k; })[0];
      return (b ? teks(b.label) + (b.simbol ? ', ' + b.simbol : '') : k) + ' (' + tb.kolom.toLowerCase() + ' {n})';
    }
    // Tambahkan t ke kolom yang ditandai; catat beberapa contoh untuk langkah hitungan.
    function terapkanNim(m) {
      var t = nimBerlaku();
      if (t === null || !t) return;
      var catat = [], sudah = {};
      function tambah(o, k, label, nama) {
        if (typeof o[k] !== 'number' || !isFinite(o[k])) return;
        var a = o[k];
        o[k] = Math.round((a + t) * 1e9) / 1e9;
        if (!sudah[label] && catat.length < 10) { sudah[label] = 1; catat.push({ label: label.replace('{n}', nama), a: a, b: o[k] }); }
      }
      (def.nim.param || []).forEach(function (id) { tambah(m.param, id, labelNim(null, id), ''); });
      Object.keys(def.nim.tabel || {}).forEach(function (tbId) {
        (m.tabel[tbId] || []).forEach(function (o, i) {
          var nama = String(o.nama || o.no || i + 1);
          def.nim.tabel[tbId].forEach(function (k) {
            if (k === '*dinamis' && Array.isArray(o.nilai)) {
              o.nilai.forEach(function (v, j) { if (v !== null) { var w = { v: v }; tambah(w, 'v', labelNim(tbId, k), nama + ', kolom ' + (j + 1)); o.nilai[j] = w.v; } });
            } else tambah(o, k, labelNim(tbId, k), nama);
          });
        });
      });
      m.nim = { nim: nimData.nim, tambahan: t, contoh: catat };
    }
    // Satu baris: isian NIM, angka tambahan, sakelar "Tambahkan ke data", dan penjelasan yang bisa dibuka.
    function htmlNim() {
      if (!def.nim) return '';
      return '<div class="kotak-nim tidak-cetak" id="kotak-nim"><div class="nim-isian"><label for="nim-input">NIM</label>' +
        '<input id="nim-input" data-nim="nim" type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="NIM lengkap" value="' + esc(nimData.nim || '') + '"></div>' +
        '<div class="nim-angka" id="nim-angka" aria-live="polite">' + teksNim() + '</div>' +
        '<label class="nim-pakai sakelar"><input type="checkbox" role="switch" data-nim="aktif"' + (nimData.aktif ? ' checked' : '') + '><span class="sakelar-jalur" aria-hidden="true"></span> Tambahkan ke data</label>' +
        '<details class="nim-info"><summary><span class="sr-only">Cara kerja NIM</span><span aria-hidden="true">?</span></summary>' +
        '<p class="kecil nim-ket">Laporan individu: dua digit terakhir NIM dibagi 100 lalu ditambahkan ke <strong>' + def.nim.ket + '</strong>. Kolom lain tidak berubah.' +
        (keadaan.contoh ? ' Data contoh sudah memuat tambahan NIM dari laporan contoh, jadi NIM Anda baru dipakai setelah data diganti.' : '') + '</p></details></div>';
    }
    function teksNim() {
      var t = tambahanNim(nimData.nim);
      if (t === null) return '<span class="redup">tambahan</span><strong>–</strong>';
      return '<span class="redup">tambahan</span><strong>+ ' + U0.f(t, 2) + '</strong>';
    }
    function htmlHasilNim(m) {
      if (!m.nim) return '';
      var n = m.nim, digit = Math.round(n.tambahan * 100);
      return bantu.langkah('Data individu dari NIM ' + esc(n.nim),
        U0.rumus('\\text{tambahan} = \\dfrac{' + digit + '}{100} = ' + U0.t(n.tambahan, 2)) +
        bantu.tabel([{ teks: 'Data' }, { teks: 'Data mentah', angka: true }, { teks: 'Tambahan', angka: true }, { teks: 'Dipakai', angka: true }],
          n.contoh.map(function (c) { return [c.label, U0.f(c.a, 3), '+ ' + U0.f(n.tambahan, 2), U0.f(c.b, 3)]; }), null, { angkaMulai: 1 }) +
        '<p class="ket">Contoh satu nilai untuk tiap jenis data. Semua nilai pada kolom yang sama ditambah ' + U0.f(n.tambahan, 2) + ' sebelum dihitung, dan tabel hasil di bawah memakai nilai yang sudah ditambah.</p>');
    }
    function identitasCetak() {
      var isi = IDENTITAS.filter(function (p) { return identitas[p[0]]; }).map(function (p) { return [p[1], identitas[p[0]]]; });
      if (def.nim && nimData.nim) isi.push(['NIM', nimData.nim]);
      return isi;
    }

    // ---------------- formulir
    function htmlImpor() {
      if (!def.impor || !def.impor.length) return '';
      return '<div class="impor tidak-cetak"><span class="kecil redup">Ambil hasil alat lain yang tersimpan di browser ini:</span><div class="baris-tombol" style="margin:8px 0 0">' +
        def.impor.map(function (im, i) {
          var h = bacaHasil(im.alat);
          if (!h) return '<a class="tombol kecil" href="../' + im.alat + '/" title="Belum ada hasil tersimpan. Buka alatnya dulu.">' + im.nama + ' (belum ada)</a>';
          return '<button type="button" class="tombol kecil" data-impor="' + i + '">Ambil dari ' + im.nama +
            ' <span class="redup kecil">' + (h.contoh ? 'data contoh' : waktuSingkat(h.waktu)) + '</span></button>';
        }).join('') + '</div></div>';
    }

    function htmlParameter() {
      var tampil = (def.parameter || []).filter(function (p) { return !p.tampilJika || p.tampilJika(keadaan.param); });
      if (!tampil.length) return '';
      return '<div class="isian-kisi">' + tampil.map(function (p) {
        var v = keadaan.param[p.id];
        var isian = p.pilihan
          ? '<select id="p-' + p.id + '" data-param="' + p.id + '">' + p.pilihan.map(function (o) { return '<option value="' + o[0] + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'
          : '<input id="p-' + p.id + '" data-param="' + p.id + '" type="text" inputmode="decimal" autocomplete="off" value="' + esc(teksAngka(v)) + '">';
        var ambil = '';
        if (p.dariAlat) {
          var h = bacaHasil(p.dariAlat.alat), nilai = h ? p.dariAlat.ambil(h.nilai) : null;
          if (nilai !== null && nilai !== undefined && isFinite(nilai)) {
            ambil = '<button type="button" class="tautan-kecil tidak-cetak" data-ambil="' + p.id + '">Pakai hasil ' + p.dariAlat.nama + ': ' +
              U0.f(nilai, p.dariAlat.d === undefined ? 3 : p.dariAlat.d) + (h.contoh ? ' (data contoh)' : '') + '</button>';
          }
        }
        return '<div><label for="p-' + p.id + '">' + p.label + (p.satuan ? ' (' + p.satuan + ')' : '') + '</label>' + isian + ambil +
          (p.bantuan ? '<div class="kecil redup" style="margin-top:4px">' + p.bantuan + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    }

    function htmlTabel(tb) {
      var isi = htmlIsiTabel(tb);
      if (def.tabel.length < 2) return '<h3>' + tb.judul + '</h3>' + isi;
      // Beberapa tabel: tiap tabel bisa dilipat; keadaan lipatan bertahan saat formulir digambar ulang.
      var buka = lipatData[tb.id] !== undefined ? lipatData[tb.id] : true;
      return '<details class="lipat" data-lipat-data="' + tb.id + '"' + (buka ? ' open' : '') + '><summary><h3>' + tb.judul + '</h3></summary>' + isi + '</details>';
    }
    function htmlIsiTabel(tb) {
      var data = keadaan.tabel[tb.id];
      var kepalaTabel = tb.keterangan ? '<p class="kecil redup">' + tb.keterangan + '</p>' : '';
      if (tb.jenis === 'baris') {
        var tersedia = tb.pilihanBaris.filter(function (n) { return !data.some(function (b) { return b.nama === n; }); });
        return kepalaTabel +
          '<div class="tabel-gulir"><table class="tabel-isian"><thead><tr><th>' + tb.namaBaris + '</th><th class="angka">' + tb.kolomNilai.label + '</th><th></th></tr></thead><tbody>' +
          data.map(function (b, i) {
            return '<tr><td>' + esc(b.nama) + (tb.infoBaris ? ' <span class="kecil redup">' + tb.infoBaris(b.nama) + '</span>' : '') + '</td>' +
              '<td><input type="text" inputmode="decimal" autocomplete="off" data-tabel="' + tb.id + '" data-i="' + i + '" data-k="nilai" value="' + esc(teksAngka(b.nilai)) + '" aria-label="' + esc(tb.kolomNilai.label + ' ' + b.nama) + '"></td>' +
              '<td><button type="button" class="tombol kecil" data-hapus-baris="' + tb.id + '" data-i="' + i + '" aria-label="Hapus ' + esc(b.nama) + '">×</button></td></tr>';
          }).join('') + '</tbody></table></div>' +
          (tersedia.length ? '<div class="baris-tombol tidak-cetak"><select data-tambah-pilihan="' + tb.id + '" aria-label="Pilih ' + tb.namaBaris.toLowerCase() + '">' +
            tersedia.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select><button type="button" class="tombol kecil" data-tambah-baris="' + tb.id + '">+ Tambah ' + tb.namaBaris.toLowerCase() + '</button></div>' : '');
      }
      if (tb.jenis === 'daftar') {
        var kol = kolomDaftar(tb);
        return kepalaTabel +
          '<div class="tabel-gulir"><table class="tabel-isian tabel-daftar"><thead><tr><th>No.</th>' + kol.map(function (k) {
            return '<th class="' + (kolomAngka(k) ? 'angka' : '') + '">' + k.label + (k.satuan ? '<br><span class="kecil redup" style="font-weight:600">(' + k.satuan + ')</span>' : '') +
              (k.opsional && !k.teks && k.dinamis === undefined ? '<br><span class="kecil redup" style="font-weight:600">opsional</span>' : '') + '</th>';
          }).join('') + '<th></th></tr></thead><tbody>' +
          data.map(function (b, i) {
            return '<tr><td>' + (i + 1) + '</td>' + kol.map(function (k) {
              var atr = ' data-tabel="' + tb.id + '" data-i="' + i + '" data-k="' + k.id + '" aria-label="' + esc(String(k.label).replace(/<[^>]+>/g, '') + ', baris ' + (i + 1)) + '"';
              if (k.pilihan) {
                return '<td><select' + atr + '>' + k.pilihan.map(function (o) { return '<option value="' + o[0] + '"' + (String(b[k.id]) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></td>';
              }
              return '<td><input type="text"' + (k.teks ? ' class="teks"' : ' inputmode="decimal"') + ' autocomplete="off"' + atr + ' value="' + esc(k.teks ? (b[k.id] || '') : teksAngka(b[k.id])) + '"></td>';
            }).join('') +
              '<td><button type="button" class="tombol kecil" data-hapus-baris="' + tb.id + '" data-i="' + i + '" aria-label="Hapus baris ' + (i + 1) + '">×</button></td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="baris-tombol tidak-cetak">' +
          (data.length < (tb.maks || 60) ? '<button type="button" class="tombol kecil" data-tambah-daftar="' + tb.id + '" data-n="1">+ Baris</button>' +
            '<button type="button" class="tombol kecil" data-tambah-daftar="' + tb.id + '" data-n="5">+ 5 baris</button>' : '') +
          '<span class="kecil redup" style="align-self:center">Bisa tempel dari Excel: blok sel, salin, lalu tempel di sel pertama.</span></div>';
      }
      var kepala = '<tr><th>Uraian</th><th>Simbol</th><th>Satuan</th>' + data.map(function (k, i) {
        return '<th class="angka"><input class="nama-kolom" type="text" data-tabel="' + tb.id + '" data-i="' + i + '" data-k="nama" value="' + esc(k.nama) + '" aria-label="Nama ' + tb.kolom + ' ' + (i + 1) + '"></th>';
      }).join('') + '</tr>';
      var badan = tb.baris.map(function (b) {
        return '<tr><td>' + teks(b.label) + (b.opsional ? ' <span class="kecil redup">(opsional)</span>' : '') + '</td><td>' + (b.simbol || '') + '</td><td>' + teks(b.satuan) + '</td>' +
          data.map(function (k, i) {
            return '<td><input type="text" inputmode="decimal" autocomplete="off" data-tabel="' + tb.id + '" data-i="' + i + '" data-k="' + b.id + '" value="' + esc(teksAngka(k[b.id])) + '" aria-label="' + esc(teks(b.label).replace(/<[^>]+>/g, '') + ', ' + tb.kolom + ' ' + (k.nama || i + 1)) + '"></td>';
          }).join('') + '</tr>';
      }).join('');
      return kepalaTabel +
        '<div class="tabel-gulir"><table class="tabel-isian"><thead>' + kepala + '</thead><tbody>' + badan + '</tbody></table></div>' +
        '<div class="baris-tombol tidak-cetak">' +
        (data.length < (tb.maks || 10) ? '<button type="button" class="tombol kecil" data-tambah-kolom="' + tb.id + '">+ ' + tb.kolom + '</button>' : '') +
        (data.length > (tb.min || 1) ? '<button type="button" class="tombol kecil" data-kurang-kolom="' + tb.id + '">− ' + tb.kolom + '</button>' : '') + '</div>';
    }

    function htmlIdentitas() {
      return '<details class="identitas tidak-cetak"><summary>Identitas contoh (untuk kop cetak dan Word)</summary><div class="isian-kisi" style="margin-top:12px">' +
        IDENTITAS.map(function (p) {
          return '<div><label for="id-' + p[0] + '">' + p[1] + '</label><input id="id-' + p[0] + '" data-identitas="' + p[0] + '" type="text" autocomplete="off" value="' + esc(identitas[p[0]] || '') + '"></div>';
        }).join('') + '</div><p class="kecil redup">Identitas hanya disimpan di browser ini dan tidak ikut dalam tautan berbagi.</p></details>';
    }

    function gambarFormulir() {
      var el = document.getElementById('formulir-praktikum');
      el.innerHTML = htmlNim() + htmlIdentitas() + htmlImpor() + htmlParameter() + def.tabel.map(htmlTabel).join('') +
        '<div class="baris-tombol tidak-cetak lanjut-hasil"><button type="button" class="tombol kecil" data-ke-tab="hasil">Lihat hasil</button></div>';
    }

    // Bilah aksi: menempel di kanan atas (desktop) atau di bawah layar (ponsel). Ekspor dikumpulkan dalam satu menu.
    function htmlBilahAksi() {
      return '<div class="bilah-aksi tidak-cetak" id="bilah-aksi">' +
        '<button type="button" class="tombol kecil utama" data-aksi="contoh"><span><span class="lbl-panjang">Muat </span>data contoh</span></button>' +
        '<button type="button" class="tombol kecil" data-aksi="hitung">Hitung</button>' +
        '<div class="menu-ekspor"><button type="button" class="tombol kecil" id="tombol-ekspor" aria-haspopup="true" aria-expanded="false" aria-controls="menu-ekspor">Ekspor<span class="segitiga" aria-hidden="true"></span></button>' +
        '<div class="menu-ekspor-isi" id="menu-ekspor" role="menu" hidden>' +
        [['word', 'Unduh Word (.docx)'], ['salin-excel', 'Salin ke Excel'], ['csv', 'Unduh CSV'], ['tautan', 'Salin tautan data'], ['cetak', 'Cetak / PDF']].map(function (a) {
          return '<button type="button" role="menuitem" tabindex="-1" data-aksi="' + a[0] + '">' + a[1] + '</button>';
        }).join('') + '</div></div>' +
        '<button type="button" class="tombol kecil" data-aksi="kosong">Kosongkan</button>' +
        '<p class="pesan-aksi" id="pesan-praktikum" role="status" aria-live="polite"></p></div>';
    }

    // ---------------- tab: Pengantar · Data · Hasil · Grafik · Sumber dan catatan
    var TAB = [['pengantar', 'Pengantar'], ['data', 'Data'], ['hasil', 'Hasil'], ['grafik', 'Grafik'], ['sumber', 'Sumber<span class="lbl-panjang"> dan catatan</span>']];
    var tabAktif = null;
    function namaTab(h) { h = String(h || '').replace(/^#/, ''); return TAB.some(function (t) { return t[0] === h; }) ? h : null; }
    function tombolTab(n) { return document.getElementById('tab-' + n); }
    function bisaDibuka(n) { var b = tombolTab(n); return b && !b.hidden; }
    function bukaTab(n, o) {
      o = o || {};
      if (!bisaDibuka(n)) n = n === 'grafik' ? 'hasil' : 'pengantar';
      tabAktif = n;
      TAB.forEach(function (t) {
        var b = tombolTab(t[0]), p = document.getElementById('panel-' + t[0]), aktif = t[0] === n;
        b.setAttribute('aria-selected', aktif ? 'true' : 'false');
        b.tabIndex = aktif ? 0 : -1;
        p.hidden = !aktif;
      });
      geserGaris();
      if (o.simpan !== false) { try { history.replaceState(null, '', '#' + n); } catch (e) { /* abaikan */ } }
      if (o.fokus) tombolTab(n).focus();
      if (o.gulir) {
        var atas = document.getElementById('kepala-tab').getBoundingClientRect().top;
        if (atas < 0 || atas > innerHeight * 0.6) document.getElementById('kepala-tab').scrollIntoView({ block: 'start' });
      }
      if (n === 'grafik' && !gerakDikurangi()) {
        var g = document.getElementById('grafik-praktikum');
        g.classList.remove('hasil-baru'); void g.offsetWidth; g.classList.add('hasil-baru');
        clearTimeout(g._hb); g._hb = setTimeout(function () { g.classList.remove('hasil-baru'); }, 1800);
      }
    }
    function gerakDikurangi() { return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    // Garis bawah tab aktif meluncur ke tab yang dipilih.
    function geserGaris() {
      var garis = document.getElementById('tab-garis'), b = tombolTab(tabAktif);
      if (!garis || !b) return;
      garis.style.width = b.offsetWidth + 'px';
      garis.style.transform = 'translateX(' + b.offsetLeft + 'px)';
      // Layar sempit: daftar tab digeser supaya tab aktif terlihat.
      var d = b.parentNode;
      if (b.offsetLeft < d.scrollLeft) d.scrollLeft = b.offsetLeft - 8;
      else if (b.offsetLeft + b.offsetWidth > d.scrollLeft + d.clientWidth) d.scrollLeft = b.offsetLeft + b.offsetWidth - d.clientWidth + 8;
    }
    function htmlTabDaftar() {
      return '<div class="tab-daftar" role="tablist" aria-label="Bagian alat">' + TAB.map(function (t, i) {
        return '<button type="button" role="tab" id="tab-' + t[0] + '" aria-controls="panel-' + t[0] + '" aria-selected="false" tabindex="-1">' +
          '<span class="tab-no" aria-hidden="true">' + (i + 1) + '</span><span>' + t[1] + '</span></button>';
      }).join('') + '<span class="tab-garis" id="tab-garis" aria-hidden="true"></span></div>';
    }
    function aturTabGrafik(ada) {
      var b = tombolTab('grafik');
      if (b.hidden === !ada) return;
      b.hidden = !ada;
      var no = 1;
      TAB.forEach(function (t) { var x = tombolTab(t[0]); if (!x.hidden) x.querySelector('.tab-no').textContent = no++; });
      if (!ada && tabAktif === 'grafik') bukaTab('hasil');
      else geserGaris();
    }

    // ---------------- hasil
    function kosongSemua(m) {
      var tabelKosong = def.tabel.every(function (tb) {
        return tb.jenis === 'baris' ? !m.tabel[tb.id].some(function (b) { return isFinite(b.nilai); }) : !m.tabel[tb.id].length;
      });
      if (def.tabel.length) return tabelKosong;
      return (def.parameter || []).every(function (p) { return p.pilihan || !isFinite(m.param[p.id]); });
    }

    var urutanHasil = [];     // anak #hasil-praktikum dalam urutan asli tampil(), dipakai ekspor Word
    var lipatHasil = {};      // judul bagian hasil → terbuka/tertutup pilihan pengguna
    var lipatData = {};       // id tabel formulir → terbuka/tertutup pilihan pengguna
    var KOSONG_HASIL = '<div class="kartu redup kosong-panel">Isi data di tab <button type="button" class="tautan-kecil" data-ke-tab="data">Data</button>, atau klik <strong>Muat data contoh</strong> untuk melihat contoh hasilnya.</div>';

    function gambarHasil() {
      var m = masukan(), el = document.getElementById('hasil-praktikum'), h = '';
      m.tidakLengkap.forEach(function (n) { h += '<div class="catatan">' + n + ' belum lengkap, jadi belum ikut dihitung.</div>'; });
      if (!m.tidakLengkap.length && kosongSemua(m)) {
        el.innerHTML = KOSONG_HASIL;
        sebarHasil(el);
        return null;
      }
      var r = def.hitung(m);
      if (r.galat && r.galat.length) {
        el.innerHTML = h + r.galat.map(function (g) { return '<div class="catatan galat">' + g + '</div>'; }).join('');
        sebarHasil(el);
        return null;
      }
      (r.peringatan || []).forEach(function (p) { h += '<div class="catatan">' + p + '</div>'; });
      el.innerHTML = h + htmlHasilNim(m) + def.tampil(m, r, bantu);
      sebarHasil(el);
      document.getElementById('kop-cetak').innerHTML = kop();
      if (def.hasil) simpanHasil(def.id, def.hasil(m, r), keadaan.contoh);
      return { m: m, r: r };
    }

    // Formulir masih kosong: tujuan dan alur di Pengantar diambil dari hasil data contoh (tidak ditampilkan di Hasil).
    function belajarDariContoh() {
      if (!def.contoh) return;
      var semula = keadaan;
      try {
        keadaan = lengkapi(contoh());
        var mc = masukan(), rc = def.hitung(mc);
        if (rc.galat && rc.galat.length) return;
        var tmp = document.createElement('div');
        tmp.innerHTML = def.tampil(mc, rc, bantu);
        var b = tmp.querySelector('.belajar');
        if (!b) return;
        while (b.parentNode !== tmp) b = b.parentNode;
        var slot = document.getElementById('pengantar-belajar'), j = b.previousElementSibling;
        if (j && j.tagName === 'H3' && /^Belajar/.test(j.textContent)) slot.appendChild(j);
        slot.appendChild(b);
      } catch (e) { /* Pengantar tetap tanpa blok belajar */ } finally { keadaan = semula; }
    }

    // Keluaran tampil() dibagi ke tab: blok "Belajar dari pengujian ini" ke Pengantar, grafik ke Grafik,
    // "Beda dengan contoh laporan" ke Sumber, sisanya tetap di Hasil dan dikelompokkan per judul (bisa dilipat).
    // Simpulnya dipindah (bukan disalin), jadi urutanHasil tetap menunjuk elemen yang sama untuk ekspor Word.
    function sebarHasil(el) {
      urutanHasil = Array.prototype.slice.call(el.children);
      var belajar = el.querySelector('.belajar');
      if (belajar) {
        while (belajar.parentNode !== el) belajar = belajar.parentNode;
        var slot = document.getElementById('pengantar-belajar'), judul = belajar.previousElementSibling;
        slot.innerHTML = '';
        if (judul && judul.tagName === 'H3' && /^Belajar/.test(judul.textContent)) slot.appendChild(judul);
        slot.appendChild(belajar);
      }
      if (!document.getElementById('pengantar-belajar').children.length) belajarDariContoh();
      var beda = document.getElementById('beda-isi');
      beda.innerHTML = '';
      Array.prototype.forEach.call(el.querySelectorAll(':scope > .catatan'), function (c) {
        var s = c.querySelector('strong');
        if (s && /^Beda dengan contoh laporan/.test(s.textContent)) beda.appendChild(c);
      });
      var grafik = document.getElementById('grafik-praktikum');
      grafik.innerHTML = '';
      Array.prototype.forEach.call(el.querySelectorAll(':scope > figure, :scope > .kisi-grafik'), function (g) { grafik.appendChild(g); });
      var adaGrafik = !!grafik.children.length;
      if (adaGrafik) grafik.insertAdjacentHTML('afterbegin', '<p class="kecil redup ket-panel">Grafik dari data di tab Data. Tombol <strong>Unduh PNG</strong> menyimpan satu grafik sebagai gambar.</p>');
      else grafik.innerHTML = '<div class="kartu redup kosong-panel">Grafik muncul setelah data lengkap dihitung.</div>';
      aturTabGrafik(adaGrafik || !document.getElementById('hasil-praktikum').querySelector('.ringkasan, table'));
      // Kelompokkan: setiap h3 beserta isi sesudahnya menjadi satu <details>.
      var anak = Array.prototype.slice.call(el.children), kelompok = null;
      anak.forEach(function (x) {
        if (x.tagName === 'H3') {
          var teksJudul = x.textContent.trim(), kunci = teksJudul.replace(/\s*\(.*\)$/, '');
          var buka = lipatHasil[kunci] !== undefined ? lipatHasil[kunci] : !(def.lipat && /^Langkah/.test(teksJudul));
          kelompok = document.createElement('details');
          kelompok.className = 'lipat';
          kelompok.dataset.lipatHasil = kunci;
          if (buka) kelompok.open = true;
          var ringkas = document.createElement('summary');
          el.insertBefore(kelompok, x);
          ringkas.appendChild(x);
          kelompok.appendChild(ringkas);
        } else if (kelompok) kelompok.appendChild(x);
      });
    }

    function kop() {
      var isi = identitasCetak();
      if (!isi.length) return '';
      return '<table class="kop"><tbody>' + isi.map(function (p) { return '<tr><td>' + p[0] + '</td><td>: ' + esc(p[1]) + '</td></tr>'; }).join('') + '</tbody></table>';
    }

    // Data tidak lagi ditulis ke alamat setiap kali diketik (hash dipakai untuk nama tab);
    // tautan berisi data dibuat saat "Salin tautan data" atau "Laporkan salah hitung" diklik.
    function perbarui(gambarUlangFormulir) {
      if (gambarUlangFormulir) gambarFormulir();
      simpan(KUNCI, keadaan);
      gambarHasil();
    }
    function tautanData() {
      try { return location.href.split('#')[0] + '#' + btoa(JSON.stringify(keadaan)); } catch (e) { return null; }
    }
    U0.tautanData = tautanData;

    // ---------------- ekspor
    function judulEkspor() { return def.judulEkspor || document.title.split(' · ')[0]; }
    function tabelEkspor() {
      var m = masukan(), r = def.hitung(m);
      var baris = [[judulEkspor()]];
      identitasCetak().forEach(function (p) { baris.push(p); });
      var mm = masukan();
      if (mm.nim) baris.push(['Tambahan NIM', mm.nim.tambahan, 'ditambahkan ke ' + def.nim.ket.replace(/<[^>]+>/g, '')]);
      baris.push([]);
      if (r.galat && r.galat.length) return baris.concat(r.galat.map(function (g) { return ['Galat', g]; }));
      return baris.concat(def.ekspor(m, r));
    }
    function sel(v, pemisah) {
      if (typeof v === 'number') return isFinite(v) ? String(Math.round(v * 1e6) / 1e6).replace('.', ',') : '';
      v = v == null ? '' : unesc(String(v).replace(/<[^>]+>/g, ''));
      return (v.indexOf(pemisah) >= 0 || v.indexOf('"') >= 0 || v.indexOf('\n') >= 0) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    var waktuPesan = null;
    function pesan(t) {
      var p = document.getElementById('pesan-praktikum');
      p.textContent = t;
      clearTimeout(waktuPesan);
      waktuPesan = setTimeout(function () { p.textContent = ''; }, 7000);
    }
    function labelPilihan(daftar, v) { var o = daftar.filter(function (x) { return String(x[0]) === String(v); })[0]; return o ? o[1] : ''; }

    // Blok laporan Word: data masukan dari formulir, lalu ringkasan, grafik, dan tabel dari bagian hasil.
    function blokWord() {
      var blok = [{ jenis: 'subjudul', teks: 'Data pengujian' }];
      var nilaiParam = (def.parameter || []).filter(function (p) { return !p.tampilJika || p.tampilJika(keadaan.param); }).map(function (p) {
        var v = p.pilihan ? labelPilihan(p.pilihan, pilihanSah(p.pilihan, keadaan.param[p.id])) : teksAngka(keadaan.param[p.id]);
        return [p.label, p.satuan || '–', esc(v === '' || v === undefined ? '–' : v)];
      });
      if (nilaiParam.length) blok.push({ jenis: 'tabel', judul: 'Parameter pengujian', kepala: ['Besaran', 'Satuan', 'Nilai'], baris: nilaiParam, kanan: [2] });
      def.tabel.forEach(function (tb) {
        var data = keadaan.tabel[tb.id];
        if (tb.jenis === 'baris') {
          var bb = data.filter(function (b) { return isFinite(angka(b.nilai)); });
          if (bb.length) blok.push({ jenis: 'tabel', judul: tb.judul, kepala: [tb.namaBaris, tb.kolomNilai.label], baris: bb.map(function (b) { return [esc(b.nama), teksAngka(b.nilai)]; }), kanan: [1] });
        } else if (tb.jenis === 'daftar') {
          var kol = kolomDaftar(tb);
          var terisi = data.filter(function (b) { return kol.some(function (k) { return !k.kunci && (k.teks ? String(b[k.id] || '').trim() : kolomAngka(k) && isFinite(angka(b[k.id]))); }); });
          if (terisi.length) {
            blok.push({ jenis: 'tabel', judul: tb.judul, kepala: ['No.'].concat(kol.map(function (k) { return k.label + (k.satuan ? ' (' + k.satuan + ')' : ''); })),
              baris: terisi.map(function (b) {
                return [String(data.indexOf(b) + 1)].concat(kol.map(function (k) {
                  if (k.pilihan) return labelPilihan(k.pilihan, pilihanSah(k.pilihan, b[k.id]));
                  return k.teks ? esc(b[k.id] || '') : teksAngka(b[k.id]);
                }));
              }), kanan: kol.map(function (k, i) { return kolomAngka(k) ? i + 1 : -1; }) });
          }
        } else {
          var kk = data.filter(function (k) { return tb.baris.some(function (b) { return isFinite(angka(k[b.id])); }); });
          if (kk.length) {
            blok.push({ jenis: 'tabel', judul: tb.judul, kepala: ['Uraian', 'Simbol', 'Satuan'].concat(kk.map(function (k) { return tb.kolom + ' ' + esc(k.nama); })),
              baris: tb.baris.map(function (b) { return [teks(b.label), b.simbol || '', teks(b.satuan)].concat(kk.map(function (k) { return teksAngka(k[b.id]); })); }),
              kanan: kk.map(function (k, i) { return i + 3; }) });
          }
        }
      });
      blok.push({ jenis: 'subjudul', teks: 'Hasil pengolahan' });
      var judulTerakhir = '';
      var anak = [];
      urutanHasil.forEach(function (el) {
        if (el.classList.contains('kisi-grafik')) Array.prototype.forEach.call(el.children, function (x) { anak.push(x); });
        else anak.push(el);
      });
      anak.forEach(function (el) {
        if (el.tagName === 'H3') { judulTerakhir = el.textContent; return; }
        if (el.classList.contains('ringkasan')) {
          blok.push({ jenis: 'tabel', judul: 'Ringkasan hasil', kepala: ['Besaran', 'Nilai', 'Keterangan'], kanan: [1],
            baris: Array.prototype.map.call(el.querySelectorAll('.kartu'), function (k) {
              var d = k.children;
              return [d[0] ? d[0].innerHTML : '', d[1] ? d[1].innerHTML.replace(/<\/?small>/g, ' ').replace(/\s+/g, ' ') : '', d[2] ? d[2].innerHTML : ''];
            }) });
        } else if (el.tagName === 'FIGURE') {
          var svg = el.querySelector('svg'), cap = el.querySelector('figcaption');
          if (svg) blok.push({ jenis: 'gambar', svg: svg, judul: cap ? cap.textContent.split('. ')[0].replace(/\.$/, '') : '' });
        } else if (el.classList.contains('tabel-gulir')) {
          var t = el.querySelector('table'), th = t.querySelectorAll('thead th');
          var judulBersih = (judulTerakhir || 'Hasil').replace(/^Tabel\s+/i, '');
          blok.push({ jenis: 'tabel', judul: judulBersih.charAt(0).toUpperCase() + judulBersih.slice(1),
            kanan: Array.prototype.map.call(th, function (x, i) { return x.classList.contains('angka') ? i : -1; }),
            kepala: Array.prototype.map.call(th, function (x) { return x.innerHTML; }),
            baris: Array.prototype.map.call(t.querySelectorAll('tbody tr'), function (tr) { return Array.prototype.map.call(tr.children, function (td) { return td.innerHTML; }); }),
            kaki: t.querySelector('tfoot tr') ? Array.prototype.map.call(t.querySelector('tfoot tr').children, function (td) { return td.innerHTML; }) : null });
          judulTerakhir = '';
        }
      });
      return blok;
    }

    // Tempel blok sel dari Excel mulai dari isian yang sedang aktif.
    function tempel(tbId, i0, k0, grid) {
      var tb = tabelDef(tbId), data = keadaan.tabel[tbId], jumlah = 0;
      if (tb.jenis === 'daftar') {
        var ids = kolomDaftar(tb).map(function (k) { return k.id; }), c0 = ids.indexOf(k0);
        grid.forEach(function (baris, r) {
          var i = i0 + r;
          if (i >= (tb.maks || 60)) return;
          while (data.length <= i) data.push({});
          baris.forEach(function (v, c) { if (ids[c0 + c] !== undefined) { data[i][ids[c0 + c]] = v.trim(); jumlah++; } });
        });
      } else if (tb.jenis === 'baris') {
        grid.forEach(function (baris, r) { if (data[i0 + r]) { data[i0 + r].nilai = baris[0].trim(); jumlah++; } });
      } else {
        var idb = tb.baris.map(function (b) { return b.id; }), b0 = idb.indexOf(k0);
        if (b0 < 0) return 0;
        grid.forEach(function (baris, r) {
          if (idb[b0 + r] === undefined) return;
          baris.forEach(function (v, c) {
            var i = i0 + c;
            if (i >= (tb.maks || 10)) return;
            while (data.length <= i) data.push({ nama: String(data.length + 1) });
            data[i][idb[b0 + r]] = v.trim(); jumlah++;
          });
        });
      }
      return jumlah;
    }

    function aksi(nama) {
      if (nama === 'contoh') {
        keadaan = lengkapi(contoh()); perbarui(true);
        if (tabAktif === 'pengantar') bukaTab('hasil', { gulir: true });
        pesan('Data contoh dimuat. Angkanya hanya contoh, bukan data pengujian sungguhan.');
      }
      if (nama === 'kosong') {
        if (!root.confirm('Kosongkan semua isian di formulir ini? Data yang belum diekspor akan hilang.')) return;
        keadaan = kosong(); perbarui(true); bukaTab('data', { gulir: true }); pesan('Formulir dikosongkan.');
      }
      if (nama === 'hitung') {
        perbarui(false); bukaTab('hasil', { gulir: true });
        var mm0 = masukan();
        pesan(mm0.tidakLengkap.length ? 'Ada data yang belum lengkap; lihat catatan di tab Hasil.' : 'Hasil dihitung ulang dari data di formulir.');
      }
      if (nama === 'tautan') {
        var url = tautanData(), elp = document.getElementById('pesan-praktikum');
        if (!url) pesan('Tautan gagal dibuat: data memuat huruf yang tidak bisa dikodekan.');
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { pesan('Tautan data disalin. Siapa pun yang membukanya akan melihat data yang sama.'); },
          function () { history.replaceState(null, '', url); elp.textContent = 'Salin tautan dari bilah alamat browser.'; });
        else { history.replaceState(null, '', url); pesan('Salin tautan dari bilah alamat browser.'); }
      }
      if (nama === 'cetak') window.print();
      if (nama === 'salin-excel') {
        var tsv = tabelEkspor().map(function (b) { return b.map(function (v) { return sel(v, '\t'); }).join('\t'); }).join('\n');
        if (navigator.clipboard) navigator.clipboard.writeText(tsv).then(function () { pesan('Tabel disalin. Tempel di Excel dengan Ctrl+V.'); }, function () { pesan('Browser menolak akses papan klip. Pakai tombol Unduh CSV.'); });
        else pesan('Browser tidak mendukung salin otomatis. Pakai tombol Unduh CSV.');
      }
      if (nama === 'csv') {
        var csv = '﻿' + tabelEkspor().map(function (b) { return b.map(function (v) { return sel(v, ';'); }).join(';'); }).join('\r\n');
        root.Ekspor.unduh(new Blob([csv], { type: 'text/csv;charset=utf-8' }), def.id + '.csv');
        pesan('Berkas ' + def.id + '.csv diunduh. Pemisah kolom titik koma dan desimal koma, sesuai Excel berbahasa Indonesia.');
      }
      if (nama === 'word') {
        if (!gambarHasil()) { pesan('Belum ada hasil untuk diekspor. Lengkapi data atau perbaiki galat dulu.'); return; }
        pesan('Menyiapkan berkas Word…');
        root.Ekspor.word({ judul: esc(judulEkspor()), identitas: identitasCetak().map(function (p) { return [p[0], esc(p[1])]; }),
          blok: blokWord(), nama: def.id + '.docx' })
          .then(function () { pesan('Berkas ' + def.id + '.docx diunduh: Times New Roman 11, tabel tanpa garis vertikal, nomor tabel dan gambar berurutan. Sesuaikan nomornya dengan bab laporan.'); },
            function (e) { pesan('Berkas Word gagal dibuat: ' + e.message); });
      }
    }

    // ---------------- pendengar (delegasi, jadi tetap jalan setelah formulir digambar ulang)
    // Panel Pengantar dan Sumber sudah ada di halaman (dibuat bangun_situs.py); panel lain dan tab dibuat di sini.
    function panel(n, judul, isi) {
      var p = document.getElementById('panel-' + n);
      if (!p) {
        p = document.createElement('section');
        p.className = 'panel-alat'; p.id = 'panel-' + n;
        p.innerHTML = '<h2 class="judul-panel">' + judul + '</h2>' + (isi || '');
      } else if (isi) p.insertAdjacentHTML('beforeend', isi);
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', 'tab-' + n);
      p.tabIndex = 0;
      return p;
    }
    var pPengantar = panel('pengantar', 'Pengantar'), pSumber = panel('sumber', 'Sumber dan catatan');
    var isiPengantar = document.getElementById('pengantar-isi');
    if (!isiPengantar) { isiPengantar = document.createElement('div'); isiPengantar.id = 'pengantar-isi'; pPengantar.appendChild(isiPengantar); }
    isiPengantar.innerHTML = '<div id="pengantar-belajar" class="pengantar-belajar"></div>' +
      '<div class="pengantar-mulai tidak-cetak"><button type="button" class="tombol utama" data-ke-tab="data">Isi data</button>' +
      '<span class="kecil redup">atau klik <strong>Muat data contoh</strong> untuk melihat contoh pengolahan dari laporan praktikum.</span></div>';
    var isiSumber = document.getElementById('sumber-isi');
    if (!isiSumber) { isiSumber = document.createElement('div'); isiSumber.id = 'sumber-isi'; pSumber.insertBefore(isiSumber, pSumber.firstChild.nextSibling); }
    isiSumber.innerHTML = (def.sumber ? '<h3>Acuan</h3><ul class="daftar-bersih">' + def.sumber.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' : '') +
      '<div id="beda-isi"></div>' +
      '<div class="catatan"><strong>Alat bantu belajar.</strong> Peringatan kuning adalah pemeriksaan kewajaran otomatis, bukan ketentuan standar. Ikuti modul dan arahan asisten laboratorium untuk laporan resmi.</div>';
    var pData = panel('data', 'Data', '<form id="formulir-praktikum" class="kartu" autocomplete="off" onsubmit="return false"></form>');
    var pHasil = panel('hasil', 'Hasil', '<section id="hasil-praktikum" aria-live="polite"></section>');
    var pGrafik = panel('grafik', 'Grafik', '<section id="grafik-praktikum"></section>');
    var kepalaTab = document.createElement('div');
    kepalaTab.className = 'kepala-tab'; kepalaTab.id = 'kepala-tab';
    kepalaTab.innerHTML = htmlTabDaftar() + htmlBilahAksi();
    var kopCetak = document.createElement('div');
    kopCetak.id = 'kop-cetak'; kopCetak.className = 'hanya-cetak';
    [kopCetak, kepalaTab, pPengantar, pData, pHasil, pGrafik, pSumber].forEach(function (x) { akar.appendChild(x); });
    akar.classList.add('alat-bertab');
    var form = document.getElementById('formulir-praktikum');
    var adaSyarat = (def.parameter || []).some(function (p) { return p.tampilJika; });
    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t.tagName === 'SELECT' && t.dataset.param) return; // ditangani 'change'
      if (t.dataset.param) { keadaan.param[t.dataset.param] = t.value; delete keadaan.contoh; perbarui(false); }
      else if (t.dataset.tabel) {
        var tb = keadaan.tabel[t.dataset.tabel], i = +t.dataset.i;
        if (!tb[i]) tb[i] = {};
        tb[i][t.dataset.k] = t.value; delete keadaan.contoh; perbarui(false);
      }
      else if (t.dataset.nim) {
        if (t.dataset.nim === 'nim') nimData.nim = t.value; else nimData.aktif = t.checked;
        simpan(KUNCI_NIM, nimData);
        var na = document.getElementById('nim-angka'); if (na) na.innerHTML = teksNim();
        perbarui(false);
      }
      else if (t.dataset.identitas) { identitas[t.dataset.identitas] = t.value; simpan(KUNCI_IDENTITAS, identitas); document.getElementById('kop-cetak').innerHTML = kop(); }
    });
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.tagName === 'SELECT' && t.dataset.param) { keadaan.param[t.dataset.param] = t.value; delete keadaan.contoh; perbarui(adaSyarat); }
    });
    form.addEventListener('paste', function (e) {
      var t = e.target;
      if (!t.dataset || !t.dataset.tabel || t.classList.contains('nama-kolom')) return;
      var teks = (e.clipboardData || window.clipboardData).getData('text');
      if (!/[\t\n]/.test(teks.replace(/[\r\n]+$/, ''))) return; // satu nilai: biarkan browser menempel biasa
      e.preventDefault();
      var grid = teks.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map(function (b) { return b.split('\t'); });
      var n = tempel(t.dataset.tabel, +t.dataset.i, t.dataset.k, grid);
      delete keadaan.contoh;
      perbarui(true);
      pesan(n + ' sel ditempel dari papan klip.');
    });
    form.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t) return;
      var d = t.dataset;
      if (d.aksi) return aksi(d.aksi);
      if (d.impor !== undefined) {
        var im = def.impor[+d.impor], h = bacaHasil(im.alat), isi = im.isi(h.nilai), n = 0;
        Object.keys(isi).forEach(function (k) {
          var v = isi[k];
          if (v === null || v === undefined || (typeof v === 'number' && !isFinite(v))) return;
          keadaan.param[k] = typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v; n++;
        });
        delete keadaan.contoh; perbarui(true);
        pesan(n + ' nilai diambil dari ' + im.nama + (h.contoh ? ' (data contoh).' : '.') + ' Periksa kembali sebelum dipakai.');
        return;
      }
      if (d.ambil) {
        var p = def.parameter.filter(function (x) { return x.id === d.ambil; })[0], hh = bacaHasil(p.dariAlat.alat);
        keadaan.param[p.id] = Math.round(p.dariAlat.ambil(hh.nilai) * 1e4) / 1e4;
        delete keadaan.contoh; perbarui(true); pesan('Nilai dari ' + p.dariAlat.nama + ' dipakai.');
        return;
      }
      if (d.tambahKolom) { var tk = keadaan.tabel[d.tambahKolom]; tk.push({ nama: String(tk.length + 1) }); perbarui(true); }
      if (d.kurangKolom) { keadaan.tabel[d.kurangKolom].pop(); perbarui(true); }
      if (d.hapusBaris) { keadaan.tabel[d.hapusBaris].splice(+d.i, 1); perbarui(true); }
      if (d.tambahDaftar) {
        var dt = keadaan.tabel[d.tambahDaftar], maks = tabelDef(d.tambahDaftar).maks || 60;
        for (var j = 0; j < +d.n && dt.length < maks; j++) dt.push({});
        perbarui(true);
      }
      if (d.tambahBaris) {
        var pilih = form.querySelector('[data-tambah-pilihan="' + d.tambahBaris + '"]').value;
        var def2 = tabelDef(d.tambahBaris), daftar = keadaan.tabel[d.tambahBaris];
        daftar.push({ nama: pilih });
        daftar.sort(function (a, b) { return def2.pilihanBaris.indexOf(a.nama) - def2.pilihanBaris.indexOf(b.nama); });
        perbarui(true);
      }
    });
    // Enter pindah ke isian di bawahnya, seperti mengisi lembar data.
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
      e.preventDefault();
      var t = e.target;
      if (!t.dataset.tabel) return;
      var jenis = tabelDef(t.dataset.tabel).jenis, kunci = jenis === 'daftar' || jenis === 'baris' ? 'k' : 'i';
      var cocok = Array.prototype.slice.call(form.querySelectorAll('input[data-tabel="' + t.dataset.tabel + '"]:not(.nama-kolom)'))
        .filter(function (x) { return x.dataset[kunci] === t.dataset[kunci]; });
      var i = cocok.indexOf(t);
      if (i >= 0 && i < cocok.length - 1) cocok[i + 1].focus();
    });
    // ---------------- tab, bilah aksi, menu ekspor, unduh PNG
    var menu = document.getElementById('menu-ekspor'), tombolEkspor = document.getElementById('tombol-ekspor');
    function menuEkspor(buka, fokus) {
      menu.hidden = !buka;
      tombolEkspor.setAttribute('aria-expanded', buka ? 'true' : 'false');
      if (buka && fokus) menu.querySelector('button').focus();
    }
    akar.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t || !akar.contains(t)) return;
      if (t.getAttribute('role') === 'tab') { bukaTab(t.id.replace(/^tab-/, '')); return; }
      if (t === tombolEkspor) { menuEkspor(menu.hidden, false); return; }
      if (t.dataset.keTab) { bukaTab(t.dataset.keTab, { gulir: true }); return; }
      if (t.dataset.png !== undefined) {
        var svg = t.closest('figure').querySelector('svg');
        var nama = def.id + '-' + ((svg.getAttribute('aria-label') || 'grafik').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) + '.png';
        root.Ekspor.png(svg, nama).then(function () { pesan('Grafik diunduh sebagai ' + nama + '.'); }, function (err) { pesan('Grafik gagal diunduh: ' + err.message); });
        return;
      }
      if (t.dataset.aksi && !form.contains(t)) { menuEkspor(false); aksi(t.dataset.aksi); }
    });
    document.addEventListener('click', function (e) { if (!menu.hidden && !e.target.closest('.menu-ekspor')) menuEkspor(false); });
    kepalaTab.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t.getAttribute('role') === 'tab') {
        var ada = TAB.map(function (x) { return x[0]; }).filter(bisaDibuka), i = ada.indexOf(t.id.replace(/^tab-/, '')), j = -1;
        if (e.key === 'ArrowRight') j = (i + 1) % ada.length;
        else if (e.key === 'ArrowLeft') j = (i - 1 + ada.length) % ada.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = ada.length - 1;
        if (j >= 0) { e.preventDefault(); bukaTab(ada[j], { fokus: true }); }
        return;
      }
      if (t === tombolEkspor && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); menuEkspor(true, true); return; }
      if (t.getAttribute('role') === 'menuitem') {
        var item = Array.prototype.slice.call(menu.querySelectorAll('button')), k = item.indexOf(t);
        if (e.key === 'ArrowDown') { e.preventDefault(); item[(k + 1) % item.length].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); item[(k - 1 + item.length) % item.length].focus(); }
        else if (e.key === 'Escape' || e.key === 'Tab') { menuEkspor(false); if (e.key === 'Escape') tombolEkspor.focus(); }
      }
    });
    // Keadaan lipatan diingat selama halaman terbuka.
    akar.addEventListener('toggle', function (e) {
      var d = e.target;
      if (d.dataset && d.dataset.lipatHasil !== undefined) lipatHasil[d.dataset.lipatHasil] = d.open;
      if (d.dataset && d.dataset.lipatData !== undefined) lipatData[d.dataset.lipatData] = d.open;
    }, true);
    root.addEventListener('hashchange', function () { var n = namaTab(location.hash); if (n && n !== tabAktif) bukaTab(n, { simpan: false }); });
    root.addEventListener('resize', geserGaris);
    // Cetak: semua panel tercetak berurutan dan semua lipatan terbuka; keadaan semula dikembalikan sesudahnya.
    var tertutup = [];
    root.addEventListener('beforeprint', function () {
      tertutup = Array.prototype.filter.call(akar.querySelectorAll('details.lipat'), function (d) { return !d.open; });
      tertutup.forEach(function (d) { d.open = true; });
    });
    root.addEventListener('afterprint', function () { tertutup.forEach(function (d) { d.open = false; }); tertutup = []; });

    var dariTautanData = !!U0.bacaHash(function (o) { return o && o.param && o.tabel; });
    var simpanan = baca(KUNCI), adaSimpanan = !!(simpanan && !simpanan.contoh);
    gambarFormulir();
    perbarui(false);
    // Tab awal: dari alamat (#data, #hasil, …); tautan berisi data membuka Hasil; pengguna yang sudah punya data
    // tersimpan langsung ke Data; pengunjung baru mulai dari Pengantar.
    bukaTab(namaTab(location.hash) || (dariTautanData ? 'hasil' : adaSimpanan ? 'data' : 'pengantar'),
      { simpan: !!namaTab(location.hash) || dariTautanData });
    if (dariTautanData) pesan('Data dimuat dari tautan dan disimpan di browser ini.');
    if (root.document.fonts && document.fonts.ready) document.fonts.ready.then(geserGaris);
  }

  root.Praktikum = { pasang: pasang, angka: angka, bacaHasil: bacaHasil, simpanHasil: simpanHasil };
})(this);
