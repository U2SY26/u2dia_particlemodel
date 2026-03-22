import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene, maxCount) {
        this.scene = scene;
        this.maxCount = maxCount;
        this.activeCount = 0;

        // Low-poly sphere for each particle
        const geometry = new THREE.SphereGeometry(0.03, 6, 4);

        // Neon emissive material
        this.material = new THREE.MeshStandardMaterial({
            emissive: new THREE.Color(0x00ffff),
            emissiveIntensity: 2.0,
            color: 0x001111,
            metalness: 0.5,
            roughness: 0.2,
            transparent: true,
            opacity: 0.9,
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
    }

    spawnOnGround(count, spread = 20) {
        this.activeCount = count;
        this.mesh.count = count;

        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            this.positions[idx] = (Math.random() - 0.5) * spread;
            this.positions[idx + 1] = Math.random() * 0.3; // slightly above ground
            this.positions[idx + 2] = (Math.random() - 0.5) * spread;

            // Base neon cyan with slight variation
            this.color.setHSL(0.5 + (Math.random() - 0.5) * 0.05, 1.0, 0.5);
            this.mesh.instanceColor.setXYZ(i, this.color.r, this.color.g, this.color.b);
        }

        this.updateInstanceMatrices();
        this.mesh.instanceColor.needsUpdate = true;

        return this.positions;
    }

    updateFromPhysics(physPositions, physVelocities) {
        for (let i = 0; i < this.activeCount; i++) {
            const idx = i * 3;

            this.dummy.position.set(
                physPositions[idx],
                physPositions[idx + 1],
                physPositions[idx + 2]
            );

            // Subtle scale variation from velocity for vibration visual
            if (physVelocities) {
                const vx = physVelocities[idx];
                const vy = physVelocities[idx + 1];
                const vz = physVelocities[idx + 2];
                const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
                const s = 0.8 + Math.min(speed * 0.5, 0.6);
                this.dummy.scale.setScalar(s);
            } else {
                this.dummy.scale.setScalar(1.0);
            }

            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
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

            // Load-bearing particles shift toward warmer hues
            const hShift = load * 0.15;
            this.color.setHSL(h - hShift, s, l + load * 0.1);
            this.mesh.instanceColor.setXYZ(i, this.color.r, this.color.g, this.color.b);
        }

        this.mesh.instanceColor.needsUpdate = true;
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
