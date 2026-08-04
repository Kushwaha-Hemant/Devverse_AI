"use client";

import { useEffect, useRef } from "react";
import { usePreferences } from "@/providers/preferences";

type Star = { x: number; y: number; z: number; px: number; py: number };

/**
 * Warp-speed starfield used behind the loading and ENTER sequences.
 * `speed` controls the fly-through rate — the landing ramps it up on ENTER.
 */
export function Starfield({
  speed = 0.4,
  count = 420,
  className = "",
}: {
  speed?: number;
  count?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(speed);
  const { motionOff } = usePreferences();

  // Keep the animation loop reading the latest speed without restarting it.
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (motionOff) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const stars: Star[] = Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * w,
      y: (Math.random() - 0.5) * h,
      z: Math.random() * w,
      px: 0,
      py: 0,
    }));

    let frame = 0;
    const tick = () => {
      ctx.fillStyle = "rgba(4, 5, 12, 0.35)";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);

      const v = speedRef.current;
      for (const s of stars) {
        s.px = (s.x / s.z) * w;
        s.py = (s.y / s.z) * w;

        s.z -= v * 8;
        if (s.z < 1) {
          s.z = w;
          s.x = (Math.random() - 0.5) * w;
          s.y = (Math.random() - 0.5) * h;
          s.px = (s.x / s.z) * w;
          s.py = (s.y / s.z) * w;
        }

        const x = (s.x / s.z) * w;
        const y = (s.y / s.z) * w;
        const size = Math.max(0.2, (1 - s.z / w) * 2.2);
        const alpha = Math.min(1, (1 - s.z / w) * 1.6);

        // Above a threshold the points stretch into streaks — the warp look.
        if (v > 1.2) {
          ctx.strokeStyle = `rgba(160, 210, 255, ${alpha * 0.8})`;
          ctx.lineWidth = size;
          ctx.beginPath();
          ctx.moveTo(s.px, s.py);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(200, 230, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [count, motionOff]);

  if (motionOff) return null;

  return (
    <canvas
      ref={canvasRef}
      data-decorative
      aria-hidden
      className={`h-full w-full ${className}`}
    />
  );
}
