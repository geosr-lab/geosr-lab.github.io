/*
 * Web Worker GeoFEM 3D: menjalankan solver Python (paket geofem dari repo geosr-lab/geofem3d)
 * di browser lewat Pyodide 0.27.7 (docs/assets/vendor/pyodide/, MPL-2.0; numpy dan scipy BSD).
 * Semua berkas dimuat dari situs ini sendiri, tanpa CDN. Hitungan berjalan di luar utas halaman,
 * jadi halaman tetap bisa digulir selama menghitung.
 *
 * Pesan masuk : { proyek: <JSON proyek GeoFEM>, kerapatan: "kasar" | "sedang" | "halus" }
 * Pesan keluar: { jenis: "status", frac, teks } | { jenis: "hasil", data: <JSON> } | { jenis: "galat", teks }
 */
'use strict';
importScripts('../vendor/pyodide/pyodide.js');

var BERKAS = ['__init__', 'fem', 'material', 'hardening_soil', 'mesher', 'project', 'solver', 'mesh_terstruktur', 'web'];
var siap = null;

function muat() {
  if (siap) return siap;
  siap = (async function () {
    postMessage({ jenis: 'status', frac: 0, teks: 'Memuat Python (Pyodide, sekali saja per kunjungan) ...' });
    var py = await loadPyodide({ indexURL: new URL('../vendor/pyodide/', self.location).href });
    postMessage({ jenis: 'status', frac: 0, teks: 'Memuat numpy dan scipy ...' });
    await py.loadPackage(['numpy', 'scipy']);
    py.FS.mkdirTree('/home/pyodide/geofem');
    for (var i = 0; i < BERKAS.length; i++) {
      var r = await fetch(new URL('py/geofem/' + BERKAS[i] + '.py', self.location));
      if (!r.ok) throw new Error('Berkas solver ' + BERKAS[i] + '.py tidak bisa dimuat (' + r.status + ').');
      py.FS.writeFile('/home/pyodide/geofem/' + BERKAS[i] + '.py', await r.text());
    }
    await py.runPythonAsync('import sys\nsys.path.insert(0, "/home/pyodide")\nfrom geofem import web');
    return py;
  })();
  siap.catch(function () { siap = null; });
  return siap;
}

onmessage = async function (e) {
  try {
    var py = await muat();
    py.globals.set('proyek', e.data.proyek);
    py.globals.set('kerapatan', e.data.kerapatan || 'kasar');
    py.globals.set('progres', function (frac, teks) { postMessage({ jenis: 'status', frac: frac, teks: teks }); });
    var keluar = await py.runPythonAsync('web.hitung(proyek, kerapatan, progres)');
    postMessage({ jenis: 'hasil', data: keluar });
  } catch (err) {
    var baris = String((err && err.message) || err).trim().split('\n');
    postMessage({ jenis: 'galat', teks: baris[baris.length - 1] });
  }
};
