
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server"; // Usaremos el cliente del servidor
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Store, PackageOpen, AlertTriangle } from "lucide-react";
import type { Tables, Database } from "@/lib/supabase/database.types";

// Forzar renderizado dinámico ya que usamos params
export const dynamic = 'force-dynamic';

type ProductWithImageUrl = Tables<'productos'> & {
  imagen_url: string | null;
};

type StoreWithProducts = Tables<'tiendas'> & {
  productos: ProductWithImageUrl[];
};

async function getStoreDetails(storeId: string): Promise<StoreWithProducts | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    console.error("[StoreProfilePage] Failed to create Supabase server client.");
    return null;
  }

  const { data: storeData, error } = await supabase
    .from('tiendas')
    .select(`
      *,
      productos!inner (
        *,
        imagenes_productos (url, es_principal)
      )
    `)
    .eq('id', storeId)
    .eq('estado', 'activa') // Solo mostrar tiendas activas
    .eq('productos.estado', 'activo') // Solo productos activos de la tienda
    .maybeSingle(); // Usamos maybeSingle por si la tienda no existe o no tiene productos activos

  if (error) {
    console.error("[StoreProfilePage] Error fetching store details:", error.message);
    return null;
  }

  if (!storeData) {
    return null;
  }

  // Procesar productos para obtener la imagen principal
  const processedProducts = (storeData.productos || []).map(product => {
    const imagesArray = (product.imagenes_productos || []) as unknown as Tables<'imagenes_productos'>[];
    const principalImage = imagesArray.find(img => img.es_principal === true);
    return {
      ...product,
      imagen_url: principalImage?.url || null,
    };
  });

  return { ...storeData, productos: processedProducts };
}

export default async function StoreProfilePage({ params }: { params: { storeId: string } }) {
  const storeId = params.storeId;
  const store = await getStoreDetails(storeId);

  if (!store) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
        <Card className="w-full max-w-lg text-center shadow-xl">
          <CardHeader>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-3xl font-bold text-destructive">Tienda No Encontrada</CardTitle>
            <CardDescription className="text-muted-foreground pt-2">
              Lo sentimos, no pudimos encontrar la tienda que estás buscando o no está activa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/">Volver a la Página de Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Encabezado de la Tienda */}
      <Card className="mb-12 shadow-lg overflow-hidden">
        <CardHeader className="p-0">
          {store.logo_url ? (
            <div className="relative w-full h-48 md:h-64">
              <Image
                src={store.logo_url}
                alt={`Logo de ${store.nombre}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
                className="bg-muted"
                priority
                data-ai-hint="store banner"
              />
            </div>
          ) : (
            <div className="w-full h-48 md:h-64 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center">
              <Store className="h-24 w-24 text-primary/50" />
            </div>
          )}
          <div className="p-6">
            <CardTitle className="text-3xl md:text-4xl font-bold text-primary mb-2">{store.nombre}</CardTitle>
            <CardDescription className="text-base text-muted-foreground">{store.descripcion || "Esta tienda aún no tiene una descripción detallada."}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 border-t">
           <p className="text-sm text-muted-foreground">
            Miembro desde: {new Date(store.fecha_creacion || Date.now()).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {/* Aquí podrían ir más detalles de contacto si los tuvieras en la tabla tiendas */}
        </CardContent>
      </Card>

      {/* Productos de la Tienda */}
      <section>
        <h2 className="text-2xl md:text-3xl font-semibold text-earthy-green mb-8">Productos de {store.nombre}</h2>
        {store.productos && store.productos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {store.productos.map((product) => (
              <Card key={product.id} className="overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 rounded-lg flex flex-col bg-card transform hover:-translate-y-1">
                <Link href={`/products/${product.id}`} className="block group h-full flex flex-col">
                  <div className="relative w-full aspect-[4/3]">
                    <Image
                      src={product.imagen_url || "https://placehold.co/400x300.png?text=Sin+Imagen"}
                      alt={product.nombre}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      style={{ objectFit: 'cover' }}
                      className="bg-muted group-hover:scale-105 transition-transform duration-300"
                      data-ai-hint="handmade product"
                    />
                  </div>
                  <CardHeader className="p-4 flex-grow">
                    <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors" title={product.nombre}>
                      {product.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="p-4 pt-0 mt-auto flex justify-between items-center">
                    <p className="text-base font-bold text-primary">
                      MXN${typeof product.precio === 'number' ? product.precio.toFixed(2) : 'N/A'}
                    </p>
                    <Button variant="outline" size="sm" className="ml-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-xs px-3 py-1.5 h-auto">
                      Ver Detalles
                    </Button>
                  </CardFooter>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <PackageOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Esta tienda aún no tiene productos activos.</p>
            </CardContent>
          </Card>
        )}
      </section>
      
      {/* Sección de Reseñas (Placeholder) */}
      {/* 
      <section className="mt-16">
        <h2 className="text-2xl md:text-3xl font-semibold text-earthy-green mb-8">Reseñas de la Tienda</h2>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>(Próximamente: Aquí se mostrarán las reseñas de los clientes)</p>
          </CardContent>
        </Card>
      </section>
      */}
    </main>
  );
}
