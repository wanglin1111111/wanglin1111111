import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';

// 可控毫秒时钟：now() 读当前 ms；advanceMs(ms) 推进。避免真实 performance.now()。
function makeCombat() {
  let ms = 0;
  const c = createCombat({
    origin: () => ({ x: 0, y: 1.7, z: 5 }),
    dir: () => ({ x: 0, y: 0, z: -1 }),
    target: () => ({ position: { x: 0, y: 1.7, z: 3.5 }, radius: 0.5 }),
    now: () => ms,
  });
  const advanceMs = (m) => { ms += m; };
  return { c, advanceMs };
}

test('短剑砍 30 血木桩需 8 刀击败（damage 4），hits=8', () => {
  const { c, advanceMs } = makeCombat();
  let defeated = false;
  while (!defeated) {
    if (!c.state().canSwingNow) { advanceMs(310); continue; } // 短剑 cooldown 0.3s
    const r = c.swing();
    if (r.swung && r.hit) defeated = r.defeated;
  }
  const s = c.state();
  assert.equal(s.hits, 8, `短剑命中次数应为 8，实际 ${s.hits}`);
  assert.equal(s.postHp, 0);
  assert.equal(s.defeated, true);
});

test('双手剑砍 30 血木桩需 3 刀击败（damage 13），hits=3', () => {
  const { c, advanceMs } = makeCombat();
  c.switchTo('3');
  let defeated = false;
  while (!defeated) {
    if (!c.state().canSwingNow) { advanceMs(860); continue; } // 双手剑 cooldown 0.85s
    const r = c.swing();
    if (r.swung && r.hit) defeated = r.defeated;
  }
  const s = c.state();
  assert.equal(s.hits, 3, `双手剑命中次数应为 3，实际 ${s.hits}`);
  assert.equal(s.postHp, 0);
  assert.equal(s.defeated, true);
});

test('击败后 swing 不再计数（防作弊：hits 不应在 0 血后继续涨）', () => {
  const { c, advanceMs } = makeCombat();
  c.switchTo('3');
  for (let i = 0; i < 5; i++) { if (c.state().canSwingNow) c.swing(); else advanceMs(860); }
  const afterKill = c.state().hits;
  assert.equal(afterKill, 3, '双手剑 3 刀应已击败');
  for (let i = 0; i < 3; i++) { if (c.state().canSwingNow) c.swing(); else advanceMs(860); }
  assert.equal(c.state().hits, afterKill, '血量到 0 后 hits 不应再增加');
});
