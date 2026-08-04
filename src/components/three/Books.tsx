"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { PALETTE } from "./palette";

/**
 * Hardback book stack for the desk.
 *
 * A fake book gives itself away in two places: a cover flush with its pages,
 * and a page block with no edge detail. So each book here is a composite —
 * two cover boards, a spine, and a page block inset on its three free edges —
 * and the page edges are a texture rather than geometry, because ~24 modelled
 * leaves per book across five books buys thousands of triangles for a feature
 * that is a handful of pixels tall even at the zoomed hotspot camera.
 *
 * Everything repeated is instanced. Built as plain meshes this prop is 38
 * draw calls; instanced it is 6.
 */

/* ---------------------------------------------------------------- geometry */

/** Cover board thickness — also the lip that shows above and below the pages. */
const BOARD = 0.0055;
/** Spine board depth, measured inward from the cover's +z face. */
const SPINE = 0.011;
/** Cover overhang on the head, tail and fore edges. */
const OVERHANG = 0.008;
/** Seam between stacked books, so each cover keeps its own shadow line. */
const GAP = 0.0012;
/** How far spine printing stands proud of the spine face. */
const PRINT = 0.0016;
/** Foil stamp height. Fixed rather than proportional so it reads as a label. */
const FOIL_H = 0.0125;

/**
 * One unit box, scaled per instance. A box carries only axis-aligned normals,
 * and a diagonal scale maps each of those to a scalar multiple of itself, so
 * non-uniform instance scale survives the shader's normalise() intact — no
 * skewed lighting despite scales as lopsided as (0.4, 0.0055, 0.28).
 */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

/* --------------------------------------------------------------- materials */

const std = (p: THREE.MeshStandardMaterialParameters) =>
  new THREE.MeshStandardMaterial(p);

/**
 * Cover cloth. White on purpose — the per-book hue arrives as instanceColor,
 * which multiplies against this, so all fifteen cover parts share one material
 * and therefore one draw call.
 */
const M_COVER = std({ color: "#ffffff", roughness: 0.74, metalness: 0 });
/** Spine printing. Bone ink, deliberately not another neon. */
const M_BAND = std({ color: "#ded6c2", roughness: 0.55, metalness: 0 });
/** The only metal in the stack: a stamped foil rectangle per spine. */
const M_FOIL = std({ color: "#c8a044", roughness: 0.33, metalness: 0.7 });
/** Satin bookmark ribbon. */
const M_RIBBON = std({ color: "#8e2f4e", roughness: 0.44, metalness: 0 });

/**
 * The palette neons are far too saturated to read as bookbinding cloth. Pull
 * saturation and lightness down in sRGB rather than the linear working space,
 * so the numbers mean what they look like.
 */
function cloth(hex: string, sat: number, light: number): THREE.Color {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl, THREE.SRGBColorSpace);
  return c.setHSL(hsl.h, hsl.s * sat, light, THREE.SRGBColorSpace);
}

/* -------------------------------------------------------------- book specs */

/** A printed rule on the spine. All measurements fractional except thickness. */
type Band = {
  /** Centre height, as a fraction of the book's total height. */
  readonly t: number;
  /** Length, as a fraction of the cover width. */
  readonly len: number;
  /** Centre offset along the spine, as a fraction of the cover width. */
  readonly off: number;
  /** Height in metres. */
  readonly thick: number;
};

type Book = {
  readonly w: number;
  readonly d: number;
  readonly h: number;
  /** Hand-placed yaw in radians — a few degrees, never Math.random. */
  readonly yaw: number;
  readonly dx: number;
  readonly dz: number;
  readonly cloth: THREE.Color;
  readonly bands: readonly Band[];
  readonly ribbon?: boolean;
};

const TITLE = 0.0072;
const RULE = 0.003;

/**
 * Hardcoded rather than seeded, so the stack is not just deterministic but
 * inspectable. Sizes taper upward and the offsets keep the rotated envelope
 * inside 0.42 x 0.30; book index 3 is deliberately the askew one.
 */
const BOOKS: readonly Book[] = [
  {
    w: 0.407,
    d: 0.276,
    h: 0.062,
    yaw: 0.031,
    dx: 0,
    dz: 0,
    cloth: cloth(PALETTE.electric, 0.44, 0.3),
    bands: [
      { t: 0.32, len: 0.46, off: -0.12, thick: TITLE },
      { t: 0.6, len: 0.3, off: -0.2, thick: RULE },
      { t: 0.72, len: 0.3, off: -0.2, thick: RULE },
    ],
  },
  {
    w: 0.383,
    d: 0.266,
    h: 0.086,
    yaw: -0.049,
    dx: 0.009,
    dz: -0.007,
    cloth: cloth(PALETTE.purple, 0.42, 0.33),
    bands: [
      { t: 0.3, len: 0.42, off: -0.14, thick: TITLE },
      { t: 0.66, len: 0.26, off: -0.22, thick: RULE },
    ],
    ribbon: true,
  },
  {
    w: 0.398,
    d: 0.271,
    h: 0.053,
    yaw: 0.016,
    dx: -0.007,
    dz: 0.006,
    cloth: cloth(PALETTE.cyan, 0.46, 0.27),
    bands: [
      { t: 0.34, len: 0.48, off: -0.1, thick: TITLE },
      { t: 0.64, len: 0.32, off: -0.18, thick: RULE },
      { t: 0.76, len: 0.32, off: -0.18, thick: RULE },
    ],
  },
  {
    w: 0.367,
    d: 0.254,
    h: 0.073,
    yaw: 0.081,
    dx: 0.015,
    dz: 0.007,
    cloth: cloth(PALETTE.magenta, 0.4, 0.35),
    bands: [
      { t: 0.31, len: 0.44, off: -0.13, thick: TITLE },
      { t: 0.68, len: 0.28, off: -0.21, thick: RULE },
    ],
  },
  {
    w: 0.348,
    d: 0.246,
    h: 0.057,
    yaw: -0.028,
    dx: -0.011,
    dz: -0.005,
    cloth: cloth(PALETTE.purple, 0.34, 0.22),
    bands: [
      { t: 0.33, len: 0.4, off: -0.15, thick: TITLE },
      { t: 0.62, len: 0.28, off: -0.2, thick: RULE },
      { t: 0.74, len: 0.28, off: -0.2, thick: RULE },
    ],
  },
];

type Placed = Book & { readonly baseY: number };

const PLACED: readonly Placed[] = (() => {
  const out: Placed[] = [];
  let y = 0;
  for (const b of BOOKS) {
    out.push({ ...b, baseY: y });
    y += b.h + GAP;
  }
  return out;
})();

const RIBBONED = PLACED.filter((b) => b.ribbon);

const COVER_COUNT = BOOKS.length * 3;
const BAND_COUNT = BOOKS.reduce((n, b) => n + b.bands.length, 0);

/* ----------------------------------------------------------------- texture */

/** Deterministic PRNG — the paper must be identical on every load and device. */
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
 * Page-edge striations.
 *
 * The pattern varies only along v, which is +y on every side face of a box, so
 * four pixels of width is the whole texture. Each page block spans v 0..1 over
 * its own height, which means a thicker book automatically gets a finer line
 * pitch — the same way a thicker book has more leaves.
 *
 * The end-stop gradient matters more than the lines do: striations mip away to
 * flat cream at room distance, but the shading where the pages meet the boards
 * survives at every zoom level and is what stops the block reading as a slab.
 */
function paperTexture(): THREE.CanvasTexture {
  const H = 256;
  const GROUPS = 24;

  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(0x1b2136);

  ctx.fillStyle = "#e9e0ca";
  ctx.fillRect(0, 0, 4, H);

  const pitch = H / GROUPS;
  for (let i = 0; i < GROUPS; i++) {
    const y = Math.round(i * pitch);
    ctx.fillStyle = `rgba(112, 96, 68, ${(0.3 + rand() * 0.24).toFixed(3)})`;
    ctx.fillRect(0, y, 4, 3);
    ctx.fillStyle = `rgba(255, 251, 238, ${(0.28 + rand() * 0.26).toFixed(3)})`;
    ctx.fillRect(0, y + 4, 4, 2);
  }

  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, "rgba(48, 38, 24, 0.36)");
  shade.addColorStop(0.4, "rgba(48, 38, 24, 0)");
  shade.addColorStop(0.62, "rgba(48, 38, 24, 0)");
  shade.addColorStop(1, "rgba(48, 38, 24, 0.32)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 4, H);

  // Assigned rather than passed: three.js textures are external mutable state
  // and neither field has a constructor form.
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* --------------------------------------------------------------- component */

export function Books() {
  /**
   * A CanvasTexture cannot be built at module scope: this module is evaluated
   * during SSR, where `document` does not exist. So the one material that
   * needs a map is built beside its texture here — still created exactly once.
   */
  const paper = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: paperTexture(),
        color: "#ffffff",
        roughness: 0.86,
        metalness: 0,
      }),
    [],
  );

  const coverRef = useRef<THREE.InstancedMesh>(null);
  const pagesRef = useRef<THREE.InstancedMesh>(null);
  const bandsRef = useRef<THREE.InstancedMesh>(null);
  const foilRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const cover = coverRef.current;
    const pages = pagesRef.current;
    const bands = bandsRef.current;
    const foil = foilRef.current;
    if (!cover || !pages || !bands || !foil) return;

    const book = new THREE.Object3D();
    const part = new THREE.Object3D();
    const world = new THREE.Matrix4();
    const tint = new THREE.Color();

    // Instance matrices and colour buffers are three.js-owned GPU state: they
    // can only be filled by mutation. Done in a layout effect, once on mount,
    // never per frame.

    /** Writes a part positioned in the current book's local frame. */
    const place = (
      mesh: THREE.InstancedMesh,
      index: number,
      px: number,
      py: number,
      pz: number,
      sx: number,
      sy: number,
      sz: number,
    ) => {
      part.position.set(px, py, pz);
      part.scale.set(sx, sy, sz);
      part.updateMatrix();
      mesh.setMatrixAt(index, world.multiplyMatrices(book.matrix, part.matrix));
    };

    let ci = 0;
    let bi = 0;

    PLACED.forEach((b, i) => {
      book.position.set(b.dx, b.baseY, b.dz);
      book.rotation.set(0, b.yaw, 0);
      book.updateMatrix();

      // Cover: bottom board, top board, spine. The tonal split between the
      // three is what separates them under flat fill light — a single flat
      // colour reads as one moulded lump.
      place(cover, ci, 0, BOARD / 2, 0, b.w, BOARD, b.d);
      cover.setColorAt(ci++, tint.copy(b.cloth).multiplyScalar(0.86));

      place(cover, ci, 0, b.h - BOARD / 2, 0, b.w, BOARD, b.d);
      cover.setColorAt(ci++, tint.copy(b.cloth).multiplyScalar(1.12));

      place(cover, ci, 0, b.h / 2, b.d / 2 - SPINE / 2, b.w, b.h, SPINE);
      cover.setColorAt(ci++, tint.copy(b.cloth));

      // Page block: butted against the spine board, inset by the overhang on
      // the other three edges and by a board's thickness top and bottom.
      place(
        pages,
        i,
        0,
        b.h / 2,
        (OVERHANG - SPINE) / 2,
        b.w - OVERHANG * 2,
        b.h - BOARD * 2,
        b.d - SPINE - OVERHANG,
      );

      // Spine printing. Sunk a third of its thickness into the spine face so
      // the two surfaces intersect rather than sit coplanar and z-fight.
      for (const band of b.bands) {
        place(
          bands,
          bi++,
          b.w * band.off,
          b.h * band.t,
          b.d / 2 + PRINT * 0.35,
          b.w * band.len,
          band.thick,
          PRINT,
        );
      }

      place(
        foil,
        i,
        b.w * 0.35,
        b.h * 0.5,
        b.d / 2 + PRINT * 0.35,
        0.024,
        FOIL_H,
        PRINT,
      );
    });

    cover.instanceMatrix.needsUpdate = true;
    pages.instanceMatrix.needsUpdate = true;
    bands.instanceMatrix.needsUpdate = true;
    foil.instanceMatrix.needsUpdate = true;
    if (cover.instanceColor) cover.instanceColor.needsUpdate = true;

    // Frustum culling reads the instanced bounding sphere, which is otherwise
    // derived from the unmodified unit box and would cull the stack early.
    cover.computeBoundingSphere();
    pages.computeBoundingSphere();
    bands.computeBoundingSphere();
    foil.computeBoundingSphere();
  }, []);

  return (
    <group>
      <instancedMesh ref={coverRef} args={[UNIT_BOX, M_COVER, COVER_COUNT]} />
      <instancedMesh ref={pagesRef} args={[UNIT_BOX, paper, BOOKS.length]} />
      <instancedMesh ref={bandsRef} args={[UNIT_BOX, M_BAND, BAND_COUNT]} />
      <instancedMesh ref={foilRef} args={[UNIT_BOX, M_FOIL, BOOKS.length]} />

      {/* Bookmark ribbon, left in place by whoever was reading. Two pieces:
          one running out from between the pages, one drooping over the fore
          edge — a single straight tongue reads as a plastic tab. */}
      {RIBBONED.map((b, i) => (
        <group
          key={i}
          position={[b.dx, b.baseY, b.dz]}
          rotation={[0, b.yaw, 0]}
        >
          <group position={[-0.058, b.h / 2, -b.d / 2]} rotation={[0, 0.16, 0]}>
            <mesh
              geometry={UNIT_BOX}
              material={M_RIBBON}
              position={[0, 0, -0.008]}
              scale={[0.016, 0.0016, 0.04]}
            />
            <mesh
              geometry={UNIT_BOX}
              material={M_RIBBON}
              position={[0, -0.0078, -0.0408]}
              rotation={[-0.55, 0, 0]}
              scale={[0.016, 0.0016, 0.03]}
            />
          </group>
        </group>
      ))}
    </group>
  );
}
