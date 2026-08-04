"use client";

import { usePreferences } from "@/providers/preferences";

/**
 * Ambient backdrop: aurora blobs, a perspective grid floor and a scan line.
 *
 * Performance note — the blobs are radial gradients, NOT `filter: blur()`.
 * An earlier version used `bg-electric blur-[120px]`, and animating the
 * transform of a 70vmax blurred layer forced Chrome to re-rasterise a huge
 * surface every frame; profiling put this at roughly 40% of total main-thread
 * time. A gradient with a transparent falloff looks the same and animates
 * entirely on the compositor.
 */
export function Aurora() {
  const { motionOff } = usePreferences();
  if (motionOff) return null;

  /** Soft radial blob — same visual as a blurred circle, none of the cost. */
  const blob = (color: string, strength: number) => ({
    background: `radial-gradient(circle closest-side, color-mix(in oklab, ${color} ${strength}%, transparent), transparent)`,
    willChange: "transform, opacity",
  });

  return (
    <div
      data-decorative
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Positioning lives on the wrapper so the aurora keyframes own the
          transform outright — a translate class on the same element would be
          overwritten by the animation. */}
      <div className="absolute -top-1/3 left-1/2 -translate-x-1/2">
        <div
          className="animate-aurora h-[70vmax] w-[70vmax] rounded-full"
          style={blob("var(--color-electric)", 38)}
        />
      </div>
      <div className="absolute top-1/4 -left-1/4">
        <div
          className="animate-aurora h-[55vmax] w-[55vmax] rounded-full [animation-delay:-6s]"
          style={blob("var(--color-purple)", 32)}
        />
      </div>
      <div className="absolute -right-1/4 bottom-0">
        <div
          className="animate-aurora h-[60vmax] w-[60vmax] rounded-full [animation-delay:-12s]"
          style={blob("var(--color-cyan)", 28)}
        />
      </div>

      {/* Grid floor, faded toward the horizon */}
      <div className="cyber-grid absolute inset-x-0 bottom-0 h-1/2 opacity-40 [mask-image:linear-gradient(to_top,black,transparent)]" />

      {/* Vignette keeps text legible over the blobs */}
      <div className="from-void via-void/40 to-void absolute inset-0 bg-gradient-to-b" />

      {/* Slow scan line */}
      <div className="via-cyan/40 animate-scan absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent [will-change:transform]" />
    </div>
  );
}
