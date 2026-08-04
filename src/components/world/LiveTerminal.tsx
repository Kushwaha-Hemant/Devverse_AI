"use client";

import { useEffect, useRef, useState } from "react";
import { usePreferences } from "@/providers/preferences";

/** A believable deploy loop — types out, then repeats. */
const SCRIPT: { cmd: string; out: string[] }[] = [
  { cmd: "git pull origin main", out: ["Already up to date."] },
  {
    cmd: "npm install",
    out: ["added 12 packages in 3s", "found 0 vulnerabilities"],
  },
  {
    cmd: "npm run build",
    out: ["✓ Compiled successfully", "✓ Generating static pages (14/14)"],
  },
  {
    cmd: "docker build -t devverse .",
    out: ["=> exporting layers", "=> naming to docker.io/library/devverse"],
  },
  { cmd: "docker run -p 3000:3000 devverse", out: ["listening on :3000"] },
  { cmd: "git push origin main", out: ["main -> main"] },
  { cmd: "vercel --prod", out: ["✓ Deployment ready", "https://devverse.app"] },
];

type Line = { text: string; kind: "cmd" | "out" };

/**
 * Always-on terminal that types a deploy cycle on a loop. Purely decorative —
 * it renders nothing when motion is suppressed.
 */
export function LiveTerminal({ className = "" }: { className?: string }) {
  const { motionOff } = usePreferences();
  const [lines, setLines] = useState<Line[]>([]);
  const [typing, setTyping] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (motionOff) return;
    let cancelled = false;
    let step = 0;

    const sleep = (ms: number) =>
      new Promise((r) => setTimeout(r, ms));

    const run = async () => {
      while (!cancelled) {
        const entry = SCRIPT[step % SCRIPT.length];

        // Type the command one character at a time.
        for (let i = 1; i <= entry.cmd.length; i++) {
          if (cancelled) return;
          setTyping(entry.cmd.slice(0, i));
          await sleep(28);
        }
        await sleep(260);
        if (cancelled) return;

        setTyping("");
        setLines((prev) =>
          [
            ...prev,
            { text: entry.cmd, kind: "cmd" as const },
            ...entry.out.map((o) => ({ text: o, kind: "out" as const })),
          ].slice(-40),
        );

        await sleep(900);
        step++;
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [motionOff]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines, typing]);

  if (motionOff) return null;

  return (
    <div
      data-decorative
      aria-hidden
      className={`glass overflow-hidden rounded-xl font-mono text-[11px] leading-relaxed ${className}`}
    >
      <div className="border-border flex items-center gap-1.5 border-b px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="text-ink-dim ml-2 text-[10px] tracking-wider">
          hemant@devverse — zsh
        </span>
      </div>
      <div
        ref={scrollRef}
        className="h-40 space-y-0.5 overflow-hidden px-3 py-2"
      >
        {lines.map((l, i) => (
          <div key={i} className={l.kind === "cmd" ? "" : "text-ink-dim pl-4"}>
            {l.kind === "cmd" && <span className="text-purple mr-2">❯</span>}
            <span className={l.kind === "cmd" ? "text-cyan" : ""}>{l.text}</span>
          </div>
        ))}
        {typing && (
          <div>
            <span className="text-purple mr-2">❯</span>
            <span className="text-cyan">{typing}</span>
            <span className="bg-cyan ml-0.5 inline-block h-3 w-1.5 align-middle animate-blink" />
          </div>
        )}
      </div>
    </div>
  );
}
