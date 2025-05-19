
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Tables, Database } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';

// Type for products fetched from Supabase, including nested data
type ProductFromSupabase = Tables<'productos'> & {
  tiendas: Pick<Tables<'tiendas'>, 'nombre'> | null;
  imagenes_productos: Array<{ url: string | null; es_principal: boolean | null }>;
};

// Type for products as they will be used in the component
type ProductForDisplay = Tables<'productos'> & {
  imagen_url: string;
  tienda_nombre: string | null;
};

type StoreForDisplay = Tables<'tiendas'>;

async function getFeaturedProducts(supabase: ReturnType<typeof createServerClient<Database>>): Promise<ProductForDisplay[]> {
  const { data: productsData, error } = await supabase
    .from('productos')
    .select(`
      *,
      tiendas (nombre),
      imagenes_productos (url, es_principal)
    `)
    .eq('estado', 'activo') // Solo productos activos
    .limit(6); // Limitar a 6 productos destacados

  if (error) {
    console.error("Error fetching featured products:", error.message);
    return [];
  }
  if (!productsData) return [];

  return productsData.map((pProduct: ProductFromSupabase) => {
    const { imagenes_productos, tiendas, ...coreProductFields } = pProduct;
    const principalImage = imagenes_productos?.find(img => img.es_principal === true);
    const anyImage = imagenes_productos?.[0];

    return {
      ...coreProductFields,
      imagen_url: principalImage?.url || anyImage?.url || `https://placehold.co/400x300.png?text=${encodeURIComponent(coreProductFields.nombre)}`,
      tienda_nombre: tiendas?.nombre || 'Artesano Independiente',
    };
  });
}

async function getFeaturedStores(supabase: ReturnType<typeof createServerClient<Database>>): Promise<StoreForDisplay[]> {
  const { data: storesData, error } = await supabase
    .from('tiendas')
    .select('*')
    .eq('estado', 'activa') // Solo tiendas activas
    .limit(3); // Limitar a 3 tiendas destacadas

  if (error) {
    console.error("Error fetching featured stores:", error.message);
    return [];
  }
  return storesData || [];
}

export default async function HomePage() {
  const cookieStore = cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // cookieStore.set({ name, value, ...options }); // Comentado para prueba de error de cookies
        },
        remove(name: string, options: CookieOptions) {
          // cookieStore.set({ name, value: '', ...options }); // Comentado para prueba de error de cookies
        },
      },
    }
  );

  const products = await getFeaturedProducts(supabase);
  const stores = await getFeaturedStores(supabase);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-grow">
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
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg flex flex-col bg-card transform hover:-translate-y-1">
                    <Link href={`/products/${product.id}`} className="block group h-full flex flex-col">
                      <div className="relative w-full h-64 sm:h-72">
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
                      <CardHeader className="p-4 flex-grow">
                        <CardTitle className="text-xl font-semibold truncate group-hover:text-primary transition-colors" title={product.nombre}>{product.nombre}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mt-1">
                          {product.tienda_nombre}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="p-4 pt-0 mt-auto">
                        <p className="text-lg font-bold text-primary">${product.precio.toFixed(2)}</p>
                        <Button variant="outline" size="sm" className="ml-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          Ver Detalles
                        </Button>
                      </CardFooter>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-10">Pronto encontrarás aquí nuestras creaciones más especiales. ¡Estamos trabajando en ello!</p>
            )}
          </div>
        </section>

        {/* Featured Artisans/Stores Section */}
        <section className="w-full py-12 md:py-16 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-semibold mb-10 text-center text-earthy-green">Artesanos Destacados</h2>
            {stores.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {stores.map((store) => (
                  <Card key={store.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg flex flex-col bg-card transform hover:-translate-y-1">
                    <Link href={`/store/${store.id}`} className="block group h-full flex flex-col">
                      <div className="relative w-full h-52 sm:h-60">
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
                        <CardTitle className="text-xl font-semibold truncate group-hover:text-primary transition-colors" title={store.nombre}>{store.nombre}</CardTitle>
                        {store.descripcion && (
                          <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-3">
                            {store.descripcion}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardFooter className="p-4 pt-2">
                        <Button variant="link" className="p-0 h-auto text-primary">
                          Ver Tienda <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-10">Nuestros artesanos estrella se están preparando. ¡Conócelos pronto!</p>
            )}
          </div>
        </section>

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

    