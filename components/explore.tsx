'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

export type FlyGoal = { pos: [number, number, number]; tgt: [number, number, number] } | null;

// ---- CPU depth table (from public/depth.png, white = far) ----
let table: Float32Array | null = null;
let tablePromise: Promise<void> | null = null;
const TW = 160;
const TH = 104;

export function loadDepthTable(): Promise<void> {
  if (table) return Promise.resolve();
  if (tablePromise) return tablePromise;
  tablePromise = (async () => {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('depth load failed'));
      im.src = '/depth.png';
    });
    const c = document.createElement('canvas');
    c.width = TW;
    c.height = TH;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, TW, TH);
    const d = ctx.getImageData(0, 0, TW, TH).data;
    table = new Float32Array(TW * TH);
    for (let i = 0; i < TW * TH; i++) table[i] = d[i * 4] / 255;
  })();
  return tablePromise;
}

export function sampleDepth(u: number, vTop: number): number {
  if (!table) return 0.5;
  const x = Math.min(0.9999, Math.max(0, u)) * (TW - 1);
  const y = Math.min(0.9999, Math.max(0, vTop)) * (TH - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const i = (yy: number, xx: number) => table![Math.min(TH - 1, yy) * TW + Math.min(TW - 1, xx)];
  return i(y0, x0) * (1 - fx) * (1 - fy) + i(y0, x0 + 1) * fx * (1 - fy) + i(y0 + 1, x0) * (1 - fx) * fy + i(y0 + 1, x0 + 1) * fx * fy;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function terrainZ(x: number, y: number, relief: number): number {
  const u = clamp01((x + 9.5) / 19);
  const vTop = clamp01(1 - (y + 6.2) / 12.4);
  return relief * (1.2 - 2.4 * sampleDepth(u, vTop));
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function ExploreControls({
  plcRef,
  relief,
  hike,
  flyGoal,
  onLockChange,
}: {
  plcRef: React.MutableRefObject<{ lock: () => void; unlock: () => void } | null>;
  relief: number;
  hike: boolean;
  flyGoal: React.MutableRefObject<FlyGoal>;
  onLockChange: (locked: boolean) => void;
}) {
  const camera = useThree((s) => s.camera);
  const keys = useRef<Record<string, boolean>>({});
  const reliefRef = useRef(relief);
  reliefRef.current = relief;
  const hikeRef = useRef(hike);
  hikeRef.current = hike;

  useEffect(() => {
    const dn = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const tmpDir = useRef(new THREE.Vector3());
  const tmpRight = useRef(new THREE.Vector3());
  const tmpGoal = useRef(new THREE.Vector3());
  const tmpTgt = useRef(new THREE.Vector3());

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const k = keys.current;
    const rel = reliefRef.current;

    const g = flyGoal.current;
    if (g) {
      tmpGoal.current.set(...g.pos);
      tmpTgt.current.set(...g.tgt);
      camera.position.lerp(tmpGoal.current, 1 - Math.exp(-2.5 * dt));
      const look = new THREE.Matrix4().lookAt(camera.position, tmpTgt.current, camera.up);
      camera.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(look), 1 - Math.exp(-2.5 * dt));
      if (camera.position.distanceTo(tmpGoal.current) < 0.4) flyGoal.current = null;
      return;
    }

    const f = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
    const r = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
    const u = (k['Space'] ? 1 : 0) - (k['KeyC'] ? 1 : 0);
    if (f === 0 && r === 0 && u === 0) return;
    const sp = (k['ShiftLeft'] || k['ShiftRight'] ? 13 : 4.5) * dt;
    camera.getWorldDirection(tmpDir.current);
    if (hikeRef.current) {
      tmpDir.current.z = 0;
      if (tmpDir.current.lengthSq() < 1e-6) tmpDir.current.set(0, 0, -1);
      tmpDir.current.normalize();
    }
    tmpRight.current.crossVectors(tmpDir.current, camera.up).normalize();
    camera.position.addScaledVector(tmpDir.current, f * sp).addScaledVector(tmpRight.current, r * sp);
    if (!hikeRef.current) camera.position.z += u * sp;
    const p = camera.position;
    p.x = clamp(p.x, -14, 14);
    p.y = clamp(p.y, -8, 8);
    const floor = terrainZ(p.x, p.y, rel) + 0.5;
    if (hikeRef.current) {
      p.z += (floor + 1.2 - p.z) * Math.min(1, dt * 6);
    } else {
      p.z = clamp(p.z, floor, 22);
    }
  });

  return (
    <PointerLockControls
      ref={plcRef as never}
      onLock={() => onLockChange(true)}
      onUnlock={() => onLockChange(false)}
    />
  );
}
