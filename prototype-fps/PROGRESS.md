# PROGRESS.md

## 任务 0 开工回执（2026-11-18）

- 理解的目标：做一个浏览器里能跑的第一人称射击原型 prototype-fps，8 周内做成一关（第一人称控制、三武器切换、连击槽、灰盒关卡加 3 个敌人），3 分钟可玩闭环 + 缺陷清单。
- 顺序：任务 0 核验 → 任务 1 第一人称控制 → 任务 2 三武器 → 任务 3 连击槽 → 任务 4 灰盒与敌人 → 任务 5 闭环验收。
- 最大风险：图片上传被本机证书吊销检查阻断（见 BLOCKED.md 第 1 条），人物图 3D 化暂停；物理与 WebGPU 后处理兼容性待验证。

## 任务 0 实测结果

- three：0.187.0（npm 安装后 node_modules/three/package.json 实测）
- @dimforge/rapier3d：0.21.0（同上）
- WebGPURenderer：`three/webgpu` 入口存在，`exports` 映射 `./webgpu -> ./build/three.webgpu.js`；`npm run build` 通过（9 modules）。
- WebGL2 回退：已实测验证。正常环境下 HUD 显示 `backend=webgpu fps=121`；浏览器预览中临时移除 `navigator.gpu` 并重新加载入口模块后，HUD 显示 `backend=webgl2-fallback fps=120`，渲染持续运行，证明回退路径真实可用（非假绿灯）。
- 机制对照：三武器（双刃剑／单手剑／双手剑）与连击槽已在公开资料中核对（见上一轮 WebSearch），与任务书一致。

## 验收输出

- `npm run build`：成功，`dist/assets/index-*.js` 812.97 kB（超 500 kB 警告，已记入 BLOCKED.md 第 2 条）。
- `npm test`：`tests 2 / pass 2 / fail 0 / skipped 0 / todo 0`。

## 第二批任务（挥击内核＋三武器切换）开工回执（2026-11-18）

- 目标：在现有第一人称控制上加近战挥击内核（命中判定/后坐力/扩散/冷却）与三武器切换，砍木桩至血量 0 显示「已击败」。
- 前提核验（任务 0）：分支 prototype-fps；npm install OK；npm test 基线 8/8 全绿 skipped 0；npm run build 成功（817 kB 警告，非阻断）。
- 顺序：weapons.json → shooting.js（纯函数 hitTest＋场景接入木桩）→ weaponManager.js（1/2/3 切换＋冷却）→ 反向验证 → 浏览器手测 → 提交推送。
- 最大风险：hitTest 的判定阈值若先写断言再凑代码会违反「实算」规矩；浏览器手测受指针锁定安全策略限制，命中累加只能靠脚本模拟按键+自动锁定验证。
- 交付测试数目标：≥13，基线 8 条只增不减。

## 第三批任务（近战挥击内核＋三武器切换）实测结果（2026-11-18）

- 改动：src/weapons.json 加 postHp=30；新增 src/shooting.js（纯函数 hitTest/swingKick）、src/weaponManager.js（1/2/3 切换＋冷却，冷却期内禁止切换）、src/combat.js（战斗内核，拥有木桩血量/命中计数，不依赖渲染器）。
- 命中判定公式 dist <= swingRange + target.radius && angle <= spread，3 组实算值已固化进 test/shooting.test.js 断言。
- 砍 30 血木桩：短剑(damage 4)需 8 刀，双手剑(damage 13)需 3 刀（test/combat.test.js + 浏览器实测均确认）。
- 反向验证：临时把 shortSword.damage 改 0 → 「数值与表一致」测试变红（fail 1）；还原 4 → 全绿。报警器有效。
- 测试总数：基线 8 → 交付 20（skipped 0，fail 0，未删旧测试、未 .skip、未 || true）。
- 浏览器实测（window.__combat，真实 main.js 场景）：短剑 8 刀 defeated=true、双手剑 3 刀 defeated=true，hits 8>3，check 六项全 true。
- 渲染器在 0×0 隐藏预览窗口下 init 失败属环境现象（窗口太小），已让游戏逻辑不依赖渲染器初始化成功，不影响验收。

