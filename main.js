import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 30, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 5, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

document.addEventListener('click', () => {
  controls.lock();
});

// Physics world
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
});

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const keyState = {};

document.addEventListener('keydown', (event) => {
  keyState[event.code] = true;
});

document.addEventListener('keyup', (event) => {
  keyState[event.code] = false;
});

// Grid helper
const gridHelper = new THREE.GridHelper(200, 50);
scene.add(gridHelper);

// Lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// Geometries
const geometries = [
  new THREE.BoxGeometry(),
  new THREE.SphereGeometry(0.7, 32, 32),
  new THREE.ConeGeometry(0.5, 1, 16),
  new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
  new THREE.TorusGeometry(0.5, 0.2, 16, 100),
];

// Store mesh + physics object
const objects = [];

for (let i = 0; i < 50; i++) {
  const geoIndex = Math.floor(Math.random() * geometries.length);
  const geo = geometries[geoIndex];
  const size = 0.5 + Math.random() * 1.5;

  const scaledGeo = geo.clone();
  scaledGeo.scale(size, size, size);

  const mat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
  const mesh = new THREE.Mesh(scaledGeo, mat);
  mesh.position.set(
    (Math.random() - 0.5) * 50,
    Math.random() * 10 + 5,
    (Math.random() - 0.5) * 50
  );
  scene.add(mesh);

  let shape;
  switch (geoIndex) {
    case 0: // Box
      shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
      break;
    case 1: // Sphere
      shape = new CANNON.Sphere(size * 0.7);
      break;
    case 2: // Cone (approx as Cylinder)
    case 3: // Cylinder
      shape = new CANNON.Cylinder(size * 0.5, size * 0.5, size, 16);
      break;
    case 4: // Torus – approximate as a box
      shape = new CANNON.Box(new CANNON.Vec3(size, size * 0.5, size));
      break;
    default:
      shape = new CANNON.Box(new CANNON.Vec3(size, size, size));
  }

  const body = new CANNON.Body({ mass: 1 });
  body.addShape(shape);
  body.position.copy(mesh.position);
  world.addBody(body);

  mesh.userData.rotationSpeed = new THREE.Vector3(
    Math.random() * 0.02,
    Math.random() * 0.02,
    Math.random() * 0.02
  );

  objects.push({ mesh, body });
}

// Ground (collision plane)
const groundMaterial = new CANNON.Material();
const groundBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: new CANNON.Plane(),
  material: groundMaterial,
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// Visible ground mesh
const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x111111, side: THREE.DoubleSide })
);
groundMesh.rotation.x = -Math.PI / 2;
scene.add(groundMesh);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Physics step
  world.step(1 / 60, delta);

  // Sync meshes to physics bodies
  objects.forEach(({ mesh, body }) => {
    mesh.position.copy(body.position);

    // Rotation solo visual
    mesh.rotation.x += mesh.userData.rotationSpeed.x;
    mesh.rotation.y += mesh.userData.rotationSpeed.y;
    mesh.rotation.z += mesh.userData.rotationSpeed.z;
  });

  // Movimiento FPS con teclado y mouse
  if (controls.isLocked) {
    direction.set(0, 0, 0);

    if (keyState['KeyW']) direction.z -= 1; // adelante
    if (keyState['KeyS']) direction.z += 1; // atrás
    if (keyState['KeyA']) direction.x -= 1; // izquierda
    if (keyState['KeyD']) direction.x += 1; // derecha

    direction.normalize();

    const moveSpeed = 10;
    velocity.copy(direction).multiplyScalar(moveSpeed * delta);

    // Movimiento local respecto a cámara
    controls.getObject().translateX(velocity.x);
    controls.getObject().translateZ(velocity.z);
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
