import * as THREE from "three";
import { PALETTE } from "./palette";

/**
 * Procedural screen contents for the monitor and the laptop.
 *
 * Everything is drawn as shapes rather than `fillText`. At scene scale a 1.6
 * unit plane seen from ~7 units maps roughly 1024px of texture onto a couple
 * hundred screen pixels, so real glyphs collapse into grey mud — rounded bars
 * of syntax colour still read as "code" at that size and stay crisp.
 *
 * The images are built once per module load and cached, and every random value
 * comes from a seeded PRNG so the screens are byte-identical on every visit.
 */

/** Deterministic PRNG (mulberry32) — `Math.random` would reshuffle the screen on every load. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick(rng: () => number, items: readonly string[]): string {
  return items[Math.floor(rng() * items.length)];
}

/** Hex from PALETTE -> rgba(), so tints can reuse the scene colours directly. */
function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Hand-rolled rather than `ctx.roundRect`, which Safari only gained in 16. */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** One run of "text". */
function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  roundedRect(ctx, x, y, w, h, Math.min(h / 2, 3));
  ctx.fill();
}

function pill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha: number,
): void {
  ctx.fillStyle = rgba(color, alpha);
  roundedRect(ctx, x, y, w, h, h * 0.45);
  ctx.fill();
}

/**
 * CRT scanlines. Kept at a very low alpha: with mipmaps disabled a
 * high-contrast 3px pattern would shimmer under minification, at this alpha it
 * just reads as a faint texture.
 */
function scanlines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
}

/** Keeps the emissive panel from reading as a flat lightbox at the corners. */
function vignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(w / h, 1);
  const g = ctx.createRadialGradient(0, 0, h * 0.22, 0, 0, h * 0.75);
  g.addColorStop(0, "rgba(0, 0, 0, 0)");
  g.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  ctx.fillStyle = g;
  ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.restore();
}

/**
 * Weighted by repetition: plain identifiers dominate real code, accents are
 * sprinkled. Pure white is avoided — these feed an emissive map and would blow
 * out against `toneMapped={false}`.
 */
const TOKEN_COLORS: readonly string[] = [
  "#c2cfef",
  "#c2cfef",
  "#c2cfef",
  "#a8b6da",
  PALETTE.cyan,
  PALETTE.cyan,
  PALETTE.purple,
  PALETTE.purple,
  PALETTE.magenta,
  PALETTE.electric,
  "#4a5679",
  "#4a5679",
];

const MONITOR_W = 1024;
const MONITOR_H = 576;

function drawMonitorScreen(ctx: CanvasRenderingContext2D): void {
  const rng = mulberry32(0x5eed1de);

  const SIDEBAR_W = 148;
  const TAB_H = 38;
  const STATUS_H = 26;
  const GUTTER_R = SIDEBAR_W + 44;
  const CODE_LEFT = GUTTER_R + 14;
  const MINIMAP_L = MONITOR_W - 66;
  const CODE_RIGHT = MINIMAP_L - 16;
  const ROW_TOP = TAB_H + 18;
  const ROW_STEP = 20;
  const ROW_COUNT = 24;
  const ACTIVE_ROW = 9;

  ctx.fillStyle = "#0b1022";
  ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);

  // --- Sidebar -------------------------------------------------------------
  ctx.fillStyle = "#070c1b";
  ctx.fillRect(0, 0, SIDEBAR_W, MONITOR_H);
  ctx.fillStyle = "#1a2340";
  ctx.fillRect(SIDEBAR_W - 1, 0, 1, MONITOR_H);

  bar(ctx, 16, 22, 62, 5, "#39456a");

  const TREE_ACTIVE = 6;
  for (let i = 0; i < 17; i++) {
    const y = 52 + i * 22;
    const depth = i === 0 || i === 5 || i === 12 ? 0 : 1;
    const x = 16 + depth * 12;

    if (i === TREE_ACTIVE) {
      ctx.fillStyle = rgba(PALETTE.cyan, 0.1);
      ctx.fillRect(0, y - 6, SIDEBAR_W - 1, 18);
      ctx.fillStyle = PALETTE.cyan;
      ctx.fillRect(0, y - 6, 2, 18);
    }

    // Folder rows get a chunkier glyph than files.
    const iconColor =
      depth === 0
        ? rgba(PALETTE.electric, 0.75)
        : i === TREE_ACTIVE
          ? PALETTE.cyan
          : "#3c4869";
    bar(ctx, x, y, depth === 0 ? 9 : 7, 7, iconColor);

    const nameX = x + (depth === 0 ? 15 : 13);
    const nameW = Math.min(randInt(rng, 38, 92), SIDEBAR_W - nameX - 18);
    bar(ctx, nameX, y + 1, nameW, 5, i === TREE_ACTIVE ? "#cdd8f5" : "#59648a");

    // Git-dirty markers.
    if (i === 3 || i === 9) {
      ctx.fillStyle = PALETTE.magenta;
      ctx.beginPath();
      ctx.arc(SIDEBAR_W - 14, y + 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Tab bar -------------------------------------------------------------
  ctx.fillStyle = "#080d1e";
  ctx.fillRect(SIDEBAR_W, 0, MONITOR_W - SIDEBAR_W, TAB_H);
  ctx.fillStyle = "#151d38";
  ctx.fillRect(SIDEBAR_W, TAB_H - 1, MONITOR_W - SIDEBAR_W, 1);

  const TAB_WIDTHS = [168, 150, 158];
  const ACTIVE_TAB = 1;
  let tabX = SIDEBAR_W;
  for (let i = 0; i < TAB_WIDTHS.length; i++) {
    const w = TAB_WIDTHS[i];
    const active = i === ACTIVE_TAB;

    if (active) {
      ctx.fillStyle = "#0e1730";
      ctx.fillRect(tabX, 0, w, TAB_H);
      ctx.fillStyle = PALETTE.cyan;
      ctx.fillRect(tabX, 0, w, 2);
    }
    ctx.fillStyle = "#151d38";
    ctx.fillRect(tabX + w - 1, 8, 1, TAB_H - 16);

    bar(ctx, tabX + 18, 16, 8, 8, active ? PALETTE.cyan : rgba(PALETTE.purple, 0.6));
    bar(ctx, tabX + 34, 18, randInt(rng, 56, 84), 5, active ? "#d3ddf7" : "#5a678d");

    // Unsaved-changes dot on the focused tab.
    if (active) {
      ctx.fillStyle = PALETTE.magenta;
      ctx.beginPath();
      ctx.arc(tabX + w - 20, 20, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    tabX += w;
  }

  // --- Code rows -----------------------------------------------------------
  let indent = 0;
  for (let i = 0; i < ROW_COUNT; i++) {
    const y = ROW_TOP + i * ROW_STEP;

    if (i === ACTIVE_ROW) {
      ctx.fillStyle = rgba(PALETTE.electric, 0.07);
      ctx.fillRect(SIDEBAR_W, y - 6, CODE_RIGHT - SIDEBAR_W + 10, ROW_STEP);
    }

    // Line number, right-aligned in the gutter.
    const numW = randInt(rng, 12, 18);
    bar(ctx, GUTTER_R - 12 - numW, y + 1, numW, 5, i === ACTIVE_ROW ? "#7b88b0" : "#2c3658");

    // Blank lines break up the block without disturbing the indent stack.
    if (i > 1 && rng() < 0.1) continue;

    if (indent > 0 && rng() < 0.28) indent -= 1;
    const startX = CODE_LEFT + indent * 22;

    // Comment lines: one long dim run, no syntax colour.
    if (rng() < 0.09) {
      bar(ctx, startX, y, Math.min(randInt(rng, 130, 320), CODE_RIGHT - startX), 6, "#39456a");
      continue;
    }

    let x = startX;
    const tokens = randInt(rng, 2, 7);
    for (let t = 0; t < tokens; t++) {
      const w = randInt(rng, 16, 104);
      if (x + w > CODE_RIGHT) break;
      // Lines usually open on a keyword, so bias the first token purple.
      const color = t === 0 && rng() < 0.5 ? PALETTE.purple : pick(rng, TOKEN_COLORS);
      bar(ctx, x, y, w, 7, color);
      x += w + randInt(rng, 7, 13);
    }

    if (i === ACTIVE_ROW) {
      ctx.fillStyle = PALETTE.cyan;
      ctx.fillRect(x, y - 3, 2, 13);
    }

    if (indent < 4 && rng() < 0.32) indent += 1;
  }

  // --- Minimap -------------------------------------------------------------
  // Runs the full panel height: a minimap shows the whole file, not just the
  // visible rows, so the viewport box only covers the top slice.
  const mmTop = TAB_H + 10;
  const mmBottom = MONITOR_H - STATUS_H - 8;
  const mmScale = 56 / (CODE_RIGHT - CODE_LEFT);
  for (let y = mmTop; y < mmBottom; y += 4) {
    if (rng() < 0.12) continue;
    let mx = MINIMAP_L + randInt(rng, 0, 3) * 22 * mmScale;
    const chunks = randInt(rng, 1, 3);
    for (let c = 0; c < chunks; c++) {
      const w = randInt(rng, 10, 60);
      if (mx + w > MINIMAP_L + 56) break;
      ctx.fillStyle = rgba(pick(rng, TOKEN_COLORS), 0.5);
      ctx.fillRect(mx, y, w, 2);
      mx += w + 3;
    }
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(MINIMAP_L - 4, mmTop, 64, (ROW_COUNT * ROW_STEP) / 5);

  // --- Status bar ----------------------------------------------------------
  const sy = MONITOR_H - STATUS_H;
  ctx.fillStyle = "#0c1430";
  ctx.fillRect(0, sy, MONITOR_W, STATUS_H);
  ctx.fillStyle = "#1c2647";
  ctx.fillRect(0, sy, MONITOR_W, 1);

  pill(ctx, 12, sy + 7, 78, 13, PALETTE.cyan, 0.18);
  bar(ctx, 22, sy + 11, 58, 5, PALETTE.cyan);

  pill(ctx, 100, sy + 7, 58, 13, PALETTE.purple, 0.18);
  bar(ctx, 110, sy + 11, 38, 5, PALETTE.purple);

  bar(ctx, 176, sy + 11, 46, 5, "#3d4869");
  bar(ctx, 232, sy + 11, 70, 5, "#3d4869");

  pill(ctx, MONITOR_W - 118, sy + 7, 54, 13, PALETTE.magenta, 0.2);
  bar(ctx, MONITOR_W - 110, sy + 11, 38, 5, PALETTE.magenta);
  bar(ctx, MONITOR_W - 200, sy + 11, 62, 5, "#3d4869");

  vignette(ctx, MONITOR_W, MONITOR_H);
  scanlines(ctx, MONITOR_W, MONITOR_H);
}

const LAPTOP_W = 820;
const LAPTOP_H = 520;

function drawLaptopScreen(ctx: CanvasRenderingContext2D): void {
  const rng = mulberry32(0xc0ffee7);

  const TITLE_H = 32;
  const TERM_L = 22;
  const TERM_R = LAPTOP_W - 22;
  const LINE_TOP = 50;
  const LINE_STEP = 16;

  const CARD_X = 496;
  const CARD_Y = 322;
  const CARD_W = 302;
  const CARD_H = 176;

  ctx.fillStyle = "#070c1a";
  ctx.fillRect(0, 0, LAPTOP_W, LAPTOP_H);

  // --- Title bar -----------------------------------------------------------
  ctx.fillStyle = "#0c1226";
  ctx.fillRect(0, 0, LAPTOP_W, TITLE_H);
  ctx.fillStyle = "#1a2340";
  ctx.fillRect(0, TITLE_H - 1, LAPTOP_W, 1);

  const dots = [PALETTE.magenta, PALETTE.purple, PALETTE.cyan];
  for (let i = 0; i < dots.length; i++) {
    ctx.fillStyle = dots[i];
    ctx.beginPath();
    ctx.arc(20 + i * 18, TITLE_H / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  bar(ctx, LAPTOP_W / 2 - 70, TITLE_H / 2 - 3, 140, 6, "#3a4568");

  // --- Terminal lines ------------------------------------------------------
  for (let y = LINE_TOP; y < LAPTOP_H - 34; y += LINE_STEP) {
    // Lines level with the chart card have to stop short of it.
    const right = y > CARD_Y - 12 ? CARD_X - 16 : TERM_R;
    const kind = rng();

    if (kind < 0.08) {
      // Blank line between command blocks.
      continue;
    }

    if (kind < 0.34) {
      // Prompt line: coloured glyph block, then the command, then arguments.
      bar(ctx, TERM_L, y, 9, 9, PALETTE.cyan);
      let x = TERM_L + 17;
      const cmdW = randInt(rng, 44, 96);
      bar(ctx, x, y + 1, cmdW, 7, "#d2ddf7");
      x += cmdW + 10;
      const args = randInt(rng, 1, 3);
      for (let a = 0; a < args; a++) {
        const w = randInt(rng, 24, 78);
        if (x + w > right) break;
        bar(ctx, x, y + 1, w, 7, a === 0 ? PALETTE.purple : "#6d7aa1");
        x += w + 9;
      }
      continue;
    }

    if (kind < 0.48) {
      // Tagged status line — a small filled pill then the message.
      const tag = rng();
      const tint = tag < 0.5 ? PALETTE.cyan : tag < 0.8 ? PALETTE.magenta : PALETTE.electric;
      pill(ctx, TERM_L + 14, y - 1, 38, 12, tint, 0.22);
      bar(ctx, TERM_L + 21, y + 3, 24, 5, tint);
      const w = Math.min(randInt(rng, 120, 300), right - (TERM_L + 62));
      if (w > 20) bar(ctx, TERM_L + 62, y + 1, w, 6, "#8e9ac0");
      continue;
    }

    if (kind < 0.56) {
      // Highlighted result row.
      ctx.fillStyle = rgba(PALETTE.cyan, 0.07);
      ctx.fillRect(TERM_L - 8, y - 4, right - TERM_L + 16, LINE_STEP);
      let x = TERM_L + 14;
      const chunks = randInt(rng, 2, 3);
      for (let c = 0; c < chunks; c++) {
        const w = randInt(rng, 40, 130);
        if (x + w > right) break;
        bar(ctx, x, y + 1, w, 7, c === 0 ? PALETTE.cyan : "#b7c4e6");
        x += w + 10;
      }
      continue;
    }

    // Plain output: indented dim runs.
    let x = TERM_L + 14;
    const chunks = randInt(rng, 1, 4);
    for (let c = 0; c < chunks; c++) {
      const w = randInt(rng, 30, 150);
      if (x + w > right) break;
      bar(ctx, x, y + 1, w, 6, pick(rng, ["#4b5779", "#5c6890", "#414d70"]));
      x += w + 10;
    }
  }

  // --- Metrics card (bottom-right corner) ----------------------------------
  ctx.fillStyle = "#0a1024";
  roundedRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 8);
  ctx.fill();
  ctx.strokeStyle = rgba(PALETTE.cyan, 0.2);
  ctx.lineWidth = 1;
  roundedRect(ctx, CARD_X + 0.5, CARD_Y + 0.5, CARD_W - 1, CARD_H - 1, 8);
  ctx.stroke();

  bar(ctx, CARD_X + 16, CARD_Y + 15, 64, 5, "#5a6790");
  ctx.fillStyle = PALETTE.cyan;
  ctx.beginPath();
  ctx.arc(CARD_X + CARD_W - 20, CARD_Y + 18, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Sparkline across the top of the card, with a soft fill under it.
  const spX = CARD_X + 16;
  const spW = CARD_W - 32;
  const spTop = CARD_Y + 32;
  const spH = 46;
  const POINTS = 18;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < POINTS; i++) {
    xs.push(spX + (spW * i) / (POINTS - 1));
    ys.push(spTop + spH - randInt(rng, 6, spH - 4));
  }

  ctx.beginPath();
  ctx.moveTo(xs[0], spTop + spH);
  for (let i = 0; i < POINTS; i++) ctx.lineTo(xs[i], ys[i]);
  ctx.lineTo(xs[POINTS - 1], spTop + spH);
  ctx.closePath();
  ctx.fillStyle = rgba(PALETTE.magenta, 0.12);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 1; i < POINTS; i++) ctx.lineTo(xs[i], ys[i]);
  ctx.strokeStyle = PALETTE.magenta;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.fillStyle = PALETTE.magenta;
  ctx.beginPath();
  ctx.arc(xs[POINTS - 1], ys[POINTS - 1], 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Bar cluster along the bottom of the card.
  const baseline = CARD_Y + CARD_H - 18;
  const BARS = 13;
  const barCycle = [PALETTE.cyan, PALETTE.electric, PALETTE.purple];
  for (let i = 0; i < BARS; i++) {
    const bx = CARD_X + 18 + i * 21;
    const bh = randInt(rng, 12, 62);
    ctx.fillStyle = rgba(barCycle[i % barCycle.length], 0.85);
    roundedRect(ctx, bx, baseline - bh, 13, bh, 3);
    ctx.fill();
  }
  ctx.fillStyle = "#222c4c";
  ctx.fillRect(CARD_X + 16, baseline + 2, CARD_W - 32, 1);

  vignette(ctx, LAPTOP_W, LAPTOP_H);
  scanlines(ctx, LAPTOP_W, LAPTOP_H);
}

/**
 * Mipmaps are off and both filters are linear per the room's texture policy —
 * these panels are never minified far enough to need a mip chain, and the
 * chain would cost memory and blur the code rows.
 */
function configure(tex: THREE.CanvasTexture): THREE.CanvasTexture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function build(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return configure(new THREE.CanvasTexture());
  draw(ctx);
  return configure(new THREE.CanvasTexture(canvas));
}

let monitorTexture: THREE.CanvasTexture | null = null;
let laptopTexture: THREE.CanvasTexture | null = null;

/**
 * 1024x576 dark IDE. Cached module-wide so the canvas work happens once even if
 * several meshes ask for it.
 *
 * The SSR fallback is intentionally not cached: the server realm and the
 * browser realm hold separate module instances, and caching an empty texture
 * here would only ever poison the server one.
 */
export function getMonitorScreenTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") return configure(new THREE.CanvasTexture());
  if (!monitorTexture) monitorTexture = build(MONITOR_W, MONITOR_H, drawMonitorScreen);
  return monitorTexture;
}

/** 820x520 terminal + metrics dashboard. Same caching rules as the monitor. */
export function getLaptopScreenTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") return configure(new THREE.CanvasTexture());
  if (!laptopTexture) laptopTexture = build(LAPTOP_W, LAPTOP_H, drawLaptopScreen);
  return laptopTexture;
}
