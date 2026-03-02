import cv2
import numpy as np
import base64
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Import your custom modules
from vision.hand_tracker import HandTracker
from vision.gesture_logic import GestureRecognizer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tracker = HandTracker()
recognizer = GestureRecognizer()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected! Backend taking control of webcam...")
    
    # Backend natively captures the local webcam
    cap = cv2.VideoCapture(0)
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.03)
                continue

            # 1. Process the frame (Tracking & Drawing)
            processed_frame, detected_hands = tracker.process_frame(frame, draw=True)
            
            # 2. Determine the active Domain Expansion
            domain, progress = recognizer.get_domain_expansion(detected_hands)
            
            # 3. Encode the frame to Base64 to stream DOWN to the frontend
            _, buffer = cv2.imencode('.jpg', processed_frame)
            encoded_frame = base64.b64encode(buffer).decode('utf-8')
            
            # 4. Push the data to the frontend (No request needed from index.html)
            await websocket.send_text(json.dumps({
                "domain": domain,
                "progress": progress,
                "image": f"data:image/jpeg;base64,{encoded_frame}"
            }))
            
            # Yield to the event loop (~30 FPS limit)
            await asyncio.sleep(0.03)
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error processing frame: {e}")
    finally:
        cap.release()