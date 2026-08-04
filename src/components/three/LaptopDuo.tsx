"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import {
  getDeckDashboardTexture,
  getLaptopWallpaperTexture,
} from "./duoTextures";

/**
 * Dual-screen gaming laptop: a main display in the lid, a second panel angled
 * up out of the deck, and a compact RGB keyboard pushed to the front edge.
 * Unbranded by design — no maker's logo on the shell or the wallpaper.
 *
 * Draw-call budget matters here — the room is draw-call bound — so the ~60
 * keycaps are a single instanced mesh with per-key colour, and every material
 * is a module-level singleton.
 *
 * Base sits at y=0 with the hinge at the BACK (-z); the lid opens by rotating
 * negatively about x, sweeping from closed (+PI/2) to a natural recline.
 */

const BASE_W = 0.94;
const BASE_D = 0.66;

const shell = new THREE.MeshStandardMaterial({
  color: "#20242e",
  metalness: 0.88,
  roughness: 0.32,
});

const shellDark = new THREE.MeshStandardMaterial({
  color: "#12151d",
  metalness: 0.8,
  roughness: 0.45,
});

const trackpad = new THREE.MeshStandardMaterial({
  color: "#161a24",
  metalness: 0.5,
  roughness: 0.35,
});

const hingeGlow = new THREE.MeshStandardMaterial({
  color: "#ff4d6d",
  emissive: new THREE.Color("#ff4d6d"),
  emissiveIntensity: 1.1,
  toneMapped: false,
});

/** Per-key RGB is baked into instanceColor — nothing animates per frame. */
const KEY_COLS = 14;
const KEY_ROWS = 4;
const KEY_COUNT = KEY_COLS * KEY_ROWS;

function KeyBed() {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const colour = new THREE.Color();
    const gapX = BASE_W * 0.056;
    const gapZ = 0.036;
    const x0 = -((KEY_COLS - 1) * gapX) / 2;

    let i = 0;
    for (let r = 0; r < KEY_ROWS; r++) {
      for (let c = 0; c < KEY_COLS; c++) {
        dummy.position.set(x0 + c * gapX, 0, r * gapZ);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(gapX * 0.82, 0.012, gapZ * 0.8);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        // Hue sweeps left-to-right and shifts slightly per row, which is what
        // a per-key RGB board actually looks like at rest.
        const t = c / (KEY_COLS - 1);
        colour.setHSL(0.52 + t * 0.32 + r * 0.012, 0.95, 0.56);
        mesh.setColorAt(i, colour);
        i++;
      }
    }
     
    // instanceMatrix/instanceColor are GPU-side buffers on an external
    // three.js object and must be flagged dirty by hand after writing.
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
     
  }, []);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, KEY_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      {/* NO `vertexColors` here. It declares a per-vertex `color` attribute
          that boxGeometry does not have, so the shader reads black and
          multiplies every key to zero. `instanceColor` (set via setColorAt)
          tints instances on its own. Unlit, because a backlit keycap emits
          rather than reflects — and that keeps the RGB readable in a dark
          room without a second light. */}
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export function LaptopDuo() {
  const wallpaper = useMemo(() => getLaptopWallpaperTexture(), []);
  const dashboard = useMemo(() => getDeckDashboardTexture(), []);
  const lid = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!lid.current) return;
    const t = Math.min(1, state.clock.elapsedTime / 2.5);
    const e = 1 - Math.pow(1 - t, 3);
    lid.current.rotation.x = THREE.MathUtils.lerp(Math.PI / 2, -0.36, e);
  });

  return (
    <group>
      {/* Chassis */}
      <RoundedBox args={[BASE_W, 0.034, BASE_D]} radius={0.014}>
        <primitive object={shell} attach="material" />
      </RoundedBox>

      {/* Raised rear deck the second screen sits on */}
      <mesh position={[0, 0.026, -0.17]} material={shellDark}>
        <boxGeometry args={[BASE_W * 0.94, 0.03, BASE_D * 0.42]} />
      </mesh>

      {/* Side exhaust vents — the angular detail that reads as "gaming" */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (BASE_W / 2 - 0.012), 0.006, -0.12]}
          material={shellDark}
        >
          <boxGeometry args={[0.02, 0.022, 0.2]} />
        </mesh>
      ))}
      <mesh position={[0, 0.004, -0.325]} material={hingeGlow}>
        <boxGeometry args={[BASE_W * 0.5, 0.006, 0.008]} />
      </mesh>

      {/* --- Secondary display, tilted up out of the deck --- */}
      <group position={[0, 0.043, -0.16]} rotation={[-0.42, 0, 0]}>
        <RoundedBox args={[BASE_W * 0.9, BASE_D * 0.4, 0.012]} radius={0.008}>
          <primitive object={shellDark} attach="material" />
        </RoundedBox>
        <mesh position={[0, 0, 0.008]}>
          <planeGeometry args={[BASE_W * 0.86, BASE_D * 0.36]} />
          <meshStandardMaterial
            map={dashboard}
            emissiveMap={dashboard}
            emissive="#ffffff"
            emissiveIntensity={0.85}
            roughness={0.85}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* --- Keyboard + trackpad, pushed to the front edge --- */}
      <group position={[0, 0.024, 0.12]}>
        <KeyBed />
      </group>
      <mesh position={[0.3, 0.019, 0.265]} material={trackpad}>
        <boxGeometry args={[0.16, 0.004, 0.1]} />
      </mesh>

      {/* --- Lid --- */}
      <group ref={lid} position={[0, 0.017, -0.33]}>
        <RoundedBox
          args={[BASE_W, 0.6, 0.016]}
          radius={0.01}
          position={[0, 0.3, 0]}
        >
          <primitive object={shell} attach="material" />
        </RoundedBox>
        <mesh position={[0, 0.3, 0.01]}>
          <planeGeometry args={[BASE_W * 0.92, 0.53]} />
          <meshStandardMaterial
            map={wallpaper}
            emissiveMap={wallpaper}
            emissive="#ffffff"
            emissiveIntensity={0.8}
            roughness={0.85}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
