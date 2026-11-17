"""Constitutive models: isotropic linear elasticity and Mohr-Coulomb perfect plasticity.

Conventions
-----------
* Voigt order: [xx, yy, zz, xy, yz, zx]; strains use engineering shear (gamma = 2 eps).
* Tension is positive (compression negative), stresses are EFFECTIVE stresses.
* Principal stresses s1 >= s2 >= s3 (s1 is the least compressive).

Mohr-Coulomb yield function (tension positive):
    f = (s1 - s3) + (s1 + s3) sin(phi) - 2 c cos(phi)
Plastic potential: the same with psi instead of phi (non-associated when psi != phi).

The return mapping is done in principal stress space (main plane, the two edges and
the apex), following the classical scheme for perfect plasticity
(e.g. de Souza Neto, Peric & Owen, "Computational Methods for Plasticity", ch. 8).
"""
from __future__ import annotations

import numpy as np


# ----------------------------------------------------------------------------- elasticity
def bulk_shear(E, nu):
    E = np.asarray(E, float)
    nu = np.asarray(nu, float)
    return E / (3.0 * (1.0 - 2.0 * nu)), E / (2.0 * (1.0 + nu))


def elastic_D(E, nu):
    """Elastic stiffness matrix (..., 6, 6)."""
    K, G = bulk_shear(E, nu)
    lam = K - 2.0 * G / 3.0
    shape = np.shape(K)
    D = np.zeros(shape + (6, 6))
    D[..., :3, :3] = np.asarray(lam)[..., None, None]
    for i in range(3):
        D[..., i, i] += 2.0 * G
        D[..., i + 3, i + 3] = G
    return D


def apply_elastic(K, G, eps):
    """Stress from strain for many points: eps (n,6), K,G (n,) -> (n,6)."""
    tr = eps[:, 0] + eps[:, 1] + eps[:, 2]
    lam = K - 2.0 * G / 3.0
    s = np.empty_like(eps)
    s[:, :3] = (lam * tr)[:, None] + 2.0 * G[:, None] * eps[:, :3]
    s[:, 3:] = G[:, None] * eps[:, 3:]
    return s


# ----------------------------------------------------------------------------- tensors
def voigt_to_tensor(s):
    T = np.empty(s.shape[:-1] + (3, 3))
    T[..., 0, 0] = s[..., 0]
    T[..., 1, 1] = s[..., 1]
    T[..., 2, 2] = s[..., 2]
    T[..., 0, 1] = T[..., 1, 0] = s[..., 3]
    T[..., 1, 2] = T[..., 2, 1] = s[..., 4]
    T[..., 0, 2] = T[..., 2, 0] = s[..., 5]
    return T


def tensor_to_voigt(T):
    return np.stack([T[..., 0, 0], T[..., 1, 1], T[..., 2, 2],
                     T[..., 0, 1], T[..., 1, 2], T[..., 0, 2]], axis=-1)


def principal_stresses(sig):
    """Principal stresses, descending (s1 >= s2 >= s3): (n,3)."""
    w = np.linalg.eigvalsh(voigt_to_tensor(sig))
    return w[..., ::-1]


def mc_yield(sig, c, phi_rad):
    """Mohr-Coulomb yield function value for stress points (n,6)."""
    p = principal_stresses(sig)
    s1, s3 = p[..., 0], p[..., 2]
    return (s1 - s3) + (s1 + s3) * np.sin(phi_rad) - 2.0 * c * np.cos(phi_rad)


# ----------------------------------------------------------------------------- return mapping
def mc_return(sig_tr, K, G, c, phi, psi, tol=1e-9):
    """Mohr-Coulomb return mapping (perfect plasticity).

    sig_tr : (n,6) elastic trial stress
    K, G, c, phi, psi : (n,) bulk modulus, shear modulus, cohesion, friction and
                        dilatancy angle (radians)
    Returns (sig, plastic, mode) with mode 0 elastic, 1 plane, 2 edge, 3 apex.
    """
    sig_tr = np.asarray(sig_tr, float)
    n = sig_tr.shape[0]
    out = sig_tr.copy()
    mode = np.zeros(n, np.int8)
    if n == 0:
        return out, np.zeros(0, bool), mode

    w, V = np.linalg.eigh(voigt_to_tensor(sig_tr))   # ascending
    s1, s2, s3 = w[:, 2], w[:, 1], w[:, 0]
    sf = np.sin(phi)
    cf = np.cos(phi)
    f = (s1 - s3) + (s1 + s3) * sf - 2.0 * c * cf
    scale = np.abs(s1) + np.abs(s3) + c + 1.0
    yl = f > tol * scale
    if not yl.any():
        return out, yl, mode

    idx = np.nonzero(yl)[0]
    p = np.stack([s1[idx], s2[idx], s3[idx]], axis=1)
    Ki, Gi, ci = K[idx], G[idx], c[idx]
    sfi, cfi, spi = sf[idx], cf[idx], np.sin(psi[idx])
    lam = Ki - 2.0 * Gi / 3.0
    z = np.zeros_like(sfi)
    k = 2.0 * ci * cfi
    eps_o = 1e-10 * scale[idx]

    def dmul(b):  # principal elastic matrix times b
        return lam[:, None] * b.sum(1, keepdims=True) + 2.0 * Gi[:, None] * b

    a1 = np.stack([1 + sfi, z, -(1 - sfi)], 1)
    b1 = np.stack([1 + spi, z, -(1 - spi)], 1)
    a2 = np.stack([z, 1 + sfi, -(1 - sfi)], 1)      # s2 major: edge s1 = s2
    b2 = np.stack([z, 1 + spi, -(1 - spi)], 1)
    a3 = np.stack([1 + sfi, -(1 - sfi), z], 1)      # s2 minor: edge s2 = s3
    b3 = np.stack([1 + spi, -(1 - spi), z], 1)

    # --- main plane
    f1 = (a1 * p).sum(1) - k
    Db1 = dmul(b1)
    A11 = (a1 * Db1).sum(1)
    dg = f1 / A11
    pn = p - dg[:, None] * Db1
    m = np.ones(len(idx), np.int8)
    bad = ~((pn[:, 0] >= pn[:, 1] - eps_o) & (pn[:, 1] >= pn[:, 2] - eps_o))

    if bad.any():
        # --- edge: choose the ordering condition that is violated first
        s_sel = (1 - spi) * p[:, 0] - 2 * p[:, 1] + (1 + spi) * p[:, 2]
        right = (s_sel < 0)[:, None]
        aE = np.where(right, a2, a3)
        bE = np.where(right, b2, b3)
        DbE = dmul(bE)
        A12 = (a1 * DbE).sum(1)
        A21 = (aE * Db1).sum(1)
        A22 = (aE * DbE).sum(1)
        fE = (aE * p).sum(1) - k
        det = A11 * A22 - A12 * A21
        det = np.where(np.abs(det) < 1e-300, 1e-300, det)
        g1 = (f1 * A22 - A12 * fE) / det
        g2 = (A11 * fE - A21 * f1) / det
        pe = p - g1[:, None] * Db1 - g2[:, None] * DbE
        ok_e = (g1 >= -1e-12) & (g2 >= -1e-12) & (pe[:, 0] >= pe[:, 2] - eps_o)
        use_e = bad & ok_e
        pn[use_e] = pe[use_e]
        m[use_e] = 2
        apex = bad & ~ok_e
        if apex.any():
            has_apex = apex & (sfi > 1e-8)
            pa = ci * cfi / np.where(sfi > 1e-8, sfi, 1.0)
            pn[has_apex] = pa[has_apex, None]
            m[has_apex] = 3
            tresca = apex & ~has_apex      # phi = 0: no apex, keep the edge solution
            pn[tresca] = pe[tresca]
            m[tresca] = 2

    wn = np.stack([pn[:, 2], pn[:, 1], pn[:, 0]], axis=1)   # ascending, matches V
    Vi = V[idx]
    T = np.einsum("nij,nj,nkj->nik", Vi, wn, Vi)
    out[idx] = tensor_to_voigt(T)
    mode[idx] = m
    return out, yl, mode


def mc_tangent(sig_tr, K, G, c, phi, psi):
    """Algorithmic (consistent) tangent dsig/deps at trial states, by central differences
    of the return mapping in stress space times the elastic matrix: (n,6,6)."""
    n = sig_tr.shape[0]
    Del = np.zeros((n, 6, 6))
    lam = K - 2.0 * G / 3.0
    Del[:, :3, :3] = lam[:, None, None]
    for i in range(3):
        Del[:, i, i] += 2.0 * G
        Del[:, i + 3, i + 3] = G
    h = 1e-6 * (np.abs(sig_tr).max(1) + c + 1.0)
    J = np.empty((n, 6, 6))
    for j in range(6):
        sp = sig_tr.copy()
        sm = sig_tr.copy()
        sp[:, j] += h
        sm[:, j] -= h
        rp, _, _ = mc_return(sp, K, G, c, phi, psi)
        rm, _, _ = mc_return(sm, K, G, c, phi, psi)
        J[:, :, j] = (rp - rm) / (2.0 * h[:, None])
    Dt = np.einsum("nij,njk->nik", J, Del)
    # tiny elastic fraction keeps apex points from producing a singular matrix
    return Dt + 1e-4 * Del


def triaxial_failure_stress(sigma3_comp, c, phi_deg):
    """Closed form axial stress at failure in a drained triaxial compression test.
    sigma3_comp: confining pressure (compression positive). Returns sigma1 (compression positive)."""
    phi = np.radians(phi_deg)
    Np = (1 + np.sin(phi)) / (1 - np.sin(phi))
    return sigma3_comp * Np + 2.0 * c * np.sqrt(Np)
