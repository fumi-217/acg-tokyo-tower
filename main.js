// Import Three.js library and necessary modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {Water} from 'three/addons/objects/Water.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// Create the 3D scene
const scene = new THREE.Scene();

// Set fixed aspect ratio for consistent display across devices
// Adjust these values to change the canvas dimensions
const targetWidth = 1440;
const targetHeight = 2560;
const targetAspect = targetWidth / targetHeight;

// Create camera with 75° field of view and fixed aspect ratio
const camera = new THREE.PerspectiveCamera( 75, targetAspect, 0.1, 1500 );

// Create WebGL renderer with transparent background and antialiasing
const renderer = new THREE.WebGLRenderer({ 
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
renderer.setClearColor(0x000000, 1);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

//shadow
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;


// IBL / Environment 
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

let envMap = null;
const lighting = { ibl: 1.2 }; 

new RGBELoader()
  .setPath('/hdr/')
  .load('kloofendal_48d_partly_cloudy_puresky_4k.hdr', (hdrTex) => {
    envMap = pmrem.fromEquirectangular(hdrTex).texture;
    hdrTex.dispose();

    scene.environment = envMap;

    // Keep pmrem if you may load another HDR later; otherwise disposing is fine
    // pmrem.dispose();
  }, undefined, (err) => {
    console.error('HDR load failed:', err);
  });

function applyIBLIntensity(intensity) {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
        m.envMapIntensity = intensity;
        m.needsUpdate = true;
      }
    }
  });
}



// Add ambient light for overall scene illumination (18% brightness)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.18);
scene.add(ambientLight);

// Add directional light to simulate sunlight
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);
directionalLight.target.position.set(0,0,0);
scene.add(directionalLight.target);
//castshadow
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.bias = -0.0003;
//shadow camera frustum
const d = 600; // range
directionalLight.shadow.camera.left   = -d;
directionalLight.shadow.camera.right  =  d;
directionalLight.shadow.camera.top    =  d;
directionalLight.shadow.camera.bottom = -d;

directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far  = 2500;

directionalLight.shadow.normalBias = 0.02;


//hemispherelight
const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 0.0);
scene.add(hemi);


//Sky (Day/Sunset/Night)
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 8;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;

const sun = new THREE.Vector3();

function createSunSprite() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const g = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );

  g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  g.addColorStop(0.3, 'rgba(255,240,200,0.95)');
  g.addColorStop(0.6, 'rgba(255,200,120,0.5)');
  g.addColorStop(1.0, 'rgba(255,180,80,0.0)');

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(100, 100, 1); 
  sprite.renderOrder = 1000;

  return sprite;
}
const sunSprite = createSunSprite();
scene.add(sunSprite);


function setSunByElevationAzimuth(elevationDeg, azimuthDeg){
  const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
  const theta = THREE.MathUtils.degToRad(azimuthDeg);

  sun.setFromSphericalCoords(1, phi, theta);
  skyUniforms['sunPosition'].value.copy(sun);

  directionalLight.position.copy(sun).multiplyScalar(1000);
  directionalLight.target.position.set(0,0,0);
  directionalLight.target.updateMatrixWorld();
}


//ocean

const waterY = 0;         
const waterWidth = 1600;    
const waterDepth = 1200;    
const waterCenterZ = 520;   
const clock = new THREE.Clock();
const waveDir = new THREE.Vector2(0.9, 0.35).normalize(); 
const waveSpeed = 0.03; 


const waterGeometry = new THREE.PlaneGeometry(waterWidth, waterDepth);

const waterNormals = new THREE.TextureLoader().load('/textures/Water_1_M_Normal.jpg', (tex) => {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);      
  tex.offset.set(0, 0);      

  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
});



const water = new Water(waterGeometry, {
  textureWidth: 1024,
  textureHeight: 1024,
  waterNormals,
  sunDirection: directionalLight.position.clone().normalize(),
  sunColor: 0xffffff,
  waterColor: 0x0b4ea2,
  distortionScale: 3.7,
  alpha: 1.0, 

  fog: scene.fog !== undefined
});

water.rotation.x = -Math.PI / 2;
water.position.set(0, waterY, waterCenterZ);


scene.add(water);

//Stars at Night
function makeStarSpriteTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const g = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.15)');
  g.addColorStop(1.0, 'rgba(255,255,255,0.0)');

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const STAR_SPRITE = makeStarSpriteTexture();


let stars = null;

function ensureStars(){
  if (stars) return stars;

  const geo = new THREE.BufferGeometry();
  const count = 800;

  const pos = new Float32Array(count * 3);
  const sizes = new Float32Array(count);   
  const alphas = new Float32Array(count);  
  const seeds = new Float32Array(count);


  for (let i = 0; i < count; i++){
    const u = Math.random();
    const v = Math.random();

    const theta = 2 * Math.PI * u;
    const cosPhi = v;                 
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);

    const x = Math.cos(theta) * sinPhi;
    const y = cosPhi;                 
    const z = Math.sin(theta) * sinPhi;

    const radius = 900;

    pos[i*3+0] = x * radius;
    pos[i*3+1] = y * radius;
    pos[i*3+2] = z * radius;

    
    const r = Math.random();
    sizes[i] = THREE.MathUtils.lerp(1.0, 2.5, Math.pow(Math.random(), 3.0));


   
    alphas[i] = THREE.MathUtils.lerp(0.2, 1.0, Math.random());

    seeds[i] = Math.random() * 1000.0; 

  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));


  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: STAR_SPRITE },
      uOpacity: { value: 0.0 },       
      uPixelRatio: { value: renderer.getPixelRatio() },
      uTime: { value: 0.0 },
      uTwinkle: { value: 0.9 },
    },
    vertexShader: `
      precision highp float;

      attribute float aSize;
      attribute float aAlpha;
      attribute float aSeed;

      varying float vAlpha;
      varying float vSeed;
      uniform float uPixelRatio;

      void main(){
        vAlpha = aAlpha;
        vSeed = aSeed;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      
        gl_PointSize = aSize * uPixelRatio * 2.0;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uTwinkle;

      varying float vAlpha;
      varying float vSeed;

      float hash(float n){ return fract(sin(n)*43758.5453123); }

      void main(){
        vec4 tex = texture2D(uMap, gl_PointCoord);

  
        float bright = smoothstep(0.35, 1.0, vAlpha);

  
        float freq = mix(0.6, 2.2, hash(vSeed + 3.1));
        float phase = vSeed * 10.0;

 
        float tw = 0.5 + 0.5 * sin(uTime * freq + phase);

  
        float amp = uTwinkle * (0.05 + 0.55 * bright);

        float alpha = tex.a * vAlpha * uOpacity * (1.0 - amp + amp * tw);

        gl_FragColor = vec4(tex.rgb, alpha);
      } 
    `,
  });

  stars = new THREE.Points(geo, mat);
  stars.frustumCulled = false;
  scene.add(stars);
  return stars;
}

//ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(4000, 4000),
  new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0, metalness: 0.0 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, 0.01, 0);      
ground.scale.set(1, 1, 1);            
ground.receiveShadow = true;
scene.add(ground);


const current = {
  exposure: 0.65,
  amb: 0.35,
  sunInt: 0.8,
  sunColor: new THREE.Color(0xffffff),
  turbidity: 6,
  rayleigh: 2.0,
  mieC: 0.0025,
  mieG: 0.78,
  elev: 45,
  azim: 180,
  stars: 0.0,
  hemiInt: 0.0,
  hemiSky: new THREE.Color(0xffffff),
  hemiGround: new THREE.Color(0x202020),

  fogDensity: 0.0,
  fogColor: new THREE.Color(0x000000),

  sunKelvin: 6500, // day default
};

let transition = null; // { from, to, t0, dur }

const towerLightState = { cur: 0.0 };

const towerLight = new THREE.PointLight(0xffc08a, 0.0, 600, 1.0);
towerLight.position.set(0, 140, 0);   
scene.add(towerLight);


function startTransition(to, duration = 2.0) {
  transition = {
    from: {
      ...current,
      sunColor: current.sunColor.clone(),
      hemiSky: current.hemiSky.clone(),
      hemiGround: current.hemiGround.clone(),
      fogColor: current.fogColor.clone(),
    },
    to: {
      ...to,
      
      hemiSky: (to.hemiSky ?? current.hemiSky).clone(),
      hemiGround: (to.hemiGround ?? current.hemiGround).clone(),
      fogColor: (to.fogColor ?? current.fogColor).clone(),

      hemiInt: to.hemiInt ?? current.hemiInt,
      fogDensity: to.fogDensity ?? current.fogDensity,

      sunKelvin: to.sunKelvin ?? current.sunKelvin,
    },
    t0: performance.now(),
    dur: duration * 1000,
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(t) { return t * t * (3 - 2 * t); }
function kelvinToRGB(k) {
  // Approximation: good enough for 1000K–40000K
  k = THREE.MathUtils.clamp(k, 1000, 40000) / 100;

  let r, g, b;

  // Red
  if (k <= 66) r = 255;
  else r = 329.698727446 * Math.pow(k - 60, -0.1332047592);

  // Green
  if (k <= 66) g = 99.4708025861 * Math.log(k) - 161.1195681661;
  else g = 288.1221695283 * Math.pow(k - 60, -0.0755148492);

  // Blue
  if (k >= 66) b = 255;
  else if (k <= 19) b = 0;
  else b = 138.5177312231 * Math.log(k - 10) - 305.0447927307;

  r = THREE.MathUtils.clamp(r, 0, 255);
  g = THREE.MathUtils.clamp(g, 0, 255);
  b = THREE.MathUtils.clamp(b, 0, 255);

  return new THREE.Color(r / 255, g / 255, b / 255);
}


function setTimeOfDay(mode) {
  if (mode === 'sunset') {
    startTransition({
      exposure: 0.25,
      amb: 0.1,
      sunInt: 0.60,
      sunKelvin: 3200,

      turbidity: 10,
      rayleigh: 2.2,
      mieC: 0.010,
      mieG: 0.90,

      elev: 3.0,
      azim: 170,

      hemiInt: 0.55,
      hemiSky: new THREE.Color(0xffc3a0),
      hemiGround: new THREE.Color(0x0b1020),

      fogDensity:0.00035,
      fogColor:new THREE.Color(0x142033),

      stars: 0.0,
    }, 2.5); 
    lighting.ibl = 0.25;
  }

  if (mode === 'day') {
    startTransition({
      exposure: 0.3,
      amb: 0.18,
      sunInt: 3.0,
      sunKelvin: 6500,

      turbidity: 6,
      rayleigh: 3.0,
      mieC: 0.0025,
      mieG: 0.78,

      elev: 55,
      azim: 0,

      fogDensity: 0.00008,
      fogColor: new THREE.Color(0xb8d2f0),
      
      hemiInt:0.35,
      hemiSky: new THREE.Color(0xcfe8ff),
      hemiGround: new THREE.Color(0x2a2a2a),

      stars: 0.0,
    }, 2.0);
    lighting.ibl = 0.55;
  }

  if (mode === 'night') {
    startTransition({
      exposure: 0.22,   
      amb: 0.05,        
      sunInt: 0.08,     
      sunKelvin: 9000,  
      turbidity: 1.2,
      rayleigh: 0.02,
      mieC: 0.0002,
      mieG: 0.7,
      elev: -25,
      azim: 180,
      hemiInt: 0.08,                 
      hemiSky: new THREE.Color(0x6a88ff),    
      hemiGround: new THREE.Color(0x090b12), 
      stars: 1.0,
      fogDensity: 0.0008,
      fogColor: new THREE.Color(0x0b1020),
    }, 3.0);

  
    lighting.ibl = 0.03;  
  }
}


//default
setTimeOfDay('day');

//HotKeys 1/2/3
window.addEventListener('keydown', (e) => {
  if (e.key === '1') setTimeOfDay('day');
  if (e.key === '2') setTimeOfDay('sunset');
  if (e.key === '3') setTimeOfDay('night');
});

// Add ground reference grid (1000x1000 units with gray colors)
const grid = new THREE.GridHelper(1000, 1000, 0x888888, 0x444444);
scene.add(grid);
grid.visible = false;

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
  updateSkyAndLights();
  renderer.render( scene, camera );
}
function updateSkyAndLights() {
  if (envMap) scene.environment = envMap;

  if (transition) {
    const now = performance.now();
    let t = (now - transition.t0) / transition.dur;
    if (t >= 1) { t = 1; }
    t = smoothstep(t);

    const a = transition.from;
    const b = transition.to;

    current.exposure = lerp(a.exposure, b.exposure, t);
    current.amb      = lerp(a.amb, b.amb, t);
    current.sunInt   = lerp(a.sunInt, b.sunInt, t);

    current.turbidity = lerp(a.turbidity, b.turbidity, t);
    current.rayleigh  = lerp(a.rayleigh, b.rayleigh, t);
    current.mieC      = lerp(a.mieC, b.mieC, t);
    current.mieG      = lerp(a.mieG, b.mieG, t);

    current.elev = lerp(a.elev, b.elev, t);
    current.azim = lerp(a.azim, b.azim, t);

    current.sunKelvin = lerp(a.sunKelvin ?? 6500, b.sunKelvin ?? 6500, t);


    const elev01 = THREE.MathUtils.clamp((current.elev + 5) / 25, 0, 1); 
    const warmBias = 1.0 - elev01; 
    const biasedKelvin = current.sunKelvin * (1.0 - 0.35 * warmBias); 

    current.sunColor.copy(kelvinToRGB(biasedKelvin));


    current.stars = lerp(a.stars, b.stars, t);

    current.hemiInt = lerp(a.hemiInt, b.hemiInt, t);
    current.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, t);
    current.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, t);

    current.fogDensity = lerp(a.fogDensity, b.fogDensity, t);
    current.fogColor.copy(a.fogColor).lerp(b.fogColor, t);


    if (t === 1) transition = null;
  }

  // apply to renderer/lights/sky
  renderer.toneMappingExposure = current.exposure;

  ambientLight.intensity = current.amb;
  directionalLight.intensity = current.sunInt;
  directionalLight.color.copy(current.sunColor);
  {
    const elev01 = THREE.MathUtils.clamp((current.elev + 5) / 25, 0, 1);
    const sunsetTint = new THREE.Color(1.0, 0.78, 0.58);
    const tintStrength = (1.0 - elev01) * 0.35; // tweak 0.25~0.5
    directionalLight.color.lerp(sunsetTint, tintStrength);
  }
  

  // Hemisphere light (sky fill)
  hemi.intensity = current.hemiInt;
  hemi.color.copy(current.hemiSky);
  hemi.groundColor.copy(current.hemiGround);

  // Fog for distance falloff (smooth!)
  if (current.fogDensity > 0) {
    scene.fog = new THREE.FogExp2(current.fogColor.getHex(), current.fogDensity);
  } else {
    scene.fog = null;
  }

  skyUniforms['turbidity'].value = current.turbidity;
  skyUniforms['rayleigh'].value = current.rayleigh;
  skyUniforms['mieCoefficient'].value = current.mieC;
  skyUniforms['mieDirectionalG'].value = current.mieG;


  setSunByElevationAzimuth(current.elev, current.azim);
 
  
  const sunDist = 1200; 
  sunSprite.position.copy(camera.position).addScaledVector(sun, sunDist);
  sunSprite.quaternion.copy(camera.quaternion);
  sunSprite.material.opacity = THREE.MathUtils.clamp(current.sunInt * 1.2, 0.0, 1.0);

  const delta = clock.getDelta();
  if(water){
    

    water.material.uniforms['time'].value += delta * 0.10;


    waterNormals.offset.x += waveDir.x * waveSpeed * delta;
    waterNormals.offset.y += waveDir.y * waveSpeed * delta;

    water.material.uniforms['sunDirection'].value.copy(sun).normalize();
    water.material.uniforms['sunColor'].value.copy(directionalLight.color);

  }
  const s = ensureStars();
  if (s) {
    s.material.uniforms.uOpacity.value = current.stars;
    s.material.uniforms.uTime.value = performance.now() * 0.001; 
  }
  if (stars) stars.position.copy(camera.position);
  applyIBLIntensity(lighting.ibl);
  // ---- target intensity  ----
  const towerTarget =
    current.stars > 0.5 ? 0.55 :   // night
    current.elev < 6.0  ? 0.30 :   // sunset
                          0.00;    // day

  // ---- smooth follow  ----                
  const speed = 2.2;                          
  const k = 1.0 - Math.exp(-speed * delta);       
  towerLightState.cur += (towerTarget - towerLightState.cur) * k;

  // ---- apply to tower ----
  scene.traverse((o) => {
    if (!o.isGroup || !o.userData.isTokyoTower) return;

    o.traverse((msh) => {
      if (!msh.isMesh) return;
      const mats = Array.isArray(msh.material) ? msh.material : [msh.material];

      for (const mat of mats) {
        if (!mat || !mat.emissive) continue;
        const towerOpacity = 1.0;
        const shaped = Math.pow(THREE.MathUtils.clamp(towerLightState.cur, 0, 1),2.0);
        mat.emissiveIntensity = shaped * towerOpacity;

      }
    });
  });
  const g = Math.pow(THREE.MathUtils.clamp(towerLightState.cur, 0, 1), 2.2);
  const glowOpacity = THREE.MathUtils.clamp(g * 0.18, 0.0, 0.18);

  scene.traverse((o) => {
    if (!o.isGroup || !o.userData.isTokyoTower) return;

    const glow = o.userData.towerGlow;
    if (glow) glow.material.opacity = glowOpacity;
  });
  const maxPoint =
    current.stars > 0.5 ? 1.0 :
    current.elev < 6.0  ? 0.5 :
                          0.0;

  towerLight.intensity = towerLightState.cur * maxPoint;

  scene.traverse((o) => {
    if (!o.isGroup || !o.userData.isTokyoTower) return;
    const glow = o.userData.towerGlow;
    if (glow) glow.quaternion.copy(camera.quaternion);
  });


}



/**
 * Load and position a GLTF/GLB 3D model in the scene
 * @param {string} url - Path to the model file
 * @param {THREE.Vector3} position - World position (x, y, z)
 * @param {number} scale - Uniform scale multiplier (1 = original size)
 * @param {number} rotationY - Y-axis rotation in radians (0 to Math.PI*2)
 */
function baseDirFromUrl(url) {
  return url.slice(0, url.lastIndexOf('/') + 1);
}

function loadModel(url, position, scale = 1, rotationY = 0) {
  const baseDir = baseDirFromUrl(url);

  const manager = new THREE.LoadingManager();

  // ---------- log helpers ----------
  const logGroup = (title, fn) => {
    console.groupCollapsed(title);
    try { fn?.(); } finally { console.groupEnd(); }
  };

  manager.onError = (u) => {
    console.error(
      `[LoadingManager] failed\n` +
      `  url: ${u}\n` +
      `  baseDir: ${baseDir}`
    );
  };

  // ---------- URL modifier ----------
  manager.setURLModifier((requestedURL) => {
    // Allow embedded and remote resources
    if (/^(data:|blob:|https?:)/i.test(requestedURL)) {
      return requestedURL;
    }

    // Allow absolute paths
    if (requestedURL.startsWith('/')) {
      return requestedURL;
    }

    // Resolve relative paths against model directory
    const fixed = baseDir + requestedURL;

    logGroup(`[URLModifier] ${url.split('/').pop()}`, () => {
      console.log(`requested:\n  ${requestedURL}`);
      console.log(`resolved:\n  ${fixed}`);
    });

    return fixed;
  });

  const loader = new GLTFLoader(manager);
  loader.setResourcePath(baseDir);

  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;

      // ---------- texture inspection ----------
      const textureSlots = [
        'map',
        'normalMap',
        'roughnessMap',
        'metalnessMap',
        'aoMap',
        'emissiveMap',
        'alphaMap'
      ];

      logGroup(`[GLTF] Material inspection\n  ${url}`, () => {
        model.traverse((o) => {
          if (!o.isMesh) return;

          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];

          materials.forEach((m, i) => {
            if (!m) return;

            const usedSlots = textureSlots.filter(k => !!m[k]);
            const hasExtensions =
              m.userData &&
              m.userData.gltfExtensions &&
              Object.keys(m.userData.gltfExtensions).length > 0;

            if (usedSlots.length === 0 && !hasExtensions) {
              console.log(
                `[NO TEX] ${o.name} (mat ${i}) ${m.type}`
              );
            } else {
              console.log(
                `[TEX OK] ${o.name} (mat ${i}) ${m.type}\n` +
                `  slots: ${usedSlots.length ? usedSlots.join(', ') : '(none)'}\n` +
                `  extensions: ${hasExtensions
                  ? Object.keys(m.userData.gltfExtensions).join(', ')
                  : '(none)'}`
              );
            }
          });
        });
      });

      // ---------- glTF metadata ----------
      const usedExt = gltf.parser.json.extensionsUsed || [];
      if (usedExt.includes('KHR_materials_pbrSpecularGlossiness')) {
        console.warn(
          `[SpecGloss model]\n` +
          `  url: ${url}\n` +
          `  extensionsUsed: ${usedExt.join(', ')}`
        );
      }

      const images = gltf.parser.json.images || [];
      console.log(
        `[IMAGES]\n` +
        `  url: ${url}\n` +
        `  images:\n` +
        `  ${images.length ? images.map(i => i.uri).join('\n  ') : '(none)'}`
      );

      // ---------- centering and placement ----------
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());

      model.position.set(-center.x, -box.min.y, -center.z);

      const group = new THREE.Group();
      group.add(model);

      group.scale.setScalar(scale);
      group.position.copy(position);
      group.rotation.y = rotationY;

      model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
      });
      if (url.includes('/models/tokyo_tower/')) {
        model.traverse((o) => {
          if (!o.isMesh) return;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            if (!m || !(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) continue;

            
            m.emissive = new THREE.Color(0xffb36b);
            m.emissiveIntensity = 0.0; 
            m.needsUpdate = true;
          }
        });
        const glow = createSunSprite();               
        glow.scale.set(220, 220, 1);                  
        glow.material.depthWrite = false;
        glow.material.opacity = 0.0;                  
        glow.renderOrder = 999;
        group.add(glow);
        glow.position.set(0, 120, 0);   
        glow.material.depthTest = false; 
        glow.renderOrder = 9999;

        group.userData.towerGlow = glow;             
        group.userData.isTokyoTower = true;
      }

    

      group.userData.name = url.split('/').pop();
      group.userData.originalScale = scale;

      // Apply one-time material fixes
      model.traverse((o) => {
        if (!o.isMesh) return;
        const materials = Array.isArray(o.material) ? o.material : [o.material];

        for (const m of materials) {
          if (!m) continue;

          // BaseColor maps should be sRGB
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;

          // Normal/ORM maps should stay linear (default is fine)
          // if (m.normalMap) m.normalMap.colorSpace = THREE.NoColorSpace;

          // Environment intensity for PBR materials
          if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
            m.envMapIntensity = lighting.ibl;
          }

          m.needsUpdate = true;
        }
      });

      // Model-specific fixes
      if (url.includes('/models/le_millefiori/')) {
        // SpecGloss-converted materials often need a boost
        model.traverse((o) => {
          if (!o.isMesh) return;
          const materials = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of materials) {
            if (!m) continue;
            if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
              m.envMapIntensity = Math.max(m.envMapIntensity ?? 1.0, 1.6);
              // Optional: reduce roughness slightly if it looks too flat
              // m.roughness = Math.min(m.roughness ?? 1.0, 0.85);
              m.needsUpdate = true;
            }
          }
        });
      }

      if (url.includes('/models/mori_building/')) {
        // Mori GLB may look dull if exposure is low; keep textures correct and boost env a bit
        model.traverse((o) => {
          if (!o.isMesh) return;
          const materials = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of materials) {
            if (!m) continue;
            if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
            if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
              m.envMapIntensity = Math.max(m.envMapIntensity ?? 1.0, 1.4);
              m.needsUpdate = true;
            }
          }
        });
      }


      scene.add(group);

      const finalBox = new THREE.Box3().setFromObject(group);
      console.log(`[GLTF] Loaded ${group.userData.name}`, {
        position: group.position.clone(),
        scale,
        rotationY,
        size: finalBox.getSize(new THREE.Vector3())
      });
    },
    undefined,
    (err) => {
      console.error(
        `[GLTFLoader] load failed\n` +
        `  url: ${url}`,
        err
      );
    }
  );
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
loadModel('/models/le_millefiori/scene_mr.gltf', new THREE.Vector3(-120, 0, -40), 0.02);


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
