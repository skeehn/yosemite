// YOSEMITE TUNNEL VIEW — full-bleed photo + WebGL2 Bayer ordered dither.
// Photo: Diliff, CC BY-SA 3.0, via Wikimedia Commons (baked in public/photo.jpg).
// Deliberately simple: one image texture, no DEM decode, no pixel readback.

const VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_img;
uniform vec2  u_res;
uniform vec2  u_imgSize;
uniform vec2  u_mouse;
uniform float u_time, u_pixel, u_reveal;
uniform int   u_bayerLog;
uniform int   u_palette;
out vec4 o;

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
vec2 coverUv(vec2 frag){
  float ra = u_res.x / u_res.y;
  float ri = u_imgSize.x / u_imgSize.y;
  vec2 uv = frag / u_res;
  if(ra > ri){ uv.y = (uv.y - 0.5) * ra / ri + 0.5; }
  else { uv.x = (uv.x - 0.5) * ri / ra + 0.5; }
  return uv;
}
vec3 pal(float t, int p){
  t = clamp(t, 0.0, 1.0);
  if(p == 1){ // SUNSET
    vec3 c1=vec3(0.13,0.10,0.32), c2=vec3(0.55,0.20,0.45), c3=vec3(0.95,0.42,0.25),
         c4=vec3(1.00,0.75,0.40), c5=vec3(1.00,0.96,0.85);
    if(t<0.25) return mix(c1,c2,t/0.25);
    if(t<0.50) return mix(c2,c3,(t-0.25)/0.25);
    if(t<0.75) return mix(c3,c4,(t-0.50)/0.25);
    return mix(c4,c5,(t-0.75)/0.25);
  }
  if(p == 2){ // TOPO banded
    vec3 c1=vec3(0.16,0.35,0.22), c2=vec3(0.42,0.52,0.28), c3=vec3(0.65,0.58,0.38),
         c4=vec3(0.48,0.36,0.26), c5=vec3(0.92,0.90,0.84);
    float b = floor(t*6.0)/6.0;
    if(b<0.2) return mix(c1,c2,b/0.2);
    if(b<0.4) return mix(c2,c3,(b-0.2)/0.2);
    if(b<0.6) return mix(c3,c4,(b-0.4)/0.2);
    if(b<0.8) return mix(c4,c5,(b-0.6)/0.2);
    return c5;
  }
  if(p == 3){ // GAMEBOY
    vec3 c1=vec3(0.05,0.09,0.06), c2=vec3(0.19,0.38,0.19),
         c3=vec3(0.54,0.67,0.32), c4=vec3(0.85,0.92,0.62);
    float b = floor(t*4.0+0.5)/3.0;
    if(b<0.2) return c1; if(b<0.5) return c2; if(b<0.85) return c3; return c4;
  }
  // ALPINE default
  vec3 c1=vec3(0.08,0.16,0.13), c2=vec3(0.20,0.33,0.22), c3=vec3(0.45,0.44,0.36),
       c4=vec3(0.62,0.60,0.55), c5=vec3(0.96,0.95,0.90);
  if(t<0.25) return mix(c1,c2,t/0.25);
  if(t<0.50) return mix(c2,c3,(t-0.25)/0.25);
  if(t<0.75) return mix(c3,c4,(t-0.50)/0.25);
  return mix(c4,c5,(t-0.75)/0.25);
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 pix = floor(frag / u_pixel) * u_pixel + u_pixel * 0.5;
  vec2 uvFull = coverUv(frag);
  vec2 uvPix = coverUv(pix);
  vec3 clean = texture(u_img, clamp(uvFull, 0.001, 0.999)).rgb;
  float lum = dot(texture(u_img, clamp(uvPix, 0.001, 0.999)).rgb, vec3(0.299, 0.587, 0.114));
  float th = bayer(pix, u_bayerLog);
  float steps = (u_palette == 3) ? 4.0 : 6.0;
  float q = lum * steps + (th - 0.5) * 1.4;
  float qi = clamp((floor(q) + step(1.0 - fract(q), th)) / steps, 0.0, 1.0);
  vec3 dith = pal(qi, u_palette);
  if(u_palette == 2){
    float c = abs(fract(lum * 22.0) - 0.5);
    dith *= (1.0 - smoothstep(0.06, 0.02, c) * 0.25);
  }
  float m = min(u_res.x, u_res.y);
  float d = distance(frag, u_mouse) / m;
  float r = u_reveal;
  float inside = (r <= 0.001) ? 0.0 : smoothstep(r, r * 0.55, d);
  vec3 col = mix(dith, clean * 1.04, inside);
  float vig = smoothstep(1.3, 0.4, length(frag / u_res - 0.5) * 2.0);
  col *= mix(0.8, 1.0, vig);
  col += (hash(frag + fract(u_time)) - 0.5) * 0.035;
  o = vec4(col, 1.0);
}`;

const state = { pal: 0, pixel: 3, bayerLog: 3, reveal: 0.22, drift: true };
let webglDead = false;
let imgW = 1920, imgH = 1253;

function compile(gl: WebGL2RenderingContext, type: number, src: string, label: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(label + ' compile failed: ' + (gl.getShaderInfoLog(s) || 'no log'));
  }
  return s;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('image load failed: ' + src));
    img.src = src;
  });
}

// ---- Canvas2D static-dither fallback (same photo, cannot fail on GPU) ----
const PAL_STOPS: number[][][] = [
  [[8, 41, 33], [51, 84, 56], [115, 112, 92], [158, 153, 140], [245, 242, 230]],
  [[33, 26, 82], [140, 51, 115], [242, 107, 64], [255, 191, 102], [255, 245, 217]],
  [[41, 89, 56], [107, 133, 71], [166, 148, 97], [122, 92, 66], [235, 230, 214]],
  [[13, 23, 15], [48, 97, 48], [138, 171, 82], [217, 235, 158]],
];
const BAYER8: number[][] = (() => {
  let m: number[][] = [[0]];
  for (let s = 1; s < 8; s *= 2) {
    const n = s * 2;
    const nx: number[][] = Array.from({ length: n }, () => new Array(n));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const off = [[0, 2], [3, 1]][y >= s ? 1 : 0][x >= s ? 1 : 0];
      nx[y][x] = m[y % s][x % s] * 4 + off;
    }
    m = nx;
  }
  return m;
})();

function palLerp(pal: number, t: number): [number, number, number] {
  const stops = PAL_STOPS[pal];
  if (stops.length === 4) {
    const idx = t < 0.2 ? 0 : t < 0.5 ? 1 : t < 0.85 ? 2 : 3;
    return stops[idx] as [number, number, number];
  }
  const x = Math.min(0.9999, Math.max(0, t)) * 4;
  const i = Math.floor(x), f = x - i;
  const a = stops[i], b2 = stops[i + 1];
  return [a[0] + (b2[0] - a[0]) * f, a[1] + (b2[1] - a[1]) * f, a[2] + (b2[2] - a[2]) * f];
}

async function renderStaticFallback(): Promise<void> {
  const img = await loadImage('./photo.jpg');
  const block = state.pixel;
  const W = 320, H = Math.round((W * img.naturalHeight) / img.naturalWidth);
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const octx = off.getContext('2d', { willReadFrequently: true })!;
  octx.drawImage(img, 0, 0, W, H);
  const src = octx.getImageData(0, 0, W, H);
  const out = octx.createImageData(W, H);
  const steps = state.pal === 3 ? 4 : 6;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const bx = Math.floor(x / block) * block, by = Math.floor(y / block) * block;
      const i = (by * W + bx) * 4;
      const lum = (src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114) / 255;
      const th = (BAYER8[by & 7][bx & 7] + 0.5) / 64;
      const q = lum * steps + (th - 0.5) * 1.4;
      const qi = Math.min(1, Math.max(0, Math.floor(q + 0.5) / steps));
      const [r, g, b] = palLerp(state.pal, qi);
      const o = (y * W + x) * 4;
      out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = b; out.data[o + 3] = 255;
    }
  }
  const fb = document.getElementById('fbCanvas') as HTMLCanvasElement;
  fb.width = W; fb.height = H;
  fb.getContext('2d')!.putImageData(out, 0, 0);
}

async function bootFallback(reason: string): Promise<void> {
  webglDead = true;
  (document.getElementById('gl') as HTMLCanvasElement).style.display = 'none';
  document.getElementById('fallback')!.classList.remove('hidden');
  document.getElementById('fallbackMsg')!.textContent = 'WEBGL OFFLINE — ' + reason;
  try {
    await renderStaticFallback();
  } catch (e) {
    document.getElementById('fallbackMsg')!.textContent += ' (static render also failed: ' + (e as Error).message + ')';
  }
  document.getElementById('palettes')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b || !webglDead) return;
    state.pal = Number(b.dataset.pal);
    document.querySelectorAll('#palettes button').forEach((x) => x.classList.toggle('on', x === b));
    void renderStaticFallback();
  });
  document.getElementById('pixel')!.addEventListener('input', (e) => {
    if (!webglDead) return;
    state.pixel = Number((e.target as HTMLInputElement).value);
    document.getElementById('pixelV')!.textContent = String(state.pixel);
    void renderStaticFallback();
  });
}

async function main() {
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  const mouse: [number, number] = [innerWidth / 2, innerHeight / 2];
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2', { antialias: false });
  } catch (e) {
    await bootFallback('context creation threw: ' + (e as Error).message);
    return;
  }
  if (!gl) {
    await bootFallback('this browser returned no WebGL2 context (hardware acceleration off or blocklisted).');
    return;
  }
  const glc: WebGL2RenderingContext = gl;
  const prog = glc.createProgram()!;
  glc.attachShader(prog, compile(glc, glc.VERTEX_SHADER, VERT, 'vertex'));
  glc.attachShader(prog, compile(glc, glc.FRAGMENT_SHADER, FRAG, 'fragment'));
  glc.linkProgram(prog);
  if (!glc.getProgramParameter(prog, glc.LINK_STATUS)) {
    throw new Error('program link failed: ' + (glc.getProgramInfoLog(prog) || 'no log'));
  }
  glc.useProgram(prog);

  const buf = glc.createBuffer();
  glc.bindBuffer(glc.ARRAY_BUFFER, buf);
  glc.bufferData(glc.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), glc.STATIC_DRAW);
  glc.enableVertexAttribArray(0);
  glc.vertexAttribPointer(0, 2, glc.FLOAT, false, 0, 0);

  const img = await loadImage('./photo.jpg');
  imgW = img.naturalWidth; imgH = img.naturalHeight;
  const t = glc.createTexture()!;
  glc.bindTexture(glc.TEXTURE_2D, t);
  glc.texImage2D(glc.TEXTURE_2D, 0, glc.RGBA, glc.RGBA, glc.UNSIGNED_BYTE, img);
  glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_S, glc.CLAMP_TO_EDGE);
  glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_T, glc.CLAMP_TO_EDGE);
  glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MIN_FILTER, glc.LINEAR);
  glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MAG_FILTER, glc.LINEAR);

  const U = (n: string) => glc.getUniformLocation(prog, n);
  const u = {
    img: U('u_img'), res: U('u_res'), imgSize: U('u_imgSize'), mouse: U('u_mouse'),
    time: U('u_time'), pixel: U('u_pixel'), reveal: U('u_reveal'),
    bayerLog: U('u_bayerLog'), palette: U('u_palette'),
  };
  glc.uniform1i(u.img, 0);
  document.getElementById('readout')!.textContent = `TUNNEL VIEW · ${imgW}x${imgH} · WEBGL2 · DILIFF CC BY-SA`;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    glc.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  addEventListener('resize', resize);
  let lastMove = -1e9;
  addEventListener('pointermove', (e) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    mouse[0] = e.clientX * dpr;
    mouse[1] = (innerHeight - e.clientY) * dpr;
    lastMove = performance.now();
  });

  const bayerNames = ['', '2x2', '4x4', '8x8'];
  document.getElementById('palettes')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b || webglDead) return;
    state.pal = Number(b.dataset.pal);
    document.querySelectorAll('#palettes button').forEach((x) => x.classList.toggle('on', x === b));
  });
  const pixel = document.getElementById('pixel') as HTMLInputElement;
  const setPixel = (v: number) => {
    state.pixel = Math.max(1, Math.min(8, Math.round(v)));
    pixel.value = String(state.pixel);
    document.getElementById('pixelV')!.textContent = String(state.pixel);
  };
  pixel.addEventListener('input', () => setPixel(Number(pixel.value)));
  addEventListener('wheel', (e) => setPixel(state.pixel + (e.deltaY > 0 ? 1 : -1)), { passive: true });
  const bayer = document.getElementById('bayer') as HTMLInputElement;
  bayer.addEventListener('input', () => { state.bayerLog = Number(bayer.value); document.getElementById('bayerV')!.textContent = bayerNames[state.bayerLog]; });
  const reveal = document.getElementById('reveal') as HTMLInputElement;
  reveal.addEventListener('input', () => { state.reveal = Number(reveal.value) / 100; document.getElementById('revealV')!.textContent = reveal.value; });
  const driftBtn = document.getElementById('driftBtn')!;
  driftBtn.addEventListener('click', () => { state.drift = !state.drift; driftBtn.textContent = 'DRIFT: ' + (state.drift ? 'ON' : 'OFF'); driftBtn.classList.toggle('on', state.drift); });
  const shaderBtn = document.getElementById('shaderBtn')!;
  const shaderView = document.getElementById('shaderView')!;
  shaderBtn.addEventListener('click', () => {
    shaderView.textContent = FRAG;
    shaderView.classList.toggle('hidden');
  });

  const fps = document.getElementById('fps')!;
  let frames = 0, last = performance.now(), t0 = last;
  function frame(now: number) {
    const t = (now - t0) / 1000;
    if (state.drift && now - lastMove > 3000) {
      mouse[0] = (0.5 + Math.sin(t * 0.21) * 0.28) * canvas.width;
      mouse[1] = (0.5 + Math.cos(t * 0.13) * 0.22) * canvas.height;
    }
    glc.uniform2f(u.res, canvas.width, canvas.height);
    glc.uniform2f(u.imgSize, imgW, imgH);
    glc.uniform2f(u.mouse, mouse[0], mouse[1]);
    glc.uniform1f(u.time, t);
    glc.uniform1f(u.pixel, state.pixel);
    glc.uniform1f(u.reveal, state.reveal);
    glc.uniform1i(u.bayerLog, state.bayerLog);
    glc.uniform1i(u.palette, state.pal);
    glc.drawArrays(glc.TRIANGLES, 0, 3);
    frames++;
    if (now - last > 500) { fps.textContent = Math.round((frames * 1000) / (now - last)) + ' fps'; frames = 0; last = now; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main().catch((e) => {
  console.error(e);
  void bootFallback('render failed: ' + (e instanceof Error ? e.message : String(e)));
});
