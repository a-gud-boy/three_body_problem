# General Relativity Simulator

## 🔬 Physics Accuracy

### ~~1. Upgrade the Integrator (Euler → Leapfrog/Verlet)~~ ✅
~~`CPUGravityParticles.jsx` uses **basic Euler integration**. Euler is first-order and causes energy drift — orbits will spiral outward or inward over time. Switching to **Symplectic (Leapfrog) Euler** or **Velocity Verlet** would preserve orbital energy much better, and it's only ~5 extra lines of code. The same issue exists in `TSLParticles.jsx` on the GPU side.~~

### ~~2. ISCO Not Enforced on Particle Respawn~~ ✅
~~In `initializers.js`, the disk correctly starts at `rs * 3.0` (ISCO) for relativistic mode. But in `CPUGravityParticles.jsx`, when a particle falls into the event horizon and respawns, it respawns at `r = 80` with a **Newtonian** velocity formula regardless of the current physics model. It should respect the `type` parameter and use the Paczyński-Wiita orbital velocity.~~

### ~~3. Missing Photon Sphere Visualization~~ ✅
~~The photon sphere at `r = 1.5 × Rs` is one of the most striking features of a black hole. Render it as a faint glowing shell or a ring where light orbits once before escaping. The ray marcher already handles lensing at this radius, but an explicit visual indicator would be educational.~~

### ~~4. Frame Dragging / Kerr Black Hole Option~~ ✅
~~Currently simulating a Schwarzschild (non-rotating) black hole. Adding even a simplified **Kerr metric** effect would be stunning — the accretion disk would tilt/precess, and the lensing would become asymmetric. This could be a "Spinning BH" preset.~~

---

## 🎨 Visual & UX Improvements

### ~~5. The Black Hole Sphere Itself Is Invisible~~ ✅
~~There's no explicit event horizon mesh — the black region comes only from the ray marcher returning `vec3(0.0)`. When lensing is disabled, **there's nothing** at the center visually representing the black hole. Adding a dark sphere (with a subtle edge glow from Hawking radiation or a purple corona) at `r = Rs` would dramatically improve the non-lensing mode.~~

### ~~6. Accretion Disk Color Model Is Inverted~~ ✅
~~In `LensingEffect.jsx`: `mix(vec3(1.0, 0.3, 0.05), vec3(0.1, 0.4, 1.0), t)` maps hot→orange and cool→blue. Astrophysically, the **inner** disk should be hotter and therefore **bluer/whiter**, and the outer disk should be redder/cooler. The `t` variable mapping seems correct (inner=hot=1.0), but the color mapping goes from orange to blue which is backward for a blackbody spectrum. Consider using a proper blackbody gradient: red → orange → yellow → white → blue-white.~~

### ~~7. Gravitational Time Dilation Visualization~~ ✅
~~Since the Paczyński-Wiita potential is already implemented, this could show **time dilation** near the black hole. A particle clock overlay or color-coding particles by their local proper time vs. coordinate time would be an amazing educational feature.~~

### ~~8. Einstein Ring Effect~~ ✅
~~When the camera aligns exactly behind the black hole relative to a background light source, an **Einstein ring** should appear. The ray marcher should already produce this naturally, but adding a special bright background object (like a single distant star or galaxy) would make the ring dramatically visible.~~

---

## 🐛 Bugs & Code Issues

### ~~9. Redundant/Dead Ray Position Update~~ ✅
~~In `LensingEffect.jsx`, line 120 does `rayPos += rayDir * STEP_SIZE * r` but then lines 128-142 recalculate `stepDist` and line 142 does `rayPos += rayDir * stepDist`. The ray is effectively **stepped twice** per iteration which causes visual artifacts — the first step (line 120) should be removed.~~

### ~~10. `tempVec` Is Shared Across Particles~~ ✅
~~In `CPUGravityParticles.jsx`, `tempVec` is a single `THREE.Vector3` used in a `useMemo`. While `calculateAcceleration` does `outVector.x += ...`, the vector is reset to `(0,0,0)` each iteration, so it works — but it's fragile. If multiple gravitational sources are ever added, this pattern will silently produce wrong results.~~

### ~~11. TSLParticles Never Respawns Particles That Fall In~~ ✅
~~`CPUGravityParticles.jsx` respawns particles at the event horizon, but `TSLParticles.jsx` has **no such logic** — particles that cross `r < Rs` will accumulate at the center and never return, gradually depleting the visible disk.~~

### ~~12. Accretion Disk Colors Aren't Used~~ ✅
~~`initializers.js` generates a `colors` array but `CPUGravityParticles.jsx` never applies it — it uses a flat `#ffa500` material instead. Either use the per-particle colors via `instanceColor` or remove the dead code.~~

---

## 🚀 Performance

### ~~13. CPU Particles Are Slow at 5000 with Per-Frame JS Loops~~ ✅
~~5000 particles with per-frame JS physics is expensive. Consider:
- Moving the CPU particle sim to a **Web Worker** (the `workers/` directory already exists)
- Or bumping the WebGPU `TSLParticles` count (currently 50,000) and making WebGPU the default~~

### ~~14. Ray Marcher Step Count (1000) Is Extreme~~ ✅
~~Most black hole ray marchers work well with 200–400 steps. 1000 steps with dynamic step sizing means many fragments terminate early, but the GPU still allocates full loop capacity. Consider lowering `MAX_STEPS` to 300–400 and tuning `STEP_SIZE` to compensate.~~
