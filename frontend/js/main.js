// --- Elements ---
const video = document.getElementById('webcam-video');
const hiddenCanvas = document.createElement('canvas');
const ctx = hiddenCanvas.getContext('2d');
const debugImage = document.getElementById('debug-skeleton'); // Optional: to see MediaPipe's output
const domainText = document.getElementById('domain-name-display');

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

// --- Receive Data from Python ---
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // 1. Update the text UI (optional)
    if (domainText) {
        domainText.innerText = data.domain.toUpperCase().replace(/_/g, ' ');
    }

    // 2. Update the debug image with the MediaPipe skeleton (optional)
    if (debugImage) {
        debugImage.src = data.image;
    }

    // 3. THE MAGIC LINK: Tell Three.js (scene.js) to change the visuals!
    // This calls the function we exposed in scene.js
    if (window.updateDomain) {
        window.updateDomain(data.domain);
    }
};

ws.onerror = (error) => {
    console.error("WebSocket Error:", error);
};