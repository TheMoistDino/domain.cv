# Domain.cv 🤞✨
**Real-time Domain Expansions powered by Computer Vision.**

Domain.cv is an interactive web application that transforms users into Jujutsu Sorcerers. By leveraging server-side hand-tracking and real-time computer vision, the app detects iconic hand signs and triggers immersive 3D/2D environments with physically correct lighting and cinematic transitions.

---

## 🛠️ Technical Architecture

### **Backend (Python & FastAPI)**
The "brain" of the project, responsible for high-speed gesture recognition and kinematic analysis.
* **Server-Side Rendering**: Uses OpenCV to capture the webcam feed directly in Python, ensuring MediaPipe has exclusive access to the hardware.
* **Computer Vision**: Powered by MediaPipe to extract 21 3D hand landmarks and overlay skeleton tracking on the video frames.
* **Kinematic Engine**: A custom-built GestureRecognizer with a 10-second auto-reset timer to prevent domain "locking" and ensure smooth resets.
* **FastAPI WebSockets**: Streams processed Base64 video frames and domain state data to the frontend at high frequency.

### **Frontend (Three.js & ES Modules)**
The "soul" of the project, bringing the anime magic to life through 3D rendering.
* **r160 Standardization**: All 3D domains (Mahito, Hakari, Yuta) utilize ACES Filmic Tone Mapping and sRGB Color Space for physically accurate lighting and 3D model rendering.
* **Unified Cinematic Engine**: A modular system that manages WebGL contexts, 2D overlays, and "Instant Kill Switches" to clear memory when swapping domains.
* **Enhanced UI**: Includes a Picture-in-Picture camera feed, an interactive Energy Meter, and a global "R" Key Reset with a visual notification popup.

---

## 🔮 Recognized Signatures
The engine currently recognizes 8 distinct signatures through a blend of one-handed and two-handed kinematic checks:

### **Domain Expansions**
1.  **Infinite Void (Gojo Satoru):** One-handed; Index and Middle fingers crossed.
2.  **Malevolent Shrine (Ryomen Sukuna):** Two-handed; Hands touching, middle fingers extended.
3.  **Chimera Shadow Garden (Megumi Fushiguro):** Two-handed "Kon" Divine Dog sign pivot for maximum tracking stability.
4.  **Self-Embodiment of Perfection (Mahito):** Two-handed; Fingers forming a hollow sphere/cage.
5.  **Idle Death Gamble (Kinji Hakari):** Two-handed; Triple finger extension with Thumb/Index rings.
6.  **Authentic Mutual Love (Yuta Okkotsu):** Two-handed; Strict separation of one fist and one flat palm.
7.  **Deadly Sentencing (Hiromi Higuruma):** One-handed; Grip-tracking to detect the presence of a mallet handle.

### **Shikigami Summoning**
8.  **Eight-Handled Sword Divergent Sila Divine General Mahoraga:** Two-handed; Two separated, tight balled-up fists.

---

## 📂 Directory Tree
```text
domain-expansion-cv/
├── backend/
│   ├── app.py                 (Main FastAPI server)
│   ├── requirements.txt       (Python dependencies)
│   └── vision/                
│       ├── __init__.py
│       ├── hand_tracker.py    (MediaPipe extraction)
│       └── gesture_logic.py   (Kinematic logic engine)
├── frontend/
│   ├── index.html             (Web app interface)
│   ├── style.css              (Shared styles)
│   └── js/
│       ├── main.js            (Webcam & MasterController)
│       ├── void_engine.js     (Logic for infinite void)
│       ├── shrine_engine.js   (Logic for malevolent shrine)
│       ├── perfection_engine.js   (Logic for self embodiment of perfection)
│       ├── hakari_engine.js   (Logic for idle death gamble)
│       ├── yuta_engine.js     (Logic for authentic mutual love)
│       ├── chimera_engine.js  (Logic for chimera shadow garden)
│       ├── higuruma_engine.js     (Logic for authentic mutual love)
│       └── mahoraga_engine.js     (Logic for summoning mahoraga)
└── README.md
```
---

## 🚀 Getting Started
### Backend Setup
1. Create a virtual environment: `python -m venv .venv`
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Start the server: `uvicorn backend.app:app --reload`

### Frontend Setup
1. **Critical**: Due to ES Module security (CORS), you must serve the frontend through a local server.
2. Run `python -m http.server 5500` inside the frontend folder.
3. Open `http://localhost:5500` in your browser.

---

## 🛠️ Troubleshooting for Judges
If the webcam feed is black or the domain expansions are not triggering, please check the following:

1. **Webcam Access & Privacy**
* **Browser Permissions**: Ensure you have clicked "Allow" when the browser asks for camera access. If you missed it, click the Lock Icon 🔒 in the URL bar to reset permissions.
* **Hardware Switch**: Some laptops have a physical privacy slider or a function key (like F8 or F10) that disables the camera at the hardware level. Ensure this is "On."
* **Other Apps**: Ensure no other applications (Zoom, Teams, Discord) are currently using the webcam, as OpenCV requires exclusive hardware access.

2. **Local Server Security (CORS)**
* **Protocol Check**: Due to modern browser security for ES Modules, the 3D engines will not load if you open index.html directly as a file (e.g., file:///C:/...).
* **Solution**: You must serve the frontend via a local server. Ensure you have run python -m http.server 5500 and are visiting http://localhost:5500.

3. **WebSocket Connectivity**
* **Backend Status**: Check your terminal to ensure the FastAPI server is running and displaying Uvicorn running on http://127.0.0.1:8000.
* **Connection Display**: The UI should say "NEUTRAL" in the top-left status card. If it says "CONNECTING..." or "CONNECTION ERROR," the frontend cannot find the Python backend.

4. **"Emergency Reset" Hotkey**
* **The 'R' Key**: If a domain cinematic gets stuck or you want to clear the screen instantly to try a new gesture, press 'R' on your keyboard. This forces a global environment reset and triggers a visual confirmation popup.

5. **Detection Tips**
* **Lighting**: MediaPipe performs best in well-lit environments. If your room is very dark, the kinematic engine may struggle to identify finger-crossing or "fist vs. flat" states.
* **Framing**: Keep your hands within the center of the frame. If your hands are too close to the lens, the tracking landmarks might "flicker," resetting the 0.5s hold-time required for activation.