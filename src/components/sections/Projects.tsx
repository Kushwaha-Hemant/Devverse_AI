"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { FaGithub } from "react-icons/fa6";

import { Reveal, Section, SectionHeading } from "@/components/ui/Reveal";
import { projects, type Project } from "@/content/projects";
import { usePreferences } from "@/providers/preferences";
import { cn } from "@/lib/utils";

const ACCENT: Record<Project["accent"], string> = {
  cyan: "#22d3ee",
  electric: "#4c7dff",
  purple: "#a855f7",
  magenta: "#e879f9",
};

const CATEGORIES = ["All", "AI", "Full Stack", "DevOps", "Mobile"] as const;

export function Projects() {
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>("All");
  const visible =
    filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <Section id="projects">
      <SectionHeading
        kicker="Work"
        title="Things I've built"
        subtitle="Real systems, not tutorials — each one solves a problem I actually hit."
      />

      <Reveal className="mb-10 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors",
              filter === c
                ? "from-cyan to-purple text-void bg-gradient-to-r font-semibold"
                : "glass text-ink-muted hover:text-ink",
            )}
          >
            {c}
          </button>
        ))}
      </Reveal>

      <div className="grid gap-6 md:grid-cols-2">
        {visible.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.07}>
            <ProjectCard project={p} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const ref = useRef<HTMLElement>(null);
  const { motionOff } = usePreferences();
  const accent = ACCENT[project.accent];

  // Pointer-driven 3D tilt.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 20 };
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), spring);

  const onMove = (e: React.MouseEvent) => {
    if (motionOff || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };

  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.article
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={
        motionOff
          ? undefined
          : { rotateX, rotateY, transformPerspective: 900, transformStyle: "preserve-3d" }
      }
      className="glass group relative h-full overflow-hidden rounded-3xl p-7 transition-colors"
    >
      {/* Accent wash that brightens on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 transition-opacity duration-500 group-hover:opacity-70"
        style={{
          background: `radial-gradient(120% 90% at 90% 0%, ${accent}33, transparent 60%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />

      <div className="relative">
        {/* The status badge used to sit beside the title and squeeze it,
            orphaning the last word ("InterviewPilot / AI") on narrow cards.
            Below `sm` the badge now sits above the heading on its own row, so
            the title gets the card's full width. */}
        <div className="mb-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <p
              className="font-mono text-[10px] tracking-[0.25em] uppercase"
              style={{ color: accent }}
            >
              {project.category} · {project.year}
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-balance sm:text-2xl">
              {project.title}
            </h3>
          </div>
          <span className="glass text-ink-dim w-fit shrink-0 rounded-full px-3 py-1 font-mono text-[9px] tracking-wider uppercase">
            {project.status}
          </span>
        </div>

        <p className="text-ink-muted text-sm leading-relaxed">
          {project.tagline}
        </p>

        <p className="text-ink-dim mt-4 text-xs leading-relaxed">
          {project.solution}
        </p>

        <ul className="mt-5 space-y-2">
          {project.highlights.slice(0, 3).map((h) => (
            <li key={h} className="text-ink-muted flex gap-2.5 text-xs leading-relaxed">
              <span style={{ color: accent }}>▹</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {project.stack.map((s) => (
            <span
              key={s}
              className="bg-elevated text-ink-dim rounded-md px-2 py-1 font-mono text-[10px]"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          {project.repo && (
            <a
              href={project.repo}
              target="_blank"
              rel="noreferrer"
              className="glass hover:text-cyan flex items-center gap-2 rounded-full px-4 py-2 text-xs transition-colors"
            >
              <FaGithub size={13} /> Code
            </a>
          )}
          {project.demo && (
            <a
              href={project.demo}
              target="_blank"
              rel="noreferrer"
              className="from-cyan to-purple text-void flex items-center gap-2 rounded-full bg-gradient-to-r px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
            >
              Live demo <ArrowUpRight size={13} />
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}
