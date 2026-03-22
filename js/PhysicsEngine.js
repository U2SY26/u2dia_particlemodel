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

        // Constants (SI units)
        this.GRAVITY = -9.81;       // m/s²
        this.GROUND_Y = 0;
        this.DAMPING = 0.97;        // Verlet velocity retention (0–1)
        this.VIBRATION_AMP = 0.003;
        this.MAX_SUBSTEP = 0.005;   // seconds
        this.TARGET_SPRING_K = 20.0;// N/m (overridden by material)
        this.BOUNDARY = 60;         // m
        this.PARTICLE_SPACING = 0.06; // m — current spacing between particles

        // Environment parameters
        this.windX = 0;             // m/s² (force per unit mass)
        this.windY = 0;
        this.windZ = 0;
        this.turbulence = 0;        // m/s² amplitude
        this.viscosity = 0;         // drag coefficient (1/s)
        this.temperature = 293;     // K
        this.friction = 0.8;        // ground kinetic friction coefficient (0–1)
        this.bounciness = 0.3;      // coefficient of restitution (0–1)

        // Material properties (real SI values)
        this.materialDensity = 2400;     // kg/m³
        this.youngsModulus = 25e9;       // Pa
        this.materialYieldStrength = 25e6; // Pa
        this.dampingRatio = 0.05;        // ζ (zeta), dimensionless
        this.thermalExpansion = 10e-6;   // 1/K
        this.poissonRatio = 0.20;

        // Foundation / ground
        this.foundationDepth = 2.0;      // m — deeper = more stable
        this.groundBearingCapacity = 5e6;// Pa
        this.groundSettlement = 0.001;   // m per MN/m²
        this.groundDamping = 0.94;

        // Hazard parameters
        this.seismic = 0;           // m/s² peak acceleration
        this.seismicFreq = 2.0;     // Hz
        this.snowLoad = 0;          // kN/m² (→ N/m²×1000)
        this.floodLevel = 0;        // m above ground

        // Derived (updated when material changes)
        this._particleMass = 1.0;
        this._springK = 20.0;
        this._critDamp = 0.5;

        // Internal time accumulator
        this._totalTime = 0;
    }

    /**
     * Recalculate derived physics from current material properties.
     * Call this whenever material, spacing, or density changes.
     */
    updateDerivedPhysics() {
        const dt = this.MAX_SUBSTEP;

        // === Mass: scale density to simulation range ===
        // Real density (kg/m³) → simulation mass.
        // Reference: concrete 2400 kg/m³ → mass 1.0
        this._particleMass = Math.max(0.1, this.materialDensity / 2400);

        // === Stiffness: logarithmic scaling of Young's modulus ===
        // Real range: 1e3 Pa (muscle) → 1e12 Pa (diamond) = 9 orders of magnitude
        // Simulation range: 2 → 200 (stable for Verlet at dt=0.005)
        // Use log10 mapping: E=1e3→2, E=25e9→20, E=200e9→40, E=1e12→100
        const logE = Math.log10(Math.max(this.youngsModulus, 1));
        this._springK = Math.max(2, Math.min(200, (logE - 3) * 10));

        // === Stability cap: Verlet requires k * dt² / m < 1 ===
        const kMax = this._particleMass / (dt * dt) * 0.8; // 80% safety margin
        this._springK = Math.min(this._springK, kMax);

        // === Damping ===
        this._critDamp = 2 * Math.sqrt(this._springK * this._particleMass) * this.dampingRatio;
        this.DAMPING = Math.max(0.80, Math.min(0.999, 1.0 - this.dampingRatio * 2));

        // Update all particle masses
        for (let i = 0; i < this.activeCount; i++) {
            this.mass[i] = this._particleMass;
            this.invMass[i] = 1.0 / this._particleMass;
        }

        // Update target spring stiffness
        this.TARGET_SPRING_K = this._springK;
        const foundationMul = Math.sqrt(Math.max(this.foundationDepth, 0.5) / 2.0);
        for (let i = 0; i < this.activeCount; i++) {
            if (this.hasTarget[i]) {
                this.targetStiffness[i] = this._springK * foundationMul;
            }
        }

        // Update structural spring stiffness
        for (let si = 0; si < this.springs.length; si++) {
            this.springs[si].stiffness = this._springK;
            this.springs[si].damping = this._critDamp;
        }
    }

    /**
     * Apply a complete material property set (from Materials.js)
     */
    applyMaterial(props) {
        if (props.density !== undefined) this.materialDensity = props.density;
        if (props.youngsModulus !== undefined) this.youngsModulus = props.youngsModulus;
        if (props.yieldStrength !== undefined) this.materialYieldStrength = props.yieldStrength;
        if (props.dampingRatio !== undefined) this.dampingRatio = props.dampingRatio;
        if (props.thermalExpansion !== undefined) this.thermalExpansion = props.thermalExpansion;
        if (props.poissonRatio !== undefined) this.poissonRatio = props.poissonRatio;
        this.updateDerivedPhysics();
    }

    /**
     * Apply ground/surface properties
     */
    applyGround(props) {
        if (props.friction !== undefined) this.friction = props.friction;
        if (props.bounciness !== undefined) this.bounciness = props.bounciness;
        if (props.bearingCapacity !== undefined) this.groundBearingCapacity = props.bearingCapacity;
        if (props.settlement !== undefined) this.groundSettlement = props.settlement;
        if (props.damping !== undefined) this.groundDamping = props.damping;
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

        this._totalTime += dt;

        // Seismic wave
        let seismicX = 0, seismicZ = 0;
        if (this.seismic > 0) {
            const freq = this.seismicFreq;
            const amp = this.seismic;
            seismicX = Math.sin(this._totalTime * freq * Math.PI * 2) * amp;
            seismicZ = Math.cos(this._totalTime * freq * Math.PI * 2 * 0.7) * amp * 0.6;
        }

        // Apply gravity + wind + environment
        for (let i = 0; i < n; i++) {
            const idx = i * 3;

            // Wind with turbulence
            let wx = this.windX;
            let wy = this.windY;
            let wz = this.windZ;
            if (this.turbulence > 0) {
                wx += (Math.random() - 0.5) * this.turbulence;
                wy += (Math.random() - 0.5) * this.turbulence * 0.3;
                wz += (Math.random() - 0.5) * this.turbulence;
            }

            this.acc[idx] += wx + seismicX;
            this.acc[idx + 1] += this.GRAVITY + wy;
            this.acc[idx + 2] += wz + seismicZ;

            // Snow load (downward force on particles above ground)
            if (this.snowLoad > 0 && this.pos[idx + 1] > 1.0) {
                this.acc[idx + 1] -= this.snowLoad * 0.5;
            }

            // Flood buoyancy (upward force on particles below flood level)
            if (this.floodLevel > 0) {
                const floodY = this.floodLevel;
                if (this.pos[idx + 1] < floodY) {
                    const depth = floodY - this.pos[idx + 1];
                    this.acc[idx + 1] += depth * 3.0; // buoyancy
                    // Water drag
                    this.acc[idx] -= this.vel[idx] * 2.0;
                    this.acc[idx + 1] -= this.vel[idx + 1] * 2.0;
                    this.acc[idx + 2] -= this.vel[idx + 2] * 2.0;
                }
            }

            // Viscosity drag (opposes velocity)
            if (this.viscosity > 0) {
                this.acc[idx] -= this.vel[idx] * this.viscosity;
                this.acc[idx + 1] -= this.vel[idx + 1] * this.viscosity;
                this.acc[idx + 2] -= this.vel[idx + 2] * this.viscosity;
            }

            // Thermal agitation (Brownian motion)
            if (this.temperature > 300) {
                const thermalK = (this.temperature - 300) * 0.0005;
                this.acc[idx] += (Math.random() - 0.5) * thermalK;
                this.acc[idx + 1] += (Math.random() - 0.5) * thermalK;
                this.acc[idx + 2] += (Math.random() - 0.5) * thermalK;
            }
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

        // Thermal expansion — gentle outward push when T ≠ 293K
        if (this.thermalExpansion > 0 && Math.abs(this.temperature - 293) > 5) {
            const deltaT = this.temperature - 293;
            // Scale: thermalExpansion ~1e-5/K → strain ~1e-3 at ΔT=100K
            // Apply as gentle acceleration proportional to distance from origin
            const thermalAcc = this.thermalExpansion * deltaT * 500;
            // Cap to prevent instability
            const cappedAcc = Math.max(-2, Math.min(2, thermalAcc));
            for (let i = 0; i < n; i++) {
                if (!this.hasTarget[i]) continue;
                const idx = i * 3;
                this.acc[idx] += this.targetPos[idx] * cappedAcc;
                this.acc[idx + 1] += this.targetPos[idx + 1] * cappedAcc;
                this.acc[idx + 2] += this.targetPos[idx + 2] * cappedAcc;
            }
        }

        // Yield check — if acceleration exceeds threshold, release particle
        // Scale yield strength: log mapping like stiffness
        if (this.materialYieldStrength > 0) {
            // Higher yield strength → harder to break
            // Map MPa range to acceleration threshold
            const logY = Math.log10(Math.max(this.materialYieldStrength, 1));
            const yieldThreshold = Math.max(50, (logY - 4) * 80); // ~50–500 m/s²
            for (let i = 0; i < n; i++) {
                if (!this.hasTarget[i]) continue;
                const idx = i * 3;
                const aMag = Math.sqrt(
                    this.acc[idx]*this.acc[idx] +
                    this.acc[idx+1]*this.acc[idx+1] +
                    this.acc[idx+2]*this.acc[idx+2]
                );
                if (aMag > yieldThreshold) {
                    this.hasTarget[i] = 0;
                    this.targetStiffness[i] = 0;
                }
            }
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

        // Ground collision with real surface physics
        const mu = this.friction;           // kinetic friction coefficient
        const cor = this.bounciness;        // coefficient of restitution
        const settlement = this.groundSettlement;
        const groundY = this.GROUND_Y - settlement * this._particleMass * Math.abs(this.GRAVITY) * 0.001;
        for (let i = 0; i < n; i++) {
            const iy = i * 3 + 1;
            if (this.pos[iy] < groundY) {
                this.pos[iy] = groundY;
                // Normal impulse (restitution)
                const vy = this.vel[iy];
                this.prevPos[iy] = groundY + vy * cor * dt;
                this.vel[iy] = -vy * cor;
                // Tangential friction: F_friction = μ × |F_normal|
                // In Verlet: reduce tangential velocity proportionally
                const ix = i * 3;
                const iz = i * 3 + 2;
                const tanSpeed = Math.sqrt(this.vel[ix] * this.vel[ix] + this.vel[iz] * this.vel[iz]);
                if (tanSpeed > 0.001) {
                    const normalForce = Math.abs(vy) * this.mass[i] / dt;
                    const frictionForce = mu * normalForce;
                    const frictionDecel = frictionForce / this.mass[i] * dt;
                    const reduction = Math.min(1.0, frictionDecel / tanSpeed);
                    this.vel[ix] *= (1.0 - reduction);
                    this.vel[iz] *= (1.0 - reduction);
                }
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
