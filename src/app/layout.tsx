
import type {Metadata} from 'next';
import {Inter as FontSans} from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import Navbar from '@/components/layout/Navbar'; // Importar Navbar

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: 'Arbahua - Conecta con Artesanos',
  description: 'Arbahua: Tu marketplace para descubrir y vender artesanías únicas.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning> {/* Cambiado lang a "es" */}
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <Navbar /> {/* Añadir Navbar aquí */}
        <main className="pt-16"> {/* Añadir padding-top para compensar la altura de la Navbar fija/sticky */}
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}

    