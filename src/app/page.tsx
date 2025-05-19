
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import FeaturedProductsClient from '@/components/home/FeaturedProductsClient';
import FeaturedStoresClient from '@/components/home/FeaturedStoresClient';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-grow">
        {/* Hero Section */}
        <header className="w-full bg-gradient-to-r from-primary/10 via-background to-primary/10 py-16 md:py-24 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary mb-6">
              Bienvenido a Arbahua
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Descubre artesanías únicas hechas con pasión y apoya a talentosos creadores de nuestra comunidad. Explora, inspírate y encuentra piezas que cuentan historias.
            </p>
            {/* Los botones de acción principales ahora están en la Navbar */}
          </div>
        </header>

        {/* Featured Products Section */}
        <section className="w-full py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-semibold mb-10 text-center text-earthy-green">Productos Destacados</h2>
            <FeaturedProductsClient />
          </div>
        </section>

        {/* Featured Artisans/Stores Section */}
        <section className="w-full py-12 md:py-16 bg-secondary/30"> {/* Usando secondary con opacidad para un tono diferente */}
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-semibold mb-10 text-center text-earthy-green">Artesanos Destacados</h2>
            <FeaturedStoresClient />
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full py-10 mt-12 border-t border-border bg-card text-card-foreground">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Arbahua. Todos los derechos reservados.
              <Link href="/contact" className="ml-4 text-primary hover:underline">
                Contacto
              </Link>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
