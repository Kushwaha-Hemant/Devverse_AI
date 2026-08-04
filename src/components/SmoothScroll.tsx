"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { usePreferences } from "@/providers/preferences";

/**
 * Lenis-driven inertial scrolling. Disabled entirely in Recruiter Mode and
 * when the OS asks for reduced motion — both want instant, native scroll.
 */
export function SmoothScroll() {
  const { motionOff } = usePreferences();

  useEffect(() => {
    if (motionOff) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Let in-page anchors route through Lenis so they ease instead of jump.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest?.(
        'a[href^="#"]',
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -80 });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [motionOff]);

  return null;
}
