import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.MahoragaEngine = (function() {
    // ─── STATE ───────────────────────────────────────────────────────────
    let prev = 'neutral', phase = 'idle', phaseT = 0, domainT = 0;
    let flash = 0, shake = 0, dt = 0, lastTime = 0;
    let W, H;
    let isInitialized = false;
    
    // ─── DOM / CANVAS REFS ───────────────────────────────────────────────
    let fxC, X, glC;
    
    // ─── THREE.JS REFS & VARIABLES ───────────────────────────────────────
    let renderer, scene, camera, domainGroup;

    // ─── MAHORAGA WHEEL FX (2D) ──────────────────────────────────────────
    function drawWheel(t) {
        X.clearRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2;
        let angle = 0;

        // Phase 1: Spin slowly once (0s to 2.0s)
        if (t < 2.0) {
            let p = t / 2.0;
            // Ease In-Out curve
            let ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; 
            angle = ease * Math.PI * 2;
        } 
        // Phase 2: Spin twice, faster (2.0s to 3.5s)
        else if (t < 3.5) {
            let p = (t - 2.0) / 1.5;
            let ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            angle = (Math.PI * 2) + (ease * Math.PI * 4);
        } 
        else {
            return; // Stop drawing after 3.5s (Flash happens here)
        }

        // Draw the 8-Handled Wheel
        X.save();
        X.translate(cx, cy);
        X.rotate(angle);

        // Glowing Gold Style
        X.strokeStyle = '#d4af37';
        X.fillStyle = '#d4af37';
        X.lineWidth = 12;
        X.shadowColor = '#d4af37';
        X.shadowBlur = 20;

        // Inner and Outer Rings
        X.beginPath(); X.arc(0, 0, 40, 0, Math.PI*2); X.stroke();
        X.beginPath(); X.arc(0, 0, 140, 0, Math.PI*2); X.stroke();

        // 8 Handles
        for(let i = 0; i < 8; i++) {
            X.save();
            X.rotate((Math.PI * 2 * i) / 8);
            
            // Spoke
            X.beginPath(); X.moveTo(40, 0); X.lineTo(190, 0); X.stroke();
            // Crossbar
            X.beginPath(); X.moveTo(170, -15); X.lineTo(170, 15); X.lineWidth = 8; X.stroke();
            // End Sphere
            X.beginPath(); X.arc(190, 0, 12, 0, Math.PI*2); X.fill();
            
            X.restore();
        }
        X.restore();
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

        const isMahoraga = window.currentDomain === 'mahoraga';
        const flashEl = document.getElementById('flash');
        const titleEl = document.getElementById('domain-title');

        // Kill Switch & Phase Control
        if(isMahoraga && prev !== 'mahoraga') {
            phase = 'intro'; phaseT = 0; domainT = 0; flash = 0; shake = 0;
            // Reset camera to initial top-down view
            camera.position.set(0, 30, 20);
            camera.lookAt(0, 25, 0);
        }
        if(!isMahoraga && prev === 'mahoraga') { 
            phase = 'idle'; 
            X.clearRect(0,0,W,H);
            if (renderer) renderer.clear();
            if (domainGroup) domainGroup.visible = false;
            if (glC) glC.style.transform = '';
            fxC.style.transform = '';
        }
        prev = window.currentDomain;

        if (phase === 'idle') return;

        // ─── PHASE TIMERS & LOGIC ─────────────────────────────────────────
        if(phase === 'intro') {
            phaseT += dt; 
            
            // Impact! Screen goes white exactly when the final spin finishes (3.5s)
            if(phaseT >= 3.5 && phaseT - dt < 3.5) { 
                flash = 2.0; 
                shake = 40.0; 
            } 

            // Transition to 3D scene after the flash peaks
            if(phaseT > 3.6) { 
                phase = 'domain'; 
                phaseT = 0; 
                domainT = 0; 
            } 
        } else if(phase === 'domain') { 
            domainT += dt; 
            
            // --- CINEMATIC VERTICAL PAN ---
            // Pans down over 4 seconds, then locks onto Mahoraga
            let panProgress = Math.min(domainT / 4.0, 1.0);
            
            // Smooth deceleration easing
            let easeOut = 1 - Math.pow(1 - panProgress, 4); 

            // Y starts at 30 (Looking from top) and drops to 15 (Waist/Chest level)
            let currentY = 30 - (15 * easeOut);
            
            // Z stays at 20 so you are standing in front of him
            camera.position.set(0, currentY, 20);
            
            // Camera looks slightly down toward his center
            camera.lookAt(0, currentY - 5, 0);
        }

        // ─── THREE.JS 3D RENDER ──────────────────────────────────────────
        // Hidden until the flash finishes at t=3.5s
        const isShowing = phase === 'domain' || (phase === 'intro' && phaseT >= 3.5);
        domainGroup.visible = isShowing;
        
        if(isShowing) renderer.render(scene, camera);

        // ─── 2D FX RENDER ────────────────────────────────────────────────
        if(phase === 'intro') {
            drawWheel(phaseT);
        } else {
            X.clearRect(0, 0, W, H);
        }

        // ─── UI & SHAKE ──────────────────────────────────────────────────
        if(flash > 0.01) { flashEl.style.opacity = Math.min(flash, 1); flash *= 0.88; } else { flashEl.style.opacity = 0; flash = 0; }
        
        if(shake > 0.01) {
            const jx = (Math.random() - 0.5) * shake * 10, jy = (Math.random() - 0.5) * shake * 10;
            if (glC) glC.style.transform = `translate(${jx}px,${jy}px)`;
            fxC.style.transform = `translate(${jx}px,${jy}px)`; 
            shake *= 0.85;
        } else { 
            if (glC) glC.style.transform = ''; 
            fxC.style.transform = ''; 
            shake = 0; 
        }

        if (titleEl) titleEl.style.opacity = phase === 'domain' ? 1 : 0;
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
            glC.id = 'mahoraga-canvas';
            glC.style.position = 'fixed';
            glC.style.top = '0'; 
            glC.style.left = '0';
            glC.style.zIndex = '4'; // Behind 2D FX
            glC.style.pointerEvents = 'none';
            document.body.appendChild(glC);

            // 3. Setup Three.js Scene
            renderer = new THREE.WebGLRenderer({ canvas: glC, antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.toneMapping = THREE.ReinhardToneMapping; 
            renderer.toneMappingExposure = 2.5;                 

            scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(0x020205, 0.02); // Fog to make him look massive

            camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

            // 4. Lighting
            scene.add(new THREE.AmbientLight(0x404050, 1.0)); 
            const light = new THREE.DirectionalLight(0xfff0dd, 3.0);
            light.position.set(0, 50, 20); // Overhead lighting for dramatic shadows
            scene.add(light);

            domainGroup = new THREE.Group();
            domainGroup.visible = false;
            scene.add(domainGroup);

            // 5. Load the Model
            const loader = new GLTFLoader();
            // ⚠️ Verify this path matches the exact location of your GLB file
            loader.load('assets/mahoraga.glb', (gltf) => {
                const model = gltf.scene;
                model.position.set(0, 0, 0); 
                domainGroup.add(model);
            }, undefined, function(e) { console.error('Error loading Mahoraga GLB:', e); });

            window.addEventListener('resize', resize);
            resize();
            requestAnimationFrame(render);
        }
    };
})();