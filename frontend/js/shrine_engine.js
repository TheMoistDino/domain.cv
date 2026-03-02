import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

window.ShrineEngine = (function() {
    // ─── STATE ───────────────────────────────────────────────────────────
    let prev = 'neutral', phase = 'idle'; // phases: idle | slash | settle | shrine
    let phaseT = 0, shrineT = 0, cameraAngle = 0;
    let flash = 0, shake = 0, dt = 0, lastTime = 0;
    let W, H;
    let isInitialized = false;
    
    // ─── DOM / CANVAS REFS ───────────────────────────────────────────────
    let fxC, X, glC;
    
    // ─── THREE.JS REFS ───────────────────────────────────────────────────
    let renderer, scene, camera, domainGroup;

    // ─── 2D FX DATA ──────────────────────────────────────────────────────
    const SLASH_COUNT = 35;
    const FLAME_COUNT = 120;
    let slashes = [];
    let flames = [];
    let LIGHTNING = [];

    function makeSlash(i) {
        return {
            x0: Math.random(),
            y0: Math.random(),
            angle: Math.random() * Math.PI * 2,
            len: 0.4 + Math.random() * 0.7,
            width: 1.5 + Math.random() * 5,
            speed: 3.0 + Math.random() * 4.0, 
            progress: -(Math.random() * 0.6), 
            color: Math.random() > 0.4 ? [255,255,255] : Math.random() > 0.5 ? [255,60,20] : [20,20,20],
            brightness: 0.6 + Math.random() * 0.4,
        };
    }

    function makeFlame() {
        return {
            x: Math.random(),
            y: 0.5 + Math.random() * 0.6,
            vy: -(0.04 + Math.random() * 0.12),
            vx: (Math.random() - 0.5) * 0.02,
            life: Math.random(),
            size: 4 + Math.random() * 18,
            black: Math.random() > 0.45,
            speed: 0.4 + Math.random() * 0.6,
        };
    }

    function rebuildLightning(l) {
        l.x = 0.1 + Math.random() * 0.8;
        l.segments = [];
        let x = l.x * (W || 800);
        let y = 0;
        const steps = 6 + Math.floor(Math.random() * 6);
        for (let i = 0; i < steps; i++) {
            x += (Math.random() - 0.5) * 120;
            y += H / steps * (0.7 + Math.random() * 0.6);
            l.segments.push({ x, y });
        }
    }

    // ─── 2D FX DRAWING FUNCTIONS ─────────────────────────────────────────
    function drawSlashBurst(amt) {
        slashes.forEach(s => {
            s.progress += dt * s.speed;
            if (s.progress > 1.5) {
                s.progress = -(Math.random() * 0.3);
                s.x0 = Math.random();
                s.y0 = Math.random();
                s.angle = Math.random() * Math.PI * 2; 
                s.len = 0.4 + Math.random() * 0.7;
            }
            if (s.progress < 0) return;

            const p = Math.min(s.progress, 1.0);
            const diag = Math.sqrt(W*W + H*H);
            const totalLen = s.len * diag;
            const tipDist = p * totalLen;
            const tailDist = Math.max(0, tipDist - totalLen * 0.35);

            const tx = s.x0 * W + Math.cos(s.angle) * tipDist;
            const ty = s.y0 * H + Math.sin(s.angle) * tipDist;
            const bx = s.x0 * W + Math.cos(s.angle) * tailDist;
            const by = s.y0 * H + Math.sin(s.angle) * tailDist;

            if (!isFinite(tx)||!isFinite(ty)||!isFinite(bx)||!isFinite(by)) return;
            if (tx===bx && ty===by) return;

            const fadeOut = p > 0.7 ? (1 - p) / 0.3 : 1.0;
            const alpha = fadeOut * s.brightness * amt;

            const [r, g, b] = s.color;
            const sg = X.createLinearGradient(bx, by, tx, ty);
            sg.addColorStop(0, `rgba(${r},${g},${b},0)`);
            sg.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.7})`);
            sg.addColorStop(1, `rgba(${r},${g},${b},${alpha})`);

            X.beginPath();
            X.moveTo(bx, by);
            X.lineTo(tx, ty);
            X.strokeStyle = sg;
            X.lineWidth = s.width * (0.5 + p * 1.5);
            X.stroke();

            if (r > 200) {
                X.beginPath();
                X.moveTo(bx, by);
                X.lineTo(tx, ty);
                X.strokeStyle = `rgba(255,80,20,${alpha * 0.3})`;
                X.lineWidth = s.width * 3;
                X.stroke();
            }
        });
    }

    function drawFlames(alpha) {
        flames.forEach(f => {
            f.life += dt * f.speed;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            if (f.life > 1 || f.y < -0.1) {
                f.x = Math.random();
                f.y = 0.72 + Math.random() * 0.3;
                f.life = 0;
                f.vy = -(0.04 + Math.random() * 0.12);
                f.vx = (Math.random() - 0.5) * 0.02;
            }

            const lifeFade = f.life < 0.15 ? f.life / 0.15 : f.life > 0.7 ? (1 - f.life) / 0.3 : 1.0;
            const fa = lifeFade * alpha * 0.75;
            if (fa < 0.02) return;

            const fx = f.x * W;
            const fy = f.y * H;
            const size = f.size * (1 - f.life * 0.4);

            const fg = X.createRadialGradient(fx, fy, 0, fx, fy - size*0.3, size);
            if (f.black) {
                fg.addColorStop(0,   `rgba(10,0,0,${fa * 0.95})`);
                fg.addColorStop(0.3, `rgba(5,0,0,${fa * 0.7})`);
                fg.addColorStop(0.7, `rgba(60,5,0,${fa * 0.3})`);
                fg.addColorStop(1,   'rgba(0,0,0,0)');
            } else {
                fg.addColorStop(0,   `rgba(255,80,0,${fa * 0.9})`);
                fg.addColorStop(0.2, `rgba(200,20,0,${fa * 0.7})`);
                fg.addColorStop(0.6, `rgba(80,5,0,${fa * 0.35})`);
                fg.addColorStop(1,   'rgba(0,0,0,0)');
            }

            X.globalCompositeOperation = f.black ? 'multiply' : 'screen';
            X.beginPath();
            X.ellipse(fx, fy, size*0.4, size, 0, 0, Math.PI*2);
            X.fillStyle = fg;
            X.fill();
            X.globalCompositeOperation = 'source-over';
        });
    }

    function drawLightning(alpha) {
        LIGHTNING.forEach(l => {
            l.timer += dt;
            if (l.timer > l.interval) {
                l.timer = 0;
                l.interval = 0.5 + Math.random() * 2.0;
                rebuildLightning(l);
            }
            const visible = l.timer < 0.12;
            if (!visible) return;

            const la = (1 - l.timer / 0.12) * alpha * 0.85;
            if (l.segments.length < 2) return;

            X.beginPath();
            X.moveTo(l.segments[0].x, 0);
            l.segments.forEach(seg => X.lineTo(seg.x, seg.y));
            X.strokeStyle = `rgba(255,50,20,${la})`;
            X.lineWidth = 1.5;
            X.stroke();

            X.beginPath();
            X.moveTo(l.segments[0].x, 0);
            l.segments.forEach(seg => X.lineTo(seg.x, seg.y));
            X.strokeStyle = `rgba(255,120,60,${la * 0.4})`;
            X.lineWidth = 5;
            X.stroke();
        });
    }

    function drawOverlay(alpha, age) {
        // Pulsing red atmospheric glow
        const pulse = 0.85 + Math.sin(age * 1.4) * 0.15;
        const atmos = X.createRadialGradient(W*0.5, H*0.65, 0, W*0.5, H*0.65, W*0.7);
        atmos.addColorStop(0,   `rgba(180,10,0,${alpha * 0.12 * pulse})`);
        atmos.addColorStop(0.4, `rgba(100,5,0,${alpha * 0.07})`);
        atmos.addColorStop(1,   'rgba(0,0,0,0)');
        X.fillStyle = atmos;
        X.fillRect(0, 0, W, H);

        drawFlames(alpha);
        drawLightning(alpha);
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
        LIGHTNING.forEach(rebuildLightning);
    }

    // ─── RENDER LOOP ─────────────────────────────────────────────────────
    function render(now) {
        requestAnimationFrame(render);
        dt = Math.min((now - (lastTime || now)) / 1000, 0.033); lastTime = now;

        const isShrine = window.currentDomain === 'shrine';
        const flashEl = document.getElementById('flash');
        const titleEl = document.getElementById('domain-title');
        const videoEl = document.getElementById('video-container');

        // Kill Switch & Phase Control
        if(isShrine && prev !== 'shrine') {
            phase = 'slash'; phaseT = 0; shrineT = 0; cameraAngle = 0;
            flash = 1.0; shake = 4.5;
            setTimeout(() => { flash = 0.7; shake = 3.0; }, 80);
            setTimeout(() => { flash = 0.4; }, 180);
            slashes.forEach((s, i) => { s.progress = -(i / SLASH_COUNT) * 0.4; });
        }
        
        // Instant Kill Switch logic
        if(!isShrine && prev === 'shrine') { 
            phase = 'idle'; 
            X.clearRect(0,0,W,H);
            if (renderer) renderer.clear();
            if (domainGroup) domainGroup.visible = false;
            if (glC) { glC.style.transform = ''; glC.style.opacity = 0; }
            fxC.style.transform = '';
        }
        prev = window.currentDomain;

        if (phase === 'idle') return;

        // ─── PHASE TIMERS ────────────────────────────────────────────────
        if (phase === 'slash') {
            phaseT += dt;
            shake = Math.max(shake, 0.8 + Math.sin(phaseT * 22) * 0.4 + Math.random() * 0.9);
            if (phaseT > 1.8) {
                phase = 'settle'; phaseT = 0; flash = 0.6; shake = 3.5;
            }
        } else if (phase === 'settle') {
            phaseT += dt; shrineT += dt;
            if (phaseT > 0.6) {
                phase = 'shrine'; phaseT = 0; shake = 0;
            }
        } else if (phase === 'shrine') {
            shrineT += dt;
            shake = Math.random() > 0.8 ? 0.5 : 0; // slight rumble due to continuous slashes
        }

        // ─── THREE.JS 3D RENDER ──────────────────────────────────────────
        if (phase === 'shrine' || phase === 'settle') {
            domainGroup.visible = true;
            
            // Slowly orbit the camera around the Y axis
            cameraAngle += dt * 0.18;
            camera.position.x = Math.sin(cameraAngle) * 18;
            camera.position.z = Math.cos(cameraAngle) * 18;
            camera.position.y = 0.5;
            
            // Look slightly upward at the center of the shrine 
            camera.lookAt(0, -2, 0); 
            
            renderer.render(scene, camera);
        }

        // ─── 2D FX RENDER ────────────────────────────────────────────────
        X.clearRect(0, 0, W, H); 

        if (phase === 'slash') {
            glC.style.opacity = 0;
            const alpha = Math.min(phaseT / 0.2, 1.0);
            X.fillStyle = `rgba(8,0,0,1)`;
            X.fillRect(0, 0, W, H);
            
            const burst = X.createRadialGradient(W*0.5, H*0.5, 0, W*0.5, H*0.5, Math.max(W,H)*0.6);
            burst.addColorStop(0,   `rgba(255,40,0,${alpha * 0.4})`);
            burst.addColorStop(0.2, `rgba(180,10,0,${alpha * 0.25})`);
            burst.addColorStop(0.6, `rgba(60,0,0,${alpha * 0.15})`);
            burst.addColorStop(1,   'rgba(0,0,0,0)');
            X.fillStyle = burst;
            X.fillRect(0, 0, W, H);
            drawSlashBurst(alpha);

        } else if (phase === 'settle') {
            const p = Math.min(phaseT / 0.6, 1.0);
            const eased = 1 - Math.pow(1 - p, 3);
            
            glC.style.opacity = eased; // Fade in 3D scene
            
            // Draw black overlay over the parts of the fade-in that aren't fully opaque yet
            X.fillStyle = `rgba(0,0,0,${1 - eased})`;
            X.fillRect(0, 0, W, H);
            
            drawSlashBurst(1.0); 
            drawOverlay(eased, shrineT);

        } else if (phase === 'shrine') {
            glC.style.opacity = 1.0;
            drawSlashBurst(1.0); 
            drawOverlay(1.0, shrineT);
        }

        // ─── UI & SHAKE ──────────────────────────────────────────────────
        if (flash > 0.004) { flashEl.style.opacity = flash; flash *= 0.80; }
        else               { flashEl.style.opacity = 0; flash = 0; }

        if (shake > 0.01) {
            const jx = (Math.random() - 0.5) * shake * 48;
            const jy = (Math.random() - 0.5) * shake * 42;
            const jr = (Math.random() - 0.5) * shake * 0.8;
            if(glC) glC.style.transform = `translate(${jx}px,${jy}px) rotate(${jr}deg)`;
            fxC.style.transform = `translate(${jx}px,${jy}px) rotate(${jr}deg)`;
            shake *= 0.87;
        } else {
            if(glC) glC.style.transform = '';
            fxC.style.transform = '';
            shake = 0;
        }

        if (videoEl) videoEl.classList.toggle('active', phase === 'shrine');
        if (titleEl) {
            titleEl.style.opacity = phase === 'shrine' && shrineT > 0.8 ? Math.min(1, (shrineT - 0.8) / 0.8) : 0;
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

            // 2. Generate arrays for 2D FX
            slashes = Array.from({ length: SLASH_COUNT }, (_, i) => makeSlash(i));
            flames = Array.from({ length: FLAME_COUNT }, makeFlame);
            LIGHTNING = Array.from({ length: 8 }, () => ({
                x: Math.random(),
                timer: Math.random() * 2,
                interval: 0.8 + Math.random() * 1.5,
                segments: [],
            }));

            // 3. Generate a dedicated Three.js canvas
            glC = document.createElement('canvas');
            glC.id = 'shrine-canvas';
            glC.style.position = 'fixed';
            glC.style.top = '0'; 
            glC.style.left = '0';
            glC.style.zIndex = '4'; // Behind 2D FX
            glC.style.pointerEvents = 'none';
            glC.style.opacity = 0; // Starts invisible, fades in during 'settle'
            glC.style.transition = 'opacity 0.6s';
            document.body.appendChild(glC);

            // 4. Setup Three.js Scene
            renderer = new THREE.WebGLRenderer({ canvas: glC, antialias: true, alpha: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            // Matching the project's standard tone mapping
            renderer.outputColorSpace = THREE.SRGBColorSpace; 
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;                 

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0a0000);
            scene.fog = new THREE.FogExp2(0x0a0000, 0.04);

            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

            // 5. Lighting
            scene.add(new THREE.AmbientLight(0xff4422, 0.4)); 
            const pointLight = new THREE.PointLight(0xff1100, 2.5, 50);
            pointLight.position.set(0, 5, 0);
            scene.add(pointLight);
            const dirLight = new THREE.DirectionalLight(0xff5533, 1.5);
            dirLight.position.set(10, 15, 10);
            scene.add(dirLight);

            domainGroup = new THREE.Group();
            domainGroup.visible = false;
            scene.add(domainGroup);

            // 6. Load the Model
            const loader = new GLTFLoader();
            loader.load('./malevolent.glb', (gltf) => {
                const shrineModel = gltf.scene;
                
                // Center and normalize scale
                const box = new THREE.Box3().setFromObject(shrineModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                
                const scale = 15 / maxDim;
                shrineModel.scale.set(scale, scale, scale);
                
                shrineModel.position.x = -center.x * scale;
                shrineModel.position.y = -center.y * scale - 2; // offset down slightly
                shrineModel.position.z = -center.z * scale;
                
                shrineModel.rotation.y = Math.PI;
                
                domainGroup.add(shrineModel);
            }, undefined, function(e) { console.error('Error loading Malevolent Shrine GLB:', e); });

            window.addEventListener('resize', resize);
            resize();
            requestAnimationFrame(render);
        }
    };
})();