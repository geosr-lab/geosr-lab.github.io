"""Verifikasi tata letak situs di browser sungguhan (Chromium lewat Playwright).

Untuk setiap halaman di docs/ (kecuali halaman pengalih) pada lebar 375 px dan 1280 px,
dan untuk halaman utama pada 375, 768, 1024, 1280, dan 1440 px:
1. Tidak ada gulir mendatar.
2. Tidak ada rumus KaTeX yang gagal (.katex-error).
3. Tidak ada galat JavaScript.
4. Tidak ada dua elemen bersaudara (tombol, chip, kartu, judul, paragraf, isian) yang saling menimpa lebih dari 2 px.
5. Di beranda, label blok tanah 3D tidak saling menimpa dan tidak keluar dari panggung,
   untuk kesepuluh lapisan, dalam keadaan rapat dan terurai.

Butuh Playwright:  pip install playwright  lalu  python -m playwright install chromium
Tanpa Playwright uji ini dilewati (keluar 0) supaya uji hitungan tetap bisa dijalankan.

Jalankan dari akar repo:  python3 tests/verifikasi_tata_letak.py
"""
import functools
import http.server
import sys
import threading
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
DOCS = AKAR / "docs"
LEBAR_SEMUA = (375, 1280)
LEBAR_UTAMA = (375, 768, 1024, 1280, 1440)
HALAMAN_UTAMA = ("index.html", "praktikum/index.html", "praktikum/atterberg/index.html", "alat/index.html",
                 "kalkulator/tiang-bor.html", "latihan/index.html", "pembuat/index.html")

# Elemen bersaudara yang saling menimpa. Elemen berposisi absolute/fixed/sticky dan yang sengaja
# ditumpuk (kanvas, sketsa, isi tersembunyi) tidak dihitung.
JS_TIMPA = r"""
() => {
  const pilih = 'a, button, input, select, textarea, label, h1, h2, h3, h4, p, li, dt, dd, .chip, .tombol, .kartu, .petak';
  const tampak = (e) => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05
      && (s.position === 'static' || s.position === 'relative') && !e.closest('[hidden], [aria-hidden="true"], .sr-only, svg, .katex');
  };
  const nama = (e) => e.tagName.toLowerCase() + (e.className && e.className.toString ? '.' + e.className.toString().trim().split(/\s+/).join('.') : '')
    + ' "' + (e.innerText || e.value || '').trim().slice(0, 24) + '"';
  const hasil = [];
  const induk = new Set();
  document.querySelectorAll(pilih).forEach((e) => { if (e.parentElement) induk.add(e.parentElement); });
  induk.forEach((p) => {
    const anak = Array.from(p.children).filter((e) => e.matches(pilih) && tampak(e));
    for (let i = 0; i < anak.length; i++) for (let j = i + 1; j < anak.length; j++) {
      const a = anak[i].getBoundingClientRect(), b = anak[j].getBoundingClientRect();
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (x > 2 && y > 2) hasil.push(nama(anak[i]) + ' menimpa ' + nama(anak[j]) + ' (' + Math.round(x) + ' x ' + Math.round(y) + ' px)');
    }
  });
  // Isi yang keluar dari kartu atau panelnya (misalnya isian tabel yang lebih lebar dari kartu).
  const wadah = '.kartu, .petak, .alur-tahap, .b3-info, .kartu-praktikum, .panel, figure.sketsa';
  document.querySelectorAll('input, select, textarea, button, table, svg, img, canvas, .tombol, .chip').forEach((e) => {
    const k = e.parentElement && e.parentElement.closest(wadah);
    if (!k || e.closest('[hidden], [aria-hidden="true"], .sr-only, .tabel-gulir') || !tampak(e) && e.tagName !== 'svg') return;
    const s = getComputedStyle(k);
    if (s.overflowX !== 'visible') return;   // kartu yang memotong atau menggulir isinya sendiri
    const r = e.getBoundingClientRect(), b = k.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const lewat = Math.max(r.right - b.right, b.left - r.left);
    if (lewat > 2) hasil.push(nama(e) + ' keluar ' + Math.round(lewat) + ' px dari ' + k.className.toString().trim().split(/\s+/)[0]);
  });
  return hasil.slice(0, 6);
}
"""

JS_LABEL_3D = r"""
async () => {
  const panggung = document.querySelector('.blok-panggung');
  if (!panggung || !document.querySelector('.blok3d.ada-3d')) return null;   // tanpa WebGL: blok 3D tidak tampil
  const jeda = (ms) => new Promise((r) => setTimeout(r, ms));
  const periksa = (ket) => {
    const tampak = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const el = Array.from(panggung.querySelectorAll('.b3-label, .b3-label-lapis, .jelajah-alat button')).filter(tampak);
    const st = panggung.getBoundingClientRect(), salah = [];
    for (let i = 0; i < el.length; i++) {
      const a = el[i].getBoundingClientRect();
      if (a.left < st.left - 1 || a.right > st.right + 1 || a.top < st.top - 1 || a.bottom > st.bottom + 1) salah.push(ket + ': "' + el[i].innerText + '" keluar dari panggung');
      for (let j = i + 1; j < el.length; j++) {
        const b = el[j].getBoundingClientRect();
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (x > 2 && y > 2) salah.push(ket + ': "' + el[i].innerText + '" menimpa "' + el[j].innerText + '" (' + Math.round(x) + ' x ' + Math.round(y) + ' px)');
      }
    }
    return salah;
  };
  let salah = [];
  const nomor = Array.from(document.querySelectorAll('.b3-no'));
  for (const urai of [false, true]) {
    if (urai) { document.querySelector('.blok3d [data-aksi="urai"]').click(); await jeda(900); }
    for (const b of nomor) { b.click(); await jeda(650); salah = salah.concat(periksa((urai ? 'terurai, ' : '') + 'lapisan ' + b.innerText)); }
  }
  return salah.slice(0, 8);
}
"""


def daftar_halaman():
    hasil = []
    for berkas in sorted(DOCS.rglob("*.html")):
        teks = berkas.read_text(encoding="utf-8", errors="replace")
        if 'http-equiv="refresh"' in teks:
            continue
        hasil.append(berkas.relative_to(DOCS).as_posix())
    return hasil


class Senyap(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("DILEWATI: Playwright belum terpasang (pip install playwright; python -m playwright install chromium).")
        return 0

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Senyap, directory=str(DOCS)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    dasar = f"http://127.0.0.1:{server.server_address[1]}/"

    gagal, jumlah, label_3d = [], 0, None
    halaman = daftar_halaman()
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        for lebar in LEBAR_UTAMA:
            konteks = browser.new_context(viewport={"width": lebar, "height": 900}, service_workers="block",
                                          reduced_motion="no-preference", has_touch=lebar < 720)
            hal = konteks.new_page()
            galat = []
            hal.on("pageerror", lambda e: galat.append(str(e)))
            for jalur in halaman:
                if lebar not in LEBAR_SEMUA and jalur not in HALAMAN_UTAMA:
                    continue
                del galat[:]
                hal.goto(dasar + jalur, wait_until="load")
                hal.wait_for_timeout(350)
                jumlah += 1
                tanda = f"{jalur} @ {lebar} px"
                ukur = hal.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth, document.querySelectorAll('.katex-error').length]")
                if ukur[0] > ukur[1] + 1:
                    gagal.append(f"{tanda}: gulir mendatar ({ukur[0]} > {ukur[1]} px)")
                if ukur[2]:
                    gagal.append(f"{tanda}: {ukur[2]} rumus KaTeX gagal")
                for g in galat:
                    gagal.append(f"{tanda}: galat JavaScript: {g[:160]}")
                for t in hal.evaluate(JS_TIMPA):
                    gagal.append(f"{tanda}: {t}")
                if jalur == "index.html":
                    hal.wait_for_timeout(1200)
                    hasil = hal.evaluate(JS_LABEL_3D)
                    if hasil is not None:
                        label_3d = (label_3d or 0) + 1
                        for t in hasil:
                            gagal.append(f"{tanda}: blok 3D, {t}")
            konteks.close()
        browser.close()
    server.shutdown()

    print(f"Tata letak: {jumlah} pemuatan halaman ({len(halaman)} halaman), blok 3D diperiksa di {label_3d or 0} lebar.")
    if label_3d is None:
        print("CATATAN: WebGL tidak tersedia di browser uji, label blok 3D tidak diperiksa.")
    if gagal:
        print(f"GAGAL: {len(gagal)} temuan")
        for g in gagal[:80]:
            print("  -", g)
        return 1
    print("LULUS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
