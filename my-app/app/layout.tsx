import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UpdateChecker } from "./_components/update-checker";

// Applies a persisted theme choice before first paint — avoids a flash of
// the wrong theme that would happen if this ran as a regular React effect
// (which only runs after hydration). No-ops (keeps following the system
// `prefers-color-scheme`) when nothing has been explicitly chosen yet.
const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem("reviewme-theme");
  if (t === "light" || t === "dark") {
    document.documentElement.setAttribute("data-theme", t);
  }
} catch (e) {}
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReviewMe",
  description: "Turn your exam materials into reviewable quizzes.",
};

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
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
        <UpdateChecker />
      </body>
    </html>
  );
}
