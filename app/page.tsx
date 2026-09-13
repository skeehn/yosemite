'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { VISTAS } from '../data/vistas';
import type { PaletteMode, UiMode, SunMode, HoverPoi, HoverTerrain } from '../api';
import { POST_SHADER_SOURCE } from '../scene/post-shader';

const ValleyScene = dynamic(() => import('../scene/valley-scene'), { ssr: false });

const PALS: { id: PaletteMode; label: string; sw: string }[] = [
  { id: 0, label: 'FULL', sw: 'linear-gradient(135deg,#7fa8c9,#3d5a3a 55%,#c9bfa5)' },
  { id: 1, label: 'ALPINE', sw: 'linear-gradient(135deg,#14291f,#73705c 60%,#f5f2e6)' },
  { id: 2, label: 'SUNSET', sw: 'linear-gradient(135deg,#211a52,#f26b40 60%,#fff5d9)' },
  { id: 3, label: 'TOPO', sw: 'linear-gradient(135deg,#295937,#a89461 60%,#ebe6d6)' },
  { id: 4, label: 'GAMEBOY', sw: 'linear-gradient(135deg,#0d1710,#619154 60%,#d9eb9e)' },
  { id: 5, label: '1-BIT', sw: 'linear-gradient(135deg,#11100e 50%,#efe9dc 50%)' },
];
const BAYER_NAMES = ['', '2x2', '4x4', '8x8'];

export default function Page() {
  const [vistaId, setVistaId] = useState('tunnel-view');
  const [mode, setMode] = useState<UiMode>('orbit');
  const [pal, setPal] = useState<PaletteMode>(0);
  const [pixel, setPixel] = useState(2);
  const [bayer, setBayer] = useState(3);
  const [relief, setRelief] = useState(1);
  const [view, setView] = useState('valley');
  const [spin, setSpin] = useState(true);
  const [sun, setSun] = useState<SunMode>('day');
  const [tune, setTune] = useState(false);
  const [fps, setFps] = useState('— fps');
  const [ready, setReady] = useState(false);
  const [showShader, setShowShader] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const [chapter, setChapter] = useState('');
  const [hoverPoi, setHoverPoi] = useState<HoverPoi>(null);
  const [hoverTerrain, setHoverTerrain] = useState<HoverTerrain>(null);

  const vista = VISTAS.find((v) => v.id === vistaId) ?? VISTAS[0];
  const scrolling = mode === 'scroll';

  const onFps = useCallback((n: number) => setFps(n + ' fps'), []);
  const onReady = useCallback(() => setReady(true), []);
  const onHoverPoi = useCallback((h: HoverPoi) => setHoverPoi(h), []);
  const onHoverTerrain = useCallback((h: HoverTerrain) => setHoverTerrain(h), []);
  const onChapter = useCallback((_i: number, label: string) => setChapter(label), []);
  const onSelectPoi = useCallback((_id: string) => {}, []);

  useEffect(() => {
    document.body.classList.toggle('chrome-hidden', uiHidden);
    if (!uiHidden) return;
    const show = () => setUiHidden(false);
    window.addEventListener('pointermove', show, { once: true });
    return () => window.removeEventListener('pointermove', show);
  }, [uiHidden]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') setUiHidden((v) => !v);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const pickVista = (id: string) => {
    const v = VISTAS.find((x) => x.id === id)!;
    setVistaId(id);
    setView(v.defaultView);
  };

  return (
    <>
      <div id="stage">
        <ValleyScene
          vistaId={vistaId}
          uiMode={mode}
          palette={pal}
          pixel={pixel}
          bayerLog={bayer}
          relief={relief}
          view={view}
          spin={spin && !scrolling}
          sun={sun}
          scrollProgress={null}
          onFps={onFps}
          onReady={onReady}
          onHoverPoi={onHoverPoi}
          onHoverTerrain={onHoverTerrain}
          onChapter={onChapter}
          onSelectPoi={onSelectPoi}
        />
      </div>
      <div id="veil" className={ready ? 'hidden' : ''}>CARVING VALLEY…</div>

      <header className="hud top">
        <div className="brand">YOSEMITE<span>{vista.label} · DIORAMA</span></div>
        <div className="coords">{fps} · {scrolling && chapter ? chapter : 'DOLLY'}</div>
      </header>

      {hoverPoi && (
        <div className="hud poicard">
          <div className="poicard-title">{hoverPoi.label}</div>
          <div className="poicard-sub">{hoverPoi.blurb}</div>
        </div>
      )}
      {hoverTerrain && (
        <div className="hud chip">RELIEF {hoverTerrain.elevPct}%</div>
      )}
      {scrolling && chapter && (
        <div className="hud chapter">{chapter}</div>
      )}

      <nav className="hud dock">
        <div className="seg">
          <button className={mode === 'orbit' ? 'on' : ''} onClick={() => setMode('orbit')}>DOLLY</button>
          <button className={scrolling ? 'on' : ''} onClick={() => setMode('scroll')}>SCROLL</button>
        </div>
        <span className="div" />
        <div className="dots">
          {PALS.map((p) => (
            <button key={p.id} title={p.label} className={'dot' + (pal === p.id ? ' on' : '')} onClick={() => setPal(p.id)}>
              <span style={{ background: p.sw }} />
            </button>
          ))}
        </div>
        <span className="div" />
        <button className={tune ? 'on' : ''} onClick={() => setTune(!tune)}>TUNE</button>
        {tune && (
          <div className="tune">
            <div className="tune-row">
              {VISTAS.map((v) => (
                <button key={v.id} className={vistaId === v.id ? 'on' : ''} onClick={() => pickVista(v.id)}>
                  {v.label}
                </button>
              ))}
            </div>
            {!scrolling && (
              <div className="tune-row">
                {Object.entries(vista.views).map(([id, v]) => (
                  <button key={id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>
                    {v.label}
                  </button>
                ))}
              </div>
            )}
            <label>PIXEL <input type="range" min={1} max={8} step={1} value={pixel} onChange={(e) => setPixel(Number(e.target.value))} /><b>{pixel}</b></label>
            <label>BAYER <input type="range" min={1} max={3} step={1} value={bayer} onChange={(e) => setBayer(Number(e.target.value))} /><b>{BAYER_NAMES[bayer]}</b></label>
            <label>RELIEF <input type="range" min={20} max={200} step={1} value={Math.round(relief * 100)} onChange={(e) => setRelief(Number(e.target.value) / 100)} /><b>{relief.toFixed(1)}x</b></label>
            <div className="tune-row">
              <button className={sun === 'day' ? 'on' : ''} onClick={() => setSun('day')}>DAY</button>
              <button className={sun === 'sunset' ? 'on' : ''} onClick={() => setSun('sunset')}>SUNSET</button>
              {mode === 'orbit' && (
                <button className={spin ? 'on' : ''} onClick={() => setSpin(!spin)}>SPIN</button>
              )}
              <button onClick={() => setShowShader(!showShader)}>SHADER</button>
              <button onClick={() => setUiHidden(true)}>HIDE</button>
            </div>
            <div className="vista-blurb">{vista.blurb} · photo {vista.credit}</div>
            <div className="hint">scroll zooms to cursor · drag pans · right-drag orbits · H hides interface</div>
          </div>
        )}
      </nav>

      {showShader && <pre id="shaderView">{POST_SHADER_SOURCE}</pre>}
    </>
  );
}
