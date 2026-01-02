// Import Three.js library and necessary modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Create the 3D scene
const scene = new THREE.Scene();

// Set fixed aspect ratio for consistent display across devices
// Adjust these values to change the canvas dimensions
const targetWidth = 1440;
const targetHeight = 2560;
const targetAspect = targetWidth / targetHeight;

// Create camera with 75° field of view and fixed aspect ratio
const camera = new THREE.PerspectiveCamera( 75, targetAspect, 0.1, 1000 );

// Create WebGL renderer with transparent background and antialiasing
const renderer = new THREE.WebGLRenderer({ 
  alpha: true,
  antialias: true  // Enable antialiasing for smoother edges
});

// Set pixel ratio for high DPI displays (Retina, 4K, etc.)
renderer.setPixelRatio(window.devicePixelRatio);

// Function to resize renderer while maintaining target aspect ratio
function updateRendererSize() {
  const windowAspect = window.innerWidth / window.innerHeight;
  
  let width, height;
  if (windowAspect > targetAspect) {
    // Window is wider - fit to height
    height = window.innerHeight;
    width = height * targetAspect;
  } else {
    // Window is taller - fit to width
    width = window.innerWidth;
    height = width / targetAspect;
  }
  
  renderer.setSize(width, height);
  camera.aspect = targetAspect;
  camera.updateProjectionMatrix();
}

// Initialize renderer size and handle window resize events
updateRendererSize();
window.addEventListener('resize', updateRendererSize);

// Start animation loop and add canvas to page
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

// Set background to transparent black
renderer.setClearColor(0x000000, 0);

// Add ambient light for overall scene illumination (60% brightness)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Add directional light to simulate sunlight
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Add ground reference grid (1000x1000 units with gray colors)
const grid = new THREE.GridHelper(1000, 1000, 0x888888, 0x444444);
scene.add(grid);

// Position camera: X=0 (centered), Y=20 (height), Z=410 (distance back)
camera.position.set(0, 20, 410);
// Point camera at: X=0 (center), Y=30 (slightly up), Z=0 (forward)
camera.lookAt(0, 30, 0);

// Crop bottom 15% of view by shifting camera viewport
// Increase cropBottomPercent to crop more (0.0 = no crop, 0.5 = 50% crop)
const cropBottomPercent = 0.15;
camera.setViewOffset(
  targetWidth, 
  targetHeight, 
  0, 
  -targetHeight * cropBottomPercent, // Negative shifts view upward
  targetWidth, 
  targetHeight
);

// Animation loop - renders scene every frame
function animate() {
  renderer.render( scene, camera );
}

// Initialize GLTF model loader
const loader = new GLTFLoader();

/**
 * Load and position a GLTF/GLB 3D model in the scene
 * @param {string} url - Path to the model file
 * @param {THREE.Vector3} position - World position (x, y, z)
 * @param {number} scale - Uniform scale multiplier (1 = original size)
 * @param {number} rotationY - Y-axis rotation in radians (0 to Math.PI*2)
 */
function loadModel(url, position, scale = 1, rotationY = 0) {
  loader.load(url, (gltf) => {
    const model = gltf.scene;
    
    // Calculate model's bounding box in its original local space
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    
    // Center the model horizontally (X/Z) and align bottom to Y=0
    model.position.set(-center.x, -box.min.y, -center.z);
    
    // Wrap model in a group for easier transform control
    const group = new THREE.Group();
    group.add(model);
    
    // Apply transformations to the group
    group.scale.setScalar(scale);           // Uniform scale
    group.position.copy(position);           // World position
    group.rotation.y = rotationY;            // Y-axis rotation
    
    // Store metadata for reference
    group.userData.name = url.split('/').pop().replace('.gltf', '');
    group.userData.originalScale = scale;
    
    // Add to scene
    scene.add(group);
    
    // Log model info to console
    const finalBox = new THREE.Box3().setFromObject(group);
    console.log(`[GLTF] Loaded: ${url.split('/').pop()}`, { 
      worldPosition: group.position.clone(),
      scale,
      rotationY,
      size: finalBox.getSize(new THREE.Vector3())
    });
  });
}

// ============================================
// MODEL PLACEMENT
// Position format: new THREE.Vector3(x, y, z)
// Rotation format: Math.PI * multiplier (e.g., Math.PI / 2 = 90°)
// ============================================

// Tokyo Tower - centered at origin, larger scale
loadModel('/models/tokyo_tower/scene.gltf', new THREE.Vector3(0, 0, 0), 12);

// Office buildings arranged around the tower
loadModel('/models/anime_style_-_office_building/scene.gltf', new THREE.Vector3(10, 0, 60), 0.25, Math.PI * 1.9);
loadModel('/models/building_no_6_form_tokyo_otemachi_building_pack_gltf/scene.gltf', new THREE.Vector3(-5, 0, 40), 0.6);
loadModel('/models/building_no_19_form_tokyo_otemachi_building_pack_gltf/scene.gltf', new THREE.Vector3(-30, 0, 30), 0.5);
loadModel('/models/building_no_6_form_tokyo_otemachi_building_pack_gltf/scene.gltf', new THREE.Vector3(120, 0, 40), 0.6);
loadModel('/models/building_no_19_form_tokyo_otemachi_building_pack_gltf/scene.gltf', new THREE.Vector3(-180, 0, -80), 0.9);

// High-rise buildings scattered around
loadModel('/models/hi_rise_apartment_building/scene.gltf', new THREE.Vector3(100, 0, -10), 0.007);
loadModel('/models/high_rise_building_gltf/scene.gltf', new THREE.Vector3(60, 0, -10), 1);
loadModel('/models/le_millefiori/scene.gltf', new THREE.Vector3(-120, 0, -40), 0.02);

// Hotels with various rotations
loadModel('/models/marriott_hotel_3_wtc_gltf/scene.gltf', new THREE.Vector3(120, 0, -50), 0.4, Math.PI * 1.3);
loadModel('/models/marriott_hotel_3_wtc_gltf/scene.gltf', new THREE.Vector3(-130, 0, 30), 0.25, Math.PI / 3);

// Mori building
loadModel('/models/mori_building/MoriBuilding.glb', new THREE.Vector3(-90, 0, -80), 0.62, Math.PI / 3);

// Yacht in water area
loadModel('/models/yacht/scene.gltf', new THREE.Vector3(-5, 0, 340), 0.01, Math.PI * 1.3);

// Manhattan bridges on sides (elevated Y=20)
loadModel('/models/lowpoly_manhattan_bridge_gltf/scene.gltf', new THREE.Vector3(170, 20, 170), 0.57, Math.PI / 2);
loadModel('/models/lowpoly_manhattan_bridge_gltf/scene.gltf', new THREE.Vector3(-180, 20, 170), 0.57, Math.PI / 2);

// Island in the background (large scale)
loadModel('/models/isla_mocha_national_reserve/scene.gltf', new THREE.Vector3(170, 0, 280), 220, Math.PI / 4);
loadModel('/models/isla_mocha_national_reserve/scene.gltf', new THREE.Vector3(90, 0, 350), 100, Math.PI / 4);