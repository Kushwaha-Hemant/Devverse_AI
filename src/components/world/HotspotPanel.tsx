"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

import type { HotspotId } from "@/components/three/objects";
import type { GitHubStats } from "@/app/api/github/route";
import { LiveTerminal } from "./LiveTerminal";
import { AIAssistant } from "./AIAssistant";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";

const TITLES: Record<HotspotId, { title: string; kicker: string }> = {
  laptop: { title: "Projects", kicker: "What I've shipped" },
  monitor: { title: "Live Terminal", kicker: "Always deploying" },
  books: { title: "Education", kicker: "How I got here" },
  coffee: { title: "Fun Facts", kicker: "Off the clock" },
  server: { title: "DevOps", kicker: "Infrastructure & tooling" },
  robot: { title: "AI Assistant", kicker: "Ask me anything" },
  window: { title: "Status", kicker: "Live signals" },
  whiteboard: { title: "Roadmap", kicker: "What's next" },
};

export function HotspotPanel({
  id,
  onClose,
}: {
  id: HotspotId | null;
  onClose: () => void;
}) {
  // Escape closes the panel — expected for anything drawer-shaped.
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  return (
    <AnimatePresence>
      {id && (
        <motion.aside
          key={id}
          role="dialog"
          aria-label={TITLES[id].title}
          initial={{ x: "110%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "110%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
          className="glass-strong fixed top-0 right-0 z-[120] flex h-full w-full max-w-md flex-col border-l"
        >
          <header className="border-border flex items-start justify-between border-b px-6 py-5">
            <div>
              <p className="text-cyan font-mono text-[10px] tracking-[0.25em] uppercase">
                {TITLES[id].kicker}
              </p>
              <h2 className="text-aurora mt-1 text-2xl font-bold">
                {TITLES[id].title}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="text-ink-muted hover:text-ink hover:bg-elevated cursor-pointer rounded-lg p-2 transition-colors"
            >
              <X size={18} />
            </button>
          </header>

          {/* `data-lenis-prevent` is what actually makes this scroll.
              Lenis runs with smoothWheel, so it intercepts every wheel event
              on the document and drives the page — the panel was scrollable
              but never saw the event. The attribute makes Lenis skip events
              originating inside here and hand them back to the browser, which
              then scrolls the nearest scrollable ancestor: this panel.

              `overscroll-contain` stops the scroll chaining onward once the
              panel hits a limit. Chaining would scroll the page natively while
              Lenis still believes it owns the scroll position, and the two
              fight; the drawer is full-height anyway, so there is nothing
              behind it worth scrolling to. */}
          {/* `min-h-0` is load-bearing. A flex item defaults to
              `min-height: auto`, meaning it refuses to shrink below its
              content — so on a short viewport this would grow past the panel
              and overflow it instead of scrolling, and `overflow-y-auto` would
              never engage at all. */}
          <div
            data-lenis-prevent
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5"
          >
            <PanelBody id={id} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function PanelBody({ id }: { id: HotspotId }) {
  switch (id) {
    case "laptop":
      return <ProjectsBody />;
    case "monitor":
      return (
        <div className="space-y-4">
          <p className="text-ink-muted text-sm">
            A running deploy loop — the same commands behind every project on
            this site.
          </p>
          <LiveTerminal />
        </div>
      );
    case "books":
      return <EducationBody />;
    case "coffee":
      return <FunFactsBody />;
    case "server":
      return <DevOpsBody />;
    case "robot":
      return <AIAssistant />;
    case "window":
      return <StatusBody />;
    case "whiteboard":
      return <RoadmapBody />;
  }
}

function ProjectsBody() {
  return (
    <ul className="space-y-3">
      {projects.map((p) => (
        <li
          key={p.slug}
          className="glass hover:border-cyan/40 group rounded-xl p-4 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="group-hover:text-cyan font-semibold transition-colors">
              {p.title}
            </h3>
            <span className="text-ink-dim shrink-0 font-mono text-[10px] tracking-wider uppercase">
              {p.status}
            </span>
          </div>
          <p className="text-ink-muted mt-1 text-xs leading-relaxed">
            {p.tagline}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.stack.slice(0, 5).map((s) => (
              <span
                key={s}
                className="bg-elevated text-ink-dim rounded-md px-2 py-0.5 font-mono text-[10px]"
              >
                {s}
              </span>
            ))}
            {p.stack.length > 5 && (
              <span className="text-ink-dim px-1 py-0.5 font-mono text-[10px]">
                +{p.stack.length - 5}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function EducationBody() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-ink-dim mb-3 font-mono text-[10px] tracking-[0.25em] uppercase">
          Degrees
        </h3>
        <ul className="space-y-3">
          {profile.education.map((e) => (
            <li key={e.institution} className="glass rounded-xl p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{e.institution}</p>
                <span className="text-cyan shrink-0 font-mono text-[10px]">
                  {e.year}
                </span>
              </div>
              <p className="text-ink-muted mt-1 text-xs">{e.qualification}</p>
              <p className="text-ink-dim mt-1 font-mono text-[10px]">
                {e.result} · {e.location}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-ink-dim mb-3 font-mono text-[10px] tracking-[0.25em] uppercase">
          Certifications
        </h3>
        <ul className="space-y-3">
          {profile.certifications.map((c) => (
            <li key={c.issuer} className="glass rounded-xl p-4">
              <p className="text-purple font-mono text-[10px] tracking-widest uppercase">
                {c.issuer}
              </p>
              <ul className="mt-2 space-y-1">
                {c.items.map((i) => (
                  <li
                    key={i}
                    className="text-ink-muted flex gap-2 text-xs leading-relaxed"
                  >
                    <span className="text-cyan">▹</span>
                    {i}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-ink-dim mb-3 font-mono text-[10px] tracking-[0.25em] uppercase">
          Journey
        </h3>
        <ol className="relative space-y-5 pl-6">
          <span className="from-cyan to-purple absolute top-1 bottom-1 left-[5px] w-px bg-gradient-to-b" />
          {profile.timeline.map((t) => (
            <li key={t.year + t.title} className="relative">
              <span className="bg-cyan absolute top-1.5 -left-[23px] h-2.5 w-2.5 rounded-full shadow-[0_0_10px_#22d3ee]" />
              <p className="text-cyan font-mono text-[10px] tracking-widest">
                {t.year}
              </p>
              <h4 className="mt-0.5 font-semibold">{t.title}</h4>
              <p className="text-ink-muted mt-1 text-xs leading-relaxed">
                {t.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function FunFactsBody() {
  return (
    <ul className="space-y-3">
      {profile.funFacts.map((f, i) => (
        <li key={i} className="glass flex gap-3 rounded-xl p-4 text-sm">
          <span className="text-purple font-mono text-xs">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-ink-muted leading-relaxed">{f}</span>
        </li>
      ))}
    </ul>
  );
}

function DevOpsBody() {
  const group = skillGroups.find((g) => g.id === "tools");
  if (!group) return null;

  return (
    <div className="space-y-4">
      {group.skills.map((s) => (
        <div key={s.name}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">{s.name}</span>
            {s.usedIn.length > 0 && (
              <span className="text-ink-dim shrink-0 font-mono text-[10px]">
                {s.usedIn.join(" · ")}
              </span>
            )}
          </div>
          <div className="bg-elevated h-1 overflow-hidden rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${s.level}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="from-cyan to-purple h-full rounded-full bg-gradient-to-r"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBody() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () =>
      setNow(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Kolkata",
        }).format(new Date()),
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-4">
        <p className="text-ink-dim font-mono text-[10px] tracking-widest uppercase">
          Local time · IST
        </p>
        <p className="text-aurora mt-1 font-mono text-3xl font-bold tabular-nums">
          {now || "--:--:--"}
        </p>
      </div>
      <div className="glass rounded-xl p-4">
        <p className="text-ink-dim font-mono text-[10px] tracking-widest uppercase">
          Availability
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          {profile.availability}
        </p>
      </div>
      <GitHubActivity />
    </div>
  );
}

/** Live GitHub data via /api/github (cached server-side for an hour). */
function GitHubActivity() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error" }
    | { kind: "ready"; data: GitHubStats }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/github")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((data: GitHubStats) => {
        if (!cancelled) setState({ kind: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="glass rounded-xl p-4">
      <p className="text-ink-dim font-mono text-[10px] tracking-widest uppercase">
        GitHub activity
      </p>

      {state.kind === "loading" && (
        <p className="text-ink-dim mt-2 font-mono text-xs">fetching…</p>
      )}

      {state.kind === "error" && (
        <p className="text-ink-muted mt-2 text-xs">
          Couldn&apos;t reach GitHub right now.{" "}
          <a
            href={profile.socials.github}
            target="_blank"
            rel="noreferrer"
            className="text-cyan underline"
          >
            View the profile directly
          </a>
          .
        </p>
      )}

      {state.kind === "ready" && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Repos", value: state.data.publicRepos },
              { label: "Stars", value: state.data.totalStars },
              { label: "Followers", value: state.data.followers },
            ].map((s) => (
              <div key={s.label} className="bg-elevated rounded-lg py-2">
                <p className="text-aurora font-mono text-lg font-bold">
                  {s.value}
                </p>
                <p className="text-ink-dim text-[9px] tracking-widest uppercase">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {state.data.topRepos.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {state.data.topRepos.map((r) => (
                <li key={r.name}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:bg-elevated flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <span className="truncate font-mono text-xs">{r.name}</span>
                    <span className="text-ink-dim shrink-0 font-mono text-[10px]">
                      {r.language ?? "—"}
                      {r.stars > 0 && ` · ★ ${r.stars}`}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <a
            href={state.data.url}
            target="_blank"
            rel="noreferrer"
            className="text-cyan mt-3 inline-block font-mono text-[10px] tracking-widest uppercase hover:underline"
          >
            @{state.data.username} →
          </a>
        </>
      )}
    </div>
  );
}

function RoadmapBody() {
  const items = [
    {
      label: "Currently learning",
      value: "Agentic workflows with LangGraph, deeper Postgres internals",
    },
    { label: "Building", value: "DevVerse AI — this portfolio" },
    {
      label: "Next up",
      value: "Ship DevFlow v1, publish InterviewPilot, open-source RAGForge",
    },
    { label: "Goal", value: profile.availability },
  ];
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label} className="glass rounded-xl p-4">
          <p className="text-cyan font-mono text-[10px] tracking-widest uppercase">
            {i.label}
          </p>
          <p className="mt-1 text-sm">{i.value}</p>
        </li>
      ))}
    </ul>
  );
}
