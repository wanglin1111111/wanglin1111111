// 战斗内核：拥有木桩血量/命中计数，用 weaponManager + hitTest + weapons.json 驱动。
// 不依赖 THREE / 渲染器，浏览器与 Node 均可测。origin/dir/target 可注入（main.js 传实时相机，
// 测试用默认出生相机朝向：正前方齐眼高的木桩）。
import { hitTest } from './shooting.js';
import { createWeaponManager } from './weaponManager.js';
import weapons from './weapons.json' with { type: 'json' };

const DEFAULT_ORIGIN = () => ({ x: 0, y: 1.7, z: 5 });
const DEFAULT_DIR = () => ({ x: 0, y: 0, z: -1 });
const DEFAULT_TARGET = () => ({ position: { x: 0, y: 1.7, z: 3.5 }, radius: 0.5 });

export function createCombat({
  origin = DEFAULT_ORIGIN,
  dir = DEFAULT_DIR,
  target = DEFAULT_TARGET,
  now = () => performance.now(),
} = {}) {
  const weaponManager = createWeaponManager(weapons, now);
  let postHp = weapons.postHp;
  let hits = 0;
  let defeated = postHp <= 0;

  function swing() {
    if (defeated || !weaponManager.canSwing()) return { swung: false };
    weaponManager.swing();
    const weapon = weaponManager.currentWeapon();
    const r = hitTest(origin(), dir(), weapon, target());
    const result = {
      swung: true,
      key: weaponManager.currentKey,
      hit: r.hit,
      damage: weapon.damage,
    };
    if (r.hit) {
      postHp = Math.max(0, postHp - weapon.damage);
      hits += 1;
      defeated = postHp <= 0;
    }
    result.postHp = postHp;
    result.hits = hits;
    result.defeated = defeated;
    return result;
  }

  function reset() {
    postHp = weapons.postHp;
    hits = 0;
    defeated = false;
    weaponManager.reset();
  }

  function state() {
    return {
      weapon: weaponManager.currentKey,
      postHp,
      hits,
      defeated,
      canSwingNow: weaponManager.canSwing(),
    };
  }

  return {
    weapons,
    weaponManager,
    swing,
    switchTo: weaponManager.switchTo,
    reset,
    state,
  };
}
