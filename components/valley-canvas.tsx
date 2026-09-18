'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const VERT = /* glsl */ `
uniform sampler2D uDepth;
uniform float uRelief;
varying vec2 vUv;
void main() {
  vUv = uv;
  float d = texture2D(uDepth, uv).r;
  vec3 p = position;
  p.z += (d - 0.5) * uRelief;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uColor;
uniform sampler2D uDepth;
uniform vec2 uRes;
uniform float uPixel;
uniform float uSunset;
uniform float uTime;
uniform vec2 uDith;
varying vec2 vUv;

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
#define bayer8(a) (bayer4(0.5 * (a)) * 0.0625 + bayer4(a))

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  // chunky pixel grid, depth sampled on-grid so pixels and relief align
  vec2 grid = uRes / uPixel;
  vec2 puv = (floor(vUv * grid) + 0.5) / grid;
  float d = texture2D(uDepth, puv).r;
  vec3 c = texture2D(uColor, puv).rgb;

  // day -> sunset grade
  vec3 warm = c * vec3(1.10, 0.86, 0.62);
  float sky = smoothstep(0.38, 0.04, d);
  warm = mix(warm, c * vec3(1.18, 0.70, 0.52) + vec3(0.10, 0.03, 0.0), sky * 0.65);
  vec3 g = mix(c, warm, uSunset);
  g = (g - 0.5) * 1.06 + 0.5;

  // drifting shimmer on distant air
  float m = sin(puv.x * 9.0 + uTime * 0.12) * sin(puv.y * 23.0 - uTime * 0.09);
  g += m * 0.018 * (1.0 - d);

  // pixel-art posterize in HSV: 10 hues, gentle sat, 12 values.
  // the Bayer field itself carries the parallax: mouse offsets the
  // threshold cells, weighted by depth, so grain swims around near
  // detail while far air holds still. the photo never warps.
  vec2 cell = gl_FragCoord.xy / uPixel + uDith * (0.25 + d * 2.5);
  float b = bayer8(cell) / 1.328125;
  vec3 hsv = rgb2hsv(clamp(g, 0.0, 1.0));
  hsv.x = floor(hsv.x * 6.0 + b * 0.6) / 6.0;
  hsv.y = clamp(hsv.y * 1.05, 0.0, 1.0);
  hsv.z = floor(hsv.z * 8.0 + (b - 0.5) * 0.8) / 8.0;
  g = hsv2rgb(hsv);

  // cool gray floor (not pure black) + lighter shadow so dark details hold
  g = g * 0.95 + vec3(0.10, 0.10, 0.12) + (d - 0.5) * 0.05;
  vec2 q = vUv - 0.5;
  g *= 1.0 - dot(q, q) * 0.30;
  gl_FragColor = vec4(clamp(g, 0.0, 1.0), 1.0);
}
`;

const PIXELS = [3, 5, 8];
const PIXEL_LABEL = ['fine', 'chunky', 'brutal'];

export default function ValleyCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [sunset, setSunset] = useState(false);
  const [pixelIdx, setPixelIdx] = useState(1);
  const ctl = useRef({ sunset: false, pixel: PIXELS[1] });
  ctl.current.sunset = sunset;
  ctl.current.pixel = PIXELS[pixelIdx];

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 50);
    camera.position.set(0, 0, 9.6);

    const uniforms = {
      uColor: { value: null as THREE.Texture | null },
      uDepth: { value: null as THREE.Texture | null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPixel: { value: PIXELS[2] },
      uSunset: { value: 0 },
      uTime: { value: 0 },
      uDith: { value: new THREE.Vector2(0, 0) },
      uRelief: { value: 1.6 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 10, 200, 125), mat);
    scene.add(mesh);

    const cover = () => {
      const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
      mesh.scale.setScalar(Math.max(1.1, (aspect / 1.6) * 1.08));
    };

    const manager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader(manager);
    loader.setCrossOrigin('anonymous');
    const color = loader.load('/images/hero.jpg');
    color.colorSpace = THREE.SRGBColorSpace;
    color.minFilter = THREE.LinearFilter;
    const depth = loader.load('/images/hero-depth.png');
    depth.minFilter = THREE.LinearFilter;
    uniforms.uColor.value = color;
    uniforms.uDepth.value = depth;
    manager.onLoad = () => { if (!dead) setReady(true); };

    const resize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      uniforms.uRes.value.set(w, h);
    };
    resize();
    cover();
    window.addEventListener('resize', () => { resize(); cover(); });

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMouse = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMouse);
    const onScroll = () => {
      // hero copy dissolves before the spec panel slides over it
      const f = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.45));
      if (hero.current) {
        hero.current.style.opacity = String(f);
        hero.current.style.transform = `translateY(${(1 - f) * -30}px)`;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      if (!still) uniforms.uTime.value = t;
      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;
      const scroll = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
      // the photo holds still: only a faint idle breath + scroll push-in.
      // parallax lives in the dither field, weighted by depth.
      const sway = still ? 0 : Math.sin(t * 0.22) * 0.15;
      camera.position.x = sway;
      camera.position.y = -scroll * 0.9 + (still ? 0 : Math.sin(t * 0.17) * 0.03);
      camera.position.z = 9.6 - scroll * 0.9;
      camera.lookAt(0, -scroll * 0.4, 0);
      uniforms.uDith.value.x += (mouse.x - uniforms.uDith.value.x) * 0.06;
      uniforms.uDith.value.y += (-mouse.y - uniforms.uDith.value.y) * 0.06;
      const target = ctl.current.sunset ? 1 : 0;
      uniforms.uSunset.value += (target - uniforms.uSunset.value) * 0.04;
      uniforms.uPixel.value = ctl.current.pixel;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMouse);
      window.removeEventListener('scroll', onScroll);
      mesh.geometry.dispose();
      mat.dispose();
      color.dispose();
      depth.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div ref={host} className="valley-bg" aria-hidden />
      {!ready && (
        <div className="loader">
          <span className="loader-mark">▲</span>
          <span>developing valley</span>
        </div>
      )}
      <div className={`chrome ${ready ? 'on' : ''}`}>
        <header className="nav">
          <span className="wordmark">
            <span className="wordmark-mark">▲</span> valley
          </span>
          <div className="nav-ctl">
            <div className="segment" role="group" aria-label="light">
              <button className={sunset ? '' : 'active'} onClick={() => setSunset(false)} aria-pressed={!sunset}>
                day
              </button>
              <button className={sunset ? 'active' : ''} onClick={() => setSunset(true)} aria-pressed={sunset}>
                sunset
              </button>
            </div>
            <button className="pill" onClick={() => setPixelIdx((pixelIdx + 1) % PIXELS.length)} title="pixel size">
              px:{PIXEL_LABEL[pixelIdx]}
            </button>
          </div>
        </header>
        <div className="hero" ref={hero}>
          <p className="eyebrow"><span className="tick" />yosemite valley — 37.73°n 119.57°w</p>
          <h1>Yosemite,<br />alive.</h1>
          <p className="sub">
            True-depth relief under an 8×8 Bayer matrix.
            Move to look around — scroll to push in.
          </p>
        </div>
        <footer className="statusbar">
          <span className="scroll-hint">scroll ↓</span>
          <span className="status mono">midas · bayer8 · {PIXEL_LABEL[pixelIdx]} {PIXELS[pixelIdx]}px</span>
        </footer>
      </div>
    </>
  );
}
