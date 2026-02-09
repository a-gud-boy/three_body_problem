
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Read the worker file content
const workerPath = path.resolve('src/workers/physicsWorker.js');
const workerCode = fs.readFileSync(workerPath, 'utf8');

test('Physics Worker Protocol Compatibility', async (t) => {
    // Mock the Web Worker environment
    const self = {
        postMessage: () => {},
        onmessage: null
    };

    // Create a function to simulate the worker execution
    // We wrap the code to avoid polluting the global scope too much
    // and to handle 'self' and 'Float32Array'
    const runWorker = new Function('self', 'Float32Array', workerCode + '\nreturn self;');
    const mockedWorker = runWorker(self, Float32Array);

    await t.test('should calculate energy when shouldCalculateEnergy is true', () => {
        let lastMessage = null;
        self.postMessage = (msg) => {
            if (msg.type === 'RESULT') lastMessage = msg;
        };

        const bodies = [
            { x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, mass: 1 },
            { x: 1, y: 0, z: 0, vx: -1, vy: 0, vz: 0, mass: 1 }
        ];

        self.onmessage({
            data: {
                type: 'UPDATE',
                bodies,
                config: {
                    shouldCalculateEnergy: true,
                    gravityG: 1
                }
            }
        });

        assert.ok(lastMessage, 'Worker should send a RESULT message');
        assert.ok(lastMessage.stats, 'Result should contain stats');
        assert.strictEqual(typeof lastMessage.stats.total, 'number', 'Total energy should be a number');
        assert.ok(lastMessage.stats.total !== 0, 'Total energy should be non-zero');
    });

    await t.test('should skip energy calculation when shouldCalculateEnergy is false', () => {
        let lastMessage = null;
        self.postMessage = (msg) => {
            if (msg.type === 'RESULT') lastMessage = msg;
        };

        const bodies = [
            { x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, mass: 1 },
            { x: 1, y: 0, z: 0, vx: -1, vy: 0, vz: 0, mass: 1 }
        ];

        self.onmessage({
            data: {
                type: 'UPDATE',
                bodies,
                config: {
                    shouldCalculateEnergy: false,
                    gravityG: 1
                }
            }
        });

        assert.ok(lastMessage, 'Worker should send a RESULT message');
        assert.ok(lastMessage.stats, 'Result should contain stats');
        assert.strictEqual(lastMessage.stats.total, undefined, 'Total energy should be undefined');
        assert.strictEqual(lastMessage.stats.ke, undefined, 'KE should be undefined');
        assert.strictEqual(lastMessage.stats.pe, undefined, 'PE should be undefined');
        assert.strictEqual(typeof lastMessage.stats.time, 'number', 'Time should still be present');
    });
});
