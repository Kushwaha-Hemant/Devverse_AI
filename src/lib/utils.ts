import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation — used by the cursor and camera easing. */
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Map a value from one range to another. */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
