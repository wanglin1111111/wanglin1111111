// 近战挥击内核：纯函数，不依赖 THREE，可单测。
// origin/dir/position 均为 {x,y,z} 普通对象。

export function hitTest(origin, dir, weapon, target) {
  const vx = target.position.x - origin.x;
  const vy = target.position.y - origin.y;
  const vz = target.position.z - origin.z;
  const dist = Math.hypot(vx, vy, vz);
  if (dist === 0) return { hit: true, distance: 0, angle: 0 };

  const len = Math.hypot(dir.x, dir.y, dir.z);
  const cos = (dir.x * vx + dir.y * vy + dir.z * vz) / (len * dist);
  const angle = Math.acos(Math.max(-1, Math.min(1, cos)));

  const hit = dist <= weapon.swingRange + target.radius && angle <= weapon.spread;
  return { hit, distance: dist, angle };
}

// 命中后准星上抬 + 随机角偏（幅度 = weapon.spread），返回应施加的相机旋转增量（弧度）。
// 用确定性 seed 便于单测；生产里传 Math.random() 的当前值。
export function swingKick(weapon, seed = 0) {
  const spread = weapon.spread;
  const yaw = (seed - 0.5) * 2 * spread; // seed∈[0,1] → yaw ∈ [-spread, +spread]
  const pitchUp = spread * 0.5;
  return { yaw, pitch: pitchUp, recoverSeconds: 0.3 };
}
