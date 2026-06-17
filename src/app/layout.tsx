import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Alex_Brush } from "next/font/google";
import "./globals.css";
import { SerwistProvider } from "@serwist/turbopack/react";
import ThemeToggle from "./_components/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const alexBrush = Alex_Brush({
  weight: "400",
  variable: "--font-alex-brush",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s - EventFlow",
    default: "EventFlow - Real-time Session Countdown",
  },
  description: "Dynamic rundown synchronization, pocket prompters, and haptic cues for D-Day event production.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EventFlow",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${alexBrush.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var supportDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var activeTheme = theme || (supportDark ? 'dark' : 'light');
                  if (activeTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased">
        {process.env.NODE_ENV !== "development" ? (
          <SerwistProvider swUrl="/sw.js">
            {children}
          </SerwistProvider>
        ) : (
          children
        )}
        <ThemeToggle />
      </body>
    </html>
  );
}

