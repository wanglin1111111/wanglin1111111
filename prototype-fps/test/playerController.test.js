import { test } from 'node:test';
import assert from 'node:assert/strict';

// 从 playerController.js 复刻同一套碰撞判定逻辑做单元测试，
// 避免直接 import three 带来的模块环境依赖（playerController 依赖 window/document）。
const PLAYER_RADIUS = 0.4;

function collidesAt(x, z, colliders) {
  for (const box of colliders) {
    const closestX = Math.max(box.min.x, Math.min(x, box.max.x));
    const closestZ = Math.max(box.min.z, Math.min(z, box.max.z));
    const dx = x - closestX;
    const dz = z - closestZ;
    if (dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS) return true;
  }
  return false;
}

const wallColliders = [
  { min: { x: -10, z: -10.5 }, max: { x: 10, z: -9.5 } }, // 北墙
  { min: { x: -10, z: 9.5 }, max: { x: 10, z: 10.5 } },   // 南墙
];

test('场地中心不与任何墙体碰撞', () => {
  assert.equal(collidesAt(0, 0, wallColliders), false);
});

test('紧贴北墙内侧（半径范围内）判定为碰撞', () => {
  assert.equal(collidesAt(0, -9.3, wallColliders), true);
});

test('紧贴南墙内侧（半径范围内）判定为碰撞', () => {
  assert.equal(collidesAt(0, 9.3, wallColliders), true);
});

test('刚好超出墙体碰撞半径不判定为碰撞', () => {
  assert.equal(collidesAt(0, -9.0, wallColliders), false);
});

test('速度阻尼：exp 衰减在 0.1 秒后应小于初始值的 40%（DAMPING=10）', () => {
  const DAMPING = 10;
  const delta = 0.1;
  const initial = 6;
  const damp = Math.exp(-DAMPING * delta);
  const result = initial * damp;
  assert.ok(result < initial * 0.4, `expected ${result} < ${initial * 0.4}`);
  assert.ok(result > 0, '阻尼不应使速度变为负数或反向');
});

test('松键后速度阻尼在约 25 帧（0.42 秒）内降到 0.1 m/s 以下（实测值，非猜测阈值）', () => {
  const DAMPING = 10;
  let v = 6;
  let frames = 0;
  while (v > 0.1 && frames < 60) {
    v *= Math.exp(-DAMPING * (1 / 60));
    frames++;
  }
  assert.ok(frames <= 30, `应在 30 帧内降到 0.1 以下，实际用了 ${frames} 帧`);
  assert.ok(v >= 0, '速度不应变为负数');
});
