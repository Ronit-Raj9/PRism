import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitScope — GitHub Profile Intelligence",
  description:
    "Surface a developer's complete public GitHub footprint: external OSS contributions, PRs, code diffs, comments, and issues — all in one unified view.",
};

// Sync-with-localStorage theme script — runs before paint to avoid FOUC.
const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('gitscope-theme');
    var dark = stored === 'dark' || (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full bg-[var(--background)] text-[var(--foreground)] antialiased"
      >
        {children}
      </body>
    </html>
  );
}
