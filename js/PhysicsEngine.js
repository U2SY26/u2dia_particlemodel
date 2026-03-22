export class PhysicsEngine {
    constructor(maxCount) {
        this.maxCount = maxCount;
        this.activeCount = 0;

        // Position buffers (Verlet integration)
        this.pos = new Float32Array(maxCount * 3);
        this.prevPos = new Float32Array(maxCount * 3);
        this.vel = new Float32Array(maxCount * 3);
        this.acc = new Float32Array(maxCount * 3);

        // Target positions for structure formation
        this.targetPos = new Float32Array(maxCount * 3);
        this.hasTarget = new Uint8Array(maxCount);
        this.targetStiffness = new Float32Array(maxCount);

        // Per-particle properties
        this.mass = new Float32Array(maxCount).fill(1.0);
        this.invMass = new Float32Array(maxCount).fill(1.0);

        // Spring connections
        this.springs = [];

        // State
        this.transitionTime = 0;
        this.transitionDuration = 2.0; // seconds for full ramp
        this.isTransitioning = false;
        this.stiffnessRamp = 0; // 0 to 1

        // Constants
        this.GRAVITY = -9.81;
        this.GROUND_Y = 0;
        this.DAMPING = 0.97;
        this.VIBRATION_AMP = 0.003;
        this.MAX_SUBSTEP = 0.005;
        this.TARGET_SPRING_K = 20.0;
        this.BOUNDARY = 60;
    }

    initPositions(positions, count) {
        this.activeCount = count;
        this.pos.set(positions.subarray(0, count * 3));
        this.prevPos.set(this.pos.subarray(0, count * 3));
        this.vel.fill(0, 0, count * 3);
    }

    setTargetPositions(targets, assignments) {
        // Clear previous targets
        this.hasTarget.fill(0);
        this.targetStiffness.fill(0);

        // Set new targets
        const count = Math.min(assignments.length, this.activeCount);
        for (let i = 0; i < count; i++) {
            const particleIdx = assignments[i];
            if (particleIdx >= this.activeCount) continue;

            const src = i * 3;
            const dst = particleIdx * 3;
            this.targetPos[dst] = targets[src];
            this.targetPos[dst + 1] = targets[src + 1];
            this.targetPos[dst + 2] = targets[src + 2];
            this.hasTarget[particleIdx] = 1;
            this.targetStiffness[particleIdx] = this.TARGET_SPRING_K;
        }

        // Begin transition
        this.transitionTime = 0;
        this.isTransitioning = true;
        this.stiffnessRamp = 0;
    }

    setSprings(connections) {
        this.springs = connections;
    }

    setLoadBearing(loads) {
        for (let i = 0; i < this.activeCount; i++) {
            const load = loads[i] || 0;
            this.mass[i] = 1.0 + load * 2.0;
            this.invMass[i] = 1.0 / this.mass[i];
            // Higher load = stiffer target spring
            if (this.hasTarget[i]) {
                this.targetStiffness[i] = this.TARGET_SPRING_K * (1.0 + load * 1.5);
            }
        }
    }

    releaseTargets(duration = 1.0) {
        this.isTransitioning = true;
        this.transitionTime = 0;
        this.transitionDuration = duration;
        this.stiffnessRamp = 1.0;
        this._releasing = true;
    }

    step(dt) {
        if (this.activeCount === 0) return;

        dt = Math.min(dt, 0.033);
        const substeps = Math.ceil(dt / this.MAX_SUBSTEP);
        const subDt = dt / substeps;

        // Update transition
        if (this.isTransitioning) {
            this.transitionTime += dt;
            const t = Math.min(this.transitionTime / this.transitionDuration, 1.0);

            if (this._releasing) {
                this.stiffnessRamp = 1.0 - t;
                if (t >= 1.0) {
                    this.isTransitioning = false;
                    this._releasing = false;
                    this.hasTarget.fill(0);
                    this.springs = [];
                }
            } else {
                // Ease-in-out ramp
                this.stiffnessRamp = t < 0.5
                    ? 2 * t * t
                    : 1 - Math.pow(-2 * t + 2, 2) / 2;
                if (t >= 1.0) {
                    this.isTransitioning = false;
                    this.stiffnessRamp = 1.0;
                }
            }
        }

        for (let s = 0; s < substeps; s++) {
            this._substep(subDt);
        }
    }

    _substep(dt) {
        const n = this.activeCount;
        const dt2 = dt * dt;

        // Clear accelerations
        this.acc.fill(0, 0, n * 3);

        // Apply gravity
        for (let i = 0; i < n; i++) {
            this.acc[i * 3 + 1] += this.GRAVITY;
        }

        // Apply target springs
        if (this.stiffnessRamp > 0.001) {
            for (let i = 0; i < n; i++) {
                if (!this.hasTarget[i]) continue;

                const idx = i * 3;
                const k = this.targetStiffness[i] * this.stiffnessRamp;

                // Spring force toward target
                const dx = this.targetPos[idx] - this.pos[idx];
                const dy = this.targetPos[idx + 1] - this.pos[idx + 1];
                const dz = this.targetPos[idx + 2] - this.pos[idx + 2];

                this.acc[idx] += dx * k * this.invMass[i];
                this.acc[idx + 1] += dy * k * this.invMass[i];
                this.acc[idx + 2] += dz * k * this.invMass[i];

                // Damping on velocity toward target
                const dampK = 2.0 * Math.sqrt(k) * 0.7; // critical damping ratio ~0.7
                this.acc[idx] -= this.vel[idx] * dampK * this.invMass[i];
                this.acc[idx + 1] -= this.vel[idx + 1] * dampK * this.invMass[i];
                this.acc[idx + 2] -= this.vel[idx + 2] * dampK * this.invMass[i];
            }
        }

        // Apply structural springs
        const springs = this.springs;
        const ramp = this.stiffnessRamp;
        for (let s = 0; s < springs.length; s++) {
            const spring = springs[s];
            const { i, j, restLength, stiffness, damping } = spring;

            if (i >= n || j >= n) continue;

            const ii = i * 3;
            const jj = j * 3;

            // Position difference
            const dx = this.pos[jj] - this.pos[ii];
            const dy = this.pos[jj + 1] - this.pos[ii + 1];
            const dz = this.pos[jj + 2] - this.pos[ii + 2];

            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 0.0001) continue;

            const invDist = 1.0 / dist;
            const nx = dx * invDist;
            const ny = dy * invDist;
            const nz = dz * invDist;

            // Spring force
            const displacement = dist - restLength;
            const k = stiffness * ramp;
            const fx = k * displacement * nx;
            const fy = k * displacement * ny;
            const fz = k * displacement * nz;

            // Damping force (along spring axis)
            const dvx = this.vel[jj] - this.vel[ii];
            const dvy = this.vel[jj + 1] - this.vel[ii + 1];
            const dvz = this.vel[jj + 2] - this.vel[ii + 2];
            const relVelN = (dvx * nx + dvy * ny + dvz * nz) * damping * ramp;

            const totalFx = fx + relVelN * nx;
            const totalFy = fy + relVelN * ny;
            const totalFz = fz + relVelN * nz;

            this.acc[ii] += totalFx * this.invMass[i];
            this.acc[ii + 1] += totalFy * this.invMass[i];
            this.acc[ii + 2] += totalFz * this.invMass[i];
            this.acc[jj] -= totalFx * this.invMass[j];
            this.acc[jj + 1] -= totalFy * this.invMass[j];
            this.acc[jj + 2] -= totalFz * this.invMass[j];
        }

        // Vibration noise
        const vibAmp = this.VIBRATION_AMP / dt;
        for (let i = 0; i < n; i++) {
            if (this.hasTarget[i]) {
                const idx = i * 3;
                this.acc[idx] += (Math.random() - 0.5) * vibAmp;
                this.acc[idx + 1] += (Math.random() - 0.5) * vibAmp;
                this.acc[idx + 2] += (Math.random() - 0.5) * vibAmp;
            }
        }

        // Verlet integration
        const damping = this.DAMPING;
        for (let i = 0; i < n; i++) {
            const idx = i * 3;

            // Verlet: newPos = pos + (pos - prevPos) * damping + acc * dt^2
            const newX = this.pos[idx] + (this.pos[idx] - this.prevPos[idx]) * damping + this.acc[idx] * dt2;
            const newY = this.pos[idx + 1] + (this.pos[idx + 1] - this.prevPos[idx + 1]) * damping + this.acc[idx + 1] * dt2;
            const newZ = this.pos[idx + 2] + (this.pos[idx + 2] - this.prevPos[idx + 2]) * damping + this.acc[idx + 2] * dt2;

            // Compute velocity (for damping and spring calculations)
            this.vel[idx] = (newX - this.prevPos[idx]) / (2 * dt);
            this.vel[idx + 1] = (newY - this.prevPos[idx + 1]) / (2 * dt);
            this.vel[idx + 2] = (newZ - this.prevPos[idx + 2]) / (2 * dt);

            this.prevPos[idx] = this.pos[idx];
            this.prevPos[idx + 1] = this.pos[idx + 1];
            this.prevPos[idx + 2] = this.pos[idx + 2];

            this.pos[idx] = newX;
            this.pos[idx + 1] = newY;
            this.pos[idx + 2] = newZ;
        }

        // Ground collision
        for (let i = 0; i < n; i++) {
            const idx = i * 3 + 1;
            if (this.pos[idx] < this.GROUND_Y) {
                this.pos[idx] = this.GROUND_Y;
                this.prevPos[idx] = this.GROUND_Y;
                this.vel[idx - 1] *= 0.8; // friction
                this.vel[idx] = 0;
                this.vel[idx + 1] *= 0.8;
            }
        }

        // Boundary constraints
        const bound = this.BOUNDARY;
        for (let i = 0; i < n; i++) {
            const idx = i * 3;
            for (let k = 0; k < 3; k++) {
                if (this.pos[idx + k] > bound) {
                    this.pos[idx + k] = bound;
                    this.prevPos[idx + k] = bound;
                }
                if (this.pos[idx + k] < -bound) {
                    this.pos[idx + k] = -bound;
                    this.prevPos[idx + k] = -bound;
                }
            }
        }
    }
}
