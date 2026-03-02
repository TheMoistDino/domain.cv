import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.PerfectionEngine = (function() {
    // ─── STATE ───────────────────────────────────────────────────────────
    let prev = 'neutral', phase = 'idle', phaseT = 0, domainT = 0;
    let flash = 0, shake = 0, dt = 0, lastTime = 0;
    let W, H;
    let isInitialized = false;
    
    // ─── DOM / CANVAS REFS ───────────────────────────────────────────────
    let fxC, X, glC;
    
    // ─── THREE.JS REFS ───────────────────────────────────────────────────
    let renderer, scene, camera, domainGroup, soulParticles;
    let pVel = [];
    const particleCount = 400;

    // ─── 2D FX SLASHES ───────────────────────────────────────────────────
    const SLASHES = Array.from({length: 40}, () => ({
        x0: Math.random(), y0: Math.random(), angle: (Math.random() - 0.5) * Math.PI * 2,
        len: 0.5 + Math.random() * 1.5, width: 2 + Math.random() * 8, speed: 4 + Math.random() * 6,
        progress: -(Math.random() * 0.8),
        col: Math.random() > 0.5 ? [10, 15, 20] : [0, 200, 255], // Black and Cyan slashes
        bright: 0.7 + Math.random() * 0.5
    }));

    function drawSlashBurst(amt) {
        SLASHES.forEach(s => {
            s.progress += dt * s.speed;
            if(s.progress > 1.5) { 
                s.progress = -(Math.random() * 0.2); 
                s.x0 = Math.random(); s.y0 = Math.random(); 
                s.angle = (Math.random() - 0.5) * Math.PI * 2; 
                s.len = 0.6 + Math.random() * 1.0; 
            }
            if(s.progress < 0) return;
            
            const p = Math.min(s.progress, 1), diag = Math.sqrt(W * W + H * H);
            const tip = p * s.len * diag, tail = Math.max(0, tip - s.len * diag * 0.4);
            const tx = s.x0 * W + Math.cos(s.angle) * tip, ty = s.y0 * H + Math.sin(s.angle) * tip;
            const bx = s.x0 * W + Math.cos(s.angle) * tail, by = s.y0 * H + Math.sin(s.angle) * tail;
            
            const fade = p > 0.7 ? (1 - p) / 0.3 : 1, a = fade * s.bright * amt;
            const [r, g, b] = s.col;
            const sg = X.createLinearGradient(bx, by, tx, ty);
            sg.addColorStop(0, `rgba(${r},${g},${b},0)`); 
            sg.addColorStop(0.5, `rgba(${r},${g},${b},${a})`); 
            sg.addColorStop(1, `rgba(${r},${g},${b},${a})`);
            
            X.beginPath(); X.moveTo(bx, by); X.lineTo(tx, ty); 
            X.strokeStyle = sg; X.lineWidth = s.width * (1 + p * 2); X.stroke();
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

        const isMahito = window.currentDomain === 'mahito';
        const flashEl = document.getElementById('flash');
        const titleEl = document.getElementById('domain-title');

        // Kill Switch & Phase Control
        if(isMahito && prev !== 'mahito') {
            phase = 'slash'; phaseT = 0; domainT = 0; flash = 1.0; shake = 6.0;
            setTimeout(() => { flash = 0.8; shake = 4.0; }, 80); 
            setTimeout(() => { flash = 0.4; }, 180);
            SLASHES.forEach((s, i) => { s.progress = -(i / SLASHES.length) * 0.3; });
        }
        if(!isMahito && prev === 'mahito') { 
            phase = 'idle'; 
            X.clearRect(0,0,W,H);
            if (renderer) renderer.clear();
            if (domainGroup) domainGroup.visible = false;
            if (glC) glC.style.transform = '';
            fxC.style.transform = '';
        }
        prev = window.currentDomain;

        if (phase === 'idle') return;

        if(phase === 'slash') {
            phaseT += dt; shake = Math.max(shake, 1.5 + Math.sin(phaseT * 25) * 0.6 + Math.random() * 1.5);
            if(phaseT > 2.0) { phase = 'settle'; phaseT = 0; flash = 0.5; shake = 4.0; }
        } else if(phase === 'settle') {
            phaseT += dt; domainT += dt; if(phaseT > 0.8) { phase = 'domain'; phaseT = 0; shake = 0; }
        } else if(phase === 'domain') { 
            domainT += dt; shake = 0;
        }

        // ─── THREE.JS 3D RENDER ──────────────────────────────────────────
        if(phase === 'domain' || phase === 'settle') {
            domainGroup.visible = true;
            
            // Panning Camera
            const ang = domainT * 0.1;
            camera.position.set(Math.sin(ang) * 5, 2.0, Math.cos(ang) * 5); 
            camera.lookAt(-15, 2, 0); 
            
            // Eerie slight rotation of the domain itself
            domainGroup.rotation.y = Math.sin(domainT * 0.05) * 0.1;
            
            // Floating Soul Particles
            const positions = soulParticles.geometry.attributes.position.array;
            for(let i=0; i<particleCount; i++) {
                const v = pVel[i];
                positions[i*3+1] += v.y;
                positions[i*3] += v.driftX + Math.sin(domainT + v.offset) * 0.02;
                positions[i*3+2] += v.driftZ + Math.cos(domainT + v.offset) * 0.02;
                if(positions[i*3+1] > 30) positions[i*3+1] = 0;
            }
            soulParticles.geometry.attributes.position.needsUpdate = true;
            
            renderer.render(scene, camera);
        }

        // ─── 2D FX RENDER ────────────────────────────────────────────────
        X.clearRect(0, 0, W, H);
        if(phase === 'slash') {
            const a = Math.min(phaseT / 0.2, 1);
            X.fillStyle = `rgba(5,10,15,${a})`; X.fillRect(0, 0, W, H); drawSlashBurst(a);
        } else if(phase === 'settle') { 
            drawSlashBurst(1 - Math.min(phaseT / 0.8, 1)); 
        }

        // ─── UI & SHAKE ──────────────────────────────────────────────────
        if(flash > 0.004) { flashEl.style.opacity = flash; flash *= 0.80; } else { flashEl.style.opacity = 0; flash = 0; }
        
        if(shake > 0.01) {
            const jx = (Math.random() - 0.5) * shake * 50, jy = (Math.random() - 0.5) * shake * 45, jr = (Math.random() - 0.5) * shake * 1.0;
            if(glC) glC.style.transform = `translate(${jx}px,${jy}px) rotate(${jr}deg)`;
            fxC.style.transform = `translate(${jx}px,${jy}px) rotate(${jr}deg)`; 
            shake *= 0.85;
        } else { 
            if(glC) glC.style.transform = ''; 
            fxC.style.transform = ''; 
            shake = 0; 
        }

        if (titleEl) titleEl.style.opacity = phase === 'domain' && domainT > 0.8 ? Math.min(1, (domainT - 0.8) / 0.8) : 0;
    }

    // ─── INITIALIZATION ──────────────────────────────────────────────────
    return {
        init: function() {
            if (isInitialized) return;
            isInitialized = true;

            // 1. Hook into existing 2D FX canvas
            fxC = document.getElementById('fx-canvas');
            X = fxC.getContext('2d', { alpha: true });

            // 2. Generate a dedicated Three.js canvas to avoid WebGL context collisions
            glC = document.createElement('canvas');
            glC.id = 'perfection-canvas';
            glC.style.position = 'fixed';
            glC.style.top = '0'; 
            glC.style.left = '0';
            glC.style.zIndex = '4'; // Places it behind the 2D fx-canvas
            glC.style.pointerEvents = 'none';
            document.body.appendChild(glC);

            // 3. Setup Three.js Scene
            renderer = new THREE.WebGLRenderer({ canvas: glC, antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);

            // --- r160 STANDARDIZED LIGHTING ---
            // Note: physicallyCorrectLights is now the default in r160!
            renderer.outputColorSpace = THREE.SRGBColorSpace; 
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;                 
            // ----------------------------------

            scene = new THREE.Scene();
            scene.fog = new THREE.FogExp2(0x05050a, 0.02);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

            // Lighting
            scene.add(new THREE.AmbientLight(0x101520, 3.0));
            const pointLight = new THREE.PointLight(0x00aaff, 800, 100);
            pointLight.position.set(0, 15, 0);
            scene.add(pointLight);
            
            const bottomLight = new THREE.DirectionalLight(0x3366ff, 2.0);
            bottomLight.position.set(0, -10, 0);
            scene.add(bottomLight);

            domainGroup = new THREE.Group();
            domainGroup.visible = false;
            scene.add(domainGroup);

            // Cleaned up GLTFLoader call
            const loader = new GLTFLoader();
            loader.load('assets/self_embodiment_of_perfection__jujutsu_kaisen.glb', function(gltf) {
                const mahitoDomain = gltf.scene;
                mahitoDomain.scale.set(5, 5, 5);     
                mahitoDomain.position.set(0, -3, 0);  
                domainGroup.add(mahitoDomain);
            }, undefined, function(e) { console.error('Error loading Mahito GLB:', e); });

            // Soul Particles
            const pGeo = new THREE.BufferGeometry();
            const pPos = new Float32Array(particleCount * 3);
            for(let i=0; i<particleCount; i++) {
                pPos[i*3] = (Math.random() - 0.5) * 60;
                pPos[i*3+1] = Math.random() * 30;
                pPos[i*3+2] = (Math.random() - 0.5) * 60;
                pVel.push({
                    y: 0.02 + Math.random() * 0.05,
                    driftX: (Math.random() - 0.5) * 0.03,
                    driftZ: (Math.random() - 0.5) * 0.03,
                    offset: Math.random() * Math.PI * 2
                });
            }
            pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
            const pMat = new THREE.PointsMaterial({ color: 0x88ccff, size: 0.4, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
            soulParticles = new THREE.Points(pGeo, pMat);
            domainGroup.add(soulParticles);

            window.addEventListener('resize', resize);
            resize();
            requestAnimationFrame(render);
        }
    };
})();