"use client";

import { Reveal, Section, SectionHeading } from "@/components/ui/Reveal";
import { profile } from "@/content/profile";

export function Experience() {
  return (
    <Section id="experience">
      <SectionHeading
        kicker="Experience"
        title="Where I've worked"
        subtitle="Hands-on with production AI systems, not just coursework."
      />

      <div className="mx-auto max-w-3xl space-y-6">
        {profile.experience.map((e, i) => (
          <Reveal key={e.company} delay={i * 0.08}>
            <article className="glass hover:border-cyan/40 rounded-2xl p-7 transition-colors">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-xl font-bold tracking-tight">{e.role}</h3>
                <span className="text-cyan font-mono text-[10px] tracking-[0.2em] uppercase">
                  {e.period}
                </span>
              </div>
              <p className="text-ink-muted mt-1 text-sm">
                {e.company} · {e.location}
              </p>
              <ul className="mt-5 space-y-2.5">
                {e.bullets.map((b) => (
                  <li
                    key={b}
                    className="text-ink-muted flex gap-3 text-sm leading-relaxed"
                  >
                    <span className="text-cyan shrink-0">▹</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}

        {/* Education + certifications sit here so the resume maps 1:1. */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Reveal delay={0.1}>
            <div className="glass h-full rounded-2xl p-6">
              <h3 className="text-ink-dim mb-4 font-mono text-[10px] tracking-[0.25em] uppercase">
                Education
              </h3>
              <ul className="space-y-4">
                {profile.education.map((ed) => (
                  <li key={ed.institution}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold">{ed.institution}</p>
                      <span className="text-cyan shrink-0 font-mono text-[10px]">
                        {ed.year}
                      </span>
                    </div>
                    <p className="text-ink-muted mt-0.5 text-xs">
                      {ed.qualification}
                    </p>
                    <p className="text-ink-dim mt-0.5 font-mono text-[10px]">
                      {ed.result} · {ed.location}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="glass h-full rounded-2xl p-6">
              <h3 className="text-ink-dim mb-4 font-mono text-[10px] tracking-[0.25em] uppercase">
                Certifications
              </h3>
              <ul className="space-y-4">
                {profile.certifications.map((c) => (
                  <li key={c.issuer}>
                    <p className="text-purple font-mono text-[10px] tracking-widest uppercase">
                      {c.issuer}
                    </p>
                    <p className="text-ink-muted mt-1.5 text-xs leading-relaxed">
                      {c.items.join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
