'use client';
// Camera rigs, minimal set: orbit fly-to + scroll path.
// Explore = dolly/pan/zoom through OrbitControls (unbreakable by construction:
// the camera always stays outside the relief, so there is no void to fall into).
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';
import { clamp } from '../lib/depth-table';
import type { Viewpoint } from '../data/vistas';

export type FlyGoal = { pos: [number, number, number]; tgt: [number, number, number] } | null;

const _t = new THREE.Vector3();

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
  useEffect(() => {
    last.current = -1;
  }, [views]);
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
