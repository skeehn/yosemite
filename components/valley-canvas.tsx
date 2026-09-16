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
uniform float uLevels;
uniform float uDither;
uniform float uSunset;
uniform float uTime;
varying vec2 vUv;

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
#define bayer8(a) (bayer4(0.5 * (a)) * 0.0625 + bayer4(a))

void main() {
  vec2 grid = uRes / uPixel;
  vec2 puv = (floor(vUv * grid) + 0.5) / grid;
  float d = texture2D(uDepth, puv).r;
  vec3 c = texture2D(uColor, puv).rgb;

  // day -> sunset grade, extra warmth in far (sky) areas
  vec3 warm = c * vec3(1.10, 0.86, 0.62);
  float sky = smoothstep(0.38, 0.04, d);
  warm = mix(warm, c * vec3(1.18, 0.70, 0.52) + vec3(0.10, 0.03, 0.0), sky * 0.65);
  vec3 g = mix(c, warm, uSunset);
  g = (g - 0.5) * 1.06 + 0.5;

  // drifting shimmer on distant air
  float m = sin(puv.x * 9.0 + uTime * 0.12) * sin(puv.y * 23.0 - uTime * 0.09);
  g += m * 0.018 * (1.0 - d);

  // ordered-dither quantization: many levels + centered threshold
  // keeps gradients smooth with visible dither grain instead of posterizing
  float b = bayer8(gl_FragCoord.xy / uPixel) / 1.328125;
  g = g * 0.965 + 0.035;          // lift shadows so darks keep detail
  g += (d - 0.5) * 0.05;          // depth fill light on near detail
  g = floor(g * (uLevels - 1.0) + (b - 0.5) * uDither) / (uLevels - 1.0);
  g = clamp(g, 0.0, 1.0);

  // vignette
  vec2 q = vUv - 0.5;
  g *= 1.0 - dot(q, q) * 0.35;
  gl_FragColor = vec4(g, 1.0);
}
`;

const PIXELS = [2, 4, 6];
const PIXEL_LABEL = ['fine', 'chunky', 'brutal'];

export default function ValleyCanvas() {
  const host = useRef<HTMLDivElement>(null);
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
      uPixel: { value: PIXELS[1] },
      uLevels: { value: 16 },
      uDither: { value: 1.0 },
      uSunset: { value: 0 },
      uTime: { value: 0 },
      uRelief: { value: 1.35 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 10, 200, 125), mat);
    scene.add(mesh);

    const cover = () => {
      // plane is 16:10; scale up so it always covers wide viewports
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
      const sway = still ? 0 : Math.sin(t * 0.22) * 0.12;
      camera.position.x = mouse.x * 0.55 + sway;
      camera.position.y = -mouse.y * 0.35 - scroll * 0.9 + (still ? 0 : Math.sin(t * 0.17) * 0.07);
      camera.position.z = 9.6 - scroll * 0.9;
      camera.lookAt(0, -scroll * 0.4, 0);
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
        <div className="valley-loader">
          <span>developing valley…</span>
        </div>
      )}
      <div className={`valley-ui ${ready ? 'on' : ''}`}>
        <header className="valley-top">
          <span className="wordmark">VALLEY</span>
          <div className="controls">
            <button
              className={sunset ? '' : 'active'}
              onClick={() => setSunset(false)}
              aria-pressed={!sunset}
            >
              day
            </button>
            <button
              className={sunset ? 'active' : ''}
              onClick={() => setSunset(true)}
              aria-pressed={sunset}
            >
              sunset
            </button>
            <span className="sep" />
            <button
              onClick={() => setPixelIdx((pixelIdx + 1) % PIXELS.length)}
              title="pixel size"
            >
              px:{PIXEL_LABEL[pixelIdx]}
            </button>
          </div>
        </header>
        <div className="hero-copy">
          <h1>Yosemite, alive</h1>
          <p>
            True-depth relief from a single photograph, quantized through an
            8×8 Bayer matrix. Move to look around — scroll to push in.
          </p>
        </div>
        <footer className="valley-foot">
          <span className="scroll-hint">scroll ↓</span>
          <a
            href="https://commons.wikimedia.org/wiki/File:Tunnel_View_3,_Yosemite_Valley,_Yosemite_NP_-_Diliff.jpg"
            target="_blank"
            rel="noreferrer"
          >
            Tunnel View — Diliff · CC BY-SA 3.0 · Wikimedia Commons
          </a>
        </footer>
      </div>
    </>
  );
}
