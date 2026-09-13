'use client';
// ValleyScene: minimal unbreakable core. One relief, dual-density dither post,
// hover parallax, dolly-explore. Camera always stays outside the geometry.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ScrollControls } from '@react-three/drei';
import * as THREE from 'three';
import { VISTAS } from '../data/vistas';
import { loadDepthTable, type DepthTable } from '../lib/depth-table';
import { OrbitRig, ScrollPathRigInternal, ScrollPathRigExternal, type FlyGoal } from './controls';
import { Terrain } from './terrain';
import { Plinth, Ground, Beacons } from './dressing';
import type { ValleySceneProps, SunMode } from '../api';
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

function ParallaxRig({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null!);
  const m = useRef({ x: 0, y: 0, tx: 0, ty: 0, down: false });
  useEffect(() => {
    if (!enabled) return;
    const mv = (e: PointerEvent) => {
      m.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      m.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const dn = () => {
      m.current.down = true;
    };
    const up = () => {
      m.current.down = false;
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerdown', dn);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerdown', dn);
      window.removeEventListener('pointerup', up);
    };
  }, [enabled ]);
  useFrame((_, rawDt) => {
    const g = ref.current;
    if (!g) return;
    const k = 1 - Math.exp(-2.5 * Math.min(rawDt, 0.05));
    const gx = m.current.down ? 0 : m.current.tx;
    const gy = m.current.down ? 0 : m.current.ty;
    m.current.x += (gx - m.current.x) * k;
    m.current.y += (gy - m.current.y) * k;
    g.rotation.y = m.current.x * 0.035;
    g.rotation.x = m.current.y * 0.02;
    g.position.x = m.current.x * 0.35;
  });
  return <group ref={ref}>{children}</group>;
}

function PostPass({
  pixel,
  split,
  bayerLog,
  mode,
  onFps,
}: {
  pixel: number;
  split: number;
  bayerLog: number;
  mode: number;
  onFps: (n: number) => void;
}) {
  const { gl, scene, camera, size, viewport } = useThree();
  const bw = Math.max(8, Math.round((size.width * viewport.dpr) / 2) * 2);
  const bh = Math.max(8, Math.round((size.height * viewport.dpr) / 2) * 2);
  const rt = useMemo(() => {
    const r = new THREE.WebGLRenderTarget(bw, bh, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    const dt = new THREE.DepthTexture(bw, bh);
    dt.minFilter = THREE.NearestFilter;
    dt.magFilter = THREE.NearestFilter;
    r.depthTexture = dt;
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bw, bh]);
  const post = useMemo(() => {
    const s = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      uniforms: {
        tD: { value: rt.texture },
        tDepth: { value: rt.depthTexture },
        u_res: { value: new THREE.Vector2(bw, bh) },
        u_camNear: { value: 0.1 },
        u_camFar: { value: 200 },
        u_pixelC: { value: 2 },
        u_pixelF: { value: 1 },
        u_split: { value: 13 },
        u_soft: { value: 2.5 },
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

  const pRef = useRef({ pixel, split, bayerLog, mode });
  pRef.current = { pixel, split, bayerLog, mode };
  const fpsRef = useRef({ frames: 0, last: performance.now(), t0: performance.now() });
  const cbRef = useRef(onFps);
  cbRef.current = onFps;

  useFrame(() => {
    const p = pRef.current;
    const u = post.mat.uniforms;
    (u.u_res.value as THREE.Vector2).set(bw, bh);
    u.u_pixelC.value = p.pixel;
    u.u_pixelF.value = Math.max(1, p.pixel - 1);
    u.u_split.value = p.split;
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

export default function ValleyScene(props: ValleySceneProps) {
  const {
    vistaId, uiMode, palette, pixel, bayerLog, relief, view, spin, sun, depthSplit,
    scrollProgress, onFps, onReady, onHoverPoi, onHoverTerrain, onChapter, onSelectPoi,
  } = props;
  const vista = VISTAS.find((v) => v.id === vistaId) ?? VISTAS[0];
  const planeH = vista.planeW / vista.planeAspect;
  const [table, setTable] = useState<DepthTable | null>(null);
  const [viewState, setViewState] = useState(view);
  const [poiGoal, setPoiGoal] = useState<FlyGoal>(null);

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
    return () => {
      on = false;
    };
  }, [vista]);

  const scrolling = uiMode === 'scroll';
  const viewList = useMemo(() => Object.values(vista.views), [vista]);
  const orbitGoal: FlyGoal = useMemo(() => {
    if (poiGoal) return poiGoal;
    const v = vista.views[viewState] ?? vista.views[vista.defaultView];
    return v ? { pos: v.pos, tgt: v.tgt } : null;
  }, [vista, viewState, poiGoal]);

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
      <ParallaxRig enabled>
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
        </Suspense>
        <Plinth planeW={vista.planeW} planeH={planeH} />
        <Ground />
        <Beacons
          pois={vista.pois}
          table={table}
          relief={relief}
          planeW={vista.planeW}
          planeH={planeH}
          onVisit={(id) => {
            const poi = vista.pois.find((p) => p.id === id);
            if (poi && !scrolling) setPoiGoal({ pos: poi.goal.pos, tgt: poi.goal.tgt });
            onSelectPoi(id);
          }}
          onHover={onHoverPoi}
        />
      </ParallaxRig>
      {!scrolling && (
        <OrbitControls
          makeDefault
          enableDamping
          enablePan
          screenSpacePanning={false}
          autoRotate={spin}
          autoRotateSpeed={0.7}
          zoomToCursor
          minDistance={3.5}
          maxDistance={26}
          minPolarAngle={0.6}
          maxPolarAngle={1.8}
        />
      )}
      <OrbitRig goal={orbitGoal} enabled={!scrolling} />
      {scrolling &&
        (scrollProgress == null ? (
          <ScrollControls pages={Math.max(2, viewList.length)} damping={0.25}>
            <ScrollPathRigInternal views={viewList} onChapter={onChapter} />
          </ScrollControls>
        ) : (
          <ScrollPathRigExternal progress={scrollProgress} views={viewList} onChapter={onChapter} />
        ))}
      <PostPass pixel={pixel} split={depthSplit} bayerLog={bayerLog} mode={palette} onFps={onFps} />
    </Canvas>
  );
}
