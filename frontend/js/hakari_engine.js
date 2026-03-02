import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.HakariEngine = (function() {
    // ─── STATE ───────────────────────────────────────────────────────────
    let prev = 'neutral', phase = 'idle', phaseT = 0, domainT = 0;
    let flash = 0, shake = 0, dt = 0, lastTime = 0;
    let W, H;
    let isInitialized = false;
    
    // ─── DOM / CANVAS REFS ───────────────────────────────────────────────
    let fxC, X, glC;
    
    // ─── THREE.JS REFS & HAKARI VARIABLES ────────────────────────────────
    let renderer, scene, camera, domainGroup;
    let lightPink, lightGold, tvBacklight;
    let reelMat, sunburstGroup, ballMesh;
    
    const ballCount = 400;
    const ballData = [];
    const dummy = new THREE.Object3D();

    // ─── 2D FX (TRAIN DOORS) ─────────────────────────────────────────────
    let DOORS = [];
    
    function resetDoors() {
        DOORS = [
            // BACK DOOR (Drawn first, opens last, Gold, smallest)
            { delay: 1.0, speed: 4.5, colorBase: 180, accent: '#ffd700', open: 0, scale: 0.8 },
            // MIDDLE DOOR (Drawn second, opens second, Cyan, medium)
            { delay: 0.5, speed: 3.5, colorBase: 100, accent: '#00ffff', open: 0, scale: 0.9 },
            // FRONT DOOR (Drawn last, opens first, Pink, full screen)
            { delay: 0.0, speed: 2.5, colorBase: 50,  accent: '#ff00aa', open: 0, scale: 1.0 }
        ];
    }

    function drawTrainDoors() {
        X.clearRect(0, 0, W, H);
        const halfW = W / 2;
        
        // Draw a dark tunnel background so we don't see the 3D domain until the final door opens
        if (DOORS[0].open < 1.0) {
            X.fillStyle = '#050508';
            X.fillRect(0, 0, W, H);
        }

        DOORS.forEach(d => {
            if (phaseT > d.delay) d.open += dt * d.speed;
            
            const p = Math.min(Math.max(d.open, 0), 1.2);
            const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
            
            // Apply perspective scale to make a "tunnel"
            const dHeight = H * d.scale;
            const yOffset = (H - dHeight) / 2;
            const dWidth = halfW * d.scale;
            const xOffsetLeft = halfW - dWidth;
            
            const offset = ease * dWidth;
            
            // If this door is completely off-screen, skip drawing it
            if (offset >= dWidth) return; 
            
            // Left Door Gradient
            const gradL = X.createLinearGradient(xOffsetLeft - offset, 0, halfW - offset, 0);
            gradL.addColorStop(0, `rgb(${d.colorBase-30}, ${d.colorBase-30}, ${d.colorBase-30})`);
            gradL.addColorStop(0.7, `rgb(${d.colorBase+40}, ${d.colorBase+40}, ${d.colorBase+50})`);
            gradL.addColorStop(1, `rgb(${d.colorBase}, ${d.colorBase}, ${d.colorBase})`);
            
            X.fillStyle = gradL; 
            X.fillRect(xOffsetLeft - offset, yOffset, dWidth, dHeight); 
            
            // Right Door Gradient
            const gradR = X.createLinearGradient(halfW + offset, 0, halfW + dWidth + offset, 0);
            gradR.addColorStop(0, `rgb(${d.colorBase}, ${d.colorBase}, ${d.colorBase})`);
            gradR.addColorStop(0.3, `rgb(${d.colorBase+40}, ${d.colorBase+40}, ${d.colorBase+50})`);
            gradR.addColorStop(1, `rgb(${d.colorBase-30}, ${d.colorBase-30}, ${d.colorBase-30})`);

            X.fillStyle = gradR;
            X.fillRect(halfW + offset, yOffset, dWidth, dHeight);

            // Glowing Rubber Strips
            X.fillStyle = d.accent; 
            X.fillRect(halfW - offset - (12 * d.scale), yOffset, 12 * d.scale, dHeight); 
            X.fillRect(halfW + offset, yOffset, 12 * d.scale, dHeight);
            
            // Tinted Windows
            X.fillStyle = 'rgba(10, 15, 20, 0.9)'; 
            const winW = 120 * d.scale;
            const winH = H * 0.45 * d.scale;
            const winY = yOffset + (dHeight * 0.25);
            X.fillRect(halfW - offset - (180 * d.scale), winY, winW, winH);
            X.fillRect(halfW + offset + (60 * d.scale), winY, winW, winH);
            
            // Window Frames
            X.strokeStyle = '#111';
            X.lineWidth = 6 * d.scale;
            X.strokeRect(halfW - offset - (180 * d.scale), winY, winW, winH);
            X.strokeRect(halfW + offset + (60 * d.scale), winY, winW, winH);
            
            // Outer Door Frame Outline
            X.strokeStyle = '#000';
            X.lineWidth = 4;
            X.strokeRect(xOffsetLeft, yOffset, dWidth * 2, dHeight);
        });
    }

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

        const isHakari = window.currentDomain === 'hakari';
        const flashEl = document.getElementById('flash');
        const titleEl = document.getElementById('domain-title');

        // Kill Switch & Phase Control
        if(isHakari && prev !== 'hakari') {
            phase = 'doors'; phaseT = 0; domainT = 0; flash = 0; shake = 2.0;
            resetDoors();
        }
        if(!isHakari && prev === 'hakari') { 
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
        if(phase === 'doors') {
            phaseT += dt; shake = Math.max(shake, 1.5 + Math.random() * 2.0);
            if(phaseT > 2.0) { phase = 'settle'; phaseT = 0; flash = 1.0; shake = 6.0; } 
        } else if(phase === 'settle') {
            phaseT += dt; domainT += dt; if(phaseT > 0.8) { phase = 'domain'; phaseT = 0; shake = 0; }
        } else if(phase === 'domain') { 
            domainT += dt; shake = 0;
        }

        // ─── THREE.JS 3D RENDER ──────────────────────────────────────────
        if(phase === 'domain' || phase === 'settle') {
            domainGroup.visible = true;
            
            // Screens & Backdrop Animation
            if (reelMat) reelMat.uniforms.time.value = domainT;
            if (sunburstGroup) sunburstGroup.rotation.z = domainT * -0.5;
            
            // Fever Mode Pulsing Lights
            const pulse = Math.sin(domainT * 12);
            if (lightPink) lightPink.intensity = 400 + pulse * 300;
            if (lightGold) lightGold.intensity = 400 - pulse * 300;
            if (tvBacklight) tvBacklight.intensity = 600 + Math.cos(domainT * 10) * 400;

            // Pachinko Physics
            for(let i=0; i<ballCount; i++) {
                let b = ballData[i]; 
                b.vy -= 9.8 * dt; 
                b.y += b.vy * dt;
                if (b.y < 0.5) { 
                    b.y = 0.5; 
                    b.vy = Math.abs(b.vy) * b.bounce; 
                }
                dummy.position.set(b.x, b.y, b.z); 
                dummy.updateMatrix(); 
                ballMesh.setMatrixAt(i, dummy.matrix);
            }
            ballMesh.instanceMatrix.needsUpdate = true;
            
            renderer.render(scene, camera);
        }

        // ─── 2D FX RENDER ────────────────────────────────────────────────
        if(phase === 'doors' || phase === 'settle') {
            drawTrainDoors();
        } else {
            X.clearRect(0, 0, W, H);
        }

        // ─── UI & SHAKE ──────────────────────────────────────────────────
        if(flash > 0.004) { flashEl.style.opacity = flash; flash *= 0.85; } else { flashEl.style.opacity = 0; flash = 0; }
        
        if(shake > 0.01) {
            const jx = (Math.random() - 0.5) * shake * 30, jy = (Math.random() - 0.5) * shake * 30;
            if(glC) glC.style.transform = `translate(${jx}px,${jy}px)`;
            fxC.style.transform = `translate(${jx}px,${jy}px)`; 
            shake *= 0.88;
        } else { 
            if(glC) glC.style.transform = ''; 
            fxC.style.transform = ''; 
            shake = 0; 
        }

        if (titleEl) titleEl.style.opacity = phase === 'domain' && domainT > 0.5 ? Math.min(1, (domainT - 0.5) / 0.5) : 0;
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
            glC.id = 'hakari-canvas';
            glC.style.position = 'fixed';
            glC.style.top = '0'; 
            glC.style.left = '0';
            glC.style.zIndex = '4'; // Behind 2D FX
            glC.style.pointerEvents = 'none';
            document.body.appendChild(glC);

            // 3. Setup Three.js Scene with r160 Standards
            renderer = new THREE.WebGLRenderer({ canvas: glC, antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.outputColorSpace = THREE.SRGBColorSpace; 
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.2;                 

            scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(0x1a0520, 0.015);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 5, 15);

            // 4. Lighting
            scene.add(new THREE.AmbientLight(0xffffff, 0.6));
            
            lightPink = new THREE.PointLight(0xff00aa, 600, 100); 
            lightPink.position.set(-15, 15, -10); 
            scene.add(lightPink);
            
            lightGold = new THREE.PointLight(0xffd700, 600, 100); 
            lightGold.position.set(15, 15, -10); 
            scene.add(lightGold);

            domainGroup = new THREE.Group();
            domainGroup.visible = false;
            scene.add(domainGroup);

            // 5. Build Environment
            const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(200, 200), 
                new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.8 })
            );
            floor.rotation.x = -Math.PI / 2;
            domainGroup.add(floor);
            domainGroup.add(new THREE.GridHelper(200, 40, 0xff00aa, 0x440044));

            // Slot Machine Models
            const loader = new GLTFLoader();
            loader.load('./slot_machine.glb', function(gltf) {
                const originalSlot = gltf.scene;
                originalSlot.scale.set(12, 12, 12); 

                for(let z = -60; z < 30; z += 12) {
                    const slotL = originalSlot.clone();
                    slotL.position.set(-15, 0, z);
                    slotL.rotation.y = Math.PI / 2.5;
                    domainGroup.add(slotL);

                    const slotR = originalSlot.clone();
                    slotR.position.set(15, 0, z);
                    slotR.rotation.y = -Math.PI / 2.5;
                    domainGroup.add(slotR);
                }
            }, undefined, function(e) { console.error('Error loading Slot Machine GLB:', e); });

            // Giant 7-7-7 Screen
            reelMat = new THREE.ShaderMaterial({
                uniforms: { time: { value: 0 } },
                vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `uniform float time; varying vec2 vUv; void main() { float r1 = step(0.1, fract(vUv.y * 5.0 - time * 10.0)); float r2 = step(0.1, fract(vUv.y * 5.0 - time * 12.0)); float r3 = step(0.1, fract(vUv.y * 5.0 - time * 8.0)); vec3 color = vec3(0.05); if (vUv.x < 0.33) color = mix(color, vec3(1.0, 0.0, 0.5), r1); else if (vUv.x < 0.66) color = mix(color, vec3(0.0, 1.0, 0.5), r2); else color = mix(color, vec3(1.0, 0.8, 0.0), r3); gl_FragColor = vec4(color, 1.0); }`,
                side: THREE.DoubleSide
            });
            const giantScreen = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), reelMat);
            giantScreen.position.set(0, 18, -39.5);
            domainGroup.add(giantScreen);

            // Metallic TV Frame
            const frameGeo = new THREE.BoxGeometry(42, 22, 2);
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 });
            const tvFrame = new THREE.Mesh(frameGeo, frameMat);
            tvFrame.position.set(0, 18, -41);
            domainGroup.add(tvFrame);

            // Spinning Neon Sunburst
            sunburstGroup = new THREE.Group();
            sunburstGroup.position.set(0, 18, -42);
            const barGeo = new THREE.BoxGeometry(0.8, 70, 0.8);
            const barMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 2.0 });
            for(let i=0; i<16; i++) {
                const bar = new THREE.Mesh(barGeo, barMat);
                bar.rotation.z = (i / 16) * Math.PI;
                sunburstGroup.add(bar);
            }
            domainGroup.add(sunburstGroup);

            // Intense Magenta Backlight
            tvBacklight = new THREE.PointLight(0xff00aa, 800, 120);
            tvBacklight.position.set(0, 18, -45);
            domainGroup.add(tvBacklight);

            // Enclosing Back Wall
            const backWall = new THREE.Mesh(
                new THREE.PlaneGeometry(200, 100),
                new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.8, roughness: 0.1 })
            );
            backWall.position.set(0, 20, -55);
            domainGroup.add(backWall);

            // Pachinko Balls Initialization
            ballMesh = new THREE.InstancedMesh(
                new THREE.SphereGeometry(0.5, 12, 12), 
                new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 1.0, roughness: 0.1 }), 
                ballCount
            );
            for(let i = 0; i < ballCount; i++) {
                ballData.push({ 
                    x: (Math.random()-0.5)*80, 
                    y: Math.random()*50, 
                    z: (Math.random()-0.5)*80-10, 
                    vy: -Math.random()*0.4, 
                    bounce: 0.6+Math.random()*0.3 
                });
            }
            domainGroup.add(ballMesh);

            window.addEventListener('resize', resize);
            resize();
            requestAnimationFrame(render);
        }
    };
})();