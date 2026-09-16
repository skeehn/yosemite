export const runtime = 'edge';

export const metadata = {
  title: 'Valley — Yosemite, alive',
  description: 'A living pixel-art backdrop: true-depth Yosemite relief under ordered Bayer dithering.',
};

import ValleyCanvas from '../components/valley-canvas';

const SPECS = [
  {
    k: '01 / depth',
    t: 'True relief, one photo',
    d: 'A monocular network reads Tunnel View once at build time. The browser displaces 50,000 vertices by that depth every frame — no mesh, no scan, just parallax.',
  },
  {
    k: '02 / color',
    t: 'Posterized, on purpose',
    d: 'Hue snaps to 8 steps, value to 12. An 8×8 Bayer matrix breaks every band into grain, so gradients shimmer instead of striping. The pixels are the signature.',
  },
  {
    k: '03 / light',
    t: 'Day into sunset',
    d: 'One uniform crossfades the grade — warm bodies, hotter skies. Distant air drifts on a slow shimmer while the foreground holds still.',
  },
];

export default function Page() {
  return (
    <main className="page">
      <ValleyCanvas />
      <section className="specs">
        <div className="specs-head">
          <span className="eyebrow">how it holds together</span>
        </div>
        <div className="specs-grid">
          {SPECS.map((s) => (
            <div className="spec" key={s.k}>
              <span className="spec-k">{s.k}</span>
              <h2>{s.t}</h2>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
        <div className="specs-foot">
          <a
            href="https://commons.wikimedia.org/wiki/File:Tunnel_View_3,_Yosemite_Valley,_Yosemite_NP_-_Diliff.jpg"
            target="_blank"
            rel="noreferrer"
          >
            Tunnel View — Diliff · CC BY-SA 3.0 · Wikimedia Commons
          </a>
        </div>
      </section>
    </main>
  );
}
