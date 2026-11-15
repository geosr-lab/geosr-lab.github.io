"""Cocokkan alat CBR dengan contoh pengolahan data di laporan praktikum (PDF bahan Defsa).

Modul hitung-cbr.js dijalankan lewat node dengan data contoh laporan (beban penetrasi, W1, dan W2 sudah
termasuk +0,34 NIM penulis; beban pada penurunan 0 mm = 0,34 kN), lalu dibandingkan dengan angka yang
tertulis di PDF. Toleransi = setengah satuan digit terakhir yang ditulis di laporan. Bila laporan salah tulis
atau salah hitung, yang diuji adalah angka yang benar dan perbedaannya dicatat di komentar (catatan yang sama
tampil di halaman alat, blok "Beda dengan contoh laporan").

Berkas acuan (tidak disimpan di repo):
- CBR.pdf hlm 1–3 (laporan hlm 131–133, "Pengolahan data": kadar air sebelum dan harga CBR tiap pukulan)
- CBR.pdf hlm 4–6 (form terisi Pemeriksaan CBR SNI 1744-2012, PK 3 × 10, 3 × 30, 3 × 65)
- FORM_FIX_KOSONGAN_1.pdf, form CBR kosong: kolom sama dengan form terisi di atas
  (HARGA CBR = beban / 13,35 × 100 pada 2,54 mm dan beban / 20,02 × 100 pada 5,08 mm)

Jalankan dari akar repo:  python3 tests/verifikasi_contoh_laporan_b_cbr.py
"""
import json
import re
import subprocess
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
P = AKAR / "docs/assets/praktikum"
gagal = 0


def js(modul, fungsi, *arg):
    skrip = ("const m=require(process.argv[1]);const r=m[process.argv[2]](...JSON.parse(process.argv[3]));"
             "console.log(JSON.stringify(r===undefined?null:r,(k,v)=>typeof v==='function'?undefined:v))")
    return json.loads(subprocess.check_output(["node", "-e", skrip, str(P / modul), fungsi, json.dumps(arg)], text=True, encoding="utf-8"))


def nilai(modul, nama):
    skrip = "console.log(JSON.stringify(require(process.argv[1])[process.argv[2]]))"
    return json.loads(subprocess.check_output(["node", "-e", skrip, str(P / modul), nama], text=True, encoding="utf-8"))


def cocok(nama, laporan, alat, tol):
    global gagal
    if alat is None or abs(laporan - alat) > tol:
        gagal += 1
        print(f"GAGAL  {nama}: laporan={laporan!r} alat={alat!r} (toleransi {tol})")


def benar(nama, kondisi):
    global gagal
    if not kondisi:
        gagal += 1
        print(f"GAGAL  {nama}")


SUMBER_ALAT = (P / "alat-cbr.js").read_text(encoding="utf-8")

# ---------------------------------------------------------------- data form terisi (CBR.pdf hlm 4–6)
# Penurunan (mm) dan beban penetrasi (kN) per baris waktu 0, 10, 20, … menit (kolom kiri 0–200, kanan 210–410).
# Hlm 4, PK 3 × 10, waktu 280 menit: penurunan dibaca 7,05 (tulisan tangan; bisa juga 7,03). Baris ini jauh di atas
# 5,08 mm sehingga tidak memengaruhi harga CBR.
# Hlm 5, PK 3 × 30: beban 13,76 kN tertulis dua kali (waktu 320 dan 330 menit), disalin apa adanya.
CONTOH = {
    "3 × 10": {
        "x": [0] * 16 + [0.13, 0.44, 1.03, 1.64, 2.22, 2.84, 3.46, 4.03, 4.62, 5.23, 5.79, 6.94, 7.05, 7.59, 8.21, 8.78, 9.4, 9.97,
                         10.6, 11.2, 11.77, 12.54],
        "P": [0.34, 0.34, 0.34, 0.37, 0.50, 0.60, 0.74, 1.09, 1.95, 2.73, 3.12, 3.34, 3.49, 3.62, 3.74, 3.68, 3.96, 4.07, 4.17, 4.26,
              4.36, 4.46, 4.56, 4.65, 4.74, 4.84, 4.92, 5.02, 5.11, 5.19, 5.28, 5.36, 5.45, 5.53, 5.62, 5.70, 5.78, 5.87],
        # [W1, W2, W3] sebelum dan sesudah
        "ka": [[28.84, 27.64, 11], [43.94, 41.84, 11]]},
    "3 × 30": {
        "x": [0] * 10 + [0.22, 0.45, 0.70, 0.98, 1.24, 1.5, 1.9, 2.5, 3.07, 3.63, 4.05, 4.37, 4.68, 5.02, 5.69, 6.28, 6.95, 7.50, 8.16,
                         8.82, 9.39, 9.90, 10.49, 10.97, 11.47, 11.94, 12.35, 12.64],
        "P": [0.34, 0.38, 0.54, 0.88, 1.38, 1.98, 2.59, 3.18, 3.74, 4.34, 5.4, 6.55, 7.46, 8.14, 8.64, 9.09, 9.46, 9.82, 10.14, 10.46,
              10.74, 11.03, 11.3, 11.58, 11.83, 12.09, 12.34, 12.58, 12.82, 13.07, 13.30, 13.53, 13.76, 13.76, 14.19, 14.39, 14.59, 14.79],
        # Sesudah: form menulis tanah kering + cawan 3,04; air 1,60 dan kadar air 7,26 % cocok dengan 33,04.
        "ka": [[44.24, 41.74, 11.2], [34.64, 33.04, 11]]},
    "3 × 65": {
        "x": [0] * 15 + [0.08, 0.42, 0.72, 1.72, 1.83, 2.58, 2.98, 3.57, 4.09, 4.66, 5.23, 5.76, 6.32, 6.88, 7.44, 7.96, 8.55, 9.08, 9.65,
                         10.24, 10.81, 11.34, 11.93, 12.54],
        "P": [0.34, 0.36, 0.41, 0.49, 0.60, 0.75, 0.97, 1.26, 1.65, 2.05, 2.59, 3.11, 3.66, 4.16, 4.67, 5.13, 5.66, 6.13, 6.63, 7.15,
              7.84, 8.2, 8.73, 9.2, 9.64, 10.19, 10.66, 11.13, 11.58, 12.05, 12.50, 13.02, 13.47, 13.95, 14.43, 15.34, 15.78, 16.25, 16.25],
        "ka": [[37.44, 35.34, 11], [46.14, 44.34, 11]]},
}
for nama, c in CONTOH.items():
    benar(f"CBR {nama}: jumlah penurunan = jumlah beban", len(c["x"]) == len(c["P"]))
    benar(f"CBR {nama}: beban pada 0 mm = 0,34 kN (tambahan NIM penulis)", c["P"][0] == 0.34)

BEBAN_STD = nilai("hitung-cbr.js", "BEBAN_STD")
benar("CBR: beban standar form = 13,35 kN dan 20,02 kN (form hlm 4–6)", BEBAN_STD == [13.35, 20.02])

r = js("hitung-cbr.js", "hitungCetakan", {
    "A": 1935, "std1": 13.35e3 / 1935, "std2": 20.02e3 / 1935, "bebanStd": BEBAN_STD, "koreksi": "tidak", "H0": 116.4, "satuanArloji": 0.0254,
    "swell": [], "cetakan": [{
        "nama": nama, "pukulan": int(nama.split("× ")[1]),
        "atas": [{"no": i + 1, "penetrasi": x, "beban": y} for i, (x, y) in enumerate(zip(c["x"], c["P"]))], "bawah": [],
        "kondisi": [{"nama": k, "W1": w[0], "W2": w[1], "W3": w[2]} for k, w in zip(("Sebelum", "Sesudah"), c["ka"])]}
        for nama, c in CONTOH.items()]})
benar("CBR: hitungCetakan tanpa galat", not r.get("galat"))
H = {c["nama"]: c for c in r.get("cetakan", [])}

# ---------------------------------------------------------------- kadar air (hlm 1–3 sebelum; form hlm 4–6 sebelum dan sesudah)
# Hlm 1 (3 × 10): berat air ditulis 2,1, tetapi pembaginya 1,2 (= 28,84 − 27,64, juga di form hlm 4); w = 7,212 %.
KADAR_AIR = {
    "3 × 10": [(1.2, 16.64, 7.212), (2.10, 30.84, 6.809)],
    "3 × 30": [(2.5, 30.54, 8.186), (1.60, 22.04, 7.26)],
    "3 × 65": [(2.1, 24.34, 8.628), (1.80, 33.34, 5.40)],
}
for nama, daftar in KADAR_AIR.items():
    for k, (air, kering, w), tol in zip(H[nama]["kondisi"], daftar, (5e-4, 5e-3 if nama != "3 × 10" else 5e-4)):
        cocok(f"CBR {nama} {k['nama'].lower()}: berat air W4", air, k["air"], 5e-3)
        cocok(f"CBR {nama} {k['nama'].lower()}: tanah kering W5", kering, k["kering"], 5e-3)
        cocok(f"CBR {nama} {k['nama'].lower()}: kadar air", w, k["w"], tol)

# ---------------------------------------------------------------- harga CBR (hlm 1–3 dan kotak HARGA CBR form hlm 4–6)
# Beban dibaca dengan interpolasi linier antara dua baris penurunan yang mengapit 2,54 mm dan 5,08 mm.
# 3 × 10: form menulis CBR 2,54 mm = 33,0406 %, halaman hitungan 33,046 %; 4,4116 / 13,35 × 100 = 33,046 % (diuji).
# 3 × 10: beban 5,08 mm ditulis 4,816 kN (hlm 1) dan 4,815 kN (form); interpolasi 4,8154 kN, jadi 4,815 yang diuji.
#         CBR 24,053 % di keduanya dihitung dari beban sebelum dibulatkan (4,816 / 20,02 = 24,056 %).
HARGA = {  # beban 2,54 mm, CBR 2,54 mm, beban 5,08 mm, CBR 5,08 mm
    "3 × 10": (4.412, 33.046, 4.815, 24.053),
    "3 × 30": (9.842, 73.726, 11.602, 57.954),
    "3 × 65": (7.803, 58.451, 10.045, 50.176),
}
for nama, (P1, C1, P2, C2) in HARGA.items():
    s = H[nama]["set"][0]
    cocok(f"CBR {nama}: beban 2,54 mm", P1, s["P1"], 5e-4)
    cocok(f"CBR {nama}: CBR 2,54 mm", C1, s["CBR1"], 5e-4)
    cocok(f"CBR {nama}: beban 5,08 mm", P2, s["P2"], 5e-4)
    cocok(f"CBR {nama}: CBR 5,08 mm", C2, s["CBR2"], 5e-4)
    cocok(f"CBR {nama}: CBR = beban / beban standar × 100", s["P1"] / 13.35 * 100, s["CBR1"], 1e-9)
    benar(f"CBR {nama}: nilai dilaporkan = 2,54 mm (CBR 2,54 > CBR 5,08)", s["CBR"] == s["CBR1"] and s["dari"] == 2.54)
    benar(f"CBR {nama}: tanpa koreksi titik nol (seperti laporan)", s["koreksi"]["x0"] == 0)
# Cara tegangan (ASTM D1883) dengan tegangan setara form memberi angka yang sama.
rt = js("hitung-cbr.js", "hitung", {"A": 1935, "std1": 13.35e3 / 1935, "std2": 20.02e3 / 1935, "koreksi": "tidak",
                                    "atas": [{"no": i + 1, "penetrasi": x, "beban": y} for i, (x, y) in
                                             enumerate(zip(CONTOH["3 × 30"]["x"], CONTOH["3 × 30"]["P"]))]})
cocok("CBR 3 × 30: cara tegangan setara = cara form", 73.726, rt["set"][0]["CBR1"], 5e-4)

# ---------------------------------------------------------------- halaman alat: data contoh, NIM, catatan
# Data contoh di halaman alat = angka form di atas (tanpa tambahan NIM lagi).
for nama, c in CONTOH.items():
    m = re.search(r"\{ nama: '" + re.escape(nama) + r"', pukulan: (\d+), ka: \[\[([^\]]*)\], \[([^\]]*)\]\],\s*x: \[([^\]]*)\],\s*P: \[([^\]]*)\]",
                  SUMBER_ALAT)
    benar(f"CBR {nama}: data contoh ditemukan di alat-cbr.js", m is not None)
    if m:
        f = lambda g: [float(v) for v in g.split(",")]
        benar(f"CBR {nama}: data contoh alat = angka laporan",
              int(m.group(1)) == int(nama.split("× ")[1]) and [f(m.group(2)), f(m.group(3))] == c["ka"]
              and f(m.group(4)) == c["x"] and f(m.group(5)) == c["P"])
# NIM (aturan asisten lab): arloji beban penetrasi, berat tanah + cetakan, cawan + tanah basah, cawan + tanah kering.
benar("CBR: nim menunjuk WtA, WtB, W1A, W2A, W1B, W2B di tabel cetakan",
      "nimTabel = { cetakan: ['WtA', 'WtB', 'W1A', 'W2A', 'W1B', 'W2B'] }" in SUMBER_ALAT)
benar("CBR: nim menunjuk beban penetrasi PA dan PB tiap tabel penetrasi", "nimTabel['pen' + c] = ['PA', 'PB'];" in SUMBER_ALAT)
for kol in ("WtA", "WtB", "W1A", "W2A", "W1B", "W2B"):
    benar(f"CBR: kolom nim {kol} ada di tabel cetakan", f"{{ id: '{kol}'," in SUMBER_ALAT)
benar("CBR: kolom PA dan PB ada di tabel penetrasi", "{ id: 'PA'," in SUMBER_ALAT and "{ id: 'PB'," in SUMBER_ALAT)
benar("CBR: catatan beda hanya tampil untuk data contoh", "function bedaContoh(m, isi)" in SUMBER_ALAT and "m.contoh ?" in SUMBER_ALAT)
for teks in ("33,0406", "4,816", "3,04", "2,1"):
    benar(f"CBR: catatan beda menyebut {teks}", teks in SUMBER_ALAT)

print("\nSemua cocok." if not gagal else f"\n{gagal} pemeriksaan gagal.")
sys.exit(1 if gagal else 0)
