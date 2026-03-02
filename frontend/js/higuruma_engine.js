import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.HigurumaEngine = (function() {
    // ─── STATE ───────────────────────────────────────────────────────────
    let prev = 'neutral', phase = 'idle', phaseT = 0, domainT = 0;
    let flash = 0, shake = 0, dt = 0, lastTime = 0;
    let W, H;
    let isInitialized = false;
    
    // ─── DOM / CANVAS REFS ───────────────────────────────────────────────
    let fxC, X, glC;
    let objContainer, objGif;
    
    // ─── THREE.JS REFS ───────────────────────────────────────────────────
    let renderer, scene, camera, domainGroup;

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

        const isHiguruma = window.currentDomain === 'higuruma';
        const flashEl = document.getElementById('flash');
        const titleEl = document.getElementById('domain-title');

        // Kill Switch & Intro Trigger
        if(isHiguruma && prev !== 'higuruma') {
            phase = 'intro'; phaseT = 0; domainT = 0; flash = 0; shake = 0;
            
            camera.position.set(200, -400, 20); 
            camera.lookAt(0, -400, 0);

            // Trigger the Objection GIF overlay
            if (objContainer && objGif) {
                objContainer.style.display = 'flex';
                objGif.src = "assets/objection.gif?t=" + Date.now(); // Forces GIF to restart
            }
        }
        
        if(!isHiguruma && prev === 'higuruma') { 
            phase = 'idle'; 
            X.clearRect(0,0,W,H);
            if (renderer) renderer.clear();
            if (domainGroup) domainGroup.visible = false;
            if (glC) glC.style.transform = '';
            if (objContainer) objContainer.style.display = 'none';
            fxC.style.transform = '';
        }
        prev = window.currentDomain;

        if (phase === 'idle') return;

        // ─── PHASE TIMERS & LOGIC ─────────────────────────────────────────
        if (phase === 'intro') {
            phaseT += dt; 
            
            // Impact! Screen flashes white at exactly 1.5s
            if(phaseT >= 1.5 && phaseT - dt < 1.5) { 
                flash = 2.0; 
                shake = 35.0; 
                if (objContainer) objContainer.style.display = 'none'; // Hide GIF behind flash
            } 
            
            // Cinematic Camera Panning (Starts after the flash)
            if(phaseT >= 1.5) {
                let panT = Math.min((phaseT - 1.5) / 1.5, 1.0);
                let easeOut = 1 - Math.pow(1 - panT, 3);
                
                camera.position.set(200, -400, 20 * (1 - easeOut)); 
                camera.lookAt(0, -400, 0);
            }

            if(phaseT > 3.0) { 
                phase = 'domain'; phaseT = 0; domainT = 0; 
            } 
        } else if (phase === 'domain') { 
            domainT += dt; 
            
            // Endless Cinematic Pan 
            let panSpeed = 0.5; 
            let panZ = 10 - Math.cos(domainT * panSpeed) * 10;
            
            camera.position.set(200, -400, panZ);
            camera.lookAt(0, -400, 0);
        }

        // ─── THREE.JS 3D RENDER ──────────────────────────────────────────
        // Stays 100% hidden until the GIF finishes at phaseT = 1.5
        const isShowing = phase === 'domain' || (phase === 'intro' && phaseT >= 1.5);
        domainGroup.visible = isShowing;
        
        if(isShowing) renderer.render(scene, camera);

        // ─── 2D FX RENDER ────────────────────────────────────────────────
        X.clearRect(0, 0, W, H); // Just clears the canvas since we use the GIF overlay

        // ─── UI & SHAKE ──────────────────────────────────────────────────
        if(flash > 0.01) { flashEl.style.opacity = Math.min(flash, 1); flash *= 0.88; } else { flashEl.style.opacity = 0; }
        
        if(shake > 0.01) {
            const jx = (Math.random() - 0.5) * shake * 10, jy = (Math.random() - 0.5) * shake * 10;
            if (glC) glC.style.transform = `translate(${jx}px,${jy}px)`;
            shake *= 0.85;
        } else {
            if (glC) glC.style.transform = '';
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

            // 2. Dynamically Generate the Objection GIF Container
            objContainer = document.createElement('div');
            objContainer.id = 'objection-container';
            objContainer.style.position = 'fixed';
            objContainer.style.top = '0'; objContainer.style.left = '0';
            objContainer.style.width = '100%'; objContainer.style.height = '100%';
            objContainer.style.background = '#000'; 
            objContainer.style.zIndex = '15'; // Between 3D Canvas and Flash Overlay
            objContainer.style.display = 'none'; 
            objContainer.style.justifyContent = 'center'; 
            objContainer.style.alignItems = 'center';
            
            objGif = document.createElement('img');
            objGif.id = 'objection-gif';
            objGif.style.width = '100vw'; objGif.style.height = '100vh'; objGif.style.objectFit = 'cover';
            objContainer.appendChild(objGif);
            document.body.appendChild(objContainer);

            // 3. Generate a dedicated Three.js canvas
            glC = document.createElement('canvas');
            glC.id = 'higuruma-canvas';
            glC.style.position = 'fixed';
            glC.style.top = '0'; glC.style.left = '0';
            glC.style.zIndex = '4'; // Behind 2D FX
            glC.style.pointerEvents = 'none';
            document.body.appendChild(glC);

            // 4. Setup Three.js Scene
            renderer = new THREE.WebGLRenderer({ canvas: glC, antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.toneMapping = THREE.ReinhardToneMapping; 
            renderer.toneMappingExposure = 2.5; 

            scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(0x020205, 0); 

            camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

            // Lighting
            scene.add(new THREE.AmbientLight(0xffffff, 1.5)); 
            const light = new THREE.PointLight(0xffffff, 100, 100);
            light.position.set(0, 5, 2);
            scene.add(light);

            domainGroup = new THREE.Group();
            domainGroup.visible = false;
            scene.add(domainGroup);

            // 5. Load the Model
            const loader = new GLTFLoader();
            // ⚠️ Verify this path matches the exact location of your GLB file
            loader.load('assets/Domain Expansion Hiromi Higuruma Low-poly 3D model.glb', (gltf) => {
                const model = gltf.scene;
                model.position.set(0, 4.85, 0); 
                domainGroup.add(model);
            }, undefined, function(e) { console.error('Error loading Higuruma GLB:', e); });

            window.addEventListener('resize', resize);
            resize();
            requestAnimationFrame(render);
        }
    };
})();