"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { PALETTE } from "./palette";

/**
 * Miniature gas giant floating above the desk — replaces the old icosahedron
 * "AI robot". Roughly 0.5 units across including the rings and centred on the
 * origin, so the caller owns placement.
 *
 * Both textures are painted once into a canvas inside `useMemo`. Nothing here
 * touches a material after construction; the only per-frame work in the whole
 * component is a single `rotation.y` write on the planet mesh.
 */

const PLANET_R = 0.108;
const RING_INNER = 0.145;
const RING_OUTER = 0.25;

/** Gas giants are visibly flattened by their own spin — this reads instantly. */
const OBLATENESS = 0.905;

/** ~42s per revolution. Fast enough to notice, slow enough to ignore. */
const SPIN = 0.15;

/**
 * Total axial tilt is ~26°, split across two axes: cos(26.2°) = cos(16°)·cos(21°).
 * A pure Z tilt would leave the ring plane edge-on to a camera that looks
 * roughly down -Z, i.e. an invisible ring — leaning the pole toward the viewer
 * as well opens the ring into the classic ellipse.
 */
const TILT_FACE = THREE.MathUtils.degToRad(21);
const TILT_SIDE = THREE.MathUtils.degToRad(16);

type RGB = readonly [number, number, number];

/** Deterministic PRNG so the planet is identical on every load and device. */
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Accepts edge0 > edge1, which gives an inverted ramp (1 below, 0 above). */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function sampleRamp(ramp: readonly RGB[], t: number): RGB {
  const x = clamp01(t) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  return mixRgb(ramp[i], ramp[i + 1], x - i);
}

/**
 * Warm ochre → cream ramp for the cloud bands. Deliberately capped short of
 * white: the scene runs a bloom pass at luminanceThreshold 0.55, and a cream
 * this size lit by the room's point lights would otherwise bloom into a blob.
 */
const BAND_RAMP: readonly RGB[] = [
  [236, 221, 190],
  [223, 199, 154],
  [205, 172, 116],
  [178, 140, 88],
  [146, 108, 66],
  [112, 80, 50],
];

const POLE_COLOR: RGB = [84, 72, 62];
/** Faint cool cast at the very poles — ties the planet to the room's blues. */
const POLE_CORE: RGB = [66, 78, 96];
/** Equatorial zone, and the darker belts that bracket it. */
const EQUATOR_ZONE: RGB = [244, 231, 202];
const BELT_COLOR: RGB = [150, 104, 62];

/** Icy ring particles: dusty grey through to bright cream. */
const RING_RAMP: readonly RGB[] = [
  [96, 88, 78],
  [168, 150, 124],
  [226, 208, 176],
  [246, 234, 208],
];

function paintPlanet(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(0x5a7d21);

  // Band structure is a function of latitude ONLY, so every row is a flat
  // horizontal stripe — that constraint is what makes it read as a gas giant
  // rather than as marble.
  const freqs = [6.3, 11.9, 19.4, 33.1, 57.7];
  const amps = [0.52, 0.34, 0.22, 0.13, 0.07];
  const phases = freqs.map(() => rand() * Math.PI * 2);

  for (let y = 0; y < h; y++) {
    const lat = ((y + 0.5) / h) * 2 - 1;
    const absLat = Math.abs(lat);

    let n = 0;
    for (let i = 0; i < freqs.length; i++) {
      n += Math.sin(lat * freqs[i] + phases[i]) * amps[i];
    }

    // Real band edges are sharper than a raw sum of sines.
    let t = clamp01(0.5 + n * 0.42);
    t = 0.5 + (t - 0.5) * 1.5;

    let c = sampleRamp(BAND_RAMP, t);
    // The equatorial zone and its two flanking belts are blended over the
    // noise rather than biasing it: a noise peak at the equator would
    // otherwise cancel the brightening and leave the planet's defining
    // feature down to chance.
    c = mixRgb(c, BELT_COLOR, smoothstep(0.19, 0.26, absLat) * smoothstep(0.4, 0.31, absLat) * 0.4);
    c = mixRgb(c, EQUATOR_ZONE, smoothstep(0.2, 0.03, absLat) * 0.86);
    c = mixRgb(c, POLE_COLOR, smoothstep(0.62, 0.98, absLat) * 0.72);
    c = mixRgb(c, POLE_CORE, smoothstep(0.88, 1, absLat) * 0.5);

    ctx.fillStyle = `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
    ctx.fillRect(0, y, w, 1);
  }

  // Turbulence. Each streak spans an INTEGER number of cycles across the
  // canvas, so its two endpoints meet exactly at the sphere's u=0 seam.
  ctx.lineCap = "round";
  for (let i = 0; i < 34; i++) {
    // Kept off the poles: equirectangular UVs pinch there and any streak
    // drawn near the top or bottom rows smears into a starburst.
    const y0 = ((((rand() * 2 - 1) * 0.62) + 1) / 2) * h;
    const cycles = 1 + Math.floor(rand() * 4);
    const detail = cycles + 3 + Math.floor(rand() * 6);
    const amp = h * (0.004 + rand() * 0.016);
    const p1 = rand() * Math.PI * 2;
    const p2 = rand() * Math.PI * 2;
    const alpha = 0.05 + rand() * 0.09;

    ctx.strokeStyle =
      rand() > 0.45
        ? `rgba(250, 236, 206, ${alpha})`
        : `rgba(74, 48, 30, ${alpha * 1.2})`;
    ctx.lineWidth = h * (0.004 + rand() * 0.013);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const u = (x / w) * Math.PI * 2;
      const y =
        y0 + Math.sin(u * cycles + p1) * amp + Math.sin(u * detail + p2) * amp * 0.4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Oval vortices. Drawn three times, offset by ±w, so one that straddles the
  // canvas edge still wraps around the sphere instead of being clipped.
  const storms: { u: number; lat: number; r: number; warm: boolean }[] = [
    { u: 0.22, lat: -0.28, r: 0.055, warm: true },
    { u: 0.63, lat: 0.34, r: 0.036, warm: false },
    { u: 0.81, lat: -0.46, r: 0.026, warm: false },
    { u: 0.05, lat: 0.16, r: 0.03, warm: true },
  ];
  for (const s of storms) {
    const rx = w * s.r;
    const ry = rx * (0.3 + rand() * 0.12);
    const cy = ((s.lat + 1) / 2) * h;
    const rot = (rand() - 0.5) * 0.35;
    for (const dx of [-w, 0, w]) {
      ctx.save();
      ctx.translate(s.u * w + dx, cy);
      ctx.rotate(rot);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      if (s.warm) {
        g.addColorStop(0, "rgba(228, 152, 96, 0.5)");
        g.addColorStop(0.5, "rgba(196, 124, 78, 0.26)");
        g.addColorStop(1, "rgba(196, 124, 78, 0)");
      } else {
        g.addColorStop(0, "rgba(248, 238, 214, 0.42)");
        g.addColorStop(0.5, "rgba(226, 206, 170, 0.2)");
        g.addColorStop(1, "rgba(226, 206, 170, 0)");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  return canvas;
}

/**
 * Radial opacity/brightness profile of the ring system, in normalised distance
 * from RING_INNER to RING_OUTER. The ranges NOT covered by a band are the real
 * gaps: 0.575–0.66 is the Cassini division, 0.90–0.915 the Encke gap.
 */
const RING_BANDS: readonly { r0: number; r1: number; a: number; b: number }[] = [
  { r0: 0.0, r1: 0.2, a: 0.26, b: 0.36 }, // C ring — sparse and dim
  { r0: 0.2, r1: 0.29, a: 0.52, b: 0.58 },
  { r0: 0.29, r1: 0.575, a: 0.95, b: 1.0 }, // B ring — the bright dense one
  { r0: 0.66, r1: 0.9, a: 0.7, b: 0.74 }, // A ring
  { r0: 0.915, r1: 0.985, a: 0.52, b: 0.64 }, // outer A
];

/**
 * The ring texture is a 1-D radial profile: `u` is distance across the annulus
 * and there is no azimuthal variation (which is physically right — Saturn's
 * rings are rotationally symmetric). The 4px height exists only so the texture
 * is power-of-two in both axes and can mipmap; every row is identical.
 */
function paintRings(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(0x1c3a99);

  const ringlets = [
    { k: 41.3, a: 0.09, p: rand() * Math.PI * 2 },
    { k: 97.1, a: 0.07, p: rand() * Math.PI * 2 },
    { k: 183.7, a: 0.06, p: rand() * Math.PI * 2 },
    { k: 311.9, a: 0.04, p: rand() * Math.PI * 2 },
  ];

  const img = ctx.createImageData(w, h);
  const data = img.data;

  for (let x = 0; x < w; x++) {
    const u = (x + 0.5) / w;

    // max(), not sum(): overlapping soft edges must not stack past 1, and the
    // uncovered spans have to stay at exactly 0 to be true holes.
    let a = 0;
    let b = 0;
    for (const band of RING_BANDS) {
      const soft = Math.min(0.02, (band.r1 - band.r0) * 0.25);
      const w0 = smoothstep(band.r0, band.r0 + soft, u);
      const w1 = smoothstep(band.r1, band.r1 - soft, u);
      const k = w0 * w1;
      a = Math.max(a, band.a * k);
      b = Math.max(b, band.b * k);
    }

    let mod = 0;
    for (const r of ringlets) mod += Math.sin(u * r.k + r.p) * r.a;
    // Deep troughs in the noise carve extra hairline divisions.
    if (mod < -0.2) mod *= 2.2;

    a *= clamp01(1 + mod);
    b *= clamp01(1 + mod * 0.6);

    // Soften both extremities so neither edge is a hard-cut circle.
    a *= smoothstep(0, 0.025, u) * smoothstep(1, 0.97, u);

    const c = sampleRamp(RING_RAMP, b);
    const r8 = Math.round(c[0]);
    const g8 = Math.round(c[1]);
    const b8 = Math.round(c[2]);
    const a8 = Math.round(clamp01(a) * 255);

    for (let y = 0; y < h; y++) {
      const o = (y * w + x) * 4;
      // Gaps carry black as well as zero alpha, so the same texture can drive
      // emissiveMap (which ignores alpha) without lighting up the divisions.
      data[o] = a8 === 0 ? 0 : r8;
      data[o + 1] = a8 === 0 ? 0 : g8;
      data[o + 2] = a8 === 0 ? 0 : b8;
      data[o + 3] = a8;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function Saturn() {
  const planet = useRef<THREE.Mesh>(null);

  const planetMap = useMemo(() => {
    const tex = new THREE.CanvasTexture(paintPlanet(1024, 512));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping; // sphere UVs wrap once around in u
    tex.anisotropy = 8;
    return tex;
  }, []);

  const ringMap = useMemo(() => {
    const tex = new THREE.CanvasTexture(paintRings(1024, 4));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    // The rings are seen at a glancing angle almost all the time, which is the
    // exact case where an isotropic filter smears the divisions into mush.
    tex.anisotropy = 8;
    return tex;
  }, []);

  const ringGeometry = useMemo(() => {
    const geo = new THREE.RingGeometry(RING_INNER, RING_OUTER, 160, 1);
    // RingGeometry's stock UVs are a square projection of the annulus, so a
    // radial profile applied straight would sweep the texture across the disc
    // diagonally. Recomputing u from each vertex's own radius is exact
    // regardless of vertex ordering, and v is constant because the profile has
    // no azimuthal component.
    const position = geo.getAttribute("position");
    const uv = new Float32Array(position.count * 2);
    for (let i = 0; i < position.count; i++) {
      const r = Math.hypot(position.getX(i), position.getY(i));
      uv[i * 2] = clamp01((r - RING_INNER) / (RING_OUTER - RING_INNER));
      uv[i * 2 + 1] = 0.5;
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return geo;
  }, []);

  // GPU resources are external state with a manual lifetime — React frees the
  // JSX-declared geometries and materials on unmount, but not the textures or
  // the imperatively built ring geometry. react-hooks/immutability can't tell
  // a dispose() from a render-phase mutation.
  useEffect(() => {
    return () => {
      planetMap.dispose();
      ringMap.dispose();
      ringGeometry.dispose();
    };
  }, [planetMap, ringMap, ringGeometry]);

  // useFrame runs on the renderer's rAF loop, outside React's render phase.
  // Writing the transform in place is react-three-fiber's intended model, and
  // this touches the mesh's rotation only — never a material.
  useFrame((state) => {
    if (planet.current) planet.current.rotation.y = state.clock.elapsedTime * SPIN;
  });

  return (
    <group rotation={[TILT_FACE, 0, TILT_SIDE]}>
      <group scale={[1, OBLATENESS, 1]}>
        <mesh ref={planet}>
          <sphereGeometry args={[PLANET_R, 64, 40]} />
          <meshStandardMaterial map={planetMap} roughness={0.92} metalness={0.03} />
        </mesh>

        {/* Limb glow. A back-side shell is hidden behind the opaque planet
            everywhere except the thin annulus between the two silhouettes, so
            depth testing alone produces a rim — no blur pass required. Two
            shells give the falloff a warm inner and cool outer step. */}
        <mesh renderOrder={2}>
          <sphereGeometry args={[PLANET_R * 1.045, 40, 24]} />
          <meshBasicMaterial
            color="#f0b477"
            transparent
            opacity={0.3}
            side={THREE.BackSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh renderOrder={2}>
          <sphereGeometry args={[PLANET_R * 1.11, 40, 24]} />
          <meshBasicMaterial
            color={PALETTE.cyan}
            transparent
            opacity={0.13}
            side={THREE.BackSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Sibling of the planet, not a child: it inherits the axial tilt but
          none of the spin. RingGeometry is built in XY, so -90° about X drops
          it into the equatorial plane. */}
      <mesh geometry={ringGeometry} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <meshStandardMaterial
          map={ringMap}
          emissiveMap={ringMap}
          emissive="#c8b48c"
          emissiveIntensity={0.35}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
    </group>
  );
}
