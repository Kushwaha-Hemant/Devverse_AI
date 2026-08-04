import * as THREE from "three";
import { PALETTE } from "./palette";

/**
 * Shared material instances for the developer room.
 *
 * Every `<meshStandardMaterial>` written inline in JSX creates its OWN
 * material, and three.js does a shader-program lookup and state switch per
 * material per frame. Profiling the room showed `setProgram`,
 * `getProgramCacheKey` and `getParameters` dominating frame time with ~65
 * distinct materials in play.
 *
 * These are module-level singletons: define once, reuse everywhere. Do NOT
 * mutate them per-mesh — anything that animates its own material (the server
 * rack LEDs) must keep an inline material instead.
 */

const std = (params: THREE.MeshStandardMaterialParameters) =>
  new THREE.MeshStandardMaterial(params);

/** Emissive, tone-mapping-exempt material for screens and light strips. */
const glow = (color: string, intensity: number) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    toneMapped: false,
  });

export const M = {
  // --- Structural ---
  metal: std({ color: PALETTE.metal, metalness: 0.9, roughness: 0.25 }),
  darkMetal: std({ color: PALETTE.darkMetal, metalness: 0.9, roughness: 0.3 }),
  wood: std({ color: PALETTE.wood, metalness: 0.55, roughness: 0.35 }),
  floor: std({ color: "#070b18", metalness: 0.7, roughness: 0.35 }),
  vent: std({ color: "#0a0e1c", roughness: 1 }),

  // --- Furnishing ---
  fabric: std({ color: "#171d33", roughness: 0.7 }),
  ceramic: std({ color: "#f1f5ff", roughness: 0.45 }),
  coffee: std({ color: "#3b2417", roughness: 0.2 }),
  pot: std({ color: "#2c2038", roughness: 0.8 }),
  leaf: std({ color: "#1f7a5a", roughness: 0.7 }),
  whiteboard: std({ color: "#e8ecf7", roughness: 0.5 }),
  space: new THREE.MeshBasicMaterial({ color: "#050a1c" }),
  steam: new THREE.MeshBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.3,
  }),

  // --- Screens & light ---
  screenCyan: glow(PALETTE.cyan, 1.6),
  screenElectric: glow(PALETTE.electric, 1.5),
  deckGlow: glow(PALETTE.electric, 0.5),
  keyGlow: glow(PALETTE.magenta, 1.4),
  ledStrip: glow(PALETTE.purple, 3),
  ringCyan: glow(PALETTE.cyan, 2),
  ringPurple: glow(PALETTE.purple, 3),
  eye: glow(PALETTE.cyan, 4),

  // --- Book spines (four accents, reused across the stack) ---
  bookPurple: std({ color: PALETTE.purple, roughness: 0.65 }),
  bookCyan: std({ color: PALETTE.cyan, roughness: 0.65 }),
  bookElectric: std({ color: PALETTE.electric, roughness: 0.65 }),
  bookMagenta: std({ color: PALETTE.magenta, roughness: 0.65 }),

  // --- Misc ---
  robotHead: std({
    color: PALETTE.electric,
    emissive: new THREE.Color(PALETTE.electric),
    emissiveIntensity: 0.6,
    metalness: 0.7,
    roughness: 0.2,
    flatShading: true,
  }),
  planet: std({
    color: PALETTE.purple,
    emissive: new THREE.Color(PALETTE.purple),
    emissiveIntensity: 0.6,
    roughness: 0.6,
  }),
  scribbleAccent: std({ color: PALETTE.electric }),
  scribbleDim: std({ color: "#2a3350" }),
} as const;

export const BOOK_MATERIALS = [
  M.bookPurple,
  M.bookCyan,
  M.bookElectric,
  M.bookMagenta,
];
