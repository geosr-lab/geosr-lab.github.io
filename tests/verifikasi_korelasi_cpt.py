"""Verifikasi kalkulator korelasi parameter tanah dari sondir (CPT).

Sumber: Warman (2019), Kumpulan Korelasi Parameter Geoteknik dan Fondasi, Kementerian PUPR,
Bab 5 hlm. 53–61. Buku tidak memuat contoh soal, jadi status alat "sekunder" dan uji ini berisi:
1. Nilai jangkar: Dr Baldi = 0 tepat saat qc = C0 (σ'vo)^0,55; batas Tabel 5.1 dan 5.2;
   OCR Mayne–Kemper dan k(qc − σv)/σ'v pada titik yang dihitung tangan.
2. Hitungan ditulis ulang di Python dan dibandingkan dengan JavaScript.
3. Uji sifat: Dr, cu, vs naik bila qc naik; CR turun bila qc naik.

Jalankan dari akar repo:  python3 tests/verifikasi_korelasi_cpt.py
"""
import json
import math
import subprocess
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
JS = AKAR / "docs/assets/korelasi-cpt-hitung.js"
KG, GW = 98.0665, 9.81


def js(daftar):
    skrip = "const t=require(process.argv[1]);console.log(JSON.stringify(JSON.parse(process.argv[2]).map(m=>t.hitung(m))))"
    return json.loads(subprocess.check_output(["node", "-e", skrip, str(JS), json.dumps(daftar)], text=True, encoding="utf-8"))


def hitung_python(m):
    if m["adaMAT"] and m["dw"] < m["z"]:
        sv = m["gamma"] * m["dw"] + m["gammaSat"] * (m["z"] - m["dw"])
        s_ef = sv - GW * (m["z"] - m["dw"])
    else:
        sv = s_ef = m["gamma"] * m["z"]
    qc = m["qc"] * KG
    r = {"sv": sv, "svEf": s_ef, "Rf": m["fs"] / m["qc"] * 100, "N": m["qc"] / 4}
    if m["tanah"] == "pasir":
        r["Dr"] = math.log(qc / (157 * s_ef ** 0.55)) / 2.41
    else:
        qn = qc - sv
        r.update(cu=qn / m["Nc"], St=m["Ns"] / r["Rf"], ocrK=m["k"] * qn / s_ef,
                 ocrMK=0.37 * (qn / s_ef) ** 1.01, CR=2.3 * m["beta"] * s_ef / qc, vs=1.75 * qc ** 0.627)
    return r


DASAR = {"tanah": "pasir", "qc": 80, "fs": 0.8, "z": 6, "gamma": 18, "adaMAT": True, "dw": 2, "gammaSat": 19.5,
         "Nc": 15, "Ns": 7.5, "k": 0.33, "beta": 0.6}


def main():
    gagal = 0

    def periksa(nama, nilai, acuan, tol=1e-6):
        nonlocal gagal
        ok = abs(nilai - acuan) <= tol * max(1, abs(acuan))
        gagal += not ok
        print(f"  {'cocok ' if ok else 'GAGAL '} {nama}: {nilai:.5g} (acuan {acuan:.5g})")

    print("Nilai jangkar dari Warman (2019)")
    # Dr = 0 bila qc = C0 (σ'vo)^0,55 (hlm. 55–56); σ'vo = 18 × 5 = 90 kPa
    qc0 = 157 * 90 ** 0.55 / KG
    r = js([dict(DASAR, adaMAT=False, z=5, qc=qc0)])[0]
    periksa("Dr Baldi = 0 pada qc = C0 σ'vo^0,55", r["Dr"], 0.0, 1e-9)
    # Batas Tabel 5.1 dan 5.2 (qc dalam MPa → kg/cm² = MPa × 1000 / 98,0665)
    for mpa, kepadatan, phi in ((1.99, "sangat lepas", "29–32"), (2.01, "lepas", "29–32"), (4.01, "padat sedang", "32–35"),
                                (12.01, "padat", "37–40"), (20.01, "sangat padat", "40–42")):
        r = js([dict(DASAR, qc=mpa * 1000 / KG)])[0]
        ok = r["meyerhof"][1] == kepadatan and r["bergdahl"][2] == phi
        gagal += not ok
        print(f"  {'cocok ' if ok else 'GAGAL '} qc = {mpa} MPa: Tabel 5.1 {r['meyerhof'][1]}, Tabel 5.2 φ' {r['bergdahl'][2]}")
    # Lempung tanpa MAT: z = 5, γ = 18 → σv = σ'v = 90 kPa; qc = 10 kg/cm² = 980,665 kPa → qn = 890,665
    r = js([dict(DASAR, tanah="lempung", adaMAT=False, z=5, qc=10, fs=0.3)])[0]
    qn = 10 * KG - 90
    periksa("cu = qn/15 (hlm. 57)", r["cu"], qn / 15)
    periksa("OCR = 0,33 qn/σ'v (hlm. 58)", r["ocrK"], 0.33 * qn / 90)
    periksa("OCR Mayne–Kemper (hlm. 58)", r["ocrMK"], 0.37 * (qn / 90) ** 1.01)
    periksa("St = 7,5/Rf, Rf = 3 % (hlm. 57)", r["St"], 2.5)
    periksa("vs Mayne–Rix (hlm. 59)", r["vs"], 1.75 * (10 * KG) ** 0.627)

    kasus = []
    for tanah in ("pasir", "lempung"):
        for qc in (6, 15, 40, 120, 250):
            for z, adaMAT in ((2, False), (5, True), (12, True), (20, False)):
                kasus.append(dict(DASAR, tanah=tanah, qc=qc, fs=qc * 0.025, z=z, adaMAT=adaMAT))
    beda, dihitung = 0, 0
    for m, rj in zip(kasus, js(kasus)):
        if rj["galat"]:
            continue
        dihitung += 1
        for k, v in hitung_python(m).items():
            if abs(rj[k] - v) > 1e-9 * max(1, abs(v)):
                beda += 1
                print(f"GAGAL  {m['tanah']} qc={m['qc']} z={m['z']}: {k} js={rj[k]} python={v}")
    gagal += beda
    print(f"Python vs JS: {dihitung - beda}/{dihitung} kasus cocok ({len(kasus) - dihitung} kasus ditolak karena qc < σvo)")

    sifat = 0
    ps = [r["Dr"] for r in js([dict(DASAR, qc=q) for q in (20, 50, 100, 200)])]
    lp = js([dict(DASAR, tanah="lempung", qc=q, fs=0.3) for q in (10, 20, 40, 80)])
    if any(b <= a for a, b in zip(ps, ps[1:])):
        sifat += 1
        print(f"GAGAL  Dr tidak naik saat qc naik: {ps}")
    for k, naik in (("cu", True), ("vs", True), ("CR", False)):
        nilai = [r[k] for r in lp]
        if any((b <= a) if naik else (b >= a) for a, b in zip(nilai, nilai[1:])):
            sifat += 1
            print(f"GAGAL  {k} tidak {'naik' if naik else 'turun'} saat qc naik: {nilai}")
    if not js([dict(DASAR, tanah="lempung", qc=0.5, z=10)])[0]["galat"]:
        sifat += 1
        print("GAGAL  qc < σvo pada lempung tidak ditolak")
    gagal += sifat
    print("Uji sifat: " + ("lulus" if not sifat else f"{sifat} gagal"))

    print("\nSemua cocok." if not gagal else f"\n{gagal} pemeriksaan gagal.")
    sys.exit(1 if gagal else 0)


if __name__ == "__main__":
    main()
