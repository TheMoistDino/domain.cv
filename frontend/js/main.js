// --- Elements ---
const inputVideoUI = document.getElementById('input_video');
const domainText = document.getElementById('domain-name-display');
const guideLayer = document.getElementById('guide-layer');
const meterFill = document.getElementById('energy-meter-fill');

// Cinematic Title Elements
const titleEn = document.getElementById('title-en');
const titleJp = document.getElementById('title-jp');
const titleContainer = document.getElementById('domain-title');
const flashEl = document.getElementById('flash');

// Initialize State
window.currentDomain = 'neutral';
let lastReceivedDomain = 'neutral'; // NEW: Decoupled backend state tracker

// --- Connect to Backend ---
const ws = new WebSocket("ws://localhost:8000/ws");

ws.onopen = () => {
    console.log("Connected to Python Server! Waiting for video stream...");
    if (domainText) domainText.innerText = "NEUTRAL";
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const newDomain = data.domain;

    // 1. Render the backend's skeleton video stream directly to the UI
    if (inputVideoUI && data.image) {
        inputVideoUI.src = data.image;
    }

    // 2. Hide UI guide squares if a cinematic is playing
    if (newDomain === "neutral") {
        if (guideLayer) guideLayer.style.display = 'flex';
    } else {
        if (guideLayer) guideLayer.style.display = 'none';
    }

    // 3. Update UI Text & Energy Meter
    if (domainText) {
        domainText.innerText = newDomain.toUpperCase().replace(/_/g, ' ');
    }
    if (meterFill) {
        meterFill.style.width = (data.progress * 100) + "%";
        meterFill.style.opacity = 0.5 + (data.progress * 0.5);
    }

    // 4. FIX: Only trigger the Master Controller if the backend state ACTUALLY changes
    if (lastReceivedDomain !== newDomain) {
        lastReceivedDomain = newDomain;
        triggerCinematic(newDomain);
    }
};

ws.onerror = (error) => {
    console.error("WebSocket Error:", error);
    if (domainText) domainText.innerText = "CONNECTION ERROR";
};

// --- THE MASTER CONTROLLER ---
function triggerCinematic(domain) {
    // FIX: Completely reset CSS classes AND inline styles to prevent cross-contamination
    if (titleContainer) {
        titleContainer.className = ''; 
        titleContainer.style.textShadow = '';
        titleContainer.style.color = '';
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
                // Mahito's Cyan Theme
                titleContainer.style.textShadow = "0 0 20px rgba(0,150,255,.9), 0 0 50px rgba(0,80,200,.6)";
                titleContainer.style.color = "rgba(255,255,255,.9)";
            }
            if (flashEl) flashEl.style.background = "#0a1118"; 
            
            window.currentDomain = "mahito"; 
            if (window.PerfectionEngine) window.PerfectionEngine.init();
            break;

        case "idle_death_gamble":
            if (titleEn) titleEn.innerText = "IDLE DEATH GAMBLE";
            if (titleJp) titleJp.innerText = "坐殺博徒";
            
            if (titleContainer) {
                // Hakari's Pink/Gold Theme
                titleContainer.style.textShadow = "0 0 20px rgba(255,215,0,.9), 0 0 50px rgba(255,50,150,.8)";
                titleContainer.style.color = "rgba(255,215,0,.9)";
            }
            if (flashEl) flashEl.style.background = "#fff"; 
            
            window.currentDomain = "hakari"; 
            if (window.HakariEngine) window.HakariEngine.init();
            break;

        case "authentic_mutual_love":
            if (titleEn) titleEn.innerText = "AUTHENTIC MUTUAL LOVE";
            if (titleJp) titleJp.innerText = "真贋相愛";
            
            // Yuta's Ethereal Blue/Pink Theme
            if (titleContainer) {
                titleContainer.style.textShadow = "0 0 20px rgba(200,220,255,.8), 0 0 50px rgba(255,150,200,.6), 0 0 100px rgba(255,255,255,.4)";
                titleContainer.style.color = "rgba(240,245,255,.9)";
            }
            if (flashEl) flashEl.style.background = "#050005"; // Pitch black fade-in
            
            window.currentDomain = "yuta"; 
            if (window.YutaEngine) window.YutaEngine.init();
            break;

        case "deadly_sentencing":
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

        default:
            if (titleEn) titleEn.innerText = "";
            if (titleJp) titleJp.innerText = "";
            window.currentDomain = "neutral";
            break;
    }
    
    console.log("Cinematic Engine switched to:", window.currentDomain);
}

// --- HOTKEY RESET FUNCTIONALITY ---
function triggerReset() {
    console.log("Environment Reset Triggered via 'R' key");
    
    // 1. Force the backend tracker to 'neutral' so it doesn't ignore the next frame
    lastReceivedDomain = 'neutral';
    
    // 2. Force the cinematic engines to clear the screen
    triggerCinematic('neutral');
    
    // 3. Reset the UI elements
    if (domainText) domainText.innerText = "NEUTRAL";
    if (meterFill) {
        meterFill.style.width = "0%";
        meterFill.style.opacity = "0.5";
    }
}

// --- Elements ---
const resetNotif = document.getElementById('reset-notification');

// --- HOTKEY RESET ---
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r') {
        // 1. Existing Reset Logic
        lastReceivedDomain = 'neutral';
        triggerCinematic('neutral');
        if (domainText) domainText.innerText = "NEUTRAL";
        if (meterFill) meterFill.style.width = "0%";

        // 2. Trigger Notification Popup
        if (resetNotif) {
            resetNotif.classList.add('show');
            
            // Remove the notification after 1.5 seconds
            setTimeout(() => {
                resetNotif.classList.remove('show');
            }, 1500);
        }
        
        console.log("Environment Reset Triggered via 'R' key");
    }
});