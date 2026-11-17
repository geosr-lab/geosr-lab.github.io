"""Mesh generation with the gmsh Python API (10-node tetrahedra).

The soil domain is a box made of one slab per borehole layer (plus a cut at the water
table so that no element straddles it). The footing rectangle is imprinted on the ground
surface and a Box size-field refines the mesh under the footing.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from . import fem
from .project import Project


@dataclass
class Geometry:
    xmin: float
    xmax: float
    ymin: float
    ymax: float
    zmin: float
    zmax: float
    fx0: float
    fx1: float
    fy0: float
    fy1: float
    levels: list            # slab boundaries, descending

    @property
    def size(self):
        return max(self.xmax - self.xmin, self.ymax - self.ymin, self.zmax - self.zmin)


@dataclass
class Mesh:
    nodes: np.ndarray       # (N,3)
    elems: np.ndarray       # (E,10) gmsh tet10 ordering
    elem_layer: np.ndarray  # (E,) index into borehole layers
    geom: Geometry

    @property
    def n_nodes(self):
        return len(self.nodes)

    @property
    def n_elems(self):
        return len(self.elems)


def project_geometry(p: Project) -> Geometry:
    d, f = p.domain, p.footing
    if d.symmetry:
        xmin, xmax, ymin, ymax = 0.0, d.Lx / 2, 0.0, d.Ly / 2
        fx0, fx1, fy0, fy1 = 0.0, f.B / 2, 0.0, f.L / 2
    else:
        xmin, xmax, ymin, ymax = -d.Lx / 2, d.Lx / 2, -d.Ly / 2, d.Ly / 2
        fx0, fx1, fy0, fy1 = -f.B / 2, f.B / 2, -f.L / 2, f.L / 2
    zt, zb = p.ground_level, p.bottom_level
    levels = [l.top for l in p.borehole.layers] + [zb]
    wl = p.borehole.water_level
    if zb + 1e-6 < wl < zt - 1e-6 and all(abs(wl - z) > 1e-3 for z in levels):
        levels.append(wl)
    levels = sorted(set(levels), reverse=True)
    return Geometry(xmin, xmax, ymin, ymax, zb, zt, fx0, fx1, fy0, fy1, levels)


def generate_mesh(p: Project, log=None) -> Mesh:
    import gmsh

    g = project_geometry(p)
    ms = p.mesh
    bsize = max(p.footing.B, p.footing.L)
    gmsh.initialize(interruptible=False)
    try:
        gmsh.option.setNumber("General.Terminal", 0)
        gmsh.model.add("geofem3d")
        occ = gmsh.model.occ
        vols = []
        for zt, zb in zip(g.levels[:-1], g.levels[1:]):
            vols.append((3, occ.addBox(g.xmin, g.ymin, zb, g.xmax - g.xmin, g.ymax - g.ymin, zt - zb)))
        tools = []
        full_x = (g.fx0 <= g.xmin + 1e-9) and (g.fx1 >= g.xmax - 1e-9)
        full_y = (g.fy0 <= g.ymin + 1e-9) and (g.fy1 >= g.ymax - 1e-9)
        if not (full_x and full_y):
            tools.append((2, occ.addRectangle(g.fx0, g.fy0, g.zmax, g.fx1 - g.fx0, g.fy1 - g.fy0)))
        if len(vols) > 1 or tools:
            occ.fragment(vols, tools)
        occ.synchronize()

        fine = min(ms.fine, ms.coarse)
        fld = gmsh.model.mesh.field
        box = fld.add("Box")
        margin = ms.refine_margin * bsize
        fld.setNumber(box, "VIn", fine)
        fld.setNumber(box, "VOut", ms.coarse)
        fld.setNumber(box, "XMin", g.fx0 - margin)
        fld.setNumber(box, "XMax", g.fx1 + margin)
        fld.setNumber(box, "YMin", g.fy0 - margin)
        fld.setNumber(box, "YMax", g.fy1 + margin)
        fld.setNumber(box, "ZMin", g.zmax - ms.refine_depth * bsize)
        fld.setNumber(box, "ZMax", g.zmax + 1.0)
        fld.setNumber(box, "Thickness", max(ms.coarse, 2.0 * bsize))
        fld.setAsBackgroundMesh(box)
        gmsh.option.setNumber("Mesh.MeshSizeExtendFromBoundary", 0)
        gmsh.option.setNumber("Mesh.MeshSizeFromPoints", 0)
        gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 0)
        gmsh.option.setNumber("Mesh.Algorithm3D", 1)
        gmsh.option.setNumber("Mesh.Optimize", 1)
        gmsh.option.setNumber("Mesh.SecondOrderLinear", 1)
        gmsh.model.mesh.generate(3)
        gmsh.model.mesh.setOrder(2)

        tags, coords, _ = gmsh.model.mesh.getNodes()
        _, enodes = gmsh.model.mesh.getElementsByType(11)
    finally:
        gmsh.finalize()

    coords = np.asarray(coords).reshape(-1, 3)
    tags = np.asarray(tags, np.intp)
    enodes = np.asarray(enodes, np.intp).reshape(-1, 10)
    lookup = np.full(tags.max() + 1, -1, np.intp)
    lookup[tags] = np.arange(len(tags))
    elems = lookup[enodes]
    used = np.unique(elems)
    remap = np.full(len(tags), -1, np.intp)
    remap[used] = np.arange(len(used))
    nodes = coords[used]
    elems = remap[elems]
    elems = fem.fix_orientation(nodes, elems)
    mesh = Mesh(nodes, elems, assign_layers(p, nodes, elems), g)
    if log:
        log(f"Mesh: {mesh.n_nodes} nodes, {mesh.n_elems} 10-node tetrahedra")
    return mesh


def assign_layers(p: Project, nodes, elems):
    zc = nodes[elems[:, :4], 2].mean(1)
    lay = np.zeros(len(elems), np.intp)
    for i, l in enumerate(p.borehole.layers):
        lay[(zc <= l.top + 1e-9) & (zc >= l.bottom - 1e-9)] = i
    return lay


def structured_box_mesh(lx, ly, lz, nx, ny, nz, origin=(0.0, 0.0, 0.0)):
    """Simple structured tet10 mesh of a box (each hexahedron split into 6 tetrahedra).
    Used by the tests; z of the top face is origin[2] + lz."""
    ox, oy, oz = origin
    # quadratic grid: (2n+1) points per direction
    xs = np.linspace(ox, ox + lx, 2 * nx + 1)
    ys = np.linspace(oy, oy + ly, 2 * ny + 1)
    zs = np.linspace(oz, oz + lz, 2 * nz + 1)
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
    nodes = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
    NY, NZ = len(ys), len(zs)

    def nid(i, j, k):
        return (i * NY + j) * NZ + k

    # Kuhn split of a cube into 6 tets sharing the main diagonal (0,0,0)-(1,1,1)
    cube = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]])
    tets = [(0, 1, 3, 7), (0, 1, 5, 7), (0, 2, 3, 7), (0, 2, 6, 7), (0, 4, 5, 7), (0, 4, 6, 7)]
    elems = []
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                for t in tets:
                    c = [2 * np.array([i, j, k]) + 2 * cube[v] for v in t]
                    corner = [nid(*cc) for cc in c]
                    mids = []
                    for (a, b) in fem.EDGES:
                        m = (c[a] + c[b]) // 2
                        mids.append(nid(*m))
                    elems.append(corner + mids)
    elems = np.array(elems, np.intp)
    used = np.unique(elems)
    remap = np.full(len(nodes), -1, np.intp)
    remap[used] = np.arange(len(used))
    nodes = nodes[used]
    elems = fem.fix_orientation(nodes, remap[elems])
    return nodes, elems
