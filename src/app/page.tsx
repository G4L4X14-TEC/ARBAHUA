
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/database.types';

// Type for products fetched from Supabase, including nested data
type ProductFromSupabase = Tables<'productos'> & {
  tiendas: Pick<Tables<'tiendas'>, 'nombre'> | null; // Store can be null if not found or not joined
  imagenes_productos: Array<{ url: string | null; es_principal: boolean | null }>;
};

// Type for products as they will be used in the component
type ProductForDisplay = Tables<'productos'> & {
  imagen_url: string;
  tiendas: Pick<Tables<'tiendas'>, 'nombre'> | null;
};

type StoreForDisplay = Tables<'tiendas'>;

async function getFeaturedProducts(): Promise<ProductForDisplay[]> {
  const supabase = createSupabaseServerClient();
  const { data: productsData, error } = await supabase
    .from('productos')
    .select(`
      *, 
      tiendas (nombre),
      imagenes_productos (url, es_principal)
    `)
    .eq('estado', 'activo')
    .limit(6);

  if (error) {
    console.error("Error fetching featured products:", error.message);
    return [];
  }
  if (!productsData) return [];

  return productsData.map((pProduct: ProductFromSupabase) => {
    const { imagenes_productos, tiendas, ...coreProductFields } = pProduct;
    const principalImage = imagenes_productos?.find(img => img.es_principal === true);
    const anyImage = imagenes_productos?.[0]; // Fallback to any image if no principal
    
    return {
      ...coreProductFields,
      imagen_url: principalImage?.url || anyImage?.url || `https://placehold.co/400x300.png?text=${encodeURIComponent(coreProductFields.nombre)}`,
      tiendas: tiendas,
    };
  });
}

async function getFeaturedStores(): Promise<StoreForDisplay[]> {
  const supabase = createSupabaseServerClient();
  const { data: storesData, error } = await supabase
    .from('tiendas')
    .select('*')
    .eq('estado', 'activa')
    .limit(3);

  if (error) {
    console.error("Error fetching featured stores:", error.message);
    return [];
  }
  return storesData || [];
}

export default async function HomePage() {
  const products = await getFeaturedProducts();
  const stores = await getFeaturedStores();

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-background text-foreground">
      <header className="w-full max-w-6xl mx-auto py-10 md:py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary mb-4">
          Bienvenido a Arbahua
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Descubre artesanías únicas hechas con pasión y apoya a talentosos creadores de nuestra comunidad.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-shadow">
              <Link href="/register" className="flex items-center justify-center gap-2">
                ¡Únete Ahora!
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/login">
                Iniciar Sesión
              </Link>
            </Button>
          </div>
      </header>

      {/* Featured Products Section */}
      <section className="w-full max-w-6xl mx-auto py-12">
        <h2 className="text-3xl font-semibold mb-8 text-center text-earthy-green">Productos Destacados</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg flex flex-col">
                <Link href={`/products/${product.id}`} className="block group h-full flex flex-col">
                  <div className="relative w-full h-60 sm:h-72">
                    <Image
                      src={product.imagen_url}
                      alt={product.nombre}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                      className="bg-muted group-hover:scale-105 transition-transform duration-300"
                      data-ai-hint="handmade product"
                    />
                  </div>
                  <CardHeader className="p-4">
                    <CardTitle className="text-xl truncate group-hover:text-primary transition-colors" title={product.nombre}>{product.nombre}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {product.tiendas?.nombre || 'Artesano Independiente'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 mt-auto">
                    <p className="text-lg font-semibold text-primary">${product.precio.toFixed(2)}</p>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-10">No hay productos destacados en este momento. ¡Vuelve pronto!</p>
        )}
      </section>

      {/* Featured Artisans/Stores Section */}
      <section className="w-full max-w-6xl mx-auto py-12">
        <h2 className="text-3xl font-semibold mb-8 text-center text-earthy-green">Artesanos Destacados</h2>
         {stores.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {stores.map((store) => (
              <Card key={store.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg flex flex-col">
                <Link href={`/store/${store.id}`} className="block group h-full flex flex-col">
                  <div className="relative w-full h-48 sm:h-56">
                     <Image
                        src={store.logo_url || `https://placehold.co/400x200.png?text=${encodeURIComponent(store.nombre)}`}
                        alt={`Logo de ${store.nombre}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        style={{ objectFit: 'cover' }}
                        className="bg-muted group-hover:scale-105 transition-transform duration-300"
                        data-ai-hint="artisan store logo"
                      />
                  </div>
                  <CardHeader className="p-4 flex-grow">
                    <CardTitle className="text-xl truncate group-hover:text-primary transition-colors" title={store.nombre}>{store.nombre}</CardTitle>
                    {store.descripcion && (
                        <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-3">
                        {store.descripcion}
                        </CardDescription>
                    )}
                  </CardHeader>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
           <p className="text-center text-muted-foreground py-10">Pronto destacaremos a nuestros talentosos artesanos.</p>
        )}
      </section>

      <footer className="w-full max-w-6xl mx-auto py-8 mt-12 border-t border-border">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Arbahua. Todos los derechos reservados.
          <Link href="/contact" className="ml-4 text-primary hover:underline">
            Contacto
          </Link>
        </p>
      </footer>
    </main>
  );
}
