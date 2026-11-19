import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Protocol Explorer · Learn how the internet works",
  description:
    "Watch twenty internet protocols run packet by packet — a network map, a sequence diagram and an annotated capture for HTTP, DNS, TCP, TLS, QUIC and more.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9eef7" },
    { media: "(prefers-color-scheme: dark)", color: "#060c18" },
  ],
};

/**
 * Applied before first paint so a dark-theme reload does not flash light.
 * The React state picks the same value up again on mount.
 */
const themeBootstrap = `
try {
  var saved = localStorage.getItem("protocol-explorer-theme");
  var dark = saved ? saved === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
} catch (e) {
  document.documentElement.dataset.theme = "light";
}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,700;0,800;1,800&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
