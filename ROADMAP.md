# Project Roadmap

This document outlines the planned features, improvements, and research goals for the **Interactive Physics Simulations** suite.

---

## 🌍 Platform & Core Architecture
**Goal:** Establish a robust, high-performance foundation for all simulations.

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

- [ ] **WebGPU Enhancements (Experimental Fluid)**
    - **Caustics:** Realistic light refraction patterns on the pool floor.
    - **Foam & Spray:** Particle emission at high-velocity crests.
    - **Dynamic Obstacles:** allow users to place interactive shapes that affect the water surface.
- [ ] **SPH Improvements (Fluid Dynamics)**
    - **Spatial Hashing Optimization:** Improve performance for higher particle counts (>5000).
    - **Surface Tension:** Better modeling of droplet formation and cohesion.
    - **Multiphase Flow:** Simulation of oil/water interaction.

---

## ⚛️ Quantum & Atomic Physics
**Goal:** Visualize the invisible world of atoms and fields.

- [ ] **Atom Simulator**
    - **3D Electron Orbitals:** Volumetric rendering of s, p, d, f orbitals instead of 2D sprites.
    - **Reaction Simulator:** Drag-and-drop atoms to see real-time bonding (ionic/covalent) animations.
- [ ] **Electromagnetic Fields**
    - **Magnetic Field Simulation:** Add current-carrying wires and magnets (B-fields).
    - **Time-Varying Fields:** Visualize induced currents (Faraday's Law).
    - **Flux Visualization:** 3D isosurfaces for electric potential.

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

## 🤝 Community & Contribution
- [ ] **Scenario Sharing:** Export/Import simulation states via JSON or URL parameters.
- [ ] **Workshop Mode:** Allow users to write custom JS/GLSL scripts to define forces or initial conditions.
