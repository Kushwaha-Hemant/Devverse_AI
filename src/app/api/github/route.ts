import { NextResponse } from "next/server";
import { profile } from "@/content/profile";

export const runtime = "nodejs";
// Cache for an hour — unauthenticated GitHub allows 60 requests/hour per IP,
// so this keeps a busy page far below the limit.
export const revalidate = 3600;

type Repo = {
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  fork: boolean;
  updated_at: string;
};

export type GitHubStats = {
  username: string;
  url: string;
  followers: number;
  publicRepos: number;
  totalStars: number;
  languages: string[];
  topRepos: {
    name: string;
    url: string;
    description: string | null;
    stars: number;
    language: string | null;
  }[];
};

function headers() {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    // GitHub rejects requests without a User-Agent.
    "User-Agent": "devverse-portfolio",
  };
  // Optional — raises the rate limit from 60/hr to 5000/hr.
  if (process.env.GITHUB_TOKEN)
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

export async function GET() {
  const username = profile.githubUsername;

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, {
        headers: headers(),
        next: { revalidate },
      }),
      fetch(
        `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
        { headers: headers(), next: { revalidate } },
      ),
    ]);

    if (!userRes.ok) {
      return NextResponse.json(
        { error: `GitHub returned ${userRes.status}.` },
        { status: 502 },
      );
    }

    const user = (await userRes.json()) as {
      followers?: number;
      public_repos?: number;
      html_url?: string;
    };

    // A failed repo list shouldn't sink the whole panel — degrade to profile
    // counts only.
    const repos: Repo[] = reposRes.ok ? await reposRes.json() : [];
    const owned = repos.filter((r) => !r.fork);

    const stats: GitHubStats = {
      username,
      url: user.html_url ?? `https://github.com/${username}`,
      followers: user.followers ?? 0,
      publicRepos: user.public_repos ?? owned.length,
      totalStars: owned.reduce((n, r) => n + (r.stargazers_count ?? 0), 0),
      languages: [
        ...new Set(
          owned.map((r) => r.language).filter((l): l is string => !!l),
        ),
      ].slice(0, 8),
      topRepos: owned
        .sort(
          (a, b) =>
            b.stargazers_count - a.stargazers_count ||
            Date.parse(b.updated_at) - Date.parse(a.updated_at),
        )
        .slice(0, 5)
        .map((r) => ({
          name: r.name,
          url: r.html_url,
          description: r.description,
          stars: r.stargazers_count,
          language: r.language,
        })),
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error("[github] Fetch failed:", err);
    return NextResponse.json(
      { error: "Couldn't reach GitHub." },
      { status: 502 },
    );
  }
}
