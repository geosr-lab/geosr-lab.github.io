"""Cocokkan alat pemadatan dan sand cone dengan contoh pengolahan data di laporan praktikum (PDF bahan Defsa).

Modul hitung-kepadatan.js dijalankan lewat node dengan data contoh laporan (angka cawan pemadatan sudah
termasuk +0,34 NIM penulis; sand cone tanpa NIM), lalu dibandingkan dengan angka yang tertulis di PDF.
Toleransi = setengah satuan digit terakhir yang ditulis di laporan. Bila laporan salah hitung, yang diuji
adalah angka yang benar dan perbedaannya dicatat di komentar (catatan yang sama tampil di halaman alat,
blok "Beda dengan contoh laporan").

Berkas acuan (tidak disimpan di repo):
- Compaction Test.pdf hlm 1–2 (laporan hlm 121–122, pengolahan data cawan A) dan hlm 3 (form terisi,
  Pengujian Kepadatan Ringan SNI 1742-2008, cawan A–E)
- Sand Cone.pdf hlm 1 (form terisi, Uji Kepadatan Lapangan SNI 2828-2011) dan hlm 2–4 (laporan hlm 31–33)

Jalankan dari akar repo:  python3 tests/verifikasi_contoh_laporan_b_kepadatan.py
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


SUMBER_ALAT = (P / "alat-kepadatan.js").read_text(encoding="utf-8")

# ---------------------------------------------------------------- pemadatan (Compaction Test.pdf hlm 1–3)
# Form hlm 3: Gs 2,678; massa cetakan 1.714,9 g; isi cetakan 920,89 cm³; massa tanah basah persiapan 2.500 g;
# penambahan air 200–400 cc. W1 dan W2 cawan sudah termasuk +0,34 dari NIM penulis.
# Kolom A: form menulis massa tanah basah + cetakan 3.411,1 g, tetapi laporan hlm 121 memakai 3.431,1 g dan
# massa tanah basah 1.716,2 g (= 3.431,1 − 1.714,9) di form dan laporan; data contoh memakai 3.431,1 g.
CAWAN = "ABCDE"
W1 = [37.84, 39.74, 37.34, 37.98, 43.84]
W2 = [35.14, 36.24, 34.04, 33.74, 38.54]
W3 = [11.1, 11.1, 11.0, 11.2, 10.9]
MT = [3431.1, 3585.7, 3644.8, 3631.7, 3602.5]
titik = [{"nama": CAWAN[i], "W1": W1[i], "W2": W2[i], "W3": W3[i], "Mtotal": MT[i]} for i in range(5)]
# Angka laporan per cawan A–E (form hlm 3; cawan A juga hlm 121–122).
AIR = [2.7, 3.5, 3.3, 4.24, 5.3]
KERING = [24.04, 25.14, 23.04, 22.54, 27.64]
# Kadar air C di form tertulis "14,32…" dengan digit terakhir kurang jelas; 3,3/23,04 = 14,3229 → 14,323.
W = [11.231, 13.922, 14.323, 18.811, 19.175]
BASAH = [1716.2, 1870.8, 1929.9, 1916.8, 1887.6]
GAMMA = [1.864, 2.032, 2.096, 2.081, 2.050]
# γd cawan A: laporan hlm 122 menulis 1,675; form menulis 1,676 karena memakai γ = 1,864 yang dibulatkan
# (laporan malah memakai 1,86). Dengan γ tanpa pembulatan (1,86363) hasilnya 1,675.
GAMMAD = [1.675, 1.783, 1.833, 1.752, 1.720]
ZAV = [2.059, 1.951, 1.936, 1.781, 1.769]

r = js("hitung-kepadatan.js", "pemadatan", {"Gs": 2.678, "V": 920.89, "Mcetakan": 1714.9, "gammaW": 1, "orde": 2, "titik": titik})
benar("pemadatan: tanpa galat", not r.get("galat"))
hasil = {t["nama"]: t for t in r["titik"]}
for i, c in enumerate(CAWAN):
    t = hasil[c]
    cocok(f"pemadatan {c}: massa air", AIR[i], t["air"], 5e-3)
    cocok(f"pemadatan {c}: massa tanah kering", KERING[i], t["kering"], 5e-3)
    cocok(f"pemadatan {c}: kadar air", W[i], t["w"], 5e-4)
    cocok(f"pemadatan {c}: massa tanah basah", BASAH[i], t["basah"], 5e-2)
    cocok(f"pemadatan {c}: kepadatan basah γ", GAMMA[i], t["gamma"], 5e-4)
    cocok(f"pemadatan {c}: kepadatan kering γd", GAMMAD[i], t["gammaD"], 5e-4)
    cocok(f"pemadatan {c}: ZAV", ZAV[i], t["zav"], 5e-4)
    benar(f"pemadatan {c}: titik di bawah garis ZAV", t["gammaD"] < t["zav"])
# Titik optimum: laporan membaca dari grafik tangan (garis putus-putus di w ≈ 14 %, form hlm 3), tidak bisa
# diuji persis. Alat memakai puncak polinomial orde 2; angka di bawah ditulis di blok "Beda" halaman alat.
cocok("pemadatan: w_opt kurva orde 2 (ditulis di halaman: 15,62 %)", 15.62, r["wopt"], 5e-3)
cocok("pemadatan: γd maks kurva orde 2 (ditulis di halaman: 1,828)", 1.828, r["gdmaks"], 5e-4)
benar("pemadatan: w_opt di dalam rentang data", W[0] < r["wopt"] < W[-1])

# Data contoh di halaman alat = angka di atas (tanpa tambahan NIM lagi).
cp = re.search(r"var CP = \{ W1: \[([^\]]*)\], W2: \[([^\]]*)\], W3: \[([^\]]*)\],\s*Mtotal: \[([^\]]*)\]", SUMBER_ALAT)
benar("pemadatan: data contoh ditemukan di alat-kepadatan.js", cp is not None)
if cp:
    angka = [[float(x) for x in g.split(",")] for g in cp.groups()]
    benar("pemadatan: data contoh alat = angka laporan", angka == [W1, W2, W3, MT])
benar("pemadatan: param contoh Gs 2,678, cetakan 1.714,9 g, V 920,89 cm³",
      "Gs: 2.678, Mcetakan: 1714.9, V: 920.89" in SUMBER_ALAT)
# NIM: pemadatan menambah W1 dan W2 cawan (aturan asisten lab).
benar("pemadatan: nim menunjuk W1 dan W2 tabel titik", "tabel: { titik: ['W1', 'W2'] }" in SUMBER_ALAT)

# ---------------------------------------------------------------- sand cone (Sand Cone.pdf hlm 1–4)
kal = {"W1": 139.1, "W2": 7737.5, "W3": 5478, "W4": 8266, "W5": 6852}
tt = {"nama": "1", "W6": 8266, "W7": 6852, "W8": 8266, "W9": 5020, "W10": 8, "W11": 1732, "W12": 11.2, "W13": 62.2, "W14": 52.9}
s = js("hitung-kepadatan.js", "sandCone", {"kalibrasi": kal, "titik": [tt], "gammaLab": 1.830})
benar("sand cone: tanpa galat", not s.get("galat"))
a = s["titik"][0]
cocok("sand cone 1: berat pasir dalam kerucut A = W6 − W7 (hlm 31)", 1414, a["kerucut"], 0.5)
cocok("sand cone kalibrasi alat W6 = W4 − W5 (form)", 1414, s["alat"]["W6"], 0.5)
cocok("sand cone 2: berat tanah galian B (hlm 31)", 1724, a["Wt"], 0.5)
cocok("sand cone 3: kadar air C (hlm 32)", 22.302, a["w"], 5e-4)
# Langkah 4 laporan: 1.724 / (1 + 22,302) = 73,985 g, memakai angka persen. Yang benar 1.724 / 1,22302.
cocok("sand cone 4: angka laporan 73,985 berasal dari (1 + 22,302)", 73.985, 1724 / (1 + 22.302), 5e-4)
cocok("sand cone 4: berat kering D yang benar = 1.409,6 g", 1409.6, a["Wd"], 5e-2)
cocok("sand cone 5: pasir dalam kerucut + galian E (hlm 32)", 3246, a["total"], 0.5)
cocok("sand cone 6: pasir dalam galian F (hlm 32)", 1832, a["lubang"], 0.5)
# Form: W2 − W1 = 7.598,4 benar; W3 − W1 ditulis 5.328,9, seharusnya 5.338,9. γsand tetap 1,423.
cocok("sand cone kalibrasi pasir W2 − W1", 7598.4, s["kalibrasi"]["pasir"], 5e-2)
cocok("sand cone kalibrasi pasir W3 − W1 yang benar = 5.338,9", 5338.9, s["kalibrasi"]["air"], 5e-2)
cocok("sand cone γsand (form)", 1.423, s["gammaPasir"], 5e-4)
# Langkah 7 laporan: 1.832 / 1,423 (γsand dibulatkan) = 1.287,421; alat tanpa pembulatan = 1.287,227.
cocok("sand cone 7: angka laporan 1.287,421 berasal dari γsand 1,423", 1287.421, 1832 / 1.423, 5e-4)
cocok("sand cone 7: volume galian G (γsand tanpa pembulatan)", 1287.227, a["V"], 5e-4)
# Langkah 8–9 laporan: H = 0,0575 dan D = 0,0324/1,830 = 1,77 % keliru (akibat langkah 4).
cocok("sand cone 8: berat isi kering H yang benar = 1,095 g/cm³", 1.095, a["gammaD"], 5e-4)
cocok("sand cone γd lapangan rata-rata = titik 1", a["gammaD"], s["gammaD"], 1e-12)
cocok("sand cone 9: derajat kepadatan yang benar = 59,84 %", 59.84, s["D"], 5e-3)
benar("sand cone: D laporan 1,77 % tidak dipakai", abs(s["D"] - 1.77) > 1)

benar("sand cone: data contoh alat = angka form",
      "W4: 8266, W5: 6852, K3: 5478, K2: 7737.5, K1: 139.1, gammaLab: 1.830" in SUMBER_ALAT
      and "W6: 8266, W7: 6852, W8: 8266, W9: 5020, W10: 8, W11: 1732, W12: 11.2, W13: 62.2, W14: 52.9" in SUMBER_ALAT)
# Sand cone tanpa NIM: hanya satu objek nim (milik pemadatan) di berkas alat.
benar("sand cone: tanpa objek nim", SUMBER_ALAT.count("nim: {") == 1
      and SUMBER_ALAT.index("nim: {") < SUMBER_ALAT.index("if (jenis === 'sand-cone')"))
benar("sand cone: blok beda menyebut 1.409,6 g dan 1,77%", "1.409,6 g" in SUMBER_ALAT and "D = 1,77%" in SUMBER_ALAT)

print("\nSemua cocok." if not gagal else f"\n{gagal} pemeriksaan gagal.")
sys.exit(1 if gagal else 0)
