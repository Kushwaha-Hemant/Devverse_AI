import type { IconType } from "react-icons";
import {
  SiDocker,
  SiExpress,
  SiFastapi,
  SiFirebase,
  SiGithub,
  SiHtml5,
  SiJavascript,
  SiLangchain,
  SiLanggraph,
  SiMongodb,
  SiMysql,
  SiNextdotjs,
  SiNodedotjs,
  SiOpenjdk,
  SiPostgresql,
  SiPostman,
  SiPython,
  SiReact,
  SiTailwindcss,
  SiTypescript,
} from "react-icons/si";
import {
  LuBinary,
  LuBot,
  LuBoxes,
  LuBrain,
  LuCode,
  LuDatabase,
  LuLayers,
  LuMonitorSmartphone,
  LuNetwork,
  LuSearch,
  LuSparkles,
  LuWebhook,
} from "react-icons/lu";

/**
 * Brand mark for each skill, keyed by the exact `name` in `skills.ts`.
 *
 * `color` is the official brand colour where one exists. Marks that are black
 * in their brand guidelines (Next.js, Express, GitHub) are rendered white so
 * they stay legible on the dark background. Skills with no brand — RAG, OOP,
 * Computer Networks — fall back to a neutral glyph tinted with the ring's
 * accent colour, signalled by `color: null`.
 *
 * OpenAI's mark was removed from Simple Icons over trademark restrictions, so
 * it uses a neutral glyph too rather than a redrawn imitation.
 */
export type SkillIcon = { Icon: IconType; color: string | null };

export const SKILL_ICONS: Record<string, SkillIcon> = {
  // --- Languages ---
  TypeScript: { Icon: SiTypescript, color: "#3178C6" },
  "JavaScript (ES6+)": { Icon: SiJavascript, color: "#F7DF1E" },
  Python: { Icon: SiPython, color: "#3776AB" },
  Java: { Icon: SiOpenjdk, color: "#E76F00" },
  SQL: { Icon: LuDatabase, color: null },

  // --- Frontend ---
  React: { Icon: SiReact, color: "#61DAFB" },
  "Next.js": { Icon: SiNextdotjs, color: "#FFFFFF" },
  "Tailwind CSS": { Icon: SiTailwindcss, color: "#06B6D4" },
  "HTML5 / CSS3": { Icon: SiHtml5, color: "#E34F26" },
  "Responsive Design": { Icon: LuMonitorSmartphone, color: null },

  // --- Backend ---
  "Node.js": { Icon: SiNodedotjs, color: "#5FA04E" },
  "Express.js": { Icon: SiExpress, color: "#FFFFFF" },
  "REST APIs": { Icon: LuWebhook, color: null },
  FastAPI: { Icon: SiFastapi, color: "#009688" },

  // --- Databases ---
  PostgreSQL: { Icon: SiPostgresql, color: "#4169E1" },
  pgvector: { Icon: LuBoxes, color: null },
  MySQL: { Icon: SiMysql, color: "#4479A1" },
  MongoDB: { Icon: SiMongodb, color: "#47A248" },
  "Firebase Realtime DB": { Icon: SiFirebase, color: "#FFCA28" },

  // --- AI & ML ---
  RAG: { Icon: LuSearch, color: null },
  LangChain: { Icon: SiLangchain, color: "#FFFFFF" },
  LangGraph: { Icon: SiLanggraph, color: "#FFFFFF" },
  "OpenAI API": { Icon: LuBrain, color: null },
  "Vector Databases": { Icon: LuBoxes, color: null },
  "Prompt Engineering": { Icon: LuSparkles, color: null },
  "AI Chatbots / NLP": { Icon: LuBot, color: null },

  // --- Tools & Core CS ---
  "Git / GitHub": { Icon: SiGithub, color: "#FFFFFF" },
  Docker: { Icon: SiDocker, color: "#2496ED" },
  Postman: { Icon: SiPostman, color: "#FF6C37" },
  "Data Structures & Algorithms": { Icon: LuBinary, color: null },
  "OOP / DBMS": { Icon: LuLayers, color: null },
  "Computer Networks": { Icon: LuNetwork, color: null },
};

/** Never render a blank planet — unmapped skills get a generic code glyph. */
export const FALLBACK_ICON: SkillIcon = { Icon: LuCode, color: null };

export function getSkillIcon(name: string): SkillIcon {
  return SKILL_ICONS[name] ?? FALLBACK_ICON;
}
