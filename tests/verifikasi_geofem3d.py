"""Verifikasi halaman GeoFEM 3D (aplikasi desktop, kodenya di repo geosr-lab/geofem3d).

Halaman wajib menautkan unduhan rilis dan repo kode, menampilkan gambar yang ada, dan
mencantumkan setiap sumber di konten/alat.json. Uji numerik aplikasinya ada di repo
geosr-lab/geofem3d (tests/).

Jalankan dari akar repo:  python3 tests/verifikasi_geofem3d.py
"""
import json
import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
HAL = AKAR / "docs/geofem3d/index.html"


def main():
    teks = HAL.read_text(encoding="utf-8")
    alat = next(a for a in json.loads((AKAR / "konten/alat.json").read_text(encoding="utf-8"))["alat"]
                if a["id"] == "geofem3d")
    gagal = []
    for tautan in ("https://github.com/geosr-lab/geofem3d/releases/latest/download/GeoFEM3D-windows.zip",
                   "https://github.com/geosr-lab/geofem3d"):
        if f'href="{tautan}"' not in teks:
            gagal.append(f"tautan {tautan} tidak ada")
    for src in re.findall(r'<img src="([^"]+)"', teks):
        if not (HAL.parent / src).resolve().is_file():
            gagal.append(f"gambar {src} tidak ada")
    # versi browser: setiap berkas solver yang dimuat pekerja.js ada, begitu juga Pyodide dan paketnya
    pekerja = (AKAR / "docs/assets/geofem3d/pekerja.js").read_text(encoding="utf-8")
    berkas = re.search(r"var BERKAS = \[([^\]]+)\]", pekerja).group(1)
    for nama in re.findall(r"'([a-z_]+)'", berkas):
        if not (AKAR / f"docs/assets/geofem3d/py/geofem/{nama}.py").is_file():
            gagal.append(f"berkas solver {nama}.py tidak ada")
    vendor = AKAR / "docs/assets/vendor/pyodide"
    kunci = json.loads((vendor / "pyodide-lock.json").read_text(encoding="utf-8"))
    for f in ["pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "LICENSE"] + \
             [kunci["packages"][p]["file_name"] for p in ("numpy", "scipy", "openblas")]:
        if not (vendor / f).is_file():
            gagal.append(f"berkas Pyodide {f} tidak ada")
    for s in alat["sumber"]:
        penulis = s.split("(")[0].strip()
        if penulis.replace("&", "&amp;") not in teks:
            gagal.append(f"sumber '{penulis}' tidak tercantum di halaman")
    for g in gagal:
        print("GAGAL ", g)
    print("\nSemua cocok." if not gagal else f"\n{len(gagal)} pemeriksaan gagal.")
    sys.exit(1 if gagal else 0)


if __name__ == "__main__":
    main()
