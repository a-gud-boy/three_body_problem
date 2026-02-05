# ⚡ Performance Optimization: BodyLabelsOverlay

**Branch:** `perf/optimize-overlay`
**Component:** `BodyLabelsOverlay` in `src/pages/ThreeBody/ThreeBodyPage.jsx`

## 💡 What Changed
The `BodyLabelsOverlay` component was refactored to remove the per-frame React state update loop.

**Before:**
- The component used `useState` to store an array of label positions.
- A `requestAnimationFrame` loop calculated new positions and called `setLabelPositions`.
- This triggered a full React reconciliation and re-render of the component tree for every single animation frame (60fps+).

**After:**
- The component uses `useRef` to hold references to the label DOM elements.
- A `requestAnimationFrame` loop calculates positions and directly updates the `transform` style of the DOM elements.
- React state (`bodyCount`) is only updated when the number of bodies changes (e.g., scenario reset).
- A shared `THREE.Vector3` object is used for calculations to reduce garbage collection pressure.

## 🎯 Why
- **Reduced Main Thread Blocking:** removing React reconciliation from the animation loop frees up significant CPU time for the physics engine and WebGL renderer.
- **Lower Memory Churn:** Reusing vector objects prevents thousands of short-lived objects from being created every second.
- **Smoother Animation:** Direct DOM manipulation usually results in smoother visual updates compared to React state-driven renders in high-frequency scenarios.

## 📊 Verification
- **Linting:** Code passes `eslint` checks.
- **Functionality:** The overlay logic preserves the original behavior:
    - Labels follow bodies in 3D space.
    - Labels are hidden when behind the camera or out of bounds.
    - Labels update mass and color attributes correctly when scenario data changes.
    - "Cockpit Mode" behavior (hiding the target body's label) is preserved.
