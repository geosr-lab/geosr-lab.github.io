"""Project data model and JSON persistence.

Units: length m, force kN, stress kPa (kN/m2), unit weight kN/m3, angles degrees.
Coordinates: x, y horizontal, z vertical pointing UP. The ground surface is the top of
the first borehole layer. The footing is centred at x = y = 0 on the ground surface.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

FILE_VERSION = 1


@dataclass
class Material:
    name: str = "Soil"
    gamma_unsat: float = 17.0   # kN/m3, above water table
    gamma_sat: float = 20.0     # kN/m3, below water table
    E: float = 20000.0          # kPa, Young's modulus (drained)
    nu: float = 0.3             # Poisson's ratio
    c: float = 5.0              # kPa, effective cohesion
    phi: float = 30.0           # deg, effective friction angle
    psi: float = 0.0            # deg, dilatancy angle
    color: str = "#c8a165"
    model: str = "Mohr-Coulomb" # "Mohr-Coulomb" or "Hardening Soil"
    # Hardening Soil (used only when model == "Hardening Soil")
    E50ref: float = 20000.0     # kPa, secant stiffness in triaxial test at pref
    Eoedref: float = 20000.0    # kPa, oedometer stiffness at pref (cap: not used yet)
    Eurref: float = 60000.0     # kPa, unloading/reloading stiffness at pref
    m: float = 0.5              # power of stress dependency
    pref: float = 100.0         # kPa, reference stress
    nu_ur: float = 0.2          # Poisson's ratio for unloading/reloading
    Rf: float = 0.9             # failure ratio qf/qa

MODELS = ("Mohr-Coulomb", "Hardening Soil")


@dataclass
class Layer:
    top: float
    bottom: float
    material: str


@dataclass
class Borehole:
    layers: list[Layer] = field(default_factory=list)
    water_level: float = -2.0   # m, elevation of the phreatic level


@dataclass
class Domain:
    Lx: float = 20.0            # full model width in x (m)
    Ly: float = 20.0            # full model width in y (m)
    symmetry: bool = True       # model one quarter (x>=0, y>=0) using two symmetry planes


@dataclass
class Footing:
    B: float = 2.0              # size in x (m)
    L: float = 2.0              # size in y (m)
    q: float = 150.0            # kPa, uniform surface pressure
    kind: str = "flexible"      # "flexible" (uniform pressure) or "rigid" (uniform settlement)


@dataclass
class MeshSettings:
    coarse: float = 3.0         # m, element size far from the footing
    fine: float = 0.8           # m, element size under the footing (0.45 takes > 10 min)
    refine_depth: float = 2.0   # depth of refined zone as multiple of max(B, L)
    refine_margin: float = 0.75 # horizontal margin of refined zone as multiple of max(B, L)


@dataclass
class PhaseSettings:
    method: str = "modified_newton" # "modified_newton" (elastic stiffness) or "newton" (tangent, slow)
    tolerance: float = 0.01         # relative out-of-balance tolerance
    max_iterations: int = 100
    initial_steps: int = 8          # initial number of load steps in the load phase
    max_steps: int = 200
    min_step: float = 1e-3          # smallest load fraction before collapse is declared
    run_safety: bool = True
    sf_increment: float = 0.1       # first Msf increment
    sf_min_increment: float = 0.005 # stop when the Msf increment falls below this
    sf_max_steps: int = 60
    sf_max: float = 10.0


@dataclass
class Project:
    name: str = "New project"
    materials: list[Material] = field(default_factory=list)
    borehole: Borehole = field(default_factory=Borehole)
    gamma_w: float = 10.0
    domain: Domain = field(default_factory=Domain)
    footing: Footing = field(default_factory=Footing)
    mesh: MeshSettings = field(default_factory=MeshSettings)
    phases: PhaseSettings = field(default_factory=PhaseSettings)

    # ------------------------------------------------------------------ helpers
    @property
    def ground_level(self) -> float:
        return self.borehole.layers[0].top if self.borehole.layers else 0.0

    @property
    def bottom_level(self) -> float:
        return self.borehole.layers[-1].bottom if self.borehole.layers else -10.0

    def material(self, name: str) -> Material:
        for m in self.materials:
            if m.name == name:
                return m
        raise KeyError(f"Material '{name}' does not exist")

    def validate(self) -> list[str]:
        """Return a list of human readable problems in Indonesian (empty list = OK)."""
        err: list[str] = []
        names = [m.name for m in self.materials]
        if len(set(names)) != len(names):
            err.append("Nama material harus unik.")
        for m in self.materials:
            if m.E <= 0:
                err.append(f"{m.name}: E harus > 0.")
            if not (0.0 <= m.nu < 0.5):
                err.append(f"{m.name}: angka Poisson harus di antara 0 dan 0,5.")
            if m.c < 0:
                err.append(f"{m.name}: kohesi harus >= 0.")
            if not (0.0 <= m.phi < 90.0):
                err.append(f"{m.name}: sudut geser harus di antara 0 dan 90°.")
            if m.psi < 0 or m.psi > m.phi:
                err.append(f"{m.name}: sudut dilatansi harus di antara 0 dan φ.")
            if m.phi <= 0 and m.c <= 0:
                err.append(f"{m.name}: perlu c > 0 atau φ > 0.")
            if m.gamma_unsat < 0 or m.gamma_sat < 0:
                err.append(f"{m.name}: berat isi harus >= 0.")
        lay = self.borehole.layers
        if not lay:
            err.append("Bor log membutuhkan minimal satu lapisan.")
        for i, l in enumerate(lay):
            if l.bottom >= l.top:
                err.append(f"Lapisan {i + 1}: dasar harus di bawah puncak.")
            if l.material not in names:
                err.append(f"Lapisan {i + 1}: material '{l.material}' tidak ada.")
            if i > 0 and abs(lay[i - 1].bottom - l.top) > 1e-9:
                err.append(f"Lapisan {i + 1}: puncak harus sama dengan dasar lapisan {i}.")
        d, f = self.domain, self.footing
        if d.Lx <= 0 or d.Ly <= 0:
            err.append("Ukuran domain harus > 0.")
        if f.B <= 0 or f.L <= 0:
            err.append("Ukuran fondasi harus > 0.")
        if f.B > d.Lx + 1e-9 or f.L > d.Ly + 1e-9:
            err.append("Fondasi harus berada di dalam domain.")
        if f.kind not in ("flexible", "rigid"):
            err.append("Jenis fondasi harus 'flexible' atau 'rigid'.")
        if self.mesh.fine <= 0 or self.mesh.coarse <= 0:
            err.append("Ukuran elemen harus > 0.")
        if self.phases.method not in ("newton", "modified_newton"):
            err.append("Metode iterasi harus 'newton' atau 'modified_newton'.")
        if self.gamma_w <= 0:
            err.append("Berat isi air harus > 0.")
        return err

    # --------------------------------------------------------------- JSON I/O
    def to_dict(self) -> dict:
        d = asdict(self)
        d["file_version"] = FILE_VERSION
        d["application"] = "GeoFEM 3D"
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "Project":
        def pick(dc, data):
            data = data or {}
            keys = dc.__dataclass_fields__.keys()
            return dc(**{k: v for k, v in data.items() if k in keys})

        bh = d.get("borehole", {}) or {}
        return cls(
            name=d.get("name", "Project"),
            materials=[pick(Material, m) for m in d.get("materials", [])],
            borehole=Borehole(
                layers=[pick(Layer, l) for l in bh.get("layers", [])],
                water_level=float(bh.get("water_level", -2.0)),
            ),
            gamma_w=float(d.get("gamma_w", 10.0)),
            domain=pick(Domain, d.get("domain")),
            footing=pick(Footing, d.get("footing")),
            mesh=pick(MeshSettings, d.get("mesh")),
            phases=pick(PhaseSettings, d.get("phases")),
        )

    def save(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: str | Path) -> "Project":
        return cls.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))


def default_project() -> Project:
    """Example: 2 m x 2 m footing on loose sand over clay, water table at -2 m."""
    return Project(
        name="Contoh - fondasi bujur sangkar di atas pasir dan lempung",
        materials=[
            Material("Pasir", 17.0, 20.0, 30000.0, 0.30, 1.0, 32.0, 2.0, "#d6b25f"),
            Material("Lempung", 16.0, 18.0, 12000.0, 0.33, 12.0, 24.0, 0.0, "#8fa89b"),
        ],
        borehole=Borehole(
            layers=[Layer(0.0, -4.0, "Pasir"), Layer(-4.0, -15.0, "Lempung")],
            water_level=-2.0,
        ),
        gamma_w=10.0,
        domain=Domain(20.0, 20.0, True),
        footing=Footing(2.0, 2.0, 150.0, "flexible"),
        mesh=MeshSettings(),
        phases=PhaseSettings(),
    )
