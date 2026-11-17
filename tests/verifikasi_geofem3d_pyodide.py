"""Verifikasi GeoFEM 3D benar-benar menghitung di Pyodide (jalur yang dipakai browser).

Menjalankan salinan solver (docs/assets/geofem3d/py/geofem) di Pyodide lokal
(docs/assets/vendor/pyodide) lewat Node.js, dengan contoh bawaan halaman (jaring kasar, tanpa
reduksi phi-c), lalu memeriksa penurunan pondasi. Pyodide memakai numpy dan WebAssembly 32-bit
yang berbeda dari Python biasa; uji ini menangkap galat yang hanya muncul di sana.
Dilewati bila Node.js tidak terpasang.

Jalankan dari akar repo:  python3 tests/verifikasi_geofem3d_pyodide.py
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
ASET = AKAR / "docs/assets"

PROYEK = {
    "name": "contoh", "gamma_w": 10,
    "materials": [
        {"name": "Pasir", "gamma_unsat": 17, "gamma_sat": 20, "E": 30000, "nu": 0.3, "c": 1, "phi": 32, "psi": 2},
        {"name": "Lempung", "gamma_unsat": 16, "gamma_sat": 18, "E": 12000, "nu": 0.33, "c": 12, "phi": 24, "psi": 0},
    ],
    "borehole": {"layers": [{"top": 0, "bottom": -4, "material": "Pasir"},
                            {"top": -4, "bottom": -15, "material": "Lempung"}], "water_level": -2},
    "domain": {"Lx": 20, "Ly": 20, "symmetry": True},
    "footing": {"B": 2, "L": 2, "q": 150, "kind": "flexible"},
    "phases": {"method": "modified_newton", "run_safety": False},
}

SKRIP = """
import { loadPyodide } from %(pyodide)s;
import fs from "node:fs";
const py = await loadPyodide({ indexURL: %(indeks)s });
await py.loadPackage(["numpy", "scipy"]);
py.FS.mkdirTree("/home/pyodide/geofem");
for (const f of fs.readdirSync(%(solver)s)) py.FS.writeFile("/home/pyodide/geofem/" + f, fs.readFileSync(%(solver)s + "/" + f, "utf8"));
py.globals.set("proyek", %(proyek)s);
const keluar = await py.runPythonAsync('import sys\\nsys.path.insert(0, "/home/pyodide")\\nfrom geofem import web\\nweb.hitung(proyek, "kasar")');
console.log(keluar);
"""


def main():
    node = shutil.which("node")
    if not node:
        print("DILEWATI  Node.js tidak terpasang.")
        return
    with tempfile.TemporaryDirectory() as tmp:
        berkas = Path(tmp) / "uji.mjs"
        berkas.write_text(SKRIP % {
            "pyodide": json.dumps((ASET / "vendor/pyodide/pyodide.mjs").as_uri()),
            "indeks": json.dumps(str(ASET / "vendor/pyodide") + "/"),
            "solver": json.dumps(str(ASET / "geofem3d/py/geofem")),
            "proyek": json.dumps(json.dumps(PROYEK)),
        }, encoding="utf-8")
        jalan = subprocess.run([node, str(berkas)], capture_output=True, text=True, encoding="utf-8", timeout=900)
    gagal = []
    if jalan.returncode != 0:
        baris = [b for b in jalan.stderr.splitlines() if "Error:" in b and len(b) < 300] or ["?"]
        gagal.append("Pyodide berhenti: " + baris[-1].strip())
    else:
        out = json.loads(jalan.stdout.strip().splitlines()[-1])
        if out.get("galat"):
            gagal.append("solver menolak masukan: " + "; ".join(out["galat"]))
        else:
            s = out["ringkasan"]["penurunan_pondasi_mm"]
            print(f"Penurunan pondasi di Pyodide: {s:.2f} mm (Python desktop, jaring yang sama: 13,90 mm)")
            if abs(s - 13.90) > 0.05:
                gagal.append(f"penurunan {s:.2f} mm, seharusnya 13,90 mm")
            n = len(out["titik"]) // 3
            if not out["segitiga"] or max(out["segitiga"]) >= n:
                gagal.append("indeks segitiga di luar daftar titik")
    for g in gagal:
        print("GAGAL ", g)
    print("\nSemua cocok." if not gagal else f"\n{len(gagal)} pemeriksaan gagal.")
    sys.exit(1 if gagal else 0)


if __name__ == "__main__":
    main()
