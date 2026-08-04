import * as THREE from "three";

/**
 * The Status board's face: a global network operations display.
 *
 * Dotted continents, lit hub nodes with great-circle links, a hexagonal mesh
 * across the foreground and blue telemetry read-outs down the sides.
 *
 * Painted once into a canvas and cached at module level, like
 * screenTextures/duoTextures/roadmapTexture. Deterministic throughout — a
 * seeded PRNG, never Math.random — so the board is identical on every load and
 * cannot cause a hydration mismatch.
 */

const W = 1400;
const H = 1000;

/** Crops the poles: the reference shows no Antarctica and no polar cap. */
const LAT_TOP = 80;
const LAT_BOTTOM = -58;

const px = (lon: number) => ((lon + 180) / 360) * W;
const py = (lat: number) => ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * H;

function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Coarse continent outlines as [lon, lat]. Deliberately low-fidelity: the map
 * is rendered as a ~7px dot halftone, so anything finer than a few degrees is
 * thrown away by the stipple anyway.
 */
const LANDMASSES: [number, number][][] = [
  // North America
  [
    [-168, 66], [-160, 71], [-140, 70], [-125, 71], [-110, 69], [-95, 72],
    [-82, 73], [-70, 70], [-62, 60], [-55, 52], [-60, 47], [-66, 45],
    [-70, 42], [-75, 36], [-81, 31], [-80, 25], [-88, 21], [-97, 22],
    [-105, 20], [-110, 24], [-114, 30], [-120, 35], [-124, 40], [-125, 49],
    [-132, 55], [-140, 60], [-152, 58], [-165, 60],
  ],
  // Central America tail
  [
    [-92, 18], [-84, 16], [-78, 9], [-83, 8], [-88, 13], [-94, 16],
  ],
  // South America
  [
    [-81, 6], [-76, 9], [-70, 12], [-62, 10], [-52, 5], [-44, -2],
    [-35, -6], [-39, -14], [-48, -25], [-56, -35], [-58, -40], [-64, -43],
    [-66, -51], [-72, -55], [-75, -49], [-73, -40], [-71, -30], [-70, -18],
    [-76, -10], [-81, -4],
  ],
  // Africa
  [
    [-17, 21], [-6, 32], [10, 34], [25, 32], [33, 31], [36, 22],
    [43, 12], [51, 11], [44, -2], [40, -11], [35, -19], [33, -26],
    [27, -33], [19, -35], [13, -22], [9, -1], [5, 4], [-4, 5],
    [-12, 8], [-17, 15],
  ],
  // Eurasia
  [
    [-10, 36], [-9, 43], [-2, 49], [5, 53], [8, 58], [5, 62],
    [14, 67], [24, 70], [32, 70], [45, 68], [60, 71], [75, 73],
    [90, 75], [105, 77], [118, 74], [132, 72], [145, 70], [160, 70],
    [172, 66], [178, 64], [168, 60], [158, 59], [146, 55], [138, 50],
    [131, 43], [126, 38], [122, 31], [117, 23], [110, 21], [105, 10],
    [100, 6], [97, 16], [92, 21], [87, 21], [80, 10], [77, 8],
    [72, 20], [66, 24], [60, 25], [54, 26], [50, 29], [45, 30],
    [43, 39], [36, 36], [28, 40], [20, 42], [13, 45], [3, 42],
  ],
  // Greenland
  [
    [-45, 60], [-52, 68], [-58, 73], [-55, 79], [-42, 82], [-28, 82],
    [-20, 76], [-25, 69], [-36, 63],
  ],
  // Australia
  [
    [113, -22], [114, -33], [119, -35], [129, -32], [138, -35], [147, -39],
    [151, -37], [153, -28], [146, -19], [142, -11], [136, -12], [130, -11],
    [125, -14], [120, -20],
  ],
  // India / SE Asia islands, Japan, UK, Madagascar, NZ
  [[43, -12], [50, -15], [50, -25], [45, -25], [43, -18]],
  [[130, 32], [135, 34], [141, 40], [144, 44], [139, 36], [134, 33]],
  [[-6, 50], [-6, 56], [-3, 58], [0, 54], [1, 51]],
  [[95, 5], [106, 6], [119, 5], [117, -3], [105, -6], [95, -1]],
  [[166, -46], [174, -41], [178, -37], [173, -35], [167, -44]],
];

/** Lit hub nodes: [lon, lat, importance 0-1]. */
const HUBS: [number, number, number][] = [
  [-122, 37, 1], [-74, 41, 1], [-99, 20, 0.6], [-46, -23, 0.8],
  [-58, -34, 0.5], [-0, 51, 1], [13, 52, 0.7], [37, 55, 0.6],
  [3, 6, 0.6], [31, 30, 0.6], [28, -26, 0.7], [55, 25, 0.8],
  [77, 28, 1], [72, 19, 0.8], [103, 1, 0.8], [116, 39, 1],
  [121, 31, 0.8], [139, 35, 1], [151, -33, 0.8], [-79, 43, 0.5],
  [-3, 40, 0.5], [100, 13, 0.5], [-70, -33, 0.5],
];

/** Great-circle-ish links between hubs, as index pairs into HUBS. */
const LINKS: [number, number][] = [
  [0, 1], [1, 5], [5, 6], [6, 11], [11, 12], [12, 14], [14, 15],
  [15, 17], [17, 18], [0, 17], [1, 3], [3, 10], [10, 11], [5, 8],
  [8, 10], [12, 13], [14, 18], [6, 7], [1, 19], [5, 20], [14, 21],
  [3, 22],
];

function finish(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Renders the landmasses solid into an offscreen canvas. Sampling that mask on
 * a grid is what produces the dot-matrix continents — far cheaper and far more
 * even than trying to scatter dots inside a polygon analytically.
 */
function buildLandMask(): ImageData {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  for (const poly of LANDMASSES) {
    ctx.beginPath();
    poly.forEach(([lon, lat], i) => {
      const x = px(lon);
      const y = py(lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  }
  return ctx.getImageData(0, 0, W, H);
}

function paint(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(77003);

  // --- Deep navy base, brighter toward the centre like a lit panel ---
  ctx.fillStyle = "#04070f";
  ctx.fillRect(0, 0, W, H);
  const wash = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.75);
  wash.addColorStop(0, "#0c1a33");
  wash.addColorStop(0.55, "#071022");
  wash.addColorStop(1, "#03060e");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  // --- Dot-matrix continents ---
  const mask = buildLandMask();
  const STEP = 7;
  for (let y = 0; y < H; y += STEP) {
    for (let x = 0; x < W; x += STEP) {
      const idx = (y * W + x) * 4;
      if (mask.data[idx] < 128) continue;
      // Land fades out toward the bottom, where the hex mesh takes over.
      const depth = 1 - Math.max(0, (y - H * 0.52) / (H * 0.6));
      if (depth <= 0) continue;
      const a = (0.3 + rand() * 0.55) * depth;
      const s = rand() > 0.9 ? 4 : 3;
      // fillRect, not arc()+fill(). This loop runs ~28,000 times and a path
      // per dot dominated the whole paint — enough to stall the first frame by
      // ~200ms on desktop and far worse on a throttled phone. At 3px, minified
      // onto a board a metre wide, a square and a circle are the same dot.
      ctx.fillStyle = `rgba(${(120 + rand() * 60) | 0}, ${(190 + rand() * 50) | 0}, 255, ${a})`;
      ctx.fillRect(x + (rand() - 0.5) * 2, y + (rand() - 0.5) * 2, s, s);
    }
  }

  // Faint coastlines over the stipple, so the shapes stay legible.
  ctx.strokeStyle = "rgba(130, 200, 255, 0.22)";
  ctx.lineWidth = 1.2;
  for (const poly of LANDMASSES) {
    ctx.beginPath();
    poly.forEach(([lon, lat], i) => {
      const x = px(lon);
      const y = py(lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  // --- Hub links: shallow arcs, drawn under the nodes ---
  ctx.lineCap = "round";
  for (const [ai, bi] of LINKS) {
    const [alon, alat] = HUBS[ai];
    const [blon, blat] = HUBS[bi];
    const ax = px(alon);
    const ay = py(alat);
    const bx = px(blon);
    const by = py(blat);
    // Skip links that would wrap the whole map and read as a stray line.
    if (Math.abs(bx - ax) > W * 0.55) continue;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2 - Math.abs(bx - ax) * 0.16;

    ctx.strokeStyle = "rgba(255, 150, 60, 0.16)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx, my, bx, by);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 190, 120, 0.62)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx, my, bx, by);
    ctx.stroke();
  }

  // --- Hub nodes ---
  for (const [lon, lat, weight] of HUBS) {
    const x = px(lon);
    const y = py(lat);
    const r = 3 + weight * 3.5;

    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
    g.addColorStop(0, `rgba(255, 170, 80, ${0.5 * weight})`);
    g.addColorStop(1, "rgba(255, 140, 50, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);

    ctx.fillStyle = "rgba(255, 226, 190, 0.98)";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 170, 90, ${0.5 + weight * 0.4})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Foreground hexagonal mesh ---
  // A pointy-top hex lattice; only the lower band is drawn, so it reads as a
  // network layer in front of the globe rather than a texture over it.
  const HEX_R = 96;
  const hx = HEX_R * Math.sqrt(3);
  const hy = HEX_R * 1.5;
  const verts: [number, number][] = [];
  const seen = new Set<string>();

  ctx.lineWidth = 2.2;
  for (let row = 0; row * hy < H + hy; row++) {
    for (let col = -1; col * hx < W + hx; col++) {
      const cx = col * hx + (row % 2 ? hx / 2 : 0);
      const cy = row * hy;
      if (cy < H * 0.52) continue;

      // Fade in as the mesh descends toward the viewer.
      const t = Math.min(1, (cy - H * 0.5) / (H * 0.45));
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i - 30);
        pts.push([cx + Math.cos(a) * HEX_R, cy + Math.sin(a) * HEX_R]);
      }
      ctx.strokeStyle = `rgba(255, 140, 45, ${0.16 + t * 0.42})`;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
      // Adjacent hexes share corners, so collect each vertex once — otherwise
      // the same glow gradient gets painted up to three times over itself,
      // which is both slower and visibly hotter than intended.
      for (const p of pts) {
        const key = `${Math.round(p[0])},${Math.round(p[1])}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (rand() > 0.45) verts.push(p);
      }
    }
  }

  // Glowing vertices on the mesh.
  for (const [x, y] of verts) {
    if (y < H * 0.5) continue;
    const t = Math.min(1, (y - H * 0.5) / (H * 0.45));
    const r = 4 + t * 7;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, `rgba(255, 160, 60, ${0.45 * t + 0.15})`);
    g.addColorStop(1, "rgba(255, 130, 40, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
    ctx.fillStyle = `rgba(255, 220, 175, ${0.55 + t * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Blue HUD read-outs ---
  const dotGrid = (ox: number, oy: number, cols: number, rows: number) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const on = rand() > 0.42;
        ctx.fillStyle = on
          ? `rgba(120, 210, 255, ${0.3 + rand() * 0.5})`
          : "rgba(90, 140, 200, 0.12)";
        ctx.fillRect(ox + c * 9, oy + r * 9, 5, 5);
      }
    }
  };

  const barChart = (ox: number, oy: number, n: number, h: number) => {
    for (let i = 0; i < n; i++) {
      const bh = 5 + rand() * h;
      ctx.fillStyle = `rgba(${rand() > 0.7 ? "255,150,60" : "110,200,255"}, ${0.35 + rand() * 0.5})`;
      ctx.fillRect(ox + i * 9, oy + h - bh, 5, bh);
    }
  };

  const readoutRows = (ox: number, oy: number, n: number, w: number) => {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = `rgba(130, 200, 255, ${0.18 + rand() * 0.34})`;
      ctx.fillRect(ox, oy + i * 11, 20 + rand() * w, 4);
    }
  };

  dotGrid(64, 470, 9, 6);
  dotGrid(1180, 420, 8, 5);
  barChart(120, 300, 10, 46);
  barChart(1150, 250, 12, 58);
  readoutRows(560, 470, 7, 150);
  readoutRows(64, 250, 5, 90);
  readoutRows(1150, 560, 5, 110);

  // A mini line-chart, as in the reference's side panels.
  ctx.strokeStyle = "rgba(120, 210, 255, 0.6)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i <= 22; i++) {
    const x = 470 + i * 9;
    const y = 610 - Math.sin(i * 0.5) * 14 - rand() * 12;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // --- Title and status line ---
  ctx.font = "700 20px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "rgba(130, 215, 255, 0.9)";
  ctx.fillText("L I V E   S I G N A L S", 60, 74);
  ctx.font = "700 44px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "#eaf4ff";
  ctx.fillText("Global Status", 58, 128);

  ctx.font = "600 19px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "rgba(120, 255, 190, 0.9)";
  ctx.fillText("● ALL SYSTEMS OPERATIONAL", 60, 168);
  ctx.fillStyle = "rgba(150, 190, 235, 0.7)";
  ctx.fillText(`${HUBS.length} REGIONS · ${LINKS.length} ROUTES`, 60, 196);

  // --- Bokeh, the out-of-focus foreground lights ---
  for (let i = 0; i < 26; i++) {
    const x = rand() * W;
    const y = rand() * H * 0.42;
    const r = 12 + rand() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const warm = rand() > 0.25;
    g.addColorStop(0, warm ? "rgba(255,165,70,0.5)" : "rgba(110,200,255,0.4)");
    g.addColorStop(0.7, warm ? "rgba(255,150,60,0.16)" : "rgba(110,190,255,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scanlines — sells "this is a display" more than any amount of detail.
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  return canvas;
}

let cached: THREE.CanvasTexture | null = null;

/** Must be called during client render — there is no canvas during SSR. */
export function getStatusTexture(): THREE.CanvasTexture {
  if (!cached) cached = finish(paint());
  return cached;
}
