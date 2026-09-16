export const runtime = 'edge';

export const metadata = {
  title: 'Valley — Yosemite, alive',
  description: 'A living dithered backdrop: true-depth Yosemite relief under ordered Bayer dithering.',
};

import ValleyCanvas from '../components/valley-canvas';

export default function Page() {
  return (
    <main className="valley-page">
      <ValleyCanvas />
      <section className="valley-scroll">
        <div className="card">
          <h2>How it holds together</h2>
          <p>
            A monocular depth network reads the photograph once, at build time.
            The browser displaces 50,000 vertices by that depth every frame,
            grades day into sunset, then crushes the result through ordered
            dithering — so the valley shimmers instead of banding.
          </p>
        </div>
      </section>
    </main>
  );
}
