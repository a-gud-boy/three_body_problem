
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Read the worker file content
const workerPath = path.resolve('src/workers/grParticleWorker.js');
const workerCode = fs.readFileSync(workerPath, 'utf8');

test('GR Particle Worker Protocol Compatibility', async (t) => {
    // Mock the Web Worker environment
    const self = {
        postMessage: () => {},
        onmessage: null
    };

    // Create a function to simulate the worker execution
    const runWorker = new Function('self', 'Float32Array', workerCode + '\nreturn self;');
    const mockedWorker = runWorker(self, Float32Array);

    await t.test('should initialize and respond with READY', () => {
        let readyReceived = false;
        self.postMessage = (msg) => {
            if (msg.type === 'READY') readyReceived = true;
        };

        const positions = new Float32Array(3).buffer;
        const velocities = new Float32Array(3).buffer;

        self.onmessage({
            data: {
                type: 'INIT',
                positions,
                velocities,
                count: 1
            }
        });

        assert.ok(readyReceived, 'Worker should send a READY message');
    });

    await t.test('should process UPDATE and return RESULT', () => {
        let resultMessage = null;
        self.postMessage = (msg) => {
            if (msg.type === 'RESULT') resultMessage = msg;
        };

        const positions = new Float32Array([10, 0, 0]);
        const velocities = new Float32Array([0, 0, 0]);

        // First INIT
        self.onmessage({
            data: {
                type: 'INIT',
                positions: positions.buffer,
                velocities: velocities.buffer,
                count: 1
            }
        });

        // Then UPDATE
        self.onmessage({
            data: {
                type: 'UPDATE',
                params: {
                    dt: 0.1,
                    mass: 1000,
                    physicsModel: 'relativistic',
                    speedOfLight: 100,
                    spin: 0,
                    bounds: 100,
                    iscoR: 6,
                    maxSpawnR: 80
                },
                positions: positions.buffer,
                velocities: velocities.buffer
            }
        });

        assert.ok(resultMessage, 'Worker should send a RESULT message');
        assert.ok(resultMessage.positions, 'Result should contain positions');
        assert.ok(resultMessage.velocities, 'Result should contain velocities');

        const newPos = new Float32Array(resultMessage.positions);
        // Initial x was 10. Relativistic force should pull it towards 0.
        // v = a*dt, p = p + v*dt.
        // Force is negative (towards origin).
        assert.ok(newPos[0] < 10, 'Position should have decreased');
    });
});
