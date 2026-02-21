
import fs from 'node:fs';
import path from 'node:path';

// Read the worker file content
const workerPath = path.resolve('src/workers/physicsWorker.js');
const workerCode = fs.readFileSync(workerPath, 'utf8');

describe('Physics Worker Protocol Compatibility', () => {
    // Mock the Web Worker environment
    const self = {
        postMessage: () => { },
        onmessage: null
    };

    // Create a function to simulate the worker execution
    // We wrap the code to avoid polluting the global scope too much
    // and to handle 'self' and 'Float32Array'
    const runWorker = new Function('self', 'Float32Array', workerCode + '\nreturn self;');
    runWorker(self, Float32Array);

    it('should calculate energy when shouldCalculateEnergy is true', () => {
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

        expect(lastMessage).toBeTruthy();
        expect(lastMessage.stats).toBeTruthy();
        expect(typeof lastMessage.stats.total).toBe('number', 'Total energy should be a number');
        expect(lastMessage.stats.total !== 0).toBeTruthy();
    });

    it('should skip energy calculation when shouldCalculateEnergy is false', () => {
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

        expect(lastMessage).toBeTruthy();
        expect(lastMessage.stats).toBeTruthy();
        expect(lastMessage.stats.total).toBe(undefined, 'Total energy should be undefined');
        expect(lastMessage.stats.ke).toBe(undefined, 'KE should be undefined');
        expect(lastMessage.stats.pe).toBe(undefined, 'PE should be undefined');
        expect(typeof lastMessage.stats.time).toBe('number', 'Time should still be present');
    });
});
