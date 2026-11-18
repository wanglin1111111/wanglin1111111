import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { PMREMGenerator, ACESFilmicToneMapping, PCFShadowMap, RenderPipeline } from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createPlayerController } from './playerController.js';
import { swingKick } from './shooting.js';
import { createCombat } from './combat.js';
import { loadCharacter } from './assets.js';

export async function createRenderer(canvasContainer) {
  const renderer = new WebGPURenderer({ antialias: true });
  await renderer.init();
  const backend = renderer.backend?.isWebGPUBackend ? 'webgpu' : 'webgl2-fallback';
  renderer.setSize(window.innerWidth, window.innerHeight);
  canvasContainer.appendChild(renderer.domElement);
  return { renderer, backend };
}

// 点亮渲染管线：IBL 环境光 + 实时阴影 + ACES 色调映射 + bloom 后处理。
// 后处理（RenderPipeline + TSL 节点）只在 webgpu 后端可用；webgl2-fallback 下降级为
// 直接渲染（保 IBL + 阴影），并置 pipelineEnabled=false 供 PROGRESS 记录。
export function setupLighting({ renderer, scene, camera, backend }) {
  // IBL：RoomEnvironment 生成 PMREM 环境贴图
  const pmrem = new PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envMap = pmrem.fromScene(roomEnv, 0.04).texture;
  scene.environment = envMap; // grep 锚点：scene.environment
  pmrem.dispose();
  roomEnv.dispose?.();

  // 色调映射（PBR 材质不发死白死黑）
  renderer.toneMapping = ACESFilmicToneMapping;

  // 实时阴影：方向光 PCFSoft 2048，范围收在场地内（40m 场地）
  const dirLight = scene.getObjectByName('keyLight') || new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.name = 'keyLight';
  dirLight.position.set(6, 12, 6);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  const cam = dirLight.shadow.camera;
  cam.left = -20; cam.right = 20; cam.top = 20; cam.bottom = -20;
  cam.near = 1; cam.far = 40;
  scene.remove(...scene.children.filter((c) => c.isDirectionalLight)); // 清掉旧光，避免双光源
  scene.add(dirLight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap; // r187 WebGPU 已移除 PCFSoftShadowMap

  // 后处理：bloom。仅 webgpu 走 RenderPipeline；fallback 直接渲染
  let pipeline = null;
  let pipelineEnabled = false;
  if (backend === 'webgpu') {
    try {
      pipeline = new RenderPipeline(renderer);
      const scenePass = pass(scene, camera);
      const sceneColor = scenePass.getTextureNode('output');
      const bloomPass = bloom(sceneColor, 0.35, 0.4, 0.85); // strength/radius/threshold
      pipeline.outputNode = sceneColor.add(bloomPass);
      pipelineEnabled = true;
    } catch (e) {
      // 后处理搭不起来：降级直接渲染，保 IBL + 阴影（任务书：不许硬撑出假绿）
      pipeline = null;
      pipelineEnabled = false;
      console.warn('[postfx] 节点后处理初始化失败，降级直接渲染：', e);
    }
  }

  return { dirLight, pipeline, pipelineEnabled, renderFrame: (scene, camera) => {
    if (pipeline) { pipeline.render(); } // renderer/scene/camera 已在构造时绑定
    else { renderer.render(scene, camera); }
  } };
}

export function createScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.7, 5);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.name = 'keyLight';
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 四面围墙作为穿墙测试用碰撞体，中心留出空间可走动
  const colliders = [];
  const wallDefs = [
    { x: 0, z: -10, w: 20, d: 1 },
    { x: 0, z: 10, w: 20, d: 1 },
    { x: -10, z: 0, w: 1, d: 20 },
    { x: 10, z: 0, w: 1, d: 20 },
  ];
  for (const wd of wallDefs) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(wd.w, 2, wd.d),
      new THREE.MeshStandardMaterial({ color: 0x886644 })
    );
    wall.position.set(wd.x, 1, wd.z);
    scene.add(wall);
    colliders.push({
      min: new THREE.Vector3(wd.x - wd.w / 2, 0, wd.z - wd.d / 2),
      max: new THREE.Vector3(wd.x + wd.w / 2, 2, wd.z + wd.d / 2),
    });
  }

  // 木桩：简单柱体，作为挥击目标；置于出生相机正前方、齐眼高，默认 -Z 朝向即可命中
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 2.4, 12),
    new THREE.MeshStandardMaterial({ color: 0xaa8855 })
  );
  post.position.set(0, 1.7, 3.5);
  scene.add(post);

  return { scene, camera, colliders, post };
}

async function main() {
  const hud = document.getElementById('hud');
  const { scene, camera, colliders, post } = createScene();

  // 战斗内核：注入实时相机朝向，木桩用场景中的柱体位置
  const postRadius = 0.5;
  function targetPlain() {
    return { position: { x: post.position.x, y: post.position.y, z: post.position.z }, radius: postRadius };
  }
  function cameraDir() {
    const d = new THREE.Vector3(0, 0, -1);
    d.applyQuaternion(camera.quaternion);
    return { x: d.x, y: d.y, z: d.z };
  }
  function cameraOrigin() {
    return { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  }
  const combat = createCombat({ origin: cameraOrigin, dir: cameraDir, target: targetPlain });

  // 脚本驱动接口（preview_eval 手测用，不依赖真实鼠标，也不依赖渲染器是否成功初始化）
  window.__combat = combat;
  window.__swing = () => combat.swing();
  window.__switchTo = (k) => combat.switchTo(k);
  window.__resetCombat = () => combat.reset();
  window.__getCombatState = () => combat.state();

  // 渲染器在 0x0 隐藏窗口下 init 会失败——不让它挡住游戏逻辑；失败时 HUD 标注 backend=none
  let renderer = null;
  let backend = 'none';
  let renderFrame = () => {};
  try {
    const r = await createRenderer(document.body);
    renderer = r.renderer;
    backend = r.backend;
    const lighting = setupLighting({ renderer, scene, camera, backend });
    renderFrame = lighting.renderFrame;
    window.__postfx = { enabled: lighting.pipelineEnabled, backend };
  } catch (e) {
    hud.textContent = 'renderer unavailable (window too small / no WebGPU): ' + (e && e.message ? e.message : e);
  }

  const player = createPlayerController(camera, document.body, colliders);
  scene.add(player.controls.object);
  let recoilLeft = 0;

  // 角色加载：char2/3/4 当静态敌人（间距 ≥8m，朝向出生点 (0,·,5)），char1 玩家侧展示道具。
  // 本批不做会动的敌人 AI（后续批次），只摆位 + PBR + 阴影。
  const characterPlacements = [
    { file: 'char2_moss_monster', x: -8, z: -4, enemy: true },
    { file: 'char3_fem_soldier', x: 8, z: -4, enemy: true },
    { file: 'char4_heavy_knight', x: 0, z: -9, enemy: true },
    { file: 'char1_tactical_male', x: 2.5, z: 3, enemy: false },
  ];
  const loadedChars = [];
  let charLoaded = 0;
  const loadAll = () =>
    Promise.allSettled(
      characterPlacements.map((p) =>
        loadCharacter(`assets/${p.file}.glb`).then((r) => ({ p, r })),
      ),
    ).then((results) => {
      for (const res of results) {
        if (res.status !== 'fulfilled') continue;
        const { p, r } = res.value;
        r.object.position.set(p.x, 0, p.z);
        // 敌人朝向出生点 (0, z=5)：朝 +Z 偏 x 方向
        if (p.enemy) {
          const target = new THREE.Vector3(0, 0, 5);
          r.object.lookAt(target);
        }
        scene.add(r.object);
        loadedChars.push(r);
        charLoaded += 1;
      }
    });
  loadAll();

  // 命中后后坐力：准星上抬 + 随机角偏，0.3s 内回正（帧率无关）
  function applyRecoil(weapon) {
    const kick = swingKick(weapon, Math.random());
    camera.rotation.z = kick.yaw;
    recoilLeft = kick.recoverSeconds;
  }
  function updateRecoil(delta) {
    if (recoilLeft <= 0) return;
    recoilLeft = Math.max(0, recoilLeft - delta);
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, Math.min(1, delta * 10));
    if (recoilLeft <= 0) camera.rotation.z = 0;
  }

  // 鼠标左键 = 挥击（锁定状态下）
  document.body.addEventListener('mousedown', (e) => {
    if (e.button === 0 && player.controls.isLocked) {
      const r = combat.swing();
      if (r.swung && r.hit) applyRecoil(combat.weaponManager.currentWeapon());
    }
  });

  // 数字键切换武器
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
      combat.switchTo(e.code.slice(5));
    }
  });

  document.body.addEventListener('click', () => player.controls.lock());
  player.controls.addEventListener('lock', () => { window.__pointerLocked = true; });
  player.controls.addEventListener('unlock', () => { window.__pointerLocked = false; });
  window.__pointerLocked = false;

  let frame = 0;
  let last = performance.now();
  let fps = 0;
  let prevTime = performance.now();

  function animate() {
    const now = performance.now();
    const delta = Math.min((now - prevTime) / 1000, 0.05);
    prevTime = now;

    frame++;
    if (now - last >= 1000) {
      fps = frame;
      frame = 0;
      last = now;
    }

    if (player.controls.isLocked) player.update(delta);
    updateRecoil(delta);
    const s = combat.state();
    hud.textContent =
      `backend=${backend} fps=${fps} locked=${player.controls.isLocked}` +
      ` weapon=${s.weapon} hits=${s.hits} postHp=${s.postHp} defeated=${s.defeated}` +
      ` chars=${charLoaded}/4 postfx=${window.__postfx ? (window.__postfx.enabled ? 'on' : 'off') : 'n/a'}` +
      ` pos=(${camera.position.x.toFixed(1)},${camera.position.z.toFixed(1)})`;

    if (renderer && renderFrame) renderFrame(scene, camera);
    else if (renderer) renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}

main();
