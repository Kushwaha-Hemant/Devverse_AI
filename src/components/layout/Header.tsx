"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { profile } from "@/content/profile";
import { usePreferences } from "@/providers/preferences";

const NAV = [
  { href: "#about", label: "About" },
  { href: "#skills", label: "Skills" },
  { href: "#projects", label: "Projects" },
  { href: "#experience", label: "Experience" },
  { href: "#contact", label: "Contact" },
];

/** Matches the offset SmoothScroll uses, so both routes land identically. */
const HEADER_OFFSET = 80;

export function Header() {
  const { recruiterMode, toggleRecruiterMode, exitRecruiterMode } =
    usePreferences();
  const [scrolled, setScrolled] = useState(false);
  /** Below `md` the nav row is hidden, so phones need their own way in. */
  const [menuOpen, setMenuOpen] = useState(false);
  /** Section to scroll to once Recruiter Mode has unmounted. A ref, not
   *  state — it must not trigger a render of its own. */
  const pendingTarget = useRef<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape leaves Recruiter Mode, matching every other dismissible surface here.
  useEffect(() => {
    if (!recruiterMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitRecruiterMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recruiterMode, exitRecruiterMode]);

  /**
   * Recruiter Mode replaces the whole page, so #about, #skills and friends do
   * not exist while it is on and the nav links silently did nothing. Leave the
   * mode first, then scroll once the sections have actually mounted.
   */
  const onNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      setMenuOpen(false);
      if (!recruiterMode) return; // normal mode: the anchor already works
      e.preventDefault();
      pendingTarget.current = href;
      exitRecruiterMode();
    },
    [recruiterMode, exitRecruiterMode],
  );

  /** Tracks the previous value so we act on the true -> false transition only,
   *  and never steal focus on first mount. */
  const wasRecruiter = useRef(false);

  useEffect(() => {
    const justLeft = wasRecruiter.current && !recruiterMode;
    wasRecruiter.current = recruiterMode;
    if (!justLeft) return;

    const href = pendingTarget.current;
    pendingTarget.current = null;

    // The sections mount in this same commit, but layout only exists after the
    // browser has laid them out — hence the frame's delay. Lenis re-inits in
    // the effect phase, which is already behind us by the time this fires.
    const raf = requestAnimationFrame(() => {
      // Move focus with the view. Leaving Recruiter Mode unmounts the whole
      // subtree including whatever held focus — the Back button, or the nav
      // link — which drops `activeElement` to <body>. A keyboard user's next
      // Tab would restart at the skip link and a screen reader would announce
      // nothing at all. `preventScroll` so this does not fight the scroll below.
      document.getElementById("main")?.focus({ preventScroll: true });

      if (!href) return;
      if (href === "#top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const el = document.querySelector(href);
      if (!el) return;
      const top =
        el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [recruiterMode]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[110] transition-all duration-300",
        scrolled ? "glass-strong py-3" : "py-5",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5">
        <a
          href="#top"
          onClick={(e) => onNavClick(e, "#top")}
          className="flex items-center gap-2.5"
        >
          <span className="glass neon-cyan grid h-9 w-9 place-items-center rounded-xl font-mono text-xs font-bold">
            <span className="text-aurora">{profile.logo}</span>
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">
            {profile.name}
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={(e) => onNavClick(e, n.href)}
              className="text-ink-muted hover:text-ink hover:bg-elevated rounded-full px-4 py-2 text-sm transition-colors"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {/* This is the one control a recruiter must notice within seconds, so
              it's deliberately the loudest thing in the header: a neon gradient
              ring plus a slow halo pulse when off, solid gradient when on. The
              label is never hidden — an unlabelled icon is useless to the
              person it exists for. */}
          <button
            onClick={toggleRecruiterMode}
            aria-pressed={recruiterMode}
            title="Recruiter view — summary, skills, projects and experience, with no animation"
            className={cn(
              "group relative flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold tracking-wide transition-transform active:scale-95",
              recruiterMode
                ? "from-cyan via-electric to-purple text-void bg-gradient-to-r"
                : "text-ink",
            )}
          >
            {!recruiterMode && (
              <>
                {/* Pulsing halo. A radial gradient rather than a blurred box —
                    animating anything carrying a filter repaints every frame. */}
                <span
                  aria-hidden
                  data-decorative
                  className="animate-pulse-glow absolute -inset-2.5 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle closest-side, color-mix(in oklab, var(--color-cyan) 45%, transparent), transparent)",
                  }}
                />
                {/* Rotating conic border. The clipped wrapper keeps the huge
                    spinning square inside the pill; the inset fill below leaves
                    only a 2px ring of it visible. */}
                <span
                  aria-hidden
                  data-decorative
                  className="absolute inset-0 overflow-hidden rounded-full"
                >
                  <span
                    className="absolute top-1/2 left-1/2 aspect-square w-[220%] -translate-x-1/2 -translate-y-1/2"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0deg, var(--color-cyan) 60deg, var(--color-electric) 140deg, var(--color-purple) 220deg, transparent 300deg)",
                      animationName: "orbit",
                      animationDuration: "3.5s",
                      animationTimingFunction: "linear",
                      animationIterationCount: "infinite",
                    }}
                  />
                </span>
                <span
                  aria-hidden
                  className="bg-void absolute inset-[2px] rounded-full transition-colors group-hover:bg-transparent"
                />
                {/* Live dot — a small "this does something" cue. */}
                <span
                  aria-hidden
                  data-decorative
                  className="bg-cyan absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full shadow-[0_0_8px_var(--color-cyan)]"
                >
                  <span className="bg-cyan absolute inset-0 animate-ping rounded-full" />
                </span>
              </>
            )}
            <span className="relative flex items-center gap-2 transition-colors group-hover:text-void">
              <Briefcase size={14} />
              Recruiter
            </span>
          </button>

          {/* Mobile menu trigger — the nav row above is md-and-up only, so
              without this a phone has no navigation once the hero scrolls by. */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="glass text-ink-muted hover:text-ink grid h-10 w-10 cursor-pointer place-items-center rounded-full transition-colors md:hidden"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="glass-strong overflow-hidden md:hidden"
            aria-label="Mobile navigation"
          >
            <ul className="mx-auto max-w-7xl px-5 py-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    onClick={(e) => onNavClick(e, n.href)}
                    className="text-ink-muted hover:text-ink border-border block border-b py-3.5 text-sm last:border-0"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={profile.resumeUrl}
                  download={profile.resumeFilename}
                  onClick={() => setMenuOpen(false)}
                  className="text-cyan block py-3.5 text-sm font-semibold"
                >
                  Download resume ↓
                </a>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

