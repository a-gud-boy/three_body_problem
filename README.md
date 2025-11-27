# Three Body Problem — 3D Simulator

Interactive 3D multi‑body gravity sandbox built with React + Vite and a dynamically loaded Three.js engine. Explore classic periodic solutions, hierarchical systems, chaotic evolutions, and extended scenarios with rich real‑time analysis and high‑performance rendering.

Demo: https://a-gud-boy.github.io/three_body_problem/

---

## Table of Contents
1. [Features](#features)
2. [Scenarios](#scenarios)
3. [Architecture](#architecture)
4. [Physics & Integrators](#physics--integrators)
5. [Development Setup](#development-setup)
6. [Build & Production](#build--production)
7. [Deployment](#deployment)
8. [Controls & Shortcuts](#controls--shortcuts)
9. [UI Concepts](#ui-concepts)
10. [Troubleshooting](#troubleshooting)
11. [Roadmap](#roadmap)
12. [Contributing](#contributing)
13. [License](#license)

---

## Features

- Rich preset scenarios (Figure‑8, Sun–Earth–Moon, Random 3D Chaos, Burrau Pythagorean, Lagrange Points, Sitnikov, 4‑Body square)
- Optional collision merging (mass + momentum conservation approximation)
- Two integration engines: Symplectic Euler (speed) & Runge‑Kutta 4 (precision)
- Body trails (performance or detailed mode), velocity vectors, labels, energy and center‑of‑mass (COM) diagnostics
- Interactive manipulation: drag bodies when paused, camera orbit/lock/cockpit modes, dynamic camera target switching
- Glow & procedural textures, corner axis gizmo, optional 3D grid, screenshot capture
- Floating analysis dashboard (energy drift, phase space) with draggable + resizable window
- State export/import (JSON) and bookmark system for temporal snapshots
- Full keyboard-driven workflow and responsive adaptive layout (panel resize + fullscreen)
- Zero-build CDN loading of Three.js (r128) for fast initial page load
- GitHub Pages deployment script and workflow

---

## Scenarios
| Key | Name | Summary |
|-----|------|---------|
| FIGURE_8 | Figure‑8 Periodic | Equal masses tracing a stable planar figure‑8 orbit. |
| SUN_EARTH_MOON | Hierarchical | Star–planet–moon with slight inclination for 3D depth. |
| CHAOS_RANDOM | 3D Random Chaos | Randomized initial state—highly sensitive dynamics. |
| BURRAU | Pythagorean | Masses (3,4,5) at triangle vertices—classic chaotic case. |
| LAGRANGE | L4/L5 Trojan | Demonstrates stability near triangular Lagrange points. |
| SITNIKOV | Sitnikov | Two primaries orbit; third oscillates on Z axis. |
| FOUR_BODY | 4‑Body Chaos | Square configuration with tangential velocities. |

Each scenario sets initial positions, velocities, G, scale, and camera spherical coordinates. Switching resets the simulation state deterministically (except for random bodies which are regenerated).

---

## Architecture
```
src/
	main.jsx        # App bootstrap (React + Vite entry)
	App.jsx         # Core simulation component (state + rendering lifecycle)
	components/     # Small UI components (panels, overlays)
	utils/          # (If present) math/util helpers
```
Key concepts:
- Three.js is loaded lazily via CDN; `window.THREE` gates initialization.
- Bodies stored in mutable refs (`bodiesRef`) to avoid high-frequency React re-renders; visual elements tracked in parallel arrays (meshes, glows, labels, velocity arrows).
- Animation loop (`requestAnimationFrame`) drives physics + rendering; React state reserved for UI toggles and medium‑frequency changes.
- Custom HTML/CSS overlays (labels, panels) decouple UI from WebGL render for performance.
- Analysis graphs use canvas 2D for hardware-accelerated lightweight plotting (not SVG/React).

---

## Physics & Integrators
- State vector includes positions (x,y,z) and velocities (vx,vy,vz) per body.
- Gravitational force computed pairwise with optional softening parameter (to mitigate singularities).
- Symplectic Euler: updates velocity then position—energy reasonably conserved for small steps.
- RK4: four sub‑steps sampling derivatives—higher accuracy, more CPU cost.
- Energy Drift calculation compares current total energy to initial snapshot, percent deviation displayed (green if low, red if high).
- Optional collision merge: combines bodies when within threshold (approximate; not a precise N‑body collision model).

Tuning Tips:
- Use smaller time step (lower speed) for chaotic or tightly bound systems to reduce energy drift.
- RK4 recommended when analyzing long‑term stability; Euler for exploratory manipulation.

---

## Development Setup
Requirements:
- Node.js ≥ 18 (16 may work; 20 recommended for performance)
- npm (or `pnpm`/`yarn` if you adapt scripts)

Install:
```bash
npm install
```
Run dev server (will auto-switch port if default busy):
```bash
npm run dev
```
Open: `http://localhost:5173/` (or the port Vite reports, e.g. 5174).

Environment Notes:
- On Windows PowerShell with restricted script execution, use `cmd /c "npm run dev"` if execution policy blocks `npm`.
- No environment variables required; everything client-side.

---

## Build & Production
```bash
npm run build     # Produces optimized assets in dist/
npm run preview   # Serves dist/ locally for validation
```
Artifacts are static and suitable for GitHub Pages / any static host.

---

## Deployment
Automatic: GitHub Actions workflow builds and publishes on pushes to `main`.

Manual (if needed):
```bash
npm install -D gh-pages
npm run build
npx gh-pages -d dist
# or: npm run deploy (script provided)
```

---

## Controls & Shortcuts
Mouse
- Left‑drag: Rotate camera / drag body (paused + drag mode)
- Right‑drag: Pan camera
- Wheel: Zoom

Touch
- Single finger: Rotate
- Pinch: Zoom

Keyboard
- Space: Play / Pause
- R: Reset scenario
- G: Toggle grid
- T: Toggle trails
- C: Toggle center of mass
- L: Toggle labels
- V: Toggle velocity vectors
- F: Fullscreen
- P: Toggle side panel
- A: Analysis panel
- H / ?: Help overlay
- Esc: Close overlays / exit fullscreen

Advanced
- Reverse time button in panel changes time direction (experimental)
- Step Mode allows frame‑by‑frame advancement (for analysis / screenshots)

---

## UI Concepts
- Side Panel: Scenario selection, system stats, integrator switch, performance toggles, sliders for G and timestep.
- Analysis Panel: Draggable window with energy conservation line chart + phase space scatter; resizable via corner/edge handles.
- Bookmarks: Capture current positions/velocities/time; restore later for comparison.
- Export / Import: JSON serialization of current bodies (+ velocities, masses, colors).
- Camera Modes: ORBIT (default), LOCK (follow body from external frame), COCKPIT (first‑person anchored to body).
- Reference Frames: Inertial vs barycentric (center-of-mass anchored) altering visual interpretation.

---

## Troubleshooting
| Issue | Cause | Fix |
|-------|-------|-----|
| Port 5173 busy | Another Vite/dev server running | Vite auto-selects next free (e.g. 5174); use that URL. |
| `npm` blocked by PowerShell execution policy | Restricted script execution | Run via `cmd /c "npm install"` or adjust policy (`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`). |
| High energy drift | Large timestep / chaotic regime | Lower time step or switch to RK4. |
| Lag with trails | Too many trail segments | Enable Performance Mode or reduce trail length. |
| Bodies disappear (merge) | Collision merge enabled | Toggle off Collision Merge if undesired. |

---

## Roadmap
See `ROADMAP.md` for planned enhancements (e.g. GPU compute, adaptive time steps, multi‑system comparison). Feel free to open issues suggesting priorities.

---

## Contributing
Contributions welcome—focus on atomic PRs.
- Follow ESLint config (`eslint.config.js`).
- Keep performance implications in mind (avoid unnecessary React state thrash; prefer refs for per‑frame data).
- Document new scenario presets clearly (initial conditions + scientific context if applicable).

---

## License
MIT. See `LICENSE` for full text.

---

Want additional sections (API docs, deeper physics notes, GPU acceleration ideas)? Open an issue or PR.
