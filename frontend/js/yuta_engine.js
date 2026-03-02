import * as THREE from 'three';
import { FlyControls } from 'three/addons/controls/FlyControls.js';

window.YutaEngine = (function() {
    // ─── STATE ───────────────────────────────────────────────────────────
    let prev = 'neutral', phase = 'idle', phaseT = 0, domainT = 0;
    let flash = 1.0, shake = 0, dt = 0, lastTime = 0;
    let W, H;
    let isInitialized = false;
    
    // ─── DOM / CANVAS REFS ───────────────────────────────────────────────
    let fxC, X, glC;
    
    // ─── THREE.JS REFS & YUTA VARIABLES ──────────────────────────────────
    let renderer, scene, camera, controls, domainGroup, embers;
    const emberCount = 300;
    const emberVel = [];
    const dummy = new THREE.Object3D();

    function resize() {
        if (!fxC) return;
        W = fxC.width = window.innerWidth;
        H = fxC.height = window.innerHeight;
        if (renderer) renderer.setSize(W, H);
        if (camera) {
            camera.aspect = W / H;
            camera.updateProjectionMatrix();
        }
    }

    // ─── RENDER LOOP ─────────────────────────────────────────────────────
    function render(now) {
        requestAnimationFrame(render);
        dt = Math.min((now - (lastTime || now)) / 1000, 0.033); lastTime = now;

        const isYuta = window.currentDomain === 'yuta';
        const flashEl = document.getElementById('flash');
        const titleEl = document.getElementById('domain-title');

        // Only allow fly controls after the cinematic intro finishes
        if(phase === 'domain' && controls) {
            controls.update(dt);
        }

        // Kill Switch & Phase Control
        if(isYuta && prev !== 'yuta') {
            // TRIGGER CINEMATIC FLY-IN
            phase = 'flyin'; phaseT = 0; domainT = 0; flash = 1.0; shake = 2.0;
            camera.position.set(15, 1.0, 80); // Reset camera to edge of domain
        }
        if(!isYuta && prev === 'yuta') { 
            phase = 'idle'; 
            X.clearRect(0,0,W,H);
            if (renderer) renderer.clear();
            if (domainGroup) domainGroup.visible = false;
            if (glC) glC.style.transform = '';
            fxC.style.transform = '';
        }
        prev = window.currentDomain;

        if (phase === 'idle') return;

        // Phase Timers
        if(phase === 'flyin') {
            phaseT += dt; 
            shake = Math.max(0, 2.0 - phaseT); // Taper off shake smoothly
            if(phaseT > 2.5) { phase = 'domain'; phaseT = 0; shake = 0; } 
        } else if(phase === 'domain') { 
            domainT += dt; shake = 0;
        }

        // ─── THREE.JS 3D RENDER ──────────────────────────────────────────
        if(phase === 'flyin' || phase === 'domain') {
            domainGroup.visible = true;

            if (phase === 'flyin') {
                // CINEMATIC CAMERA LOGIC
                const progress = Math.min(phaseT / 2.5, 1.0);
                const ease = 1 - Math.pow(1 - progress, 4); // Quartic ease-out

                camera.position.set(
                    15 * (1 - ease) + 0 * ease,   // Sweep in from right
                    1.0 * (1 - ease) + 3.0 * ease, // Start low, rise up
                    80 * (1 - ease) + 20 * ease    // Rush forward
                );
                camera.lookAt(0, 8, -45); // Lock focus on giant crosses
            } else if (phase === 'domain') {
                // ETHEREAL HOVER LOGIC
                camera.position.y += Math.sin(domainT * 0.5) * 0.005;
            }

            // Animate drifting embers
            const positions = embers.geometry.attributes.position.array;
            for(let i=0; i<emberCount; i++) {
                const v = emberVel[i]; 
                positions[i*3+1] += v.y; 
                positions[i*3] += v.x + Math.sin(domainT * 2 + i) * 0.01; 
                positions[i*3+2] += v.z + Math.cos(domainT * 2 + i) * 0.01;
                if(positions[i*3+1] > 20) positions[i*3+1] = 0; 
            }
            embers.geometry.attributes.position.needsUpdate = true;
            
            renderer.render(scene, camera);
        }

        // ─── 2D FX RENDER & UI ───────────────────────────────────────────
        X.clearRect(0, 0, W, H); // Clean up 2D canvas since everything is 3D

        if(flash > 0.004) { flashEl.style.opacity = Math.min(flash, 1.0); flash *= 0.90; } else { flashEl.style.opacity = 0; flash = 0; }
        
        if(shake > 0.01) {
            const jx = (Math.random() - 0.5) * shake * 15, jy = (Math.random() - 0.5) * shake * 15;
            if(glC) glC.style.transform = `translate(${jx}px,${jy}px)`;
            fxC.style.transform = `translate(${jx}px,${jy}px)`; 
            shake *= 0.85;
        } else { 
            if(glC) glC.style.transform = ''; 
            fxC.style.transform = ''; 
            shake = 0; 
        }

        // Fade title in during the last 0.7 seconds of the cinematic fly-in
        if (titleEl) {
            if (phase === 'domain') {
                titleEl.style.opacity = 1;
            } else if (phase === 'flyin' && phaseT > 1.8) {
                titleEl.style.opacity = Math.min(1, (phaseT - 1.8) / 0.7);
            } else {
                titleEl.style.opacity = 0;
            }
        }
    }

    // ─── INITIALIZATION ──────────────────────────────────────────────────
    return {
        init: function() {
            if (isInitialized) return;
            isInitialized = true;

            // 1. Hook into existing 2D FX canvas
            fxC = document.getElementById('fx-canvas');
            X = fxC.getContext('2d', { alpha: true });

            // 2. Generate a dedicated Three.js canvas
            glC = document.createElement('canvas');
            glC.id = 'yuta-canvas';
            glC.style.position = 'fixed';
            glC.style.top = '0'; 
            glC.style.left = '0';
            glC.style.zIndex = '4'; // Behind 2D FX
            glC.style.pointerEvents = 'auto'; // Needed for FlyControls
            document.body.appendChild(glC);

            // 3. Setup Three.js Scene with r160 Standards
            renderer = new THREE.WebGLRenderer({ canvas: glC, antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.outputColorSpace = THREE.SRGBColorSpace; 
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 0.9;                 

            scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(0x11131a, 0.025);

            camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 3, 20);

            controls = new FlyControls(camera, renderer.domElement);
            controls.movementSpeed = 25; 
            controls.rollSpeed = Math.PI / 6; 
            controls.autoForward = false; 
            controls.dragToLook = true;

            // 4. Lighting
            scene.add(new THREE.AmbientLight(0x202535, 0.8)); 
            const paleMoon = new THREE.DirectionalLight(0xaaccff, 1.5); 
            paleMoon.position.set(20, 50, -30); 
            scene.add(paleMoon);
            
            const crossLight1 = new THREE.PointLight(0xffccdd, 400, 100); 
            crossLight1.position.set(-25, 15, -45); 
            scene.add(crossLight1);
            
            const crossLight2 = new THREE.PointLight(0xffffff, 400, 100); 
            crossLight2.position.set(25, 20, -50); 
            scene.add(crossLight2);

            domainGroup = new THREE.Group();
            domainGroup.visible = false;
            scene.add(domainGroup);

            // 5. Build Environment
            // Floor
            const floorGeo = new THREE.PlaneGeometry(250, 250, 64, 64);
            const posAttr = floorGeo.attributes.position;
            for(let i = 0; i < posAttr.count; i++) posAttr.setZ(i, (Math.random() - 0.5) * 1.5);
            floorGeo.computeVertexNormals();
            const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9, metalness: 0.1, flatShading: true }));
            floor.rotation.x = -Math.PI / 2;
            domainGroup.add(floor);

            // Instanced Swords (800 of them)
            const swordCount = 800;
            const blades = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 2.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.9, roughness: 0.2 }), swordCount);
            const guards = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.05, 0.4), new THREE.MeshStandardMaterial({ color: 0xbba355, metalness: 0.8, roughness: 0.4 }), swordCount);
            const grips = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }), swordCount);

            for(let i = 0; i < swordCount; i++) {
                const r = 5 + Math.random() * 80, theta = Math.random() * Math.PI * 2;
                const sx = Math.cos(theta) * r, sz = Math.sin(theta) * r;
                const sy = -0.2 - Math.random() * 0.8; 
                const rotX = (Math.random() - 0.5) * 0.4, rotZ = (Math.random() - 0.5) * 0.4, rotY = Math.random() * Math.PI;

                dummy.position.set(sx, sy + 1.25, sz); dummy.rotation.set(rotX, rotY, rotZ); dummy.updateMatrix(); blades.setMatrixAt(i, dummy.matrix);
                dummy.position.set(sx, sy + 2.5, sz); dummy.updateMatrix(); guards.setMatrixAt(i, dummy.matrix);
                dummy.position.set(sx, sy + 2.9, sz); dummy.updateMatrix(); grips.setMatrixAt(i, dummy.matrix);
            }
            domainGroup.add(blades); domainGroup.add(guards); domainGroup.add(grips);

            // Giant Crosses
            const crossMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.8 });
            function createGiantCross(x, z, height, tilt) {
                const group = new THREE.Group();
                const main = new THREE.Mesh(new THREE.BoxGeometry(2, height, 2), crossMat); main.position.y = height / 2; group.add(main);
                const cross = new THREE.Mesh(new THREE.BoxGeometry(2, height, 2), crossMat); cross.scale.set(1, 0.4, 1); cross.position.y = height * 0.7; cross.rotation.z = Math.PI / 2; group.add(cross);
                const diag = new THREE.Mesh(new THREE.BoxGeometry(2, height, 2), crossMat); diag.scale.set(0.6, 0.6, 0.6); diag.position.y = height * 0.6; diag.rotation.z = Math.PI / 4; group.add(diag);
                group.position.set(x, 0, z); group.rotation.z = tilt; group.rotation.y = (Math.random() - 0.5); return group;
            }
            domainGroup.add(createGiantCross(-25, -45, 35, 0.1)); 
            domainGroup.add(createGiantCross(25, -50, 45, -0.15));

            // Floating Embers
            const emberPos = new Float32Array(emberCount * 3);
            for(let i=0; i<emberCount; i++) {
                emberPos[i*3] = (Math.random() - 0.5) * 80; 
                emberPos[i*3+1] = Math.random() * 20; 
                emberPos[i*3+2] = (Math.random() - 0.5) * 80;
                emberVel.push({ y: 0.01 + Math.random() * 0.03, x: (Math.random() - 0.5) * 0.02, z: (Math.random() - 0.5) * 0.02 });
            }
            const emberGeo = new THREE.BufferGeometry(); 
            emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
            embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: 0xffccdd, size: 0.2, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
            domainGroup.add(embers);

            window.addEventListener('resize', resize);
            resize();
            requestAnimationFrame(render);
        }
    };
})();