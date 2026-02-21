import SoftBodyPhysics from './SoftBodyPhysics.js';

test('SoftBodyPhysics: initializes with correct dimensions', () => {
    const physics = new SoftBodyPhysics(800, 600);
    expect(physics.width).toBe(800);
    expect(physics.height).toBe(600);
    expect(physics.particles.length).toBe(0);
    expect(physics.springs.length).toBe(0);
});

test('SoftBodyPhysics: addParticle adds particle to array', () => {
    const physics = new SoftBodyPhysics(800, 600);
    const p = physics.addParticle(100, 200, 1, false);

    expect(physics.particles.length).toBe(1);
    expect(p.x).toBe(100);
    expect(p.y).toBe(200);
    expect(p.mass).toBe(1);
    expect(p.locked).toBe(false);
});

test('SoftBodyPhysics: addSpring adds spring to array', () => {
    const physics = new SoftBodyPhysics(800, 600);
    const p1 = physics.addParticle(100, 100);
    const p2 = physics.addParticle(200, 100);
    physics.addSpring(p1, p2, 0.5);

    expect(physics.springs.length).toBe(1);
    const s = physics.springs[0];
    expect(s.p1).toBe(p1);
    expect(s.p2).toBe(p2);
    // Length should be 100
    expect(s.restLength).toBe(100);
    expect(s.stiffness).toBe(0.5);
});

test('SoftBodyPhysics: createBox creates correct grid of particles', () => {
    const physics = new SoftBodyPhysics(800, 600);
    // 3x3 grid = 9 particles
    // Springs:
    //  Horizontal: 3 rows * 2 cols = 6
    //  Vertical: 2 rows * 3 cols = 6
    //  Diagonal: 2 rows * 2 cols * 2 (cross) = 8
    // Total springs = 6 + 6 + 8 = 20
    physics.createBox(100, 100, 3, 3, 20, 0.5, 0.1);

    expect(physics.particles.length).toBe(9);
    expect(physics.springs.length).toBe(20);
});

test('SoftBodyPhysics: createRope creates chain of particles', () => {
    const physics = new SoftBodyPhysics(800, 600);
    // 5 segments = 1 locked start + 5 new = 6 particles
    // 5 springs
    physics.createRope(100, 100, 5, 20, 0.5);

    expect(physics.particles.length).toBe(6);
    expect(physics.springs.length).toBe(5);
    expect(physics.particles[0].locked).toBe(true);
});

test('SoftBodyPhysics: createJelly creates connected structure', () => {
    const physics = new SoftBodyPhysics(800, 600);
    // 6 segments
    // 1 center + 6 rim = 7 particles
    // Springs:
    //  6 spokes
    //  6 rim connections
    //  6 cross connections
    // Total = 18 springs
    physics.createJelly(400, 300, 50, 6, 0.5);

    expect(physics.particles.length).toBe(7);
    expect(physics.springs.length).toBe(18);
});

test('SoftBodyPhysics: update applies gravity', () => {
    const physics = new SoftBodyPhysics(800, 600);
    physics.gravity = 1.0;
    const p = physics.addParticle(100, 100);

    const mouse = { x: 0, y: 0, isPressed: false, draggedParticle: null };
    physics.update(mouse);

    // y should increase (fall down)
    // Initially vy=0, fx=0, fy=0.5 (gravity * 0.5)
    // newY = y + vy + fy = 100 + 0 + 0.5 = 100.5
    expect(p.y > 100).toBeTruthy();
});

test('SoftBodyPhysics: boundaries constrain particles', () => {
    const physics = new SoftBodyPhysics(800, 600);
    physics.gravity = 0;

    // Particle at bottom edge
    const p = physics.addParticle(400, 650); // Outside height (600)
    p.radius = 10;

    // Force update to trigger constraints
    physics.solveBoundaries();

    // Should be clamped to height - radius = 600 - 10 = 590
    expect(p.y).toBe(590);
});

test('SoftBodyPhysics: findNearestParticle finds closest within radius', () => {
    const physics = new SoftBodyPhysics(800, 600);
    const p1 = physics.addParticle(100, 100);
    physics.addParticle(200, 200);

    const nearest = physics.findNearestParticle(105, 105, 50);
    expect(nearest).toBe(p1);

    const none = physics.findNearestParticle(500, 500, 50);
    expect(none).toBe(null);
});

test('SoftBodyPhysics: reset clears state', () => {
    const physics = new SoftBodyPhysics(800, 600);
    physics.addParticle(100, 100);
    physics.reset();

    expect(physics.particles.length).toBe(0);
    expect(physics.springs.length).toBe(0);
});
