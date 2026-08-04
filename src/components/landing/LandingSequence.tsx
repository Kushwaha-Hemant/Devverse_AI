"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Starfield } from "@/components/backgrounds/Starfield";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { usePreferences } from "@/providers/preferences";
import { profile } from "@/content/profile";

/** Boot log printed during the loading phase. */
const BOOT_LINES = [
  "initialising devverse kernel",
  "mounting 3d workspace",
  "spawning particle field",
  "calibrating camera rig",
  "linking ai assistant",
  "workspace online",
];

type Phase = "boot" | "flight" | "welcome" | "warp";

/**
 * The cinematic gate: black screen → boot log → particle flight → welcome →
 * ENTER → warp-out. Unmounts itself once the user is through, so nothing here
 * costs anything on the main site.
 *
 * Recruiter Mode and reduced-motion skip this entirely (handled in the
 * preferences provider, which pre-sets `entered`).
 */
export function LandingSequence() {
  const { entered, enter, motionOff } = usePreferences();
  const [phase, setPhase] = useState<Phase>("boot");
  const [line, setLine] = useState(0);
  const [progress, setProgress] = useState(0);

  // Boot log ticks through, then hands off to the flight phase.
  useEffect(() => {
    if (motionOff || phase !== "boot") return;
    const step = setInterval(() => {
      setLine((l) => {
        if (l >= BOOT_LINES.length - 1) {
          clearInterval(step);
          setTimeout(() => setPhase("flight"), 500);
          return l;
        }
        return l + 1;
      });
    }, 320);
    return () => clearInterval(step);
  }, [phase, motionOff]);

  useEffect(() => {
    if (motionOff || phase !== "boot") return;
    const t = setInterval(() => setProgress((p) => Math.min(100, p + 3)), 60);
    return () => clearInterval(t);
  }, [phase, motionOff]);

  // Flight phase is a fixed beat before the welcome copy resolves.
  useEffect(() => {
    if (phase !== "flight") return;
    const t = setTimeout(() => setPhase("welcome"), 1800);
    return () => clearTimeout(t);
  }, [phase]);

  const handleEnter = () => {
    setPhase("warp");
    // Let the warp play out before revealing the world underneath.
    setTimeout(enter, 1100);
  };

  if (entered) return null;

  const starSpeed = phase === "boot" ? 0.15 : phase === "warp" ? 9 : 1.1;

  return (
    <AnimatePresence>
      <motion.div
        key="landing"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-void fixed inset-0 z-[150] flex items-center justify-center overflow-hidden"
      >
        {/* Particle / warp field */}
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: phase === "boot" ? 0.35 : 1 }}
          transition={{ duration: 1.2 }}
        >
          <Starfield speed={starSpeed} count={520} />
        </motion.div>

        {/* Radial glow that swells as the camera closes on the workstation */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 55%, rgba(76,125,255,0.25), transparent 55%)",
          }}
          animate={{
            opacity: phase === "boot" ? 0 : phase === "warp" ? 1 : 0.7,
            scale: phase === "warp" ? 2.4 : 1,
          }}
          transition={{ duration: 1.1 }}
        />

        {/* ---------------- Boot phase ---------------- */}
        <AnimatePresence mode="wait">
          {phase === "boot" && (
            <motion.div
              key="boot"
              exit={{ opacity: 0, filter: "blur(8px)" }}
              transition={{ duration: 0.5 }}
              className="relative z-10 w-[min(92vw,460px)] font-mono text-xs"
            >
              <div className="text-ink-dim mb-4 space-y-1">
                {BOOT_LINES.slice(0, line + 1).map((l, i) => (
                  <motion.div
                    key={l}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-cyan">▸</span>
                    <span>{l}</span>
                    {i === line && (
                      <span className="bg-cyan ml-1 inline-block h-3 w-1.5 animate-blink" />
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="bg-elevated h-px w-full overflow-hidden">
                <motion.div
                  className="from-cyan to-purple h-full bg-gradient-to-r"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear" }}
                />
              </div>
              <div className="text-ink-dim mt-2 flex justify-between">
                <span>DEVVERSE AI</span>
                <span>{progress}%</span>
              </div>
            </motion.div>
          )}

          {/* ---------------- Welcome phase ---------------- */}
          {(phase === "welcome" || phase === "warp") && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 24 }}
              animate={{
                opacity: phase === "warp" ? 0 : 1,
                y: 0,
                scale: phase === "warp" ? 1.4 : 1,
                filter: phase === "warp" ? "blur(12px)" : "blur(0px)",
              }}
              transition={{ duration: phase === "warp" ? 0.9 : 1 }}
              className="relative z-10 px-6 text-center"
            >
              {/* Logo mark */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="glass neon-cyan mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl font-mono text-lg font-bold tracking-tight"
              >
                <span className="text-aurora">{profile.logo}</span>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-ink-muted mb-3 text-sm"
              >
                Hello <span className="inline-block animate-float">👋</span>{" "}
                I&apos;m
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-aurora text-5xl font-bold tracking-tight sm:text-7xl"
              >
                {profile.name}
              </motion.h1>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="text-ink-muted mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-xs tracking-[0.2em] uppercase sm:text-sm"
              >
                {profile.roles.map((role, i) => (
                  <span key={role} className="flex items-center gap-3">
                    {i > 0 && <span className="text-cyan/50">·</span>}
                    {role}
                  </span>
                ))}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-ink-dim mt-8 text-sm"
              >
                {profile.tagline}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="mt-10"
              >
                <MagneticButton onClick={handleEnter} className="px-12 py-4">
                  Enter
                </MagneticButton>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
