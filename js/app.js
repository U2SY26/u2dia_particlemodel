import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { ArchitectureGenerator } from './ArchitectureGenerator.js';
import { NeonRenderer } from './NeonRenderer.js';
import { XRController } from './XRController.js';

// ==================== CONFIGURATION ====================
const MAX_PARTICLES = 50000;
const INITIAL_COUNT = 25000;
const GROUND_SPREAD = 25;

// ==================== APPLICATION ====================
class App {
    constructor() {
        this.lastTime = 0;
        this.frameCount = 0;
        this.fpsTime = 0;
        this.currentStructure = null;

        this._init();
    }

    _init() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        const container = document.getElementById('canvas-container');
        container.appendChild(this.renderer.domElement);

        // Scene & Camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            60, window.innerWidth / window.innerHeight, 0.1, 200
        );
        this.camera.position.set(8, 6, 12);
        this.camera.lookAt(0, 3, 0);

        // Initialize modules
        this.neonRenderer = new NeonRenderer(this.renderer, this.scene, this.camera);
        this.particleSystem = new ParticleSystem(this.scene, MAX_PARTICLES);
        this.physics = new PhysicsEngine(MAX_PARTICLES);
        this.archGen = new ArchitectureGenerator();
        this.xrController = new XRController(this.renderer, this.scene, this.camera);

        // Spawn initial particles on ground
        const initialPositions = this.particleSystem.spawnOnGround(INITIAL_COUNT, GROUND_SPREAD);
        this.physics.initPositions(initialPositions, INITIAL_COUNT);

        // UI
        this._setupUI();

        // Resize handler
        window.addEventListener('resize', () => this._onResize());

        // Start animation loop
        this.renderer.setAnimationLoop((time) => this._animate(time));

        this._updateStatus('Ready');
        this._updateParticleCount(INITIAL_COUNT);
    }

    _setupUI() {
        const input = document.getElementById('prompt-input');
        const btn = document.getElementById('generate-btn');

        const submit = () => {
            const prompt = input.value.trim();
            if (prompt) this._onPromptSubmit(prompt);
        };

        btn.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
        });
    }

    _onPromptSubmit(promptText) {
        this._updateStatus('Generating...');

        // If we have an existing structure, release it first
        if (this.currentStructure) {
            this.physics.releaseTargets(1.0);

            // Wait for release, then build new
            setTimeout(() => this._buildStructure(promptText), 1200);
        } else {
            this._buildStructure(promptText);
        }
    }

    _buildStructure(promptText) {
        this._updateStatus('Building structure...');

        try {
            const structure = this.archGen.generate(promptText, INITIAL_COUNT);
            this.currentStructure = structure;

            // Ensure we have enough active particles
            const needed = structure.metadata.particleCount;
            if (needed > this.particleSystem.activeCount) {
                // Spawn more particles
                const additional = needed - this.particleSystem.activeCount;
                for (let i = this.particleSystem.activeCount; i < needed; i++) {
                    const idx = i * 3;
                    this.physics.pos[idx] = (Math.random() - 0.5) * GROUND_SPREAD;
                    this.physics.pos[idx + 1] = Math.random() * 0.3;
                    this.physics.pos[idx + 2] = (Math.random() - 0.5) * GROUND_SPREAD;
                    this.physics.prevPos[idx] = this.physics.pos[idx];
                    this.physics.prevPos[idx + 1] = this.physics.pos[idx + 1];
                    this.physics.prevPos[idx + 2] = this.physics.pos[idx + 2];
                }
                this.particleSystem.setActiveCount(needed);
                this.physics.activeCount = needed;
            }

            // Set targets
            this.physics.setTargetPositions(structure.targets, structure.assignments);
            this.physics.setSprings(structure.connections);
            this.physics.setLoadBearing(structure.loads);

            // Update particle colors based on roles
            this.particleSystem.setParticleColors(structure.roles, structure.loads);

            // Update UI
            const info = `${structure.metadata.type} | ${structure.metadata.structuralParticles} structural + ${structure.metadata.ambientParticles} ambient`;
            document.getElementById('structure-info').textContent = info;
            this._updateParticleCount(needed);

            this._updateStatus('Simulating');
        } catch (e) {
            console.error('Generation error:', e);
            this._updateStatus('Error: ' + e.message);
        }
    }

    _animate(time) {
        const timeSeconds = time / 1000;
        const dt = Math.min(timeSeconds - this.lastTime, 0.033);
        this.lastTime = timeSeconds;

        // FPS counter
        this.frameCount++;
        if (timeSeconds - this.fpsTime > 1.0) {
            const fps = Math.round(this.frameCount / (timeSeconds - this.fpsTime));
            document.getElementById('fps-counter').textContent = fps + ' fps';
            this.frameCount = 0;
            this.fpsTime = timeSeconds;

            // Update status based on physics state
            if (this.physics.isTransitioning) {
                const pct = Math.round(this.physics.stiffnessRamp * 100);
                this._updateStatus(this.physics._releasing ? `Releasing ${100-pct}%` : `Forming ${pct}%`);
            } else if (this.currentStructure) {
                this._updateStatus('Stable');
            }
        }

        if (dt > 0) {
            // Physics step
            this.physics.step(dt);

            // Sync particle visuals with physics
            this.particleSystem.updateFromPhysics(this.physics.pos, this.physics.vel);
        }

        // Update controls
        this.xrController.update();

        // Render with bloom
        this.neonRenderer.render();
    }

    _onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(w, h);
        this.neonRenderer.onResize(w, h);
    }

    _updateStatus(text) {
        document.getElementById('status').textContent = text;
    }

    _updateParticleCount(count) {
        document.getElementById('particle-count').textContent = count.toLocaleString();
    }
}

// ==================== START ====================
const app = new App();
