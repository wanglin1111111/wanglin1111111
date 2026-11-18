import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const MOVE_SPEED = 6;      // m/s，目标行走速度
const SPRINT_MULT = 1.8;   // 冲刺倍率
const JUMP_VELOCITY = 6;   // m/s
const GRAVITY = -18;       // m/s^2
const DAMPING = 10;        // 速度阻尼系数，越大松键停得越快
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.4; // 简化为圆柱碰撞半径，防止穿墙判定用

export function createPlayerController(camera, domElement, colliders = []) {
  const controls = new PointerLockControls(camera, domElement);

  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const input = { forward: false, back: false, left: false, right: false, sprint: false };
  let canJump = true;
  let grounded = true;

  function onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': input.forward = true; break;
      case 'KeyS': input.back = true; break;
      case 'KeyA': input.left = true; break;
      case 'KeyD': input.right = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': input.sprint = true; break;
      case 'Space':
        if (canJump && grounded) {
          velocity.y = JUMP_VELOCITY;
          canJump = false;
          grounded = false;
        }
        break;
    }
  }

  function onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': input.forward = false; break;
      case 'KeyS': input.back = false; break;
      case 'KeyA': input.left = false; break;
      case 'KeyD': input.right = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': input.sprint = false; break;
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // 圆柱与轴对齐包围盒（AABB）碰撞体做最小可行的穿墙检测
  function collidesAt(x, z) {
    for (const box of colliders) {
      const closestX = Math.max(box.min.x, Math.min(x, box.max.x));
      const closestZ = Math.max(box.min.z, Math.min(z, box.max.z));
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS) return true;
    }
    return false;
  }

  function update(delta) {
    // 水平阻尼：exp 衰减，帧率无关
    const damp = Math.exp(-DAMPING * delta);
    velocity.x *= damp;
    velocity.z *= damp;

    direction.z = Number(input.forward) - Number(input.back);
    direction.x = Number(input.right) - Number(input.left);
    direction.normalize();

    const speed = MOVE_SPEED * (input.sprint ? SPRINT_MULT : 1);
    if (input.forward || input.back) velocity.z -= direction.z * speed * delta * DAMPING;
    if (input.left || input.right) velocity.x -= direction.x * speed * delta * DAMPING;

    velocity.y += GRAVITY * delta;

    const object = controls.object;
    const prevX = object.position.x;
    const prevZ = object.position.z;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    if (collidesAt(object.position.x, object.position.z)) {
      object.position.x = prevX;
      object.position.z = prevZ;
      velocity.x = 0;
      velocity.z = 0;
    }

    object.position.y += velocity.y * delta;
    if (object.position.y <= PLAYER_HEIGHT) {
      object.position.y = PLAYER_HEIGHT;
      velocity.y = 0;
      canJump = true;
      grounded = true;
    }
  }

  function dispose() {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  }

  return { controls, update, dispose, input, velocity };
}
