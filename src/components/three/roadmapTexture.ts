import * as THREE from "three";

/**
 * The Roadmap board's face: a glowing node-graph skill tree.
 *
 * Painted once into a canvas and cached at module level, same as
 * screenTextures/duoTextures. A node graph drawn as geometry would have been
 * ~40 meshes for the nodes and rings alone, and this scene is draw-call bound;
 * as a texture it costs one.
 *
 * Deterministic — no Math.random anywhere — so the board is identical on every
 * load and cannot cause a hydration mismatch.
 */

const W = 1280;
const H = 760;

type State = "done" | "active" | "locked";

type Node = {
  x: number;
  y: number;
  label: string;
  state: State;
  /** Optional state caption, as in the reference. Only a few carry one. */
  caption?: string;
};

/** Serpentine flow: left-to-right along the top, back along the bottom. */
const NODES: Node[] = [
  { x: 150, y: 250, label: "Frontend Basics", state: "done" },
  { x: 390, y: 195, label: "Backend Development", state: "done" },
  { x: 640, y: 215, label: "Databases & SQL", state: "done", caption: "Completed" },
  { x: 880, y: 300, label: "RAG & LLM Apps", state: "done" },
  { x: 1050, y: 470, label: "DevVerse AI", state: "active", caption: "In progress" },
  { x: 800, y: 560, label: "LangGraph Agents", state: "active" },
  { x: 540, y: 545, label: "Ship DevFlow v1", state: "locked", caption: "Locked" },
  { x: 290, y: 480, label: "System Design", state: "locked" },
];

const COLOURS: Record<State, { ring: string; core: string; glow: string }> = {
  done: { ring: "#3ddcf5", core: "#0e2a44", glow: "61, 220, 245" },
  active: { ring: "#c07cff", core: "#2a1a44", glow: "192, 124, 255" },
  locked: { ring: "#4a5570", core: "#141a2b", glow: "74, 85, 112" },
};

function finish(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 8;
  return tex;
}

/** Glowing connector between two nodes, bowed so the path reads as organic. */
function link(
  ctx: CanvasRenderingContext2D,
  a: Node,
  b: Node,
  bow: number,
) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // Perpendicular offset gives the curve its bow.
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bow;
  const cy = my + (dx / len) * bow;

  // A locked destination greys the whole segment — the eye should read the
  // lit path as "how far I've got".
  const lit = b.state !== "locked" && a.state !== "locked";
  const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  if (lit) {
    grad.addColorStop(0, COLOURS[a.state].ring);
    grad.addColorStop(1, COLOURS[b.state].ring);
  } else {
    grad.addColorStop(0, "#39425c");
    grad.addColorStop(1, "#2b3147");
  }

  // Wide soft pass underneath, then a tight bright core — that pairing is what
  // makes a stroke read as emissive rather than merely coloured.
  ctx.lineCap = "round";
  if (lit) {
    ctx.strokeStyle = grad;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cx, cy, b.x, b.y);
    ctx.stroke();
  }
  ctx.globalAlpha = lit ? 0.95 : 0.5;
  ctx.strokeStyle = grad;
  ctx.lineWidth = lit ? 3.5 : 2.5;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(cx, cy, b.x, b.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function checkMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = "#eaf7ff";
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.42, y + r * 0.02);
  ctx.lineTo(x - r * 0.1, y + r * 0.34);
  ctx.lineTo(x + r * 0.45, y - r * 0.34);
  ctx.stroke();
}

function padlock(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = "#8592b0";
  ctx.fillStyle = "#8592b0";
  ctx.lineWidth = r * 0.14;
  // Shackle
  ctx.beginPath();
  ctx.arc(x, y - r * 0.16, r * 0.28, Math.PI, 0);
  ctx.stroke();
  // Body
  const bw = r * 0.78;
  const bh = r * 0.56;
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, y - r * 0.06, bw, bh, r * 0.12);
  ctx.fill();
}

/** Half-filled disc — the reference's "in progress" treatment. */
function halfFill(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = ctx.createLinearGradient(x - r, y, x + r, y);
  g.addColorStop(0, "rgba(224, 170, 255, 0.95)");
  g.addColorStop(0.5, "rgba(170, 120, 255, 0.85)");
  g.addColorStop(0.5, "rgba(170, 120, 255, 0.10)");
  g.addColorStop(1, "rgba(120, 90, 200, 0.05)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawNode(ctx: CanvasRenderingContext2D, n: Node) {
  const c = COLOURS[n.state];
  const R = 52;

  // Bloom pool behind the node.
  const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, R * 2.1);
  halo.addColorStop(0, `rgba(${c.glow}, ${n.state === "locked" ? 0.1 : 0.34})`);
  halo.addColorStop(1, `rgba(${c.glow}, 0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(n.x - R * 2.1, n.y - R * 2.1, R * 4.2, R * 4.2);

  // Recessed core.
  ctx.fillStyle = c.core;
  ctx.beginPath();
  ctx.arc(n.x, n.y, R * 0.74, 0, Math.PI * 2);
  ctx.fill();

  if (n.state === "active") halfFill(ctx, n.x, n.y, R * 0.74);

  // Outer ring, plus a brighter arc so the ring reads as lit from one side.
  ctx.strokeStyle = c.ring;
  ctx.globalAlpha = n.state === "locked" ? 0.55 : 1;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(n.x, n.y, R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.globalAlpha = n.state === "locked" ? 0.3 : 0.7;
  ctx.beginPath();
  ctx.arc(n.x, n.y, R * 0.86, -Math.PI * 0.85, -Math.PI * 0.1);
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (n.state === "done") checkMark(ctx, n.x, n.y, R * 0.74);
  if (n.state === "locked") padlock(ctx, n.x, n.y, R * 0.74);

  // Label under the node.
  ctx.textAlign = "center";
  ctx.font = "600 25px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = n.state === "locked" ? "rgba(180,192,215,0.62)" : "#e9f1ff";
  ctx.fillText(n.label, n.x, n.y + R + 38);

  if (n.caption) {
    ctx.font = "600 17px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle =
      n.state === "locked" ? "rgba(150,162,188,0.6)" : `rgba(${c.glow}, 0.9)`;
    ctx.fillText(n.caption.toUpperCase(), n.x, n.y + R + 64);
  }
}

function paint(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // --- Glass panel base ---
  const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
  bg.addColorStop(0, "#0d142a");
  bg.addColorStop(0.5, "#0a1024");
  bg.addColorStop(1, "#070b1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Faint grid, so it reads as a UI surface rather than flat paint.
  ctx.strokeStyle = "rgba(90,140,220,0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Corner sheen, as on a glass panel catching a light.
  const sheen = ctx.createRadialGradient(W * 0.14, -60, 0, W * 0.14, -60, W * 0.7);
  sheen.addColorStop(0, "rgba(120,170,255,0.10)");
  sheen.addColorStop(1, "rgba(120,170,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  // --- Title ---
  ctx.textAlign = "left";
  ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "rgba(120,215,245,0.85)";
  ctx.fillText("W H A T ' S   N E X T", 54, 62);
  ctx.font = "700 42px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "#eaf2ff";
  ctx.fillText("Learning Roadmap", 52, 112);

  // Underline accent.
  const ul = ctx.createLinearGradient(52, 0, 400, 0);
  ul.addColorStop(0, "#3ddcf5");
  ul.addColorStop(1, "rgba(192,124,255,0)");
  ctx.fillStyle = ul;
  ctx.fillRect(52, 128, 348, 3);

  // --- Links first, so nodes sit on top of them ---
  const bows = [26, -22, 30, 34, -26, 22, -30];
  for (let i = 0; i < NODES.length - 1; i++) {
    link(ctx, NODES[i], NODES[i + 1], bows[i]);
  }

  // --- Nodes ---
  for (const n of NODES) drawNode(ctx, n);

  // --- Progress readout, bottom-right ---
  const done = NODES.filter((n) => n.state === "done").length;
  ctx.textAlign = "right";
  ctx.font = "600 19px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillStyle = "rgba(150,175,215,0.75)";
  ctx.fillText(`${done} / ${NODES.length} MILESTONES`, W - 54, H - 46);

  const barW = 250;
  const barX = W - 54 - barW;
  ctx.fillStyle = "rgba(120,150,200,0.18)";
  ctx.beginPath();
  ctx.roundRect(barX, H - 34, barW, 7, 4);
  ctx.fill();
  const pg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  pg.addColorStop(0, "#3ddcf5");
  pg.addColorStop(1, "#c07cff");
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.roundRect(barX, H - 34, (barW * done) / NODES.length, 7, 4);
  ctx.fill();

  return canvas;
}

let cached: THREE.CanvasTexture | null = null;

/** Must be called during client render — there is no canvas during SSR. */
export function getRoadmapTexture(): THREE.CanvasTexture {
  if (!cached) cached = finish(paint());
  return cached;
}
