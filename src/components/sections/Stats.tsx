"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { profile } from "@/content/profile";
import { usePreferences } from "@/providers/preferences";

/** Counts up to `value` once it scrolls into view. */
function Counter({
  value,
  suffix,
  decimals = 0,
}: {
  value: number;
  suffix: string;
  decimals?: number;
}) {
  const [counted, setCounted] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const { motionOff } = usePreferences();

  // Derived rather than synced — with motion off the final value renders
  // immediately instead of being pushed through state.
  const display = motionOff ? value : counted;

  useEffect(() => {
    if (motionOff) return;
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const duration = 1400;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // easeOutExpo
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          setCounted(eased * value);
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, motionOff]);

  return (
    <span ref={ref} className="tabular-nums">
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function Stats() {
  return (
    <div className="border-border relative border-y">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 py-12 sm:grid-cols-4">
        {profile.stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="text-center">
            <p className="text-aurora text-4xl font-bold sm:text-5xl">
              <Counter
                value={s.value}
                suffix={s.suffix}
                decimals={s.decimals}
              />
            </p>
            <p className="text-ink-dim mt-2 font-mono text-[10px] tracking-[0.2em] uppercase">
              {s.label}
            </p>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
