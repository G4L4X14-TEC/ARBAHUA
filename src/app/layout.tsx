
import type {Metadata} from 'next';
import {Inter as FontSans} from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import Navbar from '@/components/layout/Navbar';

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: 'Arbahua - Conecta con Artesanos',
  description: 'Arbahua: Tu marketplace para descubrir y vender artesanías únicas.',
  icons: {
    icon: '/favicon.svg', // For modern browsers
    shortcut: '/favicon.svg', // For older browsers
    apple: '/favicon.svg', // For Apple touch icons
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <Navbar />
        <main className="pt-16">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
