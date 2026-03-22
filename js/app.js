import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { ArchitectureGenerator } from './ArchitectureGenerator.js';
import { NeonRenderer } from './NeonRenderer.js';
import { XRController } from './XRController.js';
import { SimulationManager } from './SimulationManager.js';

// ==================== CONFIGURATION ====================
const MAX_PARTICLES = 50000;
const GROUND_SPREAD = 25;

// ==================== APPLICATION ====================
class App {
    constructor() {
        this.lastTime = 0;
        this.frameCount = 0;
        this.fpsTime = 0;
        this.currentStructure = null;
        this.activeParticleCount = 25000;
        this.timeScale = 1.0;

        this._init();
    }

    _init() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const container = document.getElementById('canvas-container');
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // Scene & Camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            60, container.clientWidth / container.clientHeight, 0.1, 200
        );
        this.camera.position.set(8, 6, 12);
        this.camera.lookAt(0, 3, 0);

        // Initialize modules
        this.neonRenderer = new NeonRenderer(this.renderer, this.scene, this.camera);
        this.particleSystem = new ParticleSystem(this.scene, MAX_PARTICLES);
        this.physics = new PhysicsEngine(MAX_PARTICLES);
        this.archGen = new ArchitectureGenerator();
        this.xrController = new XRController(this.renderer, this.scene, this.camera);

        // Spawn initial particles
        const initialPositions = this.particleSystem.spawnOnGround(this.activeParticleCount, GROUND_SPREAD);
        this.physics.initPositions(initialPositions, this.activeParticleCount);

        // Simulation Manager (sidebar + cards)
        this.simManager = new SimulationManager(
            (card) => this._onCardSelect(card),
            (physics) => this._onPhysicsChange(physics),
        );

        // UI
        this._setupUI();

        // Resize handler
        window.addEventListener('resize', () => this._onResize());

        // Start animation loop
        this.renderer.setAnimationLoop((time) => this._animate(time));

        this._updateStatus('Ready');
        this._updateParticleCount(this.activeParticleCount);
    }

    _setupUI() {
        const input = document.getElementById('prompt-input');
        const btn = document.getElementById('generate-btn');

        const submit = () => {
            const prompt = input.value.trim();
            if (prompt) {
                // Update active card's prompt
                const card = this.simManager.getActiveCard();
                if (card) {
                    this.simManager.updateCard(card.id, { prompt });
                }
                this._onPromptSubmit(prompt);
            }
        };

        btn.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
        });
    }

    // ==================== CARD & PHYSICS CALLBACKS ====================

    _onCardSelect(card) {
        // Apply card's physics parameters
        this._applyPhysics(card.physics);

        // Build the structure from card's prompt
        if (card.prompt) {
            this._onPromptSubmit(card.prompt);
        }
    }

    _onPhysicsChange(physics) {
        this._applyPhysics(physics);
    }

    _applyPhysics(p) {
        this.physics.GRAVITY = p.gravity;
        this.physics.DAMPING = p.damping;
        this.physics.TARGET_SPRING_K = p.springStiffness;
        this.timeScale = p.timeScale;

        // Wind and viscosity stored for substep usage
        this.physics.windX = p.windX || 0;
        this.physics.windY = p.windY || 0;
        this.physics.windZ = p.windZ || 0;
        this.physics.viscosity = p.viscosity || 0;
        this.physics.temperature = p.temperature || 293;
        this.physics.friction = p.friction || 0.8;
        this.physics.bounciness = p.bounciness || 0.3;

        // Update target stiffness for existing particles
        for (let i = 0; i < this.physics.activeCount; i++) {
            if (this.physics.hasTarget[i]) {
                this.physics.targetStiffness[i] = p.springStiffness * (1.0 + (this.physics.mass[i] - 1.0) * 0.75);
            }
        }
    }

    // ==================== STRUCTURE BUILDING ====================

    _onPromptSubmit(promptText) {
        this._updateStatus('Generating...');

        if (this.currentStructure) {
            this.physics.releaseTargets(1.0);
            setTimeout(() => this._buildStructure(promptText), 1200);
        } else {
            this._buildStructure(promptText);
        }
    }

    _buildStructure(promptText) {
        this._updateStatus('Building structure...');

        try {
            const structure = this.archGen.generate(promptText, this.activeParticleCount);
            this.currentStructure = structure;

            const needed = structure.metadata.particleCount;
            if (needed > this.particleSystem.activeCount) {
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

            this.physics.setTargetPositions(structure.targets, structure.assignments);
            this.physics.setSprings(structure.connections);
            this.physics.setLoadBearing(structure.loads);
            this.particleSystem.setParticleColors(structure.roles, structure.loads);

            const info = `${structure.metadata.type} | ${structure.metadata.structuralParticles} structural + ${structure.metadata.ambientParticles} ambient`;
            document.getElementById('structure-info').textContent = info;
            this._updateParticleCount(needed);
            this._updateStatus('Simulating');
        } catch (e) {
            console.error('Generation error:', e);
            this._updateStatus('Error: ' + e.message);
        }
    }

    // ==================== ANIMATION ====================

    _animate(time) {
        const timeSeconds = time / 1000;
        let dt = Math.min(timeSeconds - this.lastTime, 0.033);
        this.lastTime = timeSeconds;

        // Apply time scale
        dt *= this.timeScale;

        // FPS counter
        this.frameCount++;
        if (timeSeconds - this.fpsTime > 1.0) {
            const fps = Math.round(this.frameCount / (timeSeconds - this.fpsTime));
            document.getElementById('fps-counter').textContent = fps + ' fps';
            this.frameCount = 0;
            this.fpsTime = timeSeconds;

            if (this.physics.isTransitioning) {
                const pct = Math.round(this.physics.stiffnessRamp * 100);
                this._updateStatus(this.physics._releasing ? `Releasing ${100-pct}%` : `Forming ${pct}%`);
            } else if (this.currentStructure) {
                this._updateStatus('Stable');
            }
        }

        if (dt > 0) {
            this.physics.step(dt);
            this.particleSystem.updateFromPhysics(this.physics.pos, this.physics.vel);
        }

        this.xrController.update();
        this.neonRenderer.render();
    }

    // ==================== RESIZE ====================

    _onResize() {
        const container = document.getElementById('canvas-container');
        const w = container.clientWidth;
        const h = container.clientHeight;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(w, h);
        this.neonRenderer.onResize(w, h);
    }

    // ==================== STATUS ====================

    _updateStatus(text) {
        document.getElementById('status').textContent = text;
    }

    _updateParticleCount(count) {
        document.getElementById('particle-count').textContent = count.toLocaleString();
    }
}

// ==================== START ====================
const app = new App();
