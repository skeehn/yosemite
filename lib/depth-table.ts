// Pure depth-table utilities. No three.js, no DOM beyond canvas 2D for decode.
// White = far, black = near. All sampling bilinear.

export type DepthTable = {
  w: number;
  h: number;
  data: Float32Array;
};

const cache = new Map<string, Promise<DepthTable>>();

export function loadDepthTable(url: string): Promise<DepthTable> {
  const hit = cache.get(url);
  if (hit) return hit;
  const p = (async () => {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('depth load failed: ' + url));
      im.src = url;
    });
    const TW = 160;
    const TH = Math.max(1, Math.round((TW * img.naturalHeight) / img.naturalWidth));
    const c = document.createElement('canvas');
    c.width = TW;
    c.height = TH;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, TW, TH);
    const d = ctx.getImageData(0, 0, TW, TH).data;
    const data = new Float32Array(TW * TH);
    for (let i = 0; i < TW * TH; i++) data[i] = d[i * 4] / 255;
    return { w: TW, h: TH, data };
  })();
  cache.set(url, p);
  return p;
}

export function sampleDepth(t: DepthTable, u: number, vTop: number): number {
  const x = Math.min(0.9999, Math.max(0, u)) * (t.w - 1);
  const y = Math.min(0.9999, Math.max(0, vTop)) * (t.h - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (yy: number, xx: number) =>
    t.data[Math.min(t.h - 1, yy) * t.w + Math.min(t.w - 1, xx)];
  return (
    at(y0, x0) * (1 - fx) * (1 - fy) +
    at(y0, x0 + 1) * fx * (1 - fy) +
    at(y0 + 1, x0) * (1 - fx) * fy +
    at(y0 + 1, x0 + 1) * fx * fy
  );
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** World-space relief height. Plane is planeW x planeH centered on origin, facing +z. */
export function terrainZ(
  t: DepthTable | null,
  x: number,
  y: number,
  relief: number,
  planeW = 19,
  planeH = 12.4
): number {
  if (!t) return 0;
  const u = clamp01((x + planeW / 2) / planeW);
  const vTop = clamp01(1 - (y + planeH / 2) / planeH);
  return relief * (1.2 - 2.4 * sampleDepth(t, u, vTop));
}

export function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
