"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences";

type Props = React.ComponentProps<"button"> & {
  /** How far the button drifts toward the pointer, in px. */
  strength?: number;
  variant?: "primary" | "ghost" | "outline";
};

/**
 * Button that leans toward the cursor. Falls back to a plain button when
 * motion is suppressed.
 */
export function MagneticButton({
  children,
  className,
  strength = 18,
  variant = "primary",
  ...props
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const { motionOff } = usePreferences();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 220, damping: 18, mass: 0.4 };
  const x = useSpring(mx, spring);
  const y = useSpring(my, spring);

  // The label trails the button slightly for a layered, physical feel.
  const labelX = useTransform(x, (v) => v * 0.35);
  const labelY = useTransform(y, (v) => v * 0.35);

  const onMove = (e: React.MouseEvent) => {
    if (motionOff || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set(((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * strength);
    my.set(((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * strength);
  };

  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  const variants = {
    primary:
      "bg-gradient-to-r from-cyan via-electric to-purple text-void font-semibold shadow-[0_0_30px_-4px_rgba(76,125,255,0.7)]",
    outline: "glass border-cyan/40 text-ink neon-cyan",
    ghost: "text-ink-muted hover:text-ink",
  } as const;

  return (
    <motion.button
      ref={ref}
      data-magnetic
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={motionOff ? undefined : { x, y }}
      whileTap={motionOff ? undefined : { scale: 0.96 }}
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-7 py-3 text-sm tracking-[0.18em] uppercase transition-colors",
        "focus-visible:ring-cyan focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-void focus-visible:outline-none",
        variants[variant],
        className,
      )}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      <motion.span
        style={motionOff ? undefined : { x: labelX, y: labelY }}
        className="inline-flex items-center gap-2"
      >
        {children}
      </motion.span>
    </motion.button>
  );
}
