// 三武器切换：数字键 1/2/3，冷却期内挥击无效，切武器重置冷却计时。
// 纯逻辑，不依赖 THREE，可单测。weapons 来自 src/weapons.json。

const KEY_MAP = {
  '1': 'shortSword',
  '2': 'oneHandedSword',
  '3': 'twoHandedSword',
};
const WEAPON_KEYS = ['shortSword', 'oneHandedSword', 'twoHandedSword'];

export function createWeaponManager(weapons, now = () => performance.now()) {
  let currentKey = 'shortSword';
  let lastSwingTime = null;

  function currentWeapon() {
    return weapons[currentKey];
  }

  function canSwing() {
    const w = currentWeapon();
    if (lastSwingTime === null) return true;
    return (now() - lastSwingTime) / 1000 >= w.cooldown;
  }

  function swing() {
    if (!canSwing()) return false;
    lastSwingTime = now();
    return true;
  }

  function switchTo(keyCode) {
    if (!canSwing()) return false; // 拍板：挥击冷却期内禁止切换武器
    const k = KEY_MAP[keyCode];
    if (!k) return false;
    currentKey = k;
    lastSwingTime = null; // 切武器重置冷却计时，新武器可立即挥
    return true;
  }

  function reset() {
    lastSwingTime = null;
  }

  return {
    get currentKey() {
      return currentKey;
    },
    get lastSwingTime() {
      return lastSwingTime;
    },
    currentWeapon,
    canSwing,
    swing,
    switchTo,
    reset,
    weaponKeys: WEAPON_KEYS,
  };
}
