
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getFeaturedProductsAction, type ProductForDisplay } from "@/app/actions/homePageActions";
import { Loader2 } from "lucide-react";

export default function FeaturedProductsClient() {
  const [products, setProducts] = React.useState<ProductForDisplay[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadProducts() {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedProducts = await getFeaturedProductsAction();
        setProducts(fetchedProducts);
      } catch (err: any) {
        console.error("Client error fetching products:", err);
        setError(err.message || "No se pudieron cargar los productos destacados.");
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Cargando productos...</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-destructive py-10">{error}</p>;
  }

  if (products.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Pronto encontrarás aquí nuestras creaciones más especiales. ¡Estamos trabajando en ello!</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {products.map((product) => (
        <Card key={product.id} className="overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 rounded-lg flex flex-col bg-card transform hover:-translate-y-1">
          <Link href={`/products/${product.id}`} className="block group h-full flex flex-col">
            <div className="relative w-full h-60 sm:h-64">
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
              <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors" title={product.nombre}>{product.nombre}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                {product.tienda_nombre || 'Artesanía Local'}
              </CardDescription>
            </CardHeader>
            <CardFooter className="p-4 pt-0 mt-auto flex justify-between items-center">
              <p className="text-base font-bold text-primary">${typeof product.precio === 'number' ? product.precio.toFixed(2) : 'N/A'}</p>
              <Button variant="outline" size="sm" className="ml-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-xs px-3 py-1.5 h-auto">
                Ver Detalles
              </Button>
            </CardFooter>
          </Link>
        </Card>
      ))}
    </div>
  );
}
