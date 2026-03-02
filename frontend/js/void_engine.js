const VoidEngine = (function() {
    // ─── STATE ───────────────────────────────────────────────────────────
    let prev = 'neutral';
    let crossflashDone = false;
    let phase = 'idle'; 
    let phasePct = 0;
    let tunnelT = 0, voidT = 0, flash = 0, shake = 0, t = 0, dt = 0, lastTime = 0;
    
    let C, X, W, H;
    let bhSprite = null;

    // ─── STREAK / SPEED LINE DATA ─────────────────────────────────────────
    const STREAK_COLORS = [
        [255,255,255], [255,255,255], [255,255,255],
        [255, 60,120], [255, 80,140], [255,100,160],
        [220, 30, 80], [200, 20, 60], [255, 40, 80],
        [180, 60,255], [160, 40,220], [200, 80,255],
        [255,120,200], [240,100,180],
        [255,200,230], [220,180,255],
    ];

    const STREAK_COUNT = 480;
    const streaks = Array.from({ length: STREAK_COUNT }, (_, i) => makeStreak(i));

    function makeStreak(i) {
        const angle = (i / STREAK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI * 2 / STREAK_COUNT) * 3;
        const col = STREAK_COLORS[Math.floor(Math.random() * STREAK_COLORS.length)];
        return {
            angle,
            depthOffset: Math.random(),
            speed: 0.45 + Math.random() * 0.55,
            depth: Math.random(),
            length: 0.35 + Math.random() * 0.55,
            width: 0.5 + Math.random() * 2.8,
            col,
            brightness: 0.5 + Math.random() * 0.5,
        };
    }

    const TUNNEL_STARS = Array.from({length:60},()=>({
        angle: Math.random()*Math.PI*2,
        depth: Math.random(),
        brightness: 0.3+Math.random()*0.7,
    }));

    // ─── BLACK HOLE BUILDER ─────────────────────────────────────────────────
    function buildBlackHole() {
        const bhs = document.createElement('canvas');
        bhs.width = W; bhs.height = H;
        const bx = bhs.getContext('2d');

        const cx = W * 0.38; 
        const cy = H * 0.46;
        const R  = Math.min(W, H) * 0.32; 

        // Nebula clouds
        const cloudDefs = [
            { cx: W*0.72, cy: H*0.30, rx: W*0.22, ry: H*0.18, a: 0.18 },
            { cx: W*0.80, cy: H*0.42, rx: W*0.18, ry: H*0.14, a: 0.12 },
            { cx: W*0.65, cy: H*0.20, rx: W*0.15, ry: H*0.12, a: 0.10 },
            { cx: W*0.55, cy: H*0.55, rx: W*0.12, ry: H*0.10, a: 0.08 },
        ];
        cloudDefs.forEach(cd => {
            for (let layer = 0; layer < 4; layer++) {
                const lr = Math.max(cd.rx, cd.ry) * (1 - layer * 0.2);
                const la = cd.a * (1 - layer * 0.22);
                const g = bx.createRadialGradient(cd.cx, cd.cy, 0, cd.cx, cd.cy, lr);
                g.addColorStop(0, `rgba(200,220,255,${la})`);
                g.addColorStop(0.4, `rgba(160,190,240,${la*0.5})`);
                g.addColorStop(1, `rgba(0,0,0,0)`);
                bx.save();
                bx.scale(1, cd.ry/cd.rx);
                bx.beginPath();
                bx.arc(cd.cx, cd.cy*(cd.rx/cd.ry), lr, 0, Math.PI*2);
                bx.fillStyle = g;
                bx.fill();
                bx.restore();
            }
        });

        // Accretion disk / ring
        const ringPasses = [
            { r: R * 1.28, w: R * 0.38, a: 0.12 }, 
            { r: R * 1.14, w: R * 0.22, a: 0.22 }, 
            { r: R * 1.06, w: R * 0.10, a: 0.45 }, 
            { r: R * 1.02, w: R * 0.04, a: 0.75 }, 
        ];

        ringPasses.forEach(rp => {
            const SEGS = 180;
            for (let s = 0; s < SEGS; s++) {
                const a1 = (s / SEGS) * Math.PI * 2;
                const a2 = ((s + 1) / SEGS) * Math.PI * 2;
                const hue = (s / SEGS) * 360;
                const col = hslToRgb(hue, 0.7 + Math.sin(hue*0.02)*0.3, 0.75);
                const angleMod = 0.5 + 0.5 * Math.sin(a1 - Math.PI * 0.15);
                const alpha = rp.a * (0.6 + angleMod * 0.4);

                bx.beginPath();
                bx.arc(cx, cy, rp.r, a1, a2);
                bx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
                bx.lineWidth = rp.w;
                bx.stroke();
            }
        });

        // Black hole center
        bx.beginPath();
        bx.arc(cx, cy, R * 0.95, 0, Math.PI * 2);
        bx.fillStyle = '#000000';
        bx.fill();

        // Inner glow
        const innerGlow = bx.createRadialGradient(cx, cy, R*0.85, cx, cy, R*1.02);
        innerGlow.addColorStop(0, 'rgba(0,0,0,0)');
        innerGlow.addColorStop(0.5, 'rgba(60,180,255,0.06)');
        innerGlow.addColorStop(1, 'rgba(100,220,255,0.18)');
        bx.beginPath(); bx.arc(cx, cy, R*1.02, 0, Math.PI*2);
        bx.fillStyle = innerGlow; bx.fill();

        bx.beginPath();
        bx.arc(cx, cy, R * 0.97, 0, Math.PI * 2);
        bx.fillStyle = '#000000';
        bx.fill();

        // Wisps
        bx.globalCompositeOperation = 'screen';
        const wispAngles = [Math.PI*1.15, Math.PI*0.95, Math.PI*1.35, Math.PI*0.75];
        wispAngles.forEach((wa, wi) => {
            const wx1 = cx + Math.cos(wa) * R * 0.8;
            const wy1 = cy + Math.sin(wa) * R * 0.8;
            const wx2 = cx + Math.cos(wa + 0.6) * R * 1.5;
            const wy2 = cy + Math.sin(wa + 0.6) * R * 1.5;
            const wg = bx.createLinearGradient(wx1, wy1, wx2, wy2);
            wg.addColorStop(0, 'rgba(0,0,0,0)');
            wg.addColorStop(0.5, `rgba(200,230,255,${0.12 - wi*0.025})`);
            wg.addColorStop(1, 'rgba(0,0,0,0)');
            bx.beginPath(); bx.moveTo(wx1, wy1); bx.lineTo(wx2, wy2);
            bx.strokeStyle = wg; bx.lineWidth = 2 + wi; bx.stroke();
        });
        bx.globalCompositeOperation = 'source-over';

        bhSprite = bhs;
    }

    function hslToRgb(h, s, l) {
        h = h / 360;
        let r, g, b;
        if (s === 0) { r = g = b = l; }
        else {
            const q = l < 0.5 ? l*(1+s) : l+s-l*s;
            const p = 2*l-q;
            const hue2rgb = (p,q,t) => {
                if(t<0)t+=1; if(t>1)t-=1;
                if(t<1/6)return p+(q-p)*6*t;
                if(t<1/2)return q;
                if(t<2/3)return p+(q-p)*(2/3-t)*6;
                return p;
            };
            r = hue2rgb(p,q,h+1/3); g = hue2rgb(p,q,h); b = hue2rgb(p,q,h-1/3);
        }
        return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
    }

    function resize() {
        if (!C) return;
        W = C.width = window.innerWidth;
        H = C.height = window.innerHeight;
        buildBlackHole();
    }

    // ─── DRAW FUNCTIONS ──────────────────────────────────────────────────
    function drawTunnel(alpha, jx = 0, jy = 0) {
        // Static Background
        X.fillStyle = `rgba(10,4,18,${alpha})`;
        X.fillRect(0, 0, W, H);

        // Shaking Elements
        X.save();
        X.translate(jx, jy);
        streaks.forEach(s => {
            s.depth = (s.depth + s.speed * dt) % 1.0;
            const r0 = (s.depth ** 3) * W, r1 = ((s.depth + s.length) ** 3) * W;
            X.beginPath();
            X.moveTo(W/2 + Math.cos(s.angle)*r0, H/2 + Math.sin(s.angle)*r0);
            X.lineTo(W/2 + Math.cos(s.angle)*r1, H/2 + Math.sin(s.angle)*r1);
            X.strokeStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${alpha * s.brightness})`;
            X.lineWidth = s.width; X.stroke();
        });
        X.restore();
    }

    function drawVoid(alpha, age, jx = 0, jy = 0) {
        // Static Background (opaque black covers webcam)
        X.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        X.fillRect(0, 0, W, H);

        // Static Deep Space Tint
        X.fillStyle = `rgba(3, 5, 18, ${alpha * 0.9})`;
        X.fillRect(0, 0, W, H);

        // Shaking Sprites
        X.save();
        X.translate(jx, jy);
        
        if (bhSprite && alpha > 0.01) {
            const pulse = 1.0 + Math.sin(age * 0.8) * 0.008;
            X.globalAlpha = alpha;
            X.save();
            X.translate(W*0.5, H*0.5);
            X.scale(pulse, pulse);
            X.translate(-W*0.5, -H*0.5);
            X.drawImage(bhSprite, 0, 0);
            X.restore();
            X.globalAlpha = 1;
        }

        if (alpha > 0.2) {
            TUNNEL_STARS.forEach(s => {
                const x = (0.1 + s.angle/(Math.PI*2) * 0.8) * W, y = (0.05 + s.depth * 0.9) * H;
                const r = 0.5 + s.brightness * 1.5, sa = s.brightness * alpha * 0.6;
                const twinkle = 0.6 + 0.4 * Math.sin(t * s.brightness * 2 + s.angle * 5);
                X.fillStyle = `rgba(200,220,255,${sa * twinkle})`;
                X.fillRect(x - r, y - r, r*2, r*2);
            });
        }

        if (alpha > 0.3) {
            const wispAlpha = (alpha - 0.3) / 0.7 * 0.4;
            X.globalCompositeOperation = 'screen';
            const wCx = W * (0.68 + Math.sin(age*0.12)*0.03), wCy = H * (0.35 + Math.cos(age*0.08)*0.03);
            const wg = X.createRadialGradient(wCx, wCy, 0, wCx, wCy, W*0.22);
            wg.addColorStop(0, `rgba(180,210,255,${wispAlpha*0.5})`); wg.addColorStop(0.3, `rgba(140,180,240,${wispAlpha*0.3})`);
            wg.addColorStop(0.7, `rgba(80,120,200,${wispAlpha*0.1})`); wg.addColorStop(1, 'rgba(0,0,0,0)');
            X.beginPath(); X.arc(wCx, wCy, W*0.22, 0, Math.PI*2); X.fillStyle = wg; X.fill();
            X.globalCompositeOperation = 'source-over';
        }
        X.restore();
    }

    // ─── RENDER LOOP ─────────────────────────────────────────────────────
    function render(now) {
        requestAnimationFrame(render);
        dt = Math.min((now - (lastTime || now)) / 1000, 0.033);
        lastTime = now; t += dt;

        const isVoid = window.currentDomain === 'void';
        const flashEl = document.getElementById('flash');
        const titleEl = document.getElementById('domain-title');

        // Phase Logic & Kill Switch
        if (isVoid && prev !== 'void') {
            flash = 1.0; phase = 'tunnel'; tunnelT = 0; voidT = 0; shake = 3.5;
            crossflashDone = false; streaks.forEach((s) => { s.depth = Math.random(); });
        }
        if (!isVoid && prev === 'void') {
            phase = 'idle'; // Kill Switch triggered
            X.clearRect(0, 0, W, H); // Yield canvas to other engines
        }
        prev = window.currentDomain;

        if (phase === 'idle') return; // Engine sleeps while other domains are active

        if (phase === 'tunnel') {
            tunnelT += dt;
            shake = Math.max(shake, 1.0 + Math.sin(tunnelT * 18) * 0.5 + Math.random() * 0.7);
            if (tunnelT > 2.5) { phase = 'crossfade'; phasePct = 0; }
        } else if (phase === 'crossfade') {
            phasePct += dt / 0.8;
            if (!crossflashDone) { flash = 1.0; shake = 2.5; crossflashDone = true; }
            if (phasePct >= 1) { phase = 'void'; voidT = 0; shake = 0; }
        } else if (phase === 'void') {
            voidT += dt; shake = 0;
        }

        // Calculate Shake Offsets
        let jx = 0, jy = 0;
        if (shake > 0.01) {
            jx = (Math.random() - .5) * shake * 25;
            jy = (Math.random() - .5) * shake * 25;
            shake *= 0.9;
        } else {
            shake = 0;
        }

        X.clearRect(0, 0, W, H);

        if (phase === 'tunnel') {
            drawTunnel(Math.min(tunnelT / 0.5, 1.0), jx, jy);
        } else if (phase === 'crossfade') {
            const p = phasePct, eased = p < 0.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
            const tunnelAlpha = 1 - eased, voidAlpha = eased;
            if (tunnelAlpha > 0.01) drawTunnel(tunnelAlpha, jx, jy);
            if (voidAlpha > 0.01) drawVoid(voidAlpha, voidT, jx, jy);
            voidT += dt;
        } else if (phase === 'void') {
            drawVoid(1.0, voidT, jx, jy);
        }

        if (flash > 0.004) { flashEl.style.opacity = flash; flash *= 0.78; }
        else { flashEl.style.opacity = 0; flash = 0; }

        titleEl.style.opacity = phase === 'void' && voidT > 0.6 ? Math.min(1, (voidT - 0.6) / 0.6) : 0;
    }

    // ─── INITIALIZATION ──────────────────────────────────────────────────
    return {
        init: function() {
            if (C) return; // Only initialize once
            C = document.getElementById('fx-canvas'); // Hooks into the unified canvas
            X = C.getContext('2d', { alpha: true });
            window.addEventListener('resize', resize);
            resize();
            requestAnimationFrame(render);
        }
    };
})();