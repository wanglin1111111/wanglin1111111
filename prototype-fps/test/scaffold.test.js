import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('three 与 rapier 版本与任务书锁定一致', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.dependencies.three, '0.187.0');
  assert.equal(pkg.dependencies['@dimforge/rapier3d'], '0.21.0');
});

test('入口脚本引用 WebGPURenderer 并保留 WebGL2 回退路径', () => {
  const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(src, /from 'three\/webgpu'/);
  assert.match(src, /webgl2-fallback/);
});
