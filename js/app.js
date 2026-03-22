import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import { ArchitectureGenerator } from './ArchitectureGenerator.js';
import { NeonRenderer, detectQuality, QUALITY } from './NeonRenderer.js';
import { XRController } from './XRController.js';
import { SimulationManager } from './SimulationManager.js';
import { t, tPreset, getLang, setLang } from './i18n.js';
import { MATERIALS, GROUNDS, CATEGORIES, materialToPhysics, groundToPhysics } from './Materials.js';

// ==================== CONFIGURATION ====================
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

        // Auto-detect GPU quality
        this.quality = detectQuality(this.renderer);
        const MAX_PARTICLES = this.quality.maxParticles;
        console.log(`[Quality] ${this.quality.label} - Max particles: ${MAX_PARTICLES}`);

        // Initialize modules with quality settings
        this.neonRenderer = new NeonRenderer(this.renderer, this.scene, this.camera, this.quality);
        this.particleSystem = new ParticleSystem(this.scene, MAX_PARTICLES, this.quality);
        this.physics = new PhysicsEngine(MAX_PARTICLES);
        this.archGen = new ArchitectureGenerator();
        this.xrController = new XRController(this.renderer, this.scene, this.camera);

        // Spawn initial particles (clamped to quality tier max)
        this.activeParticleCount = Math.min(this.activeParticleCount, MAX_PARTICLES);
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
        this._updateQualityBadge();
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

        // === Visual Settings ===
        const colorMode = document.getElementById('color-mode');
        const colorPrimary = document.getElementById('color-primary');
        const colorSecondary = document.getElementById('color-secondary');
        const brightness = document.getElementById('param-brightness');
        const bloom = document.getElementById('param-bloom');
        const bloomRadius = document.getElementById('param-bloomRadius');
        const particleSize = document.getElementById('param-particleSize');
        const opacity = document.getElementById('param-opacity');
        const bgColor = document.getElementById('color-bg');

        const updateVisual = () => {
            const display = (id, val) => {
                const el = document.querySelector(`.param-value[data-for="${id}"]`);
                if (el) el.textContent = parseFloat(val).toFixed(2);
            };
            display('param-brightness', brightness.value);
            display('param-bloom', bloom.value);
            display('param-bloomRadius', bloomRadius.value);
            display('param-particleSize', particleSize.value);
            display('param-opacity', opacity.value);
        };

        colorMode.addEventListener('change', () => {
            const show2nd = colorMode.value === 'gradient' || colorMode.value === 'velocity';
            document.getElementById('color-secondary-group').style.display = show2nd ? '' : 'none';
            this.particleSystem.setColorMode(colorMode.value, colorPrimary.value, colorSecondary.value);
        });
        // Initial hide secondary
        document.getElementById('color-secondary-group').style.display = 'none';

        colorPrimary.addEventListener('input', () => {
            this.particleSystem.setColorMode(colorMode.value, colorPrimary.value, colorSecondary.value);
        });
        colorSecondary.addEventListener('input', () => {
            this.particleSystem.setColorMode(colorMode.value, colorPrimary.value, colorSecondary.value);
        });

        brightness.addEventListener('input', () => {
            this.particleSystem.setBrightness(parseFloat(brightness.value));
            updateVisual();
        });

        bloom.addEventListener('input', () => {
            this.neonRenderer.bloomPass.strength = parseFloat(bloom.value);
            updateVisual();
        });
        bloomRadius.addEventListener('input', () => {
            this.neonRenderer.bloomPass.radius = parseFloat(bloomRadius.value);
            updateVisual();
        });

        particleSize.addEventListener('input', () => {
            this.particleSystem.setParticleSize(parseFloat(particleSize.value));
            updateVisual();
        });

        opacity.addEventListener('input', () => {
            this.particleSystem.setOpacity(parseFloat(opacity.value));
            updateVisual();
        });

        bgColor.addEventListener('input', () => {
            const c = parseInt(bgColor.value.slice(1), 16);
            this.scene.background.set(c);
            this.scene.fog.color.set(c);
        });

        // === Material & Ground Selection ===
        this._initMaterialUI();

        // === Community Contribution ===
        document.getElementById('contrib-submit-btn')?.addEventListener('click', () => this._submitContribution());

        // === Language Toggle ===
        const langBtn = document.getElementById('lang-toggle');
        this._applyLang();
        langBtn.addEventListener('click', () => {
            const next = getLang() === 'ko' ? 'en' : 'ko';
            setLang(next);
            this._applyLang();
            this._populateMaterialSelect();
            this._populateGroundSelect();
            this.simManager._renderCardList();
        });
    }

    _initMaterialUI() {
        const catSel = document.getElementById('sel-category');
        const matSel = document.getElementById('sel-material');
        const gndSel = document.getElementById('sel-ground');
        const depthSlider = document.getElementById('param-foundationDepth');

        this._populateMaterialSelect();
        this._populateGroundSelect();

        catSel.addEventListener('change', () => this._populateMaterialSelect());

        matSel.addEventListener('change', () => {
            const key = matSel.value;
            const mat = MATERIALS[key];
            if (!mat) return;
            this.physics.applyMaterial(mat);
            this._showMaterialInfo(key);
            // Update particle color to material color
            if (mat.color) {
                document.getElementById('color-primary').value = mat.color;
                this.particleSystem.setColorMode('single', mat.color, null);
            }
        });

        gndSel.addEventListener('change', () => {
            const key = gndSel.value;
            const gnd = GROUNDS[key];
            if (!gnd) return;
            this.physics.applyGround(gnd);
            // Update ground visual color
            if (gnd.color && this.neonRenderer.ground) {
                this.neonRenderer.ground.material.color.set(gnd.color);
            }
        });

        depthSlider.addEventListener('input', () => {
            const v = parseFloat(depthSlider.value);
            this.physics.foundationDepth = v;
            this.physics.updateDerivedPhysics();
            const display = document.querySelector('.param-value[data-for="param-foundationDepth"]');
            if (display) display.textContent = v.toFixed(1) + 'm';
        });
    }

    _populateMaterialSelect() {
        const cat = document.getElementById('sel-category').value;
        const sel = document.getElementById('sel-material');
        const lang = getLang();
        sel.innerHTML = '';
        for (const [key, mat] of Object.entries(MATERIALS)) {
            if (mat.category !== cat) continue;
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = mat.name[lang] || mat.name.en;
            sel.appendChild(opt);
        }
        // Auto-select first and apply
        if (sel.options.length > 0) {
            sel.dispatchEvent(new Event('change'));
        }
    }

    _populateGroundSelect() {
        const sel = document.getElementById('sel-ground');
        const lang = getLang();
        sel.innerHTML = '';
        for (const [key, gnd] of Object.entries(GROUNDS)) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = gnd.name[lang] || gnd.name.en;
            sel.appendChild(opt);
        }
    }

    _showMaterialInfo(key) {
        const mat = MATERIALS[key];
        const lang = getLang();
        const info = document.getElementById('material-info');
        if (!info || !mat) return;
        const fmt = (v, unit) => {
            if (v >= 1e9) return (v/1e9).toFixed(1) + ' G' + unit;
            if (v >= 1e6) return (v/1e6).toFixed(1) + ' M' + unit;
            if (v >= 1e3) return (v/1e3).toFixed(1) + ' k' + unit;
            if (v < 0.01) return v.toExponential(1) + ' ' + unit;
            return v.toFixed(2) + ' ' + unit;
        };
        info.innerHTML = `
            <div class="info-row"><span>ρ</span><span>${mat.density} kg/m³</span></div>
            <div class="info-row"><span>E</span><span>${fmt(mat.youngsModulus, 'Pa')}</span></div>
            <div class="info-row"><span>σy</span><span>${fmt(mat.yieldStrength, 'Pa')}</span></div>
            <div class="info-row"><span>ν</span><span>${mat.poissonRatio}</span></div>
            <div class="info-row"><span>α</span><span>${mat.thermalExpansion.toExponential(1)} /K</span></div>
            <div class="info-row"><span>Tm</span><span>${mat.meltingPoint} K</span></div>
        `;
    }

    async _submitContribution() {
        const name = document.getElementById('contrib-name').value || 'Anonymous';
        const domain = document.getElementById('contrib-domain').value;
        const type = document.getElementById('contrib-type').value;
        const content = document.getElementById('contrib-content').value;
        const status = document.getElementById('contrib-status');

        if (!content.trim()) {
            status.textContent = '⚠ Content required';
            return;
        }

        try {
            const res = await fetch('/api/contributions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ author: name, domain, type, content }),
            });
            if (res.ok) {
                status.textContent = '✓ Submitted! Thank you for your contribution.';
                document.getElementById('contrib-content').value = '';
            } else {
                status.textContent = '✗ Server error';
            }
        } catch {
            status.textContent = '✗ Offline — saved locally';
        }
    }

    _applyLang() {
        const lang = getLang();
        document.getElementById('lang-toggle').textContent = lang.toUpperCase();

        // Update all data-i18n elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const val = t(key);
            if (el.tagName === 'OPTION') {
                el.textContent = val;
            } else if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
                el.textContent = val;
            } else {
                el.innerHTML = val;
            }
        });

        // Update placeholder attributes
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.dataset.i18nPlaceholder);
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
        // Core physics (SI units)
        this.physics.GRAVITY = p.gravity;               // m/s²
        this.timeScale = p.timeScale;

        // Wind & environment
        this.physics.windX = p.windX || 0;
        this.physics.windY = p.windY || 0;
        this.physics.windZ = p.windZ || 0;
        this.physics.turbulence = p.turbulence || 0;
        this.physics.viscosity = p.viscosity || 0;
        this.physics.temperature = p.temperature || 293;

        // Material properties — sliders map to real SI units
        // density slider (0.1–20) → ×1000 = kg/m³
        // springK slider (0–100) → ×1e9 = Pa (GPa)
        // damping slider (0–1) → inverted to damping ratio ζ
        // yieldStrength slider (0–100) → ×1e6 = Pa (MPa)
        this.physics.materialDensity = (p.density || 2.4) * 1000;
        this.physics.youngsModulus = (p.springStiffness || 20) * 1e9;
        this.physics.dampingRatio = Math.max(0.001, 1.0 - (p.damping || 0.97));
        this.physics.materialYieldStrength = (p.yieldStrength || 50) * 1e6;

        // Foundation depth (m)
        this.physics.foundationDepth = p.foundation || 5.0;

        // Ground properties (friction & bounciness from sliders directly)
        this.physics.friction = p.friction || 0.8;
        this.physics.bounciness = p.bounciness || 0.3;

        // Hazards (SI)
        this.physics.seismic = p.seismic || 0;          // m/s²
        this.physics.seismicFreq = p.seismicFreq || 2.0; // Hz
        this.physics.snowLoad = p.snowLoad || 0;         // kN/m²
        this.physics.floodLevel = p.floodLevel || 0;     // m

        // Recalculate all derived quantities (mass, spring K, damping)
        this.physics.updateDerivedPhysics();
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

    _updateQualityBadge() {
        const badge = document.getElementById('quality-badge');
        badge.textContent = this.quality.label;
        badge.className = this.quality.label.toLowerCase();

        // Click to cycle quality
        badge.onclick = () => {
            const tiers = [QUALITY.LOW, QUALITY.MEDIUM, QUALITY.HIGH];
            const idx = tiers.findIndex(t => t.label === this.quality.label);
            const next = tiers[(idx + 1) % tiers.length];
            this.quality = next;
            this.neonRenderer.setQuality(next);
            this._updateQualityBadge();
            console.log(`[Quality] Switched to ${next.label}`);
        };
    }
}

// ==================== START ====================
const app = new App();
