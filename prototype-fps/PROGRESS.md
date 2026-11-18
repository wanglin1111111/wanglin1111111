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
