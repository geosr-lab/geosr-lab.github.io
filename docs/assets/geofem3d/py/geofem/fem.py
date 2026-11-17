"""10-node tetrahedral finite elements (quadratic displacement), vectorised with NumPy.

Node numbering follows gmsh (element type 11):
    corners 0..3, mid-side nodes 4:(0,1) 5:(1,2) 6:(2,0) 7:(3,0) 8:(3,2) 9:(3,1)
Integration: 4-point Gauss rule (exact for the stiffness of straight-sided elements).
DOF numbering: node-major, 3 per node (ux, uy, uz).
"""
from __future__ import annotations

import numpy as np
import scipy.sparse as sp

EDGES = [(0, 1), (1, 2), (2, 0), (3, 0), (3, 2), (3, 1)]
EDGE_NODE = {frozenset(e): 4 + k for k, e in enumerate(EDGES)}
FACES = [(0, 2, 1), (0, 1, 3), (1, 2, 3), (0, 3, 2)]   # corner triplets of the 4 faces

_A, _B = 0.5854101966249685, 0.1381966011250105
GAUSS_PTS = np.array([[_B, _B, _B], [_A, _B, _B], [_B, _A, _B], [_B, _B, _A]])
GAUSS_W = np.full(4, 1.0 / 24.0)
NGP = 4

# VTK quadratic tetra uses edges (0,1),(1,2),(2,0),(0,3),(1,3),(2,3)
GMSH_TO_VTK_TET10 = [0, 1, 2, 3, 4, 5, 6, 7, 9, 8]


def shape_tet10(xi):
    """Shape functions N (n,10) and natural derivatives dN (n,3,10) at points xi (n,3)."""
    xi = np.atleast_2d(np.asarray(xi, float))
    x, y, z = xi[:, 0], xi[:, 1], xi[:, 2]
    L = np.stack([1 - x - y - z, x, y, z], axis=1)
    dL = np.array([[-1.0, 1, 0, 0], [-1.0, 0, 1, 0], [-1.0, 0, 0, 1]])
    n = len(xi)
    N = np.empty((n, 10))
    dN = np.empty((n, 3, 10))
    for i in range(4):
        N[:, i] = L[:, i] * (2 * L[:, i] - 1)
        dN[:, :, i] = (4 * L[:, i] - 1)[:, None] * dL[:, i][None, :]
    for k, (a, b) in enumerate(EDGES):
        N[:, 4 + k] = 4 * L[:, a] * L[:, b]
        dN[:, :, 4 + k] = 4 * (L[:, b][:, None] * dL[:, a][None, :] + L[:, a][:, None] * dL[:, b][None, :])
    return N, dN


N_GP, DN_GP = shape_tet10(GAUSS_PTS)


def fix_orientation(nodes, elems):
    """Make all tetrahedra positively oriented (swap corners 1 and 2 where needed)."""
    X = nodes[elems[:, :4]]
    v = np.einsum("ij,ij->i", np.cross(X[:, 1] - X[:, 0], X[:, 2] - X[:, 0]), X[:, 3] - X[:, 0])
    neg = v < 0
    if neg.any():
        elems = elems.copy()
        elems[neg] = elems[neg][:, [0, 2, 1, 3, 6, 5, 4, 7, 9, 8]]
    return elems


class Kinematics:
    """Geometry dependent element quantities for a tet10 mesh."""

    def __init__(self, nodes, elems):
        self.nodes = np.asarray(nodes, float)
        self.elems = np.asarray(elems, np.intp)   # intp: bincount on 32-bit WebAssembly (Pyodide)
        X = self.nodes[self.elems]                                    # (E,10,3)
        J = np.einsum("gin,enj->egij", DN_GP, X)                      # (E,4,3,3)
        self.detJ = np.linalg.det(J)
        if np.any(self.detJ <= 0):
            raise ValueError("Mesh contains inverted or degenerate elements.")
        invJ = np.linalg.inv(J)
        dNdx = np.einsum("egij,gjn->egin", invJ, DN_GP)               # (E,4,3,10)
        ne = len(self.elems)
        B = np.zeros((ne, NGP, 6, 30))
        dx, dy, dz = dNdx[:, :, 0], dNdx[:, :, 1], dNdx[:, :, 2]
        B[:, :, 0, 0::3] = dx
        B[:, :, 1, 1::3] = dy
        B[:, :, 2, 2::3] = dz
        B[:, :, 3, 0::3] = dy
        B[:, :, 3, 1::3] = dx
        B[:, :, 4, 1::3] = dz
        B[:, :, 4, 2::3] = dy
        B[:, :, 5, 0::3] = dz
        B[:, :, 5, 2::3] = dx
        self.B = B
        self.wdet = self.detJ * GAUSS_W[None, :]                      # (E,4)
        self.xgp = np.einsum("gn,enj->egj", N_GP, X)                  # (E,4,3)
        self.dofs = (3 * self.elems[:, :, None] + np.arange(3)).reshape(ne, 30)
        self.ndof = 3 * len(self.nodes)
        self._rows = np.repeat(self.dofs, 30, axis=1).ravel()
        self._cols = np.tile(self.dofs, (1, 30)).ravel()

    @property
    def volume(self):
        return float(self.wdet.sum())

    def strain(self, u):
        """Strains at Gauss points (E,4,6) for a displacement vector u (ndof,)."""
        return np.einsum("egij,ej->egi", self.B, u[self.dofs], optimize=True)

    def internal_force(self, sig):
        fe = np.einsum("egji,egj,eg->ei", self.B, sig, self.wdet, optimize=True)
        return np.bincount(self.dofs.ravel(), fe.ravel(), minlength=self.ndof)

    def stiffness(self, D):
        """Global stiffness for material matrices D: (E,6,6) or (E,4,6,6)."""
        if D.ndim == 3:
            D = np.broadcast_to(D[:, None], (D.shape[0], NGP, 6, 6))
        DB = np.einsum("egij,egjk->egik", D, self.B, optimize=True)
        Ke = np.einsum("egji,egjk,eg->eik", self.B, DB, self.wdet, optimize=True)
        K = sp.coo_matrix((Ke.ravel(), (self._rows, self._cols)), shape=(self.ndof, self.ndof))
        return K.tocsr()

    def body_force(self, b):
        """Consistent nodal forces of body forces b (E,4,3) in kN/m3."""
        fe = np.einsum("gn,egk,eg->enk", N_GP, b, self.wdet)          # (E,10,3)
        return np.bincount(self.dofs.ravel(), fe.reshape(len(self.elems), 30).ravel(),
                           minlength=self.ndof)


# ----------------------------------------------------------------------------- surfaces
def boundary_faces(elems):
    """Boundary faces of a tet10 mesh as 6-node triangles (corners a,b,c then mids ab, bc, ca),
    oriented with the outward normal."""
    elems = np.asarray(elems)
    tri = []
    for (a, b, c) in FACES:
        mids = [EDGE_NODE[frozenset((a, b))], EDGE_NODE[frozenset((b, c))], EDGE_NODE[frozenset((c, a))]]
        tri.append(elems[:, [a, b, c] + mids])
    allf = np.concatenate(tri, axis=0)
    key = np.sort(allf[:, :3], axis=1)
    _, inv, cnt = np.unique(key, axis=0, return_inverse=True, return_counts=True)
    return allf[cnt[inv.ravel()] == 1]


_TRI_GP = np.array([[1 / 6, 1 / 6], [2 / 3, 1 / 6], [1 / 6, 2 / 3]])
_TRI_W = np.full(3, 1 / 6)


def _tri6(st):
    s, t = st[:, 0], st[:, 1]
    L = np.stack([1 - s - t, s, t], 1)
    dL = np.array([[-1.0, 1, 0], [-1.0, 0, 1]])
    n = len(st)
    N = np.empty((n, 6))
    dN = np.empty((n, 2, 6))
    for i in range(3):
        N[:, i] = L[:, i] * (2 * L[:, i] - 1)
        dN[:, :, i] = (4 * L[:, i] - 1)[:, None] * dL[:, i][None, :]
    for k, (a, b) in enumerate([(0, 1), (1, 2), (2, 0)]):
        N[:, 3 + k] = 4 * L[:, a] * L[:, b]
        dN[:, :, 3 + k] = 4 * (L[:, b][:, None] * dL[:, a][None, :] + L[:, a][:, None] * dL[:, b][None, :])
    return N, dN


_TN, _TDN = _tri6(_TRI_GP)


def face_areas(nodes, faces):
    X = nodes[faces]
    t = np.einsum("gin,fnj->fgij", _TDN, X)
    nrm = np.linalg.norm(np.cross(t[:, :, 0], t[:, :, 1]), axis=-1)
    return (nrm * _TRI_W).sum(1)


def vertical_pressure_load(nodes, faces, q, ndof):
    """Nodal forces of a uniform downward pressure q (kPa) on 6-node triangular faces."""
    X = nodes[faces]
    t = np.einsum("gin,fnj->fgij", _TDN, X)
    jac = np.linalg.norm(np.cross(t[:, :, 0], t[:, :, 1]), axis=-1)        # (F,3)
    fn = np.einsum("gn,fg,g->fn", _TN, jac, _TRI_W) * (-q)                # (F,6)
    return np.bincount((3 * np.asarray(faces, np.intp) + 2).ravel(), fn.ravel(), minlength=ndof)
