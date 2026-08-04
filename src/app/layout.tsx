import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

import { PreferencesProvider, bootScript } from "@/providers/preferences";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Cursor } from "@/components/Cursor";
import { profile } from "@/content/profile";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Canonical origin. Must be a domain that actually resolves — it drives
 * `og:url`, `rel="author"` and the absolute URL of the OG image, so a
 * placeholder here silently breaks every LinkedIn/WhatsApp/X link preview.
 * Override with NEXT_PUBLIC_SITE_URL when a custom domain is attached.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://devverse-ai.kushwaha-hemant.workers.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${profile.name} — Full Stack Developer & AI Engineer`,
    template: `%s · ${profile.name}`,
  },
  description: profile.summary,
  keywords: [
    "Hemant Kushwaha",
    "Full Stack Developer",
    "AI Engineer",
    "RAG",
    "LangChain",
    "LangGraph",
    "Next.js",
    "FastAPI",
    "Pune",
    "Portfolio",
  ],
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  openGraph: {
    type: "website",
    url: siteUrl,
    title: `${profile.name} — Full Stack Developer & AI Engineer`,
    description: profile.summary,
    siteName: "DevVerse AI",
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} — Full Stack Developer & AI Engineer`,
    description: profile.summary,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#04050c" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Applies the stored theme before paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full bg-void text-ink">
        <PreferencesProvider>
          <SmoothScroll />
          <Cursor />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:rounded-lg focus:bg-elevated focus:px-4 focus:py-2 focus:text-ink"
          >
            Skip to content
          </a>
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
