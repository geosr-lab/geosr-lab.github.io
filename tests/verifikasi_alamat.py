"""Verifikasi alamat situs dan repo.

Alamat situs dan repo hanya ditulis di konten/situs.json. Uji ini gagal bila:
1. Ada alamat *.github.io atau repo *.github.io lain yang tertulis tetap di berkas repo
   (artinya berkas itu belum ikut dibangun atau belum masuk daftar BERALAMAT di skrip/bangun_situs.py).
2. Ada alamat di "alamat_lama" yang masih tersisa di berkas mana pun.
3. Service worker didaftarkan atau menyimpan aset dengan jalur akar ("/..."), yang rusak bila situs
   pindah ke subfolder.
4. Angka di README.en.md tidak sama dengan registri.

Jalankan dari akar repo:  python3 tests/verifikasi_alamat.py
"""
import json
import re
import subprocess
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
ALAMAT = json.loads((AKAR / "konten/situs.json").read_text(encoding="utf-8"))
SITUS, REPO = ALAMAT["situs"], ALAMAT["repo"]
# Riwayat perubahan boleh menyebut alamat lama; pustaka pihak ketiga punya tautannya sendiri.
LEWATI = ("CHANGELOG.md", "konten/situs.json", "docs/assets/vendor/", "docs/assets/katex/", "docs/assets/font/", ".claude/", "tests/verifikasi_alamat.py")
POLA = re.compile(r"https?://(?:[\w-]+\.github\.io|github\.com/[\w-]+/[\w.-]+\.github\.io)[^\s\"'<>)\]]*")


def main():
    gagal = []
    berkas = subprocess.run(["git", "ls-files"], cwd=AKAR, capture_output=True, text=True, check=True).stdout.split("\n")
    jumlah = 0
    for nama in filter(None, berkas):
        if nama.startswith(LEWATI) or not (AKAR / nama).is_file():
            continue
        try:
            teks = (AKAR / nama).read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for url in POLA.findall(teks):
            jumlah += 1
            if not (url.startswith(SITUS) or url.startswith(REPO) or url.rstrip("/") + "/" == SITUS):
                gagal.append(f"{nama}: alamat di luar konten/situs.json: {url}")
        for lama in ALAMAT.get("alamat_lama", []):
            for nilai in (lama["repo"], lama["situs"]):
                if nilai in teks:
                    gagal.append(f"{nama}: masih memuat alamat lama {nilai}")

    daftar = (AKAR / "docs/assets/daftar-sw.js").read_text(encoding="utf-8")
    if re.search(r"register\(\s*['\"]/", daftar):
        gagal.append("docs/assets/daftar-sw.js: service worker didaftarkan dengan jalur akar")
    sw = (AKAR / "docs/sw.js").read_text(encoding="utf-8")
    inti = re.search(r"const INTI = \[(.*?)\];", sw, re.S).group(1)
    if re.search(r'"/', inti):
        gagal.append("docs/sw.js: aset inti memakai jalur akar")

    alat = json.loads((AKAR / "konten/alat.json").read_text(encoding="utf-8"))["alat"]
    praktikum = json.loads((AKAR / "konten/praktikum.json").read_text(encoding="utf-8"))
    n_kalkulator = sum(1 for a in alat if a["halaman"].startswith("kalkulator/"))
    n_praktikum = sum(1 for k in praktikum["kelompok"] for a in k["alat"] if a.get("status") == "tersedia")
    en = (AKAR / "README.en.md").read_text(encoding="utf-8")
    for teks in (f"{n_praktikum} lab data tools", f"{n_kalkulator} calculators"):
        if teks not in en:
            gagal.append(f'README.en.md: tidak memuat "{teks}" (angka registri berubah?)')

    print(f"Alamat: {jumlah} alamat situs atau repo diperiksa.")
    if gagal:
        print(f"GAGAL: {len(gagal)} temuan")
        for g in gagal[:60]:
            print("  -", g)
        return 1
    print("Semua cocok.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
