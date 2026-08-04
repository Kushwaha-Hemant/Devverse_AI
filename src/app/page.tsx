"use client";

import { Aurora } from "@/components/backgrounds/Aurora";
import { EasterEggs } from "@/components/EasterEggs";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileCTA } from "@/components/layout/MobileCTA";
import { LandingSequence } from "@/components/landing/LandingSequence";
import { RecruiterView } from "@/components/RecruiterView";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Experience } from "@/components/sections/Experience";
import { Projects } from "@/components/sections/Projects";
import { Skills } from "@/components/sections/Skills";
import { Stats } from "@/components/sections/Stats";
import { World } from "@/components/world/World";
import { usePreferences } from "@/providers/preferences";

export default function Home() {
  const { recruiterMode } = usePreferences();

  return (
    <>
      <Header />

      {recruiterMode ? (
        <RecruiterView />
      ) : (
        <>
          <LandingSequence />
          <Aurora />
          <EasterEggs />

          {/* tabIndex -1 makes this programmatically focusable without adding
              it to the tab order. Without it, both the skip link and the
              focus move on leaving Recruiter Mode are silent no-ops. */}
          <main id="main" tabIndex={-1}>
            <World />
            <Stats />
            <About />
            <Skills />
            <Projects />
            <Experience />
            <Contact />
          </main>

          <MobileCTA />
        </>
      )}

      <Footer />
    </>
  );
}
