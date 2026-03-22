import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class NeonRenderer {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // Setup renderer for neon effect
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 1.5;

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

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(size.x, size.y),
            1.8,   // strength
            0.4,   // radius
            0.1    // threshold
        );
        this.composer.addPass(this.bloomPass);
    }

    render() {
        if (this.renderer.xr.isPresenting) {
            // In XR mode, render directly (bloom doesn't work with WebXR)
            this.renderer.render(this.scene, this.camera);
        } else {
            this.composer.render();
        }
    }

    onResize(width, height) {
        this.composer.setSize(width, height);
        this.bloomPass.resolution.set(width, height);
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
