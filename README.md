# Three Body Problem — 3D Simulator

Interactive Three.js + React simulator for the classical three-body problem (and other multi-body scenarios) with real-time visualization and controls.

Demo: https://a-gud-boy.github.io/three_body_problem/

---

## Features

- Multiple preset scenarios (Figure-8, Sun-Earth-Moon, Chaos, Burrau, Lagrange points, Sitnikov, 4-body)
- Physics integrators: Symplectic Euler and RK4
- Trails, velocity vectors, body labels, and energy/COM displays
- Interactive visuals: drag bodies, pull/pan/zoom camera, glow effects
- Blender-style corner axis gizmo that syncs to camera orientation
- Fullscreen (with exit option), screenshot, export/import simulation state
- Keyboard shortcuts for most UI actions (F, P, G, T, R, L, V, A, H, Space, Esc, etc.)
- Responsive layout with hideable right-hand control panel
- GitHub Pages deployment workflow

---

## Quick Start (Development)

Requirements:

- Node.js >= 16, recommended 20
- npm

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Open http://localhost:5173/ in your browser.

---

## Build & Production

Build the project for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Deploy to GitHub Pages (CI)

This project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys to GitHub Pages automatically when you push to `main`.

To deploy manually using `gh-pages`:

```bash
npm install -D gh-pages
npm run build
npx gh-pages -d dist
```

(Or run `npm run deploy` if you have the script configured)

---

## Controls & Shortcuts

Mouse

- Left-drag: Rotate camera (or drag a body when paused and drag-mode active)
- Right-drag: Pan camera
- Scroll: Zoom

Touch

- One finger: Rotate
- Two fingers: Pinch to zoom

Keyboard

- Space: Play / Pause
- R: Reset scenario
- G: Show/Hide gizmo grid
- T: Show/Hide trails
- C: Toggle center-of-mass marker
- L: Toggle body labels
- V: Toggle velocity vectors
- F: Toggle Fullscreen
- P: Toggle side panel
- A: Toggle analysis graphs
- H or ?: Toggle help modal
- Esc: Close panels / Help / Exit full-screen

---

## UI Concepts

- Right panel: Controls, scenario settings and body stats. Toggle with the P key or the button near the bottom-right.
- Gizmo (corner axis): Shows camera orientation and axes (X/Y/Z). Use it to quickly check which direction is up or forward.
- Export / Import: Save current simulation state to JSON or load a JSON file with bodies and velocities.

---

## Contributing

Contributions welcome! Open issues or pull requests for bugs, feature requests or improvements.

- Please follow existing repo style and ESLint rules.
- Add small, focused pull requests where possible.

---

## License

This project is provided under the MIT license. See LICENSE for details.

---

If you want any specific additional content (API docs, code structure, or developer notes), tell me what you'd like in the README and I’ll add it.
