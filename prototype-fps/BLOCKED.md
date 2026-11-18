# BLOCKED.md

## 待裁决清单

1. **图片上传到 Asset/OUS 失败（阻断四张人物图的图生 3D）**
   - 现象：`ous-cos.kujiale.com` 的 TLS 握手持续返回 `CRYPT_E_REVOCATION_OFFLINE`（证书吊销检查无法联网核验），`api.aholo3d.cn`（lux3d-cn MCP 本身）无此问题，证书签发链不同（DNSPod DV TLS RSA CA 2025）。
   - 已排查：系统时间显示正常但 `w32tm /query /status` 报 Leap 指示器未同步，上次成功同步在 19 小时前；`w32tm /resync /force` 需要管理员权限，当前权限被拒绝（0x80070005）；WinHTTP 无系统代理；重试 3 次持续失败，非偶发。
   - 未采取：关闭 TLS 吊销检查（`--ssl-no-revoke`）可绕过，但这会削弱证书验证，不在"只允许改动项目目录内文件"的授权范围内，也被系统权限策略拦截。
   - 需要领导：以管理员权限运行 `w32tm /resync /force`，或检查本机是否有安全软件/防火墙拦截 OCSP／CRL 查询，修复后我会重试上传与报价流程。

2. **text-to-3d 报价调用失败（阻断人物角色 3D 生成，改走文字描述路线后仍失败）**
   - 现象：`post_quotelux3dopenapirequests` 连续 4 次调用均返回 `Tool execution failed`，无错误正文；账户查询（`getlux3daccountbalance`）同期正常，`uniqueId` 未过期。已尝试完整计划格式、精简单条格式、最小化 prompt，结果一致。
   - 结论：非参数编码问题，可能是工具实现或服务端在当前请求下出错；无法在当前轮次定位根因。
   - 未采取：跳过报价直接创建、编造固定价格——按规则均不允许。
   - 需要领导：若需要继续排查，需要能看到工具调用的原始错误响应（当前只返回通用失败，没有错误码或消息）；或确认是否要换用 OpenAPI 直连方式代替 MCP 报价工具。

3. **构建产物 812KB 超过 500KB 警告阈值**
   - 现象：`npm run build` 成功，但 vite 提示单 chunk 812.97 kB，建议代码分割。
   - 处理：按原计划第 3 阶段做资产管线时一并处理动态 import／代码分割，不阻断当前骨架验收。

状态：无阻断性 bug（build 与 test 均通过）；上述第 1 条阻断的是人物图 3D 化任务，不阻断 prototype-fps 工程本身的任务 0／任务 1 推进。
