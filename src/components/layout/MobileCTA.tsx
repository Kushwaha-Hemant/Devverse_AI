"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Download } from "lucide-react";

import { profile } from "@/content/profile";
import { usePreferences } from "@/providers/preferences";
import { useMediaQuery } from "@/lib/hooks";

/**
 * Phone-only action bar.
 *
 * On desktop the Recruiter toggle and résumé sit in the header, always in
 * reach. On a phone the header collapses to a hamburger, so the two things a
 * recruiter actually wants end up two taps deep. This surfaces both once the
 * hero has scrolled by — it stays hidden over the hero so it never covers the
 * workspace dock.
 */
export function MobileCTA() {
  const { recruiterMode, toggleRecruiterMode } = usePreferences();
  const isPhone = !useMediaQuery("(min-width: 768px)", true);
  const [past, setPast] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Recruiter Mode has no hero, and its own layout already leads with both
  // actions — a floating bar there would just cover content.
  const show = isPhone && past && !recruiterMode;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          // pb-safe keeps it clear of the iOS home indicator.
          className="fixed inset-x-0 bottom-0 z-[115] px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
        >
          <div className="glass-strong flex items-center gap-2 rounded-2xl p-2">
            <button
              onClick={toggleRecruiterMode}
              className="from-cyan via-electric to-purple text-void flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r py-3 text-xs font-semibold tracking-wide"
            >
              <Briefcase size={15} />
              Recruiter view
            </button>
            <a
              href={profile.resumeUrl}
              download={profile.resumeFilename}
              className="glass text-ink flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold"
            >
              <Download size={15} />
              Resume
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
