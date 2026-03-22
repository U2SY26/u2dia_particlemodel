import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene, maxCount, quality = null) {
        this.scene = scene;
        this.maxCount = maxCount;
        this.activeCount = 0;

        // Quality-adaptive geometry
        const segments = quality ? quality.particleSegments : 6;
        const rings = quality ? quality.particleRings : 4;
        const geometry = new THREE.SphereGeometry(0.03, segments, rings);

        // Neon emissive material - disable transparency for iGPU
        const isLowQuality = quality && quality.label === 'LOW';
        this.material = new THREE.MeshStandardMaterial({
            emissive: new THREE.Color(0x00ffff),
            emissiveIntensity: isLowQuality ? 0.6 : 0.8,
            color: 0x002222,
            metalness: isLowQuality ? 0.2 : 0.4,
            roughness: isLowQuality ? 0.6 : 0.4,
            transparent: !isLowQuality,
            opacity: isLowQuality ? 1.0 : 0.85,
        });

        this.mesh = new THREE.InstancedMesh(geometry, this.material, maxCount);
        this.mesh.frustumCulled = false;
        this.mesh.count = 0;

        // Per-instance color
        this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(maxCount * 3), 3
        );

        scene.add(this.mesh);

        // Reusable objects
        this.dummy = new THREE.Object3D();
        this.color = new THREE.Color();

        // Position data (shared with physics)
        this.positions = new Float32Array(maxCount * 3);
        this.scales = new Float32Array(maxCount).fill(1.0);

        // Visual settings
        this.colorMode = 'role';
        this.primaryColor = new THREE.Color(0x00ffff);
        this.secondaryColor = new THREE.Color(0xff00ff);
        this.currentRoles = null;
        this.currentLoads = null;
    }

    spawnOnGround(count, spread = 20) {
        this.activeCount = count;
        this.mesh.count = count;

        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            this.positions[idx] = (Math.random() - 0.5) * spread;
            this.positions[idx + 1] = Math.random() * 0.3;
            this.positions[idx + 2] = (Math.random() - 0.5) * spread;

            this.color.setHSL(0.5 + (Math.random() - 0.5) * 0.05, 1.0, 0.5);
            this.mesh.instanceColor.setXYZ(i, this.color.r, this.color.g, this.color.b);
        }

        this.updateInstanceMatrices();
        this.mesh.instanceColor.needsUpdate = true;

        return this.positions;
    }

    updateFromPhysics(physPositions, physVelocities) {
        let velocityColorDirty = false;

        for (let i = 0; i < this.activeCount; i++) {
            const idx = i * 3;

            this.dummy.position.set(
                physPositions[idx],
                physPositions[idx + 1],
                physPositions[idx + 2]
            );

            if (physVelocities) {
                const vx = physVelocities[idx];
                const vy = physVelocities[idx + 1];
                const vz = physVelocities[idx + 2];
                const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
                const s = 0.8 + Math.min(speed * 0.5, 0.6);
                this.dummy.scale.setScalar(s);

                // Velocity-based coloring
                if (this.colorMode === 'velocity') {
                    const t = Math.min(speed / 10, 1);
                    this.color.copy(this.primaryColor).lerp(this.secondaryColor, t);
                    this.mesh.instanceColor.setXYZ(i, this.color.r, this.color.g, this.color.b);
                    velocityColorDirty = true;
                }
            } else {
                this.dummy.scale.setScalar(1.0);
            }

            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
        if (velocityColorDirty) this.mesh.instanceColor.needsUpdate = true;
    }

    updateInstanceMatrices() {
        for (let i = 0; i < this.activeCount; i++) {
            const idx = i * 3;
            this.dummy.position.set(
                this.positions[idx],
                this.positions[idx + 1],
                this.positions[idx + 2]
            );
            this.dummy.scale.setScalar(1.0);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * Set particle colors based on structural roles
     * roles: 0=ambient, 1=foundation, 2=column, 3=beam, 4=brace, 5=arch
     */
    setParticleColors(roles, loads) {
        this.currentRoles = roles;
        this.currentLoads = loads;
        this.applyColorMode();
    }

    applyColorMode() {
        const roles = this.currentRoles;
        const loads = this.currentLoads;

        if (this.colorMode === 'single') {
            for (let i = 0; i < this.activeCount; i++) {
                this.mesh.instanceColor.setXYZ(i, this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
            }
        } else if (this.colorMode === 'random') {
            for (let i = 0; i < this.activeCount; i++) {
                this.color.setHSL(Math.random(), 0.9, 0.5);
                this.mesh.instanceColor.setXYZ(i, this.color.r, this.color.g, this.color.b);
            }
        } else if (this.colorMode === 'gradient') {
            for (let i = 0; i < this.activeCount; i++) {
                const t = this.activeCount > 1 ? i / (this.activeCount - 1) : 0;
                this.color.copy(this.primaryColor).lerp(this.secondaryColor, t);
                this.mesh.instanceColor.setXYZ(i, this.color.r, this.color.g, this.color.b);
            }
        } else if (this.colorMode === 'velocity') {
            // Will be updated each frame in updateFromPhysics
            for (let i = 0; i < this.activeCount; i++) {
                this.mesh.instanceColor.setXYZ(i, this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
            }
        } else {
            // 'role' mode (default)
            const ROLE_COLORS = [
                [0.50, 1.0, 0.5],   // 0: ambient - cyan
                [0.08, 1.0, 0.6],   // 1: foundation - warm orange
                [0.55, 1.0, 0.55],  // 2: column - cyan-blue
                [0.83, 1.0, 0.55],  // 3: beam - magenta
                [0.15, 1.0, 0.55],  // 4: brace - yellow
                [0.70, 1.0, 0.55],  // 5: arch - purple
            ];

            for (let i = 0; i < this.activeCount; i++) {
                const role = roles ? (roles[i] || 0) : 0;
                const load = loads ? loads[i] : 0;
                const [h, s, l] = ROLE_COLORS[Math.min(role, 5)];
                const hShift = load * 0.15;
                this.color.setHSL(h - hShift, s, l + load * 0.1);
                this.mesh.instanceColor.setXYZ(i, this.color.r, this.color.g, this.color.b);
            }
        }

        this.mesh.instanceColor.needsUpdate = true;
    }

    setColorMode(mode, primary, secondary) {
        this.colorMode = mode;
        if (primary) this.primaryColor.set(primary);
        if (secondary) this.secondaryColor.set(secondary);
        this.applyColorMode();
    }

    setBrightness(intensity) {
        this.material.emissiveIntensity = intensity;
    }

    setOpacity(opacity) {
        this.material.opacity = opacity;
        this.material.transparent = opacity < 1.0;
    }

    setParticleSize(radius) {
        const old = this.mesh.geometry;
        const segments = old.parameters?.widthSegments || 6;
        const rings = old.parameters?.heightSegments || 4;
        this.mesh.geometry = new THREE.SphereGeometry(radius, segments, rings);
        old.dispose();
    }

    setActiveCount(count) {
        this.activeCount = Math.min(count, this.maxCount);
        this.mesh.count = this.activeCount;
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.material.dispose();
        this.scene.remove(this.mesh);
    }
}
