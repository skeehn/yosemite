import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Valley',
  description: 'Living dithered backdrops.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
