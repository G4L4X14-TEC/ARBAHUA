
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getFeaturedStoresAction, type StoreForDisplay } from "@/app/actions/homePageActions";
import { Loader2, ArrowRight } from "lucide-react";

export default function FeaturedStoresClient() {
  const [stores, setStores] = React.useState<StoreForDisplay[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadStores() {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedStores = await getFeaturedStoresAction();
        setStores(fetchedStores);
      } catch (err: any) {
        console.error("Client error fetching stores:", err);
        setError(err.message || "No se pudieron cargar los artesanos destacados.");
      } finally {
        setIsLoading(false);
      }
    }
    loadStores();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Cargando artesanos...</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-destructive py-10">{error}</p>;
  }

  if (stores.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Nuestros artesanos estrella se están preparando. ¡Conócelos pronto!</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
      {stores.map((store) => (
        <Card key={store.id} className="overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 rounded-lg flex flex-col bg-card transform hover:-translate-y-1">
          <Link href={`/store/${store.id}`} className="block group h-full flex flex-col">
            <div className="relative w-full h-48 sm:h-52"> {/* Ajuste de altura para tiendas */}
              <Image
                src={store.logo_url || \`https://placehold.co/400x200.png?text=\${encodeURIComponent(store.nombre)}\`}
                alt={\`Logo de \${store.nombre}\`}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                style={{ objectFit: 'cover' }}
                className="bg-muted group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="artisan store logo"
              />
            </div>
            <CardHeader className="p-4 flex-grow">
              <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors" title={store.nombre}>{store.nombre}</CardTitle>
              {store.descripcion && (
                <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-2"> {/* Limita a 2 líneas la descripción */}
                  {store.descripcion}
                </CardDescription>
              )}
            </CardHeader>
            <CardFooter className="p-4 pt-2 mt-auto">
              <Button variant="link" size="sm" className="p-0 h-auto text-primary group-hover:underline">
                Ver Tienda <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardFooter>
          </Link>
        </Card>
      ))}
    </div>
  );
}
