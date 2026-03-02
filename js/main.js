// --- Elements ---
const videoElement = document.getElementById('input_video');
const domainText = document.getElementById('domain-name-display');
const guideLayer = document.getElementById('guide-layer');
const meterFill = document.getElementById('energy-meter-fill');
const resetNotif = document.getElementById('reset-notification');

// Cinematic Title Elements
const titleEn = document.getElementById('title-en');
const titleJp = document.getElementById('title-jp');
const titleContainer = document.getElementById('domain-title');
const flashEl = document.getElementById('flash');

// --- Initialize State ---
window.currentDomain = 'neutral';
let lastReceivedDomain = 'neutral'; 

// --- Initialize Vision Logic Engine ---
const recognizer = new GestureRecognizer(); 

// --- MediaPipe Setup ---
const hands = new Hands({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

let hasConnected = false; 

// This runs every time the JS model processes a frame
hands.onResults((results) => {
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        
        // 1. Get both the domain AND progress from the recognizer
        let engineData = recognizer.getDomainExpansion(results.multiHandLandmarks);
        let detectedDomain = engineData.domain;
        let buildUp = engineData.progress;
        
        // --- FIX: ANIMATE CURSED ENERGY METER ---
        if (meterFill) {
            meterFill.style.width = `${buildUp * 100}%`;
        }

        if (!hasConnected && domainText) {
            hasConnected = true;
            domainText.innerText = "NEUTRAL";
            console.log("MediaPipe successfully tracking hands!");
        }

        // Update the UI text
        if (domainText && detectedDomain !== "neutral") {
            domainText.innerText = detectedDomain.toUpperCase().replace(/_/g, " ");
        } else if (domainText && detectedDomain === "neutral" && hasConnected) {
            // Optional: Show what is currently building up if hands are held but not fully locked in
            if (recognizer.candidateDomain !== "neutral" && buildUp > 0) {
                domainText.innerText = `DETECTING: ${recognizer.candidateDomain.toUpperCase().replace(/_/g, " ")}`;
            } else {
                domainText.innerText = "NEUTRAL";
            }
        }

        // 2. Trigger the 3D cinematic
        if (detectedDomain !== "neutral" && detectedDomain !== window.currentDomain) {
            triggerCinematic(detectedDomain); 
        }
    } else {
        // If hands drop off-screen, drain the meter and reset text
        if (hasConnected && domainText && window.currentDomain === 'neutral') {
            domainText.innerText = "NEUTRAL";
        }
        if (meterFill) meterFill.style.width = "0%";
    }
});

// --- Start Webcam ---
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({image: videoElement});
  },
  width: 640,
  height: 480
});
camera.start();


// --- THE MASTER CONTROLLER ---
function triggerCinematic(domain) {
    if (titleContainer) {
        titleContainer.className = ''; 
        titleContainer.style.textShadow = '';
        titleContainer.style.color = '';
        
        // --- FIX: PREVENT TITLE FLASHING ---
        titleContainer.style.transition = 'none';
        titleContainer.style.opacity = '0';
        void titleContainer.offsetWidth; 
        titleContainer.style.transition = '';
    }

    switch(domain) {
        case "infinite_void":
            if (titleEn) titleEn.innerText = "INFINITE VOID";
            if (titleJp) titleJp.innerText = "無量空処";
            if (titleContainer) titleContainer.classList.add("theme-void");
            if (flashEl) flashEl.style.background = "#fff";
            
            window.currentDomain = "void"; 
            if (typeof VoidEngine !== 'undefined') VoidEngine.init();
            break;
            
        case "malevolent_shrine":
            if (titleEn) titleEn.innerText = "MALEVOLENT SHRINE";
            if (titleJp) titleJp.innerText = "伏魔御廚子";
            if (titleContainer) titleContainer.classList.add("theme-shrine");
            if (flashEl) flashEl.style.background = "#ff0000";
            
            window.currentDomain = "shrine"; 
            if (typeof ShrineEngine !== 'undefined') ShrineEngine.init();
            break;
            
        case "chimera_shadow_garden":
            if (titleEn) titleEn.innerText = "CHIMERA SHADOW GARDEN";
            if (titleJp) titleJp.innerText = "嵌合暗翳庭";
            if (titleContainer) titleContainer.classList.add("theme-chimera");
            if (flashEl) flashEl.style.background = "#1a0033";
            
            window.currentDomain = "chimera"; 
            if (typeof ChimeraEngine !== 'undefined') ChimeraEngine.init();
            break;
            
        case "self_embodiment_of_perfection": 
            if (titleEn) titleEn.innerText = "SELF-EMBODIMENT OF PERFECTION";
            if (titleJp) titleJp.innerText = "自閉円頓裹";
            if (titleContainer) {
                titleContainer.style.textShadow = "0 0 20px rgba(0,150,255,.9), 0 0 50px rgba(0,80,200,.6)";
                titleContainer.style.color = "rgba(255,255,255,.9)";
            }
            if (flashEl) flashEl.style.background = "#0a1118"; 
            
            window.currentDomain = "mahito"; 
            if (window.PerfectionEngine) window.PerfectionEngine.init();
            break;

        case "idle_death_gamble":
        case "hakari": 
            if (titleEn) titleEn.innerText = "IDLE DEATH GAMBLE";
            if (titleJp) titleJp.innerText = "坐殺博徒";
            
            if (titleContainer) {
                titleContainer.style.textShadow = "0 0 20px rgba(255,215,0,.9), 0 0 50px rgba(255,50,150,.8)";
                titleContainer.style.color = "rgba(255,215,0,.9)";
            }
            if (flashEl) flashEl.style.background = "#fff"; 
            
            window.currentDomain = "hakari"; 
            if (window.HakariEngine) window.HakariEngine.init();
            break;
            
        case "authentic_mutual_love":
        case "yuta":
            if (titleEn) titleEn.innerText = "AUTHENTIC MUTUAL LOVE";
            if (titleJp) titleJp.innerText = "真贋相愛";
            
            if (titleContainer) {
                titleContainer.style.textShadow = "0 0 20px rgba(200,220,255,.8), 0 0 50px rgba(255,150,200,.6), 0 0 100px rgba(255,255,255,.4)";
                titleContainer.style.color = "rgba(240,245,255,.9)";
            }
            if (flashEl) flashEl.style.background = "#050005"; 
            
            window.currentDomain = "yuta"; 
            if (window.YutaEngine) window.YutaEngine.init();
            break;

        case "deadly_sentencing":
        case "higuruma":
            if (titleEn) titleEn.innerText = "DEADLY SENTENCING";
            if (titleJp) titleJp.innerText = "誅伏賜死";
            
            if (titleContainer) {
                titleContainer.style.textShadow = "0 0 20px rgba(255,215,0,.8), 0 0 50px rgba(255,255,255,.6)";
                titleContainer.style.color = "rgba(255,215,0,.9)";
            }
            if (flashEl) flashEl.style.background = "#ffffff"; 
            
            window.currentDomain = "higuruma"; 
            if (window.HigurumaEngine) window.HigurumaEngine.init();
            break;

        case "summon_mahoraga":
        case "mahoraga":
            if (titleEn) titleEn.innerText = "DIVINE GENERAL MAHORAGA";
            if (titleJp) titleJp.innerText = "八握剣異戒神将魔虚羅";
            
            if (titleContainer) {
                titleContainer.style.textShadow = "0 0 20px rgba(255,215,0,.8), 0 0 50px rgba(255,255,255,.6)";
                titleContainer.style.color = "rgba(255,215,0,.9)";
            }
            if (flashEl) flashEl.style.background = "#ffffff"; 
            
            window.currentDomain = "mahoraga"; 
            if (window.MahoragaEngine) window.MahoragaEngine.init();
            break;

        default:
            if (titleEn) titleEn.innerText = "";
            if (titleJp) titleJp.innerText = "";
            window.currentDomain = "neutral";
            break;
    }
    
    console.log("Cinematic Engine switched to:", window.currentDomain);
}

// --- HOTKEY RESET ---
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r') {
        lastReceivedDomain = 'neutral';
        triggerCinematic('neutral');
        
        // Reset the UI elements
        if (domainText) domainText.innerText = "NEUTRAL";
        if (meterFill) {
            meterFill.style.width = "0%";
            meterFill.style.opacity = "0.5";
        }

        // Trigger Notification Popup
        if (resetNotif) {
            resetNotif.classList.add('show');
            setTimeout(() => {
                resetNotif.classList.remove('show');
            }, 1500);
        }
        
        console.log("Environment Reset Triggered via 'R' key");
    }
});