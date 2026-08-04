"use client";

import { ArrowLeft, Download, Mail } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";
import { usePreferences } from "@/providers/preferences";

/**
 * Recruiter Mode: no canvas, no animation, no gate. Everything that matters,
 * scannable in under a minute.
 */
export function RecruiterView() {
  const { exitRecruiterMode } = usePreferences();

  /**
   * `exitRecruiterMode` rather than the toggle: it also marks the intro gate
   * as passed, so leaving this way can't strand the visitor on the ENTER
   * screen. The jump to the top is instant on purpose — the whole document is
   * being replaced, so easing a scroll through content that is unmounting
   * would only look broken.
   */
  const goBack = () => {
    exitRecruiterMode();
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto max-w-4xl px-5 pt-24 pb-20"
    >
      {/* Sticky so it stays reachable however far down this long page you have
          read. `w-fit` is load-bearing: the sticky box used to be a full-width
          div carrying its own background, which painted a black bar clean
          across the page on scroll. Sizing the box to the button means only
          the button is ever on screen, and `glass` gives it enough of a
          surface to stay legible as it passes over text.
          Nudged left of the text column on wider screens so it reads as a
          floating control rather than sitting on top of the heading. */}
      {/* The pull-left only kicks in from `lg`, which is where max-w-4xl stops
          growing and real gutters appear either side of the column. Below that
          the container is full-bleed at px-5, so any negative margin would
          shove the button against the screen edge — it stays aligned with the
          content there instead. Each step up buys more gutter to move into. */}
      {/* `lg` is pinned at -16 and cannot go further: at exactly 1024 the
          gutter is only 64px, so that already lands the button 20px from the
          screen edge. The wider breakpoints have gutter to spare and take the
          extra ~20px (about 0.5cm). */}
      <div className="sticky top-20 z-20 mb-8 w-fit lg:-ml-16 xl:-ml-35 2xl:-ml-43">
        <button
          onClick={goBack}
          // glass-strong, not glass: at 55% surface the page text showed
          // straight through the button as it floated over the content.
          className="glass-strong text-ink hover:border-cyan/40 hover:text-cyan shadow-void/60 group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full py-2.5 pr-5 pl-4 text-xs font-semibold tracking-wide shadow-lg transition-all duration-200 active:scale-95"
        >
          <ArrowLeft
            size={15}
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          />
          Back to portfolio
        </button>
      </div>

      {/* Header */}
      <header className="border-border border-b pb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {profile.name}
        </h1>
        <p className="text-ink-muted mt-1">{profile.roles.join(" · ")}</p>
        <p className="text-ink-muted mt-4 max-w-2xl text-sm leading-relaxed">
          {profile.summary}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={profile.resumeUrl}
            download={profile.resumeFilename}
            className="from-cyan to-purple text-void flex items-center gap-2 rounded-lg bg-gradient-to-r px-4 py-2 text-xs font-semibold"
          >
            <Download size={14} /> Resume
          </a>
          <a
            href={`mailto:${profile.email}`}
            className="glass flex items-center gap-2 rounded-lg px-4 py-2 text-xs"
          >
            <Mail size={14} /> {profile.email}
          </a>
          <a
            href={profile.socials.github}
            target="_blank"
            rel="noreferrer"
            className="glass flex items-center gap-2 rounded-lg px-4 py-2 text-xs"
          >
            <FaGithub size={14} /> GitHub
          </a>
          <a
            href={profile.socials.linkedin}
            target="_blank"
            rel="noreferrer"
            className="glass flex items-center gap-2 rounded-lg px-4 py-2 text-xs"
          >
            <FaLinkedin size={14} /> LinkedIn
          </a>
        </div>

        <p className="text-ink-dim mt-4 flex items-center gap-2 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {profile.availability} · {profile.location} · {profile.email}
        </p>
      </header>

      {/* Experience */}
      <section className="border-border border-b py-8">
        <h2 className="mb-5 text-xs font-semibold tracking-[0.25em] uppercase">
          Experience
        </h2>
        <ul className="space-y-5">
          {profile.experience.map((e) => (
            <li key={e.company}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="font-semibold">
                  {e.role} — {e.company}
                </h3>
                <span className="text-ink-dim text-xs">
                  {e.period} · {e.location}
                </span>
              </div>
              <ul className="text-ink-muted mt-2 space-y-1 text-xs">
                {e.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-ink-dim">–</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {/* Skills */}
      <section className="border-border border-b py-8">
        <h2 className="mb-4 text-xs font-semibold tracking-[0.25em] uppercase">
          Skills
        </h2>
        <dl className="space-y-2.5">
          {skillGroups.map((g) => (
            <div key={g.id} className="grid gap-1 sm:grid-cols-[130px_1fr]">
              <dt className="text-ink-dim text-xs">{g.label}</dt>
              <dd className="text-sm">
                {g.skills.map((s) => s.name).join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Projects */}
      <section className="border-border border-b py-8">
        <h2 className="mb-5 text-xs font-semibold tracking-[0.25em] uppercase">
          Selected projects
        </h2>
        <ul className="space-y-6">
          {projects.map((p) => (
            <li key={p.slug}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="font-semibold">{p.title}</h3>
                <span className="text-ink-dim text-xs">
                  {p.category} · {p.status} · {p.year}
                </span>
              </div>
              <p className="text-ink-muted mt-1 text-sm">{p.tagline}</p>
              <ul className="text-ink-muted mt-2 space-y-1 text-xs">
                {p.highlights.slice(0, 3).map((h) => (
                  <li key={h} className="flex gap-2">
                    <span className="text-ink-dim">–</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <p className="text-ink-dim mt-2 font-mono text-[11px]">
                {p.stack.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Education */}
      <section className="border-border border-b py-8">
        <h2 className="mb-4 text-xs font-semibold tracking-[0.25em] uppercase">
          Education
        </h2>
        <ul className="space-y-3">
          {profile.education.map((e) => (
            <li
              key={e.institution}
              className="grid gap-1 sm:grid-cols-[90px_1fr]"
            >
              <span className="text-ink-dim font-mono text-xs">{e.year}</span>
              <span>
                <span className="text-sm font-medium">{e.institution}</span>
                <span className="text-ink-muted block text-xs">
                  {e.qualification} · {e.result} · {e.location}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Certifications */}
      <section className="py-8">
        <h2 className="mb-4 text-xs font-semibold tracking-[0.25em] uppercase">
          Certifications
        </h2>
        <dl className="space-y-2.5">
          {profile.certifications.map((c) => (
            <div key={c.issuer} className="grid gap-1 sm:grid-cols-[130px_1fr]">
              <dt className="text-ink-dim text-xs">{c.issuer}</dt>
              <dd className="text-sm">{c.items.join(" · ")}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Was a line of text telling the reader to go and find the header
          toggle. After a full page of reading, the way out should be a button
          under your thumb, not an instruction. */}
      <div className="border-border flex flex-wrap items-center gap-4 border-t pt-6">
        <button
          onClick={goBack}
          className="from-cyan to-purple text-void group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r px-5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 hover:opacity-90 active:scale-95"
        >
          <ArrowLeft
            size={15}
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          />
          Back to portfolio
        </button>
        <p className="text-ink-dim text-xs">
          Returns to the full interactive experience.
        </p>
      </div>
    </main>
  );
}
