'use client';
// ValleyScene: the reusable front door. Props in (api.ts), events out.
// Scene-binary: terrain + dressing + atmosphere + post. No DOM UI here
// except drei Html markers (positioned by the 3D engine itself).
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ScrollControls } from '@react-three/drei';
import * as THREE from 'three';
import { VISTAS } from '../data/vistas';
import { loadDepthTable, type DepthTable } from '../lib/depth-table';
import {
  OrbitRig,
  DragLook,
  MoveRig,
  TourRig,
  ScrollPathRigInternal,
  ScrollPathRigExternal,
  type FlyGoal,
} from './controls';
import { Terrain } from './terrain';
import { Trees, Falls, PoiMarkers, Ground, preloadVista } from './dressing';
import type { ValleySceneProps, ValleyApi, SunMode } from '../api';
import { POST_VERT, POST_FRAG } from './post-shader';

export { POST_SHADER_SOURCE } from './post-shader';

function SunRig({ sun }: { sun: SunMode }) {
  const scene = useThree((s) => s.scene);
  const dir = useRef<THREE.DirectionalLight>(null!);
  const amb = useRef<THREE.AmbientLight>(null!);
  const hemi = useRef<THREE.HemisphereLight>(null!);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const day = sun === 'day';
    const sunColor = _c1.set(day ? '#fff4e0' : '#ff9a4d');
    const ambColor = _c2.set(day ? '#ffffff' : '#8a7a9a');
    const bg = _c3.set(day ? '#0d1417' : '#171020');
    const k = 1 - Math.exp(-2.5 * dt);
    const damp = (cur: number, goal: number) => cur + (goal - cur) * k;
    if (dir.current) {
      dir.current.color.lerp(sunColor, k);
      dir.current.intensity = damp(dir.current.intensity, day ? 1.4 : 1.2);
      dir.current.position.lerp(day ? _v1.set(-5, 7, 6) : _v1.set(-8, 2.2, 4), k);
    }
    if (amb.current) {
      amb.current.color.lerp(ambColor, k);
      amb.current.intensity = damp(amb.current.intensity, day ? 1.0 : 0.6);
    }
    if (hemi.current) hemi.current.intensity = damp(hemi.current.intensity, day ? 0.5 : 0.3);
    const sbg = scene.background as THREE.Color | null;
    if (sbg && sbg.isColor) sbg.lerp(bg, k);
    const fog = scene.fog as THREE.Fog | null;
    if (fog && fog.isFog) {
      fog.color.lerp(bg, k);
      fog.near = damp(fog.near, day ? 16 : 14);
      fog.far = damp(fog.far, day ? 34 : 30);
    }
  });
  return (
    <>
      <directionalLight ref={dir} position={[-5, 7, 6]} intensity={1.4} />
      <ambientLight ref={amb} intensity={1.0} />
      <hemisphereLight ref={hemi} args={['#bcd0e0', '#1a241a', 0.5]} />
    </>
  );
}
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const _c3 = new THREE.Color();
const _v1 = new THREE.Vector3();

function PostPass({
  pixel,
  bayerLog,
  mode,
  onFps,
}: {
  pixel: number;
  bayerLog: number;
  mode: number;
  onFps: (n: number) => void;
}) {
  const { gl, scene, camera, size } = useThree();
  const rt = useMemo(
    () =>
      new THREE.WebGLRenderTarget(2, 2, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: true,
      }),
    []
  );
  const post = useMemo(() => {
    const s = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      uniforms: {
        tD: { value: rt.texture },
        u_res: { value: new THREE.Vector2(2, 2) },
        u_bayerLog: { value: 3 },
        u_mode: { value: 0 },
        u_time: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    mesh.frustumCulled = false;
    s.add(mesh);
    return { scene: s, cam, mat };
  }, [rt]);
  useEffect(() => () => rt.dispose(), [rt]);

  const pRef = useRef({ pixel, bayerLog, mode });
  pRef.current = { pixel, bayerLog, mode };
  const fpsRef = useRef({ frames: 0, last: performance.now(), t0: performance.now() });
  const cbRef = useRef(onFps);
  cbRef.current = onFps;

  useFrame(() => {
    const p = pRef.current;
    const w = Math.max(2, Math.floor(size.width / p.pixel));
    const h = Math.max(2, Math.floor(size.height / p.pixel));
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    const u = post.mat.uniforms;
    (u.u_res.value as THREE.Vector2).set(w, h);
    u.u_bayerLog.value = p.bayerLog;
    u.u_mode.value = p.mode;
    u.u_time.value = (performance.now() - fpsRef.current.t0) / 1000;
    gl.setRenderTarget(rt);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(post.scene, post.cam);
    const f = fpsRef.current;
    f.frames++;
    const now = performance.now();
    if (now - f.last > 500) {
      cbRef.current(Math.round((f.frames * 1000) / (now - f.last)));
      f.frames = 0;
      f.last = now;
    }
  }, 1);
  return null;
}

export default function ValleyScene(
  props: ValleySceneProps & {
    apiRef: React.MutableRefObject<ValleyApi | null>;
    onTourEnd: () => void;
  }
) {
  const {
    vistaId, uiMode, palette, pixel, bayerLog, relief, view, spin, hike, sun, tour,
    scrollProgress, apiRef, onFps, onReady, onHoverPoi, onHoverTerrain, onChapter, onSelectPoi, onTourEnd,
  } = props;
  const vista = VISTAS.find((v) => v.id === vistaId) ?? VISTAS[0];
  const planeH = vista.planeW / vista.planeAspect;
  const [table, setTable] = useState<DepthTable | null>(null);
  const [viewState, setViewState] = useState(view);
  const [poiGoal, setPoiGoal] = useState<FlyGoal>(null);
  const flyGoal = useRef<FlyGoal>(null);
  const tourEnd = useRef(onTourEnd);
  tourEnd.current = onTourEnd;

  useEffect(() => {
    setViewState(view);
    setPoiGoal(null);
  }, [view, vistaId]);
  useEffect(() => {
    let on = true;
    setTable(null);
    loadDepthTable(vista.depth).then((t) => {
      if (on) setTable(t);
    });
    // warm the next vistas in the background
    for (const v of VISTAS) {
      if (v.id !== vista.id) {
        preloadVista(v.photo, v.depth);
        void loadDepthTable(v.depth);
      }
    }
    return () => {
      on = false;
    };
  }, [vista]);

  useEffect(() => {
    apiRef.current = {
      flyToView: (id: string) => setViewState(id),
      flyToPoi: (id: string) => {
        const poi = vista.pois.find((p) => p.id === id);
        if (poi) flyGoal.current = { pos: poi.goal.pos, tgt: poi.goal.tgt };
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, vista]);

  const explore = uiMode === 'explore';
  const scrolling = uiMode === 'scroll';
  const viewList = useMemo(() => Object.values(vista.views), [vista]);
  const orbitGoal: FlyGoal = useMemo(() => {
    if (poiGoal) return poiGoal;
    const v = vista.views[viewState] ?? vista.views[vista.defaultView];
    return v ? { pos: v.pos, tgt: v.tgt } : null;
  }, [vista, viewState, poiGoal]);

  const stopTour = () => tourEnd.current();

  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      camera={{ fov: 42, position: [0, 1.1, 12], near: 0.1, far: 200 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={onReady}
    >
      <color attach="background" args={['#0d1417']} />
      <fog attach="fog" args={['#0d1417', 16, 34]} />
      <SunRig sun={sun} />
      <Suspense fallback={null}>
        <Terrain
          photo={vista.photo}
          depthUrl={vista.depth}
          relief={relief}
          planeW={vista.planeW}
          planeH={planeH}
          table={table}
          onHoverTerrain={onHoverTerrain}
        />
        {vista.trees && <Trees table={table} relief={relief} planeW={vista.planeW} planeH={planeH} />}
      </Suspense>
      {vista.falls && (
        <Falls strip={vista.falls} table={table} relief={relief} planeW={vista.planeW} planeH={planeH} />
      )}
      <Ground />
      <PoiMarkers
        pois={vista.pois}
        table={table}
        relief={relief}
        planeW={vista.planeW}
        planeH={planeH}
        explore={explore}
        onVisit={(id) => {
          if (explore) {
            const poi = vista.pois.find((p) => p.id === id);
            if (poi) flyGoal.current = { pos: poi.goal.pos, tgt: poi.goal.tgt };
          } else {
            const poi = vista.pois.find((p) => p.id === id);
            if (poi) setPoiGoal({ pos: poi.goal.pos, tgt: poi.goal.tgt });
          }
          onSelectPoi(id);
        }}
        onHover={onHoverPoi}
      />
      {!explore && !scrolling && (
        <OrbitControls
          makeDefault
          enableDamping
          enablePan={false}
          autoRotate={spin}
          autoRotateSpeed={0.7}
          minDistance={6}
          maxDistance={24}
          minPolarAngle={0.65}
          maxPolarAngle={1.78}
        />
      )}
      <OrbitRig goal={orbitGoal} enabled={!explore && !scrolling} />
      {explore && (
        <>
          <DragLook enabled={!tour} />
          <MoveRig
            enabled
            table={table}
            relief={relief}
            planeW={vista.planeW}
            planeH={planeH}
            hike={hike}
            onInteract={() => {
              if (tour) stopTour();
            }}
          />
          <TourRig active={tour} views={viewList} onDone={stopTour} />
        </>
      )}
      {scrolling &&
        (scrollProgress == null ? (
          <ScrollControls pages={Math.max(2, viewList.length)} damping={0.25}>
            <ScrollPathRigInternal views={viewList} onChapter={onChapter} />
          </ScrollControls>
        ) : (
          <ScrollPathRigExternal progress={scrollProgress} views={viewList} onChapter={onChapter} />
        ))}
      <PostPass pixel={pixel} bayerLog={bayerLog} mode={palette} onFps={onFps} />
    </Canvas>
  );
}
