# prototype-fps

浏览器里跑的第一人称射击原型：Three.js（WebGPURenderer，自动回退 WebGL2）+ @dimforge/rapier3d。

## 目标

8 周内做出可玩的一关：第一人称控制、三种武器切换、连击槽、一个灰盒关卡加 3 个敌人，3 分钟可玩闭环。见 `PROGRESS.md`。

## 快速开始

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 单元/集成测试
npm run build    # 生产构建
```

## 当前进度

- 任务 0（核验）：完成。three 0.187.0、rapier 0.21.0 安装确认；WebGPURenderer 与 WebGL2 回退均实测。
- 任务 1（第一人称控制）：PointerLockControls + WASD/冲刺/跳跃 + 碰撞与速度阻尼已实现，`build`/`test` 通过（8/8）。浏览器实测受指针锁定安全策略限制，需手动验证走跑跳。
- 4 个角色 GLB（text-to-3d 生成）在 `assets/`，通过 Git LFS 存储。

## 说明

- `assets/*.glb` 用 Git LFS 管理（单个约 18–21 MB，不进普通 git 对象库）。
- `BLOCKED.md` 记录未决问题；`PROGRESS.md` 记录进度。
