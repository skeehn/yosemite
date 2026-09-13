'use client';
import { useMemo, useRef } from 'react';
import { useLoader, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { terrainZ, clamp, type DepthTable } from '../lib/depth-table';
import type { HoverTerrain } from '../api';

export function Terrain({
  photo,
  depthUrl,
  relief,
  planeW,
  planeH,
  table,
  onHoverTerrain,
}: {
  photo: string;
  depthUrl: string;
  relief: number;
  planeW: number;
  planeH: number;
  table: DepthTable | null;
  onHoverTerrain: (h: HoverTerrain) => void;
}) {
  const [map, disp] = useLoader(THREE.TextureLoader, [photo, depthUrl]);
  useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
  }, [map]);
  const segY = Math.max(80, Math.round(280 / (planeW / planeH)));
  const last = useRef(0);
  const cb = useRef(onHoverTerrain);
  cb.current = onHoverTerrain;

  const hover = (e: ThreeEvent<PointerEvent>) => {
    const now = performance.now();
    if (now - last.current < 120) return;
    last.current = now;
    const d = (1.2 - terrainZ(table, e.point.x, e.point.y, relief, planeW, planeH) / Math.max(relief, 0.01)) / 2.4;
    cb.current({ elevPct: Math.round(clamp(1 - d, 0, 1) * 100), x: e.point.x, y: e.point.y });
  };

  return (
    <mesh onPointerMove={hover} onPointerOut={() => cb.current(null)}>
      <planeGeometry args={[planeW, planeH, 280, segY]} />
      <meshStandardMaterial
        map={map}
        displacementMap={disp}
        displacementScale={-2.4 * relief}
        displacementBias={1.2 * relief}
        roughness={1}
        metalness={0}
        flatShading
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
