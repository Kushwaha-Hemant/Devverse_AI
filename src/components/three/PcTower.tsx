"use client";

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { PALETTE } from "./palette";
import { useMediaQuery } from "@/lib/hooks";

/**
 * Glass-panel RGB gaming tower, replacing the old louvred server rack.
 *
 * Modelled on a modern tempered-glass mid-tower: exposed interior lit by ring
 * fans, an AIO loop that actually terminates in a radiator, a horizontal GPU
 * with a backplate, and the small hardware — VRM heatsinks, M.2 cover, PCIe
 * slot covers, standoffs, drive cages — that is what really separates "a box
 * with fans in it" from a build.
 *
 * DRAW-CALL DISCIPLINE. This scene is draw-call bound, so the ~30 small parts
 * are carried by two instanced meshes (one box-based, one cylinder-based) and
 * every cable is merged into a single geometry. That buys roughly 30 visible
 * components for 3 draw calls. Every material is a module-level singleton.
 */

// Proportions: was 0.78 wide, which read as a squat cube next to its 1.3
// height. Real mid-towers are markedly taller and deeper than they are wide.
const W = 0.68;
const H = 1.3;
const D = 0.8;
/** Feet lift the chassis so it reads as standing on the floor, not sunk in. */
const LIFT = 0.05;

/* ---------------------------------------------------------------- materials */

const shell = new THREE.MeshStandardMaterial({
  color: "#0e1322",
  metalness: 0.72,
  roughness: 0.45, // powder-coated steel, not a mirror
});

/** Brushed aluminium for the frame and trim — brighter, tighter highlight. */
const brushed = new THREE.MeshStandardMaterial({
  color: "#48547a",
  metalness: 0.92,
  roughness: 0.28,
});

const heatsink = new THREE.MeshStandardMaterial({
  color: "#8994ad",
  metalness: 0.88,
  roughness: 0.35,
});

/**
 * Tempered glass. Real transmission is far too expensive here, so this is a
 * faintly tinted transparent surface — at this scale it reads the same.
 * Front and side are separate singletons so the side, seen at a grazing angle
 * from the DevOps camera, can carry the stronger sheen that real glass shows
 * off-axis.
 */
const glassFront = new THREE.MeshStandardMaterial({
  color: "#8fb6ff",
  transparent: true,
  opacity: 0.1,
  metalness: 0.2,
  roughness: 0.05,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const glassSide = new THREE.MeshStandardMaterial({
  color: "#a9c6ff",
  transparent: true,
  opacity: 0.17,
  metalness: 0.35,
  roughness: 0.04,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const pcb = new THREE.MeshStandardMaterial({
  color: "#0b2545",
  metalness: 0.25,
  roughness: 0.78,
});

const cable = new THREE.MeshStandardMaterial({
  color: "#0c101c",
  metalness: 0.15,
  roughness: 0.85,
});

const blade = new THREE.MeshStandardMaterial({
  color: "#cdd8ee",
  metalness: 0.1,
  roughness: 0.6,
});

/** Fan frames are injection-moulded plastic. Sharing the metallic shell
 *  material made them read as chrome, which no fan is. */
const fanFrame = new THREE.MeshStandardMaterial({
  color: "#0f1424",
  metalness: 0.05,
  roughness: 0.74,
});

const glow = (color: string, intensity: number) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    toneMapped: false,
  });

const ringLit = glow("#5b8cff", 1.5);
const ringLitAlt = glow("#a855f7", 1.5);
const pumpLit = glow(PALETTE.cyan, 1.4);
const ramLit = glow(PALETTE.magenta, 1.1);
const stripLit = glow("#6ea8ff", 1.2);
const bladeLit = glow("#7fd4ff", 1.8);

/* ------------------------------------------------------------ glow sprites */

/**
 * Soft radial sprite, used additively for the RGB spill. Light bleeding onto
 * the surrounding surfaces is most of what makes RGB read as *light* rather
 * than as brightly-coloured plastic — and a sprite does it for one draw call,
 * where real lights would cost a shadow-free forward pass each.
 */
let glowSprite: THREE.CanvasTexture | null = null;
function getGlowSprite(): THREE.CanvasTexture {
  if (glowSprite) return glowSprite;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowSprite = new THREE.CanvasTexture(c);
  glowSprite.colorSpace = THREE.SRGBColorSpace;
  return glowSprite;
}

/* ----------------------------------------------------------------- greebles */

/** [x, y, z, sx, sy, sz] — box-shaped small hardware. */
const BOX_GREEBLES: [number, number, number, number, number, number][] = [
  // VRM heatsinks flanking the socket
  [-0.24, 1.03, -0.3, 0.07, 0.17, 0.045],
  [-0.1, 1.14, -0.3, 0.2, 0.05, 0.045],
  // M.2 heatsink under the GPU
  [-0.09, 0.75, -0.3, 0.22, 0.035, 0.04],
  // Chipset heatsink
  [-0.05, 0.5, -0.3, 0.1, 0.1, 0.035],
  // Rear I/O shield + port block
  [-0.28, 1.12, -0.36, 0.09, 0.14, 0.05],
  // PCIe slot covers on the rear wall
  [-0.3, 0.63, -0.37, 0.05, 0.02, 0.03],
  [-0.3, 0.585, -0.37, 0.05, 0.02, 0.03],
  [-0.3, 0.54, -0.37, 0.05, 0.02, 0.03],
  [-0.3, 0.495, -0.37, 0.05, 0.02, 0.03],
  // GPU backplate lip and bracket
  [-0.05, 0.545, -0.2, 0.42, 0.012, 0.28],
  [-0.27, 0.6, -0.2, 0.016, 0.09, 0.26],
  // 2.5" drives on the shroud
  [0.08, 0.32, -0.12, 0.19, 0.014, 0.14],
  [0.08, 0.345, -0.12, 0.19, 0.014, 0.14],
  // PSU shroud cable cutout surrounds
  [-0.18, 0.29, 0.16, 0.09, 0.012, 0.05],
  [0.1, 0.29, 0.16, 0.09, 0.012, 0.05],
  // Front radiator mounting rails
  [0.17, 0.28, 0.3, 0.02, 0.03, 0.06],
  [0.17, 1.15, 0.3, 0.02, 0.03, 0.06],
  // Motherboard standoffs
  [-0.28, 0.42, -0.33, 0.02, 0.02, 0.02],
  [0.13, 0.42, -0.33, 0.02, 0.02, 0.02],
  [-0.28, 1.16, -0.33, 0.02, 0.02, 0.02],
];

/** [x, y, z, radius, height, rotX] — cylinder-shaped small hardware. */
const CYL_GREEBLES: [number, number, number, number, number, number][] = [
  // AIO fittings on the pump
  [-0.17, 1.02, -0.22, 0.016, 0.05, 0],
  [-0.07, 1.02, -0.22, 0.016, 0.05, 0],
  // Radiator barbs
  [0.17, 1.16, 0.24, 0.015, 0.045, Math.PI / 2],
  [0.17, 0.36, 0.24, 0.015, 0.045, Math.PI / 2],
  // Capacitors near the VRM
  [-0.19, 0.94, -0.29, 0.012, 0.03, 0],
  [-0.15, 0.94, -0.29, 0.012, 0.03, 0],
  // Rubber cable grommets through the shroud
  [-0.18, 0.3, 0.16, 0.022, 0.012, Math.PI / 2],
  [0.1, 0.3, 0.16, 0.022, 0.012, Math.PI / 2],
  // PSU fan hub, visible through the shroud cutout
  [0.0, 0.1, 0.26, 0.05, 0.012, Math.PI / 2],
  // Front-panel power button
  [-0.3, 1.2, 0.39, 0.014, 0.006, Math.PI / 2],
];

/** Every box-shaped greeble as one draw call. */
function BoxGreebles() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = new THREE.Object3D();
    BOX_GREEBLES.forEach(([x, y, z, sx, sy, sz], i) => {
      d.position.set(x, y, z);
      d.scale.set(sx, sy, sz);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, BOX_GREEBLES.length]}
      material={heatsink}
    >
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

/** Every cylindrical greeble as one draw call. */
function CylGreebles() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = new THREE.Object3D();
    CYL_GREEBLES.forEach(([x, y, z, r, h, rx], i) => {
      d.position.set(x, y, z);
      d.rotation.set(rx, 0, 0);
      d.scale.set(r, h, r);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, CYL_GREEBLES.length]}
      material={brushed}
    >
      {/* Unit radius and unit height, so per-instance scale sets both. */}
      <cylinderGeometry args={[1, 1, 1, 14]} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------- cables */

const CABLE_RUNS: {
  points: [number, number, number][];
  r: number;
}[] = [
  // AIO: pump out to the top of the radiator, and back in at the bottom.
  { points: [[-0.07, 1.04, -0.2], [0.02, 1.2, -0.02], [0.15, 1.18, 0.2]], r: 0.021 },
  { points: [[-0.17, 1.04, -0.2], [-0.05, 0.72, -0.02], [0.15, 0.38, 0.2]], r: 0.021 },
  // 24-pin ATX up from the shroud grommet to the board edge.
  { points: [[0.1, 0.3, 0.14], [0.16, 0.62, 0.0], [0.14, 0.86, -0.26]], r: 0.017 },
  // 8-pin EPS up the right-hand side to the top of the board.
  { points: [[-0.18, 0.3, 0.14], [-0.32, 0.86, 0.06], [-0.3, 1.2, -0.26]], r: 0.014 },
  // PCIe power into the top of the GPU.
  { points: [[0.1, 0.3, 0.16], [0.12, 0.5, 0.1], [0.02, 0.63, -0.06]], r: 0.015 },
  // Front-panel bundle along the bottom of the board.
  { points: [[-0.18, 0.31, 0.13], [-0.1, 0.36, -0.1], [0.06, 0.4, -0.3]], r: 0.011 },
];

/**
 * All six cable runs merged into ONE geometry. Six separate tube meshes would
 * be six draw calls for something read as a single bundle.
 */
function CableHarness() {
  const geo = useMemo(() => {
    const parts = CABLE_RUNS.map(({ points, r }) => {
      const curve = new THREE.CatmullRomCurve3(
        points.map((p) => new THREE.Vector3(...p)),
      );
      return new THREE.TubeGeometry(curve, 22, r, 6, false);
    });
    const merged = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    return merged;
  }, []);

  useLayoutEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return <mesh geometry={geo} material={cable} />;
}

/* ---------------------------------------------------------------- radiator */

/** The slab the AIO tubes actually run to, plus its fin stack. */
function Radiator() {
  const fins = useRef<THREE.InstancedMesh>(null);
  const COUNT = 26;
  useLayoutEffect(() => {
    const mesh = fins.current;
    if (!mesh) return;
    const d = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      d.position.set(0.17, 0.4 + i * 0.0295, 0.225);
      d.scale.set(0.25, 0.016, 0.044);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <>
      <mesh position={[0.17, 0.77, 0.215]} material={shell}>
        <boxGeometry args={[0.27, 0.86, 0.05]} />
      </mesh>
      <instancedMesh
        ref={fins}
        args={[undefined, undefined, COUNT]}
        material={heatsink}
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </>
  );
}

/* ------------------------------------------------------------- light spill */

/** Where each fan's halo sits, and what colour it spills. Ordered to match the
 *  fan mount order, so slicing to `fanCount` drops the same two the phone
 *  build drops. */
const HALO_AT: [number, number, number, string][] = [
  [0.17, 0.44, 0.34, "#5b8cff"],
  [0.17, 0.96, 0.34, "#5b8cff"],
  [0.17, 0.7, 0.34, "#a855f7"],
  [-0.06, 1.24, 0.06, "#a855f7"],
];

/** Additive halos in front of each fan, and a pool of light under the case. */
function LightSpill({ fanCount }: { fanCount: number }) {
  const sprite = useMemo(() => getGlowSprite(), []);
  const halos = useRef<THREE.InstancedMesh>(null);

  // Two materials, not one. Additive glow is unforgiving: at a single shared
  // opacity the fan halos bleached the fans they were meant to light and the
  // floor pool washed the whole case to pale grey. The halo sits close to its
  // source and needs far less than the broad floor pool does.
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: sprite,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        opacity: 0.28,
      }),
    [sprite],
  );

  const floorMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: sprite,
        color: "#4b7ae0",
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        opacity: 0.2,
      }),
    [sprite],
  );

  useLayoutEffect(() => {
    const mesh = halos.current;
    if (!mesh) return;
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    HALO_AT.slice(0, fanCount).forEach(([x, y, z, col], i) => {
      d.position.set(x, y, z);
      d.rotation.set(0, 0, 0);
      d.scale.set(0.3, 0.3, 1);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, c.set(col));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  }, [fanCount]);

  return (
    <>
      <instancedMesh
        ref={halos}
        args={[undefined, undefined, fanCount]}
        material={haloMat}
      >
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
      {/* Pool on the floor. Sits just above y=0 in the tower's own space, and
          the tower's origin is the room floor. */}
      <mesh
        position={[0.05, 0.004, 0.06]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={floorMat}
      >
        <planeGeometry args={[1.15, 1.15]} />
      </mesh>
    </>
  );
}

/* --------------------------------------------------------------------- fans */

/**
 * A 120mm ring fan. Blades are one instanced mesh so a seven-blade rotor is a
 * single draw call, and the whole rotor spins as an object transform (never a
 * material mutation).
 *
 * The rotor is registered with the parent rather than driving its own
 * `useFrame`: four fans meant four separate per-frame subscriptions, and this
 * scene is draw-call/overhead bound rather than GPU bound.
 */
function Fan({
  position,
  radius = 0.108,
  speed = 1,
  accent,
  register,
}: {
  position: [number, number, number];
  radius?: number;
  speed?: number;
  accent: THREE.Material;
  register: (rotor: THREE.Object3D, speed: number) => void;
}) {
  const rotor = useRef<THREE.InstancedMesh>(null);
  const BLADES = 7;

  useLayoutEffect(() => {
    const mesh = rotor.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < BLADES; i++) {
      const a = (i / BLADES) * Math.PI * 2;
      dummy.position.set(
        Math.cos(a) * radius * 0.52,
        Math.sin(a) * radius * 0.52,
        0,
      );
      // Angle each blade about its own radius so it reads as pitched, not flat.
      dummy.rotation.set(0, 0.5, a + Math.PI / 2);
      dummy.scale.set(radius * 0.86, radius * 0.42, 0.012);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    // instanceMatrix is GPU-side state on an external three.js object; it must
    // be flagged dirty imperatively after writing matrices.
    mesh.instanceMatrix.needsUpdate = true;

    register(mesh, speed);
  }, [radius, register, speed]);

  return (
    <group position={position}>
      {/* Lit outer ring — the signature of an RGB fan. */}
      <mesh material={accent}>
        <torusGeometry args={[radius, 0.013, 8, 40]} />
      </mesh>
      {/* Shroud. One flat ring rather than four boxes — this scene is
          draw-call bound, and four fans x four boxes was 16 calls for a detail
          nobody reads individually.
          A 4-segment ring puts its vertices at 0/90/180/270°, which is a
          DIAMOND, not a square — it read as a rotated lozenge behind each fan.
          The 45° turn squares it up, and at outer radius 1.62r the half-flat
          is 0.124 against the 0.26 fan pitch, so the three frames butt into
          one continuous radiator face instead of floating separately. */}
      <mesh position={[0, 0, -0.012]} rotation={[0, 0, Math.PI / 4]} material={fanFrame}>
        <ringGeometry args={[radius * 0.99, radius * 1.62, 4, 1]} />
      </mesh>
      {/* No hub cylinder: it sits dead centre behind the blades and is never
          visible, so it was one draw call per fan for nothing. */}
      <instancedMesh
        ref={rotor}
        args={[undefined, undefined, BLADES]}
        material={blade}
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  );
}

/** The four vertical frame rails, as a single instanced draw. */
function CornerPosts() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const corners = [
      [W / 2, D / 2],
      [-W / 2, D / 2],
      [W / 2, -D / 2],
      [-W / 2, -D / 2],
    ];
    corners.forEach(([x, z], i) => {
      dummy.position.set(x, H / 2, z);
      dummy.scale.set(0.024, H, 0.024);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 4]} material={brushed}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

/** Four tapered feet, so the case stands on the floor rather than in it. */
function Feet() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = new THREE.Object3D();
    const at = [
      [W / 2 - 0.05, D / 2 - 0.06],
      [-W / 2 + 0.05, D / 2 - 0.06],
      [W / 2 - 0.05, -D / 2 + 0.06],
      [-W / 2 + 0.05, -D / 2 + 0.06],
    ];
    at.forEach(([x, z], i) => {
      d.position.set(x, LIFT / 2, z);
      d.scale.set(1, LIFT, 1);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 4]} material={brushed}>
      {/* Wider at the base than the top, so it tapers the right way. */}
      <cylinderGeometry args={[0.032, 0.042, 1, 10]} />
    </instancedMesh>
  );
}

export function PcTower() {
  // Phones render this tower a few dozen pixels tall, but it still paid full
  // price for four spinning fans. Same signal Scene.tsx tiers quality on.
  const smallViewport = useMediaQuery("(max-width: 768px)");
  const fanCount = smallViewport ? 2 : 4;

  // One frame subscription drives every rotor, instead of one per fan.
  const rotors = useRef<{ mesh: THREE.Object3D; speed: number }[]>([]);
  const register = useCallback((mesh: THREE.Object3D, speed: number) => {
    if (!rotors.current.some((r) => r.mesh === mesh)) {
      rotors.current.push({ mesh, speed });
    }
  }, []);

  /* eslint-disable react-hooks/immutability */
  // Rotors are external three.js objects; r3f's frame loop runs outside
  // React's render, and mutating the transform in place is its intended model.
  useFrame((_, delta) => {
    for (const r of rotors.current) r.mesh.rotation.z += delta * r.speed * 2.4;
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group>
      <Feet />
      <LightSpill fanCount={fanCount} />

      {/* Everything above the feet is lifted as one group. */}
      <group position={[0, LIFT, 0]}>
        {/* --- Shell: solid back, floor, roof and far side; glass to camera --- */}
        <mesh position={[0, H / 2, -D / 2]} material={shell}>
          <boxGeometry args={[W, H, 0.03]} />
        </mesh>
        <mesh position={[0, 0.015, 0]} material={shell}>
          <boxGeometry args={[W, 0.03, D]} />
        </mesh>
        <mesh position={[0, H, 0]} material={shell}>
          <boxGeometry args={[W, 0.03, D]} />
        </mesh>
        <mesh position={[-W / 2, H / 2, 0]} material={shell}>
          <boxGeometry args={[0.03, H, D]} />
        </mesh>

        {/* Perforated top exhaust, recessed into the roof. */}
        <mesh
          position={[0, H + 0.017, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={brushed}
        >
          <ringGeometry args={[0.04, 0.26, 6, 2]} />
        </mesh>

        {/* Glass front + right side */}
        <mesh position={[0, H / 2, D / 2]} material={glassFront}>
          <planeGeometry args={[W, H]} />
        </mesh>
        <mesh
          position={[W / 2, H / 2, 0]}
          rotation={[0, Math.PI / 2, 0]}
          material={glassSide}
        >
          <planeGeometry args={[D, H]} />
        </mesh>

        {/* Corner posts — a glass case still shows its frame. One instanced
            mesh rather than four meshes: identical geometry and material. */}
        <CornerPosts />

        {/* Vertical accent blade down the front edge — the piece of visual
            hierarchy the eye lands on first when the camera flies here. */}
        <mesh position={[-W / 2 + 0.035, H / 2, D / 2 + 0.008]} material={bladeLit}>
          <boxGeometry args={[0.016, H * 0.78, 0.006]} />
        </mesh>

        {/* --- Interior --- */}
        <mesh position={[-0.05, H * 0.62, -D / 2 + 0.06]} material={pcb}>
          <boxGeometry args={[W * 0.72, H * 0.5, 0.02]} />
        </mesh>

        {/* CPU block with a lit pump ring */}
        <group position={[-0.12, 1.0, -D / 2 + 0.14]}>
          <RoundedBox args={[0.17, 0.17, 0.08]} radius={0.016}>
            <primitive object={shell} attach="material" />
          </RoundedBox>
          <mesh position={[0, 0, 0.044]} material={pumpLit}>
            <torusGeometry args={[0.05, 0.008, 8, 28]} />
          </mesh>
        </group>

        <Radiator />
        <CableHarness />
        <BoxGreebles />
        <CylGreebles />

        {/* RAM bank. Four separate sticks was 8 draw calls for something 3px
            wide on screen; one slab plus one lit strip reads identically. */}
        <group position={[0.13, 1.0, -D / 2 + 0.1]}>
          <mesh material={pcb}>
            <boxGeometry args={[0.11, 0.19, 0.05]} />
          </mesh>
          <mesh position={[0, 0.1, 0]} material={ramLit}>
            <boxGeometry args={[0.11, 0.012, 0.05]} />
          </mesh>
        </group>

        {/* Graphics card, mounted horizontally with a lit edge */}
        <group position={[-0.05, 0.6, -D / 2 + 0.2]}>
          <RoundedBox args={[W * 0.68, 0.1, 0.3]} radius={0.012}>
            <primitive object={shell} attach="material" />
          </RoundedBox>
          <mesh position={[0, 0.052, 0]} material={stripLit}>
            <boxGeometry args={[W * 0.6, 0.006, 0.02]} />
          </mesh>
          {[-0.1, 0.1].map((x) => (
            <mesh key={x} position={[x, 0.051, 0.02]} material={brushed}>
              <cylinderGeometry args={[0.05, 0.05, 0.012, 16]} />
            </mesh>
          ))}
        </group>

        {/* PSU shroud */}
        <mesh position={[0, 0.14, -0.02]} material={shell}>
          <boxGeometry args={[W - 0.06, 0.24, D - 0.1]} />
        </mesh>
        <mesh position={[0, 0.14, D / 2 - 0.09]} material={stripLit}>
          <boxGeometry args={[W - 0.22, 0.012, 0.01]} />
        </mesh>

        {/* --- Fan stack behind the front glass, plus one exhaust up top ---
            Phones get the top and bottom of the stack only. At phone scale the
            middle fan is a couple of pixels and indistinguishable, but it costs
            the same three draw calls as on desktop. */}
        <Fan
          position={[0.17, 0.44, D / 2 - 0.16]}
          accent={ringLit}
          speed={1}
          register={register}
        />
        {!smallViewport && (
          <Fan
            position={[0.17, 0.7, D / 2 - 0.16]}
            accent={ringLitAlt}
            speed={0.86}
            register={register}
          />
        )}
        <Fan
          position={[0.17, 0.96, D / 2 - 0.16]}
          accent={ringLit}
          speed={1.12}
          register={register}
        />
        {!smallViewport && (
          <Fan
            position={[-0.06, H - 0.05, 0.04]}
            radius={0.095}
            accent={ringLitAlt}
            speed={0.7}
            register={register}
          />
        )}
      </group>
    </group>
  );
}
