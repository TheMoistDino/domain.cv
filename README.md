# Domain.cv 🤞✨
**Real-time Domain Expansions powered by Computer Vision.**

Domain.cv is an interactive web application that transforms users into Jujutsu Sorcerers. By leveraging advanced hand-tracking kinematics and real-time computer vision, the app detects iconic hand signs through a webcam and instantly triggers immersive 3D environments directly in the browser.

---

## 🛠️ Technical Architecture

### **Backend (Python & FastAPI)**
The "brain" of the project, responsible for high-speed gesture recognition and kinematic analysis.
* **Computer Vision:** Powered by **MediaPipe** to extract 21 3D hand landmarks at high fidelity.
* **Kinematic Engine:** A custom-built `GestureRecognizer` that utilizes Euclidean distance, joint-angle dot products, and temporal smoothing to identify complex interlocked signs.
* **Real-time Streaming:** Uses **WebSockets** via FastAPI to handle full-duplex communication between the webcam feed and the ML logic.

### **Frontend (Three.js & Web)**
The "soul" of the project, bringing the anime magic to life through 3D rendering.
* **3D Rendering:** **Three.js** is used to create an immersive overlay over the user's camera feed.
* **Dynamic Environments:** A modular scene controller swaps lighting, particle systems, and 3D assets based on the domain string received from the backend.
* **Webcam Integration:** Captures and encodes video frames into Base64 for real-time processing.

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
│   ├── style.css              (Themed styling)
│   ├── js/
│   │   ├── main.js            (Webcam & WebSocket state)
│   │   └── scene.js           (Three.js rendering)
│   └── assets/                
│       ├── models/            (GLB/GLTF 3D models)
│       └── textures/          (Particle/Background assets)
└── README.md
```
---

## 🚀 Getting Started
### Backend Setup
1. Create a virtual environment: python -m venv .venv
2. Install dependencies: pip install -r backend/requirements.txt
3. Start the server: uvicorn backend.app:app --reload

### Frontend Setup
1. Simply open frontend/index.html in a modern web browser.
2. Ensure your webcam is enabled and the WebSocket connection to localhost:8000 is active.