"""Verifikasi kalkulator korelasi parameter tanah dari N-SPT.

Sumber: Warman (2019), Kumpulan Korelasi Parameter Geoteknik dan Fondasi, Kementerian PUPR,
Bab 4 hlm. 43–50. Buku itu tidak memuat contoh soal, jadi status alat tetap "sekunder" dan
uji ini terdiri dari:
1. Nilai jangkar dari tabel dan rumus buku: titik Tabel 4.6 (α' Stroud), batas Tabel 4.1 (CR),
   batas CN ≤ 1,70, φ Hatanaka–Uchida pada (N1)60 = 20 → 40°, E/Pa Kulhawy–Mayne.
2. Hitungan ditulis ulang di Python dan dibandingkan dengan JavaScript.
3. Uji sifat: hasil naik bila N naik, CN turun bila tegangan efektif naik.

Jalankan dari akar repo:  python3 tests/verifikasi_korelasi_spt.py
"""
import json
import math
import subprocess
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
JS = AKAR / "docs/assets/korelasi-spt-hitung.js"
PA, GW = 101.3, 9.81


def js(skrip_tubuh, data):
    skrip = ("const t=require(process.argv[1]);const d=JSON.parse(process.argv[2]);"
             "console.log(JSON.stringify(" + skrip_tubuh + "))")
    return json.loads(subprocess.check_output(["node", "-e", skrip, str(JS), json.dumps(data)], text=True))


def hitung_python(m):
    if m.get("adaMAT") and m["dw"] < m["z"]:
        sv = m["gamma"] * m["dw"] + (m["gammaSat"] - GW) * (m["z"] - m["dw"])
    else:
        sv = m["gamma"] * m["z"]
    cr = 0.75 if m["batang"] < 3 else 0.8 if m["batang"] < 4 else 0.85 if m["batang"] < 6 else 0.95 if m["batang"] < 10 else 1.0
    cb = {"65-115": 1.0, "150": 1.05, "200": 1.15}[m["bor"]]
    N60 = m["NM"] * m["Ef"] / 60 * cb * cr * m["CS"]
    CN = min(2.2 / (1.2 + sv / PA), 1.7)
    r = {"sv": sv, "N60": N60, "CN": CN, "N160": CN * N60}
    a, b = {"pasir": (80.6, 0.331), "lempung": (80.2, 0.292)}[m["tanah"]]
    r["vs"] = a * N60 ** b
    if m["tanah"] == "pasir":
        r["Dr"] = 25 * sv ** -0.12 * N60 ** 0.46
        r["phiMeyerhof"] = 28 + 0.15 * r["Dr"]
        r["phiHatanaka"] = math.sqrt(20 * r["N160"]) + 20
    else:
        tabel = [(15, 0.068), (20, 0.055), (25, 0.048), (30, 0.045), (40, 0.044), (60, 0.043)]
        PI = min(max(m["PI"], 15), 60)
        for (p0, a0), (p1, a1) in zip(tabel, tabel[1:]):
            if p0 <= PI <= p1:
                alfa = a0 + (a1 - a0) * (PI - p0) / (p1 - p0)
                break
        r["cu"] = alfa * N60 * PA
    return r


DASAR = {"tanah": "pasir", "NM": 15, "Ef": 60, "bor": "65-115", "batang": 8, "CS": 1.0, "z": 5, "gamma": 18,
         "adaMAT": False, "dw": 2, "gammaSat": 20, "PI": 25}


def main():
    gagal = 0

    def periksa(nama, nilai, acuan, tol=1e-6):
        nonlocal gagal
        ok = abs(nilai - acuan) <= tol * max(1, abs(acuan))
        gagal += not ok
        print(f"  {'cocok ' if ok else 'GAGAL '} {nama}: {nilai:.4f} (acuan {acuan})")

    print("Nilai jangkar dari Warman (2019)")
    alfa = js("d.map(p=>t.alfaStroud(p))", [15, 20, 25, 30, 40, 60, 22.5])
    for PI, a, acuan in zip([15, 20, 25, 30, 40, 60, 22.5], alfa, [0.068, 0.055, 0.048, 0.045, 0.044, 0.043, 0.0515]):
        periksa(f"α' Tabel 4.6, PI = {PI}", a, acuan)
    cr = js("d.map(L=>t.faktorCR(L))", [2.9, 3, 3.9, 4, 5.9, 6, 9.9, 10, 30, 40])
    for L, c, acuan in zip([2.9, 3, 3.9, 4, 5.9, 6, 9.9, 10, 30, 40], cr, [0.75, 0.8, 0.8, 0.85, 0.85, 0.95, 0.95, 1.0, 1.0, 1.0]):
        periksa(f"CR Tabel 4.1, panjang batang {L} m", c, acuan)
    r = js("t.hitung(d)", dict(DASAR, z=0.5))
    periksa("CN dibatasi 1,70 pada σ'vo kecil (hlm. 44)", r["CN"], 1.7)
    # (N1)60 = 20 → φ = √400 + 20 = 40° (Hatanaka dan Uchida, hlm. 46): pilih σ'vo = 101,3 kPa → CN = 1
    r = js("t.hitung(d)", dict(DASAR, NM=20, z=101.3 / 18, batang=12))
    periksa("CN = 1 pada σ'vo = Pa", r["CN"], 1.0)
    periksa("φ Hatanaka–Uchida pada (N1)60 = 20", r["phiHatanaka"], 40.0)
    periksa("E/Pa = 10 N60 (pasir NC, hlm. 47) dalam kPa", r["E"]["nc"], 10 * 20 * PA)
    r = js("t.hitung(d)", dict(DASAR, tanah="lempung", NM=10, PI=20, batang=12))
    periksa("cu/Pa = 0,055 N60 pada PI = 20 (hlm. 48) dalam kPa", r["cu"], 0.055 * 10 * PA)

    kasus = []
    for tanah in ("pasir", "lempung"):
        for NM in (3, 8, 15, 32, 55):
            for z, batang, adaMAT in ((1.5, 2, False), (4, 5, True), (12, 13, True), (25, 26, False)):
                kasus.append(dict(DASAR, tanah=tanah, NM=NM, z=z, batang=batang, adaMAT=adaMAT, Ef=75, bor="150", CS=1.1, PI=33))
    hasil = js("d.map(m=>t.hitung(m))", kasus)
    beda = 0
    for m, rj in zip(kasus, hasil):
        for k, v in hitung_python(m).items():
            if abs(rj[k] - v) > 1e-9 * max(1, abs(v)):
                beda += 1
                print(f"GAGAL  {m['tanah']} NM={m['NM']} z={m['z']}: {k} js={rj[k]} python={v}")
    gagal += beda
    print(f"Python vs JS: {len(kasus) - beda}/{len(kasus)} kasus cocok")

    sifat = 0
    deret = js("d.map(m=>t.hitung(m))", [dict(DASAR, NM=n) for n in (2, 5, 10, 20, 40)])
    for k in ("N60", "N160", "Dr", "phiMeyerhof", "phiHatanaka", "vs"):
        nilai = [x[k] for x in deret]
        if any(b <= a for a, b in zip(nilai, nilai[1:])):
            sifat += 1
            print(f"GAGAL  {k} tidak naik saat N naik: {nilai}")
    deret = js("d.map(m=>t.hitung(m))", [dict(DASAR, z=z, batang=12) for z in (2, 5, 10, 20)])
    if any(b["CN"] > a["CN"] for a, b in zip(deret, deret[1:])):
        sifat += 1
        print("GAGAL  CN naik saat tegangan efektif naik")
    if not js("t.hitung(d)", dict(DASAR, NM=0)).get("galat"):
        sifat += 1
        print("GAGAL  N = 0 tidak ditolak")
    gagal += sifat
    print("Uji sifat: " + ("lulus" if not sifat else f"{sifat} gagal"))

    print("\nSemua cocok." if not gagal else f"\n{gagal} pemeriksaan gagal.")
    sys.exit(1 if gagal else 0)


if __name__ == "__main__":
    main()
