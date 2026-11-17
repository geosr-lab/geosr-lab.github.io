"""Salin solver GeoFEM 3D ke situs dan catat commit sumbernya.

Halaman docs/geofem3d/ menjalankan salinan paket geofem (repo geosr-lab/geofem3d) lewat Pyodide.
Skrip ini menyalin berkas yang dimuat docs/assets/geofem3d/pekerja.js dari checkout repo GeoFEM,
lalu menulis docs/assets/geofem3d/py/SUMBER.txt berisi commit asalnya, supaya jelas versi solver
mana yang tayang. Jalankan lagi setiap kali solver di repo GeoFEM berubah.

    python skrip/salin_geofem.py <folder checkout geofem3d>
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
TUJUAN = AKAR / "docs/assets/geofem3d/py"


def main():
    if len(sys.argv) != 2:
        sys.exit("Pemakaian: python skrip/salin_geofem.py <folder checkout geofem3d>")
    sumber = Path(sys.argv[1]).resolve()
    pekerja = (AKAR / "docs/assets/geofem3d/pekerja.js").read_text(encoding="utf-8")
    berkas = re.findall(r"'([a-z_]+)'", re.search(r"var BERKAS = \[([^\]]+)\]", pekerja).group(1))
    commit = subprocess.run(["git", "-C", str(sumber), "rev-parse", "HEAD"], capture_output=True, text=True,
                            check=True).stdout.strip()
    kotor = subprocess.run(["git", "-C", str(sumber), "status", "--porcelain", "geofem"], capture_output=True,
                           text=True, check=True).stdout.strip()
    if kotor:
        sys.exit("Folder geofem/ di repo sumber punya perubahan yang belum di-commit. Commit dulu supaya "
                 "commit yang dicatat sama dengan isi yang disalin.")
    (TUJUAN / "geofem").mkdir(parents=True, exist_ok=True)
    for nama in berkas:
        shutil.copyfile(sumber / "geofem" / f"{nama}.py", TUJUAN / "geofem" / f"{nama}.py")
    (TUJUAN / "SUMBER.txt").write_text(
        f"Disalin dari https://github.com/geosr-lab/geofem3d commit {commit}\n"
        f"Berkas: {', '.join(n + '.py' for n in berkas)}\n", encoding="utf-8", newline="\n")
    print(f"{len(berkas)} berkas disalin dari commit {commit[:7]}.")


if __name__ == "__main__":
    main()
