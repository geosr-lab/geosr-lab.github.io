"""Cocokkan alat praktikum grup A dengan contoh pengolahan data di laporan praktikum (PDF bahan Defsa).

Modul hitung dijalankan lewat node dengan data contoh laporan (angka sudah termasuk +0,34 NIM penulis),
lalu dibandingkan dengan angka hasil yang tertulis di PDF. Toleransi = setengah satuan digit terakhir
yang ditulis di laporan. Bila laporan salah hitung, yang diuji adalah angka yang benar dan perbedaannya
dicatat di komentar (catatan yang sama tampil di halaman alat).

Berkas acuan (tidak disimpan di repo):
- Water Content Test.pdf hlm 47–50 (kadar air)
- Specific Gravity Test.pdf hlm 56–59 (berat spesifik, ρw tabel lab 27 °C dan 28 °C)
- Liquid Limit Test.pdf hlm 66–69, Plastic Limit Test.pdf hlm 75–76 (Atterberg)
- Sieve Analysis.pdf hlm 89–97 (analisa saringan)
- Hydrometer Analysis.pdf hlm 104–109 (hidrometer)
- Foto WhatsApp 2026-11-07 19.28.12 (permeabilitas tinggi tekan tetap)

Jalankan dari akar repo:  python3 tests/verifikasi_contoh_laporan_a.py
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
    return json.loads(subprocess.check_output(["node", "-e", skrip, str(P / modul), fungsi, json.dumps(arg)], text=True))


def cocok(nama, laporan, alat, tol):
    global gagal
    if alat is None or abs(laporan - alat) > tol:
        gagal += 1
        print(f"GAGAL  {nama}: laporan={laporan!r} alat={alat!r} (toleransi {tol})")


def cocok_potong(nama, laporan, alat, satuan):
    """Laporan memotong (bukan membulatkan) angka, mis. 0,7727 ditulis 0,772."""
    global gagal
    if alat is None or not (laporan - 1e-12 <= alat < laporan + satuan):
        gagal += 1
        print(f"GAGAL  {nama}: laporan={laporan!r} alat={alat!r} (dipotong ke {satuan})")


def benar(nama, kondisi):
    global gagal
    if not kondisi:
        gagal += 1
        print(f"GAGAL  {nama}")


# ---------------------------------------------------------------- kadar air (Water Content Test.pdf hlm 47–50)
r = js("hitung-sifat-fisik.js", "kadarAir", {"cawan": [{"nama": "R", "W1": 45.64, "W2": 37.24, "W3": 10.8},
                                                      {"nama": "B", "W1": 49.24, "W2": 40.64, "W3": 11.3}]})
for c, (air, kering, w) in zip(r["cawan"], ((8.4, 26.44, 31.770), (8.6, 29.34, 29.312))):
    cocok(f"kadar air cawan {c['nama']}: berat air", air, c["air"], 5e-4)
    cocok(f"kadar air cawan {c['nama']}: berat tanah kering", kering, c["kering"], 5e-4)
    cocok(f"kadar air cawan {c['nama']}: w", w, c["w"], 5e-4)
cocok("kadar air tak terganggu rata-rata (hlm 49)", 30.541, r["w"], 5e-4)
# Tanah terganggu, cawan B: W1 = 70,8 + 0,34 = 71,14; W2 = 65,3 + 0,34 = 65,64 (hlm 47–48), cawan G dari form hlm 50.
r = js("hitung-sifat-fisik.js", "kadarAir", {"cawan": [{"nama": "B", "W1": 71.14, "W2": 65.64, "W3": 11.1},
                                                      {"nama": "G", "W1": 65.24, "W2": 60.44, "W3": 11.1}]})
cocok("kadar air terganggu cawan B", 10.084, r["cawan"][0]["w"], 5e-4)
cocok("kadar air terganggu cawan G", 9.728, r["cawan"][1]["w"], 5e-4)
cocok("kadar air terganggu rata-rata", 9.906, r["w"], 5e-4)

# ---------------------------------------------------------------- berat spesifik (Specific Gravity Test.pdf hlm 56–59)
cocok("ρw 27,5 °C interpolasi tabel lab (hlm 57–58: 0,996405)", 0.996405, js("hitung-sifat-fisik.js", "massaJenisAirLab", 27.5), 5e-7)
benar("ρw tabel lab di luar 27–28 °C ditolak", js("hitung-sifat-fisik.js", "massaJenisAirLab", 25) is None)
uji = [{"nama": "A", "W1": 40.6, "W2": 56.04, "W3": 151.84, "W4": 142.3, "T": 27},
       {"nama": "B", "W1": 42.7, "W2": 58.04, "W3": 152.14, "W4": 142.4, "T": 27}]
r = js("hitung-sifat-fisik.js", "beratSpesifik", {"uji": uji, "Tacuan": 27.5, "sumberRho": "lab"})
for u, (Ws, air, GT, G) in zip(r["uji"], ((15.44, 5.9, 2.617, 2.617), (15.34, 5.6, 2.739, 2.740))):
    cocok(f"berat spesifik {u['nama']}: berat tanah", Ws, u["Ws"], 5e-3)
    cocok(f"berat spesifik {u['nama']}: berat air", air, u["pembagi"], 5e-2)
    cocok(f"berat spesifik {u['nama']}: Gs pada 27 °C", GT, u["GT"], 5e-4)
    cocok(f"berat spesifik {u['nama']}: G pada 27,5 °C (form hlm 59)", G, u["G"], 5e-4)
    cocok(f"berat spesifik {u['nama']}: ρw 27 °C tabel lab", 0.9965451, u["rhoT"], 1e-9)
cocok("berat spesifik rata-rata (form hlm 59: 2,678)", 2.678, r["G"], 5e-4)
benar("berat spesifik: suhu acuan 20 °C dengan tabel lab ditolak",
      js("hitung-sifat-fisik.js", "beratSpesifik", {"uji": uji, "Tacuan": 20, "sumberRho": "lab"})["galat"])

# ---------------------------------------------------------------- Atterberg (Liquid Limit Test.pdf hlm 66–69, Plastic Limit Test.pdf hlm 75–76)
ll = [{"nama": "A", "N": 20, "W1": 21.9, "W2": 19.48, "W3": 11}, {"nama": "B", "N": 25, "W1": 20.54, "W2": 18.64, "W3": 11.2},
      {"nama": "C", "N": 28, "W1": 21.84, "W2": 19.84, "W3": 11}, {"nama": "D", "N": 33, "W1": 25.24, "W2": 22.44, "W3": 11.1}]
pl = [{"nama": "D", "W1": 26.34, "W2": 24.64, "W3": 11}, {"nama": "2", "W1": 26.64, "W2": 24.64, "W3": 11.3}]
r = js("hitung-atterberg.js", "hitung", {"ll": ll, "pl": pl, "metodeLL": "banyak", "skalaN": "log", "eksponen": 0.121})
for t, (air, kering, w) in zip(r["titikLL"], ((2.42, 8.48, 28.538), (1.9, 7.44, 25.538), (2.0, 8.84, 22.624), (2.8, 11.34, 24.691))):
    cocok(f"batas cair cawan {t['nama']}: berat air", air, t["air"], 5e-3)
    cocok(f"batas cair cawan {t['nama']}: berat tanah kering", kering, t["kering"], 5e-3)
    cocok(f"batas cair cawan {t['nama']}: kadar air", w, t["w"], 5e-4)
for t, w in zip(r["titikPL"], (12.463, 14.993)):
    cocok(f"batas plastis cawan {t['nama']}: kadar air", w, t["w"], 5e-4)
cocok("batas plastis PL (hlm 76: 13,728)", 13.728, r["PL"], 5e-4)


# LL contoh = 26,313% dibaca dari garis tangan; titik tidak segaris. Alat memakai garis kuadrat terkecil
# (dihitung ulang di sini tanpa modul JS) — beda ini tertulis di halaman alat.
def ll_regresi(xs, ys, x25):
    n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    return my + b * (x25 - mx)


ws = [t["w"] for t in r["titikLL"]]
cocok("LL regresi log N (laporan 26,313 dibaca dari grafik)", ll_regresi([math.log10(t["N"]) for t in ll], ws, math.log10(25)), r["LL"], 1e-9)
benar("LL alat berbeda dari bacaan grafik contoh (catatan beda tampil di halaman)", abs(r["LL"] - 26.313) > 0.3)
r2 = js("hitung-atterberg.js", "hitung", {"ll": ll, "pl": pl, "metodeLL": "banyak", "skalaN": "linier", "eksponen": 0.121})
cocok("LL regresi N linier (sumbu grafik form)", ll_regresi([t["N"] for t in ll], ws, 25), r2["LL"], 1e-9)
cocok("PI = LL − PL", r["LL"] - 13.727923428, r["IP"], 1e-6)

# ---------------------------------------------------------------- saringan (Sieve Analysis.pdf hlm 89–97, sampel terganggu 500 gram)
ayk = [("No. 4", 0.34), ("No. 10", 14.14), ("No. 40", 115.84), ("No. 200", 312.84), ("PAN", 56.84)]
r = js("hitung-saringan.js", "hitung", {"beratTotal": 500, "D10baca": 0.081, "D30baca": 0.130, "D60baca": 0.270,
                                        "ayakan": [{"nama": n, "tertahan": v} for n, v in ayk]})
for a, (kum, ttr, lls) in zip(r["ayakan"], ((0.34, 0.068, 99.932), (14.48, 2.896, 97.104), (130.32, 26.064, 73.936), (443.16, 88.632, 11.368))):
    cocok(f"saringan {a['nama']}: jumlah berat tertahan", kum, a["kumulatif"], 5e-3)
    cocok(f"saringan {a['nama']}: persen tertahan (langkah tulisan tangan)", ttr, a["persenTertahan"], 5e-4)
    cocok(f"saringan {a['nama']}: persen lolos", lls, a["lolos"], 5e-4)
cocok("saringan PAN: jumlah berat tertahan = 500", 500, r["jumlah"], 1e-9)
cocok("saringan PAN: persen tertahan 100", 100, r["panPersen"], 1e-9)
cocok("saringan Cu (hlm 91: 3,333)", 3.333, r["Cu"], 5e-4)
cocok_potong("saringan Cc (hlm 92: 0,772, dipotong)", 0.772, r["Cc"], 1e-3)
benar("saringan: D10 baca 0,081 mm diperingatkan (lolos No. 200 masih 11,37%)", any("D10 baca" in p for p in r["peringatan"]))
# Sampel tak terganggu 300 gram (hlm 92–94): langkah tulisan tangan 0,113 / 0,358 / 98,30 tertahan.
# 1,08 / 300 × 100 = 0,360 (laporan menulis 0,358: salah hitung), jadi yang diuji 0,360.
r = js("hitung-saringan.js", "hitung", {"beratTotal": 300, "D10baca": 0.081, "D30baca": 0.150, "D60baca": 0.260,
                                        "ayakan": [{"nama": n, "tertahan": v} for n, v in (("No. 10", 0.34), ("No. 40", 0.74), ("No. 200", 293.84), ("PAN", 5.08))]})
for a, ttr in zip(r["ayakan"], (0.113, 0.360, 98.307)):
    cocok(f"saringan 300 g {a['nama']}: persen tertahan", ttr, a["persenTertahan"], 5e-4)
cocok_potong("saringan 300 g Cu (hlm 94: 3,20, dipotong)", 3.20, r["Cu"], 1e-2)
cocok_potong("saringan 300 g Cc (hlm 94: 1,06, dipotong)", 1.06, r["Cc"], 1e-2)

# ---------------------------------------------------------------- hidrometer (Hydrometer Analysis.pdf hlm 104–109)
Rh = [54.34, 55.34, 56.34, 57.34, 57.54, 52.34, 51.34, 50.34, 39.34, 28.34, 27.34, 26.34]
t = [0.5, 1, 2, 4, 8, 15, 30, 60, 240, 480, 1440, 2880]
dasar = {"W": 100, "Gs": 2.678, "caraA": "tabel", "caraLK": "tabel", "kurva": "form", "F10": 100, "Cm": 0, "Cd": 0, "batasLempung": 0.002,
         "ayakan": [{"nama": n, "tertahan": v} for n, v in (("No. 10", 0), ("No. 40", 2.04), ("No. 200", 58.64))]}
r = js("hitung-hidrometer.js", "hitung", dict(dasar, bacaan=[{"no": i + 1, "t": tt, "R": R, "T": 27, "k": -0.5} for i, (tt, R) in enumerate(zip(t, Rh))]))
# Tabel atas form (hlm 108): jumlah tertahan 2,04 dan 60,68; lolos 97,96 dan 39,32.
for a, (kum, lls) in zip(r["ayakan"], ((0, 100), (2.04, 97.96), (60.68, 39.32))):
    cocok(f"hidrometer saringan {a['nama']}: jumlah tertahan", kum, a["kumulatif"], 5e-3)
    cocok(f"hidrometer saringan {a['nama']}: lolos", lls, a["lolos"], 5e-3)
# L hasil interpolasi Tabel 2 (contoh menulisnya dalam mm): baris yang dihitung benar di contoh.
Lcontoh = {54.34: 73.66, 55.34: 72.32, 56.34: 70.66, 51.34: 78.66, 50.34: 80.32, 27.34: 118.32}
for b in r["bacaan"]:
    if b["R"] in Lcontoh:
        cocok(f"hidrometer Rh {b['R']}: L (contoh dalam mm ÷ 10)", Lcontoh[b["R"]] / 10, b["L"], 5e-4)
    cocok(f"hidrometer Rh {b['R']}: Rh + k", round(b["R"] - 0.5, 2), b["Rc"], 1e-9)
    cocok(f"hidrometer Rh {b['R']}: N = (Rh + k) c / Ws × 100", (b["R"] - 0.5) * r["a"] / 100 * 100, b["P"], 1e-9)
    cocok(f"hidrometer Rh {b['R']}: N′ = N × lolos No. 200 / 100", b["P"] * 39.32 / 100, b["Nform"], 1e-6)
b0 = r["bacaan"][0]
# K dan c di contoh diinterpolasi dengan selisih Gs 0,02 (seakan Gs = 2,67): K = 0,012504 (hlm 105); c seharusnya 0,996 (contoh menulis 0,96).
cocok("hidrometer K tabel pada Gs 2,67 (= nilai contoh 0,012504)", 0.012504, js("hitung-hidrometer.js", "konstantaKTabel", 27, 2.67), 5e-7)
cocok("hidrometer c tabel pada Gs 2,67 (langkah contoh, sebelum salah hitung)", 0.996, js("hitung-hidrometer.js", "faktorATabel", 2.67), 1e-9)
cocok("hidrometer K tabel pada Gs 2,678 (alat)", 0.01258 + 0.56 * (0.01239 - 0.01258), b0["K"], 1e-9)
cocok("hidrometer c tabel pada Gs 2,678 (alat)", 1 - 0.56 * 0.01, r["a"], 1e-9)
# Satuan: dengan K dan L contoh, D alat (L cm, t menit) × √(10/60) = D contoh (L mm, t detik) = 0,0196 mm.
rk = js("hitung-hidrometer.js", "hitung", dict(dasar, bacaan=[{"no": 1, "t": 0.5, "R": 54.34, "T": 27, "k": -0.5, "K": 0.012504, "L": 7.366}]))
cocok("hidrometer (L/t)^½ contoh = √(73,66/30) = 1,567", 1.567, rk["bacaan"][0]["akar"] * math.sqrt(10 / 60), 5e-4)
cocok("hidrometer D contoh 0,0196 mm hanya beda satuan", 0.0196, rk["bacaan"][0]["D"] * math.sqrt(10 / 60), 5e-5)
cocok("hidrometer D alat = K √(L/t), L cm, t menit", 0.012504 * math.sqrt(7.366 / 0.5), rk["bacaan"][0]["D"], 1e-12)
# N contoh memakai c = 0,96: 53,84 × 0,96 = 51,686 (hlm 106); dengan c manual 0,96 alat memberi angka yang sama.
rc = js("hitung-hidrometer.js", "hitung", dict(dasar, a=0.96, bacaan=[{"no": 1, "t": 0.5, "R": 54.34, "T": 27, "k": -0.5}]))
cocok("hidrometer N dengan c = 0,96 (contoh 51,686)", 51.686, rc["bacaan"][0]["P"], 5e-4)
benar("hidrometer: kurva bawaan form memakai N′", r["kurva"] == "form" and all(abs(x["lolos"] - b["Nform"]) < 1e-9 for x, b in
                                                              zip([x for x in r["titik"] if x["asal"] == "hidrometer"], sorted(r["bacaan"], key=lambda b: -b["D"]))))

# ---------------------------------------------------------------- klasifikasi dari angka contoh laporan (saringan + Atterberg)
u = js("hitung-klasifikasi.js", "uscs", {"P4": 99.932, "P200": 11.368, "D10": 0.081, "D30": 0.130, "D60": 0.270, "LL": 26.313, "PL": 13.728, "NP": False})
benar(f"klasifikasi USCS contoh laporan = SP-SC (alat {u.get('simbol')})", u.get("simbol") == "SP-SC")
a = js("hitung-klasifikasi.js", "aashto", {"P10": 97.104, "P40": 73.936, "P200": 11.368, "LL": 26.313, "PL": 13.728, "NP": False})
benar(f"klasifikasi AASHTO contoh laporan = A-2-6 (alat {a.get('kelompok')})", a.get("kelompok") == "A-2-6")

# ---------------------------------------------------------------- permeabilitas tinggi tekan tetap (foto WhatsApp 2026-11-07)
r = js("hitung-permeabilitas.js", "tetap", {"D": 6.4, "L": 6, "uji": [{"nama": "1", "h": 70, "Q": 99, "t": 30}, {"nama": "2", "h": 70, "Q": 105, "t": 30},
                                                                      {"nama": "3", "h": 70, "Q": 96, "t": 30}]})
cocok("permeabilitas k1 (foto: 0,0088 cm/s)", 0.0088, r["uji"][0]["k"], 5e-5)

print("\nSemua cocok." if not gagal else f"\n{gagal} pemeriksaan gagal.")
sys.exit(1 if gagal else 0)
