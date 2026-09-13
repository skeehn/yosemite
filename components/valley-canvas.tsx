'use client';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export type PaletteMode = 0 | 1 | 2 | 3 | 4; // full, alpine, sunset, topo, gameboy

const POST_VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const POST_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tD;
uniform vec2 u_res;
uniform int u_bayerLog;
uniform int u_mode;
uniform float u_time;
float bayerIdx2(vec2 p){
  vec2 q = mod(floor(p), 2.0);
  float x = step(0.5, q.x);
  float y = step(0.5, q.y);
  return (1.0 - x) * y * 3.0 + x * (1.0 - y) * 2.0 + x * y * 1.0;
}
float bayer2(vec2 p){ return (bayerIdx2(p) + 0.5) / 4.0; }
float bayer4(vec2 p){
  float c = bayerIdx2(floor(p * 0.5));
  float f = bayerIdx2(p);
  return (c * 4.0 + f + 0.5) / 16.0;
}
float bayer8(vec2 p){
  float ci = bayer4(floor(p * 0.5)) * 16.0 - 0.5;
  float fi = bayerIdx2(p);
  return (ci * 4.0 + fi + 0.5) / 64.0;
}
float bayer(vec2 p, int logSize){
  if(logSize <= 1) return bayer2(p);
  if(logSize == 2) return bayer4(p);
  return bayer8(p);
}
vec3 pal(float t, int p){
  t = clamp(t, 0.0, 1.0);
  if(p == 2){
    vec3 c1=vec3(0.13,0.10,0.32), c2=vec3(0.55,0.20,0.45), c3=vec3(0.95,0.42,0.25),
         c4=vec3(1.00,0.75,0.40), c5=vec3(1.00,0.96,0.85);
    if(t<0.25) return mix(c1,c2,t/0.25);
    if(t<0.50) return mix(c2,c3,(t-0.25)/0.25);
    if(t<0.75) return mix(c3,c4,(t-0.50)/0.25);
    return mix(c4,c5,(t-0.75)/0.25);
  }
  if(p == 3){
    vec3 c1=vec3(0.16,0.35,0.22), c2=vec3(0.42,0.52,0.28), c3=vec3(0.65,0.58,0.38),
         c4=vec3(0.48,0.36,0.26), c5=vec3(0.92,0.90,0.84);
    float b = floor(t*6.0)/6.0;
    if(b<0.2) return mix(c1,c2,b/0.2);
    if(b<0.4) return mix(c2,c3,(b-0.2)/0.2);
    if(b<0.6) return mix(c3,c4,(b-0.4)/0.2);
    if(b<0.8) return mix(c4,c5,(b-0.6)/0.2);
    return c5;
  }
  if(p == 4){
    vec3 c1=vec3(0.05,0.09,0.06), c2=vec3(0.19,0.38,0.19),
         c3=vec3(0.54,0.67,0.32), c4=vec3(0.85,0.92,0.62);
    float b = floor(t*4.0+0.5)/3.0;
    if(b<0.2) return c1; if(b<0.5) return c2; if(b<0.85) return c3; return c4;
  }
  vec3 c1=vec3(0.08,0.16,0.13), c2=vec3(0.20,0.33,0.22), c3=vec3(0.45,0.44,0.36),
       c4=vec3(0.62,0.60,0.55), c5=vec3(0.96,0.95,0.90);
  if(t<0.25) return mix(c1,c2,t/0.25);
  if(t<0.50) return mix(c2,c3,(t-0.25)/0.25);
  if(t<0.75) return mix(c3,c4,(t-0.50)/0.25);
  return mix(c4,c5,(t-0.75)/0.25);
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  float th = bayer(gl_FragCoord.xy, u_bayerLog);
  vec3 c = texture2D(tD, vUv).rgb;
  vec3 col;
  if(u_mode == 0){
    col = floor(c * 5.0 + th) / 5.0;
  } else {
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float steps = (u_mode == 4) ? 4.0 : 6.0;
    float q = lum * steps + (th - 0.5) * 1.4;
    float qi = clamp((floor(q) + step(1.0 - fract(q), th)) / steps, 0.0, 1.0);
    col = pal(qi, u_mode);
    if(u_mode == 3){
      float cc = abs(fract(lum * 22.0) - 0.5);
      col *= (1.0 - smoothstep(0.06, 0.02, cc) * 0.25);
    }
  }
  col = pow(max(col, 0.0), vec3(0.4545));
  vec2 ndc = vUv - 0.5;
  col *= mix(0.78, 1.0, smoothstep(0.65, 0.2, length(ndc)));
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.035;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const POST_SHADER_SOURCE = POST_FRAG;

function Terrain({ relief }: { relief: number }) {
  const [map, disp] = useLoader(THREE.TextureLoader, ['/photo.jpg', '/depth.png']);
  useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
  }, [map]);
  return (
    <mesh>
      <planeGeometry args={[16, 10.45, 260, 170]} />
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

const GOALS: Record<string, { pos: [number, number, number]; tgt: [number, number, number] }> = {
  valley: { pos: [0, 1.2, 13.5], tgt: [0, 0.3, 0] },
  elcap: { pos: [-6.5, 1.8, 9], tgt: [-4, 1, 0] },
  falls: { pos: [5.5, 1.4, 9.5], tgt: [3.5, 0.8, 0] },
  dome: { pos: [1.5, 2.4, 10], tgt: [0.5, 1.2, -1] },
};

function Rig({ view }: { view: string }) {
  const controls = useThree((s) => s.controls) as unknown as {
    object: THREE.Camera;
    target: THREE.Vector3;
    update: () => void;
  } | null;
  const goal = useMemo(() => {
    const g = GOALS[view] ?? GOALS.valley;
    return { pos: new THREE.Vector3(...g.pos), tgt: new THREE.Vector3(...g.tgt) };
  }, [view]);
  useFrame((_, dt) => {
    if (!controls) return;
    const k = 1 - Math.exp(-3 * Math.min(dt, 0.05));
    controls.object.position.lerp(goal.pos, k);
    controls.target.lerp(goal.tgt, k);
  });
  return null;
}

function PostPass({
  pixel,
  bayerLog,
  mode,
  onFps,
}: {
  pixel: number;
  bayerLog: number;
  mode: PaletteMode;
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

export default function ValleyCanvas({
  palette,
  pixel,
  bayerLog,
  relief,
  view,
  spin,
  onFps,
  onReady,
}: {
  palette: PaletteMode;
  pixel: number;
  bayerLog: number;
  relief: number;
  view: string;
  spin: boolean;
  onFps: (n: number) => void;
  onReady: () => void;
}) {
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      camera={{ fov: 42, position: [0, 1.2, 13.5], near: 0.1, far: 100 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={onReady}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[-5, 7, 6]} intensity={2.2} />
      <Suspense fallback={null}>
        <Terrain relief={relief} />
      </Suspense>
      <Rig view={view} />
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
      <PostPass pixel={pixel} bayerLog={bayerLog} mode={palette} onFps={onFps} />
    </Canvas>
  );
}
