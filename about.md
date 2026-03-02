Here is the updated `about.md` file with your new points about integrating AI and "vibecoding" smoothly woven into the **What we learned** and **Accomplishments** sections.

---

## Inspiration

The project was inspired by the iconic supernatural combat in the anime *Jujutsu Kaisen*, where characters manifest their inner "domains" using distinct, complex hand signs. Our goal was to bridge the gap between high-speed computer vision and interactive storytelling, allowing users to "expand their domain" in real-time using nothing but a standard webcam.

## What it does

**Domain.cv** is an interactive web application that transforms users into Jujutsu Sorcerers. By leveraging server-side hand-tracking and real-time computer vision, the app detects iconic, complex hand signs through a webcam. Once a gesture is held and recognized, the application instantly triggers immersive 3D and 2D environments—complete with physically correct lighting, particle systems, and cinematic transitions—layered directly over the user's video feed in the browser.

## How we built it

We separated our architecture into a high-frequency **Kinematic Logic Engine** (Backend) and a **Unified Cinematic Engine** (Frontend):

* **Backend (Python & FastAPI):** We used OpenCV for server-side video capture and MediaPipe to extract 21 3D landmarks for up to two hands. While leveraging familiar tools like MediaPipe for computer vision gave us a strong foundation, we pushed it further by building a custom `GestureRecognizer` that processes this data to identify 8 distinct signatures. We then utilized FastAPI and WebSockets to stream Base64 video frames and domain triggers to the frontend with ultra-low latency.
* **Frontend (Three.js & WebGL):** Venturing into complex 3D rendering, we built modular cinematic engines using ES6 Modules and Three.js r160. The frontend manages multiple layered canvases (2D FX and 3D WebGL), utilizing ACES Filmic tone mapping and sRGB color spaces to accurately render heavy `.glb` assets like Hakari's slot machines and Mahito's soul cage.

## The Math

We relied on kinematic geometry to ensure robust detection regardless of the user's distance from the camera:

* **Euclidean Distance:** For macro-checks (e.g., checking if hands are separated), we calculate the pixel distance $d$ between two landmarks $(x_1, y_1)$ and $(x_2, y_2)$ using:

$$d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$$


* **Joint Angles:** To detect curled fingers, we calculate the angle $\theta$ at a joint using the dot product of vectors $\mathbf{A}$ and $\mathbf{B}$ representing the bones:

$$\theta = \arccos\left(\frac{\mathbf{A} \cdot \mathbf{B}}{|\mathbf{A}| |\mathbf{B}|}\right)$$



## Challenges we ran into

* **3D Asset Pipeline & Framing:** Positioning the camera within the 3D `.glb` models required tedious, minute adjustments to achieve the perfect cinematic angle. This was especially difficult for Higuruma's domain, as the original asset downloaded with the textures and model separated, requiring manual reconstruction and re-mapping in Three.js before we could even begin framing the shot.
* **The Occlusion Problem:** Many canonical hand signs involve intertwined fingers, which causes MediaPipe's bounding boxes to merge or fail. We solved this by implementing "Lore-Accurate Pivots," such as using the **Kon (Divine Dog)** sign for Megumi's domain, which provides higher tracking stability while remaining true to the character's abilities.
* **State Thrashing & Context Loss:** Rapidly switching between raw WebGL and Three.js environments initially triggered "Too many active WebGL contexts" warnings and infinite trigger loops. We prevented crashes by implementing a decoupled state tracker and state-driven "Instant Kill Switches" that clear renderers and hide groups to halt draw calls immediately without losing context.

## Accomplishments that we're proud of

We are incredibly proud of building a custom kinematic engine from scratch rather than relying on basic, pre-trained gesture models. By applying trigonometric principles, we successfully programmed the engine to recognize complex, multi-hand interlocking signs under suboptimal hackathon lighting.

We are equally proud of our sheer perseverance on the frontend. Spending hours painstakingly adjusting camera coordinates and reconstructing disjointed 3D assets to ensure domains like Mahito's and Higuruma's looked authentic and cinematic paid off immensely, seamlessly bridging our backend computer vision logic with modern browser-based 3D rendering. Crucially, despite neither of us having deep prior experience in computer vision or advanced web visuals, we successfully navigated these complex domains by adapting to a modern, AI-augmented workflow.

## What we learned

We learned valuable "vibecoding" skills by integrating AI directly into our development workflow. This dramatically increased our efficiency, enabling us to rapidly prototype, debug obscure Three.js context errors, and implement complex mathematical kinematics far faster than traditional methods would have allowed.

Additionally, we learned how to turn the failure states of a machine learning model into features. When our tracking struggled with occluded hands, we developed "macro-pose" logic—focusing on identifiable landmarks while mathematically ignoring noisy, hidden joints. Beyond the logic, managing high-frequency data streams using WebSockets for real-time web interactivity gave us a masterclass in full-stack latency optimization.

## What's next for domain.cv

Our immediate next steps are to elevate the immersion by integrating spatial audio and authentic sound effects for each domain expansion. Visually, we are exploring real-time background removal (greenscreening) for the user's video feed, allowing us to composite the user directly *on top* of the 3D domain animations rather than relying on the Picture-in-Picture display. Finally, we plan to polish the remaining shikigami logic for Megumi's *Mahoraga* to complete the current roster.