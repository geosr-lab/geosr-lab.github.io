"""Cocokkan alat kuat geser langsung dan kuat tekan bebas dengan contoh pengolahan data di laporan praktikum.

Data contoh di halaman alat (alat-kekuatan.js, tombol "Muat data contoh") dijalankan lewat node dengan
kerangka tiruan, lalu hasilnya dibandingkan dengan angka yang tertulis di PDF. Angka di laporan sudah termasuk
+0,34 dari NIM penulis, jadi data contoh tidak ditambah NIM lagi. Toleransi = setengah satuan digit terakhir
yang ditulis di laporan. Bila laporan salah hitung, yang diuji adalah angka yang benar dan perbedaannya dicatat
di komentar (catatan yang sama tampil di blok "Beda dengan contoh laporan" di halaman alat).

Berkas acuan (tidak disimpan di repo):
- Direct Shear Test.pdf hlm 1 (pengolahan data, halaman laporan 156) dan hlm 2 (form terisi)
- data direct shear.pdf hlm 1 (form data lab mentah, sebelum +0,34)
- UCS.pdf hlm 1 (pengolahan data, halaman laporan 148) dan hlm 2 (form terisi)
- data UCS.pdf hlm 1 (form data lab mentah)
- FORM_FIX_KOSONGAN_1.pdf: form kosong kuat tekan bebas dan kuat geser langsung

Jalankan dari akar repo:  python3 tests/verifikasi_contoh_laporan_b_kekuatan.py
"""
import json
import math
import subprocess
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
P = AKAR / "docs/assets/praktikum"
gagal = 0

# Kerangka tiruan: muat umum.js (format angka id-ID), hitung-kekuatan.js, dan alat-kekuatan.js; tangkap definisi alat
# dari Praktikum.pasang, susun masukan dari data contoh seperti kerangka.js, lalu jalankan hitung dan tampil.
HARNESS = r"""
const path = require('path'), dir = process.argv[1], jenis = process.argv[2], akar = process.argv[3];
global.window = global;
global.document = { getElementById: () => ({ dataset: { alat: jenis } }) };
require(path.join(akar, 'docs/assets/umum.js'));
global.Umum = window.Umum;
window.HitungKekuatan = require(path.join(dir, 'hitung-kekuatan.js'));
let def = null;
global.Praktikum = { pasang: d => { def = d; } };
global.Grafik = { plot: () => '' };
require(path.join(dir, 'alat-kekuatan.js'));
const angka = v => (v === '' || v === null || v === undefined) ? NaN : +v;
const m = { param: {}, tabel: {}, contoh: true };
def.parameter.forEach(p => { const v = def.contoh.param[p.id]; m.param[p.id] = p.pilihan ? v : angka(v); });
def.tabel.forEach(tb => {
  const data = def.contoh.tabel[tb.id] || [];
  if (tb.jenis === 'daftar') {
    const dinamis = tb.kolomDari ? (def.contoh.tabel[tb.kolomDari.tabel] || []).map((s, i) => tb.kolomDari.awalan + i) : [];
    m.tabel[tb.id] = [];
    data.forEach((b, i) => {
      const terisi = tb.kolom.filter(k => !k.kunci && isFinite(angka(b[k.id]))).length + dinamis.filter(k => isFinite(angka(b[k]))).length;
      if (!terisi) return;
      const o = { no: i + 1 };
      tb.kolom.forEach(k => { const v = angka(b[k.id]); o[k.id] = isFinite(v) ? v : null; });
      if (tb.kolomDari) o.nilai = dinamis.map(k => { const v = angka(b[k]); return isFinite(v) ? v : null; });
      m.tabel[tb.id].push(o);
    });
  } else {
    m.tabel[tb.id] = data.map(k => { const o = { nama: k.nama }; tb.baris.forEach(b => { o[b.id] = angka(k[b.id]); }); return o; });
  }
});
const r = def.hitung(m);
const U = { ringkasan: a => a.join(''), kartu: (a, b, c) => a + b + (c || ''), grafik: (g, k) => k || '',
  tabel: (kepala, baris) => kepala.map(k => k.teks || k).join('|') + '\n' + baris.map(b => b.join('|')).join('\n') + '\n',
  langkah: (j, isi) => j + '\n' + isi + '\n', rumus: s => s, t: Umum.t };
const html = def.tampil(m, r, U);
const nim = def.nim;
const kolom = {};
def.tabel.forEach(tb => { kolom[tb.id] = (tb.kolom && tb.kolom.map ? tb.kolom.map(k => k.id) : []).concat(tb.baris ? tb.baris.map(b => b.id) : []); });
console.log(JSON.stringify({ masukan: m, hasil: r, html: html, nim: nim, kolom: kolom, ekspor: def.ekspor(m, r) }));
"""


def alat(jenis):
    keluar = subprocess.check_output(["node", "-e", HARNESS, str(P), jenis, str(AKAR)], text=True, encoding="utf-8")
    return json.loads(keluar)


def cocok(nama, laporan, nilai, tol):
    global gagal
    if nilai is None or abs(laporan - nilai) > tol:
        gagal += 1
        print(f"GAGAL  {nama}: laporan={laporan!r} alat={nilai!r} (toleransi {tol})")


def benar(nama, kondisi):
    global gagal
    if not kondisi:
        gagal += 1
        print(f"GAGAL  {nama}")


# ================================================================ kuat geser langsung (Direct Shear Test.pdf)
G = alat("geser-langsung")
m, r = G["masukan"], G["hasil"]
benar("geser langsung: hitung tanpa galat", not r.get("galat"))

# Data contoh = form terisi hlm 2: dial reading tiap benda uji (sudah +0,34), P = 3,229 / 6,437 / 13,165 kg,
# luas 31,256 cm², kalibrasi proving ring 0,540. BU 3 baris ke-7 tertulis 19,64 di form laporan, tetapi gaya geser
# 10,444 kg = 19,34 × 0,540 dan data mentah (data direct shear.pdf) = 19 → 19,34; contoh memakai 19,34.
DIAL = [[1.84, 2.84, 4.34, 4.84, 5.84, 6.84, 7.34, 8.84, 9.34, 8.34],
        [2.64, 3.34, 5.34, 7.34, 8.34, 9.34, 10.34, 11.84, 10.34, None],
        [1.84, 2.84, 11.84, 14.34, 17.34, 17.84, 19.34, 20.34, 21.34, 21.34]]
# Data mentah (data direct shear.pdf hlm 1) + 0,34 harus sama dengan data contoh.
MENTAH = [[1.5, 2.5, 4, 4.5, 5.5, 6.5, 7, 8.5, 9, 8], [2.3, 3, 5, 7, 8, 9, 10, 11.5, 10, None], [1.5, 2.5, 11.5, 14, 17, 17.5, 19, 20, 21, 21]]
benar("geser langsung: dial laporan = data mentah + 0,34",
      all((a is None and b is None) or abs(a - (b + 0.34)) < 1e-9 for d, e in zip(DIAL, MENTAH) for a, b in zip(d, e)))
benar("geser langsung: data contoh alat = dial reading laporan",
      [[row["nilai"][j] for row in m["tabel"]["bacaan"]] for j in range(3)] == DIAL)
benar("geser langsung: penggeseran contoh 0,25 … 2,5", [row["geser"] for row in m["tabel"]["bacaan"]] == [0.25 * (k + 1) for k in range(10)])
benar("geser langsung: waktu contoh seperti form (0,25 … 2,30)",
      [row["waktu"] for row in m["tabel"]["bacaan"]] == [0.25, 0.5, 0.75, 1, 1.15, 1.30, 1.45, 2, 2.15, 2.30])
benar("geser langsung: gaya normal contoh 3,229 / 6,437 / 13,165 kg", [b["P"] for b in m["tabel"]["benda"]] == [3.229, 6.437, 13.165])
cocok("geser langsung: luas 31,256 cm² (hlm 1)", 31.256, r["A0"], 5e-4)
cocok("geser langsung: σ BU 1 = 0,103 kg/cm² (hlm 1)", 0.103, r["benda"][0]["sigma0"], 5e-4)
cocok("geser langsung: gaya geser 1,84 × 0,540 = 0,994 kg (hlm 1)", 0.994, r["benda"][0]["kurva"][0]["gaya"], 5e-4)
cocok("geser langsung: τ = 0,994 / 31,256 = 0,032 kg/cm² (hlm 1)", 0.032, r["benda"][0]["kurva"][0]["tau"], 5e-4)

# Form terisi hlm 2: gaya geser dan tegangan geser tiap baris.
GAYA = [[0.994, 1.534, 2.344, 2.614, 3.154, 3.694, 3.964, 4.774, 5.044, 4.504],
        [1.426, 1.804, 2.884, 3.964, 4.504, 5.044, 5.584, 6.394, 5.584],
        [0.994, 1.534, 6.394, 7.744, 9.364, 9.634, 10.444, 10.984, 11.524, 11.524]]
TAU = [[0.032, 0.049, 0.075, 0.084, 0.101, 0.118, 0.127, 0.153, 0.161, 0.144],
       [0.046, 0.058, 0.092, 0.127, 0.144, 0.161, 0.179, 0.205, 0.179],
       [0.032, 0.049, 0.205, 0.248, 0.300, 0.308, 0.334, 0.351, 0.369, 0.369]]
# Salah hitung di form laporan (diuji angka yang benar):
#   BU 1 baris ke-4: 2,614 / 31,256 = 0,0836 → 0,084; laporan menulis 0,085.
#   BU 2 baris ke-1: 1,426 / 31,256 = 0,0456 → 0,046; laporan menulis 0,040.
for j, b in enumerate(r["benda"]):
    benar(f"geser langsung BU {j + 1}: jumlah baris", len(b["kurva"]) == len(GAYA[j]))
    for k, (q, gy, tu) in enumerate(zip(b["kurva"], GAYA[j], TAU[j])):
        cocok(f"geser langsung BU {j + 1} baris {k + 1}: gaya geser", gy, q["gaya"], 5e-4)
        cocok(f"geser langsung BU {j + 1} baris {k + 1}: tegangan geser", tu, q["tau"], 5e-4)

# c dan φ: kotak hasil di form laporan kosong. Uji terhadap kuadrat terkecil τ puncak (hitung mandiri).
A = 31.256
sig = [P_ / A for P_ in (3.229, 6.437, 13.165)]
tau = [max(v for v in d if v is not None) * 0.54 / A for d in DIAL]
ms, mt = sum(sig) / 3, sum(tau) / 3
kem = sum((x - ms) * (y - mt) for x, y in zip(sig, tau)) / sum((x - ms) ** 2 for x in sig)
cocok("geser langsung: c (regresi τ puncak)", mt - kem * ms, r["c"], 1e-9)
cocok("geser langsung: φ (regresi τ puncak)", math.degrees(math.atan(kem)), r["phi"], 1e-9)
cocok("geser langsung: τ puncak BU 3 = 0,369", 0.369, r["benda"][2]["puncak"]["tau"], 5e-4)

# Kolom NIM: dial reading (pembacaan arloji gaya geser) semua benda uji, yaitu kolom dinamis tabel bacaan.
benar("geser langsung: nim menunjuk dial reading (kolom dinamis tabel bacaan)", G["nim"]["tabel"] == {"bacaan": ["*dinamis"]} and not G["nim"].get("param"))
benar("geser langsung: halaman memuat blok beda dan langkah a–d",
      all(s in G["html"] for s in ("Beda dengan contoh laporan", "a. Tegangan normal", "b. Gaya geser", "c. Tegangan geser", "d. Kohesi", "0{,}994", "31{,}256")))

# ================================================================ kuat tekan bebas (UCS.pdf)
T = alat("tekan-bebas")
m, r = T["masukan"], T["hasil"]
benar("UCS: hitung tanpa galat", not r.get("galat"))
benar("UCS: tanpa peringatan baris diabaikan pada data contoh", not any("diabaikan" in x for x in r.get("peringatan", [])))

# Data contoh = form terisi hlm 2. Pembacaan arloji deformasi 0 … 490, beban 1,84 … 6,74 (sudah +0,34),
# kolom beban baris waktu 0 kosong seperti di form. Diameter 3,5 cm, tinggi 6 cm, kalibrasi 0,0045 kg/divisi.
REG = [0, 35, 70, 140, 210, 280, 350, 420, 490]
BEB = [None, 1.84, 2.84, 4.34, 5.34, 6.24, 7.04, 7.44, 6.74]
benar("UCS: data contoh alat = form laporan", [(b["regangan"], b["beban"]) for b in m["tabel"]["bacaan"]] == list(zip(REG, BEB)))
benar("UCS: waktu contoh 0; 0,5; 1 … 7", [b["t"] for b in m["tabel"]["bacaan"]] == [0, 0.5, 1, 2, 3, 4, 5, 6, 7])
benar("UCS: param contoh diameter 3,5 cm, tinggi 6 cm, kalibrasi 0,0045 kg",
      m["param"]["diameter"] == 3.5 and m["param"]["tinggi"] == 6 and m["param"]["kalibrasi"] == 0.0045 and m["param"]["satuanBeban"] == "kg")
# Luas perawal laporan (hlm 1) = 3,14 × 17,5² = 961,6 mm² (tertulis "3,14 × 17,5"), ditulis di kotak cm² form.
# Alat memakai satuan form (cm²): contoh mengisi luas perawal 9,616 cm². π penuh memberi 9,621 cm².
cocok("UCS: luas perawal 961,6 mm² = 9,616 cm² (hlm 1)", 961.6 / 100, r["A0"], 5e-5)
cocok("UCS: luas perawal laporan = 3,14 × 17,5²", 961.6, 3.14 * 17.5 ** 2, 5e-2)

ti = r["titik"]
benar("UCS: baris waktu 0 tanpa beban jadi titik nol", ti[0]["kosong"] and ti[0]["P"] == 0 and not any(t["kosong"] for t in ti[1:]))
REGANGAN = [0, 0.58333, 1.16667, 2.33333, 3.5, 4.66667, 5.83333, 7, 8.16667]
for t, e in zip(ti, REGANGAN):
    cocok(f"UCS: regangan baris {t['regangan']:g}", e, t["eps"], 5e-6)
# Beban (kg) di form: 0,013 dan 0,032 ditulis 3 desimal, lainnya 5 desimal.
BEBAN = [(0.00828, 5e-6), (0.013, 5e-4), (0.01953, 5e-6), (0.02403, 5e-6), (0.02808, 5e-6), (0.032, 5e-4), (0.03348, 5e-6), (0.03033, 5e-6)]
for t, (b, tol) in zip(ti[1:], BEBAN):
    cocok(f"UCS: beban baris {t['regangan']:g}", b, t["P"], tol)
cocok("UCS: beban contoh hitungan 2,84 × 0,0045 = 0,013 (hlm 1)", 0.013, ti[2]["P"], 5e-4)
# Luas terkoreksi di form dalam m² (6 desimal) → cm²: × 10.000, toleransi 0,000001 m² / 2 = 0,005 cm².
LUAS = [0.000967, 0.000973, 0.000985, 0.000997, 0.001009, 0.001021, 0.001034, 0.001047]
for t, a in zip(ti[1:], LUAS):
    if t["regangan"] == 210:
        # 9,616 / 0,965 = 9,96477 cm² = 0,000996477 m² → 0,000996. Laporan membulatkan dua kali (0,0009965 → 0,000997);
        # 0,0009965 juga yang dipakai untuk tegangan 24,114 di bawah. Diuji angka yang benar.
        cocok("UCS: luas terkoreksi baris 210 (laporan 0,000997, benar 0,000996)", 9.96, t["A"], 0.005)
        benar("UCS: luas terkoreksi baris 210 laporan = pembulatan dua kali", round(round(t["A"], 3) + 1e-9, 2) == a * 1e4)
        continue
    cocok(f"UCS: luas terkoreksi baris {t['regangan']:g}", a * 1e4, t["A"], 0.005)
# Contoh hitungan hlm 1: dial reading 2,84, pembagi ditulis 0,99417 (regangan 0,58333% dari baris sebelumnya),
# tetapi hasil 0,000973 m² = A0 / (1 − 1,16667/100) dan tegangan 13,1353 sama dengan tabel form baris regangan 70.
# Alat memakai regangan dari baris yang sama (beda dicatat di halaman alat).
cocok("UCS: contoh hitungan luas terkoreksi 0,000973 m² (hlm 1)", 9.73, ti[2]["A"], 0.005)
cocok("UCS: contoh hitungan tegangan 13,1353 kg/m² (hlm 1)", 13.1353, ti[2]["sigma"] * 1e4, 5e-5)

# Tegangan di form dalam kg/m² (luas m²) → alat kg/cm² × 10.000.
# Baris 35, 70, 490 cocok langsung. Baris 140 … 420: laporan membulatkan luas terkoreksi ke 0,0000001 m² (0,001 cm²)
# sebelum membagi, sehingga digit terakhir bergeser. Yang diuji: (1) alat = nilai tanpa pembulatan, dan (2) angka
# laporan memang muncul dari luas yang dibulatkan, supaya penjelasan di halaman alat terbukti.
# Baris 490: laporan 28,9654, nilai benar 0,03033 / (9,616 / 0,918333) × 10.000 = 28,96532 → 28,9653 (diuji angka benar).
LANGSUNG = {35: (8.560, 5e-4), 70: (13.135, 5e-4), 490: (28.9653, 5e-5)}
BULAT = {140: (19.83, 19.836), 210: (24.114, 24.115), 280: (27.838, 27.839), 350: (31.022, 31.023), 420: (32.379, 32.380)}
for t in ti[1:]:
    s = t["sigma"] * 1e4
    if t["regangan"] in LANGSUNG:
        lap, tol = LANGSUNG[t["regangan"]]
        cocok(f"UCS: tegangan baris {t['regangan']:g}", lap, s, tol)
    else:
        lap, benar_ = BULAT[t["regangan"]]
        cocok(f"UCS: tegangan baris {t['regangan']:g} (tanpa pembulatan luas)", benar_, s, 5e-4)
        s_bulat = t["P"] / round(t["A"], 3) * 1e4
        if t["regangan"] == 140:  # ditulis 19,83 (dipotong dari 19,8355)
            benar("UCS: tegangan baris 140 laporan = 19,8355 dipotong", 19.83 <= s_bulat < 19.84)
        else:
            cocok(f"UCS: tegangan baris {t['regangan']:g} laporan dari luas dibulatkan", lap, s_bulat, 5e-4)

# Angka koreksi: form laporan menulis 1,000; 1,005; 1,010; 1,020; 1,031; 1,042; 1,053; 1,064; 1,075, yang tidak sama
# dengan 1/(1 − ε). Alat menulis 1/(1 − ε) (ASTM D2166), luas terkoreksi tetap A0/(1 − ε) seperti laporan.
for t in ti:
    cocok(f"UCS: angka koreksi baris {t['regangan']:g} = 1/(1 − ε)", 1 / (1 - t["eps"] / 100), t["koreksi"], 1e-12)

# qu: form dan laporan tidak menulis qu. Uji terhadap tegangan puncak (regangan ≤ 15 %, ASTM D2166) hitung mandiri.
puncak = max(b * 0.0045 * (1 - r_ * 0.01 / 60) / 9.616 for r_, b in zip(REG[1:], BEB[1:]))
cocok("UCS: qu = tegangan puncak (kg/cm²)", puncak, r["qu"], 1e-12)
cocok("UCS: qu puncak pada regangan 7 %", 7, r["epsQu"], 1e-9)
cocok("UCS: cu = qu/2", puncak / 2, r["cu"], 1e-12)
cocok("UCS: qu dalam kPa (1 kg/cm² = 98,0665 kPa)", puncak * 98.0665, r["quKPa"], 1e-9)

# Kolom NIM: pembacaan arloji beban saja.
benar("UCS: nim menunjuk kolom arloji beban", T["nim"]["tabel"] == {"bacaan": ["beban"]} and "beban" in T["kolom"]["bacaan"] and not T["nim"].get("param"))
benar("UCS: halaman memuat blok beda dan langkah a–d",
      all(s in T["html"] for s in ("Beda dengan contoh laporan", "a. Beban", "b. Luas terkoreksi", "c. Tegangan", "d. Kuat tekan bebas", "2{,}84", "0{,}0013135")))
benar("UCS: luas perawal dari form ditulis di langkah", "Luas perawal diambil dari form lab" in T["html"])

# Baris tanpa beban selain baris nol diabaikan (form lab mentah sudah mengisi regangan sampai 840).
x = json.loads(subprocess.check_output(["node", "-e", "const H=require(process.argv[1]);console.log(JSON.stringify(H.tekanBebas(JSON.parse(process.argv[2]))))",
                                        str(P / "hitung-kekuatan.js"), json.dumps({"diameter": 3.5, "tinggi": 6, "satuanRegangan": 0.01, "satuanBeban": "kg", "kalibrasi": 0.0045,
                                                                                    "bacaan": [{"regangan": a_, "beban": b_} for a_, b_ in zip(REG + [560, 630], BEB + [None, None])]})], text=True))
benar("UCS: baris tanpa beban di akhir diabaikan dengan peringatan", len(x["titik"]) == 9 and any("2 baris" in p for p in x["peringatan"]))

print("\nSemua cocok." if not gagal else f"\n{gagal} pemeriksaan gagal.")
sys.exit(1 if gagal else 0)
