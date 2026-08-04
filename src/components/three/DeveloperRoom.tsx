"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";

import { SpaceBackdrop } from "./SpaceBackdrop";
import { Keyboard } from "./Keyboard";
import { Books } from "./Books";
import { Saturn } from "./Saturn";
import { PcTower } from "./PcTower";
import { LaptopDuo } from "./LaptopDuo";
import {
  Chair,
  CoffeeCup,
  Desk,
  Hotspot,
  Monitor,
  Mouse,
  PALETTE,
  Plant,
  RoomWindow,
  Whiteboard,
  type HotspotId,
} from "./objects";

/**
 * Where the camera parks for each focus target. Navigation moves the camera
 * instead of scrolling a page — the "explore a world" idea from the brief.
 */
export const CAMERA_VIEWS: Record<
  string,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  home: { position: [0, 2.2, 7.2], target: [0, 1, 0] },
  laptop: { position: [-1.2, 1.9, 2.6], target: [-1.2, 1.15, 0] },
  monitor: { position: [0.4, 2.1, 3.2], target: [0.4, 1.7, -0.4] },
  books: { position: [-2.0, 1.7, 2.0], target: [-1.95, 1.18, -0.45] },
  coffee: { position: [1.5, 1.6, 2.0], target: [1.5, 1.05, 0.35] },
  server: { position: [3.6, 1.9, 2.6], target: [3.6, 1.0, -1.2] },
  robot: { position: [2.2, 3.1, 2.6], target: [2.2, 2.7, -0.2] },
  // Status and Roadmap are mirrored boards on opposite walls, so their camera
  // parks mirror too.
  //
  // Both sit ~3.4 back rather than the ~2.0 they used to. At 2.0 the 2.2-wide
  // board overflowed the frame, which was fine when it held four coloured
  // bars but not now that the Roadmap carries a readable node graph — and the
  // hotspot drawer covers the right 448px, so there is less usable width than
  // the viewport suggests.
  // The aim points sit ~0.4 to the RIGHT of each board's centre on purpose:
  // lookAt centres the target, so aiming right slides the board left, out from
  // under the drawer and into the usable width.
  // Parked further back than the Roadmap: this board is 2.6x1.9 against the
  // whiteboard's 2.2x1.3, so the same distance cropped it.
  window: { position: [1.6, 2.6, 2.25], target: [5.4, 2.3, -1.0] },
  whiteboard: { position: [-2.2, 2.5, 1.4], target: [-4.2, 2.3, -1.0] },
};

/** Eases the camera toward the active view every frame. */
function CameraRig({ view }: { view: string }) {
  const { camera, size } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, 1, 0));
  const pointer = useRef(new THREE.Vector2());

  // `fov` is the VERTICAL field of view, so a tall phone viewport collapses the
  // horizontal one: at 390x844 the 42° vertical fov leaves roughly 20° across,
  // which framed the chair and nothing else. Widen the lens in portrait and let
  // the rig below also pull the camera back.
  const aspect = size.width / Math.max(1, size.height);

  // react-hooks/immutability assumes render-phase semantics. The camera is an
  // external three.js object: `useFrame` runs outside React's render on
  // three.js' own rAF loop, and mutating the camera in place is
  // react-three-fiber's intended model — cloning it per frame would be both
  // wrong and a garbage-collection problem at 60fps.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = aspect < 1 ? 52 : aspect < 1.35 ? 46 : 42;
    cam.updateProjectionMatrix();
  }, [camera, aspect]);

  useFrame((state, delta) => {
    const v = CAMERA_VIEWS[view] ?? CAMERA_VIEWS.home;

    // Widening the lens alone isn't enough on a tall screen — past ~60° the
    // perspective distorts badly — so also stand back a little in portrait.
    // Kept modest: pulling back hard fits the room but strands it as a small
    // island in empty floor, because a tall viewport has height to spare.
    const fit = THREE.MathUtils.clamp(1.22 / aspect, 1, 1.3);

    // Portrait wants the room in the lower half with the headline above it.
    // Aiming the camera higher pushes the subject down the frame.
    const aimUp = aspect < 1 ? 0.75 : 0;

    // Subtle parallax so the room feels alive even when idle.
    pointer.current.lerp(state.pointer, 0.05);
    const px = pointer.current.x * 0.5;
    const py = pointer.current.y * 0.25;

    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      v.position[0] + px,
      3,
      delta,
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      v.position[1] + py,
      3,
      delta,
    );
    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      v.position[2] * fit,
      3,
      delta,
    );

    lookAt.current.x = THREE.MathUtils.damp(lookAt.current.x, v.target[0], 3, delta);
    lookAt.current.y = THREE.MathUtils.damp(
      lookAt.current.y,
      v.target[1] + aimUp,
      3,
      delta,
    );
    lookAt.current.z = THREE.MathUtils.damp(lookAt.current.z, v.target[2], 3, delta);
    camera.lookAt(lookAt.current);
  });
  /* eslint-enable react-hooks/immutability */

  return null;
}

export function DeveloperRoom({
  view,
  active,
  onSelect,
}: {
  view: string;
  active: HotspotId | null;
  onSelect: (id: HotspotId) => void;
}) {
  return (
    <>
      <CameraRig view={view} />

      {/* --- Lighting: cool key, warm rim, neon fills ---
          Ambient was 0.25 and the key 0.7, which left every non-emissive
          surface reading as a silhouette. Raised enough to actually model the
          furniture; the mood still comes from the near-black palette and the
          coloured fills below, not from underexposing the room. */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 4]} intensity={1.15} color="#cddcff" />
      {/* Low fill from the front so the desk edge and monitor bezel catch a
          highlight instead of vanishing into the backdrop. */}
      <directionalLight position={[0, 2.5, 8]} intensity={0.45} color="#9fb4e8" />
      <pointLight position={[-3, 2.5, 2]} intensity={22} color={PALETTE.purple} distance={12} />
      <pointLight position={[3.5, 2, 1]} intensity={18} color={PALETTE.cyan} distance={12} />
      <pointLight position={[0, 1.6, 1.5]} intensity={10} color={PALETTE.electric} distance={8} />
      {/* `Environment preset="night"` fetched an HDR and ran image-based
          lighting every frame. The explicit lights above already carry the
          look, so it's pure cost here. */}

      {/* Deep-space backdrop. Baked into a skybox texture rather than drei's
          <Stars>, which re-projected 700 animated points every frame for a
          far flatter result. */}
      <SpaceBackdrop />

      {/* --- Floor --- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color="#070b18"
          metalness={0.7}
          roughness={0.35}
        />
      </mesh>
      <gridHelper
        args={[40, 40, PALETTE.electric, "#12203f"]}
        position={[0, 0.01, 0]}
      />
      {/* frames={1} bakes the shadow map once instead of re-rendering the
          whole scene into it every frame. Nothing here casts a moving shadow,
          so the result is identical. */}
      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.55}
        scale={16}
        blur={2.4}
        far={5}
        frames={1}
      />

      {/* --- Furniture --- */}
      <group position={[0, 1.05, 0]}>
        <Desk />
      </group>
      <group position={[0, 0, 1.75]}>
        <Chair />
      </group>

      {/* --- Interactive objects --- */}
      <Hotspot
        id="laptop"
        labelHeight={0.8}
        label="Projects"
        position={[-1.2, 1.11, 0.1]}
        active={active === "laptop"}
        onSelect={onSelect}
      >
        <LaptopDuo />
      </Hotspot>

      <Hotspot
        id="monitor"
        labelHeight={1.78}
        label="Live Terminal"
        position={[0.5, 1.09, -0.35]}
        active={active === "monitor"}
        onSelect={onSelect}
      >
        <Monitor />
      </Hotspot>

      <Hotspot
        id="coffee"
        labelHeight={0.3}
        label="Fun Facts"
        position={[1.55, 1.2, 0.45]}
        active={active === "coffee"}
        onSelect={onSelect}
      >
        <CoffeeCup />
      </Hotspot>

      <Hotspot
        id="books"
        labelHeight={0.46}
        label="Education"
        // Desk top spans x -2.3..2.3, z -0.85..0.85, surface at y 1.09.
        // This used to sit at x -3.3 — a full unit past the edge, floating.
        position={[-1.95, 1.13, -0.45]}
        active={active === "books"}
        onSelect={onSelect}
      >
        <Books />
      </Hotspot>

      <Hotspot
        id="server"
        labelHeight={1.88}
        label="DevOps"
        position={[3.6, 0.02, -1.2]}
        active={active === "server"}
        onSelect={onSelect}
      >
        <PcTower />
      </Hotspot>

      {/* Raised from y 1.95: its "AI Assistant" label landed at the same screen
          height as the hero headline and sat behind the "a" of Kushwaha. At
          this distance one world unit is ~158px, so +0.55 lifts the label
          clear into the gap between the nav bar and the eyebrow line. */}
      <Hotspot
        id="robot"
        labelHeight={0.62}
        label="AI Assistant"
        position={[2.2, 2.72, -0.2]}
        active={active === "robot"}
        onSelect={onSelect}
      >
        {/* Scaled on the group rather than by editing Saturn's radii, so the
            ring UV maths and band proportions inside the component stay
            untouched. y rises with the scale to keep the now-larger disc from
            reaching back down into the headline. */}
        <group scale={1.55}>
          <Saturn />
        </group>
      </Hotspot>

      {/* Mirrors the Roadmap whiteboard on the opposite wall: same height and
          depth, same turn-in angle negated, so the two boards bracket the desk
          instead of Status floating alone on the back wall.
          x is 5.0 rather than the whiteboard's -4.6 because the PC tower sits
          at x 3.21-3.99; at a true mirror the rotated 2.6-wide frame reached
          x 3.82 and cleared the tower by 3cm of height alone, which read as
          the two touching. 5.0 puts the frame at x 4.18 and clear outright. */}
      <Hotspot
        id="window"
        labelHeight={1.1}
        label="Status"
        position={[5.0, 2.3, -1.0]}
        active={active === "window"}
        onSelect={onSelect}
      >
        <group rotation={[0, -Math.PI / 3.4, 0]}>
          <RoomWindow />
        </group>
      </Hotspot>

      <Hotspot
        id="whiteboard"
        labelHeight={0.88}
        label="Roadmap"
        position={[-4.6, 2.3, -1.0]}
        active={active === "whiteboard"}
        onSelect={onSelect}
      >
        <group rotation={[0, Math.PI / 3.4, 0]}>
          <Whiteboard />
        </group>
      </Hotspot>

      {/* --- Non-interactive dressing --- */}
      {/* Both were sunk into the desk: the keyboard's top sat below the 1.09
          surface, and the mouse's underside likewise. */}
      <group position={[0.5, 1.09, 0.6]}>
        <Keyboard />
      </group>
      <group position={[1.28, 1.13, 0.58]}>
        <Mouse />
      </group>
      {/* Pot is a 0.26-tall cylinder centred on its origin, so the origin must
          sit half a pot above the surface (1.09 + 0.13) or it sinks. It was
          also at x -2.5, past the desk edge. Moved to the back-right corner. */}
      <group position={[1.95, 1.22, -0.5]}>
        <Plant />
      </group>
    </>
  );
}
