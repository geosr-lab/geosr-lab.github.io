"""Bangun halaman situs dari tulisan di konten/ dan seragamkan menu serta footer.

Yang dilakukan:
1. Setiap berkas Markdown di konten/ diubah menjadi halaman HTML di docs/ dengan
   templat yang sama (menu, gaya, footer, tag pratinjau).
2. Daftar catatan dibuat otomatis (docs/catatan/) dan disisipkan ke beranda.
   Kartu alat di beranda, daftar di halaman Alat, dan tabel alat di README.md dibangun
   dari registri konten/alat.json (penanda ALAT dan DAFTAR-ALAT).
3. Menu dan footer di semua halaman docs/ (termasuk yang ditulis tangan) ditulis ulang
   di antara penanda <!-- NAV:MULAI --> … <!-- NAV:SELESAI --> dan <!-- FOOTER:MULAI --> …
   <!-- FOOTER:SELESAI -->, supaya selalu seragam.
4. sitemap.xml dan robots.txt dibuat ulang.

Pemakaian (dari akar repo):
  python3 skrip/bangun_situs.py            tulis ulang berkas
  python3 skrip/bangun_situs.py --periksa  hanya periksa; gagal bila ada berkas yang belum dibangun ulang

Membutuhkan paket Python "markdown" (lihat skrip/kebutuhan.txt).
"""
import html
import json
import os
import re
import sys
from pathlib import Path

import markdown

AKAR = Path(__file__).resolve().parent.parent
KONTEN, DOCS = AKAR / "konten", AKAR / "docs"
SITUS = "https://defsayurinda.github.io/"
REPO = "https://github.com/defsayurinda/defsayurinda.github.io"
DASAR_404 = "/"

NAMA = "GeoSR"
KEPANJANGAN = "Geotechnical Soil Report"
PEMBUAT = "Defsa Yurinda"

MENU = [("praktikum/", "Praktikum", ("praktikum",)),
        ("alat/", "Kalkulator", ("alat", "kalkulator")),
        ("latihan/", "Latihan", ("latihan",)),
        ("cari/", "Cari", ("cari",))]

# Isi pribadi (profil, catatan belajar, cara memakai AI, skill) dikumpulkan di area pembuat,
# hanya ditautkan dari kaki halaman. Alamat lama diarahkan ke alamat baru.
PRIBADI = "pembuat/"
# Versi bahasa Inggris sederhana (keputusan Defsa: beranda dan profil juga dalam bahasa Inggris).
# Alatnya sendiri tetap berbahasa Indonesia; menu Inggris menautkan ke halaman yang sama.
EN = "en/"
MENU_EN = [("praktikum/", "Lab tools", ("praktikum",)),
           ("alat/", "Calculators", ("alat", "kalkulator")),
           ("latihan/", "Practice", ("latihan",)),
           ("cari/", "Search", ("cari",))]
PADANAN = {"": EN, PRIBADI: f"{EN}pembuat/"}   # folder Indonesia → folder Inggris
KELOMPOK_EN = {"Sifat fisik": "Physical properties", "Konsistensi dan gradasi": "Consistency and gradation",
               "Kepadatan": "Compaction", "Permeabilitas": "Permeability",
               "Kekuatan dan konsolidasi": "Strength and consolidation", "Uji lapangan": "Field tests"}


# ---------------------------------------------------------------- peta sumber → halaman

def peta_halaman():
    """Kembalikan daftar (berkas sumber, folder keluaran relatif terhadap docs/)."""
    peta = [(KONTEN / "tentang.md", PRIBADI)]
    for bagian in ("cara-memakai-ai", "skill"):
        # Urutkan menurut nama (peka huruf besar) supaya urutan sama di Windows dan Linux/CI.
        for f in sorted((KONTEN / bagian).glob("*.md"), key=lambda p: p.name):
            peta.append((f, f"{PRIBADI}{bagian}/" if f.name == "README.md" else f"{PRIBADI}{bagian}/{f.stem}/"))
    for f in sorted((KONTEN / "catatan").glob("*.md"), key=lambda p: p.name):
        peta.append((f, f"{PRIBADI}catatan/{f.stem}/"))
    return peta


def peta_pengalih(peta):
    """Alamat lama → alamat baru untuk halaman pribadi yang dipindah ke area pembuat."""
    pengalih = {"tentang/": PRIBADI, "catatan/": f"{PRIBADI}catatan/"}
    for _, folder in peta:
        if folder.startswith(PRIBADI) and folder != PRIBADI:
            pengalih[folder[len(PRIBADI):]] = folder
    return pengalih


def halaman_pengalih(lama, baru):
    href = relatif(lama, baru)
    awalan = "../" * kedalaman(lama)
    return ('<!doctype html>\n<html lang="id">\n<head>\n  <meta charset="utf-8">\n'
            f'  <title>Pindah · {NAMA}</title>\n  <meta name="robots" content="noindex">\n'
            f'  <link rel="canonical" href="{SITUS}{baru}">\n  <meta http-equiv="refresh" content="0; url={href}">\n'
            f'  <link rel="manifest" href="{awalan}manifest.webmanifest">\n'
            f'</head>\n<body>\n  <p>Halaman ini pindah ke <a href="{href}">{SITUS}{baru}</a>.</p>\n'
            f'  <script src="{awalan}assets/daftar-sw.js" defer></script>\n</body>\n</html>\n')


def kedalaman(folder):
    return folder.strip("/").count("/") + 1 if folder.strip("/") else 0


def relatif(dari_folder, ke):
    return "../" * kedalaman(dari_folder) + ke


# ---------------------------------------------------------------- bagian bersama

# Tanda merek: potongan inti bor dengan empat lapisan tanah (laterit, lempung, pasir, lempung kaku).
TANDA_MEREK = ('<svg class="merek-tanda" viewBox="0 0 22 26" aria-hidden="true">'
               '<rect x="0" y="0" width="22" height="26" rx="2" style="fill:none"/>'
               '<rect x="0" y="0" width="22" height="6" rx="1" style="fill:var(--lapis-3)"/>'
               '<rect x="0" y="7.5" width="22" height="7" rx="1" style="fill:var(--lapis-2)"/>'
               '<rect x="0" y="16" width="22" height="4" rx="1" style="fill:var(--lapis-4)"/>'
               '<rect x="0" y="21.5" width="22" height="4.5" rx="1" style="fill:var(--lapis-5)"/></svg>')


def inggris(folder):
    return folder is not None and folder.startswith(EN)


def menu(awalan, aktif, folder=None):
    tanda = ' aria-current="page"'
    en = inggris(folder)
    butir = "".join(f'<li><a href="{awalan}{url}"{tanda if aktif in kunci else ""}>{nama}</a></li>'
                    for url, nama, kunci in (MENU_EN if en else MENU))
    if en:
        asal = next((i for i, e in PADANAN.items() if e == folder), "")
        butir += f'<li class="menu-bahasa"><a href="{awalan}{asal}" lang="id" hreflang="id">Bahasa Indonesia</a></li>'
    elif folder in PADANAN:
        butir += f'<li class="menu-bahasa"><a href="{awalan}{PADANAN[folder]}" lang="en" hreflang="en">English</a></li>'
    beranda = f"{awalan}{EN}" if en else (awalan or "./")
    return (f'<nav class="nav">\n    <div class="wadah">\n      <a class="merek" href="{beranda}" aria-label="{NAMA}, {"home" if en else "beranda"}">{TANDA_MEREK}'
            f'<span>{NAMA}<span class="merek-lengkap">{KEPANJANGAN}</span></span></a>\n'
            f'      {tombol_tema(en)}\n'
            '      <button class="nav-tombol" type="button" aria-expanded="false" aria-controls="menu-utama">'
            '<span class="nav-garis" aria-hidden="true"></span><span class="sr-only">Menu</span></button>\n'
            f'      <ul id="menu-utama">{butir}</ul>\n    </div>\n  </nav>')


# Tombol tema: ikut sistem → terang → gelap. Ikon digambar sendiri; yang tampil diatur CSS dari atribut data-tema.
TOMBOL_TEMA = ('<button class="tema-tombol" type="button" aria-label="Tema: ikut sistem" title="Ganti tema">'
               '<svg viewBox="0 0 20 20" aria-hidden="true">'
               '<g class="ikon-otomatis"><circle cx="10" cy="10" r="6.5"/><path d="M10 3.5a6.5 6.5 0 0 0 0 13z" class="isi"/></g>'
               '<g class="ikon-terang"><circle cx="10" cy="10" r="3.4"/><path d="M10 2v2.2M10 15.8V18M2 10h2.2M15.8 10H18'
               'M4.3 4.3l1.6 1.6M14.1 14.1l1.6 1.6M4.3 15.7l1.6-1.6M14.1 5.9l1.6-1.6"/></g>'
               '<g class="ikon-gelap"><path d="M16 12.6A6.6 6.6 0 0 1 7.4 4a6.6 6.6 0 1 0 8.6 8.6z"/></g>'
               '</svg></button>')


def tombol_tema(en=False):
    if not en:
        return TOMBOL_TEMA
    return TOMBOL_TEMA.replace('aria-label="Tema: ikut sistem" title="Ganti tema"',
                               'aria-label="Theme: follow system" title="Change theme"')


def skrip_sw(awalan):
    return (f'\n  <script src="{awalan}assets/daftar-sw.js" defer></script>'
            f'\n  <script src="{awalan}assets/gerak.js" defer></script>')


def footer(awalan, sumber=None, en=False):
    if en:
        sel = (f'<div><dt>This page</dt><dd><a href="{REPO}/blob/main/{sumber}">Source text</a></dd></div>' if sumber else "")
        return ('<footer>\n    <div class="wadah kaki-isi">\n'
                f'      <div class="kaki-merek"><a href="{awalan}{EN}">{NAMA}</a><span>{KEPANJANGAN} · made by '
                f'<a href="{awalan}{EN}pembuat/">{PEMBUAT}</a></span></div>\n'
                '      <dl class="kaki-etiket">'
                f'<div><dt>Maker</dt><dd><a href="{awalan}{EN}pembuat/">About</a></dd></div>'
                f'<div><dt>Code</dt><dd><a href="{REPO}">GitHub</a></dd></div>{sel}'
                f'<div><dt>License</dt><dd>Code <a href="{REPO}/blob/main/LICENSE">MIT</a>, writing '
                f'<a href="{REPO}/blob/main/LICENSE-TULISAN">CC BY 4.0</a> · <a href="{awalan}kredit/">Asset credits</a></dd></div></dl>\n'
                '    </div>\n  </footer>' + skrip_sw(awalan))
    sel_sumber = (f'<div><dt>Halaman ini</dt><dd><a href="{REPO}/blob/main/{sumber}">Sumber tulisan</a></dd></div>'
                  if sumber else "")
    return ('<footer>\n    <div class="wadah kaki-isi">\n'
            f'      <div class="kaki-merek"><a href="{awalan or "./"}">{NAMA}</a><span>{KEPANJANGAN} · dibuat oleh '
            f'<a href="{awalan}{PRIBADI}">{PEMBUAT}</a></span></div>\n'
            '      <dl class="kaki-etiket">'
            f'<div><dt>Pembuat</dt><dd><a href="{awalan}{PRIBADI}">Profil</a> · <a href="{awalan}{PRIBADI}catatan/">Catatan</a></dd></div>'
            f'<div><dt>Kode</dt><dd><a href="{REPO}">GitHub</a></dd></div>{sel_sumber}'
            f'<div><dt>Lisensi</dt><dd>Kode <a href="{REPO}/blob/main/LICENSE">MIT</a>, tulisan '
            f'<a href="{REPO}/blob/main/LICENSE-TULISAN">CC BY 4.0</a> · <a href="{awalan}kredit/">Kredit aset</a></dd></div>'
            f'<div><dt>Rujukan</dt><dd><a href="{awalan}notasi/">Kamus notasi</a></dd></div></dl>\n'
            '    </div>\n  </footer>' + skrip_sw(awalan))


def bagian_aktif(folder):
    return folder.strip("/").split("/")[0] if folder.strip("/") else ""


# ---------------------------------------------------------------- Markdown → HTML

def judul_dan_ringkasan(teks):
    judul = re.search(r"^# (.+)$", teks, re.M).group(1).strip()
    ringkasan = ""
    for par in re.split(r"\n\s*\n", teks):
        par = par.strip()
        if not par or par.startswith(("#", "|", "-", "*", ">", "```", "<")) or re.match(r"^\d+\.", par):
            continue
        ringkasan = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", par)
        ringkasan = re.sub(r"<[^>]+>|[*`_]", "", ringkasan).replace("\n", " ")
        break
    if len(ringkasan) > 180:
        ringkasan = ringkasan[:177].rsplit(" ", 1)[0] + "…"
    return judul, ringkasan


def tulis_ulang_tautan(isi_html, sumber, folder, peta):
    ke_url = {s.resolve(): f for s, f in peta}

    def ganti(m):
        href = m.group(1)
        if re.match(r"^(https?:|mailto:|#)", href):
            return m.group(0)
        jalur, _, jangkar = href.partition("#")
        target = (sumber.parent / jalur).resolve()
        if target in ke_url:
            baru = relatif(folder, ke_url[target])
        else:
            baru = f"{REPO}/blob/main/{target.relative_to(AKAR).as_posix()}"
        return f'href="{baru}{"#" + jangkar if jangkar else ""}"'

    return re.sub(r'href="([^"]+)"', ganti, isi_html)


def tautan_bahasa(url):
    """<link rel="alternate" hreflang> untuk halaman yang punya padanan bahasa Inggris (dan sebaliknya)."""
    id_ = url if url in PADANAN else next((i for i, e in PADANAN.items() if e == url), None)
    if id_ is None:
        return ""
    return (f'\n  <link rel="alternate" hreflang="id" href="{SITUS}{id_}">'
            f'\n  <link rel="alternate" hreflang="en" href="{SITUS}{PADANAN[id_]}">')


def kepala(judul, ringkasan, awalan, url, tambahan="", bahasa="id"):
    j, r = html.escape(judul), html.escape(ringkasan)
    tambahan = tautan_bahasa(url) + tambahan
    return f"""<!doctype html>
<html lang="{bahasa}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{j} · {NAMA}</title>
  <meta name="description" content="{r}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="{NAMA} · {KEPANJANGAN}">
  <meta property="og:title" content="{j} · {NAMA}">
  <meta property="og:description" content="{r}">
  <meta property="og:url" content="{SITUS}{url}">
  <meta property="og:image" content="{SITUS}assets/pratinjau.png">
  <meta property="og:locale" content="{"en_US" if bahasa == "en" else "id_ID"}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#f1f2ec" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#10181a" media="(prefers-color-scheme: dark)">
  <link rel="stylesheet" href="{awalan}assets/gaya.css">
  <script src="{awalan}assets/tema.js"></script>
  <link rel="icon" href="{awalan}assets/ikon.svg" type="image/svg+xml">
  <link rel="manifest" href="{awalan}manifest.webmanifest">{tambahan}
</head>"""


def halaman_konten(sumber, folder, peta, sebelum=None, sesudah=None, en=False):
    teks = sumber.read_text(encoding="utf-8")
    judul, ringkasan = judul_dan_ringkasan(teks)
    isi = markdown.markdown(teks, extensions=["tables", "fenced_code", "sane_lists"], output_format="html")
    isi = tulis_ulang_tautan(isi, sumber, folder, peta)
    awalan = "../" * kedalaman(folder)
    aktif = bagian_aktif(folder)
    sub = folder[len(PRIBADI):] if folder.startswith(PRIBADI) else folder
    if en:
        atas = (EN, "Home")
    elif folder == PRIBADI:
        atas = ("", "Beranda")
    elif sub.startswith("catatan/"):
        atas = (f"{PRIBADI}catatan/", "Semua catatan")
    elif sub in ("cara-memakai-ai/", "skill/"):
        atas = (PRIBADI, "Pembuat")
    else:
        bagian = sub.split("/")[0]
        atas = (f"{PRIBADI}{bagian}/", {"cara-memakai-ai": "Cara saya memakai AI", "skill": "Skill Claude"}[bagian])
    remah = f'<p class="remah"><a href="{awalan}{atas[0]}">{atas[1]}</a></p>'
    navigasi = ""
    if sebelum or sesudah:
        navigasi = "\n      " + alur_sebelum_sesudah(
            sebelum and ("Catatan sebelumnya", sebelum[0], relatif(folder, sebelum[1])),
            sesudah and ("Catatan berikutnya", sesudah[0], relatif(folder, sesudah[1])))
    return (kepala(judul, ringkasan, awalan, folder, bahasa="en" if en else "id") + "\n<body>\n  <!-- NAV:MULAI -->\n  " + menu(awalan, aktif, folder) +
            "\n  <!-- NAV:SELESAI -->\n\n  <main class=\"wadah\">\n    <article class=\"prosa\">\n      " + remah + "\n" +
            isi + navigasi + "\n    </article>\n  </main>\n\n  <!-- FOOTER:MULAI -->\n  " +
            footer(awalan, sumber.relative_to(AKAR).as_posix(), en) + "\n  <!-- FOOTER:SELESAI -->\n</body>\n</html>\n")


def alur_sebelum_sesudah(sebelum, sesudah, lapis_sebelum="", lapis_sesudah=""):
    """Dua tautan besar ke halaman sebelum dan sesudahnya. Masing-masing (arah, judul, href) atau None."""
    butir = []
    for kelas, isi, lapis in (("sebelum", sebelum, lapis_sebelum), ("sesudah", sesudah, lapis_sesudah)):
        if isi:
            atr = f' data-lapis="{lapis}"' if lapis else ""
            butir.append(f'<a class="{kelas}" href="{isi[2]}"{atr}><span class="arah">{isi[0]}</span>'
                         f'<span class="judul">{html.escape(isi[1])}</span></a>')
    return f'<nav class="alur-alat" aria-label="Halaman sebelum dan sesudahnya">{"".join(butir)}</nav>'


def daftar_catatan(peta):
    hasil = []
    for sumber, folder in peta:
        if folder.startswith(f"{PRIBADI}catatan/"):
            judul, ringkasan = judul_dan_ringkasan(sumber.read_text(encoding="utf-8"))
            nomor, _, nama = judul.partition(" — ")
            hasil.append((nomor, nama or judul, ringkasan, folder))
    return hasil


def halaman_daftar_catatan(catatan):
    folder, awalan = f"{PRIBADI}catatan/", "../../"
    butir = "\n".join(
        f'        <li><a href="{relatif(folder, f)}"><span class="nomor">{html.escape(n)}</span><span class="judul">{html.escape(j)}</span>'
        f'<span class="ringkas">{html.escape(r)}</span></a></li>' for n, j, r, f in reversed(catatan))
    return (kepala("Catatan belajar", "Catatan saya selama belajar Git, GitHub, dan Claude Code untuk kuliah teknik sipil.", awalan, folder) +
            "\n<body>\n  <!-- NAV:MULAI -->\n  " + menu(awalan, "pembuat") + "\n  <!-- NAV:SELESAI -->\n\n"
            "  <main class=\"wadah\">\n    <header class=\"pahlawan\">\n"
            f"      <p class=\"remah\"><a href=\"{awalan}{PRIBADI}\">Pembuat</a></p>\n"
            "      <h1>Catatan belajar</h1>\n"
            "      <p class=\"lead\">Catatan saya selama belajar Git, GitHub, dan Claude Code. Setiap catatan berisi konsep, contoh dari pengalaman sendiri, dan latihan.</p>\n"
            "    </header>\n    <ol class=\"daftar-nomor\">\n" + butir +
            "\n    </ol>\n  </main>\n\n  <!-- FOOTER:MULAI -->\n  " + footer(awalan) +
            "\n  <!-- FOOTER:SELESAI -->\n</body>\n</html>\n")


# ---------------------------------------------------------------- praktikum

def katex_css(awalan):
    return f'\n  <link rel="stylesheet" href="{awalan}assets/katex/katex.min.css">'


def data_praktikum():
    return json.loads((KONTEN / "praktikum.json").read_text(encoding="utf-8"))


def slug(teks):
    return re.sub(r"[^a-z0-9]+", "-", teks.lower()).strip("-")


def relasi_praktikum(data):
    """{id alat: [id alat sumber]}: alat yang hasilnya diambil lewat tombol "Ambil"/"Pakai hasil".

    Dibaca dari definisi Praktikum.pasang({...}) di docs/assets/praktikum/alat-*.js (kunci `alat: '<id>'`
    di objek impor dan dariAlat), supaya peta di halaman selalu sama dengan perilaku alat.
    """
    ada = {a["id"] for k in data["kelompok"] for a in k["alat"]}
    rel = {}
    for f in sorted((DOCS / "assets/praktikum").glob("alat-*.js"), key=lambda p: p.name):
        for blok in f.read_text(encoding="utf-8").split("Praktikum.pasang(")[1:]:
            m = re.search(r"id:\s*'([a-z0-9-]+)'", blok)
            if m and m.group(1) in ada:
                sumber = rel.setdefault(m.group(1), [])
                for x in re.findall(r"alat:\s*'([a-z0-9-]+)'", blok):
                    if x != m.group(1) and x in ada and x not in sumber:
                        sumber.append(x)
    return rel


def urutan_praktikum(data):
    """Daftar (alat, kelompok, nomor lapis 1–6) untuk alat yang tersedia, berurutan seperti di praktikum.json."""
    return [(a, k, i % 6 + 1) for i, k in enumerate(data["kelompok"]) for a in k["alat"] if a["status"] == "tersedia"]


def chip(a, href, lapis):
    return f'<a class="chip" data-lapis="{lapis}" href="{href}">{html.escape(a["judul"])}</a>'


SUMBER_CARA_UJI = "Laporan Praktikum Mekanika Tanah Kelompok 3"


def cara_uji(alat):
    """Blok "Alat dan langkah praktikum" di panel Pengantar, dari kolom cara_uji di praktikum.json."""
    blok = alat.get("cara_uji") or []
    if not blok:
        return ""
    e = html.escape
    isi = ""
    for b in blok:
        daftar = lambda judul, butir, tag: (f'<h4>{judul}</h4><{tag}>' + "".join(f"<li>{e(x)}</li>" for x in butir) + f"</{tag}>") if butir else ""
        hal_alat, hal_langkah = b["halaman"]
        isi += ('\n          <div class="cara-blok">'
                + (f'<h4 class="cara-judul">{e(b["judul"])}</h4>' if b.get("judul") else "")
                + '<div class="cara-kolom"><div class="cara-alat">' + daftar("Alat", b["alat"], "ul") + daftar("Bahan", b.get("bahan"), "ul")
                + '</div><div class="cara-langkah">' + daftar("Langkah", b["langkah"], "ol") + "</div></div>"
                + f'<p class="cara-sumber">Sumber: {e(SUMBER_CARA_UJI)}, bagian Peralatan hlm. {hal_alat} dan Prosedur percobaan hlm. {hal_langkah}.</p>'
                + "</div>")
    return (f'\n        <section class="cara-uji" aria-labelledby="cara-uji-judul">\n'
            f'          <h3 id="cara-uji-judul">Alat dan langkah praktikum</h3>{isi}\n        </section>')


def halaman_alat_praktikum(alat, kelompok, status="", data=None, relasi=None):
    folder = f"praktikum/{alat['id']}/"
    awalan = "../../"
    skrip = "".join(f'\n  <script src="{awalan}assets/praktikum/{s}" defer></script>'
                    for s in dict.fromkeys(["grafik.js", "ekspor.js", "sketsa.js", "kerangka.js"] + alat["skrip"]))
    urut = urutan_praktikum(data) if data else []
    ids = [a["id"] for a, _, _ in urut]
    i = ids.index(alat["id"]) if alat["id"] in ids else -1
    info = {a["id"]: (a, l) for a, _, l in urut}
    lapis = urut[i][2] if i >= 0 else 1
    etiket = (f'<dl class="etiket"><div><dt>Kelompok</dt><dd>{html.escape(kelompok)}</dd></div>'
              f'<div><dt>Acuan</dt><dd>{html.escape(alat["standar"])}</dd></div>'
              + (f'<div><dt>Urutan di lembar lab</dt><dd>{i + 1} dari {len(urut)}</dd></div>' if i >= 0 else "") + '</dl>')
    relasi = relasi or {}
    butuh = [info[x] for x in relasi.get(alat["id"], []) if x in info]
    dipakai = [info[t] for t in ids if alat["id"] in relasi.get(t, [])]
    baris_relasi = ""
    if butuh or dipakai:
        isi = ""
        if butuh:
            isi += ('<div><span class="lbl">Bisa mengambil hasil dari</span>'
                    + "".join(chip(a, f"../{a['id']}/", l) for a, l in butuh) + "</div>")
        if dipakai:
            isi += ('<div><span class="lbl">Hasilnya dipakai di</span>'
                    + "".join(chip(a, f"../{a['id']}/", l) for a, l in dipakai) + "</div>")
        baris_relasi = f'\n        <div class="relasi tidak-cetak">{isi}</div>'
    alur = ""
    if i >= 0:
        seb = urut[i - 1] if i > 0 else None
        ses = urut[i + 1] if i + 1 < len(urut) else None
        alur = "\n    " + alur_sebelum_sesudah(
            seb and ("Alat sebelumnya", seb[0]["judul"], f"../{seb[0]['id']}/"),
            ses and ("Alat berikutnya", ses[0]["judul"], f"../{ses[0]['id']}/"),
            seb[2] if seb else "", ses[2] if ses else "")
    return (kepala(f"{alat['judul']} · Praktikum", alat["deskripsi"], awalan, folder, katex_css(awalan)) +
            "\n<body>\n  <!-- NAV:MULAI -->\n  " + menu(awalan, "praktikum") + "\n  <!-- NAV:SELESAI -->\n\n"
            f"  <main class=\"wadah\" data-lapis=\"{lapis}\">\n    <header class=\"pahlawan\">\n"
            f"      <p class=\"remah\"><a href=\"{awalan}praktikum/\">Praktikum Mekanika Tanah</a>"
            f"<span class=\"pemisah\" aria-hidden=\"true\">/</span><a href=\"{awalan}praktikum/#{slug(kelompok)}\">{html.escape(kelompok)}</a></p>\n"
            f"      <h1>{html.escape(alat['judul'])}</h1>\n      <p class=\"lead\">{html.escape(alat['deskripsi'])}</p>\n"
            f"      <p class=\"acuan-alat\"><span class=\"chip\" data-lapis=\"{lapis}\">{html.escape(alat['standar'])}</span></p>\n    </header>\n"
            # Panel Pengantar dan Sumber ditulis di halaman; kerangka.js menambah panel Data, Hasil, Grafik dan tab di atasnya.
            f"    <div id=\"alat-praktikum\" data-alat=\"{alat['id']}\">\n"
            f"      <section class=\"panel-alat\" id=\"panel-pengantar\" data-panel=\"pengantar\">\n"
            f"        <h2 class=\"judul-panel\">Pengantar</h2>\n        <div id=\"pengantar-isi\"></div>{cara_uji(alat)}\n"
            f"        {etiket}{baris_relasi}\n      </section>\n"
            f"      <section class=\"panel-alat\" id=\"panel-sumber\" data-panel=\"sumber\">\n"
            f"        <h2 class=\"judul-panel\">Sumber dan catatan</h2>\n        <div id=\"sumber-isi\"></div>\n"
            f"        <div class=\"status-bawah\">{status}</div>\n      </section>\n    </div>{alur}\n  </main>\n\n"
            "  <!-- FOOTER:MULAI -->\n  " + footer(awalan) + "\n  <!-- FOOTER:SELESAI -->\n"
            f'  <script src="{awalan}assets/katex/katex.min.js" defer></script>\n'
            f'  <script src="{awalan}assets/umum.js" defer></script>{skrip}\n</body>\n</html>\n')


PANAH_ARUS = '<svg class="panah" viewBox="0 0 28 12" aria-hidden="true"><path d="M27 6H3m5-5L2 6l6 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'


# Ikon kelompok pengujian (lapis 1–6), digambar sendiri sebagai garis 24 × 24 supaya ikut warna teks:
# 1 piknometer (sifat fisik), 2 susunan saringan (konsistensi dan gradasi), 3 penumbuk dan cetakan Proctor (kepadatan),
# 4 tabung rembesan (permeabilitas), 5 benda uji ditekan (kekuatan dan konsolidasi), 6 konus sondir menembus lapisan (uji lapangan).
IKON_KELOMPOK = {
    1: '<path d="M10 3h4M10.6 3v5.4a6.2 6.2 0 1 0 2.8 0V3"/><path d="M6.4 15.2h11.2"/>',
    2: '<path d="M4 4.5h16v3.6H4zM4.8 8.1h14.4v3.6H4.8zM5.6 11.7h12.8v3.6H5.6z"/><path d="M7 15.3l1 4.2h8l1-4.2"/>',
    3: '<path d="M12 2.5v6M9.4 8.5h5.2v2.6H9.4z"/><path d="M6.5 13.5h11v7h-11zM6.5 16.2h11"/>',
    4: '<path d="M9.5 2.5v6M14.5 2.5v6M6.5 8.5h11v9h-11z"/><path d="M8 12.4c1.3 1 2.7 1 4 0s2.7-1 4 0"/><path d="M12 19.5v2"/>',
    5: '<path d="M8.5 8h7v8h-7z"/><path d="M12 2.5v3.5M10 4.3l2 1.9 2-1.9M12 21.5V18M10 19.7l2-1.9 2 1.9"/>',
    6: '<path d="M3 8.5h7M14 8.5h7M3 13.5h7M14 13.5h7M3 18.5h18"/><path d="M12 2.5v11.5M10.4 14l1.6 3.8 1.6-3.8z"/>',
}


def id_sketsa():
    """Id sketsa alat yang tersedia di docs/assets/praktikum/sketsa.js (kunci S['id'] atau S.id)."""
    teks = (DOCS / "assets/praktikum/sketsa.js").read_text(encoding="utf-8")
    return {a or b for a, b in re.findall(r"^\s*S(?:\['([a-z0-9-]+)'\]|\.([a-z]+)) = \{", teks, re.M)}


def jumlah_soal():
    """Jumlah templat soal latihan yang tampil (templat dengan `disembunyikan` tidak dihitung)."""
    teks = (DOCS / "assets/latihan-soal.js").read_text(encoding="utf-8")
    return len(re.findall(r"^\s+id: '", teks, re.M)) - teks.count("disembunyikan:")


def sketsa_mini(id_):
    return f'<figure class="sketsa sketsa-mini" data-sketsa="{id_}" aria-hidden="true"></figure>' if id_ in id_sketsa() else ""


def ikon_kelompok(lapis):
    isi = IKON_KELOMPOK.get(lapis, "")
    return f'<svg class="ikon-uji" viewBox="0 0 24 24" aria-hidden="true">{isi}</svg>' if isi else ""


def halaman_induk_praktikum(data, status="", relasi=None):
    folder, awalan = "praktikum/", "../"
    relasi = relasi or {}
    urut = urutan_praktikum(data)
    nomor = {a["id"]: n + 1 for n, (a, _, _) in enumerate(urut)}
    info = {a["id"]: (a, l) for a, _, l in urut}
    bagian, inti = [], []
    for ki, k in enumerate(data["kelompok"]):
        lapis = ki % 6 + 1
        butir = []
        for a in k["alat"]:
            isi = (sketsa_mini(a["id"]) + f'<span class="no">{nomor.get(a["id"], "")}</span><span class="judul">{html.escape(a["judul"])}</span>'
                   f'<span class="acuan">{html.escape(a["standar"])}</span><span class="ringkas">{html.escape(a["deskripsi"])}</span>')
            cari = html.escape(" ".join([a["judul"], a["standar"], a["deskripsi"], k["judul"]]).lower(), quote=True)
            if a["status"] == "tersedia":
                butir.append(f'        <li data-cari="{cari}" data-kelompok="{slug(k["judul"])}"><a href="{a["id"]}/">{isi}</a></li>')
            else:
                butir.append(f'        <li data-cari="{cari}" data-kelompok="{slug(k["judul"])}"><div class="menyusul kartu-menyusul">{isi}</div></li>')
        jumlah = len(k["alat"])
        bagian.append(f'    <section class="kelompok-uji" id="{slug(k["judul"])}" data-lapis="{lapis}">\n'
                      f'      <h2>{ikon_kelompok(lapis)}{html.escape(k["judul"])} <span class="jumlah">{jumlah} alat</span></h2>\n'
                      '      <ol class="daftar-uji">\n' + "\n".join(butir) + "\n      </ol>\n    </section>")
        inti.append(f'<a href="#{slug(k["judul"])}" data-lapis="{lapis}" data-saring="{slug(k["judul"])}" style="--n:{jumlah}">{ikon_kelompok(lapis)}<span class="nama">{html.escape(k["judul"])}</span>'
                    f'<span class="jumlah">{jumlah} alat</span></a>')
    arus = []
    for a, _, l in urut:
        sumber = [info[x] for x in relasi.get(a["id"], []) if x in info]
        if sumber:
            arus.append(f'        <li><a class="ke" href="{a["id"]}/">{html.escape(a["judul"])}</a>{PANAH_ARUS}'
                        '<span class="dari">' + "".join(chip(s, f'{s["id"]}/', sl) for s, sl in sumber) + "</span></li>")
    bagian_arus = ""
    if arus:
        bagian_arus = ("    <section>\n      <h2>Hasil yang saling dipakai</h2>\n"
                       "      <p class=\"redup\" style=\"max-width:68ch\">Alat di kiri bisa mengambil hasil alat di kanan lewat tombol <strong>Ambil</strong> atau "
                       "<strong>Pakai hasil</strong>, selama hasil itu sudah tersimpan di browser yang sama. Kerjakan alat di kanan lebih dulu.</p>\n"
                       "      <ul class=\"arus\">\n" + "\n".join(arus) + "\n      </ul>\n    </section>\n")
    tersedia = len(urut)
    semua = sum(len(k["alat"]) for k in data["kelompok"])
    status_alat = ("" if tersedia == semua else f" {tersedia} dari {semua} alat sudah tersedia; alat lain menyusul.")
    kalkulator = sum(1 for a in data_alat()["alat"] if a["halaman"].startswith("kalkulator/"))
    rekap = ('      <dl class="rekap">'
             f'<div><dt>alat praktikum</dt><dd>{semua}</dd></div>'
             f'<div><dt>kelompok uji</dt><dd>{len(data["kelompok"])}</dd></div>'
             f'<div><dt><a href="../alat/">kalkulator</a></dt><dd>{kalkulator}</dd></div>'
             f'<div><dt><a href="../latihan/">jenis soal latihan</a></dt><dd>{jumlah_soal()}</dd></div></dl>\n')
    saring = ('    <div class="saring-katalog" id="saring-katalog" hidden>\n'
              '      <label class="sr-only" for="cari-alat">Cari alat praktikum</label>\n'
              '      <input id="cari-alat" type="search" autocomplete="off" placeholder="Cari alat, misalnya CBR, saringan, atau SNI 1744">\n'
              f'      <button type="button" class="chip chip-semua" data-saring="" aria-pressed="true">Semua <span class="jumlah">{tersedia}</span></button>\n'
              '      <p class="kecil redup hasil-saring" id="hasil-saring" role="status" aria-live="polite"></p>\n'
              '    </div>\n')
    return (kepala("Praktikum Mekanika Tanah", f"{semua} alat pengolah data praktikum Mekanika Tanah: formulir seperti lembar data laboratorium, langkah hitungan, grafik, dan ekspor ke Word dan Excel.", awalan, folder) +
            "\n<body>\n  <!-- NAV:MULAI -->\n  " + menu(awalan, "praktikum") + "\n  <!-- NAV:SELESAI -->\n\n"
            "  <main class=\"wadah\">\n    <header class=\"pahlawan\">\n"
            "      <h1>Praktikum Mekanika Tanah</h1>\n"
            f"      <p class=\"lead\">Formulir seperti lembar data lab, langkah hitungan, grafik, dan ekspor ke Word untuk tiap pengujian.{status_alat}</p>\n"
            + rekap +
            "    </header>\n" + saring +
            "    <nav class=\"inti-bor\" aria-label=\"Kelompok pengujian\">" + "".join(inti) + "</nav>\n"
            "    <p class=\"kosong-saring redup\" id=\"kosong-saring\" hidden>Tidak ada alat praktikum yang cocok. Coba kata lain, pilih <strong>Semua</strong>, "
            "atau <a id=\"cari-situs\" href=\"../cari/\">cari di seluruh situs</a>.</p>\n"
            + "\n".join(bagian) + "\n" +
            "    <div class=\"cara-pakai\">\n"
            "      <div><h3>Isi seperti form lab</h3><p>Baris dan simbol mengikuti lembar data. Angka boleh diketik dengan koma, atau blok data di Excel lalu tempel sekaligus.</p></div>\n"
            "      <div><h3>Langkah dan grafik</h3><p>Setiap hasil disertai rumus bernomor, substitusi angka, dan grafik yang dibutuhkan laporan.</p></div>\n"
            "      <div><h3>NIM untuk data individu</h3><p>Alat yang memakai data individu punya kotak NIM di atas formulir. Dua digit terakhir NIM dibagi 100 lalu ditambahkan ke kolom yang ditentukan, dan langkahnya ikut tampil di hasil.</p></div>\n"
            "      <div><h3>Siap untuk laporan</h3><p>Unduh Word dengan Times New Roman dan tabel tanpa garis vertikal, grafik PNG, salin ke Excel, atau cetak dengan kop identitas contoh.</p></div>\n"
            "    </div>\n" + bagian_arus +
            "    <section>\n      <div class=\"catatan\"><strong>Untuk laporan.</strong> Alat ini membantu mengolah dan memeriksa data. Ikuti modul dan arahan asisten laboratorium untuk format laporan resmi, termasuk bila perhitungan harus ditulis tangan.</div>\n    </section>\n"
            f"    <div class=\"status-bawah\">{status}</div>\n  </main>\n\n"
            "  <!-- FOOTER:MULAI -->\n  " + footer(awalan) + "\n  <!-- FOOTER:SELESAI -->\n"
            f'  <script src="{awalan}assets/praktikum/sketsa.js" defer></script>\n'
            f'  <script src="{awalan}assets/katalog.js" defer></script>\n</body>\n</html>\n')


# ---------------------------------------------------------------- registri alat

def data_alat():
    return json.loads((KONTEN / "alat.json").read_text(encoding="utf-8"))


def kartu_beranda(data, praktikum=None):
    """Kartu alat di beranda. Praktikum tampil besar dengan kolom inti berisi kelompok pengujiannya."""
    kartu = []
    for a in data["alat"]:
        if a["id"] == "praktikum" and praktikum:
            baris = "".join(
                f'<li><a href="{a["halaman"]}#{slug(k["judul"])}" data-lapis="{i % 6 + 1}">{ikon_kelompok(i % 6 + 1)}<span class="nama">{html.escape(k["judul"])}</span>'
                f'<span class="jumlah">{len(k["alat"])} alat</span></a></li>' for i, k in enumerate(praktikum["kelompok"]))
            kartu.append(f'<div class="kartu-praktikum" data-kat="{a["kategori"]}">\n          <span class="lencana">{html.escape(a["lencana"])}</span>\n'
                         f'          <h3><a href="{a["halaman"]}">{html.escape(a["judul"])}</a></h3>\n          <p>{a["ringkas"]}</p>\n'
                         f'          <ul class="kolom-inti">{baris}</ul>\n'
                         f'          <a class="tombol utama" href="{a["halaman"]}" style="align-self:flex-start">Buka alat praktikum</a>\n        </div>')
            continue
        kartu.append(f'<a class="kartu" href="{a["halaman"]}" data-kat="{a["kategori"]}">\n          {sketsa_mini(a["id"])}<span class="lencana">{html.escape(a["lencana"])}</span>\n'
                     f'          <h3>{html.escape(a["judul"])}</h3>\n          <p class="redup">{a["ringkas"]}</p>\n        </a>')
    return "\n        ".join(kartu)


def daftar_halaman_alat(data):
    bagian = []
    for k in data["kategori"]:
        kartu = []
        for a in (x for x in data["alat"] if x["kategori"] == k["id"]):
            rincian = "".join(f"\n            <dt>{html.escape(dt)}</dt><dd>{dd}</dd>" for dt, dd in a["rincian"])
            kartu.append(f'        <a class="kartu" href="../{a["halaman"]}" data-kat="{a["kategori"]}">\n'
                         f'          {sketsa_mini(a["id"])}<span class="lencana">{html.escape(a.get("lencana_rincian", a["lencana"]))}</span>\n'
                         f'          <h3>{html.escape(a.get("judul_rincian", a["judul"]))}</h3>\n'
                         f'          <dl class="rincian">{rincian}\n          </dl>\n        </a>')
        if kartu:
            bagian.append(f'<section>\n      <h2>{html.escape(k["judul"])}</h2>\n      <div class="kisi">\n' + "\n".join(kartu) + "\n      </div>\n    </section>")
    return "\n\n    ".join(bagian)


STATUS = {"asli": "Sumber asli", "sekunder": "Sumber sekunder", "belum": "Belum terverifikasi"}
BULAN = "Januari Februari Maret April Mei Juni Juli Agustus September Oktober November Desember".split()


def lencana_status(a):
    t, b, h = (int(x) for x in a["tanggal_cek"].split("-"))
    return (f'<p class="status-sumber" data-status="{a["status"]}"><span>Status sumber: <strong>{STATUS[a["status"]]}</strong></span>'
            f'<span class="status-tgl">dicek {h} {BULAN[b - 1]} {t}</span><a href="{REPO}#alat">arti status</a></p>')


def tabel_readme(data):
    baris = [f'| [{a["judul_pendek"]}]({SITUS}{a["halaman"]}) | {a["deskripsi"]} | {STATUS[a["status"]]} |' for a in data["alat"]]
    return "| Alat | Isi | Status sumber |\n|---|---|---|\n" + "\n".join(baris)


# ---------------------------------------------------------------- penanda di halaman tulisan tangan

def ganti_penanda(teks, nama, isi, wajib=True, baris_baru=False):
    pola = re.compile(rf"(<!-- {nama}:MULAI -->)(.*?)(<!-- {nama}:SELESAI -->)", re.S)
    if not pola.search(teks):
        if wajib:
            raise SystemExit(f"Penanda {nama} tidak ditemukan")
        return teks
    if baris_baru:  # Markdown: tabel harus mulai di awal baris
        return pola.sub(lambda m: f"{m.group(1)}\n{isi}\n{m.group(3)}", teks)
    return pola.sub(lambda m: f"{m.group(1)}\n  {isi}\n  {m.group(3)}", teks)


def seragamkan(berkas, teks):
    rel = berkas.relative_to(DOCS).as_posix()
    if rel == "404.html":
        awalan, aktif = DASAR_404, ""
    else:
        folder = rel.rsplit("/", 1)[0] + "/" if "/" in rel else ""
        awalan, aktif = "../" * kedalaman(folder), bagian_aktif(folder)
    teks = ganti_penanda(teks, "NAV", menu(awalan, aktif, folder if rel != "404.html" else None))
    if "assets/tema.js" not in teks:
        # Halaman tulis tangan: pasang skrip tema tepat setelah lembar gaya.
        teks = re.sub(r'(<link rel="stylesheet" href="([^"]*)assets/gaya\.css">\n)',
                      lambda m: m.group(1) + f'  <script src="{m.group(2)}assets/tema.js"></script>\n', teks, count=1)
    return ganti_penanda(teks, "FOOTER", footer(awalan), wajib=False)


def sitemap(berkas_html):
    url = sorted(SITUS + (p.relative_to(DOCS).as_posix().removesuffix("index.html"))
                 for p in berkas_html if p.name != "404.html")
    isi = "\n".join(f"  <url><loc>{u}</loc></url>" for u in url)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{isi}\n</urlset>\n'


# ---------------------------------------------------------------- pencarian

def subjudul(teks):
    return " ".join(re.sub(r"[*`_]", "", m) for m in re.findall(r"^#{2,3} (.+)$", teks, re.M))


def indeks_cari(peta, catatan, alat, praktikum):
    butir = [{"j": a["judul"], "d": a["deskripsi"], "h": " ".join(dd for _, dd in a["rincian"]), "u": a["halaman"], "k": "Alat"}
             for a in alat["alat"]]
    for k in praktikum["kelompok"]:
        for a in k["alat"]:
            if a["status"] == "tersedia":
                butir.append({"j": a["judul"], "d": a["deskripsi"], "h": f'{k["judul"]} {a["standar"]}', "u": f'praktikum/{a["id"]}/', "k": "Praktikum"})
    for sumber, folder in peta:
        teks = sumber.read_text(encoding="utf-8")
        judul, ringkasan = judul_dan_ringkasan(teks)
        jenis = "Catatan pembuat" if folder.startswith(f"{PRIBADI}catatan/") else "Pembuat"
        butir.append({"j": judul, "d": ringkasan, "h": subjudul(teks), "u": folder, "k": jenis})
    for k in data_notasi()["kelompok"]:
        butir.append({"j": f"Kamus notasi: {k['judul']}", "d": ", ".join(re.sub(r"<[^>]+>", "", b[0]) for b in k["butir"]),
                      "h": " ".join(b[1] for b in k["butir"]), "u": f"notasi/#{slug(k['judul'])}", "k": "Notasi"})
    for x in butir:
        x["h"] = re.sub(r"<[^>]+>", "", x["h"])
    return json.dumps(butir, ensure_ascii=False, indent=0) + "\n"


def halaman_beranda_en(praktikum, alat):
    folder, awalan = EN, "../"
    semua = sum(len(k["alat"]) for k in praktikum["kelompok"])
    kelompok = "".join(
        f'<li><a href="{awalan}praktikum/#{slug(k["judul"])}" data-lapis="{i % 6 + 1}">{ikon_kelompok(i % 6 + 1)}'
        f'<span class="nama">{html.escape(KELOMPOK_EN.get(k["judul"], k["judul"]))}</span><span class="jumlah">{len(k["alat"])} tools</span></a></li>'
        for i, k in enumerate(praktikum["kelompok"]))
    kalkulator = [a for a in alat["alat"] if a["halaman"].startswith("kalkulator/")]
    kartu = "".join(
        f'\n        <a class="kartu" href="{awalan}{a["halaman"]}">{sketsa_mini(a["id"])}<h3>{html.escape(a["judul_en"])}</h3>'
        f'<p class="redup">{a["ringkas_en"]}</p></a>' for a in kalkulator)
    # Judul tab beranda Inggris disamakan dengan beranda Indonesia: "GeoSR · Geotechnical Soil Report".
    awal = kepala("Geotechnical Soil Report", "Lab-sheet style tools for Soil Mechanics practicals and geotechnical calculations, "
                  "with every step, chart, and source shown.", awalan, folder, bahasa="en").replace(
        f"Geotechnical Soil Report · {NAMA}", f"{NAMA} · {KEPANJANGAN}")
    return (awal +
            "\n<body>\n  <!-- NAV:MULAI -->\n  " + menu(awalan, "", folder) + "\n  <!-- NAV:SELESAI -->\n\n"
            "  <main class=\"wadah\">\n    <header class=\"pahlawan\">\n"
            f"      <p class=\"asal\">{KEPANJANGAN}</p>\n      <h1>{NAMA}</h1>\n"
            "      <p class=\"lead\">Lab-sheet style tools for Soil Mechanics practicals and geotechnical calculations, "
            "with every step, chart, and source shown.</p>\n"
            "      <p class=\"redup\" style=\"max-width:64ch\">The tools themselves are in Indonesian and follow the Soil Mechanics lab forms "
            "at Universitas Jambi. Numbers use a decimal comma (12,5 means 12.5).</p>\n"
            "      <div class=\"baris-tombol\">\n"
            f"        <a class=\"tombol utama\" href=\"{awalan}praktikum/\">Open the lab tools</a>\n"
            f"        <a class=\"tombol\" href=\"{awalan}alat/\">Calculators</a>\n      </div>\n    </header>\n\n"
            f"    <section>\n      <h2>{semua} lab data tools</h2>\n"
            "      <p class=\"redup\" style=\"max-width:68ch\">From water content to consolidation, CPT, and SPT. Each tool has a form like the lab sheet, "
            "a worked calculation, charts, and export to Word and Excel.</p>\n"
            f"      <ul class=\"kolom-inti\">{kelompok}</ul>\n    </section>\n\n"
            f"    <section>\n      <h2>{len(kalkulator)} calculators</h2>\n      <div class=\"kisi\">{kartu}\n      </div>\n    </section>\n\n"
            f"    <section>\n      <h2>{jumlah_soal()} types of practice problems</h2>\n"
            "      <p class=\"redup\" style=\"max-width:68ch\">Problems are generated with random numbers, checked automatically, and come with worked solutions.</p>\n"
            f"      <a class=\"tombol\" href=\"{awalan}latihan/\">Practice</a>\n    </section>\n\n"
            "    <section>\n      <ul class=\"ciri\">\n"
            "        <li><strong>Full steps</strong><span>Given values, formula, substituted numbers, and the result, so you can compare with a hand calculation.</span></li>\n"
            "        <li><strong>Sourced formulas</strong><span>Every formula names its SNI, ASTM, or textbook source on the tool page.</span></li>\n"
            "        <li><strong>Report ready</strong><span>Download Word, copy to Excel, save charts as PNG, or print to PDF.</span></li>\n"
            "        <li><strong>No sign-up</strong><span>Data stays in your own browser and the tools keep working offline.</span></li>\n"
            "      </ul>\n    </section>\n  </main>\n\n"
            "  <!-- FOOTER:MULAI -->\n  " + footer(awalan, en=True) + "\n  <!-- FOOTER:SELESAI -->\n"
            f'  <script src="{awalan}assets/praktikum/sketsa.js" defer></script>\n</body>\n</html>\n')


def halaman_kredit():
    folder, awalan = "kredit/", "../"
    data = json.loads((DOCS / "assets/kredit.json").read_text(encoding="utf-8"))
    baris = "\n".join(
        f'        <tr><td>{html.escape(a["nama"])}</td><td>{html.escape(a["pembuat"])}<br><a href="{html.escape(a["sumber"])}">sumber</a>'
        f' · {html.escape(a["distribusi"])}</td><td><a href="{awalan}{html.escape(a["berkas_lisensi"])}">{html.escape(a["lisensi"])}</a></td></tr>'
        for a in data["aset"])
    return (kepala("Kredit aset", f"Huruf, pustaka, dan gambar yang dipakai {NAMA} beserta pembuat dan lisensinya.", awalan, folder) +
            "\n<body>\n  <!-- NAV:MULAI -->\n  " + menu(awalan, "") + "\n  <!-- NAV:SELESAI -->\n\n"
            "  <main class=\"wadah\">\n    <header class=\"pahlawan\" style=\"padding-bottom:16px\">\n"
            "      <h1>Kredit aset</h1>\n"
            f"      <p class=\"lead\">Aset dari luar yang dipakai {NAMA}. Semuanya disimpan di situs ini sendiri, tanpa CDN, dan lisensinya membolehkan dipakai dan disebarkan ulang.</p>\n"
            "    </header>\n    <div class=\"tabel-gulir\"><table>\n"
            "      <thead><tr><th>Aset</th><th>Pembuat</th><th>Lisensi</th></tr></thead>\n      <tbody>\n" + baris +
            "\n      </tbody>\n    </table></div>\n"
            f"    <h2>Gambar buatan sendiri</h2>\n    <p>{html.escape(data['buatan_sendiri'])}</p>\n  </main>\n\n"
            "  <!-- FOOTER:MULAI -->\n  " + footer(awalan) + "\n  <!-- FOOTER:SELESAI -->\n</body>\n</html>\n")


def data_notasi():
    return json.loads((KONTEN / "notasi.json").read_text(encoding="utf-8"))


def url_pemakai(id_, alat, praktikum, awalan):
    """Tautan dan judul alat yang memakai notasi: kalkulator dari alat.json, alat praktikum dari praktikum.json."""
    for a in alat["alat"]:
        if a["id"] == id_ and a["halaman"].startswith("kalkulator/"):
            return f'{awalan}{a["halaman"]}', a.get("judul_pendek", a["judul"]).replace("Kalkulator ", "")
    for k in praktikum["kelompok"]:
        for a in k["alat"]:
            if a["id"] == id_:
                return f'{awalan}praktikum/{id_}/', a["judul"]
    raise KeyError(f"notasi.json: id alat tidak dikenal: {id_}")


def halaman_notasi(alat, praktikum):
    folder, awalan = "notasi/", "../"
    data = data_notasi()
    daftar_isi = "".join(f'<li><a href="#{slug(k["judul"])}">{html.escape(k["judul"])}</a></li>' for k in data["kelompok"])
    bagian = ""
    for k in data["kelompok"]:
        baris = ""
        for simbol, nama, satuan, ket, pemakai in k["butir"]:
            tautan = " ".join(f'<a class="chip" href="{u}">{html.escape(j)}</a>' for u, j in (url_pemakai(i, alat, praktikum, awalan) for i in pemakai))
            cari = re.sub(r"<[^>]+>", "", f"{simbol} {nama} {ket}").lower()
            baris += (f'\n          <tr data-cari="{html.escape(cari)}"><th scope="row" class="simbol">{simbol}</th>'
                      f'<td><strong>{html.escape(nama)}</strong><span class="ket">{ket}</span></td>'
                      f'<td class="satuan">{html.escape(satuan)}</td><td class="pemakai">{tautan}</td></tr>')
        bagian += (f'\n    <section class="kelompok-notasi" id="{slug(k["judul"])}">\n      <h2>{html.escape(k["judul"])}</h2>\n'
                   '      <div class="tabel-gulir"><table class="tabel-notasi">\n'
                   '        <thead><tr><th scope="col">Simbol</th><th scope="col">Arti</th><th scope="col">Satuan</th><th scope="col">Dipakai di</th></tr></thead>\n'
                   f'        <tbody>{baris}\n        </tbody>\n      </table></div>\n    </section>')
    konversi = "".join(
        f'\n      <div class="kartu"><h3>{html.escape(j)}</h3><dl class="daftar-konversi">'
        + "".join(f'<div><dt>{html.escape(a)}</dt><dd>{html.escape(b)}</dd></div>' for a, b in isi) + "</dl></div>"
        for j, isi in data["konversi"])
    jumlah = sum(len(k["butir"]) for k in data["kelompok"])
    return (kepala("Kamus notasi", f"Arti, satuan, dan pemakaian {jumlah} notasi mekanika tanah dan fondasi yang dipakai di {NAMA}, ditambah konversi satuan.", awalan, folder) +
            "\n<body>\n  <!-- NAV:MULAI -->\n  " + menu(awalan, "") + "\n  <!-- NAV:SELESAI -->\n\n"
            "  <main class=\"wadah\">\n    <header class=\"pahlawan\" style=\"padding-bottom:16px\">\n"
            "      <h1>Kamus notasi</h1>\n"
            f"      <p class=\"lead\">{jumlah} simbol yang dipakai di alat praktikum dan kalkulator {NAMA}: artinya, satuannya, dan alat mana yang memakainya. "
            "Beberapa simbol punya arti berbeda di topik lain; bedanya ditulis di keterangan.</p>\n"
            "      <form class=\"saring-notasi\" role=\"search\" onsubmit=\"return false\" hidden>\n"
            "        <label for=\"cariNotasi\">Cari simbol atau istilah</label>\n"
            "        <input id=\"cariNotasi\" type=\"search\" autocomplete=\"off\" placeholder=\"misalnya OCR, kadar air, φ\">\n"
            "        <p id=\"infoNotasi\" class=\"kecil redup\" role=\"status\" aria-live=\"polite\"></p>\n"
            "      </form>\n"
            f"      <nav class=\"isi-notasi\" aria-label=\"Kelompok notasi\"><ul>{daftar_isi}<li><a href=\"#konversi-satuan\">Konversi satuan</a></li></ul></nav>\n"
            f"    </header>{bagian}\n"
            "    <section id=\"konversi-satuan\">\n      <h2>Konversi satuan</h2>\n"
            "      <p>Faktor dihitung dari definisi satuan (g = 9,80665 m/s²). Daftar Konversi Warman (2019) dipakai sebagai pembanding.</p>\n"
            f"      <div class=\"kisi-konversi\">{konversi}\n      </div>\n    </section>\n"
            "    <p class=\"kecil redup\">Pembanding: Warman, H. (penyusun) (2019). <em>Kumpulan korelasi parameter geoteknik dan fondasi</em>, "
            "Daftar Notasi dan Daftar Konversi. Kementerian PUPR. Arti di halaman ini ditulis sendiri.</p>\n  </main>\n\n"
            "  <!-- FOOTER:MULAI -->\n  " + footer(awalan) + "\n  <!-- FOOTER:SELESAI -->\n"
            f'  <script src="{awalan}assets/notasi.js" defer></script>\n</body>\n</html>\n')


def halaman_cari():
    folder, awalan = "cari/", "../"
    return (kepala("Cari", f"Cari alat praktikum, kalkulator, dan latihan di {NAMA}.", awalan, folder) +
            "\n<body>\n  <!-- NAV:MULAI -->\n  " + menu(awalan, "cari") + "\n  <!-- NAV:SELESAI -->\n\n"
            "  <main class=\"wadah\">\n    <header class=\"pahlawan\" style=\"padding-bottom:16px\">\n"
            "      <h1>Cari</h1>\n    </header>\n"
            "    <form class=\"kartu\" role=\"search\" onsubmit=\"return false\">\n"
            "      <label for=\"kataCari\">Kata yang dicari</label>\n"
            "      <input id=\"kataCari\" type=\"search\" autocomplete=\"off\" placeholder=\"misalnya konsolidasi, CBR, git\">\n"
            "    </form>\n    <p id=\"infoCari\" class=\"kecil redup\" role=\"status\" aria-live=\"polite\"></p>\n"
            "    <ul id=\"hasilCari\" class=\"daftar-bersih hasil-cari\"></ul>\n  </main>\n\n"
            "  <!-- FOOTER:MULAI -->\n  " + footer(awalan) + "\n  <!-- FOOTER:SELESAI -->\n"
            f'  <script src="{awalan}assets/cari.js" defer></script>\n</body>\n</html>\n')


# ---------------------------------------------------------------- mode offline

INTI = ["assets/gaya.css", "assets/tema.js", "assets/umum.js", "assets/daftar-sw.js", "assets/gerak.js", "assets/ikon.svg", "manifest.webmanifest",
        "assets/katex/katex.min.css", "assets/katex/katex.min.js",
        "assets/font/plus-jakarta-sans-latin-400-normal.woff2", "assets/font/plus-jakarta-sans-latin-600-normal.woff2",
        "assets/font/plus-jakarta-sans-latin-700-normal.woff2", "assets/font/plus-jakarta-sans-latin-800-normal.woff2",
        "assets/font/archivo-latin-wdth-normal.woff2"]


def versi_rilis():
    return re.search(r"^version:\s*(\S+)", (AKAR / "CITATION.cff").read_text(encoding="utf-8"), re.M).group(1)


def service_worker():
    inti = ",\n  ".join(json.dumps("/" + x) for x in ["", *INTI])
    return f"""/* Dibangun oleh skrip/bangun_situs.py; jangan diedit langsung.
 * Versi cache mengikuti versi di CITATION.cff. Aset inti disimpan saat pemasangan; halaman dan
 * aset lain disimpan saat pertama dibuka. Halaman: jaringan dulu, cadangan dari cache. Aset: cache dulu.
 */
const VERSI = "defsa-{versi_rilis()}";
const INTI = [
  {inti}
];

self.addEventListener("install", (e) => {{
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(INTI)).then(() => self.skipWaiting()));
}});

self.addEventListener("activate", (e) => {{
  e.waitUntil(caches.keys()
    .then((kunci) => Promise.all(kunci.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
}});

self.addEventListener("fetch", (e) => {{
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const simpan = (res) => {{
    if (res.ok) {{ const salinan = res.clone(); caches.open(VERSI).then((c) => c.put(req, salinan)); }}
    return res;
  }};
  if (req.mode === "navigate") {{
    e.respondWith(fetch(req).then(simpan).catch(() => caches.match(req)));
    return;
  }}
  e.respondWith(caches.match(req).then((r) => r || fetch(req).then(simpan)));
}});
"""


# ---------------------------------------------------------------- utama

def bangun():
    """Kembalikan {jalur: isi} untuk semua berkas yang seharusnya ada."""
    peta = peta_halaman()
    catatan = daftar_catatan(peta)
    keluaran = {}
    urutan_catatan = [(f"{n} · {j}", f) for n, j, _, f in catatan]
    for sumber, folder in peta:
        sebelum = sesudah = None
        if folder.startswith(f"{PRIBADI}catatan/"):
            i = [f for _, f in urutan_catatan].index(folder)
            sebelum = urutan_catatan[i - 1] if i > 0 else None
            sesudah = urutan_catatan[i + 1] if i + 1 < len(urutan_catatan) else None
        keluaran[DOCS / folder / "index.html"] = halaman_konten(sumber, folder, peta, sebelum, sesudah)
    keluaran[DOCS / f"{PRIBADI}catatan/index.html"] = halaman_daftar_catatan(catatan)
    pengalih = set()
    for lama, baru in peta_pengalih(peta).items():
        keluaran[DOCS / lama / "index.html"] = halaman_pengalih(lama, baru)
        pengalih.add(DOCS / lama / "index.html")
    praktikum = data_praktikum()
    alat = data_alat()
    status_praktikum = lencana_status(next(a for a in alat["alat"] if a["id"] == "praktikum"))
    relasi = relasi_praktikum(praktikum)
    keluaran[DOCS / "praktikum/index.html"] = halaman_induk_praktikum(praktikum, status_praktikum, relasi)
    for k in praktikum["kelompok"]:
        for a in k["alat"]:
            if a["status"] == "tersedia":
                keluaran[DOCS / f"praktikum/{a['id']}/index.html"] = halaman_alat_praktikum(a, k["judul"], status_praktikum, praktikum, relasi)

    dihasilkan = set(keluaran)
    for berkas in sorted(DOCS.rglob("*.html")):
        if berkas in dihasilkan:
            continue
        teks = seragamkan(berkas, berkas.read_text(encoding="utf-8"))
        keluaran[berkas] = teks
    for a in alat["alat"]:
        target = DOCS / a["halaman"]
        target = target / "index.html" if a["halaman"].endswith("/") else target
        if target in keluaran:
            keluaran[target] = ganti_penanda(keluaran[target], "STATUS", lencana_status(a), wajib=False)
    keluaran[DOCS / "cari.json"] = indeks_cari(peta, catatan, alat, praktikum)
    keluaran[DOCS / "cari/index.html"] = halaman_cari()
    keluaran[DOCS / "kredit/index.html"] = halaman_kredit()
    keluaran[DOCS / "notasi/index.html"] = halaman_notasi(alat, praktikum)
    keluaran[DOCS / f"{EN}index.html"] = halaman_beranda_en(praktikum, alat)
    keluaran[DOCS / f"{EN}pembuat/index.html"] = halaman_konten(KONTEN / "en/tentang.md", f"{EN}pembuat/", peta, en=True)
    keluaran[DOCS / "index.html"] = ganti_penanda(keluaran[DOCS / "index.html"], "ALAT", kartu_beranda(alat, praktikum))
    keluaran[DOCS / "alat/index.html"] = ganti_penanda(keluaran[DOCS / "alat/index.html"], "DAFTAR-ALAT", daftar_halaman_alat(alat))
    readme = AKAR / "README.md"
    keluaran[readme] = ganti_penanda(readme.read_text(encoding="utf-8"), "ALAT", tabel_readme(alat), baris_baru=True)
    semua_html = (set(k for k in keluaran if k.suffix == ".html") | set(DOCS.rglob("*.html"))) - pengalih
    keluaran[DOCS / "sitemap.xml"] = sitemap(semua_html)
    keluaran[DOCS / "sw.js"] = service_worker()
    keluaran[DOCS / "robots.txt"] = f"User-agent: *\nAllow: /\nSitemap: {SITUS}sitemap.xml\n"
    return keluaran


def main():
    periksa = "--periksa" in sys.argv
    berubah = []
    for jalur, isi in bangun().items():
        # Bandingkan byte apa adanya (newline="") dan tulis selalu dengan LF, supaya hasil bangun di Windows sama dengan di Linux/CI.
        lama = None
        if jalur.exists():
            with open(jalur, encoding="utf-8", newline="") as berkas:
                lama = berkas.read()
        if lama != isi:
            berubah.append(jalur.relative_to(AKAR).as_posix())
            if not periksa:
                jalur.parent.mkdir(parents=True, exist_ok=True)
                jalur.write_text(isi, encoding="utf-8", newline="\n")
    if periksa and berubah:
        print("Situs belum dibangun ulang. Jalankan: python3 skrip/bangun_situs.py\n  " + "\n  ".join(berubah))
        sys.exit(1)
    print(("Berkas diperbarui:\n  " + "\n  ".join(berubah)) if berubah and not periksa else "Situs sudah sesuai dengan konten/.")


if __name__ == "__main__":
    os.chdir(AKAR)
    main()
