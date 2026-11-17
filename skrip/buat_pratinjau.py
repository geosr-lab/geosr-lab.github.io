"""Buat gambar pratinjau tautan (docs/assets/pratinjau.png, 1280 × 640 px).

Gambar ini dipakai sebagai og:image di semua halaman dan sebagai pratinjau sosial repo di GitHub.
Angka dan alamat dibaca dari konten/ (alat.json, praktikum.json, situs.json) dan dari bank soal,
jadi jalankan ulang setiap kali jumlah alat atau alamat situs berubah.

Butuh Playwright:  pip install playwright  lalu  python -m playwright install chromium
Jalankan dari akar repo:  python3 skrip/buat_pratinjau.py
"""
import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

AKAR = Path(__file__).resolve().parent.parent
KONTEN, DOCS = AKAR / "konten", AKAR / "docs"
KELUARAN = DOCS / "assets/pratinjau.png"
LEBAR, TINGGI = 1280, 640


def angka():
    alat = json.loads((KONTEN / "alat.json").read_text(encoding="utf-8"))["alat"]
    praktikum = json.loads((KONTEN / "praktikum.json").read_text(encoding="utf-8"))
    situs = json.loads((KONTEN / "situs.json").read_text(encoding="utf-8"))["situs"]
    n_praktikum = sum(1 for k in praktikum["kelompok"] for a in k["alat"] if a.get("status") == "tersedia")
    n_kalkulator = sum(1 for a in alat if a["halaman"].startswith("kalkulator/"))
    # Jumlah jenis soal sama dengan yang ditulis beranda (dibangun bangun_situs.py dari bank soal).
    beranda = (DOCS / "index.html").read_text(encoding="utf-8")
    cocok = re.search(r'(\d+) jenis soal', beranda)
    n_soal = int(cocok.group(1)) if cocok else None
    return n_praktikum, n_kalkulator, n_soal, situs.split("//", 1)[1].rstrip("/")


def halaman(n_praktikum, n_kalkulator, n_soal, host):
    font = (DOCS / "assets/font").as_uri()
    rincian = f"{n_praktikum} alat praktikum&ensp;·&ensp;{n_kalkulator} kalkulator" + (f"&ensp;·&ensp;{n_soal} jenis soal" if n_soal else "")
    return f"""<!doctype html><html lang="id"><head><meta charset="utf-8"><style>
@font-face {{ font-family: Archivo; src: url("{font}/archivo-latin-wdth-normal.woff2"); font-weight: 100 900; font-stretch: 62% 125%; }}
@font-face {{ font-family: Jakarta; src: url("{font}/plus-jakarta-sans-latin-600-normal.woff2"); font-weight: 600; }}
@font-face {{ font-family: Jakarta; src: url("{font}/plus-jakarta-sans-latin-700-normal.woff2"); font-weight: 700; }}
:root {{ --latar: #f1f2ec; --teks: #1c2427; --teks-2: #515a5b; --aksen: #1d6a63; --laterit: #a3401f;
        --l1: #c8b693; --l2: #8fa89b; --l3: #b5532e; --l4: #d6b25f; --l5: #6f8189; --l6: #5e4835; }}
html, body {{ margin: 0; }}
.kartu {{ position: relative; width: {LEBAR}px; height: {TINGGI}px; overflow: hidden; color: var(--teks);
  background: radial-gradient(55% 80% at 8% 0%, rgba(163, 64, 31, .10), transparent 70%),
    linear-gradient(rgba(29, 106, 99, .13) 1px, transparent 1px) 0 0 / 100% 40px,
    linear-gradient(90deg, rgba(29, 106, 99, .13) 1px, transparent 1px) 0 0 / 40px 100%,
    linear-gradient(rgba(29, 106, 99, .06) 1px, transparent 1px) 0 0 / 100% 8px,
    linear-gradient(90deg, rgba(29, 106, 99, .06) 1px, transparent 1px) 0 0 / 8px 100%, var(--latar); }}
.teks {{ position: absolute; left: 80px; top: 92px; width: 700px; }}
.asal {{ display: flex; align-items: center; gap: 14px; font: 600 26px/1 Jakarta, sans-serif; color: var(--teks-2); }}
.asal svg {{ width: 24px; height: 28px; }}
h1 {{ margin: 22px 0 18px; font: 800 150px/.92 Archivo, sans-serif; font-stretch: 122%; letter-spacing: -.02em; }}
.lead {{ font: 600 31px/1.35 Jakarta, sans-serif; color: var(--teks-2); }}
.angka {{ margin-top: 30px; font: 700 27px/1 Jakarta, sans-serif; color: var(--laterit); }}
.host {{ margin-top: 20px; font: 700 27px/1 Jakarta, sans-serif; color: var(--aksen); }}
.blok {{ position: absolute; right: 64px; top: 56px; width: 420px; height: 500px; filter: drop-shadow(18px 24px 18px rgba(28, 36, 39, .22)); }}
.pita {{ position: absolute; left: 0; right: 0; bottom: 0; height: 12px;
  background: linear-gradient(90deg, var(--l1) 0 17%, var(--l2) 17% 34%, var(--l3) 34% 51%, var(--l4) 51% 68%, var(--l5) 68% 85%, var(--l6) 85%); }}
</style></head><body><div class="kartu">
<div class="teks">
  <div class="asal"><svg viewBox="0 0 22 26"><rect width="22" height="6" rx="1" fill="var(--l3)"/><rect y="7.5" width="22" height="7" rx="1" fill="var(--l2)"/><rect y="16" width="22" height="4" rx="1" fill="var(--l4)"/><rect y="21.5" width="22" height="4.5" rx="1" fill="var(--l5)"/></svg>Geotechnical Soil Report</div>
  <h1>GeoSR</h1>
  <div class="lead">Olah data praktikum Mekanika Tanah dan hitung soal geoteknik, lengkap langkahnya.</div>
  <div class="angka">{rincian}</div>
  <div class="host">{host}</div>
</div>
<svg class="blok" viewBox="0 0 420 500" id="blok"></svg>
<div class="pita"></div>
</div>
<script>
  // Blok tanah isometrik: muka atas lapisan teratas, sisi kiri terang, sisi kanan digelapkan.
  var L = [['l1', 3], ['l2', 5], ['l3', 3], ['l4', 2], ['l5', 3], ['l6', 2]], lebar = 170, tinggi = 250, cx = 210, atas = 10;
  var dx = lebar * 0.866, dy = lebar * 0.5, total = 18, y = atas + dy, s = '';
  var muka = [cx, atas, cx + dx, atas + dy, cx, atas + 2 * dy, cx - dx, atas + dy].join(' ');
  s += '<polygon points="' + muka + '" fill="var(--l1)"/><polygon points="' + muka + '" fill="#fff" opacity=".18"/>';
  L.forEach(function (l) {{
    var t = tinggi * l[1] / total;
    s += '<polygon points="' + [cx - dx, y, cx, y + dy, cx, y + dy + t, cx - dx, y + t].join(' ') + '" fill="var(--' + l[0] + ')"/>';
    s += '<polygon points="' + [cx, y + dy, cx + dx, y, cx + dx, y + t, cx, y + dy + t].join(' ') + '" fill="var(--' + l[0] + ')"/>';
    s += '<polygon points="' + [cx, y + dy, cx + dx, y, cx + dx, y + t, cx, y + dy + t].join(' ') + '" fill="#000" opacity=".24"/>';
    s += '<polyline points="' + [cx - dx, y + t, cx, y + dy + t, cx + dx, y + t].join(' ') + '" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.5"/>';
    y += t;
  }});
  document.getElementById('blok').innerHTML = s;
</script></body></html>"""


def main():
    n_praktikum, n_kalkulator, n_soal, host = angka()
    sementara = AKAR / "skrip" / "_pratinjau.html"
    sementara.write_text(halaman(n_praktikum, n_kalkulator, n_soal, host), encoding="utf-8")
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            hal = b.new_page(viewport={"width": LEBAR, "height": TINGGI})
            hal.goto(sementara.as_uri())
            hal.evaluate("document.fonts.ready")
            hal.wait_for_timeout(300)
            hal.screenshot(path=str(KELUARAN))
            b.close()
    finally:
        sementara.unlink(missing_ok=True)
    print(f"Ditulis {KELUARAN.relative_to(AKAR).as_posix()}: {n_praktikum} alat praktikum, {n_kalkulator} kalkulator, {n_soal} jenis soal, {host}")


if __name__ == "__main__":
    main()
