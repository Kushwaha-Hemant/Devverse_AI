import { profile } from "@/content/profile";

export function Footer() {
  return (
    <footer className="border-border border-t">
      <div className="text-ink-dim mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-10 text-xs sm:flex-row">
        <p>
          © {new Date().getFullYear()} {profile.name}. Built with Next.js, React
          Three Fiber and too much coffee.
        </p>
        <p className="font-mono tracking-wider">
          <span className="text-cyan">DEVVERSE</span> AI · v1.0
        </p>
      </div>
    </footer>
  );
}
