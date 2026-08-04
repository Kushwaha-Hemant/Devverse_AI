"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences";

/** Scroll-triggered entrance. Collapses to a plain div when motion is off. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const { motionOff } = usePreferences();

  if (motionOff) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  kicker,
  title,
  subtitle,
  className,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-12 text-center", className)}>
      <p className="text-cyan font-mono text-[10px] tracking-[0.35em] uppercase">
        {kicker}
      </p>
      <h2 className="text-aurora mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="text-ink-muted mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

/** Consistent vertical rhythm + max width for every page section. */
export function Section({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative mx-auto w-full max-w-7xl scroll-mt-24 px-5 py-24 sm:py-32",
        className,
      )}
    >
      {children}
    </section>
  );
}
