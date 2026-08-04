/**
 * Skills, grouped exactly as they appear on the resume.
 *
 * `level` is a self-assessment (0-100) driving planet size and the confidence
 * bar — tune these to taste. `usedIn` must reference real project titles from
 * `projects.ts`; it's what stops the list becoming a keyword dump.
 */

export type Skill = {
  name: string;
  level: number;
  usedIn: string[];
};

export type SkillGroup = {
  id: string;
  label: string;
  accent: "cyan" | "purple" | "electric" | "magenta";
  skills: Skill[];
};

export const skillGroups: SkillGroup[] = [
  {
    id: "languages",
    label: "Languages",
    accent: "cyan",
    skills: [
      { name: "TypeScript", level: 88, usedIn: ["RAGForge", "DevFlow"] },
      { name: "JavaScript (ES6+)", level: 88, usedIn: ["DevFlow"] },
      { name: "Python", level: 90, usedIn: ["RAGForge", "ResumePilot"] },
      { name: "Java", level: 80, usedIn: ["Spendee"] },
      { name: "SQL", level: 85, usedIn: ["RAGForge", "DevFlow"] },
    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    accent: "electric",
    skills: [
      { name: "React", level: 90, usedIn: ["RAGForge", "DevFlow"] },
      { name: "Next.js", level: 86, usedIn: ["RAGForge", "InterviewPilot AI"] },
      { name: "Tailwind CSS", level: 90, usedIn: ["RAGForge", "DevFlow"] },
      { name: "HTML5 / CSS3", level: 90, usedIn: ["DevFlow"] },
      { name: "Responsive Design", level: 88, usedIn: ["DevVerse AI"] },
    ],
  },
  {
    id: "backend",
    label: "Backend",
    accent: "purple",
    skills: [
      { name: "Node.js", level: 86, usedIn: ["DevFlow"] },
      { name: "Express.js", level: 85, usedIn: ["DevFlow"] },
      { name: "REST APIs", level: 88, usedIn: ["DevFlow", "Spendee"] },
      { name: "FastAPI", level: 86, usedIn: ["RAGForge", "InterviewPilot AI"] },
    ],
  },
  {
    id: "databases",
    label: "Databases",
    accent: "magenta",
    skills: [
      { name: "PostgreSQL", level: 88, usedIn: ["RAGForge", "DevFlow"] },
      { name: "pgvector", level: 85, usedIn: ["RAGForge"] },
      { name: "MySQL", level: 78, usedIn: [] },
      { name: "MongoDB", level: 76, usedIn: [] },
      { name: "Firebase Realtime DB", level: 82, usedIn: ["Spendee"] },
    ],
  },
  {
    id: "ai",
    label: "AI & ML",
    accent: "cyan",
    skills: [
      { name: "RAG", level: 90, usedIn: ["RAGForge", "ResumePilot"] },
      { name: "LangChain", level: 84, usedIn: ["RAGForge"] },
      { name: "LangGraph", level: 80, usedIn: ["RAGForge"] },
      { name: "OpenAI API", level: 88, usedIn: ["InterviewPilot AI", "ResumePilot"] },
      { name: "Vector Databases", level: 86, usedIn: ["RAGForge", "ResumePilot"] },
      { name: "Prompt Engineering", level: 86, usedIn: ["InterviewPilot AI"] },
      { name: "AI Chatbots / NLP", level: 84, usedIn: ["CodTech internship"] },
    ],
  },
  {
    id: "tools",
    label: "Tools & Core CS",
    accent: "electric",
    skills: [
      { name: "Git / GitHub", level: 88, usedIn: ["DevFlow"] },
      { name: "Docker", level: 84, usedIn: ["DevFlow", "RAGForge"] },
      { name: "Postman", level: 85, usedIn: ["DevFlow"] },
      { name: "Data Structures & Algorithms", level: 85, usedIn: [] },
      { name: "OOP / DBMS", level: 87, usedIn: [] },
      { name: "Computer Networks", level: 80, usedIn: [] },
    ],
  },
];

/** Flattened list used by the orbiting-planets scene. */
export const allSkills = skillGroups.flatMap((g) =>
  g.skills.map((s) => ({ ...s, group: g.label, accent: g.accent })),
);
