# domain.cv
Real-time Domain Expansions powered by Computer Vision. We blend Python hand-tracking and dynamic web rendering to detect webcam signs and trigger visual anime environments right in your browser!

# Directory Tree
domain-expansion-cv/
├── backend/
│   ├── app.py                 (Your main server file - Flask or FastAPI)
│   ├── requirements.txt       (Python dependencies)
│   └── vision/                
│       ├── __init__.py
│       ├── hand_tracker.py    (MediaPipe initialization and raw landmark extraction)
│       └── gesture_logic.py   (The math identifying specific Domain Expansion signs)
├── frontend/
│   ├── index.html             (The main web app interface)
│   ├── style.css              (Jujutsu Kaisen themed styling and layout)
│   ├── script.js              (Handles webcam capture and sending frames to backend)
│   └── assets/                (Your Domain Expansion GIFs, sounds, and neutral images)
├── .gitignore                 (Ignore __pycache__, virtual environments, etc.)
└── README.md                  (Project setup and run instructions)