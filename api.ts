// Public API of the reusable scene. The future website talks to ValleyScene
// only through these props and callbacks: props in, events out.
export type UiMode = 'orbit' | 'explore' | 'scroll';
export type PaletteMode = 0 | 1 | 2 | 3 | 4 | 5; // full, alpine, sunset, topo, gameboy, 1-bit
export type SunMode = 'day' | 'sunset';

export type HoverPoi = { id: string; label: string; blurb: string } | null;
export type HoverTerrain = { elevPct: number; x: number; y: number } | null;

export type ValleySceneProps = {
  vistaId: string;
  uiMode: UiMode;
  palette: PaletteMode;
  /** base pixel size 1-8; explore mode adds density on top */
  pixel: number;
  bayerLog: number;
  relief: number;
  /** orbit viewpoint id (from vista.views) */
  view: string;
  spin: boolean;
  hike: boolean;
  sun: SunMode;
  tour: boolean;
  /** null = internal ScrollControls chapters; number 0-1 = host-driven scroll */
  scrollProgress: number | null;
  onFps: (n: number) => void;
  onReady: () => void;
  onHoverPoi: (h: HoverPoi) => void;
  onHoverTerrain: (h: HoverTerrain) => void;
  onChapter: (index: number, label: string) => void;
  onSelectPoi: (id: string) => void;
};

export type ValleyApi = {
  flyToView: (id: string) => void;
  flyToPoi: (id: string) => void;
};
