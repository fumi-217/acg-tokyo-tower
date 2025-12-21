import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

renderer.setClearColor(0x000000, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

camera.position.set(0, 2, 8);
camera.lookAt(0, 0, 0);

function animate() {
  renderer.render( scene, camera );
}

const loader = new GLTFLoader();

function loadModel(url, position, scale = 1) {
  loader.load(url, (gltf) => {
    const model = gltf.scene;
    model.position.copy(position);
    model.scale.setScalar(scale);
    scene.add(model);
  });
}

loadModel('./models/tokyo_tower/scene.gltf', new THREE.Vector3(0, 0, 0), 0.8);