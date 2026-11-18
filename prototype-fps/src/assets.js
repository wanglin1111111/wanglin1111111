// 资产管线：加载 PBR 角色 GLB，归一化到 1.8m、设阴影、检查材质。
// scale 系数来自任务 0 实测（glTF accessor min/max，非顶点包络），逐个对应文件名。
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

// 实测：归一化到 1.8m 人身高的 scale（2026-11-18）
const SCALE_BY_FILE = {
  char1_tactical_male: 0.973,
  char2_moss_monster: 0.8182,
  char3_fem_soldier: 2.9191,
  char4_heavy_knight: 2.1176,
};

function scaleForUrl(url) {
  for (const name of Object.keys(SCALE_BY_FILE)) {
    if (String(url).includes(name)) return SCALE_BY_FILE[name];
  }
  return 1; // 未知资产保持原尺寸
}

export function loadCharacter(url) {
  const loader = new GLTFLoader();
  const scale = scaleForUrl(url);
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const object = gltf.scene;
        object.scale.setScalar(scale); // 归一化到 1.8m

        let converted = 0;
        object.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
          const mat = child.material;
          // 缺 PBR 材质（非 Standard / WebGPU 节点材质）就换成 MeshStandardMaterial，保基础色
          if (mat && !(mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial || mat.isWebGPUMaterial)) {
            const next = new THREE.MeshStandardMaterial({
              color: mat.color ? mat.color.clone() : new THREE.Color(0xcccccc),
              metalness: 0,
              roughness: 0.8,
            });
            if (mat.map) next.map = mat.map;
            child.material = next;
            converted += 1;
          }
        });

        resolve({
          object,
          scale,
          materialConverted: converted,
          dispose() {
            object.traverse((c) => {
              if (c.geometry) c.geometry.dispose();
              if (c.material) {
                const mats = Array.isArray(c.material) ? c.material : [c.material];
                for (const mm of mats) {
                  if (mm.map) mm.map.dispose();
                  mm.dispose();
                }
              }
            });
          },
        });
      },
      undefined,
      (err) => reject(err),
    );
  });
}
