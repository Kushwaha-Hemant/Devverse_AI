"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import {
  Bot,
  BookOpen,
  Coffee,
  Home,
  Laptop,
  PanelTop,
  Server,
  SquarePen,
} from "lucide-react";

import type { HotspotId } from "@/components/three/objects";
import { HotspotPanel } from "./HotspotPanel";
import { LiveTerminal } from "./LiveTerminal";
import { profile } from "@/content/profile";
import { usePreferences } from "@/providers/preferences";
import { cn } from "@/lib/utils";

// Three.js is heavy and strictly client-side — never ship it in the SSR bundle.
const WorkspaceScene = dynamic(
  () => import("@/components/three/Scene").then((m) => m.WorkspaceScene),
  { ssr: false },
);

/** Dark halo behind hero copy, so the lit room can show through beneath it. */
const HALO = "0 1px 3px var(--color-void), 0 2px 16px var(--color-void)";

const DOCK: { id: HotspotId | "home"; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "laptop", label: "Projects", icon: Laptop },
  { id: "monitor", label: "Terminal", icon: PanelTop },
  { id: "books", label: "Education", icon: BookOpen },
  { id: "server", label: "DevOps", icon: Server },
  { id: "robot", label: "AI", icon: Bot },
  { id: "whiteboard", label: "Roadmap", icon: SquarePen },
  { id: "coffee", label: "Fun", icon: Coffee },
];

/**
 * The explorable workspace. The 3D room is the navigation surface; the dock
 * mirrors every hotspot in the DOM so the same content is reachable by
 * keyboard and screen reader.
 */
export function World() {
  const [active, setActive] = useState<HotspotId | null>(null);
  const [view, setView] = useState<string>("home");
  const { motionOff } = usePreferences();

  // The 3D scene only renders while the hero is actually on screen.
  const sceneRef = useRef<HTMLElement>(null);
  const sceneVisible = useInView(sceneRef, { amount: 0.05 });

  const select = (id: HotspotId) => {
    setActive(id);
    setView(id);
  };

  const goHome = () => {
    setActive(null);
    setView("home");
  };

  return (
    <section
      id="top"
      ref={sceneRef}
      className="relative h-[100svh] w-full overflow-hidden"
      aria-label="Interactive 3D workspace"
    >
      {!motionOff && (
        <WorkspaceScene
          view={view}
          active={active}
          onSelect={select}
          paused={!sceneVisible}
        />
      )}

      {/* Readability scrim. Two layers: a vertical wash that seats the room
          into the page, plus a soft pool of shadow behind the headline so the
          desk objects recede instead of competing with the type.

          These were 45% and 88% opaque. The radial pool is centred at 50% 32%
          — exactly where the monitor sits — so at 88% it was painting the
          screen out completely, which is why the room read as unlit no matter
          how bright the 3D scene was. Both are pulled well down; the headline
          keeps its contrast from its own text-shadow (below) instead of from
          blacking out the scene behind it. */}
      <div
        aria-hidden
        className="from-void via-void/20 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 40% at 50% 32%, color-mix(in oklab, var(--color-void) 52%, transparent), transparent 72%)",
        }}
      />

      {/* Hero copy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: active ? 0 : 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="pointer-events-none absolute inset-x-0 top-[22%] z-10 px-6 text-center"
      >
        {/* The scrim behind this block used to be near-opaque, so the type
            needed no help. Now that the lit room shows through, each line
            carries its own dark halo instead — legibility without dimming the
            scene back down. */}
        <p
          className="text-cyan mb-3 font-mono text-[10px] tracking-[0.35em] uppercase"
          style={{ textShadow: HALO }}
        >
          {profile.roles.join(" · ")}
        </p>
        {/* drop-shadow, NOT text-shadow. `.text-aurora` is gradient-clipped
            with `color: transparent`, so a text-shadow paints through the
            glyph interiors and muddies the gradient. A filter applies to the
            composited result, putting the halo outside the letterforms where
            it belongs. */}
        <h1
          className="text-aurora text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          style={{
            filter:
              "drop-shadow(0 2px 10px var(--color-void)) drop-shadow(0 0 26px var(--color-void))",
          }}
        >
          {profile.name}
        </h1>
        {/* Short copy on phones — the full summary is 8 lines at 390px and
            buries the room, the dock and the call to action below the fold. */}
        <p
          className="text-ink-muted mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:hidden"
          style={{ textShadow: HALO }}
        >
          {profile.summaryShort}
        </p>
        <p
          className="text-ink-muted mx-auto mt-4 hidden max-w-xl leading-relaxed sm:block sm:text-base"
          style={{ textShadow: HALO }}
        >
          {profile.summary}
        </p>
        <p
          className="text-ink-dim mt-6 font-mono text-[10px] tracking-[0.25em] uppercase"
          style={{ textShadow: HALO }}
        >
          {/* "Click" is wrong on a phone. */}
          <span className="lg:hidden">Tap anything in the room</span>
          <span className="hidden lg:inline">
            Click anything in the room to explore
          </span>
        </p>
      </motion.div>

      {/* Live terminal, bottom-left */}
      <div className="pointer-events-none absolute bottom-24 left-6 z-10 hidden w-72 lg:block">
        <LiveTerminal />
      </div>

      {/* Camera dock */}
      <nav
        aria-label="Workspace navigation"
        className="absolute inset-x-0 bottom-6 z-20 flex justify-center px-3"
      >
        {/* On a phone this row is wider than the screen. Snap-scrolling plus a
            fade on the trailing edge makes it obvious there's more to swipe to
            — previously it just ran off the edge silently. */}
        <div
          className="glass-strong flex max-w-full snap-x snap-mandatory gap-1 overflow-x-auto rounded-2xl p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0, black 14px, black calc(100% - 14px), transparent 100%)",
          }}
        >
          {DOCK.map(({ id, label, icon: Icon }) => {
            const isActive = id === "home" ? view === "home" : active === id;
            return (
              <button
                key={id}
                onClick={() => (id === "home" ? goHome() : select(id))}
                aria-current={isActive || undefined}
                aria-label={label}
                title={label}
                className={cn(
                  // px-2 so all eight fit a 360px Galaxy A-series without
                  // scrolling; 2.5 overflowed by 8px there.
                  "flex shrink-0 snap-start cursor-pointer flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition-colors sm:px-3.5",
                  isActive
                    ? "bg-elevated text-cyan"
                    : "text-ink-dim hover:text-ink hover:bg-elevated/60",
                )}
              >
                <Icon size={18} />
                {/* Eight labelled items need ~560px; a phone has 390. Icons
                    alone fit without scrolling, and each keeps its accessible
                    name via aria-label/title. */}
                <span className="hidden text-[9px] tracking-widest uppercase sm:inline">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <HotspotPanel id={active} onClose={goHome} />
    </section>
  );
}
