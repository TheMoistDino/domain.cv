// --- Elements ---
const video = document.getElementById('webcam-video');
const hiddenCanvas = document.createElement('canvas');
const ctx = hiddenCanvas.getContext('2d');
const debugImage = document.getElementById('debug-skeleton'); // Optional: to see MediaPipe's output
const domainText = document.getElementById('domain-name-display');
const resetBtn = document.getElementById('reset-btn');

// Initialize the display
if (domainText) domainText.innerText = "NEUTRAL";

// --- WebSocket Setup ---
const ws = new WebSocket("ws://localhost:8000/ws");

// --- Webcam Setup ---
navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
    .then(stream => {
        video.srcObject = stream;
        video.play();
    })
    .catch(err => console.error("Webcam access denied or error:", err));

// --- Communication Loop ---
ws.onopen = () => {
    console.log("Connected to Python Computer Vision Server!");
    
    // Send a frame to the server every 100ms (10 FPS)
    setInterval(() => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            hiddenCanvas.width = video.videoWidth;
            hiddenCanvas.height = video.videoHeight;
            
            // Draw current webcam frame to canvas
            ctx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
            
            // Convert to Base64 and send to FastAPI
            const base64Data = hiddenCanvas.toDataURL('image/jpeg', 0.5);
            ws.send(base64Data);
        }
    }, 100); 
};

// --- Reset Functionality ---
function triggerReset() {
    console.log("Environment Reset Triggered");
    
    // 1. Force the UI back to Neutral
    if (domainText) domainText.innerText = "NEUTRAL";
    
    // 2. Clear the progress bar
    const meterFill = document.getElementById('energy-meter-fill');
    if (meterFill) meterFill.style.width = "0%";

    // 3. Force Three.js back to Neutral
    if (window.updateDomain) {
        window.updateDomain("neutral");
    }
}

// Button Click Listener
resetBtn.addEventListener('click', triggerReset);

// Optional: Keyboard shortcut 'R' for the demo video
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r') triggerReset();
});

// --- Receive Data from Python ---
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // 1. Update UI Text (This replaces the content, preventing overlap)
    if (domainText) {
        const cleanName = data.domain.toUpperCase().replace(/_/g, ' ');
        domainText.innerText = cleanName;
    }

    // 2. Update Cursed Energy Meter
    const meterFill = document.getElementById('energy-meter-fill');
    if (meterFill) {
        // progress is 0.0 to 1.0 from the backend
        meterFill.style.width = (data.progress * 100) + "%";
        
        // Make it glow brighter as it fills
        meterFill.style.opacity = 0.5 + (data.progress * 0.5);
    }

    // 3. Update Debug Image
    if (debugImage) {
        debugImage.src = data.image;
    }

    // 4. Trigger Three.js
    if (window.updateDomain) {
        window.updateDomain(data.domain);
    }
};

ws.onerror = (error) => {
    console.error("WebSocket Error:", error);
};