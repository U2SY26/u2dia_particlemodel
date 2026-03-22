import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/**
 * Quality presets for different GPU tiers
 */
export const QUALITY = {
    LOW: {
        label: 'LOW',
        bloomStrength: 0.3,
        bloomRadius: 0.1,
        bloomThreshold: 0.4,
        bloomResScale: 0.25,
        particleSegments: 4,
        particleRings: 3,
        maxParticles: 10000,
        pixelRatio: 1.0,
    },
    MEDIUM: {
        label: 'MEDIUM',
        bloomStrength: 0.6,
        bloomRadius: 0.2,
        bloomThreshold: 0.3,
        bloomResScale: 0.5,
        particleSegments: 5,
        particleRings: 3,
        maxParticles: 20000,
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
    },
    HIGH: {
        label: 'HIGH',
        bloomStrength: 0.9,
        bloomRadius: 0.3,
        bloomThreshold: 0.2,
        bloomResScale: 1.0,
        particleSegments: 6,
        particleRings: 4,
        maxParticles: 50000,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
    },
};

/**
 * Auto-detect GPU tier based on renderer info
 */
export function detectQuality(renderer) {
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

    let gpuName = 'unknown';
    if (debugInfo) {
        gpuName = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
    }

    console.log(`[GPU] Detected: ${gpuName}`);

    // Integrated GPU keywords
    const iGPU = [
        'intel', 'uhd', 'iris', 'hd graphics',
        'adreno', 'mali', 'powervr', 'apple gpu',
        'swiftshader', 'llvmpipe', 'softpipe',
    ];

    // Low-end discrete
    const lowDiscrete = [
        'geforce mx', 'geforce gt', 'radeon rx 5[0-3]', 'radeon 5[0-5]0',
    ];

    if (iGPU.some(k => gpuName.includes(k))) {
        console.log('[GPU] Tier: LOW (integrated GPU detected)');
        return QUALITY.LOW;
    }

    if (lowDiscrete.some(k => gpuName.match(new RegExp(k)))) {
        console.log('[GPU] Tier: MEDIUM (low-end discrete GPU)');
        return QUALITY.MEDIUM;
    }

    console.log('[GPU] Tier: HIGH');
    return QUALITY.HIGH;
}

export class NeonRenderer {
    constructor(renderer, scene, camera, quality = null) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // Auto-detect quality if not specified
        this.quality = quality || detectQuality(renderer);

        // Apply pixel ratio
        renderer.setPixelRatio(this.quality.pixelRatio);

        // Setup renderer for neon effect
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 1.0;

        // Setup scene atmosphere
        scene.background = new THREE.Color(0x000508);
        scene.fog = new THREE.Fog(0x000508, 40, 100);

        // Ambient light (very dim)
        const ambient = new THREE.AmbientLight(0x111122, 0.15);
        scene.add(ambient);

        // Ground plane
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x000a0a,
            roughness: 0.85,
            metalness: 0.3,
        });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.01;
        this.ground.receiveShadow = true;
        scene.add(this.ground);

        // Grid helper for spatial reference
        const gridHelper = new THREE.GridHelper(100, 100, 0x002222, 0x001111);
        gridHelper.position.y = 0.01;
        scene.add(gridHelper);

        // Effect composer for bloom
        const size = new THREE.Vector2();
        renderer.getSize(size);

        this.composer = new EffectComposer(renderer);

        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        const q = this.quality;
        const bloomW = Math.floor(size.x * q.bloomResScale);
        const bloomH = Math.floor(size.y * q.bloomResScale);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(bloomW, bloomH),
            q.bloomStrength,
            q.bloomRadius,
            q.bloomThreshold,
        );
        this.composer.addPass(this.bloomPass);
    }

    render() {
        if (this.renderer.xr.isPresenting) {
            this.renderer.render(this.scene, this.camera);
        } else {
            this.composer.render();
        }
    }

    onResize(width, height) {
        this.composer.setSize(width, height);
        const q = this.quality;
        this.bloomPass.resolution.set(
            Math.floor(width * q.bloomResScale),
            Math.floor(height * q.bloomResScale),
        );
    }

    setQuality(quality) {
        this.quality = quality;
        this.renderer.setPixelRatio(quality.pixelRatio);
        this.bloomPass.strength = quality.bloomStrength;
        this.bloomPass.radius = quality.bloomRadius;
        this.bloomPass.threshold = quality.bloomThreshold;

        const size = new THREE.Vector2();
        this.renderer.getSize(size);
        this.onResize(size.x, size.y);
    }

    setBloomParams(strength, radius, threshold) {
        this.bloomPass.strength = strength;
        this.bloomPass.radius = radius;
        this.bloomPass.threshold = threshold;
    }

    dispose() {
        this.ground.geometry.dispose();
        this.ground.material.dispose();
        this.composer.dispose();
    }
}
