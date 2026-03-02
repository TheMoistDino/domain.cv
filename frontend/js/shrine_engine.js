const ShrineEngine = (function() {
    // ─── STATE ───────────────────────────────────────────────────────────
    let prev = 'neutral';
    let phase = 'idle';   // idle | slash | settle | shrine
    let phaseT = 0, shrineT = 0, flash = 0, shake = 0, t = 0, dt = 0, lastTime = 0;
    
    let C, X, W, H;
    let shrineSprite = null;

    // ─── DATA ARRAYS ──────────────────────────────────────────────────────
    const SLASH_COUNT = 28;
    const slashes = Array.from({ length: SLASH_COUNT }, (_, i) => makeSlash(i));

    function makeSlash(i) {
        const steep = Math.random() > 0.5;
        return {
            x0: Math.random(), y0: Math.random(),
            angle: (Math.random() - 0.5) * Math.PI * 0.6 + (steep ? Math.PI*0.5 : 0),
            len: 0.4 + Math.random() * 0.7, width: 1.5 + Math.random() * 5,
            speed: 3.0 + Math.random() * 4.0, progress: -(Math.random() * 0.6),
            color: Math.random() > 0.4 ? [255,255,255] : Math.random() > 0.5 ? [255,60,20] : [20,20,20],
            brightness: 0.6 + Math.random() * 0.4,
        };
    }

    const FLAME_COUNT = 120;
    const flames = Array.from({ length: FLAME_COUNT }, makeFlame);

    function makeFlame() {
        return {
            x: Math.random(), y: 0.5 + Math.random() * 0.6,
            vy: -(0.04 + Math.random() * 0.12), vx: (Math.random() - 0.5) * 0.02,
            life: Math.random(), size: 4 + Math.random() * 18,
            black: Math.random() > 0.45, speed: 0.4 + Math.random() * 0.6,
        };
    }

    const GROUND_SLASHES = Array.from({ length: 22 }, (_, i) => ({
        angle: (i / 22) * Math.PI + (Math.random() - 0.5) * 0.3,
        len: 0.2 + Math.random() * 0.5, width: 0.5 + Math.random() * 2, offset: Math.random() * 0.15,
    }));

    const LIGHTNING = Array.from({ length: 8 }, () => ({
        x: Math.random(), timer: Math.random() * 2, interval: 0.8 + Math.random() * 1.5, segments: [],
    }));

    function rebuildLightning(l) {
        l.x = 0.1 + Math.random() * 0.8; l.segments = [];
        let x = l.x * (W || 800), y = 0;
        const steps = 6 + Math.floor(Math.random() * 6);
        for (let i = 0; i < steps; i++) {
            x += (Math.random() - 0.5) * 120; y += H / steps * (0.7 + Math.random() * 0.6);
            l.segments.push({ x, y });
        }
    }

    // ─── SPRITE BUILDERS ──────────────────────────────────────────────────
    function buildSprites() {
        buildShrineSprite();
        LIGHTNING.forEach(rebuildLightning);
    }

    function buildShrineSprite() {
        const s = document.createElement('canvas');
        s.width = W; s.height = H;
        const sx = s.getContext('2d');

        // Crimson sky gradient
        const sky = sx.createLinearGradient(0, 0, 0, H * 0.72);
        sky.addColorStop(0, '#000000'); sky.addColorStop(0.15,'#0d0000');
        sky.addColorStop(0.4, '#1a0000'); sky.addColorStop(0.65,'#2d0500');
        sky.addColorStop(1, '#180200');
        sx.fillStyle = sky; sx.fillRect(0, 0, W, H);

        // Ground plane
        const ground = sx.createLinearGradient(0, H*0.65, 0, H);
        ground.addColorStop(0, '#0a0000'); ground.addColorStop(0.4, '#150000'); ground.addColorStop(1, '#050000');
        sx.fillStyle = ground; sx.fillRect(0, H * 0.65, W, H * 0.35);

        // Subtle horizon glow
        const hglow = sx.createRadialGradient(W*0.5, H*0.66, 0, W*0.5, H*0.66, W*0.6);
        hglow.addColorStop(0, 'rgba(200,30,0,0.18)'); hglow.addColorStop(0.4, 'rgba(120,10,0,0.08)');
        hglow.addColorStop(1, 'rgba(0,0,0,0)');
        sx.fillStyle = hglow; sx.fillRect(0, 0, W, H);

        drawTorii(sx);
        drawSkulls(sx);

        shrineSprite = s;
    }

    function drawTorii(sx) {
        const cx = W * 0.5, groundY = H * 0.62;
        const bw = W * 0.22, bh = H * 0.30, top = groundY - bh;

        sx.save();

        // Outer glow around shrine
        const glow = sx.createRadialGradient(cx, groundY - bh*0.4, 0, cx, groundY - bh*0.4, bw*1.8);
        glow.addColorStop(0, 'rgba(220,80,0,0.28)'); glow.addColorStop(0.4, 'rgba(160,40,0,0.14)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        sx.fillStyle = glow; sx.fillRect(cx - bw*2, top - bh*0.3, bw*4, bh*1.8);

        // Pillars
        function drawPillar(x, y, w, h) {
            const pg = sx.createLinearGradient(x - w*0.5, 0, x + w*0.5, 0);
            pg.addColorStop(0, '#1a0400'); pg.addColorStop(0.2, '#3d0e00');
            pg.addColorStop(0.5, '#5a1a00'); pg.addColorStop(0.8, '#3d0e00'); pg.addColorStop(1, '#1a0400');
            sx.fillStyle = pg; sx.fillRect(x - w*0.5, y, w, h);

            const eg = sx.createLinearGradient(x - w*0.5, 0, x - w*0.5 + w*0.25, 0);
            eg.addColorStop(0, 'rgba(255,120,0,0.55)'); eg.addColorStop(1, 'rgba(255,80,0,0)');
            sx.fillStyle = eg; sx.fillRect(x - w*0.5, y, w*0.25, h);

            const eg2 = sx.createLinearGradient(x + w*0.5 - w*0.25, 0, x + w*0.5, 0);
            eg2.addColorStop(0, 'rgba(255,80,0,0)'); eg2.addColorStop(1, 'rgba(255,120,0,0.45)');
            sx.fillStyle = eg2; sx.fillRect(x + w*0.5 - w*0.25, y, w*0.25, h);

            sx.fillStyle = 'rgba(255,140,20,0.35)';
            sx.fillRect(x - w*0.5 + w*0.08, y, w*0.06, h); sx.fillRect(x + w*0.5 - w*0.14, y, w*0.06, h);
        }

        const pillarW = bw * 0.18, pillarH = bh * 0.68, pillarY = groundY - pillarH;
        drawPillar(cx - bw*0.62, pillarY, pillarW, pillarH);
        drawPillar(cx + bw*0.62, pillarY, pillarW, pillarH);

        // Archway
        const archW = bw * 0.8, archH = bh * 0.52, archY = groundY - archH;
        sx.fillStyle = '#000';
        sx.beginPath(); sx.moveTo(cx - archW*0.5, groundY); sx.lineTo(cx - archW*0.5, archY + archH*0.12);
        sx.quadraticCurveTo(cx - archW*0.5, archY, cx, archY); sx.quadraticCurveTo(cx + archW*0.5, archY, cx + archW*0.5, archY + archH*0.12);
        sx.lineTo(cx + archW*0.5, groundY); sx.closePath(); sx.fill();

        sx.strokeStyle = 'rgba(255,130,20,0.7)'; sx.lineWidth = 3;
        sx.beginPath(); sx.moveTo(cx - archW*0.5, groundY); sx.lineTo(cx - archW*0.5, archY + archH*0.12);
        sx.quadraticCurveTo(cx - archW*0.5, archY, cx, archY); sx.quadraticCurveTo(cx + archW*0.5, archY, cx + archW*0.5, archY + archH*0.12);
        sx.lineTo(cx + archW*0.5, groundY); sx.stroke();

        const archGlow = sx.createRadialGradient(cx, groundY - archH*0.35, 0, cx, groundY - archH*0.35, archW*0.5);
        archGlow.addColorStop(0, 'rgba(140,200,255,0.25)'); archGlow.addColorStop(0.4, 'rgba(80,140,220,0.10)');
        archGlow.addColorStop(1, 'rgba(0,0,0,0)');
        sx.fillStyle = archGlow;
        sx.beginPath(); sx.moveTo(cx - archW*0.5, groundY); sx.lineTo(cx - archW*0.5, archY + archH*0.12);
        sx.quadraticCurveTo(cx - archW*0.5, archY, cx, archY); sx.quadraticCurveTo(cx + archW*0.5, archY, cx + archW*0.5, archY + archH*0.12);
        sx.lineTo(cx + archW*0.5, groundY); sx.closePath(); sx.fill();

        const scrollY = archY - bh*0.04;
        sx.fillStyle = '#0a0000'; sx.fillRect(cx - bw*0.82, scrollY, bw*1.64, bh*0.08);
        sx.strokeStyle = 'rgba(200,80,0,0.5)'; sx.lineWidth = 1.5; sx.strokeRect(cx - bw*0.82, scrollY, bw*1.64, bh*0.08);
        for (let i = 0; i < 6; i++) {
            sx.fillStyle = 'rgba(180,60,0,0.4)'; sx.fillRect(cx - bw*0.75 + i*(bw*1.5/6), scrollY + 2, bw*0.18, bh*0.04);
        }

        // Roofs
        const roofBot = top + bh*0.38, roofMid = top + bh*0.20, roofTop = top + bh*0.02;
        function drawRoofTier(y_bot, y_top, width, alpha) {
            const rg = sx.createLinearGradient(0, y_top, 0, y_bot);
            rg.addColorStop(0, `rgba(20,5,0,${alpha})`); rg.addColorStop(0.5, `rgba(35,10,0,${alpha})`); rg.addColorStop(1, `rgba(15,3,0,${alpha})`);
            sx.beginPath(); sx.moveTo(cx - width*0.1, y_top); sx.lineTo(cx + width*0.1, y_top);
            sx.quadraticCurveTo(cx + width*0.6, y_top + (y_bot-y_top)*0.5, cx + width, y_bot - (y_bot-y_top)*0.12);
            sx.lineTo(cx + width*0.88, y_bot); sx.lineTo(cx, y_bot - (y_bot-y_top)*0.04);
            sx.lineTo(cx - width*0.88, y_bot); sx.lineTo(cx - width, y_bot - (y_bot-y_top)*0.12);
            sx.quadraticCurveTo(cx - width*0.6, y_top + (y_bot-y_top)*0.5, cx - width*0.1, y_top);
            sx.closePath(); sx.fillStyle = rg; sx.fill();
            sx.strokeStyle = `rgba(255,150,20,${alpha * 0.8})`; sx.lineWidth = 2.5;
            sx.beginPath(); sx.moveTo(cx - width*0.88, y_bot); sx.lineTo(cx - width, y_bot - (y_bot-y_top)*0.12);
            sx.quadraticCurveTo(cx - width*0.6, y_top + (y_bot-y_top)*0.5, cx - width*0.1, y_top);
            sx.lineTo(cx + width*0.1, y_top); sx.quadraticCurveTo(cx + width*0.6, y_top + (y_bot-y_top)*0.5, cx + width, y_bot - (y_bot-y_top)*0.12);
            sx.lineTo(cx + width*0.88, y_bot); sx.stroke();
            const dotCount = Math.floor(width * 1.6);
            for (let i = 0; i <= dotCount; i++) {
                sx.fillStyle = `rgba(200,100,10,${alpha*0.6})`; sx.fillRect((cx - width*0.88 + i*(width*1.76/dotCount)), y_bot - 2, 3, 3);
            }
        }
        drawRoofTier(roofBot, roofMid, bw*1.05, 1.0); drawRoofTier(roofMid + bh*0.02, roofTop, bw*0.52, 1.0);

        sx.fillStyle = '#1a0500'; sx.fillRect(cx - bw*0.06, roofTop - bh*0.03, bw*0.12, bh*0.05);
        sx.strokeStyle = 'rgba(255,140,20,0.7)'; sx.lineWidth = 1.5; sx.strokeRect(cx - bw*0.06, roofTop - bh*0.03, bw*0.12, bh*0.05);

        // Horns
        function drawHorn(side) {
            const hx = cx + side * bw * 0.28, hBase = roofTop - bh*0.01;
            const hTipX = cx + side * bw * 0.44, hTipY = hBase - bh*0.25;
            const hCtrlX = cx + side * bw * 0.10, hCtrlY = hBase - bh*0.18;
            const h2x = cx + side * bw * 0.40, h2TipX = cx + side * bw * 0.58, h2TipY = hBase - bh*0.20;

            sx.beginPath(); sx.moveTo(hx - side*8, hBase); sx.quadraticCurveTo(hCtrlX, hCtrlY, hTipX, hTipY);
            sx.quadraticCurveTo(hCtrlX + side*6, hCtrlY + bh*0.04, hx + side*4, hBase); sx.closePath();
            const hornG = sx.createLinearGradient(hx, hBase, hTipX, hTipY);
            hornG.addColorStop(0, '#2d0800'); hornG.addColorStop(0.5, '#1a0400'); hornG.addColorStop(1, '#0a0200');
            sx.fillStyle = hornG; sx.fill(); sx.strokeStyle = 'rgba(180,60,0,0.5)'; sx.lineWidth = 1.5; sx.stroke();

            sx.beginPath(); sx.moveTo(h2x - side*5, hBase); sx.quadraticCurveTo(h2x + side*15, hBase - bh*0.12, h2TipX, h2TipY);
            sx.quadraticCurveTo(h2x + side*20, hBase - bh*0.08, h2x + side*8, hBase); sx.closePath();
            sx.fillStyle = hornG; sx.fill(); sx.strokeStyle = 'rgba(150,40,0,0.4)'; sx.lineWidth = 1; sx.stroke();
        }
        drawHorn(-1); drawHorn(1);

        // Reflection
        sx.strokeStyle = 'rgba(80,160,220,0.25)'; sx.lineWidth = 1; sx.beginPath(); sx.moveTo(0, groundY); sx.lineTo(W, groundY); sx.stroke();
        sx.save(); sx.translate(cx, groundY); sx.scale(1, -1); sx.translate(-cx, -groundY); sx.globalAlpha = 0.4;
        drawPillar(cx - bw*0.62, pillarY, pillarW, pillarH); drawPillar(cx + bw*0.62, pillarY, pillarW, pillarH);
        sx.fillStyle = '#000'; sx.beginPath(); sx.moveTo(cx - archW*0.5, groundY); sx.lineTo(cx - archW*0.5, archY + archH*0.12);
        sx.quadraticCurveTo(cx - archW*0.5, archY, cx, archY); sx.quadraticCurveTo(cx + archW*0.5, archY, cx + archW*0.5, archY + archH*0.12);
        sx.lineTo(cx + archW*0.5, groundY); sx.closePath(); sx.fill();
        drawRoofTier(roofBot, roofMid, bw*1.05, 0.9); drawRoofTier(roofMid + bh*0.02, roofTop, bw*0.52, 0.9);
        sx.restore();

        const reflFade = sx.createLinearGradient(0, groundY, 0, groundY + bh*0.6);
        reflFade.addColorStop(0, 'rgba(0,0,0,0)'); reflFade.addColorStop(0.5, 'rgba(0,0,2,0.55)'); reflFade.addColorStop(1, 'rgba(0,0,5,0.85)');
        sx.fillStyle = reflFade; sx.fillRect(0, groundY, W, bh*0.7);

        // Blue floor pillars
        function drawBluePillar(x) {
            const bpH = H * 0.22, bpW = W * 0.04, bpY = groundY;
            const bg = sx.createRadialGradient(x, bpY - bpH*0.4, 0, x, bpY - bpH*0.4, bpW*3.5);
            bg.addColorStop(0, 'rgba(60,180,255,0.4)'); bg.addColorStop(0.4, 'rgba(30,120,220,0.2)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
            sx.fillStyle = bg; sx.fillRect(x - bpW*4, bpY - bpH*0.6, bpW*8, bpH*0.8);

            const ppg = sx.createLinearGradient(x - bpW*0.5, 0, x + bpW*0.5, 0);
            ppg.addColorStop(0, '#000a14'); ppg.addColorStop(0.3, '#001830'); ppg.addColorStop(0.7, '#001830'); ppg.addColorStop(1, '#000a14');
            sx.fillStyle = ppg; sx.fillRect(x - bpW*0.5, bpY - bpH, bpW, bpH);
            sx.strokeStyle = 'rgba(80,200,255,0.6)'; sx.lineWidth = 1.5; sx.strokeRect(x - bpW*0.5, bpY - bpH, bpW, bpH);

            const sg = sx.createLinearGradient(x - bpW*0.5, 0, x + bpW*0.5, 0);
            sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.45,'rgba(100,220,255,0.5)'); sg.addColorStop(0.55,'rgba(120,230,255,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
            sx.fillStyle = sg; sx.fillRect(x - bpW*0.5, bpY - bpH, bpW, bpH);

            const rg2 = sx.createLinearGradient(0, bpY, 0, bpY + bpH*0.5);
            rg2.addColorStop(0, 'rgba(60,180,255,0.3)'); rg2.addColorStop(1, 'rgba(0,0,0,0)');
            sx.fillStyle = rg2; sx.fillRect(x - bpW*0.5, bpY, bpW, bpH*0.5);
        }
        drawBluePillar(W * 0.18); drawBluePillar(W * 0.82);

        sx.globalAlpha = 0.12; sx.strokeStyle = '#003060'; sx.lineWidth = 0.5;
        for (let i = 0; i < 12; i++) {
            const fy = groundY + i * (H - groundY) / 11;
            sx.beginPath(); sx.moveTo(0, fy); sx.lineTo(W, fy); sx.stroke();
        }
        for (let i = -6; i <= 6; i++) {
            sx.beginPath(); sx.moveTo(cx + i * bw*0.4, groundY); sx.lineTo(cx + i * W*0.25, H); sx.stroke();
        }
        sx.globalAlpha = 1; sx.restore();
    }

    function drawSkulls(sx) {
        const cloudDefs = [
            { x: W*0.12, y: H*0.12, r: W*0.14 }, { x: W*0.32, y: H*0.08, r: W*0.12 },
            { x: W*0.68, y: H*0.10, r: W*0.13 }, { x: W*0.88, y: H*0.15, r: W*0.15 },
            { x: W*0.50, y: H*0.05, r: W*0.10 }, { x: W*0.20, y: H*0.22, r: W*0.09 },
            { x: W*0.78, y: H*0.20, r: W*0.10 },
        ];
        cloudDefs.forEach(c => {
            const cg = sx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
            cg.addColorStop(0, 'rgba(80,5,0,0.45)'); cg.addColorStop(0.4, 'rgba(50,3,0,0.25)');
            cg.addColorStop(0.8, 'rgba(20,1,0,0.10)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
            sx.fillStyle = cg; sx.beginPath(); sx.ellipse(c.x, c.y, c.r, c.r*0.55, 0, 0, Math.PI*2); sx.fill();
        });

        sx.strokeStyle = 'rgba(180,15,0,0.18)'; sx.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
            const vx = Math.random() * W, vy = Math.random() * H * 0.45;
            sx.beginPath(); sx.moveTo(vx, vy);
            let x = vx, y = vy;
            for (let j = 0; j < 5; j++) {
                x += (Math.random()-0.5)*120; y += Math.random()*40; sx.lineTo(x, y);
            }
            sx.stroke();
        }
    }

    // ─── EFFECTS RENDERERS ────────────────────────────────────────────────
    function drawSlashBurst(amt) {
        slashes.forEach(s => {
            s.progress += dt * s.speed;
            if (s.progress > 1.5) {
                s.progress = -(Math.random() * 0.3); s.x0 = Math.random(); s.y0 = Math.random();
                s.angle = (Math.random() - 0.5) * Math.PI * 0.6; s.len = 0.4 + Math.random() * 0.7;
            }
            if (s.progress < 0) return;

            const p = Math.min(s.progress, 1.0), diag = Math.sqrt(W*W + H*H);
            const tipDist = p * s.len * diag, tailDist = Math.max(0, tipDist - s.len * diag * 0.35);
            const tx = s.x0 * W + Math.cos(s.angle) * tipDist, ty = s.y0 * H + Math.sin(s.angle) * tipDist;
            const bx = s.x0 * W + Math.cos(s.angle) * tailDist, by = s.y0 * H + Math.sin(s.angle) * tailDist;
            if (!isFinite(tx)||!isFinite(ty)||!isFinite(bx)||!isFinite(by)) return;

            const alpha = (p > 0.7 ? (1 - p) / 0.3 : 1.0) * s.brightness * amt;
            const [r, g, b] = s.color;
            const sg = X.createLinearGradient(bx, by, tx, ty);
            sg.addColorStop(0, `rgba(${r},${g},${b},0)`); sg.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.7})`);
            sg.addColorStop(1, `rgba(${r},${g},${b},${alpha})`);

            X.beginPath(); X.moveTo(bx, by); X.lineTo(tx, ty); X.strokeStyle = sg; X.lineWidth = s.width * (0.5 + p * 1.5); X.stroke();
            if (r > 200) {
                X.beginPath(); X.moveTo(bx, by); X.lineTo(tx, ty);
                X.strokeStyle = `rgba(255,80,20,${alpha * 0.3})`; X.lineWidth = s.width * 3; X.stroke();
            }
        });
    }

    function drawFlames(alpha) {
        flames.forEach(f => {
            f.life += dt * f.speed; f.x += f.vx * dt; f.y += f.vy * dt;
            if (f.life > 1 || f.y < -0.1) {
                f.x = Math.random(); f.y = 0.72 + Math.random() * 0.3; f.life = 0;
                f.vy = -(0.04 + Math.random() * 0.12); f.vx = (Math.random() - 0.5) * 0.02;
            }
            const fa = (f.life < 0.15 ? f.life / 0.15 : f.life > 0.7 ? (1 - f.life) / 0.3 : 1.0) * alpha * 0.75;
            if (fa < 0.02) return;

            const fx = f.x * W, fy = f.y * H, size = f.size * (1 - f.life * 0.4);
            const fg = X.createRadialGradient(fx, fy, 0, fx, fy - size*0.3, size);
            if (f.black) {
                fg.addColorStop(0, `rgba(10,0,0,${fa * 0.95})`); fg.addColorStop(0.3, `rgba(5,0,0,${fa * 0.7})`);
                fg.addColorStop(0.7, `rgba(60,5,0,${fa * 0.3})`); fg.addColorStop(1, 'rgba(0,0,0,0)');
            } else {
                fg.addColorStop(0, `rgba(255,80,0,${fa * 0.9})`); fg.addColorStop(0.2, `rgba(200,20,0,${fa * 0.7})`);
                fg.addColorStop(0.6, `rgba(80,5,0,${fa * 0.35})`); fg.addColorStop(1, 'rgba(0,0,0,0)');
            }

            X.globalCompositeOperation = f.black ? 'multiply' : 'screen';
            X.beginPath(); X.ellipse(fx, fy, size*0.4, size, 0, 0, Math.PI*2); X.fillStyle = fg; X.fill();
            X.globalCompositeOperation = 'source-over';
        });
    }

    function drawGroundCracks(alpha) {
        const ox = W * 0.5, oy = H * 0.67;
        X.save(); X.globalAlpha = alpha;
        GROUND_SLASHES.forEach(gs => {
            const len = gs.len * W;
            const ex = ox + Math.cos(gs.angle + Math.PI*0.5) * len * Math.cos(gs.offset * Math.PI);
            const ey = oy + Math.sin(gs.angle) * len * 0.25;
            const gg = X.createLinearGradient(ox, oy, ex, ey);
            gg.addColorStop(0, `rgba(200,20,0,${0.5 * alpha})`); gg.addColorStop(0.4, `rgba(140,10,0,${0.3 * alpha})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
            X.beginPath(); X.moveTo(ox, oy); X.lineTo(ex, ey); X.strokeStyle = gg; X.lineWidth = gs.width; X.stroke();
        });
        X.restore();
    }

    function drawLightning(alpha) {
        LIGHTNING.forEach(l => {
            l.timer += dt;
            if (l.timer > l.interval) { l.timer = 0; l.interval = 0.5 + Math.random() * 2.0; rebuildLightning(l); }
            const visible = l.timer < 0.12;
            if (!visible || l.segments.length < 2) return;
            const la = (1 - l.timer / 0.12) * alpha * 0.85;

            X.beginPath(); X.moveTo(l.segments[0].x, 0); l.segments.forEach(seg => X.lineTo(seg.x, seg.y));
            X.strokeStyle = `rgba(255,50,20,${la})`; X.lineWidth = 1.5; X.stroke();

            X.beginPath(); X.moveTo(l.segments[0].x, 0); l.segments.forEach(seg => X.lineTo(seg.x, seg.y));
            X.strokeStyle = `rgba(255,120,60,${la * 0.4})`; X.lineWidth = 5; X.stroke();
        });
    }

    function drawShrine(alpha, age) {
        if (shrineSprite) { X.globalAlpha = alpha; X.drawImage(shrineSprite, 0, 0); X.globalAlpha = 1; }
        const pulse = 0.85 + Math.sin(age * 1.4) * 0.15;
        const atmos = X.createRadialGradient(W*0.5, H*0.65, 0, W*0.5, H*0.65, W*0.7);
        atmos.addColorStop(0, `rgba(180,10,0,${alpha * 0.12 * pulse})`); atmos.addColorStop(0.4, `rgba(100,5,0,${alpha * 0.07})`); atmos.addColorStop(1, 'rgba(0,0,0,0)');
        X.fillStyle = atmos; X.fillRect(0, 0, W, H);
        drawGroundCracks(alpha * 0.7); drawFlames(alpha); drawLightning(alpha);
    }

    function resize() {
        if(!C) return;
        W = C.width = window.innerWidth; H = C.height = window.innerHeight;
        buildSprites();
    }

    // ─── MAIN RENDER LOOP ──────────────────────────────────────────────────
    function render(now) {
        requestAnimationFrame(render);
        dt = Math.min((now - (lastTime || now)) / 1000, 0.033); lastTime = now; t += dt;

        const isShrine = window.currentDomain === 'shrine';
        const flashEl = document.getElementById('flash');
        const titleEl = document.getElementById('domain-title');

        // Kill Switch & Transition Logic
        if (isShrine && prev !== 'shrine') {
            phase = 'slash'; phaseT = 0; shrineT = 0; flash = 1.0; shake = 4.5;
            setTimeout(() => { flash = 0.7; shake = 3.0; }, 80);
            setTimeout(() => { flash = 0.4; }, 180);
            slashes.forEach((s, i) => { s.progress = -(i / SLASH_COUNT) * 0.4; });
        }
        if (!isShrine && prev === 'shrine') {
            phase = 'idle'; // Kill Switch Triggered
            X.clearRect(0, 0, W, H);
            C.style.transform = ''; // Clear CSS shake
        }
        prev = window.currentDomain;

        if (phase === 'idle') return; // Engine sleeps

        // Update Logic
        if (phase === 'slash') {
            phaseT += dt;
            shake = Math.max(shake, 0.8 + Math.sin(phaseT * 22) * 0.4 + Math.random() * 0.9);
            if (phaseT > 1.8) { phase = 'settle'; phaseT = 0; flash = 0.6; shake = 3.5; }
        } else if (phase === 'settle') {
            phaseT += dt; shrineT += dt;
            if (phaseT > 0.6) { phase = 'shrine'; phaseT = 0; shake = 0; }
        } else if (phase === 'shrine') {
            shrineT += dt; shake = 0;
        }

        // Draw Logic
        X.clearRect(0, 0, W, H);

        if (phase === 'slash') {
            const alpha = Math.min(phaseT / 0.2, 1.0);
            X.fillStyle = `rgba(8,0,0,1)`; X.fillRect(0, 0, W, H);
            const burst = X.createRadialGradient(W*0.5, H*0.5, 0, W*0.5, H*0.5, Math.max(W,H)*0.6);
            burst.addColorStop(0, `rgba(255,40,0,${alpha * 0.4})`); burst.addColorStop(0.2, `rgba(180,10,0,${alpha * 0.25})`);
            burst.addColorStop(0.6, `rgba(60,0,0,${alpha * 0.15})`); burst.addColorStop(1, 'rgba(0,0,0,0)');
            X.fillStyle = burst; X.fillRect(0, 0, W, H);
            drawSlashBurst(alpha);

        } else if (phase === 'settle') {
            const p = Math.min(phaseT / 0.6, 1.0), eased = 1 - Math.pow(1 - p, 3);
            X.fillStyle = '#000'; X.fillRect(0, 0, W, H);
            drawSlashBurst(1 - eased); drawShrine(eased, shrineT);

        } else if (phase === 'shrine') {
            drawShrine(1.0, shrineT);
        }

        if (flash > 0.004) { flashEl.style.opacity = flash; flash *= 0.80; } else { flash = 0; }

        if (shake > 0.01) {
            // Apply CSS shake to the whole FX canvas
            const jx = (Math.random()-.5)*shake*48, jy = (Math.random()-.5)*shake*42, jr = (Math.random()-.5)*shake*0.8;
            C.style.transform = `translate(${jx}px,${jy}px) rotate(${jr}deg)`; shake *= 0.87;
        } else { C.style.transform = ''; shake = 0; }

        if (titleEl) titleEl.style.opacity = phase === 'shrine' && shrineT > 0.8 ? Math.min(1, (shrineT - 0.8) / 0.8) : 0;
    }

    // ─── INITIALIZATION ──────────────────────────────────────────────────
    return {
        init: function() {
            if (C) return; // Prevent double init
            C = document.getElementById('fx-canvas'); 
            X = C.getContext('2d', { alpha: true });
            window.addEventListener('resize', resize);
            resize();
            requestAnimationFrame(render);
        }
    };
})();