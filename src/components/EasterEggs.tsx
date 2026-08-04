"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { profile } from "@/content/profile";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const HIRE_PHRASE = "sudo hire hemant";

type Egg = "konami" | "hire" | null;

/**
 * Hidden interactions: the Konami code opens a secret room, and typing
 * "sudo hire hemant" anywhere on the page triggers a confetti burst.
 */
export function EasterEggs() {
  const [egg, setEgg] = useState<Egg>(null);

  useEffect(() => {
    let konamiIndex = 0;
    let buffer = "";

    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing inside form fields.
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;

      // Konami
      if (e.key === KONAMI[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === KONAMI.length) {
          konamiIndex = 0;
          setEgg("konami");
        }
      } else {
        konamiIndex = e.key === KONAMI[0] ? 1 : 0;
      }

      // Typed phrase
      if (e.key.length === 1 || e.key === " ") {
        buffer = (buffer + e.key).slice(-HIRE_PHRASE.length);
        if (buffer.toLowerCase() === HIRE_PHRASE) {
          buffer = "";
          setEgg("hire");
          setTimeout(() => setEgg((c) => (c === "hire" ? null : c)), 4000);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence>
      {egg === "konami" && (
        <motion.div
          key="konami"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setEgg(null)}
          className="bg-void/90 fixed inset-0 z-[160] grid cursor-pointer place-items-center px-6 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="glass-strong neon-purple max-w-md rounded-3xl p-8 text-center"
          >
            <p className="text-purple font-mono text-[10px] tracking-[0.35em] uppercase">
              Secret room unlocked
            </p>
            <h2 className="text-aurora mt-3 text-3xl font-bold">
              You found it 🎮
            </h2>
            <p className="text-ink-muted mt-4 text-sm leading-relaxed">
              Anyone who still remembers the Konami code is someone I&apos;d
              enjoy working with. Try typing{" "}
              <code className="text-cyan font-mono">sudo hire hemant</code> next.
            </p>
            <a
              href={`mailto:${profile.email}?subject=Found%20the%20secret%20room`}
              className="from-cyan to-purple text-void mt-6 inline-block rounded-full bg-gradient-to-r px-6 py-3 text-xs font-semibold tracking-[0.2em] uppercase"
            >
              Say hello
            </a>
            <p className="text-ink-dim mt-5 text-[10px] tracking-widest uppercase">
              click anywhere to close
            </p>
          </motion.div>
        </motion.div>
      )}

      {egg === "hire" && (
        <motion.div
          key="hire"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[160] grid place-items-center"
        >
          <motion.p
            initial={{ scale: 0.5, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            className="text-aurora text-center text-4xl font-bold sm:text-6xl"
          >
            Permission granted ✅
          </motion.p>
          {/* Confetti */}
          {Array.from({ length: 60 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-2 w-2 rounded-sm"
              style={{
                left: `${(i * 37) % 100}%`,
                background: ["#22d3ee", "#4c7dff", "#a855f7", "#e879f9"][i % 4],
              }}
              initial={{ y: -40, opacity: 1, rotate: 0 }}
              animate={{ y: "100vh", opacity: 0, rotate: 540 }}
              transition={{ duration: 2.4 + (i % 5) * 0.3, ease: "easeIn" }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
