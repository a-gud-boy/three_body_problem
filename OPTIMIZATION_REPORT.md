# ⚡ Performance Optimization: WebGPU Buffer Packing

**Component:** `AerodynamicsPage` / `WebGPUWindTunnel`
**Technique:** Distribution Function Packing for LBM

## 💡 The Problem
The Lattice Boltzmann Method (D2Q9 model) requires tracking 9 distribution functions ($f_0$ to $f_8$) per grid cell. Additionally, for the simulation to be useful, we need to track macroscopic properties like density ($\rho$) and velocity ($u_x, u_y$).

WebGPU often has a limit on the number of storage buffers (typically **8**) that can be bound to a single shader stage. A naive implementation using one buffer per variable would require:
- 9 buffers for current state
- 9 buffers for next state (ping-pong)
- 1 buffer for obstacle data
- **Total: 19 buffers** (exceeding the limit)

## 🎯 The Solution: Packing
We refactored the engine to pack multiple distributions into `vec4` storage buffers:

- **fPack0 (vec4):** $f_0, f_1, f_2, f_3$
- **fPack1 (vec4):** $f_4, f_5, f_6, f_7$
- **fPack2 (vec4):** $f_8, \rho, u_x, u_y$

This reduces the required bindings per pass significantly:
- **Inlet Pass:** 3 bindings (A0, A1, A2)
- **LBM Compute Pass:** 7 bindings (3 read A, 3 write B, 1 obstacle)
- **Swap Pass:** 6 bindings (3 read B, 3 write A)

## 📊 Benefits
- **Hardware Compatibility:** Runs on mobile and lower-end desktop GPUs that enforce the 8-buffer limit.
- **Memory Coalescing:** Packing related data into `vec4` improves memory access patterns on the GPU.
- **Performance:** Enabled a 768x768 stable simulation at 60 FPS on mid-range hardware.

---

# ⚡ Performance Optimization: BodyLabelsOverlay

**Component:** `BodyLabelsOverlay` in `src/pages/ThreeBody/ThreeBodyPage.jsx`

## 💡 What Changed
The `BodyLabelsOverlay` component was refactored to remove the per-frame React state update loop.

- **Before:** Used `useState` and `setLabelPositions` every frame, triggering a full React reconciliation at 60fps.
- **After:** Uses `useRef` for DOM elements and direct `transform` style updates via `requestAnimationFrame`.

## 🎯 Why
- **Reduced Main Thread Blocking:** Removing React reconciliation from the animation loop frees up significant CPU time.
- **Lower Memory Churn:** Reusing vector objects prevents thousands of short-lived objects from being created every second.
