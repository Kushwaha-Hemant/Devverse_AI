/**
 * Project catalogue.
 *
 * RAGForge and Spendee are the two flagship projects from the resume — their
 * copy comes straight from it. DevFlow, InterviewPilot and ResumePilot are
 * additional builds described from the actual repositories on disk.
 *
 * `repo` is set only for repositories that are PUBLIC — a link to a private
 * repo renders a "Code" button that 404s for every visitor, which is worse
 * than no button. Spendee and RAGForge have none for that reason.
 *
 * TODO: add `demo` URLs as each one is deployed.
 */

export type Project = {
  slug: string;
  title: string;
  tagline: string;
  year: string;
  featured: boolean;
  /** True for the two projects that appear on the resume. */
  onResume: boolean;
  category: "AI" | "Full Stack" | "DevOps" | "Mobile";
  accent: "cyan" | "purple" | "electric" | "magenta";
  problem: string;
  solution: string;
  highlights: string[];
  stack: string[];
  status: "Live" | "In development" | "Prototype";
  repo?: string;
  demo?: string;
};

export const projects: Project[] = [
  {
    slug: "ragforge",
    title: "RAGForge",
    tagline: "Self-hosted RAG platform — multi-tenant API over Postgres and pgvector",
    year: "2026",
    featured: true,
    onResume: true,
    category: "AI",
    accent: "cyan",
    status: "In development",
    problem:
      "A search-only RAG prototype had no way to organise documents, hold conversations, or vary " +
      "retrieval behaviour per project — every knob was a hard-coded constant, and there was no " +
      "authenticated API for a dashboard to talk to.",
    solution:
      "I built the backend that turns the prototype into a product: a Clerk-authenticated API where " +
      "documents live under projects, chats persist per project, and retrieval behaviour is stored " +
      "as per-project data rather than constants — so it can be tuned without a redeploy.",
    highlights: [
      "Clerk session tokens verified server-side with RS256 against a rotating JWKS endpoint, with issuer validation — no Clerk secret key is held on the server",
      "Full dashboard API: projects CRUD, per-project settings, chats with messages, file listing/deletion and chunk inspection",
      "Eleven per-project retrieval settings modelled as data with defaults — embedding model, strategy, agent type, chunks-per-search, context size, similarity threshold, query count, reranking, and vector/keyword weighting",
      "Embeddings generated locally with sentence-transformers (384-dim), so indexing needs no external API key",
      "Supabase Postgres with pgvector, run locally in Docker; migrations kept in-repo",
    ],
    stack: [
      "Next.js",
      "TypeScript",
      "FastAPI",
      "Python",
      "PostgreSQL",
      "pgvector",
      "Supabase",
      "Clerk",
      "Docker",
    ],
    // No `repo`: Kushwaha-Hemant/ragforge is currently private. Make it public
    // and add the URL back to restore the Code button.
  },
  {
    slug: "spendee",
    title: "Spendee",
    tagline: "Native Android personal finance and budget tracker",
    year: "2026",
    featured: true,
    onResume: true,
    category: "Mobile",
    accent: "magenta",
    status: "Live",
    problem:
      "Budget apps either sync unreliably or bury the numbers you actually check daily behind " +
      "three taps and an upsell.",
    solution:
      "A native Android app backed by Firebase Realtime Database — full CRUD on income and expenses " +
      "with real-time cloud sync, proper account security, and the planning calculators built in " +
      "rather than bolted on.",
    highlights: [
      "Full CRUD on income and expenses with real-time cloud sync via Firebase Realtime Database",
      "Firebase Authentication with email verification, password reset, password change and permanent account deletion",
      "Spending analytics — daily statistical breakdowns, date-based search and automated low-balance alerts",
      "Built-in Income Tax, EMI and general calculators for in-app financial planning",
    ],
    stack: ["Android", "Java", "Firebase", "Firebase Auth", "Realtime Database"],
  },
  {
    slug: "devflow",
    title: "DevFlow",
    tagline: "DevOps & CI/CD dashboard that actually runs your pipelines",
    year: "2026",
    featured: true,
    onResume: false,
    category: "DevOps",
    accent: "electric",
    status: "In development",
    problem:
      "Managing repositories, pipelines, containers, deployments and logs means juggling GitHub, " +
      "a CI provider, a Docker host and three terminal tabs.",
    solution:
      "One dashboard wired to real infrastructure. Repositories come from the GitHub REST API over " +
      "OAuth; containers are created, started, stopped and inspected through the Docker Engine API " +
      "on the host. Pipelines clone the repo, run your commands, build an image and run it — no " +
      "simulation layer.",
    highlights: [
      "Live build logs, deployment events, Docker events and host metrics streamed over Socket.IO",
      "JWT access tokens with rotating refresh tokens in httpOnly cookies, plus GitHub OAuth and personal API tokens",
      "Real Docker Engine API integration — not a mocked container list",
      "Prisma + PostgreSQL schema covering repos, pipelines, runs, deployments and teams",
    ],
    stack: [
      "React",
      "TypeScript",
      "Vite",
      "Tailwind CSS",
      "Node.js",
      "Express",
      "Prisma",
      "PostgreSQL",
      "Socket.IO",
      "Docker",
    ],
    repo: "https://github.com/Kushwaha-Hemant/Devflow",
  },
  {
    slug: "interviewpilot",
    title: "InterviewPilot AI",
    tagline: "Adaptive AI mock interviews that decide what to ask next",
    year: "2026",
    featured: true,
    onResume: false,
    category: "AI",
    accent: "purple",
    status: "In development",
    problem:
      "Most mock-interview tools are a fixed question list. Real interviewers probe when an answer " +
      "is thin and move on when it is strong.",
    solution:
      "An adaptive loop: question → answer → evaluation → decision → { follow-up | hint | next | end }. " +
      "Every answer is scored by an LLM using Structured Outputs, and that score drives the next " +
      "move. The session ends with a scored report and a generated learning plan.",
    highlights: [
      "Resume and job description are both ingested to ground question generation",
      "OpenAI Responses API with Structured Outputs — every evaluation is schema-validated, never free text",
      "WebSocket-driven session state so the interview streams in real time",
      "Redis for session/turn state, PostgreSQL via SQLAlchemy for durable history",
    ],
    stack: [
      "Next.js",
      "TypeScript",
      "FastAPI",
      "SQLAlchemy",
      "PostgreSQL",
      "Redis",
      "WebSockets",
      "OpenAI API",
      "Docker",
    ],
    repo: "https://github.com/Kushwaha-Hemant/interviewpilot-ai",
  },
  {
    slug: "resumepilot",
    title: "ResumePilot",
    tagline: "RAG-powered resume analyzer with a pluggable LLM backend",
    year: "2026",
    featured: false,
    onResume: false,
    category: "AI",
    accent: "cyan",
    status: "Live",
    problem:
      "Resume feedback tools either dump the whole document into a prompt (expensive, imprecise) " +
      "or run keyword matching (shallow).",
    solution:
      "A proper retrieval pipeline — chunk, embed, store, retrieve, rerank — so the model reasons " +
      "over the relevant sections only. All AI output is structured JSON validated by Pydantic, so " +
      "the UI never parses prose.",
    highlights: [
      "Layered architecture: Streamlit frontend → API facade → services → RAG core → models/database/parsers",
      "Provider seam at `llm_factory.get_llm()` — swap OpenAI and Gemini via one environment variable",
      "Local sentence-transformers embeddings, so no API key is needed to index documents",
      "Multi-format parsing: PyMuPDF, docx, txt and OCR fallback",
      "20 tests pass without any API key — parsing, embedding and retrieval are independently verifiable",
    ],
    stack: [
      "Python",
      "Streamlit",
      "ChromaDB",
      "sentence-transformers",
      "OpenAI API",
      "Pydantic",
      "PyMuPDF",
      "pytest",
    ],
    repo: "https://github.com/Kushwaha-Hemant/ResumePilot",
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
export const resumeProjects = projects.filter((p) => p.onResume);

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
