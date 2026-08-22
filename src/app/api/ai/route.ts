import { NextResponse } from "next/server";
import { clientKey, rateLimit, rateLimitHeaders } from "@/lib/rateLimit";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };

/** Everything the assistant is allowed to know, built from the site content. */
function buildKnowledgeBase() {
  const projectText = projects
    .map(
      (p) =>
        `## ${p.title} (${p.status}, ${p.year}) — ${p.tagline}\n` +
        `Problem: ${p.problem}\nSolution: ${p.solution}\n` +
        `Highlights:\n${p.highlights.map((h) => `- ${h}`).join("\n")}\n` +
        `Stack: ${p.stack.join(", ")}`,
    )
    .join("\n\n");

  const skillText = skillGroups
    .map((g) => `${g.label}: ${g.skills.map((s) => s.name).join(", ")}`)
    .join("\n");

  const timelineText = profile.timeline
    .map((t) => `${t.year} — ${t.title}: ${t.description}`)
    .join("\n");

  const experienceText = profile.experience
    .map(
      (e) =>
        `${e.role} at ${e.company} (${e.location}), ${e.period}\n` +
        e.bullets.map((b) => `- ${b}`).join("\n"),
    )
    .join("\n\n");

  const educationText = profile.education
    .map(
      (e) =>
        `${e.qualification}, ${e.institution} (${e.location}) — ${e.result}, ${e.year}`,
    )
    .join("\n");

  const certText = profile.certifications
    .map((c) => `${c.issuer}: ${c.items.join(", ")}`)
    .join("\n");

  return `# ${profile.name}
${profile.roles.join(" · ")}
${profile.summary}

Location: ${profile.location}
Availability: ${profile.availability}
Contact: ${profile.email}

# Experience
${experienceText}

# Education
${educationText}

# Certifications
${certText}

# Timeline
${timelineText}

# Skills
${skillText}

# Projects
${projectText}`;
}

const SYSTEM_PROMPT = `You are the portfolio assistant for ${profile.name}.
Answer questions about him using ONLY the context below. Be concise — two to four
sentences unless asked for detail. Speak about him in the third person. If the
context does not contain the answer, say so plainly and suggest emailing him at
${profile.email}. Never invent employers, dates, metrics or links.

CONTEXT
${buildKnowledgeBase()}`;

/**
 * Keyword-matched answers used when no LLM key is configured. Keeps the
 * assistant genuinely useful on a fresh clone rather than showing an error.
 */
function fallbackReply(question: string): string {
  const q = question.toLowerCase();

  const project = projects.find(
    (p) =>
      q.includes(p.title.toLowerCase()) || q.includes(p.slug.replace("-", " ")),
  );
  if (project) {
    return `${project.title} — ${project.tagline}. ${project.solution} Stack: ${project.stack.slice(0, 6).join(", ")}.`;
  }

  // Patterns are prefix-matched (leading \b only) so plurals and inflections
  // like "skills", "projects", "certifications" still hit.
  if (/\b(experience|intern|job|worked|working|codtech|employ)/.test(q)) {
    return profile.experience
      .map(
        (e) =>
          `${e.role} at ${e.company} (${e.period}, ${e.location}): ${e.bullets[0]}`,
      )
      .join(" ");
  }
  if (/\b(education|degree|mca|college|universit|study|studied|cgpa|graduat)/.test(q)) {
    return profile.education
      .map(
        (e) =>
          `${e.qualification} from ${e.institution} — ${e.result} (${e.year}).`,
      )
      .join(" ");
  }
  if (/\b(certif|course|claude|anthropic|google cloud|vertex)/.test(q)) {
    return profile.certifications
      .map((c) => `${c.issuer} — ${c.items.join(", ")}.`)
      .join(" ");
  }
  // "phone" and "number" stay in the matcher on purpose: someone asking for a
  // phone number should get the channels that do exist, not a fallthrough.
  if (/\b(contact|email|reach|hire|hiring|available|phone|number)/.test(q)) {
    return `${profile.availability}. You can reach him by email at ${profile.email}, or use the contact form on this site — no phone number is published.`;
  }
  if (/\b(skill|tech|stack|language|framework|know|tool)/.test(q)) {
    return skillGroups
      .map((g) => `${g.label}: ${g.skills.map((s) => s.name).join(", ")}`)
      .join(" · ");
  }
  if (/\b(project|work|built|build|portfolio|show)/.test(q)) {
    return `He's built ${projects.length} substantial projects: ${projects.map((p) => `${p.title} (${p.tagline})`).join("; ")}.`;
  }
  if (/\b(ai|rag|llm|ml|chatbot)/.test(q)) {
    const ai = projects.filter((p) => p.category === "AI");
    return `His AI work: ${ai.map((p) => `${p.title} — ${p.tagline}`).join("; ")}.`;
  }
  if (/\b(who|about|tell me|background|summary|introduce)/.test(q)) {
    return profile.summary;
  }

  return `I can answer questions about ${profile.name}'s projects, skills, background and how to contact him. For anything else, email ${profile.email}.`;
}

/** Requests per IP per window. Generous for a human, ruinous for a script. */
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

/** Ceilings on what reaches a paid, per-token API. */
const MAX_MESSAGES = 24;
const MAX_CHARS_PER_MESSAGE = 2_000;
const MAX_TOTAL_CHARS = 8_000;

export async function POST(req: Request) {
  // This route spends money on every call and has no auth by design, so the
  // cost ceiling has to come from here.
  const limit = rateLimit(clientKey(req), {
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many questions in a short time. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  let messages: Msg[] = [];
  try {
    ({ messages = [] } = (await req.json()) as { messages?: Msg[] });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "Too many messages." }, { status: 400 });
  }

  // Capping the count alone is not enough: eight messages of a megabyte each
  // still bills as a megabyte.
  const totalChars = messages.reduce((n, m) => n + (m?.content?.length ?? 0), 0);
  if (
    totalChars > MAX_TOTAL_CHARS ||
    messages.some((m) => (m?.content?.length ?? 0) > MAX_CHARS_PER_MESSAGE)
  ) {
    return NextResponse.json({ error: "Message is too long." }, { status: 413 });
  }

  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last?.content?.trim()) {
    return NextResponse.json({ error: "No question provided." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  // No key configured — answer from the grounded fallback instead of failing.
  if (!apiKey) {
    return NextResponse.json({ reply: fallbackReply(last.content) });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ],
      }),
    });

    if (!res.ok) {
      // Upstream failure shouldn't dead-end the user.
      return NextResponse.json({ reply: fallbackReply(last.content) });
    }

    const data = await res.json();
    const reply: string | undefined = data?.choices?.[0]?.message?.content;
    return NextResponse.json({ reply: reply ?? fallbackReply(last.content) });
  } catch {
    return NextResponse.json({ reply: fallbackReply(last.content) });
  }
}
