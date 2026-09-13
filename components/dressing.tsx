'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { loadDepthTable, sampleDepth, terrainZ, type FlyGoal } from './explore';

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Trees({ relief }: { relief: number }) {
  const trunk = useRef<THREE.InstancedMesh>(null!);
  const canopy = useRef<THREE.InstancedMesh>(null!);
  const [mats, setMats] = useState<{ t: THREE.Matrix4[]; c: THREE.Matrix4[] } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadDepthTable();
      const rnd = mulberry32(7);
      const t: THREE.Matrix4[] = [];
      const c: THREE.Matrix4[] = [];
      let guard = 0;
      while (t.length < 320 && guard++ < 6000) {
        const x = (rnd() * 2 - 1) * 9.2;
        const y = (rnd() * 2 - 1) * 5.9;
        const d = sampleDepth((x + 9.5) / 19, 1 - (y + 6.2) / 12.4);
        if (d > 0.42) continue;
        const s = 0.22 + rnd() * 0.42;
        const z = relief * (1.2 - 2.4 * d);
        const mt = new THREE.Matrix4().makeScale(s, s, s);
        mt.setPosition(x, y - 0.04, z + 0.18 * s);
        const mc = new THREE.Matrix4().makeScale(s, s, s);
        mc.setPosition(x, y - 0.04, z + 0.85 * s);
        t.push(mt);
        c.push(mc);
      }
      if (alive) setMats({ t, c });
    })();
    return () => {
      alive = false;
    };
  }, [relief]);

  useEffect(() => {
    if (!mats || !trunk.current || !canopy.current) return;
    mats.t.forEach((m, i) => trunk.current.setMatrixAt(i, m));
    mats.c.forEach((m, i) => canopy.current.setMatrixAt(i, m));
    trunk.current.count = canopy.current.count = mats.t.length;
    trunk.current.instanceMatrix.needsUpdate = true;
    canopy.current.instanceMatrix.needsUpdate = true;
  }, [mats]);

  const trunkGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.07, 0.1, 0.7, 5);
    g.rotateX(Math.PI / 2);
    g.translate(0, 0, -0.2);
    return g;
  }, []);
  const canopyGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.48, 1.2, 6);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);

  return (
    <>
      <instancedMesh ref={trunk} args={[trunkGeo, undefined, 340]} frustumCulled={false}>
        <meshStandardMaterial color="#4a3826" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={canopy} args={[canopyGeo, undefined, 340]} frustumCulled={false}>
        <meshStandardMaterial color="#1d3320" roughness={1} flatShading />
      </instancedMesh>
    </>
  );
}

const FALLS_X = 5.6;
const FALLS_TOP = 3.6;
const FALLS_SPAN = 4.6;
const FALL_COUNT = 380;

export function Falls() {
  const ref = useRef<THREE.Points>(null!);
  const seeds = useMemo(() => {
    const rnd = mulberry32(21);
    return Array.from({ length: FALL_COUNT }, () => ({ p: rnd(), j: rnd(), x: (rnd() - 0.5) * 0.35 }));
  }, []);
  const positions = useMemo(() => new Float32Array(FALL_COUNT * 3), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const z = terrainZ(FALLS_X, 1, 1) + 0.3;
    for (let i = 0; i < FALL_COUNT; i++) {
      const s = seeds[i];
      const fall = (t * (0.25 + s.j * 0.2) + s.p) % 1;
      positions[i * 3] = FALLS_X + s.x + Math.sin(t * 2 + i) * 0.04;
      positions[i * 3 + 1] = FALLS_TOP - fall * FALLS_SPAN;
      positions[i * 3 + 2] = z + Math.sin(fall * 9 + i) * 0.06;
    }
    if (ref.current) ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d8ecff" size={0.14} transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}

const POIS = [
  { id: 'elcap', label: 'EL CAPITAN', pos: [-5.2, 2.2] as [number, number] },
  { id: 'falls', label: 'BRIDALVEIL FALL', pos: [5.6, 2.6] as [number, number] },
  { id: 'dome', label: 'HALF DOME', pos: [0.8, 2.0] as [number, number] },
];

const POI_GOALS: Record<string, FlyGoal> = {
  elcap: { pos: [-4.5, 1.6, 6.5], tgt: [-5.2, 1.6, 0] },
  falls: { pos: [4.2, 1.8, 6.2], tgt: [5.6, 1.8, 0] },
  dome: { pos: [0.8, 1.6, 6.8], tgt: [0.8, 1.4, -1] },
};

export function PoiMarkers({
  explore,
  onVisit,
}: {
  explore: boolean;
  onVisit: (id: string) => void;
}) {
  return (
    <>
      {POIS.map((p) => {
        const z = terrainZ(p.pos[0], p.pos[1], 1) + 0.7;
        return (
          <Html key={p.id} position={[p.pos[0], p.pos[1], z]} center distanceFactor={20}>
            <button
              className={'poi' + (explore ? ' poi-explore' : '')}
              onClick={(e) => {
                e.stopPropagation();
                onVisit(p.id);
              }}
            >
              <span className="poi-dot" />
              {p.label}
            </button>
          </Html>
        );
      })}
    </>
  );
}

export function poiGoal(id: string): FlyGoal {
  return POI_GOALS[id] ?? null;
}

export function Ground() {
  return (
    <mesh position={[0, -6.6, -8]} rotation={[0, 0, 0]}>
      <planeGeometry args={[300, 300]} />
      <meshStandardMaterial color="#101a12" roughness={1} />
    </mesh>
  );
}
