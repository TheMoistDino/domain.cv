import cv2
import numpy as np
import base64
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Import your custom modules
from vision.hand_tracker import HandTracker
from vision.gesture_logic import GestureRecognizer

app = FastAPI()

# Allow CORS for local frontend testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate our tracking and logic classes
tracker = HandTracker()
recognizer = GestureRecognizer()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected to WebSocket")
    
    try:
        while True:
            # 1. Receive frame from frontend (Base64 encoded string)
            data = await websocket.receive_text()
            
            # Strip the "data:image/jpeg;base64," header if the frontend sends it
            if ',' in data:
                data = data.split(',')[1]
            
            # 2. Decode Base64 string to a NumPy array, then to an OpenCV image
            img_bytes = base64.b64decode(data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if frame is None:
                continue

            # 3. Process the frame to get landmarks and draw the skeleton
            processed_frame, detected_hands = tracker.process_frame(frame, draw=True)
            
            # 4. Determine the active Domain Expansion and charge progress
            domain, progress = recognizer.get_domain_expansion(detected_hands)
            
            # 5. Encode the processed frame back to Base64 to display the skeleton on the UI
            _, buffer = cv2.imencode('.jpg', processed_frame)
            encoded_frame = base64.b64encode(buffer).decode('utf-8')
            
            # 6. Send the domain string and the annotated video frame back to the frontend
            await websocket.send_text(json.dumps({
                "domain": domain,
                "progress": progress,
                "image": f"data:image/jpeg;base64,{encoded_frame}"
            }))
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error processing frame: {e}")