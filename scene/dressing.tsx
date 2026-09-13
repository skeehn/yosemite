'use client';
// Dressing, minimal set: plinth (diorama body), 3D beacon markers, ground.
// Beacons are real geometry so they scale naturally at every angle and
// dither exactly like the terrain. No HTML overlays in the 3D view.
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { terrainZ, clamp, type DepthTable } from '../lib/depth-table';
import type { HoverPoi } from '../api';
import type { Poi as VistaPoi } from '../data/vistas';

export function Plinth({ planeW, planeH }: { planeW: number; planeH: number }) {
  return (
    <mesh position={[0, 0, -2.3]}>
      <boxGeometry args={[planeW + 1.4, planeH + 1.4, 1.6]} />
      <meshStandardMaterial color="#0e1310" roughness={1} />
    </mesh>
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

function Beacon({
  poi,
  table,
  relief,
  planeW,
  planeH,
  index,
  onVisit,
  onHover,
}: {
  poi: VistaPoi;
  table: DepthTable | null;
  relief: number;
  planeW: number;
  planeH: number;
  index: number;
  onVisit: (id: string) => void;
  onHover: (h: HoverPoi) => void;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hot, setHot] = useState(false);
  const z = terrainZ(table, poi.at[0], poi.at[1], relief, planeW, planeH) + 0.75;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const s = (hot ? 1.35 : 1) * (1 + 0.1 * Math.sin(t * 2 + index * 1.7));
    ref.current.scale.setScalar(s);
    ref.current.position.y = poi.at[1] + Math.sin(t * 1.3 + index) * 0.07;
    ref.current.rotation.y = t * 0.6 + index;
  });
  return (
    <mesh
      ref={ref}
      position={[poi.at[0], poi.at[1], z]}
      onClick={(e) => {
        e.stopPropagation();
        onVisit(poi.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHot(true);
        document.body.style.cursor = 'pointer';
        onHover({ id: poi.id, label: poi.label, blurb: poi.blurb });
      }}
      onPointerOut={() => {
        setHot(false);
        document.body.style.cursor = '';
        onHover(null);
      }}
    >
      <octahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial
        color={hot ? '#ffe9b8' : '#e8b34b'}
        emissive={hot ? '#ffca66' : '#7a5210'}
        emissiveIntensity={hot ? 1.6 : 0.9}
        roughness={0.4}
        flatShading
      />
    </mesh>
  );
}

export function Beacons({
  pois,
  table,
  relief,
  planeW,
  planeH,
  onVisit,
  onHover,
}: {
  pois: VistaPoi[];
  table: DepthTable | null;
  relief: number;
  planeW: number;
  planeH: number;
  onVisit: (id: string) => void;
  onHover: (h: HoverPoi) => void;
}) {
  const order = useMemo(() => pois.map((_, i) => i), [pois]);
  return (
    <>
      {pois.map((p, k) => (
        <Beacon
          key={p.id}
          poi={p}
          table={table}
          relief={relief}
          planeW={planeW}
          planeH={planeH}
          index={order[k]}
          onVisit={onVisit}
          onHover={onHover}
        />
      ))}
    </>
  );
}

export function reliefPct(
  table: DepthTable | null,
  x: number,
  y: number,
  relief: number,
  planeW: number,
  planeH: number
): number {
  const z = terrainZ(table, x, y, relief, planeW, planeH);
  const d = (1.2 - z / Math.max(relief, 0.01)) / 2.4;
  return Math.round(clamp(1 - d, 0, 1) * 100);
}
