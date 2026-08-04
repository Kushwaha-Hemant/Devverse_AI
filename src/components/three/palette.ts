/**
 * Scene colour palette. Kept in its own module so `materials.ts` can import it
 * without pulling in the React component tree from `objects.tsx`.
 */
export const PALETTE = {
  cyan: "#22d3ee",
  electric: "#4c7dff",
  purple: "#a855f7",
  magenta: "#e879f9",
  metal: "#2a3350",
  darkMetal: "#151c33",
  wood: "#1b2136",
} as const;
