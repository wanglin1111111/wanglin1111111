import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitTest, swingKick } from '../src/shooting.js';

// 数值来自任务书「现状」里手算的三组参考值，不重新推导、不凑代码。
// hit 判定公式：dist <= weapon.swingRange + target.radius && angle <= weapon.spread
const shortSword = { swingRange: 2.2, spread: 0.05, damage: 4 };

test('正前方命中：dist=1.5, angle=0 → hit=true', () => {
  const origin = { x: 0, y: 1.7, z: 5 };
  const dir = { x: 0, y: 0, z: -1 };
  const target = { position: { x: 0, y: 1.7, z: 3.5 }, radius: 0.5 };
  const r = hitTest(origin, dir, shortSword, target);
  assert.ok(Math.abs(r.distance - 1.5) < 1e-9, `distance 应为 1.5，实际 ${r.distance}`);
  assert.ok(r.angle < 1e-9, `angle 应为 0，实际 ${r.angle}`);
  assert.equal(r.hit, true);
});

test('距离内但角度外：dist=1.118, angle≈0.4636 → hit=false', () => {
  const origin = { x: 0, y: 1.7, z: 5 };
  const dir = { x: 0, y: 0, z: -1 };
  const target = { position: { x: 0.5, y: 1.7, z: 4 }, radius: 0.5 };
  const r = hitTest(origin, dir, shortSword, target);
  assert.ok(Math.abs(r.distance - 1.118) < 0.001, `distance 应为约 1.118，实际 ${r.distance}`);
  assert.ok(Math.abs(r.angle - 0.4636) < 0.001, `angle 应为约 0.4636，实际 ${r.angle}`);
  assert.equal(r.hit, false, '角度 0.4636 超出 spread 0.05，应判不中');
});

test('超距不中：dist=6.0 > swingRange+radius=2.7 → hit=false', () => {
  const origin = { x: 0, y: 1.7, z: 5 };
  const dir = { x: 0, y: 0, z: -1 };
  const target = { position: { x: 0, y: 1.7, z: -1 }, radius: 0.5 };
  const r = hitTest(origin, dir, shortSword, target);
  assert.ok(Math.abs(r.distance - 6.0) < 1e-9, `distance 应为 6.0，实际 ${r.distance}`);
  assert.equal(r.hit, false, '距离 6.0 超出 2.7，应判不中');
});

test('swingKick：后坐力上抬 + 随机角偏幅度 = weapon.spread', () => {
  const w = { spread: 0.12 };
  for (const seed of [0, 0.5, 1]) {
    const kick = swingKick(w, seed);
    assert.equal(kick.pitch, 0.06, `上抬应为 spread/2=0.06，实际 ${kick.pitch}`);
    assert.ok(Math.abs(kick.yaw) <= w.spread, `yaw 幅度不能超过 spread：${kick.yaw}`);
    assert.equal(kick.recoverSeconds, 0.3);
  }
  const leftEdge = swingKick(w, 0).yaw;
  const rightEdge = swingKick(w, 1).yaw;
  assert.ok(leftEdge < 0 && rightEdge > 0, 'seed=0/1 应分别对应负/正最大偏角');
});
