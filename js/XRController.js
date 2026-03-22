import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class XRController {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // Enable WebXR
        renderer.xr.enabled = true;

        // Create VR button — positioned above bottom panel
        const vrButton = VRButton.createButton(renderer);
        vrButton.style.fontFamily = "'Courier New', monospace";
        vrButton.style.borderColor = '#00ffff';
        vrButton.style.color = '#00ffff';
        vrButton.style.background = 'rgba(0, 20, 30, 0.8)';
        vrButton.style.bottom = '90px';
        vrButton.style.zIndex = '100';
        document.body.appendChild(vrButton);

        // Orbit controls for non-XR mode
        this.controls = new OrbitControls(camera, renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 80;
        this.controls.maxPolarAngle = Math.PI * 0.85;
        this.controls.target.set(0, 3, 0);

        // XR Controllers
        this.controller1 = renderer.xr.getController(0);
        this.controller2 = renderer.xr.getController(1);
        scene.add(this.controller1);
        scene.add(this.controller2);

        // Controller ray visualisation
        const rayGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -5)
        ]);
        const rayMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.5,
        });

        const ray1 = new THREE.Line(rayGeometry, rayMaterial);
        const ray2 = new THREE.Line(rayGeometry.clone(), rayMaterial.clone());
        this.controller1.add(ray1);
        this.controller2.add(ray2);

        // XR session events
        renderer.xr.addEventListener('sessionstart', () => {
            const overlay = document.getElementById('ui-overlay');
            if (overlay) overlay.style.display = 'none';
            this.controls.enabled = false;
        });

        renderer.xr.addEventListener('sessionend', () => {
            const overlay = document.getElementById('ui-overlay');
            if (overlay) overlay.style.display = 'flex';
            this.controls.enabled = true;
        });
    }

    update() {
        if (!this.renderer.xr.isPresenting) {
            this.controls.update();
        }
    }

    dispose() {
        this.controls.dispose();
    }
}
