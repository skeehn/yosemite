// Vista catalog: every explorable photo-world in one typed place.
// Add a vista here (photo + depth + pois) and the UI + scene pick it up.

export type Vec3 = [number, number, number];

export type Viewpoint = { label: string; pos: Vec3; tgt: Vec3 };

export type Poi = {
  id: string;
  label: string;
  blurb: string;
  /** position on the relief plane, z derived from depth at runtime */
  at: [number, number];
  /** where the camera flies when the poi is chosen */
  goal: { pos: Vec3; tgt: Vec3 };
};

export type FallsStrip = { x: number; top: number; span: number };

export type Vista = {
  id: string;
  label: string;
  sub: string;
  photo: string;
  depth: string;
  credit: string;
  blurb: string;
  /** plane size; height follows photo aspect via planeAspect */
  planeW: number;
  planeAspect: number;
  trees: boolean;
  falls: FallsStrip | null;
  pois: Poi[];
  views: Record<string, Viewpoint>;
  defaultView: string;
};

export const VISTAS: Vista[] = [
  {
    id: 'tunnel-view',
    label: 'TUNNEL VIEW',
    sub: 'El Capitan · Half Dome · Bridalveil',
    photo: '/photos/tunnel-view.jpg',
    depth: '/depths/tunnel-view.png',
    credit: 'Diliff · CC BY-SA 3.0',
    blurb: 'The classic valley overlook, dawn light on granite.',
    planeW: 19,
    planeAspect: 1920 / 1253,
    trees: true,
    falls: { x: 5.6, top: 3.6, span: 4.6 },
    pois: [
      {
        id: 'elcap', label: 'EL CAPITAN', blurb: '3,000 ft of granite. Big-wall climbing birthplace.',
        at: [-5.2, 2.2], goal: { pos: [-4.5, 1.6, 6.5], tgt: [-5.2, 1.6, 0] },
      },
      {
        id: 'falls', label: 'BRIDALVEIL FALL', blurb: '620 ft. Strongest flow in late spring.',
        at: [5.6, 2.6], goal: { pos: [4.2, 1.8, 6.2], tgt: [5.6, 1.8, 0] },
      },
      {
        id: 'dome', label: 'HALF DOME', blurb: '8,800 ft. Cables route since 1919.',
        at: [0.8, 2.0], goal: { pos: [0.8, 1.6, 6.8], tgt: [0.8, 1.4, -1] },
      },
    ],
    views: {
      valley: { label: 'VALLEY', pos: [0, 1.1, 12], tgt: [0, 0.3, 0] },
      elcap: { label: 'EL CAP', pos: [-6.5, 1.7, 8.5], tgt: [-4, 1, 0] },
      falls: { label: 'FALLS', pos: [5.5, 1.3, 9], tgt: [3.5, 0.8, 0] },
      dome: { label: 'DOME', pos: [1.5, 2.2, 9.5], tgt: [0.5, 1.2, -1] },
    },
    defaultView: 'valley',
  },
  {
    id: 'half-dome',
    label: 'HALF DOME',
    sub: 'Glacier Point · golden hour',
    photo: '/photos/half-dome.jpg',
    depth: '/depths/half-dome.png',
    credit: 'Diliff · CC BY-SA 3.0',
    blurb: 'The dome at sunset from Glacier Point.',
    planeW: 19,
    planeAspect: 1920 / 1207,
    trees: true,
    falls: null,
    pois: [
      {
        id: 'dome', label: 'HALF DOME', blurb: '8,800 ft. Cables route since 1919.',
        at: [1.2, 1.4], goal: { pos: [1.0, 1.6, 6.8], tgt: [1.0, 1.4, -1] },
      },
      {
        id: 'valleyfloor', label: 'VALLEY FLOOR', blurb: '4,000 ft below the rim.',
        at: [-3.5, -2.5], goal: { pos: [-3.0, -1.0, 7.5], tgt: [-3.5, -2.0, 0] },
      },
    ],
    views: {
      main: { label: 'DOME', pos: [0, 1.1, 12], tgt: [0, 0.5, 0] },
      face: { label: 'FACE', pos: [1.5, 1.8, 8.5], tgt: [1.0, 1.2, 0] },
    },
    defaultView: 'main',
  },
  {
    id: 'bridalveil',
    label: 'BRIDALVEIL CREEK',
    sub: 'Water level · old growth',
    photo: '/photos/bridalveil.jpg',
    depth: '/depths/bridalveil.png',
    credit: 'GualdimG · CC BY-SA 4.0',
    blurb: 'The creek below the fall, boulders and cedar.',
    planeW: 19,
    planeAspect: 1920 / 1440,
    trees: true,
    falls: null,
    pois: [
      {
        id: 'cascades', label: 'CASCADES', blurb: 'Snowmelt running strong into June.',
        at: [0.5, -0.5], goal: { pos: [0.2, 0.2, 7], tgt: [0.5, -0.5, 0] },
      },
      {
        id: 'cedars', label: 'CEDARS', blurb: 'Incense cedar, some 500 years old.',
        at: [-4, 0.5], goal: { pos: [-3.4, 1.0, 7], tgt: [-4, 0.5, 0] },
      },
    ],
    views: {
      main: { label: 'CREEK', pos: [0, 0.6, 12], tgt: [0, -0.5, 0] },
      water: { label: 'WATER', pos: [-2.5, -0.5, 8], tgt: [0.5, -1, 0] },
    },
    defaultView: 'main',
  },
  {
    id: 'el-capitan',
    label: 'EL CAPITAN',
    sub: 'The Captain · meadow edge',
    photo: '/photos/el-capitan.jpg',
    depth: '/depths/el-capitan.png',
    credit: 'Dave Riggs · CC BY-SA 2.0',
    blurb: '3,000 ft of granite from the meadow.',
    planeW: 19,
    planeAspect: 1920 / 1080,
    trees: true,
    falls: null,
    pois: [
      {
        id: 'nose', label: 'THE NOSE', blurb: 'The most famous big-wall route on Earth.',
        at: [0.2, 1.2], goal: { pos: [0.0, 1.4, 7], tgt: [0.2, 1.0, 0] },
      },
      {
        id: 'meadow', label: 'MEADOW', blurb: 'El Cap Meadow, classic first view.',
        at: [-3, -3], goal: { pos: [-2.5, -1.5, 8], tgt: [-3, -2.5, 0] },
      },
    ],
    views: {
      main: { label: 'WALL', pos: [0, 0.8, 12], tgt: [0, 1.5, 0] },
      nose: { label: 'NOSE', pos: [-1.5, 1.5, 8.5], tgt: [0.2, 1.0, 0] },
    },
    defaultView: 'main',
  },
];
