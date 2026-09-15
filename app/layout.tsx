import type { Metadata } from 'next';
import './globals.css';
import './sections.css';
import './blend.css';

export const metadata: Metadata = {
  title: 'YOSEMITE — Tunnel View in 3D Bayer Dither',
  description: 'Interactive 3D Yosemite valley relief with pixel + Bayer dither post-processing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
