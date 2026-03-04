# Interactive Physics Simulations

A suite of high-performance, interactive physics simulations built with **React**, **Three.js**, and **WebGPU**. Explore fundamental forces, chaotic systems, fluid dynamics, and quantum mechanics directly in your browser.

**Live Demo:** [https://a-gud-boy.github.io/three_body_problem/](https://a-gud-boy.github.io/three_body_problem/)

---

## 🌟 Overview

This project is a collection of educational and experimental physics engines designed to visualize complex mathematical concepts in real-time. From the chaotic orbits of the Three-Body Problem to the fluid dynamics of water ripples computed on the GPU, each simulation offers interactive controls to tweak parameters and observe the results.

### Key Features
- **Real-Time Physics:** High-performance integration (Verlet, RK4, Euler) running at 60+ FPS.
- **WebGPU Acceleration:** Next-generation compute shaders for massive particle systems, fluid simulation, and quantum wavefunctions.
- **Interactive Sandbox:** Drag bodies, draw barriers, pour fluids, and manipulate fields with intuitive mouse controls.
- **Scientific Accuracy:** Visualization of phase space, energy conservation, field lines, and wave interference patterns.
- **Buffer Packing Strategy:** Optimized WebGPU implementations that bypass hardware limits for complex simulations (LBM).
- **Performance Optimization:** Route-level code splitting using `React.lazy()` and `Suspense` for lightning-fast initial load times.

---

## 🚀 Simulations

### 🌌 Gravity & Chaos
| Simulation | Description | Key Tech |
| :--- | :--- | :--- |
| **[Three-Body Problem](./src/pages/ThreeBody)** | Visualize the chaotic dance of three celestial bodies. Features energy analysis, phase space plots, and preset scenarios (Figure-8, Lagrange Points). | `Runge-Kutta 4`, `Trails`, `Energy Plots` |
| **[Double Pendulum](./src/pages/DoublePendulum)** | Explore the "Butterfly Effect" with a sensitive double pendulum. Includes shadow mode to visualize divergence of initial conditions. | `Chaos Theory`, `Phase Space (θ₁ vs ω₁)` |
| **[General Relativity](./src/pages/GeneralRelativity)** | Experience gravitational lensing and accretion disks around a Schwarzschild/Kerr black hole using relativistic ray-marching. | `General Relativity`, `Ray Marching`, `Accretion Disk` |

### 💧 Fluid Dynamics
| Simulation | Description | Key Tech |
| :--- | :--- | :--- |
| **[Virtual Wind Tunnel](./src/pages/Aerodynamics)** | High-performance aerodynamics simulation using the Lattice Boltzmann Method (D2Q9). Visualize vorticity, speed, and pressure around custom obstacles. | `WebGPU`, `LBM`, `Buffer Packing` |
| **[Fluid Dynamics](./src/pages/FluidDynamics)** | Interactive water surface simulation using the Wave Equation. Visualize ripples, rain, and storms with WebGPU compute shaders. | `WebGPU`, `Wave Equation`, `Vertex Displacement` |
| **[Wave Interference](./src/pages/WaveInterference)** | 2D Ripple Tank simulation. Experiment with diffraction, refraction, reflection, and multi-source interference patterns. | `Wave Equation`, `Pixel Buffer` |

### ⚛️ Fields & Matter
| Simulation | Description | Key Tech |
| :--- | :--- | :--- |
| **[Quantum Sandbox](./src/pages/QuantumSandbox)** | 2D Quantum mechanics simulation of the Time-Dependent Schrödinger Equation. Watch wave packets tunnel through barriers and interfere. | `WebGPU`, `Schrödinger Equation`, `Complex Math` |
| **[Atom Simulator](./src/pages/AtomSimulator)** | Interactive Bohr model visualizer. Build compounds from the periodic table and explore electron shells. | `Bohr Model`, `Compound Builder` |
| **[Electromagnetic Fields](./src/pages/Electromagnetic)** | Visualize electric fields and forces. Place charges, trace field lines, and observe dipole interactions. | `Field Line Tracing`, `Coulomb's Law` |
| **[Soft Body Physics](./src/pages/SoftBody)** | Deformable object simulation using mass-spring systems. Play with cloth, jelly, and rope bridges. | `Verlet Integration`, `PBD (Position Based Dynamics)` |

### 🔥 Thermodynamics
| Simulation | Description | Key Tech |
| :--- | :--- | :--- |
| **[Entropy Lab](./src/pages/Thermodynamics)** | 20,000 particle hard-sphere simulation using WebGPU. Experiment with Ideal Gas Law, Adiabatic processes, and Maxwell's Demon. | `WebGPU`, `Collision Detection`, `Maxwell's Demon` |

### 🔌 Electronics
| Simulation | Description | Key Tech |
| :--- | :--- | :--- |
| **[Electronics & Circuits](./src/pages/Electronics)** | Interactive circuit simulator with AC phasors, diode waveform shaping, and network theorem sandbox. | `Circuit Simulation`, `AC Phasors`, `Oscilloscope` |

---

## 🛠️ Tech Stack

- **Frontend:** [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **3D & Graphics:** [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [WebGPU](https://www.w3.org/TR/webgpu/)
- **Styling:** [TailwindCSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Icons)
- **Testing:** Vitest, Playwright

---

## 💻 Development Setup

### Prerequisites
- Node.js ≥ 18 (20+ recommended)
- A browser with WebGPU support (Chrome 113+, Edge 113+) for experimental features.

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/a-gud-boy/three_body_problem.git
    cd three_body_problem
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173/` to view the project.

### Building for Production
```bash
npm run build
# Preview the build locally
npm run preview
```

---

## 🧪 Testing

The project uses Vitest for unit tests and Playwright for end-to-end verification.

```bash
# Run unit tests
npm test

# Run UI verification (requires Playwright setup)
npx playwright test
```

---

## 🤝 Contributing

Contributions are welcome! Please check the [ROADMAP.md](./ROADMAP.md) for planned features.

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License**.
