# Project Roadmap

This document outlines the planned features and improvements for the Three-Body Problem simulation.

## 🚀 Phase 1: Core Performance & Physics
Focus on stability, accuracy, and simulation capacity.


- [ ] **Adaptive Timesteps**
    - Dynamically adjust time steps (dt) based on particle proximity to ensure accuracy during close encounters / slingshots.
- [ ] **Spatial Indexing (Barnes-Hut)**
    - Implement Octree/Barnes-Hut algorithm to support simulations with >1000 bodies (N-body simulation).

## 🎨 Phase 2: Advanced Visualization
Focus on graphical fidelity and "wow" factor.

- [ ] **Post-Processing Effects**
    - **Bloom**: Add glowing effects to stars and bodies.
    - **Motion Blur**: Visual feedback for high-velocity objects.
- [ ] **Enhanced Trails**
    - Fade-out trails (opacity gradient).
    - Velocity-colored trails (Red = Fast, Blue = Slow).
    - Ribbon trails using `Mesh` lines instead of `GL_LINES` for variable thickness.
- [ ] **Cinematic Camera**
    - "Director Mode": Auto-dolly and focus on interesting events (collisions, ejections).
    - Smooth transitions between camera modes.

## 🛠️ Phase 3: Interactive Tools & Features
Focus on user creativity and analysis.

- [ ] **Custom System Builder**
    - Interface to click-and-drag to add bodies.
    - "Slingshot" control to set initial velocity vector.
    - Panel to manually edit mass, position, and color of existing bodies.

- [ ] **Analysis Suite**

    - **Phase Space**: Visualization of momentum vs position.
    - **Poincaré Sections**: For advanced chaos analysis.

## � Phase 4: Polish & Experience
Focus on accessibility and usability.

- [ ] **Mobile & Touch Support**
    - On-screen joysticks for camera control.
    - Touch-optimized UI scale.
- [ ] **Onboarding & Tutorial**
    - Guided tour explaining chaos theory concepts.
    - "Challenge Mode": Achieve a stable orbit or hit a target.
- [ ] **Theming**
    - Dark/Light modes.
    - "Retro" Vector/CRT style.
    - Minimalist/Academic style.
