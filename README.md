# DevVerse AI

A 3D interactive developer portfolio for **Hemant Kushwaha**. Instead of a page
you scroll, the landing is a workspace you explore: the camera flies to whatever
object you click, and each object opens a real section of the site.

**Theme:** Neo Cyber Developer Workspace — dark, glassmorphic, aurora gradients,
neon accents.

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens) |
| 3D | React Three Fiber 9, drei 10, three.js, postprocessing (bloom) |
| Motion | Motion 12 (Framer Motion), GSAP, Lenis smooth scroll |
| Backend | Next.js Route Handlers (`/api/ai`, `/api/contact`, `/api/github`) |
| Icons | lucide-react + react-icons |
| Deploy | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare` + wrangler) |

A single Next.js app rather than split `client/` + `server/` + `admin/` —
Route Handlers cover the backend, and the admin area will live behind a
protected route group. One deploy, one dependency tree.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — the site runs without any keys
npm run dev                  # http://localhost:3000
```

```bash
npm run build     # production build
npm start         # serve the build
npx tsc --noEmit  # typecheck
```

---

## Where the content lives

All copy is data, not markup. Edit these three files and the whole site updates:

| File | Contains |
| --- | --- |
| `src/content/profile.ts` | Name, roles, summary, contact, socials, stats, timeline, fun facts |
| `src/content/projects.ts` | Every project — problem, solution, highlights, stack, links |
| `src/content/skills.ts` | Skill groups, confidence levels, and which projects use each skill |

`repo` links are set only for projects whose repository is public — a Code
button pointing at a private repo 404s for every visitor.

The résumé PDF is deliberately **not** in this repository (it carries a phone
number and personal email). Drop your own at
`public/resume/hemant-kushwaha-resume.pdf` to make the download buttons work
locally; the deployed site serves its own copy.

---

## How it's put together

```
src/
├── app/
│   ├── layout.tsx           # fonts, metadata, providers, theme-flash guard
│   ├── page.tsx             # composes the experience
│   ├── globals.css          # design tokens, utilities, motion/recruiter rules
│   └── api/
│       ├── ai/route.ts      # portfolio assistant
│       └── contact/route.ts # contact form
├── components/
│   ├── three/               # Scene, DeveloperRoom, objects (all procedural)
│   ├── landing/             # cinematic ENTER gate
│   ├── world/               # dock, hotspot panels, AI chat, live terminal
│   ├── sections/            # Stats, About, Skills, Projects, Contact
│   ├── backgrounds/         # Aurora, Starfield
│   ├── layout/              # Header, Footer
│   └── ui/                  # Reveal, Section, MagneticButton
├── content/                 # ← your data
├── providers/               # preferences (theme, recruiter, sound, motion)
└── lib/
```

### The 3D room

Every object is built from primitives in `components/three/objects.tsx` — no GLB
downloads, so the scene is a few KB of code rather than megabytes of assets.
Clicking an object sets a camera view in `DeveloperRoom.tsx` and opens the
matching panel.

| Object | Opens |
| --- | --- |
| Laptop | Projects |
| Monitor | Live terminal |
| Bookshelf | Education timeline |
| Coffee cup | Fun facts |
| Server rack | DevOps skills |
| Robot | AI assistant |
| Window | Live status (time, availability) |
| Whiteboard | Roadmap |

The dock at the bottom mirrors every hotspot in the DOM, so the same content is
reachable by keyboard and screen reader.

---

## Recruiter Mode

The toggle in the header switches to a plain, animation-free document: summary,
skills, projects with highlights, and background — scannable in under a minute.
It also skips the cinematic intro entirely.

`prefers-reduced-motion: reduce` triggers the same suppression automatically.

---

## Easter eggs

- **Konami code** (↑↑↓↓←→←→BA) — unlocks the secret room
- Type **`sudo hire hemant`** anywhere — confetti

---

## API behaviour without keys

Both routes degrade honestly rather than break:

- **`/api/ai`** — with `OPENAI_API_KEY` set, answers via the OpenAI Chat
  Completions API using a system prompt built from your own content. Without a
  key (or if the upstream call fails), it falls back to grounded keyword
  matching over the same data. It never invents employers, dates or metrics.
- **`/api/contact`** — with `RESEND_API_KEY` set, sends via Resend. Without one,
  it validates the input, logs the submission server-side, and tells the sender
  plainly that delivery isn't configured, pointing them at the email address —
  rather than showing a fake success.

---

## Roadmap

Phases 1–4 of the original plan are done. Remaining:

- **Phase 5 — AI & content:** MDX blog, per-project detail pages
  (`/projects/[slug]`), admin dashboard, message management
- **Phase 6 — Polish & launch:** analytics, sitemap/robots, JSON-LD,
  accessibility audit, tests

Live GitHub stats are done — `/api/github` serves them unauthenticated with a
one-hour revalidate. Deploy is done (Cloudflare Workers, see below).

Parked for later: voice input for the assistant, multi-language support, WebXR
walkthrough.

---

## Deploy

Cloudflare Workers, via the OpenNext adapter. `wrangler.jsonc` targets the
existing `devverse-ai` worker, so a deploy updates it in place rather than
creating a new project.

```bash
npm run cf:build     # build the worker bundle into .open-next/
npm run cf:preview   # build, then run it locally on workerd
npm run cf:deploy    # build and deploy
```

Set any environment variables you're using as worker secrets
(`npx wrangler secret put OPENAI_API_KEY`) — every one is optional, and the
site runs fully without them.
