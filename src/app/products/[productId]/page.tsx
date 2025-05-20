
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server"; 
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { PackageOpen, AlertTriangle, ShoppingCart, Store } from "lucide-react";
import type { Tables } from "@/lib/supabase/database.types";

export const dynamic = 'force-dynamic';

// Tipo para el producto con sus imágenes y tienda
type ProductWithDetails = Tables<'productos'> & {
  imagenes_productos: Array<Pick<Tables<'imagenes_productos'>, 'id' | 'url' | 'es_principal'>>;
  tiendas: Pick<Tables<'tiendas'>, 'id' | 'nombre'> | null;
};

async function getProductDetails(productId: string): Promise<ProductWithDetails | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    console.error("[ProductDetailPage] Failed to create Supabase server client for getProductDetails.");
    return null;
  }

  const { data: productData, error } = await supabase
    .from('productos')
    .select(\`
      *,
      imagenes_productos (id, url, es_principal),
      tiendas (id, nombre)
    \`)
    .eq('id', productId)
    .eq('estado', 'activo') // Solo mostrar productos activos
    .maybeSingle();

  if (error) {
    console.error(\`[ProductDetailPage] Error fetching product details for ID \${productId}:\`, error.message);
    return null;
  }

  return productData as ProductWithDetails | null;
}

export default async function ProductDetailPage({ params }: { params: { productId: string } }) {
  const productId = params.productId;
  const product = await getProductDetails(productId);

  if (!product) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
        <Card className="w-full max-w-lg text-center shadow-xl">
          <CardHeader>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-3xl font-bold text-destructive">Producto No Encontrado</CardTitle>
            <CardDescription className="text-muted-foreground pt-2">
              Lo sentimos, no pudimos encontrar el producto que estás buscando o no está disponible.
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

  const principalImage = product.imagenes_productos?.find(img => img.es_principal === true) || product.imagenes_productos?.[0];
  const placeholderText = encodeURIComponent(product.nombre);
  // Usar una imagen de placeholder más grande para el detalle del producto
  const imageUrl = principalImage?.url || \`https://placehold.co/600x600.png?text=\${placeholderText}\`;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Columna de Imágenes */}
        <div className="space-y-4">
          <Card className="overflow-hidden shadow-lg rounded-lg">
            <div className="relative aspect-square bg-muted"> {/* Added bg-muted for placeholder */}
              <Image
                src={imageUrl}
                alt={product.nombre}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
                className="rounded-lg" // Apply rounding to image if container is rounded
                priority // Prioritize LCP image
                data-ai-hint="product detail photo"
              />
            </div>
          </Card>
          {/* Galería de miniaturas (si hay más de una imagen) */}
          {product.imagenes_productos && product.imagenes_productos.length > 1 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {product.imagenes_productos.map((img) => (
                <Card key={img.id} className="overflow-hidden aspect-square relative border-2 border-transparent hover:border-primary cursor-pointer transition-all bg-muted">
                  <Image
                    src={img.url || \`https://placehold.co/100x100.png?text=Img\`}
                    alt={\`Imagen adicional de \${product.nombre}\`}
                    fill
                    style={{ objectFit: 'cover' }}
                     data-ai-hint="product thumbnail"
                  />
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Columna de Detalles del Producto */}
        <div className="space-y-6">
          <Card className="shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl font-bold text-primary">{product.nombre}</CardTitle>
              {product.tiendas && (
                <Link href={\`/store/\${product.tiendas.id}\`} className="text-md text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 pt-1">
                  <Store size={16} /> {product.tiendas.nombre || 'Artesano Independiente'}
                </Link>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-semibold text-foreground">
                MXN\${typeof product.precio === 'number' ? product.precio.toFixed(2) : 'N/A'}
              </p>
              <div className="prose prose-sm text-muted-foreground max-w-none">
                 <p>{product.descripcion || "Este producto no tiene una descripción detallada."}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                Stock disponible: {product.stock !== null && product.stock !== undefined ? product.stock : 'No especificado'}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button size="lg" className="w-full sm:w-auto flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                <ShoppingCart className="mr-2 h-5 w-5" /> Añadir al Carrito
              </Button>
              {/* <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Añadir a Favoritos (Próximamente)
              </Button> */}
            </CardFooter>
          </Card>

          <Card className="shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl">Detalles Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">(Próximamente: más información sobre materiales, dimensiones, etc.)</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
