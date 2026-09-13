'use client';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import type { PaletteMode } from '../components/valley-canvas';
import { POST_SHADER_SOURCE } from '../components/valley-canvas';

const ValleyCanvas = dynamic(() => import('../components/valley-canvas'), { ssr: false });

const PALS: { id: PaletteMode; label: string }[] = [
  { id: 0, label: 'FULL' },
  { id: 1, label: 'ALPINE' },
  { id: 2, label: 'SUNSET' },
  { id: 3, label: 'TOPO' },
  { id: 4, label: 'GAMEBOY' },
];
const VIEWS = [
  { id: 'valley', label: 'VALLEY' },
  { id: 'elcap', label: 'EL CAP' },
  { id: 'falls', label: 'FALLS' },
  { id: 'dome', label: 'DOME' },
];
const BAYER_NAMES = ['', '2x2', '4x4', '8x8'];

export default function Page() {
  const [pal, setPal] = useState<PaletteMode>(0);
  const [pixel, setPixel] = useState(3);
  const [bayer, setBayer] = useState(3);
  const [relief, setRelief] = useState(1);
  const [view, setView] = useState('valley');
  const [spin, setSpin] = useState(true);
  const [fps, setFps] = useState('— fps');
  const [ready, setReady] = useState(false);
  const [showShader, setShowShader] = useState(false);
  const onFps = useCallback((n: number) => setFps(n + ' fps'), []);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <>
      <div id="stage">
        <ValleyCanvas
          palette={pal}
          pixel={pixel}
          bayerLog={bayer}
          relief={relief}
          view={view}
          spin={spin}
          onFps={onFps}
          onReady={onReady}
        />
      </div>
      <div id="veil" className={ready ? 'hidden' : ''}>CARVING VALLEY…</div>

      <header className="hud top">
        <div className="brand">YOSEMITE<span>/TUNNEL-VIEW-3D</span></div>
        <div className="coords">NEXT.JS · THREE · R3F · BAYER DITHER POST-PASS</div>
      </header>

      <aside className="hud legend">
        <div>TUNNEL VIEW · DISPLACED RELIEF · 44K TRIS</div>
        <div>{fps}</div>
      </aside>

      <footer className="hud panel">
        <div className="row">
          <div className="group" id="palettes">
            {PALS.map((p) => (
              <button key={p.id} className={pal === p.id ? 'on' : ''} onClick={() => setPal(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="group">
            {VIEWS.map((v) => (
              <button key={v.id} className={view === v.id ? 'on' : ''} onClick={() => setView(v.id)}>
                {v.label}
              </button>
            ))}
            <button className={spin ? 'on' : ''} onClick={() => setSpin(!spin)}>
              SPIN: {spin ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => setShowShader(!showShader)}>SHADER</button>
          </div>
        </div>
        <div className="row sliders">
          <label>PIXEL <input type="range" min={1} max={8} step={1} value={pixel} onChange={(e) => setPixel(Number(e.target.value))} /><b>{pixel}</b></label>
          <label>BAYER <input type="range" min={1} max={3} step={1} value={bayer} onChange={(e) => setBayer(Number(e.target.value))} /><b>{BAYER_NAMES[bayer]}</b></label>
          <label>RELIEF <input type="range" min={20} max={200} step={1} value={Math.round(relief * 100)} onChange={(e) => setRelief(Number(e.target.value) / 100)} /><b>{relief.toFixed(1)}x</b></label>
        </div>
        <div className="hint">drag to orbit · wheel to zoom · depth baked from photo · photo: Diliff CC BY-SA 3.0</div>
      </footer>

      {showShader && <pre id="shaderView">{POST_SHADER_SOURCE}</pre>}
    </>
  );
}
