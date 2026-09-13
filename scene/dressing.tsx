'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { loadDepthTable, sampleDepth, terrainZ, mulberry32, clamp, type DepthTable } from '../lib/depth-table';
import type { HoverPoi } from '../api';
import type { Poi as VistaPoi, FallsStrip } from '../data/vistas';

export function Trees({
  table,
  relief,
  planeW,
  planeH,
}: {
  table: DepthTable | null;
  relief: number;
  planeW: number;
  planeH: number;
}) {
  const trunk = useRef<THREE.InstancedMesh>(null!);
  const canopy = useRef<THREE.InstancedMesh>(null!);
  const [mats, setMats] = useState<{ t: THREE.Matrix4[]; c: THREE.Matrix4[] } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!table) return;
      const rnd = mulberry32(7);
      const t: THREE.Matrix4[] = [];
      const c: THREE.Matrix4[] = [];
      let guard = 0;
      while (t.length < 320 && guard++ < 6000) {
        const x = (rnd() * 2 - 1) * (planeW / 2 - 0.3);
        const y = (rnd() * 2 - 1) * (planeH / 2 - 0.3);
        const d = sampleDepth(table, (x + planeW / 2) / planeW, 1 - (y + planeH / 2) / planeH);
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
  }, [table, relief, planeW, planeH]);

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
        <meshStandardMaterial color="#4a3826" emissive="#1a120a" emissiveIntensity={0.5} roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={canopy} args={[canopyGeo, undefined, 340]} frustumCulled={false}>
        <meshStandardMaterial color="#274a2a" emissive="#0a180c" emissiveIntensity={0.55} roughness={1} flatShading />
      </instancedMesh>
    </>
  );
}

const FALL_COUNT = 380;

export function Falls({
  strip,
  table,
  relief,
  planeW,
  planeH,
}: {
  strip: FallsStrip;
  table: DepthTable | null;
  relief: number;
  planeW: number;
  planeH: number;
}) {
  const ref = useRef<THREE.Points>(null!);
  const seeds = useMemo(() => {
    const rnd = mulberry32(21);
    return Array.from({ length: FALL_COUNT }, () => ({ p: rnd(), j: rnd(), x: (rnd() - 0.5) * 0.35 }));
  }, []);
  const positions = useMemo(() => new Float32Array(FALL_COUNT * 3), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const z = terrainZ(table, strip.x, strip.top - strip.span / 2, relief, planeW, planeH) + 0.3;
    for (let i = 0; i < FALL_COUNT; i++) {
      const s = seeds[i];
      const fall = (t * (0.25 + s.j * 0.2) + s.p) % 1;
      positions[i * 3] = strip.x + s.x + Math.sin(t * 2 + i) * 0.04;
      positions[i * 3 + 1] = strip.top - fall * strip.span;
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

function MarkerItem({
  poi,
  table,
  relief,
  planeW,
  planeH,
  explore,
  onVisit,
  onHover,
}: {
  poi: VistaPoi;
  table: DepthTable | null;
  relief: number;
  planeW: number;
  planeH: number;
  explore: boolean;
  onVisit: (id: string) => void;
  onHover: (h: HoverPoi) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const z = terrainZ(table, poi.at[0], poi.at[1], relief, planeW, planeH) + 0.7;
  useFrame(({ camera }) => {
    if (!wrap.current) return;
    const d = camera.position.distanceTo(_v.set(poi.at[0], poi.at[1], z));
    wrap.current.style.transform = `scale(${clamp(14 / d, 0.55, 1.1)})`;
  });
  return (
    <Html position={[poi.at[0], poi.at[1], z]} center distanceFactor={22}>
      <div ref={wrap}>
        <button
          className={'poi' + (explore ? ' poi-explore' : '')}
          onClick={(e) => {
            e.stopPropagation();
            onVisit(poi.id);
          }}
          onMouseEnter={() => onHover({ id: poi.id, label: poi.label, blurb: poi.blurb })}
          onMouseLeave={() => onHover(null)}
        >
          <span className="poi-dot" />
          {poi.label}
        </button>
      </div>
    </Html>
  );
}
const _v = new THREE.Vector3();

export function PoiMarkers({
  pois,
  table,
  relief,
  planeW,
  planeH,
  explore,
  onVisit,
  onHover,
}: {
  pois: VistaPoi[];
  table: DepthTable | null;
  relief: number;
  planeW: number;
  planeH: number;
  explore: boolean;
  onVisit: (id: string) => void;
  onHover: (h: HoverPoi) => void;
}) {
  return (
    <>
      {pois.map((p) => (
        <MarkerItem
          key={p.id}
          poi={p}
          table={table}
          relief={relief}
          planeW={planeW}
          planeH={planeH}
          explore={explore}
          onVisit={onVisit}
          onHover={onHover}
        />
      ))}
    </>
  );
}

export function Ground() {
  return (
    <mesh position={[0, -6.6, -8]}>
      <planeGeometry args={[300, 300]} />
      <meshStandardMaterial color="#101a12" roughness={1} />
    </mesh>
  );
}

export function preloadVista(photo: string, depth: string) {
  const img = new Image();
  img.src = photo;
  void loadDepthTable(depth);
}
