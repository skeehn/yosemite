'use client';
// Camera rigs: orbit fly-to, drag-look, WASD movement, guided tour, scroll path.
// No UI here. UI drives these through props.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';
import { terrainZ, clamp, type DepthTable } from '../lib/depth-table';
import type { Viewpoint } from '../data/vistas';

export type FlyGoal = { pos: [number, number, number]; tgt: [number, number, number] } | null;

const _p = new THREE.Vector3();
const _t = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();

export function OrbitRig({ goal, enabled }: { goal: FlyGoal; enabled: boolean }) {
  const controls = useThree((s) => s.controls) as unknown as {
    object: THREE.Camera;
    target: THREE.Vector3;
  } | null;
  const gp = useMemo(() => new THREE.Vector3(...(goal?.pos ?? [0, 1.1, 12])), [goal]);
  const gt = useMemo(() => new THREE.Vector3(...(goal?.tgt ?? [0, 0.3, 0])), [goal]);
  useFrame((_, rawDt) => {
    if (!enabled || !controls || !goal) return;
    const k = 1 - Math.exp(-3 * Math.min(rawDt, 0.05));
    controls.object.position.lerp(gp, k);
    controls.target.lerp(gt, k);
  });
  return null;
}

export function DragLook({ enabled }: { enabled: boolean }) {
  const { gl, camera } = useThree();
  const drag = useRef<{ x: number; y: number } | null>(null);
  const eul = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  useEffect(() => {
    if (!enabled) return;
    const el = gl.domElement;
    eul.current.setFromQuaternion(camera.quaternion);
    const dn = (e: PointerEvent) => {
      drag.current = { x: e.clientX, y: e.clientY };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    };
    const mv = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      drag.current = { x: e.clientX, y: e.clientY };
      eul.current.y -= dx * 0.0032;
      eul.current.x = clamp(eul.current.x - dy * 0.0032, -1.45, 1.45);
      camera.quaternion.setFromEuler(eul.current);
    };
    const up = () => {
      drag.current = null;
    };
    el.addEventListener('pointerdown', dn);
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', dn);
      el.removeEventListener('pointermove', mv);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [enabled, gl, camera]);
  return null;
}

export function MoveRig({
  enabled,
  table,
  relief,
  planeW,
  planeH,
  hike,
  onInteract,
}: {
  enabled: boolean;
  table: DepthTable | null;
  relief: number;
  planeW: number;
  planeH: number;
  hike: boolean;
  onInteract: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const keys = useRef<Record<string, boolean>>({});
  const st = useRef({ relief, hike });
  st.current = { relief, hike };
  const cb = useRef(onInteract);
  cb.current = onInteract;

  useEffect(() => {
    if (!enabled) return;
    const dn = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      cb.current();
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
      keys.current = {};
    };
  }, [enabled]);

  const dir = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useFrame((_, rawDt) => {
    if (!enabled) return;
    const dt = Math.min(rawDt, 0.05);
    const k = keys.current;
    const f = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
    const r = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0);
    const u = (k['Space'] ? 1 : 0) - (k['KeyC'] ? 1 : 0);
    if (f === 0 && r === 0 && u === 0) return;
    const sp = (k['ShiftLeft'] || k['ShiftRight'] ? 13 : 4.5) * dt;
    camera.getWorldDirection(dir.current);
    if (st.current.hike) {
      dir.current.z = 0;
      if (dir.current.lengthSq() < 1e-6) dir.current.set(0, 0, -1);
      dir.current.normalize();
    }
    right.current.crossVectors(dir.current, camera.up).normalize();
    camera.position.addScaledVector(dir.current, f * sp).addScaledVector(right.current, r * sp);
    if (!st.current.hike) camera.position.z += u * sp;
    const p = camera.position;
    const bx = planeW * 0.72;
    const by = planeH * 0.7;
    p.x = clamp(p.x, -bx, bx);
    p.y = clamp(p.y, -by, by);
    const floor = terrainZ(table, p.x, p.y, st.current.relief, planeW, planeH) + 0.5;
    if (st.current.hike) {
      p.z += (floor + 1.2 - p.z) * Math.min(1, dt * 6);
    } else {
      p.z = clamp(p.z, floor, 24);
    }
  });
  return null;
}

export function TourRig({
  active,
  views,
  onDone,
}: {
  active: boolean;
  views: Viewpoint[];
  onDone: () => void;
}) {
  const { camera, gl } = useThree();
  const idx = useRef(0);
  const dwell = useRef(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    idx.current = 0;
    dwell.current = 0;
  }, [active, views]);

  useEffect(() => {
    if (!active) return;
    const cancel = () => done.current();
    gl.domElement.addEventListener('pointerdown', cancel);
    window.addEventListener('keydown', cancel);
    return () => {
      gl.domElement.removeEventListener('pointerdown', cancel);
      window.removeEventListener('keydown', cancel);
    };
  }, [active, gl]);

  useFrame((_, rawDt) => {
    if (!active || views.length === 0) return;
    const dt = Math.min(rawDt, 0.05);
    const v = views[idx.current % views.length];
    _p.set(...v.pos);
    _t.set(...v.tgt);
    const k = 1 - Math.exp(-1.6 * dt);
    camera.position.lerp(_p, k);
    _m.lookAt(camera.position, _t, camera.up);
    camera.quaternion.slerp(_q.setFromRotationMatrix(_m), k);
    if (camera.position.distanceTo(_p) < 0.5) {
      dwell.current += dt;
      if (dwell.current > 1.8) {
        dwell.current = 0;
        idx.current++;
        if (idx.current >= views.length) done.current();
      }
    }
  });
  return null;
}

function PathFollower({
  progress,
  views,
  onChapter,
}: {
  progress: number;
  views: Viewpoint[];
  onChapter: (i: number, label: string) => void;
}) {
  const camera = useThree((s) => s.camera);
  const pos = useMemo(() => views.map((v) => new THREE.Vector3(...v.pos)), [views]);
  const tgt = useMemo(() => views.map((v) => new THREE.Vector3(...v.tgt)), [views]);
  const last = useRef(-1);
  const cb = useRef(onChapter);
  cb.current = onChapter;
  useFrame(() => {
    const n = views.length;
    if (n < 2) return;
    const t = clamp(progress, 0, 1) * (n - 1);
    const i = Math.min(n - 2, Math.floor(t));
    let f = t - i;
    f = f * f * (3 - 2 * f);
    camera.position.lerpVectors(pos[i], pos[i + 1], f);
    _t.lerpVectors(tgt[i], tgt[i + 1], f);
    camera.lookAt(_t);
    const ci = Math.round(clamp(progress, 0, 1) * (n - 1));
    if (ci !== last.current) {
      last.current = ci;
      cb.current(ci, views[ci].label);
    }
  });
  return null;
}

export function ScrollPathRigInternal({
  views,
  onChapter,
}: {
  views: Viewpoint[];
  onChapter: (i: number, label: string) => void;
}) {
  const scroll = useScroll();
  return <PathFollower progress={scroll.offset} views={views} onChapter={onChapter} />;
}

export function ScrollPathRigExternal({
  progress,
  views,
  onChapter,
}: {
  progress: number;
  views: Viewpoint[];
  onChapter: (i: number, label: string) => void;
}) {
  return <PathFollower progress={progress} views={views} onChapter={onChapter} />;
}
