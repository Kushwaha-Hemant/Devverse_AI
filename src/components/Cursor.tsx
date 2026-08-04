"use client";

import { useEffect, useRef } from "react";
import { lerp } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks";
import { usePreferences } from "@/providers/preferences";

/**
 * Glow cursor with a trailing ring and a particle wake.
 *
 * Mounted only on devices with a precise pointer — touch devices keep their
 * native behaviour. Positions are written straight to the DOM via refs so the
 * cursor never triggers a React render.
 */
export function Cursor() {
  const { motionOff } = usePreferences();
  // Touch devices keep their native pointer behaviour.
  const finePointer = useMediaQuery("(pointer: fine)");
  const enabled = finePointer && !motionOff;

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.customCursor = enabled ? "on" : "off";
    if (!enabled) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const canvas = canvasRef.current;
    if (!dot || !ring || !canvas) return;

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const target = { x: width / 2, y: height / 2 };
    const ringPos = { x: target.x, y: target.y };
    let hovering = false;
    let down = false;

    type Particle = { x: number; y: number; vx: number; vy: number; life: number };
    const particles: Particle[] = [];
    /** Marks that the canvas still needs one last clear after the trail ends. */
    let dirty = false;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;

      // Magnetic pull: interactive elements tug the ring toward their centre.
      const el = document.elementFromPoint(e.clientX, e.clientY);
      hovering = !!el?.closest?.('a, button, [role="button"], [data-magnetic]');

      if (particles.length < 45) {
        dirty = true;
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6 + 0.25,
          life: 1,
        });
      }
    };

    const onDown = () => (down = true);
    const onUp = () => (down = false);
    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("resize", onResize);

    let frame = 0;
    const tick = () => {
      // Dot tracks exactly; the ring lags for weight.
      dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;

      ringPos.x = lerp(ringPos.x, target.x, 0.16);
      ringPos.y = lerp(ringPos.y, target.y, 0.16);
      const scale = hovering ? 2.1 : down ? 0.7 : 1;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%) scale(${scale})`;
      ring.style.borderColor = hovering
        ? "rgba(168, 85, 247, 0.9)"
        : "rgba(34, 211, 238, 0.6)";

      // Only touch the canvas while particles actually exist. Clearing and
      // repainting a full-viewport canvas every frame was costing real time
      // even with the pointer completely still.
      if (ctx && (particles.length > 0 || dirty)) {
        ctx.clearRect(0, 0, width, height);
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.022;
          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.life * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(103, 232, 249, ${p.life * 0.5})`;
          ctx.fill();
        }
        // One final clear after the last particle dies, then go quiet.
        dirty = particles.length > 0;
      }

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
      root.dataset.customCursor = "off";
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div data-decorative aria-hidden className="pointer-events-none">
      <canvas
        ref={canvasRef}
        // mix-blend-screen forced a full-viewport blend composite every frame.
        className="fixed inset-0 z-[190] h-full w-full"
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 z-[191] h-9 w-9 rounded-full border transition-[border-color] duration-200 will-change-transform"
      />
      <div
        ref={dotRef}
        className="bg-cyan-bright fixed top-0 left-0 z-[192] h-1.5 w-1.5 rounded-full shadow-[0_0_12px_#22d3ee] will-change-transform"
      />
    </div>
  );
}
