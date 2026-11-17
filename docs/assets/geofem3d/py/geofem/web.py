"""Titik masuk versi web (dijalankan di browser lewat Pyodide oleh halaman GeoSR).

hitung(json_proyek, kerapatan, progres) -> str JSON berisi permukaan model (sudah dicerminkan
bila simetri), perpindahan dan nilai per fase, kurva, dan ringkasan. Tanpa gmsh dan tanpa GUI.
"""
from __future__ import annotations

import json

import numpy as np

from . import fem
from .mesh_terstruktur import generate
from .project import Project
from .solver import run_analysis

NAMA_FASE = {"Initial": "Fase 0 - Tegangan awal (K0)", "Load": "Fase 1 - Beban pondasi",
             "Safety": "Fase 2 - Angka keamanan (reduksi φ-c)"}


def _permukaan(elems):
    """Muka batas (segitiga sudut) beserta elemen pemiliknya."""
    tri = np.concatenate([elems[:, [a, b, c]] for (a, b, c) in fem.FACES])
    own = np.tile(np.arange(len(elems)), len(fem.FACES))
    _, inv, cnt = np.unique(np.sort(tri, axis=1), axis=0, return_inverse=True, return_counts=True)
    luar = cnt[inv.ravel()] == 1
    return tri[luar], own[luar]


def hitung(json_proyek: str, kerapatan: str = "kasar", progres=None) -> str:
    p = Project.from_dict(json.loads(json_proyek))
    err = p.validate()
    if err:
        return json.dumps({"galat": err})
    if progres:
        progres(0.01, "Membuat jaring")
    p.domain.symmetry = True                        # versi web selalu menghitung seperempat model
    mesh = generate(p, kerapatan)
    res = run_analysis(p, mesh, progress=progres)

    tol = 1e-6 * mesh.geom.size
    tri, own = _permukaan(mesh.elems)
    X = mesh.nodes[tri]
    di_x0 = np.all(np.abs(X[:, :, 0]) < tol, 1)
    di_y0 = np.all(np.abs(X[:, :, 1]) < tol, 1)
    sudut = np.unique(tri)                                   # hanya titik sudut yang dikirim
    peta = np.full(len(mesh.nodes), -1, np.intp)
    peta[sudut] = np.arange(len(sudut))
    xyz, tri = mesh.nodes[sudut], peta[tri]
    n = len(xyz)
    cermin = [(1, 1), (-1, 1), (1, -1), (-1, -1)]

    def susun(pilih, salinan):
        """Segitiga dan elemen pemilik untuk salinan cermin 0..salinan-1."""
        t_, o_ = [], []
        for k, (sx, sy) in enumerate(cermin[:salinan]):
            t = tri[pilih] + k * n
            t_.append(t if sx * sy > 0 else t[:, [0, 2, 1]])     # cermin membalik orientasi
            o_.append(own[pilih])
        return np.concatenate(t_), np.concatenate(o_)

    tri_utuh, own_utuh = susun(~di_x0 & ~di_y0, 4)          # model utuh
    tri_ptg, own_ptg = susun(~di_x0, 2)                      # potongan di bidang y = 0 (x-z)

    def cerminkan(v):
        return np.concatenate([v * np.array([sx, sy, 1.0]) for sx, sy in cermin])

    fase = []
    for ph in res.phases:
        szz = -ph.sig[..., 2].mean(1)                                   # efektif, tekan positif
        plast = ph.plastic.mean(1)
        fase.append({"nama": NAMA_FASE.get(ph.name, ph.name), "kode": ph.name, "ok": bool(ph.ok),
                     "pesan": ph.message, "u": np.round(cerminkan(ph.u[sudut]) * 1000, 4).ravel().tolist(),
                     "du": np.round(cerminkan(ph.du[sudut]) * 1000, 4).ravel().tolist(),
                     "szz": np.round(szz[own_utuh], 2).tolist(), "plastis": np.round(plast[own_utuh], 3).tolist(),
                     "szz_p": np.round(szz[own_ptg], 2).tolist(), "plastis_p": np.round(plast[own_ptg], 3).tolist(),
                     "kurva": ph.curve})
    load = res.phase("Load")
    return json.dumps({
        "titik": np.round(cerminkan(xyz), 4).ravel().tolist(),
        "segitiga": tri_utuh.ravel().tolist(),
        "segitiga_potong": tri_ptg.ravel().tolist(),
        "warna_lapisan": [p.material(l.material).color for l in p.borehole.layers],
        "fase": fase,
        "ringkasan": {"penurunan_pondasi_mm": res.footing_settlement * 1000,
                      "penurunan_maks_mm": res.max_settlement * 1000,
                      "beban_tercapai_kPa": load.load_fraction * p.footing.q if load else 0.0,
                      "q_kPa": p.footing.q, "titik_plastis": int(load.plastic.sum()) if load else 0,
                      "SF": res.safety_factor, "waktu_s": res.run_time,
                      "jaring": {"titik_nodal": mesh.n_nodes, "elemen": mesh.n_elems, "kerapatan": kerapatan}},
        "log": res.log,
    })
