import * as THREE from "three";

/**
 * Textures for the dual-screen gaming laptop.
 *
 * Both are painted once on a canvas and cached at module level — the room is
 * draw-call bound and re-generating these per render would also stall the
 * main thread. Everything is deterministic (seeded PRNG, never Math.random)
 * so the panels look identical on every load and can't cause a hydration
 * mismatch.
 */

function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finish(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/** Scanlines sell "this is a screen" more than any amount of detail. */
function scanlines(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.05) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
}

/**
 * Main display wallpaper: a dramatic dusk landscape with layered ridgelines,
 * a low sun and a glowing emblem — the gaming-laptop hero shot.
 */
function paintWallpaper(): HTMLCanvasElement {
  const W = 1024;
  const H = 640;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(90210);

  // Sky: deep indigo up top falling to ember at the horizon.
  const horizon = H * 0.56;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#0a0a1f");
  sky.addColorStop(0.45, "#2b1740");
  sky.addColorStop(0.78, "#8a2f4a");
  sky.addColorStop(1, "#e8763f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon);

  // Cloud banding — stretched ellipses catching the light.
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 70; i++) {
    const y = rand() * horizon * 0.9;
    const t = 1 - y / horizon;
    const g = ctx.createRadialGradient(
      rand() * W, y, 0,
      rand() * W, y, 60 + rand() * 220,
    );
    g.addColorStop(0, `rgba(255,${140 + t * 60},${90 + t * 40},${0.05 + rand() * 0.06})`);
    g.addColorStop(1, "rgba(255,140,90,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 90, W, 180);
  }

  // Sun glow just above the horizon.
  const sunX = W * 0.52;
  const sun = ctx.createRadialGradient(sunX, horizon - 20, 0, sunX, horizon - 20, 250);
  sun.addColorStop(0, "rgba(255,220,170,0.95)");
  sun.addColorStop(0.25, "rgba(255,150,80,0.45)");
  sun.addColorStop(1, "rgba(255,120,60,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, horizon + 60);
  ctx.globalCompositeOperation = "source-over";

  // Water below the horizon, mirroring the sun as a broken column.
  const water = ctx.createLinearGradient(0, horizon, 0, H);
  water.addColorStop(0, "#3a1a33");
  water.addColorStop(1, "#0a0a1c");
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, W, H - horizon);
  for (let y = horizon; y < H; y += 4) {
    const spread = ((y - horizon) / (H - horizon)) * 90 + 8;
    ctx.fillStyle = `rgba(255,150,90,${0.30 * (1 - (y - horizon) / (H - horizon))})`;
    ctx.fillRect(sunX - spread / 2 + (rand() - 0.5) * 14, y, spread, 2);
  }

  /** Jagged ridgeline. Far ranges are hazier and lighter than near ones. */
  const ridge = (baseY: number, amp: number, fill: string, seed: number) => {
    const r = mulberry32(seed);
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, baseY);
    let y = baseY;
    for (let x = 0; x <= W; x += 24) {
      y += (r() - 0.5) * amp;
      y = Math.max(baseY - amp * 2.2, Math.min(baseY + amp * 0.9, y));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  ridge(horizon - 46, 26, "#4a2340", 11);
  ridge(horizon - 18, 34, "#2a1330", 22);
  ridge(horizon + 26, 44, "#140a1e", 33);

  // Deliberately no emblem or logo here. An earlier version drew an angular
  // glyph that read as a real manufacturer's mark; this is a personal
  // portfolio, so the wallpaper carries no branding at all. A soft haze above
  // the ridgeline keeps the composition from feeling empty without it.
  ctx.globalCompositeOperation = "lighter";
  const haze = ctx.createRadialGradient(W / 2, horizon - 40, 0, W / 2, horizon - 40, 320);
  haze.addColorStop(0, "rgba(255,150,110,0.18)");
  haze.addColorStop(1, "rgba(255,150,110,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - 340, W, 400);
  ctx.globalCompositeOperation = "source-over";

  scanlines(ctx, W, H, 0.04);
  return canvas;
}

/**
 * ScreenPad dashboard: twin fan gauges, telemetry bars and readout blocks.
 * Text is drawn as shapes — real glyphs at this scale turn to mud.
 */
function paintDeckDashboard(): HTMLCanvasElement {
  const W = 1024;
  const H = 300;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(1337);

  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, 0, W, H);

  // Faint grid so the panel reads as instrumentation.
  ctx.strokeStyle = "rgba(80,140,220,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  /** Concentric arc gauge — the fan readouts either side of the panel. */
  const gauge = (cx: number, cy: number, r: number, hue: string) => {
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.9);
    halo.addColorStop(0, `${hue}55`);
    halo.addColorStop(1, `${hue}00`);
    ctx.fillStyle = halo;
    ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);

    ctx.strokeStyle = `${hue}cc`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI * 0.75, Math.PI * 0.55);
    ctx.stroke();

    ctx.strokeStyle = `${hue}66`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.74, -Math.PI * 0.7, Math.PI * 0.2);
    ctx.stroke();

    // Impeller blades.
    ctx.strokeStyle = `${hue}99`;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.2);
      ctx.lineTo(cx + Math.cos(a + 0.5) * r * 0.56, cy + Math.sin(a + 0.5) * r * 0.56);
      ctx.stroke();
    }
    ctx.fillStyle = `${hue}dd`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.13, 0, Math.PI * 2);
    ctx.fill();

    // Tick marks.
    ctx.strokeStyle = `${hue}44`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 22; i++) {
      const a = -Math.PI * 0.75 + (i / 21) * Math.PI * 1.3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 1.12, cy + Math.sin(a) * r * 1.12);
      ctx.lineTo(cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25);
      ctx.stroke();
    }
  };

  gauge(150, H / 2, 74, "#b06bff");
  gauge(W - 150, H / 2, 74, "#b06bff");

  // Centre telemetry: a wireframe block flanked by bar clusters.
  ctx.strokeStyle = "rgba(255,60,90,0.75)";
  ctx.lineWidth = 2;
  ctx.strokeRect(330, 44, W - 660, H - 88);
  ctx.strokeStyle = "rgba(120,190,255,0.5)";
  ctx.strokeRect(348, 60, W - 696, H - 120);

  for (let c = 0; c < 3; c++) {
    const bx = 372 + c * 100;
    for (let i = 0; i < 7; i++) {
      const h = 12 + rand() * 62;
      ctx.fillStyle = `rgba(${c === 1 ? "255,70,100" : "130,200,255"},${0.35 + rand() * 0.5})`;
      ctx.fillRect(bx + i * 9, H / 2 + 40 - h, 5, h);
    }
  }

  // Readout rows on either side of the centre block.
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(150,205,255,${0.25 + rand() * 0.4})`;
    ctx.fillRect(690, 62 + i * 28, 40 + rand() * 130, 7);
    ctx.fillStyle = `rgba(255,80,110,${0.25 + rand() * 0.35})`;
    ctx.fillRect(246, 62 + i * 28, 24 + rand() * 60, 7);
  }

  // Corner status pills.
  ctx.fillStyle = "rgba(255,70,100,0.85)";
  ctx.fillRect(24, 20, 54, 12);
  ctx.fillStyle = "rgba(120,200,255,0.75)";
  ctx.fillRect(W - 96, 20, 72, 12);

  scanlines(ctx, W, H, 0.07);
  return canvas;
}

let wallpaper: THREE.CanvasTexture | null = null;
let dashboard: THREE.CanvasTexture | null = null;

/** Must be called during client render — there is no canvas during SSR. */
export function getLaptopWallpaperTexture(): THREE.CanvasTexture {
  if (!wallpaper) wallpaper = finish(paintWallpaper());
  return wallpaper;
}

export function getDeckDashboardTexture(): THREE.CanvasTexture {
  if (!dashboard) dashboard = finish(paintDeckDashboard());
  return dashboard;
}
