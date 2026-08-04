/**
 * Single source of truth for personal content.
 * Sourced from Hemant Kushwaha's resume (July 2026).
 *
 * Anything still marked TODO needs a value only you can supply.
 */

export const profile = {
  name: "Hemant Kushwaha",
  logo: "HK",
  roles: ["Full Stack Developer", "AI Engineer", "MCA Graduate 2026"],
  tagline: "Welcome to my digital universe.",
  summary:
    "Full Stack Developer and AI Engineer, and a recent MCA graduate, with hands-on experience " +
    "building AI chatbot systems and full-stack web applications. Comfortable across the stack — " +
    "React and Tailwind CSS, Node.js/Express and REST APIs, PostgreSQL, MySQL and MongoDB — and " +
    "experienced with LangChain, LangGraph, RAG, the OpenAI API and vector databases for " +
    "LLM-powered features and conversational AI.",

  /**
   * Phone-sized version. The full summary runs 8 lines on a 390px screen and
   * pushes everything else below the fold — a visitor should get the gist in
   * two lines and scroll for the rest.
   */
  summaryShort:
    "Full Stack Developer and AI Engineer. I build production systems with " +
    "React, Node and FastAPI — and RAG pipelines that actually ship.",

  location: "Pune, India",
  availability: "Open to Full Stack and AI Engineer roles",
  // Deliberately no phone number. Email and the contact form are the only
  // channels published anywhere on this site — the résumé PDF has had the
  // number redacted to match, so there is no back door to it.
  email: "Connect@HemantKushwaha.in",
  resumeUrl: "/resume/hemant-kushwaha-resume.pdf",
  /** Filename the browser saves as, via the anchor's `download` attribute. */
  resumeFilename: "Hemant-Kushwaha-Resume.pdf",

  socials: {
    github: "https://github.com/Kushwaha-Hemant",
    linkedin: "https://www.linkedin.com/in/kushwaha-hemant/",
    website: "https://hemantkushwaha.in",
    x: "",
  },

  /** Handle used for live GitHub data and display. */
  githubUsername: "Kushwaha-Hemant",

  /** Animated counters on the homepage. */
  stats: [
    { label: "Projects Built", value: 5, suffix: "", decimals: 0 },
    { label: "Certifications", value: 7, suffix: "", decimals: 0 },
    { label: "MCA CGPA", value: 8.3, suffix: "", decimals: 1 },
    { label: "Technologies", value: 25, suffix: "+", decimals: 0 },
  ],

  /** Professional experience. */
  experience: [
    {
      company: "CodTech IT Solutions",
      role: "AI & ML Intern",
      location: "Remote",
      period: "Mar 2026 – May 2026",
      bullets: [
        "Built AI chatbot systems in Python, applying core Natural Language Processing concepts to interpret and respond to user queries.",
        "Designed intent-recognition logic to classify incoming user messages and route them to the correct conversational path.",
        "Developed response-generation logic to return relevant, context-aware replies based on the identified user intent.",
      ],
    },
  ],

  /** Formal education. */
  education: [
    {
      institution: "Vishwakarma University",
      qualification: "Master of Computer Applications (MCA)",
      result: "CGPA 8.3",
      location: "Pune, India",
      year: "2026",
    },
    {
      institution: "Indira Gandhi National Open University (IGNOU)",
      qualification: "Bachelor of Arts (BA)",
      result: "51%",
      location: "India",
      year: "2024",
    },
  ],

  /** Certifications, grouped by issuer. */
  certifications: [
    {
      issuer: "Anthropic (Claude)",
      items: [
        "Claude 101",
        "Claude Code 101",
        "Claude Platform 101",
        "Claude Code in Action",
        "Building with Claude API",
        "Fluency Framework & Foundations",
      ],
    },
    {
      issuer: "Google Cloud",
      items: ["Vertex AI"],
    },
  ],

  /** About-section timeline. */
  timeline: [
    {
      year: "2024",
      title: "BA — IGNOU",
      description:
        "Completed a Bachelor of Arts through IGNOU while teaching myself programming on the side.",
    },
    {
      year: "2024",
      title: "Started MCA",
      description:
        "Began the Master of Computer Applications at Vishwakarma University, Pune — DSA, OOP, DBMS and computer networks.",
    },
    {
      year: "2026",
      title: "AI & ML Intern — CodTech IT Solutions",
      description:
        "Built Python chatbot systems end to end: intent recognition, routing and context-aware response generation.",
    },
    {
      year: "2026",
      title: "MCA — CGPA 8.3",
      description:
        "Graduated from Vishwakarma University with a CGPA of 8.3, alongside seven Claude and Google Cloud certifications.",
    },
    {
      year: "2026",
      title: "Shipping RAG systems",
      description:
        "Built RAGForge — a Clerk-authenticated RAG backend on Postgres and pgvector — plus DevFlow, InterviewPilot and ResumePilot.",
    },
    {
      year: "Now",
      title: "Looking for the next role",
      description:
        "Building DevVerse AI and looking for a team where I can own systems end to end.",
    },
  ],

  /** Coffee-cup easter egg content. */
  funFacts: [
    "Seven certifications in, and I still read the changelog before the docs.",
    "I debug faster after the second coffee. The data is unambiguous.",
    "Every project starts as a README before it starts as code.",
    "My favourite part of RAGForge was the retrieval tuning, not the UI.",
  ],
} as const;

export type Profile = typeof profile;
