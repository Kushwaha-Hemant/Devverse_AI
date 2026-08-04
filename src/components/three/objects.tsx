"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

import { M } from "./materials";
import { getMonitorScreenTexture } from "./screenTextures";
import { getRoadmapTexture } from "./roadmapTexture";
import { getStatusTexture } from "./statusTexture";
export { PALETTE } from "./palette";
import { PALETTE } from "./palette";

export type HotspotId =
  | "laptop"
  | "monitor"
  | "books"
  | "coffee"
  | "server"
  | "robot"
  | "window"
  | "whiteboard";

type HotspotProps = {
  id: HotspotId;
  label: string;
  position: [number, number, number];
  onSelect: (id: HotspotId) => void;
  active: boolean;
  /** Height of the floating label above the object's origin. Objects vary a
   *  lot in size — a coffee cup and a server rack need very different values. */
  labelHeight?: number;
  children: React.ReactNode;
};

/**
 * Wraps an object so it lifts, glows and shows a label on hover, and reports
 * clicks upward. Keeps every interactive object behaving identically.
 */
export function Hotspot({
  id,
  label,
  position,
  onSelect,
  active,
  labelHeight = 0.55,
  children,
}: HotspotProps) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!group.current) return;
    const targetY = hovered || active ? position[1] + 0.09 : position[1];
    group.current.position.y = THREE.MathUtils.damp(
      group.current.position.y,
      targetY,
      6,
      delta,
    );
    const targetScale = hovered ? 1.04 : 1;
    const s = THREE.MathUtils.damp(
      group.current.scale.x,
      targetScale,
      8,
      delta,
    );
    group.current.scale.setScalar(s);
  });

  return (
    <group
      ref={group}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {children}

      {/* Persistent label. Always readable so a visitor can see what each
          object is without hunting, but held at low opacity so it reads as
          annotation rather than UI; it lifts to full strength on hover.
          <Billboard> keeps it facing the camera as the rig orbits — plain
          <Text> faces +z and would turn edge-on. */}
      <Billboard position={[0, labelHeight, 0]}>
        <Text
          fontSize={hovered || active ? 0.105 : 0.085}
          color={hovered || active ? PALETTE.cyan : "#93a3c4"}
          fillOpacity={hovered || active ? 1 : 0.5}
          anchorX="center"
          anchorY="bottom"
          letterSpacing={0.18}
          outlineWidth={0.004}
          outlineColor="#04050c"
          outlineOpacity={0.85}
        >
          {label.toUpperCase()}
        </Text>
      </Billboard>

      {/* Ground ring highlight. Mounted only while it is actually visible —
          as an always-present mesh at opacity 0 it still cost a draw call per
          hotspot every frame, i.e. 8 for something nobody could see. */}
      {(hovered || active) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <ringGeometry args={[0.42, 0.47, 48]} />
          <meshBasicMaterial
            color={PALETTE.cyan}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Renders the same geometry many times in ONE draw call.
 *
 * The room repeats a lot of small parts — desk legs, chair castors, plant
 * leaves — and each separate <mesh> costs a draw call. This scene is
 * draw-call bound (a CPU profile showed `setProgram`/`getProgramCacheKey`
 * dominating), so instancing these is worth far more than it looks.
 */
function Repeat({
  transforms,
  material,
  children,
}: {
  transforms: {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number] | number;
  }[];
  material: THREE.Material;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    transforms.forEach((t, i) => {
      dummy.position.set(...t.position);
      dummy.rotation.set(...(t.rotation ?? [0, 0, 0]));
      if (typeof t.scale === "number") dummy.scale.setScalar(t.scale);
      else dummy.scale.set(...(t.scale ?? [1, 1, 1]));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
     
    // instanceMatrix is GPU-side state that must be flagged dirty by hand.
    mesh.instanceMatrix.needsUpdate = true;
     
  }, [transforms]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, transforms.length]}
      material={material}
    >
      {children}
    </instancedMesh>
  );
}

/**
 * A screen showing actual content. Uses the canvas-generated UI as both the
 * colour map and the emissive map so the panel lights itself the way a real
 * display does, instead of being a flat lit surface.
 */
function ScreenImage({
  texture,
  width,
  height,
  intensity = 0.55,
  ...props
}: {
  texture: THREE.Texture;
  width: number;
  height: number;
  intensity?: number;
} & React.ComponentProps<"mesh">) {
  return (
    <mesh {...props}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={intensity}
        roughness={0.85}
        metalness={0}
        toneMapped={false}
      />
    </mesh>
  );
}

export function Desk() {
  return (
    <group>
      {/* Top */}
      <RoundedBox args={[4.6, 0.08, 1.7]} radius={0.03} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={PALETTE.wood}
          roughness={0.35}
          metalness={0.55}
        />
      </RoundedBox>
      {/* Legs — instanced; four identical boxes are four draw calls otherwise. */}
      <Repeat
        material={M.darkMetal}
        transforms={[
          { position: [-2.15, -0.5, 0.7] },
          { position: [2.15, -0.5, 0.7] },
          { position: [-2.15, -0.5, -0.7] },
          { position: [2.15, -0.5, -0.7] },
        ]}
      >
        <boxGeometry args={[0.07, 1, 0.07]} />
      </Repeat>
      {/* Under-desk LED strip. Intensity was 3, which blew out into a hard
          magenta bar cutting straight through the hero paragraph. */}
      <mesh position={[0, -0.07, 0.8]}>
        <boxGeometry args={[4.4, 0.02, 0.02]} />
        <meshStandardMaterial
          color={PALETTE.purple}
          emissive={PALETTE.purple}
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function Monitor() {
  const monitorTex = useMemo(() => getMonitorScreenTexture(), []);
  return (
    <group>
      <mesh position={[0, 0.18, 0]} material={M.darkMetal}>
        <cylinderGeometry args={[0.16, 0.2, 0.03, 24]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} material={M.darkMetal}>
        <boxGeometry args={[0.06, 0.45, 0.06]} />
      </mesh>
      <RoundedBox
        args={[1.7, 1, 0.05]}
        radius={0.02}
        position={[0, 1.12, -0.02]}
      >
        <meshStandardMaterial
          color={PALETTE.darkMetal}
          metalness={0.85}
          roughness={0.3}
        />
      </RoundedBox>
      {/* 0.9 put the panel's brightest pixels at ~0.56 linear luma — just
          under the 0.55 bloom threshold once smoothing is applied — so the
          monitor never glowed and read as an unlit slab. */}
      <ScreenImage
        texture={monitorTex}
        width={1.6}
        height={0.9}
        intensity={1.6}
        position={[0, 1.12, 0.012]}
      />
    </group>
  );
}

export function Mouse() {
  return (
    <mesh scale={[0.5, 0.35, 0.8]}>
      <sphereGeometry args={[0.12, 20, 20]} />
      <meshStandardMaterial
        color={PALETTE.metal}
        metalness={0.8}
        roughness={0.3}
      />
    </mesh>
  );
}

export function CoffeeCup({ steaming = true }: { steaming?: boolean }) {
  const steam = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!steam.current || !steaming) return;
    steam.current.children.forEach((c, i) => {
      const t = state.clock.elapsedTime * 0.8 + i * 0.9;
      c.position.y = 0.22 + ((t % 2) / 2) * 0.5;
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = 0.35 * (1 - (t % 2) / 2);
      c.position.x = Math.sin(t * 2) * 0.04;
    });
  });

  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.11, 0.09, 0.22, 24]} />
        <meshStandardMaterial color="#f1f5ff" roughness={0.45} />
      </mesh>
      {/* Handle */}
      <mesh position={[0.13, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.06, 0.016, 12, 24]} />
        <meshStandardMaterial color="#f1f5ff" roughness={0.45} />
      </mesh>
      {/* Surface */}
      <mesh position={[0, 0.108, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.105, 24]} />
        <meshStandardMaterial color="#3b2417" roughness={0.2} />
      </mesh>
      {steaming && (
        <group ref={steam}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.22, 0]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export function Plant() {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.16, 0.12, 0.26, 16]} />
        <meshStandardMaterial color="#2c2038" roughness={0.8} />
      </mesh>
      <Repeat
        material={M.leaf}
        transforms={Array.from({ length: 7 }, (_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return {
            position: [Math.cos(a) * 0.09, 0.28 + (i % 3) * 0.08, Math.sin(a) * 0.09] as [number, number, number],
            rotation: [Math.cos(a) * 0.5, a, Math.sin(a) * 0.5] as [number, number, number],
            scale: [1, 1.9, 0.4] as [number, number, number],
          };
        })}
      >
        <sphereGeometry args={[0.075, 10, 10]} />
      </Repeat>
    </group>
  );
}

export function Chair() {
  return (
    <group>
      <RoundedBox args={[0.8, 0.1, 0.75]} radius={0.04} position={[0, 0.55, 0]}>
        <meshStandardMaterial color="#171d33" roughness={0.7} />
      </RoundedBox>
      <RoundedBox
        args={[0.78, 0.95, 0.1]}
        radius={0.05}
        position={[0, 1.05, 0.36]}
        rotation={[0.16, 0, 0]}
      >
        <meshStandardMaterial color="#171d33" roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, 0.28, 0]} material={M.darkMetal}>
        <cylinderGeometry args={[0.05, 0.05, 0.55, 12]} />
      </mesh>
      <Repeat
        material={M.darkMetal}
        transforms={Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2;
          return {
            position: [Math.cos(a) * 0.3, 0.04, Math.sin(a) * 0.3] as [number, number, number],
            rotation: [0, -a, 0] as [number, number, number],
          };
        })}
      >
        <boxGeometry args={[0.34, 0.04, 0.05]} />
      </Repeat>
    </group>
  );
}

export function Whiteboard() {
  const roadmapTex = useMemo(() => getRoadmapTexture(), []);
  return (
    <group>
      {/* Was a white board with four coloured bars standing in for scribbles.
          It is now a lit glass panel showing an actual node-graph roadmap —
          painted as a texture rather than built from geometry, because the
          nodes and their rings alone would have been ~40 meshes in a room
          that is already draw-call bound. */}
      <mesh>
        <boxGeometry args={[2.2, 1.3, 0.05]} />
        <meshStandardMaterial color="#080d1c" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[2.3, 1.4, 0.02]} />
        <meshStandardMaterial
          color={PALETTE.metal}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      <ScreenImage
        texture={roadmapTex}
        width={2.16}
        height={1.28}
        intensity={1.5}
        position={[0, 0, 0.042]}
      />
    </group>
  );
}

export function RoomWindow() {
  const statusTex = useMemo(() => getStatusTexture(), []);
  return (
    <group>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[2.6, 1.9, 0.1]} />
        <meshStandardMaterial
          color={PALETTE.darkMetal}
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
      {/* This was an open window frame — no pane, a purple planet floating
          behind it and two mullions across the gap. It is now the Live
          Signals board: a global network operations display. The map, hub
          nodes, foreground hex mesh and telemetry are one painted texture
          rather than geometry, for the same reason the Roadmap board is —
          the node graph alone would be dozens of meshes in a room that is
          already draw-call bound. */}
      <ScreenImage
        texture={statusTex}
        width={2.44}
        height={1.74}
        intensity={1.55}
        position={[0, 0, 0.052]}
      />
      {/* Bezel lip, so the display sits inside the frame rather than on it. */}
      <mesh position={[0, 0, 0.045]} material={M.darkMetal}>
        <boxGeometry args={[2.52, 1.82, 0.01]} />
      </mesh>
    </group>
  );
}
