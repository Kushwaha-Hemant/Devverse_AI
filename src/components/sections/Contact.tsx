"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import { Reveal, Section, SectionHeading } from "@/components/ui/Reveal";
import { profile } from "@/content/profile";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

/** Terminal-styled contact form — prompts instead of labels. */
export function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error ?? "Send failed." });
        return;
      }
      setStatus({ kind: "done", message: data.message ?? "Message sent." });
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus({
        kind: "error",
        message: `Network error. Email ${profile.email} directly.`,
      });
    }
  };

  const field =
    "flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-ink-dim";

  return (
    <Section id="contact">
      <SectionHeading
        kicker="Contact"
        title="Let's build something"
        subtitle={profile.availability}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <form onSubmit={submit} className="glass rounded-2xl p-6 font-mono">
            <div className="border-border mb-5 flex items-center gap-1.5 border-b pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="text-ink-dim ml-2 text-[10px] tracking-wider">
                new-message
              </span>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <span className="text-purple shrink-0 text-sm">{">"} name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="your name"
                  className={field}
                />
              </label>
              <label className="flex items-center gap-3">
                <span className="text-purple shrink-0 text-sm">{">"} email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  className={field}
                />
              </label>
              <label className="flex gap-3">
                <span className="text-purple shrink-0 pt-0.5 text-sm">
                  {">"} message
                </span>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="what are you building?"
                  className={`${field} resize-none`}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={status.kind === "sending"}
              className="from-cyan to-purple text-void mt-6 w-full cursor-pointer rounded-full bg-gradient-to-r px-6 py-3 text-xs font-semibold tracking-[0.2em] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status.kind === "sending" ? "sending…" : "send"}
            </button>

            {(status.kind === "done" || status.kind === "error") && (
              <p
                role="status"
                className={`mt-4 text-xs leading-relaxed ${
                  status.kind === "done" ? "text-cyan" : "text-magenta"
                }`}
              >
                {status.kind === "done" ? "✓ " : "✗ "}
                {status.message}
              </p>
            )}
          </form>
        </Reveal>

        <Reveal delay={0.1} className="space-y-3">
          <ContactLink
            icon={<Mail size={16} />}
            label="Email"
            value={profile.email}
            href={`mailto:${profile.email}`}
          />
          <ContactLink
            icon={<FaGithub size={16} />}
            label="GitHub"
            value="View repositories"
            href={profile.socials.github}
          />
          <ContactLink
            icon={<FaLinkedin size={16} />}
            label="LinkedIn"
            value="Connect"
            href={profile.socials.linkedin}
          />
        </Reveal>
      </div>
    </Section>
  );
}

function ContactLink({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel="noreferrer"
      className="glass hover:border-cyan/40 group flex items-center gap-4 rounded-2xl p-4 transition-colors"
    >
      <span className="bg-elevated text-cyan group-hover:bg-cyan group-hover:text-void grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="text-ink-dim block font-mono text-[10px] tracking-[0.2em] uppercase">
          {label}
        </span>
        <span className="block truncate text-sm">{value}</span>
      </span>
    </a>
  );
}
