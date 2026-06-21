import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import { JetBrains_Mono } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-inter', weight: ['300', '400', '500', '600', '700'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'FlySmart — Award Flight Intelligence',
  description: 'Find the best strategy to book flights with your points and miles using AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${spaceGrotesk.variable} ${jetbrains.variable} h-full`}>
        <head>
          {/* Prevent flash of wrong theme */}
          <script dangerouslySetInnerHTML={{ __html: `
            (function() {
              var t = localStorage.getItem('theme');
              if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
            })();
          `}} />
        </head>
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
