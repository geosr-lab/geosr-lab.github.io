"""Cocokkan alat praktikum lapangan (sondir, SPT dan boring log) dengan contoh laporan praktikum (PDF bahan Defsa).

Modul hitung dijalankan lewat node dengan data contoh laporan (angka sudah termasuk +0,34 NIM penulis),
lalu dibandingkan dengan angka yang tertulis di PDF. Toleransi = setengah satuan digit terakhir yang ditulis.
Bila laporan salah hitung, yang diuji adalah angka yang benar dan perbedaannya dicatat di komentar
(catatan yang sama tampil di halaman alat lewat blok "Beda dengan contoh laporan").

Berkas acuan (tidak disimpan di repo):
- Cone Penetration Test.pdf hlm PDF 1–2 (form uji penetrasi konus terisi, 0,00–10,80 m) dan
  hlm PDF 3–5 (= halaman laporan 15–17, "2.1.5 Pengolahan data", langkah a–e)
- Boring and Sampling.pdf hlm PDF 1 (form boring log terisi). Contoh laporan ini tidak memuat data pukulan SPT.
- FORM_FIX_KOSONGAN_1.pdf hlm 1 (SPT), 4–6 (sondir), 8 (boring log): nama dan urutan kolom.

Jalankan dari akar repo:  python3 tests/verifikasi_contoh_laporan_b_lapangan.py
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
    return json.loads(subprocess.check_output(["node", "-e", skrip, str(P / modul), fungsi, json.dumps(arg)], text=True))


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


# ---------------------------------------------------------------- sondir (Cone Penetration Test.pdf hlm PDF 1–2)
# Kolom form: MT, PK, JP, HL = JP − PK, HL × 20/10, JHL, HS = HL/10 (tulisan tangan, dua halaman form).
# HS pada 5,60 m terbaca "0,88?" (digit terakhir kabur); HL 8,85 / 10 = 0,885 dipakai.
FORM = [
    (0.00, 11.77, 15.57, 3.80, 7.6, 7.6, 0.38), (0.20, 24.09, 29.32, 5.23, 10.46, 18.06, 0.523),
    (0.40, 9.53, 18.07, 8.54, 17.08, 35.14, 0.854), (0.60, 15.13, 21.82, 6.69, 13.38, 48.52, 0.669),
    (0.80, 14.01, 16.82, 2.81, 5.62, 54.14, 0.281), (1.00, 16.25, 20.57, 4.32, 8.64, 62.78, 0.432),
    (1.20, 7.29, 15.57, 8.28, 16.56, 79.34, 0.828), (1.40, 6.17, 13.07, 6.90, 13.8, 93.14, 0.69),
    (1.60, 3.93, 15.57, 11.64, 23.28, 116.42, 1.164), (1.80, 5.05, 14.07, 9.02, 18.04, 134.46, 0.902),
    (2.00, 5.05, 18.57, 13.52, 27.04, 161.5, 1.352), (2.20, 2.81, 27.57, 24.76, 49.52, 211.02, 2.476),
    (2.40, 2.81, 25.32, 22.51, 45.02, 256.04, 2.251), (2.60, 2.81, 34.32, 31.51, 63.02, 319.06, 3.151),
    (2.80, 3.37, 23.07, 19.70, 39.4, 358.46, 1.97), (3.00, 6.73, 29.82, 23.09, 46.18, 404.64, 2.309),
    (3.20, 11.77, 24.57, 12.80, 25.6, 430.24, 1.28), (3.40, 14.01, 26.82, 12.81, 25.62, 455.86, 1.281),
    (3.60, 21.85, 31.82, 9.97, 19.94, 475.8, 0.997), (3.80, 27.45, 49.32, 21.87, 43.74, 519.54, 2.187),
    (4.00, 36.41, 50.57, 14.16, 28.32, 547.86, 1.416), (4.20, 38.65, 46.82, 8.17, 16.34, 564.2, 0.817),
    (4.40, 40.89, 50.57, 9.68, 19.36, 583.56, 0.968), (4.60, 36.41, 44.32, 7.91, 15.82, 599.38, 0.791),
    (4.80, 31.93, 39.32, 7.39, 14.78, 614.16, 0.739), (5.00, 31.93, 40.57, 8.64, 17.28, 631.44, 0.864),
    (5.20, 42.01, 49.32, 7.31, 14.62, 646.06, 0.731), (5.40, 33.05, 38.07, 5.02, 10.04, 656.1, 0.502),
    (5.60, 22.97, 31.82, 8.85, 17.7, 673.8, 0.885), (5.80, 22.97, 30.57, 7.60, 15.2, 689, 0.76),
    (6.00, 22.97, 35.57, 12.60, 25.2, 714.2, 1.26), (6.20, 27.45, 41.57, 14.12, 28.24, 742.44, 1.412),
    (6.40, 22.97, 37.57, 14.60, 29.2, 771.64, 1.46), (6.60, 19.61, 40.57, 20.96, 41.92, 813.56, 2.096),
    (6.80, 20.73, 42.57, 21.84, 43.68, 857.24, 2.184), (7.00, 27.45, 52.57, 25.12, 50.24, 907.48, 2.512),
    (7.20, 37.53, 50.57, 13.04, 26.08, 933.56, 1.304), (7.40, 43.13, 56.82, 13.69, 27.38, 960.94, 1.369),
    (7.60, 43.13, 61.82, 18.69, 37.38, 998.32, 1.869), (7.80, 31.93, 41.82, 9.89, 19.78, 1018.1, 0.989),
    (8.00, 50.97, 63.07, 12.10, 24.2, 1042.3, 1.21), (8.20, 67.77, 88.07, 20.30, 40.6, 1082.9, 2.03),
    (8.40, 34.17, 79.32, 45.15, 90.3, 1173.2, 4.515), (8.60, 17.37, 56.82, 39.45, 78.9, 1252.1, 3.945),
    (8.80, 11.77, 68.07, 56.30, 112.6, 1364.7, 5.63), (9.00, 22.97, 68.07, 45.10, 90.2, 1454.9, 4.51),
    (9.20, 28.57, 101.82, 73.25, 146.5, 1601.4, 7.325), (9.40, 17.37, 68.07, 50.70, 101.4, 1702.8, 5.07),
    (9.60, 11.77, 79.32, 67.55, 135.1, 1837.9, 6.755), (9.80, 17.37, 68.07, 50.70, 101.4, 1939.3, 5.07),
    (10.00, 28.57, 79.32, 50.75, 101.5, 2040.8, 5.075), (10.20, 45.37, 124.32, 78.95, 157.9, 2198.7, 7.895),
    (10.40, 62.17, 146.82, 84.65, 169.3, 2368, 8.465), (10.60, 62.17, 158.07, 95.90, 191.8, 2559.8, 9.59),
    (10.80, 56.57, 135.57, 79.00, 158, 2717.8, 7.9),
]


def tol(x):
    """Setengah satuan digit terakhir yang ditulis di laporan."""
    s = repr(float(x))
    d = len(s.split(".")[1].rstrip("0")) if "." in s else 0
    return 0.5 * 10 ** -d + 1e-9


# Data "Muat data contoh" di alat-lapangan.js harus sama persis dengan PK dan JP form contoh.
teks = (P / "alat-lapangan.js").read_text(encoding="utf-8")
def larik(nama):
    m = re.search(r"var " + nama + r" = \[([^\]]*)\]", teks)
    return [float(x) for x in m.group(1).replace("\n", " ").split(",")] if m else []
benar("data contoh sondir: PK sama dengan form contoh", larik("PK_C") == [b[1] for b in FORM])
benar("data contoh sondir: JP sama dengan form contoh", larik("JP_C") == [b[2] for b in FORM])

r = js("hitung-lapangan.js", "sondir", {"interval": 20, "faktor": 10, "bacaan": [{"kedalaman": z, "PK": pk, "JP": jp} for z, pk, jp, *_ in FORM]})
benar("sondir: 55 baris dihitung", r.get("n") == 55 and len(r["titik"]) == 55)
for (z, pk, jp, hl, hlk, jhl, hs), t in zip(FORM, r["titik"]):
    cocok(f"sondir {z:.2f} m: HL = JP − PK", hl, t["HL"], tol(hl))
    cocok(f"sondir {z:.2f} m: HL × 20/10", hlk, t["HLper"], tol(hlk))
    cocok(f"sondir {z:.2f} m: JHL", jhl, t["JHL"], tol(jhl))
    cocok(f"sondir {z:.2f} m: HS = HL/10", hs, t["HS"], tol(hs))

# Pengolahan data (hlm PDF 3–4 = laporan hlm 15–16): kedalaman 0,20 m dan 0,40 m.
a, b = r["titik"][1], r["titik"][2]
cocok("langkah a (0,20 m): HL 5,23", 5.23, a["HL"], 5e-3)
cocok("langkah a (0,20 m): HL × 20/10 = 10,46", 10.46, a["HLper"], 5e-3)
cocok("langkah a (0,20 m): JHL 18,06", 18.06, a["JHL"], 5e-3)
cocok("langkah a (0,20 m): HS 0,523", 0.523, a["HS"], 5e-4)
cocok("langkah b (0,40 m): HL 8,54", 8.54, b["HL"], 5e-3)
cocok("langkah b (0,40 m): HL × 20/10 = 17,08", 17.08, b["HLper"], 5e-3)
cocok("langkah b (0,40 m): JHL 35,14", 35.14, b["JHL"], 5e-3)
cocok("langkah b (0,40 m): HS 0,854", 0.854, b["HS"], 5e-4)
# Langkah c (hlm PDF 4): q̄f = Σ JHL / n = 45.501,4 / 55. Laporan menulis 827,299; 45.501,4 / 55 = 827,2982 → 827,298 (pembulatan).
cocok("langkah c: Σ JHL = 45.501,4", 45501.4, r["sumJHL"], 5e-2)
cocok("langkah c: q̄f = 827,298 (laporan 827,299, salah bulat)", 827.298, r["qf"], 5e-4)
# Langkah d (hlm PDF 5): laporan q̄c = 2.739,85 / 55 = 49,815. 2.739,85 = Σ JP (jumlah perlawanan), bukan Σ PK.
# Alat memakai qc = PK (nilai konus): Σ PK = 1.380,95 → q̄c = 25,108 kg/cm².
cocok("langkah d: angka 2.739,85 laporan = Σ JP", 2739.85, r["sumJP"], 5e-3)
cocok("langkah d: 2.739,85 / 55 = 49,815 (cara laporan)", 49.815, r["sumJP"] / r["n"], 5e-4)
cocok("langkah d: Σ PK", 1380.95, r["sumPK"], 5e-3)
cocok("langkah d: q̄c alat = Σ PK / n", 1380.95 / 55, r["qc"], 1e-9)
# Langkah e (hlm PDF 5): laporan FR = 0,854 / 55 × 100% = 1,553% (membagi dengan jumlah sampel, bukan qc).
# Alat: FR = HS / qc × 100% dengan qc = PK pada kedalaman yang sama: 0,854 / 9,53 × 100% = 8,961%.
cocok("langkah e: angka laporan 1,553% = 0,854/55 × 100%", 1.553, b["HS"] / 55 * 100, 5e-4)
cocok("langkah e: FR alat 0,40 m = HS/PK × 100% = 8,961%", 8.961, b["FR"], 5e-4)
benar("langkah e: FR alat berbeda dari angka laporan (catatan beda tampil di halaman)", abs(b["FR"] - 1.553) > 1)
# Semua FR = HS/PK × 100% per kedalaman.
benar("sondir: FR = HS/PK × 100% di semua kedalaman", all(abs(t["FR"] - t["HS"] / t["PK"] * 100) < 1e-9 for t in r["titik"]))
cocok("sondir: JHL akhir 10,80 m = 2.717,8", 2717.8, r["JHL"], 5e-2)

# ---------------------------------------------------------------- boring log (Boring and Sampling.pdf hlm PDF 1)
# Kolom Depth: 0,00–0,28 / 0,28–1,06 / 1,06–2,21 / 2,21–2,48 / 2,48–2,60 / 2,60–2,91 / 2,91–3,25 m.
# Kolom Thick di laporan berisi kedalaman bawah (0,28; 1,06; 2,21; 2,48; 2,60; 2,91; 3,25), bukan tebal.
# Yang diuji tebal yang benar: sampai − dari.
batas = [0, 0.28, 1.06, 2.21, 2.48, 2.60, 2.91, 3.25]
lap = [{"no": i + 1, "dari": batas[i], "sampai": batas[i + 1], "jenis": "lempung-pasir" if i < 5 else "lempung"} for i in range(7)]
r = js("hitung-lapangan.js", "spt", {"MAT": None, "Er": None, "uji": [], "lapisan": lap})
benar("boring log: contoh tanpa data SPT tetap dihitung", not r["galat"] and r["uji"] == [])
for l, tebal in zip(r["lapisan"], (0.28, 0.78, 1.15, 0.27, 0.12, 0.31, 0.34)):
    cocok(f"boring log {l['dari']:.2f}–{l['sampai']:.2f} m: Thick = sampai − dari", tebal, l["tebal"], 5e-3)
cocok("boring log: kedalaman bor 3,25 m", 3.25, r["dalam"], 1e-9)
cocok("boring log: jumlah tebal = kedalaman bor", 3.25, sum(l["tebal"] for l in r["lapisan"]), 1e-9)
for ket in ("lempung berpasir", "lempung berbutir halus"):
    benar(f"data contoh boring log memuat Remarks '{ket}'", ket.capitalize() in teks)
benar("data contoh boring log: tujuh lapisan seperti form contoh",
      all(f"[{a_}, {b_}," in teks for a_, b_ in (("0", "0.28"), ("0.28", "1.06"), ("1.06", "2.21"), ("2.21", "2.48"), ("2.48", "2.60"), ("2.60", "2.91"), ("2.91", "3.25"))))
benar("SPT: lempung berpasir memakai konsistensi lempung (N 5 = Sedang)",
      json.loads(subprocess.check_output(["node", "-e", "const m=require(process.argv[1]);console.log(JSON.stringify(m.keadaan('lempung-pasir',5)))",
                                          str(P / "hitung-lapangan.js")], text=True)) == "Sedang")

# Alat SPT tidak memakai NIM; sondir memakai PK dan JP.
benar("nim sondir = PK dan JP", "nim: { ket: 'perlawanan penetrasi konus (PK) dan jumlah perlawanan (JP)', tabel: { bacaan: ['PK', 'JP'] } }" in teks)
benar("SPT tanpa NIM", teks.count("nim:") == 1)

print("\nSemua cocok." if not gagal else f"\n{gagal} pemeriksaan gagal.")
sys.exit(1 if gagal else 0)
