"use client";

import { Download, MapPin } from "lucide-react";
import { Reveal, Section, SectionHeading } from "@/components/ui/Reveal";
import { profile } from "@/content/profile";

export function About() {
  return (
    <Section id="about">
      <SectionHeading
        kicker="About"
        title="The short version"
        subtitle={profile.summary}
      />

      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        {/* Quick facts */}
        <Reveal className="space-y-4">
          <div className="glass rounded-2xl p-6">
            <div className="mb-5 flex items-center gap-4">
              <div className="from-cyan via-electric to-purple grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-xl font-bold text-void">
                {profile.logo}
              </div>
              <div>
                <p className="text-lg font-semibold">{profile.name}</p>
                <p className="text-ink-muted text-sm">{profile.roles[0]}</p>
              </div>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-cyan shrink-0" />
                <dt className="sr-only">Location</dt>
                <dd className="text-ink-muted">{profile.location}</dd>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <dt className="sr-only">Availability</dt>
                <dd className="text-ink-muted">{profile.availability}</dd>
              </div>
            </dl>

            <a
              href={profile.resumeUrl}
              download={profile.resumeFilename}
              className="from-cyan to-purple text-void mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r px-5 py-3 text-xs font-semibold tracking-[0.15em] uppercase transition-opacity hover:opacity-90"
            >
              <Download size={14} />
              Download resume
            </a>
          </div>
        </Reveal>

        {/* Timeline */}
        <div>
          <ol className="relative space-y-8 pl-8">
            <span className="from-cyan via-electric to-purple absolute top-2 bottom-2 left-[7px] w-px bg-gradient-to-b" />
            {profile.timeline.map((t, i) => (
              <Reveal key={t.year + t.title} delay={i * 0.06}>
                <li className="relative">
                  <span className="bg-void border-cyan absolute top-1.5 -left-[29px] h-3.5 w-3.5 rounded-full border-2 shadow-[0_0_12px_#22d3ee]" />
                  <p className="text-cyan font-mono text-[10px] tracking-[0.25em] uppercase">
                    {t.year}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{t.title}</h3>
                  <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">
                    {t.description}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
