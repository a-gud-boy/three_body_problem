# Project Roadmap

This document outlines the planned features, improvements, and research goals for the **Interactive Physics Simulations** suite.

---

## 🌍 Platform & Core Architecture
**Goal:** Establish a robust, high-performance foundation for all simulations.

- [x] **Performance Optimization**
    - [x] Route-level code splitting using `React.lazy()` and `Suspense`.
- [ ] **Unified UI Framework**
    - Standardize control panels, overlay styles, and interaction patterns across all modules.
    - Implement a global "Settings" modal (graphics quality, audio, accessibility).
- [ ] **Mobile & Touch Optimization**
    - On-screen joysticks for camera control.
    - Touch-optimized UI scaling and hit targets.
    - Performance profiles for mobile GPUs.
- [ ] **Theming Engine**
    - Dark/Light mode toggle.
    - "Retro" Vector/CRT style option.
    - Minimalist/Academic style for clear data visualization.
- [ ] **Onboarding & Tutorials**
    - Interactive guided tours for complex simulations (e.g., Fluid Dynamics, Three-Body).
    - Contextual tooltips explaining physical concepts (e.g., "What is damping?").

---

## 🌌 Three-Body Problem (Gravitational Physics)
**Goal:** Enhance accuracy and visualization of chaotic orbital mechanics.

- [ ] **Adaptive Timesteps**
    - Dynamically adjust `dt` based on particle proximity to ensure accuracy during close encounters.
- [ ] **Spatial Indexing (Barnes-Hut)**
    - Implement Octree algorithm to support N-body simulations (>1000 bodies).
- [ ] **Advanced Visualization**
    - **Bloom & Glow:** Enhanced post-processing for stars.
    - ** Ribbon Trails:** Replace `GL_LINES` with mesh-based ribbons for variable thickness and opacity gradients.
    - **Cinematic Camera:** "Director Mode" to auto-focus on collisions or ejections.
- [ ] **Analysis Suite**
    - **Poincaré Sections:** Advanced chaos analysis visualization.
    - **Stability Heatmaps:** Visualizing stable vs. chaotic initial conditions.

---

## 💧 Fluid Dynamics & WebGPU
**Goal:** Push the boundaries of browser-based fluid simulation.

- [x] **WebGPU Enhancements (Virtual Wind Tunnel)**
    - [x] Implementation of Lattice Boltzmann Method (D2Q9) on GPU.
    - [x] **Buffer Packing:** Adhering to WebGPU limits by packing distribution functions.
    - [ ] **Caustics:** Realistic light refraction patterns for fluid surfaces.
    - [ ] **3D Navier-Stokes:** Transitioning from 2D LBM to volumetric 3D fluid simulation.
- [x] **Wave Equation (Fluid Dynamics)**
    - [x] **Compute Shaders:** Massively parallel wave propagation using the Wave Equation.
    - [x] **Vertex Displacement:** Real-time mesh deformation based on simulation height maps.
    - [ ] **Advanced Rendering:** Subsurface scattering and screen-space reflections (SSR).
    - [ ] **Foam Simulation:** Particle-based foam generation at high-velocity crests.

---

## ⚛️ Quantum & Atomic Physics
**Goal:** Visualize the invisible world of atoms and fields.

- [x] **Quantum Sandbox**
    - [x] **TDSE Solver:** Real-time integration of the Time-Dependent Schrödinger Equation.
    - [x] **Interactive Potentials:** Draw barriers and wells to see tunneling effects.
- [ ] **Atom Simulator**
    - [ ] **3D Electron Orbitals:** Volumetric rendering of s, p, d, f orbitals instead of 2D sprites.
    - [ ] **Reaction Simulator:** Drag-and-drop atoms to see real-time bonding animations.

---

## 🌌 Relativity & Gravitation
**Goal:** Explore the extremes of space-time.

- [x] **General Relativity**
    - [x] **Relativistic Ray Marching:** Visualizing light bending near a black hole.
    - [x] **Accretion Disk:** High-performance particle system for disk visualization.
    - [x] **Symplectic Integrator:** Energy-preserving orbits for relativistic particles.
- [ ] **Kerr Metric:** Implementing frame dragging for spinning black holes.
- [ ] **Gravitational Waves:** Visualizing the ripples in spacetime from binary mergers.

---

## 🧶 Soft Body & Wave Physics
**Goal:** Realistic deformation and wave propagation.

- [ ] **Soft Body**
    - **Tearing/Fracture:** Allow high-stress springs to break.
    - **Self-Collision:** Prevent cloth from clipping through itself.
    - **Aerodynamics:** Lift and drag calculations for cloth (flags, sails).
- [ ] **Wave Interference**
    - **Huygens-Fresnel Viz:** Visualizing wavefront propagation points.
    - **Doppler Effect:** Moving sources to demonstrate frequency shift.
    - **3D Wave Tank:** Extruding the 2D heightmap into a 3D surface view.

---

## 🔥 Thermodynamics
**Goal:** Simulate statistical mechanics and macroscopic properties from microscopic particle interactions.

- [x] **Entropy Lab**
    - [x] **GPU Particle Simulation:** 20,000 hard-sphere collisions using WebGPU.
    - [x] **Maxwell's Demon:** Interactive sorting of particles by energy.
    - [ ] **Phase Transitions:** Simulate freezing and boiling (gas to liquid/solid states).

---

## ⚡ Electronics Audit Follow-up
**Goal:** Address the priority findings from the Electronics & Circuits simulation audit.

- [x] **Topological Pre-processing (High Priority)**
    - [x] Collapse nodes connected by ideal wires before MNA stamping.
    - [x] Exclude explicit wire components from the admittance matrix.
- [x] **Drag Performance (High Priority)**
    - [x] Use mutable drag preview during pointer move.
    - [x] Commit final component position to React state on mouse up.
- [x] **Short Circuit Protection (Medium Priority)**
    - [x] Detect shorted/parallel ideal voltage source conflicts and show a user-facing error.
- [x] **Animation Loop Hygiene (Medium Priority)**
    - [x] Move phasor/waveform animation to managed `requestAnimationFrame` with cleanup.
- [x] **Accessibility Pass (Low/Medium Priority)**
    - Add ARIA labels and keyboard affordances to circuit canvas interactions.

---

## 🤝 Community & Contribution
- [ ] **Scenario Sharing:** Export/Import simulation states via JSON or URL parameters.
- [ ] **Workshop Mode:** Allow users to write custom JS/GLSL scripts to define forces or initial conditions.
