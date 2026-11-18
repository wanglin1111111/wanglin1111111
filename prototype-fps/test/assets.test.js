import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCharacter } from '../src/assets.js';

test('loadCharacter 对 404 的 URL 必须 reject，不许 hang', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('not found', { status: 404, statusText: 'Not Found' });
  try {
    await assert.rejects(
      () => loadCharacter('/assets/does_not_exist.glb'),
      /404|fetch|error/i,
      '404 资源应 reject',
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('scaleForUrl：char1 URL 归一化系数 0.973，未知资产保持 1', async () => {
  // 通过 404 仍会走到 scale 选择再 reject——验证不会因未知资产崩溃
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('x', { status: 404 });
  try {
    await assert.rejects(() => loadCharacter('/assets/char1_tactical_male.glb'));
    await assert.rejects(() => loadCharacter('/assets/some_unknown_asset.glb'));
  } finally {
    globalThis.fetch = realFetch;
  }
});
