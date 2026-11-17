"""GeoFEM 3D - a small 3D geotechnical finite element program (Python).

Packages:
    project   - data model (soil, borehole, footing, mesh and phase settings), JSON I/O
    material  - linear elasticity and Mohr-Coulomb return mapping
    fem       - 10-node tetrahedron kinematics, assembly, loads
    mesher    - gmsh based mesh generation
    solver    - calculation phases (K0, plastic load, phi-c reduction)
    gui       - PySide6 user interface
"""

__version__ = "1.0.0"
APP_NAME = "GeoFEM 3D"
