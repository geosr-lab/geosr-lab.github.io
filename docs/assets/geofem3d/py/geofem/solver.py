"""Calculation phases.

Phase 0  Initial stresses by the K0 procedure (K0 = 1 - sin phi'), hydrostatic pore pressures.
Phase 1  Plastic footing load: load control with incremental-iterative (modified) Newton
         and Mohr-Coulomb return mapping, automatic step size.
Phase 2  Safety factor by phi-c reduction: tan(phi) and c divided by Msf, Msf increased
         until no equilibrium can be found.

Drained, effective stress analysis: the soil skeleton carries gamma_unsat above and
(gamma_sat - gamma_w) below the water table.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

from . import fem
from .hardening_soil import hs_tangent, hs_update, initial_gamma_p, ur_moduli
from .material import apply_elastic, bulk_shear, mc_return, mc_tangent
from .mesher import Mesh
from .project import Project


class Cancelled(Exception):
    pass


@dataclass
class PhaseResult:
    name: str
    u: np.ndarray                 # (N,3) total displacement at the end of the phase
    du: np.ndarray                # (N,3) displacement increment of this phase
    sig: np.ndarray               # (E,4,6) effective stresses
    plastic: np.ndarray           # (E,4) bool, Mohr-Coulomb failure points
    ok: bool = True
    message: str = ""
    steps: int = 0
    iterations: int = 0
    curve: list = field(default_factory=list)   # load phase: (q, settlement); SF: (Msf, |du|)
    load_fraction: float = 1.0
    sf: float | None = None


@dataclass
class Results:
    phases: list
    pw: np.ndarray                # (E,4) pore pressure (compression positive)
    control_node: int
    run_time: float = 0.0
    log: list = field(default_factory=list)

    def phase(self, name):
        for ph in self.phases:
            if ph.name == name:
                return ph
        return None

    @property
    def max_settlement(self):
        ph = self.phase("Load") or self.phases[-1]
        return float(max(0.0, -ph.u[:, 2].min()))

    @property
    def footing_settlement(self):
        ph = self.phase("Load") or self.phases[-1]
        return float(-ph.u[self.control_node, 2])

    @property
    def safety_factor(self):
        ph = self.phase("Safety")
        return None if ph is None else ph.sf


class FEModel:
    """Discretised problem: geometry, materials, boundary conditions and loads."""

    def __init__(self, project: Project, mesh: Mesh):
        self.p = project
        self.mesh = mesh
        self.kin = fem.Kinematics(mesh.nodes, mesh.elems)
        ne = len(mesh.elems)
        self.ne, self.nn, self.ndof = ne, len(mesh.nodes), self.kin.ndof

        mats = [project.material(l.material) for l in project.borehole.layers]
        lay = mesh.elem_layer

        def per_gp(attr, conv=float):
            v = np.array([conv(getattr(m, attr)) for m in mats])[lay]
            return np.repeat(v[:, None], fem.NGP, axis=1).ravel()

        self.E = per_gp("E")
        self.nu = per_gp("nu")
        self.c = per_gp("c")
        self.phi = np.radians(per_gp("phi"))
        self.psi = np.radians(per_gp("psi"))
        self.Kb, self.G = bulk_shear(self.E, self.nu)
        # Hardening Soil points: stiffness from Eur(sigma3'), set after the initial phase
        self.ih = np.nonzero(per_gp("model", lambda s: s == "Hardening Soil") > 0)[0]
        self.hs_prm = {k: per_gp(k)[self.ih] for k in ("E50ref", "Eurref", "m", "pref", "Rf", "nu_ur")}
        self.gp = np.zeros(self.ne * fem.NGP)       # hardening parameter gamma_p
        self._gp_trial = self.gp
        self._deps = None

        # ---- water and unit weights at Gauss points
        g = mesh.geom
        self.zwt = min(project.borehole.water_level, g.zmax)
        zgp = self.kin.xgp[..., 2]
        self.pw = project.gamma_w * np.clip(self.zwt - zgp, 0.0, None)      # (E,4)
        gu = np.array([m.gamma_unsat for m in mats])[lay][:, None]
        gs = np.array([m.gamma_sat for m in mats])[lay][:, None]
        below = zgp < self.zwt
        self.gamma_eff = np.where(below, gs - project.gamma_w, gu)            # (E,4)
        b = np.zeros((ne, fem.NGP, 3))
        b[..., 2] = -self.gamma_eff
        self.F_grav = self.kin.body_force(b)

        # ---- boundary conditions (base fixed, sides normally fixed)
        x, y, z = mesh.nodes.T
        tol = 1e-6 * g.size
        fixed = np.zeros(self.ndof, bool)
        base = np.nonzero(z <= g.zmin + tol)[0]
        for k in range(3):
            fixed[3 * base + k] = True
        fixed[3 * np.nonzero(np.abs(x - g.xmin) < tol)[0]] = True
        fixed[3 * np.nonzero(np.abs(x - g.xmax) < tol)[0]] = True
        fixed[3 * np.nonzero(np.abs(y - g.ymin) < tol)[0] + 1] = True
        fixed[3 * np.nonzero(np.abs(y - g.ymax) < tol)[0] + 1] = True

        # ---- footing faces on the ground surface
        bf = fem.boundary_faces(mesh.elems)
        top = np.all(mesh.nodes[bf[:, :3], 2] >= g.zmax - tol, axis=1)
        cen = mesh.nodes[bf[:, :3]].mean(1)
        inside = ((cen[:, 0] >= g.fx0 - tol) & (cen[:, 0] <= g.fx1 + tol) &
                  (cen[:, 1] >= g.fy0 - tol) & (cen[:, 1] <= g.fy1 + tol))
        self.foot_faces = bf[top & inside]
        self.top_faces = bf[top]
        self.foot_nodes = np.unique(self.foot_faces)
        self.foot_area = float(fem.face_areas(mesh.nodes, self.foot_faces).sum())
        self.F_foot = fem.vertical_pressure_load(mesh.nodes, self.foot_faces, 1.0, self.ndof)
        cx = 0.0 if not project.domain.symmetry else g.fx0
        cy = 0.0 if not project.domain.symmetry else g.fy0
        d2 = (mesh.nodes[self.foot_nodes, 0] - cx) ** 2 + (mesh.nodes[self.foot_nodes, 1] - cy) ** 2
        self.control_node = int(self.foot_nodes[np.argmin(d2)])
        self.area_factor = 4.0 if project.domain.symmetry else 1.0

        # ---- reduced DOF map (fixities, rigid footing tie)
        dof_map = np.full(self.ndof, -1, np.intp)
        free = ~fixed
        rigid = project.footing.kind == "rigid"
        if rigid:
            fn = self.foot_nodes
            free[3 * fn] = False            # rough rigid footing: no horizontal movement
            free[3 * fn + 1] = False
            free[3 * fn + 2] = False        # vertical DOFs tied to one master DOF below
        nfree = int(free.sum())
        dof_map[free] = np.arange(nfree)
        if rigid:
            dof_map[3 * self.foot_nodes + 2] = nfree
            nfree += 1
        self.dof_map = dof_map
        rows = np.nonzero(dof_map >= 0)[0]
        self.T = sp.csr_matrix((np.ones(len(rows)), (rows, dof_map[rows])), shape=(self.ndof, nfree))
        self.TT = self.T.T.tocsr()
        self.nred = nfree
        self._lu_el = None

    # ---------------------------------------------------------------- utilities
    def reduce(self, F):
        return self.TT @ F

    def expand(self, ur):
        return self.T @ ur

    def factor(self, K, symmetric):
        Kr = (self.TT @ K @ self.T).tocsc()
        if symmetric:
            return spla.splu(Kr, permc_spec="MMD_AT_PLUS_A", diag_pivot_thresh=0.0,
                             options={"SymmetricMode": True})
        return spla.splu(Kr, permc_spec="MMD_AT_PLUS_A")

    def elastic_D_gp(self):
        """Elastic matrices at all Gauss points (E*4,6,6) from the current K and G."""
        D = np.zeros((self.ne * fem.NGP, 6, 6))
        lam = self.Kb - 2.0 * self.G / 3.0
        D[:, :3, :3] = lam[:, None, None]
        for i in range(3):
            D[:, i, i] += 2.0 * self.G
            D[:, i + 3, i + 3] = self.G
        return D

    @property
    def lu_elastic(self):
        """Iteration matrix of modified Newton (elastic; Eur(sigma3') for Hardening Soil).
        It must not be softer than the material, otherwise the iterations overshoot."""
        if self._lu_el is None:
            D = self.elastic_D_gp().reshape(self.ne, fem.NGP, 6, 6)
            self._lu_el = self.factor(self.kin.stiffness(D), True)
        return self._lu_el

    def hs_params(self, strength):
        c, phi, psi = strength
        ih = self.ih
        return dict(self.hs_prm, c=c[ih], phi=phi[ih], psi=psi[ih])

    def init_hardening(self, sig0):
        """Hardening Soil: put the initial stresses on the yield surface and set Eur."""
        if len(self.ih) == 0:
            return
        s = sig0.reshape(-1, 6)[self.ih]
        prm = self.hs_params(self.strength(1.0))
        self.gp[self.ih] = initial_gamma_p(s, prm)
        self.Kb[self.ih], self.G[self.ih] = ur_moduli(s, prm)
        self._lu_el = None

    def accept(self, sig):
        """Store the hardening state of a converged step and update stress dependent moduli."""
        self.gp = self._gp_trial.copy()
        if len(self.ih):
            self.Kb[self.ih], self.G[self.ih] = ur_moduli(sig.reshape(-1, 6)[self.ih],
                                                          self.hs_params(self.strength(1.0)))
            self._lu_el = None

    def k0_stresses(self):
        """Effective stresses of the K0 procedure at all Gauss points (E,4,6)."""
        p = self.p
        g = self.mesh.geom
        lev = sorted(set([l.top for l in p.borehole.layers] + [g.zmin] +
                         ([self.zwt] if g.zmin < self.zwt < g.zmax else [])), reverse=True)
        z = self.kin.xgp[..., 2]
        sv = np.zeros_like(z)
        for zt, zb in zip(lev[:-1], lev[1:]):
            zm = 0.5 * (zt + zb)
            m = None
            for l in p.borehole.layers:
                if l.bottom - 1e-9 <= zm <= l.top + 1e-9:
                    m = p.material(l.material)
            gam = m.gamma_sat if zm < self.zwt else m.gamma_unsat
            sv += gam * np.clip(zt - np.maximum(z, zb), 0.0, zt - zb)
        sv_eff = sv - self.pw
        phi = self.phi.reshape(self.ne, fem.NGP)
        k0 = 1.0 - np.sin(phi)
        sig = np.zeros((self.ne, fem.NGP, 6))
        sig[..., 0] = -k0 * sv_eff
        sig[..., 1] = -k0 * sv_eff
        sig[..., 2] = -sv_eff
        return sig

    def strength(self, msf=1.0):
        """Reduced strength parameters for phi-c reduction."""
        if msf == 1.0:
            return self.c, self.phi, self.psi
        phi_r = np.arctan(np.tan(self.phi) / msf)
        return self.c / msf, phi_r, np.minimum(self.psi, phi_r)

    def stress_update(self, sig_n, du, strength, use_hs=True):
        c, phi, psi = strength
        deps = self.kin.strain(du).reshape(-1, 6)
        sn = sig_n.reshape(-1, 6)
        st = sn + apply_elastic(self.Kb, self.G, deps)
        s, pl, _ = mc_return(st, self.Kb, self.G, c, phi, psi)
        gp_new = self.gp.copy()
        ih = self.ih
        if use_hs and len(ih):
            sh, gh, plh, _ = hs_update(sn[ih], self.gp[ih], deps[ih], self.hs_params(strength),
                                       self.Kb[ih], self.G[ih])
            s[ih], pl[ih], gp_new[ih] = sh, plh, gh
        self._gp_trial = gp_new
        self._deps = deps
        return s.reshape(self.ne, fem.NGP, 6), pl.reshape(self.ne, fem.NGP), st

    def tangent_matrix(self, sig_n, sig_trial_flat, plastic, strength, use_hs=True):
        c, phi, psi = strength
        D = self.elastic_D_gp()
        pl = plastic.ravel().copy()
        hs_mask = np.zeros_like(pl)
        if use_hs and len(self.ih):
            hs_mask[self.ih] = True
        idx = np.nonzero(pl & ~hs_mask)[0]
        if len(idx):
            D[idx] = mc_tangent(sig_trial_flat[idx], self.Kb[idx], self.G[idx], c[idx], phi[idx], psi[idx])
        jh = np.nonzero(pl[self.ih])[0] if use_hs and len(self.ih) else []
        if len(jh):
            gi = self.ih[jh]
            prm = {k: v[jh] for k, v in self.hs_params(strength).items()}
            D[gi] = hs_tangent(sig_n.reshape(-1, 6)[gi], self.gp[gi], self._deps[gi], prm,
                               self.Kb[gi], self.G[gi])
        return self.kin.stiffness(D.reshape(self.ne, fem.NGP, 6, 6))

    # ----------------------------------------------------------- one step
    def equilibrium(self, sig_n, F_ext, strength, settings, norm_ref, cancel=None, use_hs=True):
        """Iterate to equilibrium from the converged state sig_n. Returns
        (ok, du, sig, plastic, iterations, error)."""
        du = np.zeros(self.ndof)
        sig, pl, st = self.stress_update(sig_n, du, strength, use_hs)
        r = self.reduce(F_ext - self.kin.internal_force(sig))
        err = np.linalg.norm(r) / norm_ref
        newton = settings.method == "newton"
        for it in range(1, settings.max_iterations + 1):
            if cancel is not None and cancel():
                raise Cancelled()
            if newton and it > 1 and pl.any():
                try:
                    lu = self.factor(self.tangent_matrix(sig_n, st, pl, strength, use_hs), False)
                except RuntimeError:
                    lu = self.lu_elastic
            else:
                lu = self.lu_elastic
            du += self.expand(lu.solve(r))
            sig, pl, st = self.stress_update(sig_n, du, strength, use_hs)
            r = self.reduce(F_ext - self.kin.internal_force(sig))
            err = np.linalg.norm(r) / norm_ref
            if not np.isfinite(err) or err > 1e4:
                return False, du, sig, pl, it, err
            if err <= settings.tolerance:
                return True, du, sig, pl, it, err
        return False, du, sig, pl, settings.max_iterations, err


# =============================================================================== analysis
def run_analysis(project: Project, mesh: Mesh, progress=None, log=None, cancel=None,
                 run_load=True, run_safety=None) -> Results:
    """Run all calculation phases. progress(fraction, text), log(text), cancel() -> bool."""
    t0 = time.perf_counter()
    lines = []

    def say(msg):
        lines.append(msg)
        if log:
            log(msg)

    def prog(frac, txt):
        if progress:
            progress(float(min(max(frac, 0.0), 1.0)), txt)

    s = project.phases
    if run_safety is None:
        run_safety = s.run_safety
    model = FEModel(project, mesh)
    say(f"Model: {model.nn} titik nodal, {model.ne} elemen, {model.nred} derajat kebebasan, "
        f"luas fondasi {model.foot_area * model.area_factor:.2f} m2")

    # ------------------------------------------------------------------ phase 0
    prog(0.02, "Fase awal (prosedur K0)")
    sig0 = model.k0_stresses()
    flat, pl0, _ = mc_return(sig0.reshape(-1, 6), model.Kb, model.G, model.c, model.phi, model.psi)
    sig0 = flat.reshape(sig0.shape)
    pl0 = pl0.reshape(model.ne, fem.NGP)
    model.init_hardening(sig0)
    oob = np.linalg.norm(model.reduce(model.F_grav - model.kin.internal_force(sig0)))
    oob_rel = oob / max(np.linalg.norm(model.reduce(model.F_grav)), 1e-12)
    zero = np.zeros((model.nn, 3))
    ph0 = PhaseResult("Initial", zero.copy(), zero.copy(), sig0, pl0,
                      message=f"Prosedur K0: ketidakseimbangan {oob_rel:.2e}, "
                              f"{int(pl0.sum())} titik plastis")
    say("Fase 0 - " + ph0.message)
    phases = [ph0]
    res = Results(phases, model.pw, model.control_node, log=lines)
    res.model = model
    if not run_load:
        res.run_time = time.perf_counter() - t0
        return res

    # ------------------------------------------------------------------ phase 1
    q = project.footing.q
    dF = q * model.F_foot
    nref = np.linalg.norm(model.reduce(dF))
    if nref <= 0:
        nref = np.linalg.norm(model.reduce(model.F_grav))
    u = np.zeros(model.ndof)
    sig = sig0.copy()
    pl = pl0.copy()
    lam, dlam = 0.0, 1.0 / max(1, s.initial_steps)
    curve = [(0.0, 0.0)]
    steps = iters = 0
    collapse = False
    lo, hi = (3, 8) if s.method == "newton" else (6, 18)
    strength = model.strength(1.0)
    while lam < 1.0 - 1e-9 and steps < s.max_steps:
        dl = min(dlam, 1.0 - lam)
        ok, du, sig_new, pl_new, its, err = model.equilibrium(
            sig, model.F_grav + (lam + dl) * dF, strength, s, nref, cancel)
        steps += 1
        iters += its
        if ok:
            lam += dl
            u += du
            sig, pl = sig_new, pl_new
            model.accept(sig)
            curve.append((lam * q, float(-u[3 * model.control_node + 2])))
            if its <= lo:
                dlam = min(2.0 * dl, 0.5)
            elif its > hi:
                dlam = 0.5 * dl
            else:
                dlam = dl
            say(f"  langkah {steps}: ΣMstage {lam:.4f}, {its} iterasi, galat {err:.2e}, "
                f"{int(pl.sum())} titik plastis")
        else:
            dlam = 0.5 * dl
            say(f"  langkah {steps}: tidak konvergen (galat {err:.2e}), langkah diperkecil")
            if dlam < s.min_step:
                collapse = True
                break
        prog(0.05 + 0.6 * lam, f"Fase 1 - beban {lam * 100:.1f} %")
    U = u.reshape(-1, 3)
    if collapse or lam < 1.0 - 1e-9:
        msg = (f"Tanah runtuh: hanya {lam * 100:.1f} % beban fondasi "
               f"({lam * q:.1f} kPa) yang dapat diterapkan.")
    else:
        msg = f"Beban fondasi {q:.1f} kPa diterapkan penuh dalam {steps} langkah ({iters} iterasi)."
    ph1 = PhaseResult("Load", U.copy(), U.copy(), sig.copy(), pl.copy(), ok=lam >= 1.0 - 1e-9,
                      message=msg, steps=steps, iterations=iters, curve=curve, load_fraction=lam)
    say("Fase 1 - " + msg)
    phases.append(ph1)

    # ------------------------------------------------------------------ phase 2
    if run_safety:
        F = model.F_grav + lam * dF
        u_start = u.copy()
        msf, dm = 1.0, s.sf_increment
        curve2 = [(1.0, 0.0)]
        steps2 = its2 = 0
        while steps2 < s.sf_max_steps and msf < s.sf_max:
            mt = min(msf + dm, s.sf_max)
            ok, du, sig_new, pl_new, its, err = model.equilibrium(
                sig, F, model.strength(mt), s, nref, cancel, use_hs=False)
            steps2 += 1
            its2 += its
            if ok:
                msf = mt
                u += du
                sig, pl = sig_new, pl_new
                dmax = float(np.abs((u - u_start).reshape(-1, 3)).max())
                curve2.append((msf, dmax))
                say(f"  langkah SF {steps2}: ΣMsf {msf:.4f}, {its} iterasi")
            else:
                dm *= 0.5
                say(f"  langkah SF {steps2}: tidak seimbang pada Msf {mt:.4f}, kenaikan diperkecil")
                if dm < s.sf_min_increment:
                    break
            prog(0.68 + 0.3 * min(1.0, steps2 / max(1, s.sf_max_steps)), f"Fase 2 - Msf {msf:.3f}")
        U2 = u.reshape(-1, 3)
        msg2 = f"Angka keamanan (reduksi φ-c) SF = {msf:.3f} setelah {steps2} langkah."
        if msf >= s.sf_max:
            msg2 += " (batas atas tercapai)"
        ph2 = PhaseResult("Safety", U2.copy(), (u - u_start).reshape(-1, 3), sig.copy(), pl.copy(),
                          message=msg2, steps=steps2, iterations=its2, curve=curve2, sf=msf)
        say("Fase 2 - " + msg2)
        phases.append(ph2)

    res.run_time = time.perf_counter() - t0
    prog(1.0, "Selesai")
    say(f"Perhitungan selesai dalam {res.run_time:.1f} detik")
    return res
