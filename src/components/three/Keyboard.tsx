"use client";

import { useLayoutEffect, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import { PALETTE } from "./palette";

/* ------------------------------------------------------------------ metrics */

const CASE_W = 1.1;
const CASE_D = 0.35;
/** Solid aluminium slab. The machined rim walls stack on top of it. */
const BODY_H = 0.038;

/**
 * ~5.7° typing angle. A real board gets its wedge from a flat slab propped up
 * at the back by its feet, not from a tapered slab — modelling the taper into
 * the body instead leaves the front lip floating above the desk.
 */
const TILT = 0.1;

const GLOW_H = 0.007;
const GLOW_W = CASE_W + 0.015;
const GLOW_D = CASE_D + 0.006;

/** World Y of a point expressed in the tilted assembly's local space. */
const tiltedY = (y: number, z: number) =>
  y * Math.cos(TILT) - z * Math.sin(TILT);

/**
 * Lifts the tilted assembly so its lowest point — the front lip of the glow
 * strip — lands exactly on y=0. The parent drops this straight onto the desk
 * surface, so anything below zero sinks into the desk.
 */
const ASSEMBLY_Y = -tiltedY(-GLOW_H, GLOW_D / 2);

/**
 * The rim is four separate walls, not one capping box, because the plate has to
 * sit *inside* it. A closed chassis simply swallows the plate and the bottom of
 * every keycap — there is no z-offset that gets a recess out of a solid box.
 */
const WALL_TOP = 0.055;
const WALL_H = WALL_TOP - BODY_H;
const WALL_Y = BODY_H + WALL_H / 2;
const WALL_X_T = 0.038;
const WALL_Z_T = 0.018;
const WELL_W = CASE_W - WALL_X_T * 2;
const WELL_D = CASE_D - WALL_Z_T * 2;

const PLATE_TOP = 0.044;
const PLATE_H = 0.014;
const PLATE_Y = PLATE_TOP - PLATE_H / 2;
/** Tucks under the walls so no two faces end up coplanar and z-fight. */
const PLATE_W = WELL_W + 0.006;
const PLATE_D = WELL_D + 0.006;

/** 60% boards are 15u wide; the extra row on top is the function row. */
const COLS = 15;
const ROWS = 6;
const U = 0.0665;
const ROW_PITCH = 0.05;
const GAP_X = 0.0075;
const GAP_Z = 0.007;

const CAP_H = 0.024;
const CAP_D = ROW_PITCH - GAP_Z;
const CAP_Y = PLATE_TOP + CAP_H / 2;

const FOOT_Z = -0.145;
const FOOT_R = 0.013;
const FOOT_X = 0.45;
/** Exactly bridges the gap the tilt opens up under the back edge. */
const FOOT_H = ASSEMBLY_Y + tiltedY(-GLOW_H, FOOT_Z);

/* ------------------------------------------------------------------- layout */

/**
 * Key widths in units, back row first. Negative entries are blank gaps, which
 * is how the function row gets its F4/F5/F8 group breaks. Every row sums to
 * COLS so the block stays flush on both edges.
 */
const LAYOUT: readonly (readonly number[])[] = [
  [1, -0.5, 1, 1, 1, 1, -0.5, 1, 1, 1, 1, -0.5, 1, 1, 1, 1, -0.5],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
  [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
  [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
  [1.5, 1, 1.5, 7, 1.5, 1, 1.5],
];

type Cap = {
  x: number;
  z: number;
  /** Width in units. */
  w: number;
  /** Normalised 0..1 position across the board, drives the colour ramp. */
  t: number;
};

function buildLayout() {
  const unit: Cap[] = [];
  const wide: Cap[] = [];
  const halfW = (COLS * U) / 2;
  const halfD = (ROWS * ROW_PITCH) / 2;

  LAYOUT.forEach((row, r) => {
    const z = -halfD + ROW_PITCH * (r + 0.5);
    let cursor = 0;
    for (const w of row) {
      if (w < 0) {
        cursor -= w;
        continue;
      }
      const x = -halfW + (cursor + w / 2) * U;
      const cap: Cap = { x, z, w, t: (x + halfW) / (halfW * 2) };
      // 1u caps are identical, so they all ride one instanced draw call. The
      // rest need their real widths and become their own meshes.
      (w === 1 ? unit : wide).push(cap);
      cursor += w;
    }
  });

  return { unit, wide };
}

const { unit: UNIT_CAPS, wide: WIDE_CAPS } = buildLayout();

/* -------------------------------------------------------------------- color */

const RAMP_T = [0, 0.38, 0.72, 1];
const RAMP_C = [
  new THREE.Color(PALETTE.cyan),
  new THREE.Color(PALETTE.electric),
  new THREE.Color(PALETTE.purple),
  new THREE.Color(PALETTE.magenta),
];

function rampInto(out: THREE.Color, t: number): THREE.Color {
  const c = Math.min(Math.max(t, 0), 1);
  for (let i = 1; i < RAMP_T.length; i++) {
    if (c <= RAMP_T[i]) {
      const span = RAMP_T[i] - RAMP_T[i - 1];
      return out.copy(RAMP_C[i - 1]).lerp(RAMP_C[i], (c - RAMP_T[i - 1]) / span);
    }
  }
  return out.copy(RAMP_C[RAMP_C.length - 1]);
}

/** Charcoal ABS for the alphas, a darker shade for the modifier block. */
const ALPHA_BASE = new THREE.Color("#262e4a");
const MOD_BASE = new THREE.Color("#151b30");
/**
 * Deliberately low: this is dim underglow bleeding through dark plastic, not
 * lit keycaps. The mix happens in linear space, where a small fraction still
 * lifts a near-black base a long way once it is encoded back to sRGB — 0.3
 * here already produced saturated teal and plum caps.
 */
const ALPHA_TINT = 0.09;
const MOD_TINT = 0.06;

const rampScratch = new THREE.Color();

function capColor(
  out: THREE.Color,
  base: THREE.Color,
  t: number,
  amount: number,
): THREE.Color {
  rampInto(rampScratch, t);
  return out.copy(base).lerp(rampScratch, amount);
}

/* ---------------------------------------------------------------- resources */

/**
 * A unit keycap: a box with its top face pulled in, giving the truncated
 * pyramid every injection-moulded cap has. Instances scale this, so the wide
 * keys get a gentler X taper — stretching the 1u taper across a 7u spacebar
 * would splay its sides.
 */
function makeCapGeometry(taperX: number, taperZ: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      pos.setX(i, pos.getX(i) * taperX);
      pos.setZ(i, pos.getZ(i) * taperZ);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

const CAP_GEO = makeCapGeometry(0.8, 0.72);
const WIDE_CAP_GEO = makeCapGeometry(0.94, 0.72);
const GLOW_GEO = new THREE.BoxGeometry(GLOW_W, GLOW_H, GLOW_D);
const FOOT_GEO = new THREE.CylinderGeometry(FOOT_R, FOOT_R, FOOT_H, 12);

/**
 * Module-level singletons. Inline JSX materials allocate a fresh material — and
 * therefore a fresh shader-program lookup — on every render, which is what made
 * this room expensive before.
 */
const CASE_MAT = new THREE.MeshStandardMaterial({
  color: PALETTE.darkMetal,
  metalness: 0.95,
  roughness: 0.34,
});

const RIM_MAT = new THREE.MeshStandardMaterial({
  color: PALETTE.metal,
  metalness: 0.95,
  roughness: 0.2,
});

const PLATE_MAT = new THREE.MeshStandardMaterial({
  color: "#0a0e1c",
  metalness: 0.6,
  roughness: 0.72,
});

/**
 * White, because instanceColor multiplies the material colour — the actual
 * keycap shade lives entirely in the per-instance colours.
 */
const CAP_MAT = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  metalness: 0.1,
  roughness: 0.62,
});

const FOOT_MAT = new THREE.MeshStandardMaterial({
  color: "#0d1122",
  roughness: 0.85,
});

const GLOW_MAT = new THREE.MeshStandardMaterial({
  color: PALETTE.purple,
  emissive: new THREE.Color(PALETTE.purple),
  emissiveIntensity: 0.5,
  toneMapped: false,
});

/**
 * The wide keys cannot carry instanceColor, so they sample the same ramp at
 * five fixed stops and pick the nearest — enough to keep the left-to-right
 * hue drift continuous across the modifier block.
 */
const WIDE_MATS = [0, 0.25, 0.5, 0.75, 1].map(
  (t) =>
    new THREE.MeshStandardMaterial({
      color: capColor(new THREE.Color(), MOD_BASE, t, MOD_TINT),
      metalness: 0.1,
      roughness: 0.62,
    }),
);

const wideMaterial = (t: number) =>
  WIDE_MATS[Math.round(t * (WIDE_MATS.length - 1))];

/** Left/right walls run the full depth; front/back close the gap between them. */
const WALLS: readonly {
  id: string;
  args: [number, number, number];
  pos: [number, number, number];
}[] = [
  {
    id: "left",
    args: [WALL_X_T, WALL_H, CASE_D],
    pos: [-(CASE_W - WALL_X_T) / 2, WALL_Y, 0],
  },
  {
    id: "right",
    args: [WALL_X_T, WALL_H, CASE_D],
    pos: [(CASE_W - WALL_X_T) / 2, WALL_Y, 0],
  },
  {
    id: "back",
    args: [WELL_W, WALL_H, WALL_Z_T],
    pos: [0, WALL_Y, -(CASE_D - WALL_Z_T) / 2],
  },
  {
    id: "front",
    args: [WELL_W, WALL_H, WALL_Z_T],
    pos: [0, WALL_Y, (CASE_D - WALL_Z_T) / 2],
  },
];

/* ---------------------------------------------------------------- component */

export function Keyboard() {
  const caps = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = caps.current;
    if (!mesh) return;

    // three.js instance buffers are external mutable state, not React state:
    // matrices and colours have to be written imperatively after mount. This
    // runs once — nothing here is touched per frame.
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    UNIT_CAPS.forEach((cap, i) => {
      dummy.position.set(cap.x, CAP_Y, cap.z);
      dummy.scale.set(U - GAP_X, CAP_H, CAP_D);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, capColor(color, ALPHA_BASE, cap.t, ALPHA_TINT));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <group>
      <group position={[0, ASSEMBLY_Y, 0]} rotation={[TILT, 0, 0]}>
        {/* Underglow. Oversized footprint so it reads as a rim of light
            escaping under the case rather than a lit panel. */}
        <mesh
          geometry={GLOW_GEO}
          material={GLOW_MAT}
          position={[0, -GLOW_H / 2, 0]}
        />

        {/* drei doubles bevelSegments internally, so these stay low — the
            bevels are a few millimetres on an object seven units away. */}
        <RoundedBox
          args={[CASE_W, BODY_H, CASE_D]}
          radius={0.012}
          smoothness={2}
          bevelSegments={2}
          position={[0, BODY_H / 2, 0]}
          material={CASE_MAT}
        />

        {/* Machined rim walls — these are what make the plate read as sunken. */}
        {WALLS.map((wall) => (
          <RoundedBox
            key={wall.id}
            args={wall.args}
            radius={0.004}
            smoothness={1}
            bevelSegments={1}
            position={wall.pos}
            material={RIM_MAT}
          />
        ))}

        {/* Recessed switch plate the caps rise out of. */}
        <RoundedBox
          args={[PLATE_W, PLATE_H, PLATE_D]}
          radius={0.004}
          smoothness={1}
          bevelSegments={1}
          position={[0, PLATE_Y, 0]}
          material={PLATE_MAT}
        />

        <instancedMesh
          ref={caps}
          args={[CAP_GEO, CAP_MAT, UNIT_CAPS.length]}
        />

        {WIDE_CAPS.map((cap) => (
          <mesh
            key={`${cap.x.toFixed(4)}:${cap.z.toFixed(4)}`}
            geometry={WIDE_CAP_GEO}
            material={wideMaterial(cap.t)}
            position={[cap.x, CAP_Y, cap.z]}
            scale={[cap.w * U - GAP_X, CAP_H, CAP_D]}
          />
        ))}
      </group>

      {/* Feet sit outside the tilted group so they stay vertical on the desk. */}
      <mesh
        geometry={FOOT_GEO}
        material={FOOT_MAT}
        position={[-FOOT_X, FOOT_H / 2, FOOT_Z]}
      />
      <mesh
        geometry={FOOT_GEO}
        material={FOOT_MAT}
        position={[FOOT_X, FOOT_H / 2, FOOT_Z]}
      />
    </group>
  );
}
