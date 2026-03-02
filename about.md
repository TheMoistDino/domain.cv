### **Inspiration**

The project was inspired by the iconic supernatural combat in the anime *Jujutsu Kaisen*, where characters manifest their inner "domains" using distinct, complex hand signs. Our goal was to bridge the gap between high-speed computer vision and interactive storytelling, allowing users to "expand their domain" in real-time using nothing but a standard webcam.

### **How we built the Backend**

The backend serves as the project's high-frequency "Kinematic Logic Engine".

* **Infrastructure**: We built a modular directory structure to separate the core computer vision logic from the server communication layers.
* **Hand Tracking**: We implemented a `HandTracker` class utilizing **MediaPipe** to extract 21 3D landmarks for up to two hands. We customized this to convert normalized coordinates into actual pixel coordinates for more intuitive geometric calculations.
* **Kinematic Engine**: We developed a `GestureRecognizer` that performs real-time geometric analysis. The system currently recognizes 8 distinct signatures, including one-handed signs like Gojo's *Infinite Void* and two-handed interlocked signs like Sukuna's *Malevolent Shrine*.
* **Real-time Communication**: We utilized **FastAPI and WebSockets** to create a full-duplex communication channel. This allows the application to process webcam frames encoded as Base64 strings and return domain triggers with ultra-low latency.
* **Temporal Smoothing**: To prevent visual flickering, we implemented a debouncing algorithm that requires a specific gesture to be held for a stable duration (0.5 seconds) before updating the state.

### **The Math**

We relied on kinematic geometry to ensure robust detection regardless of the user's distance from the camera:

* **Euclidean Distance**: For macro-checks (e.g., checking if hands are separated), we calculate the pixel distance $d$ between two landmarks $(x_1, y_1)$ and $(x_2, y_2)$ using:

$$d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$


* **Joint Angles**: To detect curled fingers, we calculate the angle $\theta$ at a joint using the dot product of vectors $\mathbf{A}$ and $\mathbf{B}$ representing the bones:

$$\theta = \arccos\left(\frac{\mathbf{A} \cdot \mathbf{B}}{|\mathbf{A}| |\mathbf{B}|}\right)$$



### **Challenges Faced**

* **The Occlusion Problem**: Many canonical hand signs involve intertwined fingers, which causes MediaPipe's bounding boxes to merge or fail. We solved this by implementing "Lore-Accurate Pivots," such as using the **Kon (Divine Dog)** sign for Megumi's domain, which provides higher tracking stability while remaining true to the character's abilities.
* **Environment Stability**: We encountered significant `AttributeErrors` with MediaPipe's C++ bindings on Python 3.13. We successfully diagnosed and pivoted the entire team to a stable Python 3.12 environment mid-hackathon to maintain the development timeline.
* **CORS & Asset Security**: Standard browser security initially blocked our 3D `.glb` models from loading via the `file:///` protocol. We resolved this by shifting to a local Python-hosted server, ensuring the frontend had secure access to external 3D assets.
* **ES Module Scoping**: Transitioning the 3D engines to modern ES Modules caused "silent failures" where the master controller could not access private engine functions. We fixed this by explicitly binding each engine to the global `window` object to bridge the gap between module-based and script-based logic.
* **WebGL Context Management**: Rapidly switching between raw WebGL and Three.js environments initially triggered "Too many active WebGL contexts" warnings. We prevented crashes by implementing state-driven "Instant Kill Switches" that clear renderers and hide groups to halt draw calls immediately without losing context.
* **Coordinate System Transformation**: We bypassed complex projection matrices by decoupling 2D cinematic slashes (pixel-based on `fx-canvas`) from 3D unit-based scenes. We aligned them by locking camera focus on specific 3D targets and syncing 2D origin points to the center of the screen.
* **Responsive Camera Scaling**: To prevent the fixed Picture-in-Picture (PiP) feed from overlapping critical 3D structures on smaller screens, we used CSS fixed positioning and "Dead-Space Positioning" for 3D assets. We also dynamically rescaled Three.js projection matrices and aspect ratios to maintain visual integrity across all window sizes.

### **What we learned**

We learned how to turn the failure states of a model into features. When MediaPipe struggled with occluded hands, we developed "macro-pose" logic—focusing on identifiable landmarks while mathematically ignoring noisy, hidden joints. We also gained significant experience in managing high-frequency data streams using WebSockets for real-time web interactivity.