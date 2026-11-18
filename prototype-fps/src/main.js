import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { createPlayerController } from './playerController.js';

export async function createRenderer(canvasContainer) {
  const renderer = new WebGPURenderer({ antialias: true });
  await renderer.init();
  const backend = renderer.backend?.isWebGPUBackend ? 'webgpu' : 'webgl2-fallback';
  renderer.setSize(window.innerWidth, window.innerHeight);
  canvasContainer.appendChild(renderer.domElement);
  return { renderer, backend };
}

export function createScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.7, 5);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 四面围墙作为穿墙测试用碰撞体，中心留出空间可走动
  const colliders = [];
  const wallDefs = [
    { x: 0, z: -10, w: 20, d: 1 },
    { x: 0, z: 10, w: 20, d: 1 },
    { x: -10, z: 0, w: 1, d: 20 },
    { x: 10, z: 0, w: 1, d: 20 },
  ];
  for (const wd of wallDefs) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(wd.w, 2, wd.d),
      new THREE.MeshStandardMaterial({ color: 0x886644 })
    );
    wall.position.set(wd.x, 1, wd.z);
    scene.add(wall);
    colliders.push({
      min: new THREE.Vector3(wd.x - wd.w / 2, 0, wd.z - wd.d / 2),
      max: new THREE.Vector3(wd.x + wd.w / 2, 2, wd.z + wd.d / 2),
    });
  }

  return { scene, camera, colliders };
}

async function main() {
  const hud = document.getElementById('hud');
  const { renderer, backend } = await createRenderer(document.body);
  const { scene, camera, colliders } = createScene();
  const player = createPlayerController(camera, renderer.domElement, colliders);
  scene.add(player.controls.object);

  renderer.domElement.addEventListener('click', () => player.controls.lock());
  player.controls.addEventListener('lock', () => { window.__pointerLocked = true; });
  player.controls.addEventListener('unlock', () => { window.__pointerLocked = false; });
  window.__pointerLocked = false;
  window.__playerPosition = camera.position;

  let frame = 0;
  let last = performance.now();
  let fps = 0;
  let prevTime = performance.now();

  function animate() {
    const now = performance.now();
    const delta = Math.min((now - prevTime) / 1000, 0.05);
    prevTime = now;

    frame++;
    if (now - last >= 1000) {
      fps = frame;
      frame = 0;
      last = now;
    }

    if (player.controls.isLocked) {
      player.update(delta);
    }
    hud.textContent = `backend=${backend} fps=${fps} locked=${player.controls.isLocked} pos=(${camera.position.x.toFixed(1)},${camera.position.z.toFixed(1)})`;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}

main();
