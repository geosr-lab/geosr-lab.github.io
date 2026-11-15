"""Cocokkan alat konsolidasi laboratorium dengan contoh pengolahan data di laporan praktikum (PDF bahan Defsa).

Modul hitung-konsolidasi-lab.js dijalankan lewat node dengan data contoh laporan (angka sudah termasuk +0,34 NIM
penulis, yang di contoh hanya ada di bacaan 24 jam), lalu dibandingkan dengan angka yang tertulis di PDF.
Toleransi = setengah satuan digit terakhir yang ditulis. Contoh ini banyak salah hitung; yang diuji adalah angka
yang benar, dan bedanya dicatat di komentar (catatan yang sama tampil di halaman alat, blok "Beda dengan contoh laporan").

Berkas acuan (tidak disimpan di repo): Consolidation Test.pdf
- hlm 140–142 (halaman PDF 1–3): pengolahan data tulisan tangan
- halaman PDF 4: tabel hasil (form hal. tabel tegangan–cv), halaman PDF 5: form penentuan kadar air dan pembacaan arloji,
  halaman PDF 6: form sebelum percobaan dan kadar air cawan, halaman PDF 7–11: grafik bacaan terhadap √t tiap tahap.
Form kosong: FORM_FIX_KOSONGAN_1.pdf hlm 21–24 (uji konsolidasi).

Jalankan dari akar repo:  python3 tests/verifikasi_contoh_laporan_b_konsolidasi.py
"""
import json
import math
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


# ---------------------------------------------------------------- data contoh (sama dengan alat-konsolidasi-lab.js)
WAKTU = [0, 0.1, 0.1667, 0.25, 0.5, 1, 2, 4, 8, 15, 30, 60, 120, 240, 480, 1440]
KOLOM = [[6, 18, 20, 22, 23, 24, 24.5, 27, 29, 29.1, 29.4, 29.8, 30, 30.2, 30.5, 31.24],
         [0, 48, 50, 52, 53.5, 54.1, 55, 55.8, 56.1, 56.8, 57.9, 58.2, 38.9, 39.1, 39.9, 40.64],
         [0, 88, 88.4, 88.9, 89, 89.99, 90.2, 91, 91.3, 91.99, 92.9, 93.1, 93.5, 93.8, 92.2, 91.64],
         [0, 92.9, 92.8, 92.8, 92.7, 92.7, 92.6, 92.6, 92.6, 92.6, 92.6, 92.5, 92.2, 92.2, 92.2, 91.64],
         [0, 89.5, 89.4, 89.3, 89.1, 89, 88.9, 88.8, 88.7, 88.6, 88.1, 88, 87.9, 88.8, 88.7, 88.94]]
BEBAN = [1, 3, 7, 3, 1]
T90 = [0.0625, 0.0625, 0.36, 0.25, 0.25]  # menit, kolom t90 tabel hasil (halaman PDF 4)


def masukan(**ubah):
    m = {"Gs": 2.678, "H0": 1.4, "diameter": 5.01, "cincin": 54.2, "cincinBasah": 103.335, "caraWk": "ring", "cincinKering": 89.452,
         "satuan": 0.1, "arloji0": 0, "arah": "naik", "drainase": "dua", "caraCc": "terakhir", "LL": None,
         "cawanSebelum": [], "cawanSesudah": [{"nama": "1", "W1": 26.3, "W2": 23.1, "W3": 11.2}],
         "tahap": [{"nama": str(i + 1), "beban": b, "p": None, "akhir": None, "t90": T90[i]} for i, b in enumerate(BEBAN)],
         "bacaan": [{"t": t, "nilai": [k[j] for k in KOLOM]} for j, t in enumerate(WAKTU)]}
    m.update(ubah)
    return m


r = js("hitung-konsolidasi-lab.js", "hitung", masukan())
benar("contoh: tanpa galat", not r["galat"])
a, T = r["awal"], r["tahap"]

# ---------------------------------------------------------------- 1. angka pori dan derajat kejenuhan (hlm 140, PDF 6)
cocok("berat tanah basah Wb = W4 − Wc (49,135)", 49.135, a["Wb"], 5e-4)
cocok("berat tanah kering = 89,452 − 54,2 (35,252, form PDF 5)", 35.252, a["Ws"], 5e-4)
cocok("massa air (13,883, form PDF 5)", 13.883, a["air"], 5e-4)
# w0 tidak ditulis langsung; S = 645,2483 = w0 × 2,678 / 0,163449 memakai w0 = 39,38 (persen).
cocok("w0 tersirat di S contoh (645,2483 × 0,163449 / 2,678)", 645.2483 * 0.163449 / 2.678, a["w"], 5e-3)
# Luas cincin: contoh 7,8657 cm² = ¼ × 3,14 × 5,01 × 2 (bukan ¼ π D²); V contoh 11,012 = 7,8657 × 1,4.
cocok("luas contoh 7,8657 = ¼ × 3,14 × 5,01 × 2 (asal salah hitung)", 7.8657, 0.25 * 3.14 * 5.01 * 2, 5e-5)
cocok("volume contoh 11,012 = 7,8657 × 1,4", 11.012, 7.8657 * 1.4, 5e-4)
cocok("luas alat = ¼ π D²", math.pi * 5.01 ** 2 / 4, a["A"], 1e-9)
cocok("volume alat = A H0", math.pi * 5.01 ** 2 / 4 * 1.4, a["V"], 1e-9)
# Dengan luas contoh, rumus alat memberi angka contoh: γd 3,20124 dan Hs = 1,67354 (hlm 140 menulis 1,673, form PDF 6 1,674),
# e0 = −0,163449 (contoh menulis 0,163449 tanpa tanda minus).
cocok("γd dengan V contoh (3,20124)", 3.20124, 35.252 / 11.012, 5e-6)
cocok("Hs dengan A contoh (form 1,674)", 1.674, 35.252 / (2.678 * 7.8657), 5e-4)
cocok("e0 dengan A contoh = −0,163449 (contoh menghilangkan tanda minus)", -0.163449, (1.4 - 35.252 / (2.678 * 7.8657)) / (35.252 / (2.678 * 7.8657)), 5e-7)
Hs = 35.252 / (2.678 * math.pi * 5.01 ** 2 / 4)
cocok("Hs alat", Hs, a["Hs"], 1e-9)
cocok("e0 alat = (H0 − Hs)/Hs", (1.4 - Hs) / Hs, a["e0"], 1e-9)
cocok("γd alat = Wk / V", 35.252 / (math.pi * 5.01 ** 2 / 4 * 1.4), a["gammaD"], 1e-9)
cocok("S alat = w0 Gs / e0 (w0 pecahan)", 13.883 / 35.252 * 2.678 / ((1.4 - Hs) / Hs) * 100, a["Sr"], 1e-6)
benar("data contoh dengan luas benar: e0 > 0 dan S < 100%", a["e0"] > 0 and a["Sr"] < 100)

# ---------------------------------------------------------------- 2. kadar air cawan (hlm 141, PDF 6)
c = a["cawanSesudah"]["cawan"][0]
cocok("cawan: berat tanah kering (11,9)", 11.9, c["kering"], 5e-2)
cocok("cawan: berat air (3,2)", 3.2, c["air"], 5e-2)
# Contoh 13,8528% = 3,2 / 23,1 (dibagi cawan + tanah kering); yang benar 3,2 / 11,9.
cocok("cawan: contoh 13,8528 = 3,2/23,1 × 100 (asal salah hitung)", 13.8528, 3.2 / 23.1 * 100, 5e-5)
cocok("cawan: kadar air alat = 3,2/11,9 × 100", 3.2 / 11.9 * 100, c["w"], 1e-9)

# ---------------------------------------------------------------- 3. tiap tahap (hlm 141–142, tabel hasil PDF 4)
dH = [0.3124, 0.4064, 0.9164, 0.9164, 0.8894]           # Δh contoh (cm), satuan arloji setara 0,1 mm/divisi
h = [1.088, 0.994, 0.484, None, 0.511]                   # tebal akhir contoh; tahap 4 ditulis 0,2184 (salah, seharusnya 0,484)
d = [1.244, 1.041, 0.739, 0.484, 0.497]                  # tebal rata-rata d = (h1 + h2)/2
cv_contoh = [0.350, 0.245, 0.021, 0.013, 0.014]          # cm²/s dengan d penuh (drainase satu arah)
akhir = [31.24, 40.64, 91.64, 91.64, 88.94]              # bacaan 24 jam = bacaan akhir arloji (contoh menulis /10 "cm")
for i, t in enumerate(T):
    cocok(f"tahap {i + 1}: bacaan akhir = bacaan 24 jam", akhir[i], t["akhir"], 1e-9)
    cocok(f"tahap {i + 1}: Δh", dH[i], t["dH"], 5e-5)
    if h[i] is not None:
        cocok(f"tahap {i + 1}: tebal akhir h", h[i], t["H"], 5e-4)
    cocok(f"tahap {i + 1}: tebal rata-rata d", d[i], t["Havg"], 5e-4)
    cocok(f"tahap {i + 1}: t90 detik", [3.75, 3.75, 21.6, 15, 15][i], t["t90"] * 60, 5e-3)
    cocok(f"tahap {i + 1}: Δe = Δh/Hs", t["dH"] / Hs, t["de"], 1e-9)
    cocok(f"tahap {i + 1}: e = e0 − Δe", a["e0"] - t["dH"] / Hs, t["e"], 1e-9)
    cocok(f"tahap {i + 1}: p = beban/A", BEBAN[i] / (math.pi * 5.01 ** 2 / 4), t["p"], 1e-9)
    cocok(f"tahap {i + 1}: Hdr dua arah = d/2", t["Havg"] / 2, t["Hdr"], 1e-9)
    cocok(f"tahap {i + 1}: cv = 0,848 Hdr²/t90", 0.848 * t["Hdr"] ** 2 / (t["t90"] * 60), t["cv"], 1e-12)
cocok("tebal akhir tahap 4 benar (contoh 0,2184)", 0.4836, T[3]["H"], 5e-5)
# Tegangan contoh = beban / 7,8657: 0,127134 dan 0,381402 (PDF 4), 0,890.
for b, pc in ((1, 0.127134), (3, 0.381402), (7, 0.890)):
    cocok(f"tegangan contoh {pc} = {b} / 7,8657", pc, b / 7.8657, 5e-4 if pc == 0.890 else 1e-6)  # contoh memotong digit terakhir
# Δe contoh = 0,831035 × Δh, 0,831035 = (1 + 0,1634)/1,4; Cc contoh tahap 2 dan 3.
F = (1 + 0.163449) / 1.4
cocok("faktor F contoh (0,831035)", 0.831035, F, 5e-7)
cocok("Δe contoh tahap 2 (0,338)", 0.338, F * 0.4064, 5e-4)
cocok("Cc contoh tahap 2 (0,16372) dengan F contoh", 0.16372, F * (0.4064 - 0.3124) / math.log10(3), 5e-4)
cocok("Cc contoh tahap 3 (1,1518) dengan F contoh", 1.1518, F * (0.9164 - 0.4064) / math.log10(7 / 3), 5e-3)
cocok("Cc alat tahap 2 = (Δh2 − Δh1)/Hs / log 3", (0.4064 - 0.3124) / Hs / math.log10(3), T[1]["Cc"], 1e-9)
cocok("Cs alat tahap 5 = Δe / log 3", (0.9164 - 0.8894) / Hs / math.log10(3), T[4]["Cs"], 1e-9)
cocok("Cs contoh tahap 5 (0,0470) dengan F contoh", 0.0470, F * (0.9164 - 0.8894) / math.log10(3), 5e-4)
# cv contoh memakai d penuh = pilihan drainase satu arah di alat.
r1 = js("hitung-konsolidasi-lab.js", "hitung", masukan(drainase="satu"))
for i, t in enumerate(r1["tahap"]):
    cocok(f"tahap {i + 1}: cv drainase satu arah = contoh", cv_contoh[i], t["cv"], 5e-4)
    cocok(f"tahap {i + 1}: cv dua arah = ¼ cv satu arah", t["cv"] / 4, T[i]["cv"], 1e-12)
benar("cv rata-rata hanya tahap pembebanan", abs(r["cvRata"] - sum(t["cv"] for t in T[:3]) / 3) < 1e-12)

# ---------------------------------------------------------------- peringatan kewajaran
# Dengan satuan contoh (0,1 mm/divisi) tahap 3–5 memampat sampai angka pori negatif → peringatan.
benar("peringatan angka pori negatif tahap 3–5", all(any(f"Tahap {n}: angka pori negatif" in p for p in r["peringatan"]) for n in (3, 4, 5)))
benar("tahap 1–2 tanpa peringatan angka pori", not any(f"Tahap {n}: angka pori negatif" in p for p in r["peringatan"] for n in (1, 2)))
r2 = js("hitung-konsolidasi-lab.js", "hitung", masukan(satuan=0.01))
benar("satuan 0,01 mm/divisi: semua angka pori positif, tanpa peringatan", all(t["e"] > 0 for t in r2["tahap"]) and not r2["peringatan"])
# Luas contoh (seakan D = √(4 × 7,8657/π)) memberi Hs > H0: peringatan e0 ≤ 0.
r3 = js("hitung-konsolidasi-lab.js", "hitung", masukan(diameter=math.sqrt(4 * 7.8657 / math.pi)))
cocok("luas contoh → Hs 1,674 (form)", 1.674, r3["awal"]["Hs"], 5e-4)
cocok("luas contoh → γd 3,201 g/cm³", 3.201, r3["awal"]["gammaD"], 5e-4)
benar("luas contoh → peringatan Hs ≥ H0", any("e<sub>0</sub> ≤ 0" in p for p in r3["peringatan"]))

# ---------------------------------------------------------------- jalur lain form: Wk dari kadar air cawan sebelum percobaan
r4 = js("hitung-konsolidasi-lab.js", "hitung", masukan(caraWk="cawan", cincinKering=None,
                                                         cawanSebelum=[{"nama": "1", "W1": 26.3, "W2": 23.1, "W3": 11.2}]))
cocok("Wk = Wb / (1 + w0)", 49.135 / (1 + 3.2 / 11.9), r4["awal"]["Ws"], 1e-9)
# Tekanan diisi langsung (lengan beban) mengalahkan beban/A.
r5 = js("hitung-konsolidasi-lab.js", "hitung", masukan(tahap=[{"nama": str(i + 1), "beban": b, "p": [0.5, 1, 2, 1, 0.5][i], "akhir": None, "t90": T90[i]}
                                                              for i, b in enumerate(BEBAN)]))
benar("tekanan manual dipakai", [t["p"] for t in r5["tahap"]] == [0.5, 1, 2, 1, 0.5] and not any(t["pDariBeban"] for t in r5["tahap"]))

print("\nSemua cocok." if not gagal else f"\n{gagal} pemeriksaan gagal.")
sys.exit(1 if gagal else 0)
