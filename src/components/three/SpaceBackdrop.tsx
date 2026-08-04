"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural deep-space skybox.
 *
 * Painted ONCE into an equirectangular canvas and handed to `scene.background`.
 * Nothing here runs per frame — which is why it replaces drei's `<Stars>`,
 * whose 700 points were being animated and re-projected every single frame.
 * Baking the stars into the texture is both more convincing (varied colour,
 * brightness, glow, dust lanes) and strictly cheaper.
 *
 * No external asset: a nebula JPEG large enough not to look muddy would be
 * megabytes, and this generates in a few hundred milliseconds at build-free
 * zero download cost.
 */

/** Deterministic PRNG so the sky is identical on every load and every device. */
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft additive cloud — the building block for nebulae and dust. */
function cloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(${color}, ${alpha})`);
  g.addColorStop(0.45, `rgba(${color}, ${alpha * 0.35})`);
  g.addColorStop(1, `rgba(${color}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function paintSky(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(20260729);

  // --- Base: not pure black. Real sky has a faint blue-violet floor. ---
  // Lifted from #02030a/#050718: at the old values the sky was so close to
  // black that the nebulae read as isolated smudges rather than a lit sky,
  // and it gave the room nothing to be silhouetted against.
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#070b1e");
  base.addColorStop(0.5, "#101638");
  base.addColorStop(1, "#070b1e");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "lighter";

  // --- Galactic band: a diagonal swath of dust across the sphere. ---
  const bandY = height * 0.55;
  for (let i = 0; i < 220; i++) {
    const t = i / 220;
    const x = t * width;
    const y = bandY + Math.sin(t * Math.PI * 2) * height * 0.1 + (rand() - 0.5) * height * 0.14;
    cloud(ctx, x, y, height * (0.09 + rand() * 0.12), "120, 140, 210", 0.07 + rand() * 0.055);
  }

  // --- Nebulae: a few large coloured regions, matching the site palette. ---
  // Alphas roughly doubled from 0.09-0.16. These are additive, so the nebulae
  // now actually glow instead of tinting near-black by a few percent.
  const nebulae: { x: number; y: number; r: number; c: string; a: number }[] = [
    { x: width * 0.18, y: height * 0.38, r: height * 0.55, c: "120, 40, 200", a: 0.3 },
    { x: width * 0.27, y: height * 0.46, r: height * 0.3, c: "220, 80, 230", a: 0.22 },
    { x: width * 0.68, y: height * 0.6, r: height * 0.5, c: "20, 140, 200", a: 0.27 },
    { x: width * 0.76, y: height * 0.52, r: height * 0.26, c: "40, 200, 230", a: 0.19 },
    { x: width * 0.45, y: height * 0.28, r: height * 0.34, c: "60, 90, 220", a: 0.18 },
  ];
  for (const n of nebulae) {
    cloud(ctx, n.x, n.y, n.r, n.c, n.a);
    // Fractal detail: smaller clumps inside each region so edges aren't
    // perfectly smooth, which is what makes a gradient read as "fake".
    for (let i = 0; i < 90; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.pow(rand(), 0.6) * n.r;
      cloud(
        ctx,
        n.x + Math.cos(a) * d,
        n.y + Math.sin(a) * d * 0.7,
        n.r * (0.05 + rand() * 0.16),
        n.c,
        n.a * (0.18 + rand() * 0.3),
      );
    }
  }

  // --- Dark dust lanes: subtractive detail breaking up the glow. ---
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 160; i++) {
    const x = rand() * width;
    const y = bandY + (rand() - 0.5) * height * 0.4;
    cloud(ctx, x, y, height * (0.03 + rand() * 0.1), "2, 3, 10", 0.22 + rand() * 0.25);
  }

  // --- Stars, in three populations. ---
  ctx.globalCompositeOperation = "lighter";

  // Faint background haze of tiny stars. Real skies are mostly THIS — a dense
  // field of near-threshold points. Too few of these and the sky reads as a
  // handful of dots on black.
  for (let i = 0; i < 9000; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const a = 0.18 + Math.pow(rand(), 1.7) * 0.55;
    ctx.fillStyle = `rgba(210, 225, 255, ${a})`;
    // Snap to the pixel grid. At fractional coordinates a 1x1 fillRect gets
    // antialiased across four pixels, so every star in this population was
    // drawn at roughly a quarter of its intended brightness.
    ctx.fillRect(x | 0, y | 0, 1, 1);
  }

  // Mid-tier stars with a hint of stellar colour.
  const tints = [
    "255, 244, 232", // warm
    "255, 255, 255",
    "215, 232, 255", // blue-white
    "255, 220, 200", // orange
  ];
  for (let i = 0; i < 1100; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = 0.5 + rand() * 0.7;
    const tint = tints[Math.floor(rand() * tints.length)];
    // Tight halo only. A wide one turns every star into a fuzzy blob, which
    // is the single biggest tell that a starfield was drawn rather than shot.
    cloud(ctx, x, y, r * 2, tint, 0.18 + rand() * 0.16);
    ctx.fillStyle = `rgba(${tint}, ${0.75 + rand() * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // A handful of bright anchor stars, with a diffraction spike so the eye
  // reads them as genuinely bright rather than merely large.
  for (let i = 0; i < 32; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const tint = tints[Math.floor(rand() * tints.length)];
    const len = 6 + rand() * 12;
    cloud(ctx, x, y, 6 + rand() * 10, tint, 0.4);
    ctx.strokeStyle = `rgba(${tint}, 0.32)`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x - len, y);
    ctx.lineTo(x + len, y);
    ctx.moveTo(x, y - len * 0.7);
    ctx.lineTo(x, y + len * 0.7);
    ctx.stroke();
    ctx.fillStyle = `rgba(${tint}, 1)`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rand() * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = "source-over";
  return canvas;
}

export function SpaceBackdrop() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);

  const texture = useMemo(() => {
    // 2:1 equirectangular. 2048x1024 is the sweet spot — the backdrop is
    // always out of focus behind the room, and 4K would cost ~4x the paint
    // time and VRAM for no visible gain.
    const tex = new THREE.CanvasTexture(paintSky(2048, 1024));
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, []);

  // The three.js scene is an external system, not React state — installing a
  // background on it and freeing the GPU texture afterwards is precisely what
  // an effect is for. react-hooks/immutability can't tell the difference.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    const previousBg = scene.background;
    const previousEnv = scene.environment;
    const previousBgIntensity = scene.backgroundIntensity;
    scene.background = texture;
    // Scales the painted sky at render time, so the backdrop can be lifted
    // without repainting the canvas or touching the nebula alphas.
    scene.backgroundIntensity = 1.25;

    // Also light the room with the sky, not just paint it behind.
    //
    // Almost every surface in this room is metal (metalness 0.7-0.9). A metal
    // has NO diffuse response in PBR — all of its visible colour is reflected
    // environment. With no environment map set, those surfaces had nothing to
    // reflect but three point lights, so the desk, monitor bezel and chair
    // rendered essentially black no matter how much ambient light was added.
    // PMREM-filtering the nebula gives them something to reflect, which is
    // what actually makes the furniture readable — and it costs one prefilter
    // at mount, nothing per frame.
    // Prefilter from a DOWNSCALED copy, not the 2048px backdrop. Image-based
    // lighting is inherently low-frequency, so 256px is visually identical
    // here and keeps the prefiltered cube small in VRAM.
    //
    // Measured, so nobody re-tries it: shrinking the source did NOT recover
    // frame rate. Enabling an environment at all costs ~20fps at 1440x900,
    // because it recompiles every PBR material with ENVMAP and adds a
    // roughness-LOD cube sample per fragment — that cost is per-pixel and
    // essentially independent of the cube's resolution. It is paid knowingly:
    // without it every metalness>0.7 surface renders black.
    const small = document.createElement("canvas");
    small.width = 256;
    small.height = 128;
    small
      .getContext("2d")!
      .drawImage(texture.image as CanvasImageSource, 0, 0, 256, 128);
    const envSource = new THREE.CanvasTexture(small);
    envSource.mapping = THREE.EquirectangularReflectionMapping;
    envSource.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromEquirectangular(envSource).texture;
    scene.environment = env;
    scene.environmentIntensity = 1.5;
    pmrem.dispose();
    envSource.dispose();

    return () => {
      scene.background = previousBg;
      scene.environment = previousEnv;
      scene.backgroundIntensity = previousBgIntensity;
      env.dispose();
      texture.dispose();
    };
  }, [scene, gl, texture]);
  /* eslint-enable react-hooks/immutability */

  return null;
}
