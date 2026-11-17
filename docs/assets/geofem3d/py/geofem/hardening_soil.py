"""Hardening Soil model (shear hardening) after Schanz, Vermeer & Bonnier (1999).

Conventions as in material.py: Voigt [xx, yy, zz, xy, yz, zx], tension positive,
principal stresses s1 >= s2 >= s3. In compression-positive soil mechanics terms the
minor principal stress is sigma3' = -s1 and the deviator q = s1 - s3.

Stress dependent stiffness (c' cot phi shifted, power m):
    E50 = E50ref * ((c cos phi + sigma3' sin phi) / (c cos phi + pref sin phi)) ** m
    Eur = Eurref * (same ratio) ** m
Hyperbolic shear yield surface with hardening parameter gamma_p:
    f = (2 / Ei) * q / (1 - q / qa) - 2 q / Eur - gamma_p,   Ei = 2 E50 / (2 - Rf)
    qf = (c cot phi + sigma3') * 2 sin phi / (1 - sin phi),  qa = qf / Rf
Plastic potential: Mohr-Coulomb type with a constant dilatancy angle psi, so that the
increment of gamma_p equals the plastic multiplier. The Mohr-Coulomb surface is the
failure limit (perfect plasticity once q reaches qf).

shortcut: no cap (volumetric hardening) yet, so Eoedref is stored but not used and
the model is too stiff in primary one-dimensional compression; add the cap surface
when oedometer-type loading matters.
"""
from __future__ import annotations

import numpy as np

from .material import apply_elastic, bulk_shear, mc_return, tensor_to_voigt, voigt_to_tensor

SIG_MIN_FRAC = 0.01   # stiffness lower limit: sigma3' is not taken below 1 % of pref


def stiffness_ratio(sig3c, c, phi, pref, m):
    """((c cos phi + sigma3' sin phi) / (c cos phi + pref sin phi)) ** m."""
    s3 = np.maximum(sig3c, SIG_MIN_FRAC * pref)
    num = c * np.cos(phi) + s3 * np.sin(phi)
    den = c * np.cos(phi) + pref * np.sin(phi)
    return (np.maximum(num, 1e-9) / np.maximum(den, 1e-9)) ** m


def ur_moduli(sig, prm):
    """Bulk and shear modulus from Eur at the given stresses (n,6)."""
    s1 = np.linalg.eigvalsh(voigt_to_tensor(sig))[:, 2]
    Eur = prm["Eurref"] * stiffness_ratio(-s1, prm["c"], prm["phi"], prm["pref"], prm["m"])
    return bulk_shear(Eur, prm["nu_ur"])


def shear_yield(p, prm):
    """Yield function value for principal stresses p (n,3) descending, without -gamma_p.
    Returns (f_without_gamma, q, qf)."""
    s1, s3 = p[:, 0], p[:, 2]
    q = np.maximum(s1 - s3, 0.0)
    sig3c = -s1
    c, phi, Rf = prm["c"], prm["phi"], prm["Rf"]
    r = stiffness_ratio(sig3c, c, phi, prm["pref"], prm["m"])
    E50 = prm["E50ref"] * r
    Eur = prm["Eurref"] * r
    Ei = 2.0 * E50 / (2.0 - Rf)
    sphi = np.sin(phi)
    ccot = c / np.maximum(np.tan(phi), 1e-9)
    qf = np.maximum((ccot + np.maximum(sig3c, 0.0)) * 2.0 * sphi / (1.0 - sphi), 1e-9)
    qa = qf / Rf
    ratio = np.minimum(q / qa, 0.999)
    f = (2.0 / Ei) * q / (1.0 - ratio) - 2.0 * q / Eur
    return f, q, qf


def initial_gamma_p(sig, prm):
    """Hardening parameter that puts the initial stress state on the yield surface."""
    p = np.linalg.eigvalsh(voigt_to_tensor(sig))[:, ::-1]
    f, _, _ = shear_yield(p, prm)
    return np.maximum(f, 0.0)


def hs_update(sig_n, gp_n, deps, prm, K, G, n_iter=40):
    """Stress update for one strain increment.

    sig_n (n,6) converged stress, gp_n (n,) hardening parameter, deps (n,6) strain increment,
    prm dict of (n,) arrays: E50ref, Eurref, m, pref, Rf, c, phi, psi (rad);
    K, G (n,) elastic moduli (from Eur at the start of the step).
    Returns (sig, gamma_p, plastic, failure).
    """
    sig_tr = sig_n + apply_elastic(K, G, deps)
    n = len(sig_tr)
    sig = sig_tr.copy()
    gp = gp_n.copy()
    plastic = np.zeros(n, bool)
    if n == 0:
        return sig, gp, plastic, plastic.copy()

    w, V = np.linalg.eigh(voigt_to_tensor(sig_tr))
    p_tr = w[:, ::-1]                                   # descending
    f_tr, _, _ = shear_yield(p_tr, prm)
    act = f_tr - gp_n > 1e-12 * (np.abs(p_tr).max(1) + 1.0)
    p = p_tr.copy()
    if act.any():
        i = np.nonzero(act)[0]
        spsi = np.sin(prm["psi"][i])
        b = 0.5 * np.stack([1 + spsi, np.zeros_like(spsi), -(1 - spsi)], 1)
        lam = K[i] - 2.0 * G[i] / 3.0
        Db = lam[:, None] * b.sum(1, keepdims=True) + 2.0 * G[i][:, None] * b
        sub = {k: v[i] for k, v in prm.items()}
        pt, g0 = p_tr[i], gp_n[i]

        def resid(dl):
            fi, _, _ = shear_yield(pt - dl[:, None] * Db, sub)
            return fi - (g0 + dl)

        # bracket: r(0) > 0; r decreases as dl grows (the deviator shrinks)
        lo = np.zeros(len(i))
        hi = np.maximum(f_tr[i] - g0, 1e-12)
        r_hi = resid(hi)
        for _ in range(60):
            grow = r_hi > 0
            if not grow.any():
                break
            hi[grow] *= 2.0
            r_hi = resid(hi)
        dl = 0.5 * (lo + hi)
        for _ in range(n_iter):                          # bisection: robust and vectorised
            r = resid(dl)
            pos = r > 0
            lo = np.where(pos, dl, lo)
            hi = np.where(pos, hi, dl)
            dl = 0.5 * (lo + hi)
        p[i] = pt - dl[:, None] * Db
        gp[i] = g0 + dl
        plastic[i] = True

    # back to Cartesian (eigenvectors of the trial stress are kept)
    wn = p[:, ::-1]
    sig = tensor_to_voigt(np.einsum("nij,nj,nkj->nik", V, wn, V))

    # Mohr-Coulomb failure limit
    s_mc, fail, _ = mc_return(sig, K, G, prm["c"], prm["phi"], prm["psi"])
    sig[fail] = s_mc[fail]
    plastic |= fail
    return sig, gp, plastic, fail


def hs_tangent(sig_n, gp_n, deps, prm, K, G):
    """Consistent tangent by central differences of hs_update w.r.t. the strain (n,6,6)."""
    n = len(sig_n)
    h = 1e-7 + 1e-4 * np.abs(deps).max(1)
    D = np.empty((n, 6, 6))
    for j in range(6):
        dp = deps.copy()
        dm = deps.copy()
        dp[:, j] += h
        dm[:, j] -= h
        sp_, _, _, _ = hs_update(sig_n, gp_n, dp, prm, K, G)
        sm_, _, _, _ = hs_update(sig_n, gp_n, dm, prm, K, G)
        D[:, :, j] = (sp_ - sm_) / (2.0 * h[:, None])
    Del = np.zeros((n, 6, 6))
    lam = K - 2.0 * G / 3.0
    Del[:, :3, :3] = lam[:, None, None]
    for k in range(3):
        Del[:, k, k] += 2.0 * G
        Del[:, k + 3, k + 3] = G
    return D + 1e-4 * Del
