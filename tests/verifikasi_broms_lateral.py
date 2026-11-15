"""Verifikasi kalkulator kapasitas lateral tiang metode Broms.

1. CONTOH-BUKU: contoh hitungan di Reese, L. C. (1986), Behavior of Piles and Pile Groups
   Under Lateral Load, FHWA-RD-85-106, Bab 7.1, hlm. 142–155. Tiang pipa baja b = 1 ft,
   e = 2 ft, My = 317 ft-kip; lempung cu = 1 ksf; pasir φ = 34°, γ' = 55 pcf.
   Satuan contoh (ft, kip) dipakai langsung karena rumus tidak bergantung satuan.
2. Hitungan ditulis ulang di Python dengan cara penyelesaian sendiri (kuadrat diselesaikan
   dari persamaan kesetimbangan, bukan disalin dari JS) dan dibandingkan dengan JavaScript.
3. Uji sifat: Pult tidak turun bila L, cu, atau φ naik; kepala terjepit ≥ kepala bebas.

Jalankan dari akar repo:  python3 tests/verifikasi_broms_lateral.py
"""
import json
import math
import subprocess
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
JS = AKAR / "docs/assets/broms-lateral-hitung.js"


def hitung_js(daftar):
    skrip = ("const h=require(process.argv[1]);const d=JSON.parse(process.argv[2]);"
             "console.log(JSON.stringify(d.map(m=>{const r=h.hitung(m);return r.galat.length?{galat:r.galat}:"
             "{P:r.Pult,moda:r.menentukan.moda,M:r.menentukan.M,f:r.menentukan.f||null,batas:r.peralihan.map(x=>[x.dari,x.ke,x.L,x.P])}})))")
    return json.loads(subprocess.check_output(["node", "-e", skrip, str(JS), json.dumps(daftar)], text=True))


def akar_naik(fn, hi):
    lo = 0.0
    while fn(hi) < 0:
        hi *= 2
    for _ in range(200):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if fn(mid) < 0 else (lo, mid)
    return (lo + hi) / 2


def hitung_python(m):
    """Moda yang menentukan dan Pult; persamaan kesetimbangan diselesaikan dengan bisection pada P."""
    b, e, My, L = m["b"], m["e"], m["My"], m["L"]
    kand = {}
    if m["tanah"] == "kohesif":
        k = 9 * m["cu"] * b

        def sisa_bebas_pendek(P):  # Mmax dari atas (7.3) dikurangi Mmax dari bawah (7.4); g dari (7.5)
            f = P / k
            g = L - 1.5 * b - f
            return P * (e + 1.5 * b + 0.5 * f) - (2.25 * m["cu"] * b * g * g if g > 0 else 0) if g > 0 else 1

        def sisa_menengah(P):  # (7.7) dikurangi (7.8)
            f = P / k
            g = L - 1.5 * b - f
            return P * (1.5 * b + 0.5 * f) - My - 2.25 * m["cu"] * b * g * g if g > 0 else 1

        if L > 1.5 * b:
            if m["kepala"] == "bebas":
                kand["pendek"] = akar_naik(sisa_bebas_pendek, k * (L - 1.5 * b))
            else:
                kand["pendek"] = k * (L - 1.5 * b)
                P = akar_naik(sisa_menengah, k * (L - 1.5 * b))
                if L - 1.5 * b - P / k >= -1e-9:
                    kand["menengah"] = P
        if m["kepala"] == "bebas":
            kand["panjang"] = akar_naik(lambda P: P * (e + 1.5 * b + 0.5 * P / k) - My, 1.0)
        else:
            kand["panjang"] = akar_naik(lambda P: P * (1.5 * b + 0.5 * P / k) - 2 * My, 1.0)
    else:
        G = m["gamma"] * b * math.tan(math.radians(45 + m["phi"] / 2)) ** 2
        if m["kepala"] == "bebas":
            kand["pendek"] = G * L ** 3 / (2 * (e + L))
            kand["panjang"] = akar_naik(lambda P: P * (e + 0.544 * math.sqrt(P / G)) - My, 1.0)
        else:
            kand["pendek"] = 1.5 * G * L * L
            kand["menengah"] = My / L + 0.5 * G * L * L
            kand["panjang"] = akar_naik(lambda P: P * (e + 0.544 * math.sqrt(P / G)) - 2 * My, 1.0)
    moda = min(kand, key=kand.get)
    return {"P": kand[moda], "moda": moda}


LEMPUNG = {"tanah": "kohesif", "b": 1, "e": 2, "cu": 1, "My": 317, "FS": 1}
PASIR = {"tanah": "nonkohesif", "b": 1, "e": 2, "gamma": 0.055, "phi": 34, "My": 317, "FS": 1}

# CONTOH-BUKU: (nama, masukan, Pult acuan, moda, nilai lain) dari Reese (1986) hlm. 142–155
CONTOH = [
    ("hlm. 142, lempung, kepala bebas, pendek (L = 8 ft)", dict(LEMPUNG, kepala="bebas", L=8), 13.4, "pendek", {"M": 57.0}),
    ("hlm. 144, lempung, kepala bebas, panjang", dict(LEMPUNG, kepala="bebas", L=40), 50.3, "panjang", {}),
    ("hlm. 147, lempung, kepala terjepit, panjang", dict(LEMPUNG, kepala="terjepit", L=40), 94.2, "panjang", {}),
    ("hlm. 151, pasir, kepala bebas, pendek (L = 8 ft)", dict(PASIR, kepala="bebas", L=8), 4.98, "pendek", {"M": 23.7, "f": 4.13}),
    ("hlm. 153, pasir, kepala bebas, panjang", dict(PASIR, kepala="bebas", L=40), 34.36, "panjang", {}),
    ("hlm. 155, pasir, kepala terjepit, panjang", dict(PASIR, kepala="terjepit", L=40), 56.4, "panjang", {}),
]
# Panjang peralihan antarmoda di contoh sumber: (nama, masukan, [(L acuan, Pult acuan), ...])
PERALIHAN = [
    ("hlm. 145, lempung, kepala bebas", dict(LEMPUNG, kepala="bebas", L=10), [(19.0, 50.3)]),
    ("hlm. 147, lempung, kepala terjepit", dict(LEMPUNG, kepala="terjepit", L=10), [(8.53, 63.2), (23.83, 94.2)]),
    ("hlm. 154, pasir, kepala bebas", dict(PASIR, kepala="bebas", L=10), [(19.7, 34.36)]),
    ("hlm. 155, pasir, kepala terjepit", dict(PASIR, kepala="terjepit", L=10), [(11.77, 40.4), (20.5, 56.4)]),
]
TOL = 0.012  # sumber membulatkan Kp = 3,54 dan P ke 3 angka penting


def dekat(a, b):
    return abs(a - b) <= TOL * abs(b)


def main():
    gagal = 0

    print("CONTOH-BUKU  Reese (1986) FHWA-RD-85-106, Bab 7.1")
    js = hitung_js([c[1] for c in CONTOH])
    for (nama, m, P, moda, lain), r in zip(CONTOH, js):
        ok = dekat(r["P"], P) and r["moda"] == moda and all(dekat(r[k], v) for k, v in lain.items())
        gagal += not ok
        print(f"  {'cocok ' if ok else 'GAGAL '} {nama}: Pult = {r['P']:.2f} (acuan {P}), moda {r['moda']}"
              + "".join(f", {k} = {r[k]:.2f} (acuan {v})" for k, v in lain.items()))

    js = hitung_js([c[1] for c in PERALIHAN])
    for (nama, _, acuan), r in zip(PERALIHAN, js):
        batas = r["batas"]
        ok = len(batas) == len(acuan) and all(dekat(x[2], La) and dekat(x[3], Pa) for x, (La, Pa) in zip(batas, acuan))
        gagal += not ok
        print(f"  {'cocok ' if ok else 'GAGAL '} peralihan {nama}: "
              + ", ".join(f"{x[0]}→{x[1]} L = {x[2]:.2f}, P = {x[3]:.1f}" for x in batas)
              + " (acuan " + ", ".join(f"L = {La}, P = {Pa}" for La, Pa in acuan) + ")")

    # Python dan JS untuk banyak kasus (satuan SI)
    kasus = []
    for tanah in ("kohesif", "nonkohesif"):
        for kepala in ("bebas", "terjepit"):
            for L in (2, 4, 6, 9, 12, 18, 25):
                kasus.append({"tanah": tanah, "kepala": kepala, "b": 0.6, "L": L, "e": 0.5, "cu": 40,
                              "gamma": 18, "phi": 32, "My": 450, "FS": 2.5})
    js = hitung_js(kasus)
    beda = 0
    for m, r in zip(kasus, js):
        py = hitung_python(m)
        if "galat" in r or not dekat(r["P"], py["P"]) or (abs(r["P"] - py["P"]) > 1e-6 * py["P"] and r["moda"] != py["moda"]):
            beda += 1
            print(f"GAGAL  {m['tanah']} {m['kepala']} L={m['L']}: js={r} python={py}")
    gagal += beda
    print(f"Python vs JS: {len(kasus) - beda}/{len(kasus)} kasus cocok")

    # Uji sifat
    def P(m):
        return hitung_js([m])[0]["P"]

    sifat = 0
    for dasar in (dict(kasus[0]), dict(kasus[-1])):
        for tanah in ("kohesif", "nonkohesif"):
            for kepala in ("bebas", "terjepit"):
                m = dict(dasar, tanah=tanah, kepala=kepala)
                deret = hitung_js([dict(m, L=L) for L in (1.5, 3, 6, 10, 15, 30)])
                nilai = [d["P"] for d in deret if "P" in d]
                if any(b < a - 1e-9 for a, b in zip(nilai, nilai[1:])):
                    sifat += 1
                    print(f"GAGAL  Pult turun saat L naik ({tanah}, {kepala}): {nilai}")
    for tanah in ("kohesif", "nonkohesif"):
        m = dict(kasus[0], tanah=tanah, L=8)
        if P(dict(m, kepala="terjepit")) < P(dict(m, kepala="bebas")) - 1e-9:
            sifat += 1
            print(f"GAGAL  kepala terjepit < kepala bebas ({tanah})")
    m = dict(kasus[0], kepala="bebas", L=8)
    if P(dict(m, cu=60)) < P(dict(m, cu=40)) or P(dict(m, tanah="nonkohesif", phi=36)) < P(dict(m, tanah="nonkohesif", phi=30)):
        sifat += 1
        print("GAGAL  Pult turun saat cu atau φ naik")
    if "galat" not in hitung_js([dict(kasus[0], L=0.8)])[0]:
        sifat += 1
        print("GAGAL  L ≤ 1,5b di tanah kohesif tidak ditolak")
    gagal += sifat
    print("Uji sifat: " + ("lulus" if not sifat else f"{sifat} gagal"))

    print("\nSemua cocok." if not gagal else f"\n{gagal} pemeriksaan gagal.")
    sys.exit(1 if gagal else 0)


if __name__ == "__main__":
    main()
