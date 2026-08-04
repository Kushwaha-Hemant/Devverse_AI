import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";
import { skillGroups } from "@/content/skills";

/**
 * Link-preview card, rendered at build/request time by Next's OG image route.
 *
 * This is what appears when the portfolio is pasted into LinkedIn, WhatsApp,
 * Slack or X — for a job search it's seen far more often than the site itself,
 * so it carries the name, role, contact and headline numbers rather than being
 * a decorative screenshot.
 *
 * Note: Satori (the renderer behind ImageResponse) supports only a subset of
 * CSS — no CSS variables, no Tailwind classes, and every element with multiple
 * children needs an explicit `display: flex`.
 */
export const alt = `${profile.name} — ${profile.roles.join(" · ")}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const totalSkills = skillGroups.reduce((n, g) => n + g.skills.length, 0);

  const stat = (value: string, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 40, fontWeight: 700, color: "#ffffff" }}>
        {value}
      </span>
      <span
        style={{ fontSize: 17, color: "#7f8db0", letterSpacing: 2 }}
      >
        {label}
      </span>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#04050c",
          // Satori has no filter/blur, so the aurora is faked with layered
          // radial gradients — visually equivalent at this size.
          backgroundImage:
            "radial-gradient(900px 500px at 12% 0%, rgba(76,125,255,0.30), transparent 60%), radial-gradient(800px 500px at 95% 100%, rgba(168,85,247,0.28), transparent 60%), radial-gradient(600px 400px at 70% 10%, rgba(34,211,238,0.18), transparent 60%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 66,
              height: 66,
              borderRadius: 20,
              border: "2px solid rgba(34,211,238,0.55)",
              color: "#22d3ee",
              fontSize: 27,
              fontWeight: 700,
            }}
          >
            {profile.logo}
          </div>
          <span style={{ fontSize: 25, color: "#9dabc9", letterSpacing: 5 }}>
            {profile.roles.join("  ·  ").toUpperCase()}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span
            style={{
              fontSize: 96,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {profile.name}
          </span>
          <span
            style={{
              fontSize: 29,
              color: "#9dabc9",
              lineHeight: 1.4,
              maxWidth: 940,
            }}
          >
            {profile.summaryShort}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 64 }}>
            {stat(String(totalSkills), "SKILLS")}
            {stat("5", "PROJECTS")}
            {stat("8.3", "MCA CGPA")}
          </div>
          <span style={{ fontSize: 23, color: "#22d3ee" }}>
            {profile.email}
          </span>
        </div>
      </div>
    ),
    size,
  );
}
