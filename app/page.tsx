'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { VISTAS } from '../data/vistas';
import type { PaletteMode, SunMode } from '../api';

const ValleyScene = dynamic(() => import('../scene/valley-scene'), { ssr: false });

const PALS: { id: PaletteMode; label: string; sw: string }[] = [
  { id: 0, label: 'FULL', sw: 'linear-gradient(135deg,#7fa8c9,#3d5a3a 55%,#c9bfa5)' },
  { id: 1, label: 'ALPINE', sw: 'linear-gradient(135deg,#14291f,#73705c 60%,#f5f2e6)' },
  { id: 2, label: 'SUNSET', sw: 'linear-gradient(135deg,#211a52,#f26b40 60%,#fff5d9)' },
  { id: 3, label: 'TOPO', sw: 'linear-gradient(135deg,#295937,#a89461 60%,#ebe6d6)' },
  { id: 4, label: 'GAMEBOY', sw: 'linear-gradient(135deg,#0d1710,#619154 60%,#d9eb9e)' },
  { id: 5, label: '1-BIT', sw: 'linear-gradient(135deg,#11100e 50%,#efe9dc 50%)' },
];

export default function Page() {
  const [vistaIdx, setVistaIdx] = useState(0);
  const [local, setLocal] = useState(0);
  const [sun, setSun] = useState<SunMode>('day');
  const [pal, setPal] = useState<PaletteMode>(0);
  const [ready, setReady] = useState(false);
  const vista = VISTAS[vistaIdx] ?? VISTAS[0];

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        const f = p * VISTAS.length;
        setVistaIdx(Math.min(VISTAS.length - 1, Math.floor(f)));
        setLocal(Math.min(1, Math.max(0, f - Math.min(VISTAS.length - 1, Math.floor(f)))));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const noop = useCallback(() => {}, []);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <>
      <div id="stage">
        <ValleyScene
          vistaId={vista.id}
          uiMode="scroll"
          palette={pal}
          pixel={4}
          bayerLog={3}
          relief={1}
          depthSplit={11}
          view={vista.defaultView}
          spin={false}
          sun={sun}
          scrollProgress={local}
          onFps={noop}
          onReady={onReady}
          onHoverPoi={noop}
          onHoverTerrain={noop}
          onChapter={noop}
          onSelectPoi={noop}
        />
      </div>
      <div id="veil" className={ready ? 'hidden' : ''}>YOSEMITE</div>

      <button id="sunbtn" onClick={() => setSun(sun === 'day' ? 'sunset' : 'day')}>
        {sun === 'day' ? 'DAY' : 'SUNSET'}
      </button>

      <main className="site">
        <section className="hero">
          <div className="kicker">YOSEMITE · A DITHERED VALLEY</div>
          <h1>Stone<br />Light<br />Pixels</h1>
          <div className="cue">SCROLL TO TRAVEL<span /></div>
        </section>

        {VISTAS.map((v, i) => (
          <section key={v.id} className={'vsec' + (i % 2 ? ' right' : '')}>
            <div className="card">
              <div className="num">0{i + 1}</div>
              <div className="name">{v.label}</div>
              <div className="sub">{v.sub}</div>
              <p>{v.blurb}</p>
              <div className="credit">PHOTO {v.credit}</div>
            </div>
          </section>
        ))}

        <footer className="foot">
          <div className="dots">
            {PALS.map((p) => (
              <button key={p.id} title={p.label} className={'dot' + (pal === p.id ? ' on' : '')} onClick={() => setPal(p.id)}>
                <span style={{ background: p.sw }} />
              </button>
            ))}
          </div>
          <div className="hint">RENDERED LIVE · BAYER ORDERED DITHER · MOVE YOUR CURSOR, IT LEANS BACK</div>
        </footer>
      </main>
    </>
  );
}
