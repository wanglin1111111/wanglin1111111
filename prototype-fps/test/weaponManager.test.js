import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWeaponManager } from '../src/weaponManager.js';
import weapons from '../src/weapons.json' with { type: 'json' };

// 固定可控时钟：每次调用 +100ms，避免真实 performance.now() 干扰冷却断言。
function makeClock() {
  let t = 0;
  return { now: () => (t += 100) };
}

test('100 次随机切换：当前武器必为三选一，damage/swingRange 与 weapons.json 一致，lastSwingTime 非 undefined', () => {
  const { now } = makeClock();
  const wm = createWeaponManager(weapons, now);
  const names = ['shortSword', 'oneHandedSword', 'twoHandedSword'];

  for (let i = 0; i < 100; i++) {
    const pick = Math.floor(Math.random() * 3); // 0/1/2
    const key = String(pick + 1); // 映射 1/2/3
    wm.switchTo(key);

    assert.ok(names.includes(wm.currentKey), `第 ${i + 1} 次：currentKey 应为三选一，实际 ${wm.currentKey}`);
    const expected = weapons[names[pick]];
    assert.equal(wm.currentWeapon().damage, expected.damage, `第 ${i + 1} 次：damage 应与表一致（${expected.damage}）`);
    assert.equal(wm.currentWeapon().swingRange, expected.swingRange, `第 ${i + 1} 次：swingRange 应与表一致（${expected.swingRange}）`);
    assert.notEqual(wm.lastSwingTime, undefined, `第 ${i + 1} 次：lastSwingTime 不应为 undefined`);
  }
});

test('数值与表一致：短剑 damage=4、双手剑 damage=13（反向验证的判卷标准）', () => {
  assert.equal(weapons.shortSword.damage, 4, '短剑 damage 应为 4');
  assert.equal(weapons.twoHandedSword.damage, 13, '双手剑 damage 应为 13');
});

test('冷却期内挥击被拒绝，冷却结束后允许（短剑 cooldown=0.3s）', () => {
  const { now } = makeClock();
  const wm = createWeaponManager(weapons, now);
  assert.equal(wm.swing(), true, '首次挥击应成功');
  // 时钟每次 +100ms，仍在 300ms 冷却内：
  assert.equal(wm.swing(), false, '冷却期内（<0.3s）挥击应被拒绝');
  assert.equal(wm.swing(), false, '冷却期内（<0.3s）挥击仍应被拒绝');
  assert.equal(wm.swing(), true, '冷却结束（≥0.3s）后挥击应允许');
});

test('冷却期内切换武器被禁止，冷却结束后切换重置冷却计时（按任务书拍板：冷却期内禁止切换）', () => {
  const { now } = makeClock();
  const wm = createWeaponManager(weapons, now);
  assert.equal(wm.swing(), true, '首次挥击成功，进入短剑 0.3s 冷却');
  assert.equal(wm.switchTo('2'), false, '冷却期内（<0.3s）切换武器应被禁止');
  assert.equal(wm.currentKey, 'shortSword', '被禁止的切换不应改变当前武器');
  assert.equal(wm.switchTo('2'), false, '仍在冷却期内，再次尝试仍应被禁止');
  assert.equal(wm.switchTo('2'), true, '冷却结束（≥0.3s）后切换应成功');
  assert.equal(wm.currentKey, 'oneHandedSword');
  assert.equal(wm.lastSwingTime, null, '切换成功后冷却计时应重置，新武器可立即挥击');
});

test('无效按键不改变当前武器', () => {
  const { now } = makeClock();
  const wm = createWeaponManager(weapons, now);
  assert.equal(wm.switchTo('4'), false, '数字 4 不是有效武器键');
  assert.equal(wm.currentKey, 'shortSword');
});
