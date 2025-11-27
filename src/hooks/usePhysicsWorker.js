/**
 * usePhysicsWorker Hook
 * 
 * Manages Web Worker lifecycle for physics calculations.
 * Provides seamless integration with the simulation loop.
 */

import { useRef, useEffect, useCallback, useState } from 'react';

export function usePhysicsWorker() {
    const workerRef = useRef(null);
    const pendingCallbackRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [isSupported, setIsSupported] = useState(true);

    // Initialize worker
    useEffect(() => {
        // Check for Web Worker support
        if (typeof Worker === 'undefined') {
            console.warn('Web Workers not supported, falling back to main thread physics');
            setIsSupported(false);
            return;
        }

        try {
            // Create worker from the worker file
            // Using URL constructor for Vite compatibility
            workerRef.current = new Worker(
                new URL('../workers/physicsWorker.js', import.meta.url),
                { type: 'module' }
            );

            // Handle messages from worker
            workerRef.current.onmessage = (e) => {
                const { type, bodies, stats, removedIndices } = e.data;

                if (type === 'READY') {
                    setIsReady(true);
                    console.log('Physics worker initialized');
                } else if (type === 'RESULT') {
                    // Call pending callback with results
                    if (pendingCallbackRef.current) {
                        pendingCallbackRef.current({ bodies, stats, removedIndices });
                        pendingCallbackRef.current = null;
                    }
                }
            };

            // Handle errors
            workerRef.current.onerror = (error) => {
                console.error('Physics worker error:', error);
                setIsSupported(false);
            };
        } catch (error) {
            console.error('Failed to create physics worker:', error);
            setIsSupported(false);
        }

        // Cleanup on unmount
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);

    /**
     * Update physics using the worker
     * @param {Array} bodies - Array of body objects
     * @param {Object} config - Physics configuration
     * @param {Function} callback - Called with { bodies, stats, removedIndices }
     */
    const updatePhysics = useCallback((bodies, config, callback) => {
        if (!workerRef.current || !isReady) {
            return false; // Worker not available
        }

        // Store callback for when result arrives
        pendingCallbackRef.current = callback;

        // Send data to worker
        // Clone bodies to avoid transferable issues
        const bodiesData = bodies.map(b => ({
            x: b.x,
            y: b.y,
            z: b.z,
            vx: b.vx,
            vy: b.vy,
            vz: b.vz,
            mass: b.mass,
            color: b.color
        }));

        workerRef.current.postMessage({
            type: 'UPDATE',
            bodies: bodiesData,
            config
        });

        return true; // Worker accepted the task
    }, [isReady]);

    /**
     * Terminate the worker
     */
    const terminate = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
            setIsReady(false);
        }
    }, []);

    return {
        updatePhysics,
        terminate,
        isReady,
        isSupported
    };
}

export default usePhysicsWorker;
