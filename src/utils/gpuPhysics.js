/**
 * GPU Physics Engine using WebGL2
 * 
 * Uses floating-point textures to store body state and compute forces in parallel.
 * Each pixel represents one body's data.
 * 
 * Texture Layout:
 * - Position Texture: (x, y, z, mass) per pixel
 * - Velocity Texture: (vx, vy, vz, unused) per pixel
 * 
 * The fragment shader computes gravitational forces for all pairs simultaneously.
 */

class GPUPhysicsEngine {
    constructor() {
        this.gl = null;
        this.canvas = null;
        this.isInitialized = false;
        this.isSupported = false;
        this.maxBodies = 1024; // Max bodies we can simulate (32x32 texture)
        this.textureSize = 32; // sqrt(maxBodies)
        
        // WebGL resources
        this.positionTexture = null;
        this.velocityTexture = null;
        this.outputPositionTexture = null;
        this.outputVelocityTexture = null;
        this.framebuffer = null;
        this.program = null;
        this.quadBuffer = null;
        
        // Check support and initialize
        this.checkSupport();
    }
    
    checkSupport() {
        try {
            const testCanvas = document.createElement('canvas');
            const gl = testCanvas.getContext('webgl2');
            
            if (!gl) {
                console.warn('WebGL2 not supported');
                this.isSupported = false;
                return;
            }
            
            // Check for float texture support
            const ext = gl.getExtension('EXT_color_buffer_float');
            if (!ext) {
                console.warn('EXT_color_buffer_float not supported');
                this.isSupported = false;
                return;
            }
            
            this.isSupported = true;
        } catch (e) {
            console.error('GPU physics support check failed:', e);
            this.isSupported = false;
        }
    }
    
    initialize() {
        if (!this.isSupported || this.isInitialized) return false;
        
        try {
            // Create offscreen canvas for GPU compute
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.textureSize;
            this.canvas.height = this.textureSize;
            
            this.gl = this.canvas.getContext('webgl2', {
                antialias: false,
                depth: false,
                stencil: false,
                preserveDrawingBuffer: true
            });
            
            if (!this.gl) {
                throw new Error('Failed to get WebGL2 context');
            }
            
            const gl = this.gl;
            
            // Enable required extensions
            gl.getExtension('EXT_color_buffer_float');
            gl.getExtension('OES_texture_float_linear');
            
            // Create shader program
            this.program = this.createProgram();
            if (!this.program) {
                throw new Error('Failed to create shader program');
            }
            
            // Create textures for ping-pong rendering
            this.positionTexture = this.createFloatTexture();
            this.velocityTexture = this.createFloatTexture();
            this.outputPositionTexture = this.createFloatTexture();
            this.outputVelocityTexture = this.createFloatTexture();
            
            // Create framebuffer
            this.framebuffer = gl.createFramebuffer();
            
            // Create fullscreen quad
            this.quadBuffer = this.createQuadBuffer();
            
            this.isInitialized = true;
            console.log('GPU Physics Engine initialized');
            return true;
            
        } catch (e) {
            console.error('GPU Physics initialization failed:', e);
            this.isSupported = false;
            return false;
        }
    }
    
    createFloatTexture() {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA32F,
            this.textureSize,
            this.textureSize,
            0,
            gl.RGBA,
            gl.FLOAT,
            null
        );
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        return texture;
    }
    
    createQuadBuffer() {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        
        // Fullscreen quad (two triangles)
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1
        ]);
        
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        return buffer;
    }
    
    createProgram() {
        const gl = this.gl;
        
        // Vertex shader - simple passthrough
        const vertexSource = `#version 300 es
            in vec2 a_position;
            out vec2 v_texCoord;
            
            void main() {
                v_texCoord = (a_position + 1.0) * 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
        
        // Fragment shader - compute gravitational forces
        const fragmentSource = `#version 300 es
            precision highp float;
            
            uniform sampler2D u_positionTexture;
            uniform sampler2D u_velocityTexture;
            uniform float u_dt;
            uniform float u_G;
            uniform float u_softening;
            uniform int u_bodyCount;
            uniform int u_textureSize;
            uniform int u_outputType; // 0 = position, 1 = velocity
            
            in vec2 v_texCoord;
            layout(location = 0) out vec4 outColor;
            
            vec2 indexToTexCoord(int index) {
                int x = index % u_textureSize;
                int y = index / u_textureSize;
                return (vec2(float(x), float(y)) + 0.5) / float(u_textureSize);
            }
            
            int texCoordToIndex(vec2 coord) {
                int x = int(coord.x * float(u_textureSize));
                int y = int(coord.y * float(u_textureSize));
                return y * u_textureSize + x;
            }
            
            void main() {
                int myIndex = texCoordToIndex(v_texCoord);
                
                // Skip if beyond body count
                if (myIndex >= u_bodyCount) {
                    outColor = vec4(0.0);
                    return;
                }
                
                // Get my current state
                vec4 myPos = texture(u_positionTexture, v_texCoord);  // xyz = position, w = mass
                vec4 myVel = texture(u_velocityTexture, v_texCoord);  // xyz = velocity
                
                float myMass = myPos.w;
                
                if (u_outputType == 1) {
                    // Compute acceleration from all other bodies
                    vec3 acceleration = vec3(0.0);
                    
                    for (int j = 0; j < u_bodyCount; j++) {
                        if (j == myIndex) continue;
                        
                        vec2 otherCoord = indexToTexCoord(j);
                        vec4 otherPos = texture(u_positionTexture, otherCoord);
                        
                        vec3 diff = otherPos.xyz - myPos.xyz;
                        float distSq = dot(diff, diff) + u_softening * u_softening;
                        float dist = sqrt(distSq);
                        float force = u_G * otherPos.w / distSq;  // otherPos.w = other mass
                        
                        acceleration += force * (diff / dist);
                    }
                    
                    // Output new velocity (Euler integration)
                    vec3 newVel = myVel.xyz + acceleration * u_dt;
                    outColor = vec4(newVel, 0.0);
                    
                } else {
                    // Output new position
                    // Use the updated velocity from velocity texture
                    vec3 vel = texture(u_velocityTexture, v_texCoord).xyz;
                    vec3 newPos = myPos.xyz + vel * u_dt;
                    outColor = vec4(newPos, myMass);
                }
            }
        `;
        
        // Compile vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);
        
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
            return null;
        }
        
        // Compile fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);
        
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
            return null;
        }
        
        // Link program
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
        }
        
        // Get uniform locations
        program.uniforms = {
            positionTexture: gl.getUniformLocation(program, 'u_positionTexture'),
            velocityTexture: gl.getUniformLocation(program, 'u_velocityTexture'),
            dt: gl.getUniformLocation(program, 'u_dt'),
            G: gl.getUniformLocation(program, 'u_G'),
            softening: gl.getUniformLocation(program, 'u_softening'),
            bodyCount: gl.getUniformLocation(program, 'u_bodyCount'),
            textureSize: gl.getUniformLocation(program, 'u_textureSize'),
            outputType: gl.getUniformLocation(program, 'u_outputType')
        };
        
        program.attributes = {
            position: gl.getAttribLocation(program, 'a_position')
        };
        
        return program;
    }
    
    uploadBodies(bodies) {
        if (!this.isInitialized) return;
        
        const gl = this.gl;
        const size = this.textureSize;
        const totalPixels = size * size;
        
        // Create position data (x, y, z, mass)
        const positionData = new Float32Array(totalPixels * 4);
        
        // Create velocity data (vx, vy, vz, 0)
        const velocityData = new Float32Array(totalPixels * 4);
        
        for (let i = 0; i < bodies.length && i < this.maxBodies; i++) {
            const b = bodies[i];
            const offset = i * 4;
            
            positionData[offset] = b.x;
            positionData[offset + 1] = b.y;
            positionData[offset + 2] = b.z;
            positionData[offset + 3] = b.mass;
            
            velocityData[offset] = b.vx;
            velocityData[offset + 1] = b.vy;
            velocityData[offset + 2] = b.vz;
            velocityData[offset + 3] = 0;
        }
        
        // Upload to textures
        gl.bindTexture(gl.TEXTURE_2D, this.positionTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, size, size, gl.RGBA, gl.FLOAT, positionData);
        
        gl.bindTexture(gl.TEXTURE_2D, this.velocityTexture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, size, size, gl.RGBA, gl.FLOAT, velocityData);
    }
    
    step(config) {
        if (!this.isInitialized) return null;
        
        const gl = this.gl;
        const { dt, G, softening, bodyCount } = config;
        
        gl.useProgram(this.program);
        
        // Set common uniforms
        gl.uniform1f(this.program.uniforms.dt, dt);
        gl.uniform1f(this.program.uniforms.G, G);
        gl.uniform1f(this.program.uniforms.softening, softening);
        gl.uniform1i(this.program.uniforms.bodyCount, Math.min(bodyCount, this.maxBodies));
        gl.uniform1i(this.program.uniforms.textureSize, this.textureSize);
        
        // Bind quad buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(this.program.attributes.position);
        gl.vertexAttribPointer(this.program.attributes.position, 2, gl.FLOAT, false, 0, 0);
        
        // PASS 1: Compute new velocities
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.outputVelocityTexture, 0);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.positionTexture);
        gl.uniform1i(this.program.uniforms.positionTexture, 0);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.velocityTexture);
        gl.uniform1i(this.program.uniforms.velocityTexture, 1);
        
        gl.uniform1i(this.program.uniforms.outputType, 1); // Velocity output
        
        gl.viewport(0, 0, this.textureSize, this.textureSize);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        // Swap velocity textures
        [this.velocityTexture, this.outputVelocityTexture] = [this.outputVelocityTexture, this.velocityTexture];
        
        // PASS 2: Compute new positions
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.outputPositionTexture, 0);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.positionTexture);
        gl.uniform1i(this.program.uniforms.positionTexture, 0);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.velocityTexture);
        gl.uniform1i(this.program.uniforms.velocityTexture, 1);
        
        gl.uniform1i(this.program.uniforms.outputType, 0); // Position output
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        // Swap position textures
        [this.positionTexture, this.outputPositionTexture] = [this.outputPositionTexture, this.positionTexture];
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    readBodies(bodyCount) {
        if (!this.isInitialized) return null;
        
        const gl = this.gl;
        const count = Math.min(bodyCount, this.maxBodies);
        
        // Read position data
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.positionTexture, 0);
        
        const positionData = new Float32Array(this.textureSize * this.textureSize * 4);
        gl.readPixels(0, 0, this.textureSize, this.textureSize, gl.RGBA, gl.FLOAT, positionData);
        
        // Read velocity data
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.velocityTexture, 0);
        
        const velocityData = new Float32Array(this.textureSize * this.textureSize * 4);
        gl.readPixels(0, 0, this.textureSize, this.textureSize, gl.RGBA, gl.FLOAT, velocityData);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        // Convert back to body objects
        const bodies = [];
        for (let i = 0; i < count; i++) {
            const offset = i * 4;
            bodies.push({
                x: positionData[offset],
                y: positionData[offset + 1],
                z: positionData[offset + 2],
                mass: positionData[offset + 3],
                vx: velocityData[offset],
                vy: velocityData[offset + 1],
                vz: velocityData[offset + 2]
            });
        }
        
        return bodies;
    }
    
    /**
     * Run a full physics update
     * @param {Array} bodies - Array of body objects
     * @param {Object} config - Physics configuration
     * @returns {Array} - Updated body objects
     */
    update(bodies, config) {
        if (!this.isInitialized) {
            if (!this.initialize()) {
                return null; // GPU not available
            }
        }
        
        const { simSpeed = 1, timeDirection = 1, gravityG = 1 } = config;
        const dt = 0.01 * simSpeed * timeDirection;
        const softening = 0.1;
        
        // Upload current state to GPU
        this.uploadBodies(bodies);
        
        // Run physics step on GPU
        this.step({
            dt,
            G: gravityG,
            softening,
            bodyCount: bodies.length
        });
        
        // Read results back
        const updatedBodies = this.readBodies(bodies.length);
        
        // Preserve colors from original bodies
        if (updatedBodies) {
            for (let i = 0; i < updatedBodies.length; i++) {
                updatedBodies[i].color = bodies[i].color;
            }
        }
        
        return updatedBodies;
    }
    
    /**
     * Calculate total energy (on CPU for simplicity)
     */
    calculateEnergy(bodies, G) {
        let ke = 0, pe = 0;
        
        for (const b of bodies) {
            ke += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);
        }
        
        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const dx = bodies[i].x - bodies[j].x;
                const dy = bodies[i].y - bodies[j].y;
                const dz = bodies[i].z - bodies[j].z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist > 0.1) {
                    pe -= (G * bodies[i].mass * bodies[j].mass) / dist;
                }
            }
        }
        
        return { ke, pe, total: ke + pe };
    }
    
    dispose() {
        if (!this.gl) return;
        
        const gl = this.gl;
        
        if (this.positionTexture) gl.deleteTexture(this.positionTexture);
        if (this.velocityTexture) gl.deleteTexture(this.velocityTexture);
        if (this.outputPositionTexture) gl.deleteTexture(this.outputPositionTexture);
        if (this.outputVelocityTexture) gl.deleteTexture(this.outputVelocityTexture);
        if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer);
        if (this.program) gl.deleteProgram(this.program);
        if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
        
        this.isInitialized = false;
        console.log('GPU Physics Engine disposed');
    }
}

// Create singleton instance
let gpuPhysicsInstance = null;

export function getGPUPhysics() {
    if (!gpuPhysicsInstance) {
        gpuPhysicsInstance = new GPUPhysicsEngine();
    }
    return gpuPhysicsInstance;
}

export function isGPUSupported() {
    return getGPUPhysics().isSupported;
}

export default GPUPhysicsEngine;
