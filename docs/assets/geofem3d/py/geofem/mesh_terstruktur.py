"""Jaring terstruktur tet-10 tanpa gmsh (dipakai versi web di browser lewat Pyodide).

Kotak tanah dibagi garis-garis grid: rapat di bawah pondasi, makin renggang menjauhi pondasi
dan makin dalam. Garis selalu jatuh di tepi pondasi, batas lapisan, dan muka air tanah, sehingga
beban pondasi dan pembagian lapisan tepat. Tiap balok dibagi 6 tetrahedron (pembagian Kuhn
dengan diagonal yang sama di semua balok, jadi jaringnya konform).
"""
from __future__ import annotations

import numpy as np

from . import fem
from .mesher import Mesh, assign_layers, project_geometry
from .project import Project

KERAPATAN = {"kasar": (0.45, 3.0), "sedang": (0.30, 2.2), "halus": (0.20, 1.6)}  # (h_halus/B, h_kasar/B)


def _garis(titik_wajib, h_of):
    """Koordinat grid naik dari titik_wajib[0] ke [-1]; semua titik wajib ikut, jarak antar titik
    mengikuti h_of(x)."""
    out = [titik_wajib[0]]
    for a, b in zip(titik_wajib[:-1], titik_wajib[1:]):
        x = a
        seg = []
        while True:
            h = h_of(x)
            if x + 1.5 * h >= b:
                break
            x += h
            seg.append(x)
        # bagi rata segmen [a, b] dengan jumlah pias yang sama supaya transisi halus
        n = len(seg) + 1
        out += list(np.linspace(a, b, n + 1)[1:])
    return np.array(out)


def tet10_grid(xs, ys, zs):
    """Jaring tet-10 dari grid tidak seragam (xs, ys, zs naik)."""
    def tengah(v):
        g = np.empty(2 * len(v) - 1)
        g[0::2] = v
        g[1::2] = 0.5 * (v[:-1] + v[1:])
        return g

    X, Y, Z = np.meshgrid(tengah(xs), tengah(ys), tengah(zs), indexing="ij")
    nodes = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
    NY, NZ = 2 * len(ys) - 1, 2 * len(zs) - 1
    cube = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]])
    tets = [(0, 1, 3, 7), (0, 1, 5, 7), (0, 2, 3, 7), (0, 2, 6, 7), (0, 4, 5, 7), (0, 4, 6, 7)]
    I, J, K = np.meshgrid(np.arange(len(xs) - 1), np.arange(len(ys) - 1), np.arange(len(zs) - 1), indexing="ij")
    base = 2 * np.stack([I.ravel(), J.ravel(), K.ravel()], 1)                    # (H,3)
    elems = []
    for t in tets:
        c = [base + 2 * cube[v] for v in t]
        cols = [c[k] for k in range(4)] + [(c[a] + c[b]) // 2 for a, b in fem.EDGES]
        elems.append(np.stack([(q[:, 0] * NY + q[:, 1]) * NZ + q[:, 2] for q in cols], 1))
    elems = np.concatenate(elems)
    used = np.unique(elems)
    remap = np.full(len(nodes), -1, np.intp)
    remap[used] = np.arange(len(used))
    nodes = nodes[used]
    return nodes, fem.fix_orientation(nodes, remap[elems])


def generate(p: Project, kerapatan: str = "sedang") -> Mesh:
    g = project_geometry(p)
    b = max(p.footing.B, p.footing.L)
    hf, hc = (k * b for k in KERAPATAN[kerapatan])

    def h_horizontal(x, x_tepi):
        d = max(0.0, abs(x) - x_tepi)
        return min(hc, hf + 0.35 * d)

    def wajib(lo, hi, tepi):
        pts = [lo, hi] + [s * tepi for s in (-1, 1) if lo < s * tepi < hi] + ([0.0] if lo < 0 < hi else [])
        return sorted(set(round(v, 9) for v in pts))

    xs = _garis(wajib(g.xmin, g.xmax, p.footing.B / 2), lambda x: h_horizontal(x, p.footing.B / 2))
    ys = _garis(wajib(g.ymin, g.ymax, p.footing.L / 2), lambda y: h_horizontal(y, p.footing.L / 2))
    zs_turun = _garis([-z for z in g.levels], lambda d: min(hc, hf + 0.3 * max(0.0, d - g.levels[0] * -1)))
    zs = np.sort(-zs_turun)
    nodes, elems = tet10_grid(xs, ys, zs)
    return Mesh(nodes, elems, assign_layers(p, nodes, elems), g)
