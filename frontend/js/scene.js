// --- 1. Basic Three.js Setup ---
const canvasContainer = document.getElementById('canvas-container');
const scene = new THREE.Scene();

// We use alpha: true so the background is transparent and the webcam shows through
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
canvasContainer.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// --- 2. Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 5, 5);
scene.add(directionalLight);

// --- 3. Placeholder Visuals (Your teammate will replace these with GLTF models) ---
// Let's create a basic particle system that we can change colors/speed based on the domain
const geometry = new THREE.BufferGeometry();
const particlesCount = 1000;
const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 15; // Spread particles around
}

geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const material = new THREE.PointsMaterial({ size: 0.05, color: 0xffffff });
const particlesMesh = new THREE.Points(geometry, material);
scene.add(particlesMesh);

// --- 4. The Domain Logic Controller ---
let currentDomain = "neutral";

// This function will be called by main.js whenever the Python server sends a new string
window.updateDomain = function(newDomain) {
    if (currentDomain === newDomain) return; // Don't trigger if it's the same domain
    
    currentDomain = newDomain;
    console.log("Visuals switching to:", currentDomain);

    // Reset all models and backgrounds
    if (shrineModel) shrineModel.visible = false;
    if (dogModel) dogModel.visible = false;
    if (mahoragaWheel) mahoragaWheel.visible = false; // If implemented
    scene.background = null;

    // Teammate's Playground: Change colors, load specific models, or trigger animations here
    switch(currentDomain) {
        case "infinite_void":
            material.color.setHex(0x00ffff); // Cosmic Blue
            particlesMesh.material.size = 0.08;
            scene.background = new THREE.Color(0x000011); // Dark space background
            break;
            
        case "malevolent_shrine":
            material.color.setHex(0xff0000); // Blood Red
            particlesMesh.material.size = 0.05;
            scene.background = new THREE.Color(0x220000); // Dark red background
            // TODO: Load Sukuna Shrine .glb model here
            break;

        case "authentic_mutual_love":
            material.color.setHex(0xffb6c1); // Light Pink
            scene.background = null; // Transparent, letting webcam show clearly
            break;

        case "idle_death_gamble":
            material.color.setHex(0xffd700); // Casino Gold
            scene.background = null; 
            // TODO: Flashy casino lights or pachinko balls
            break;

        case "neutral":
        default:
            material.color.setHex(0xffffff);
            scene.background = null; // Transparent background
            break;
    }
}

// --- 5. Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Make the particles slowly rotate
    particlesMesh.rotation.y += 0.001;
    particlesMesh.rotation.x += 0.0005;

    // Add specific animation logic based on domain
    if (currentDomain === "infinite_void") {
        particlesMesh.rotation.y += 0.01; // Spin faster!
    } else if (currentDomain === "malevolent_shrine") {
        particlesMesh.position.y = Math.sin(Date.now() * 0.005) * 0.1; // Menacing floating effect
    }

    renderer.render(scene, camera);
}

animate();

// --- 6. Handle Window Resize ---
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});