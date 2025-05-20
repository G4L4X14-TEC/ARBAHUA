
"use client"; 

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client"; 
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Loader2, AlertTriangle, ShoppingCart, Store, ChevronLeft, Image as ImageIcon } from "lucide-react";
import type { Tables, Database } from "@/lib/supabase/database.types";
import { useToast } from "@/hooks/use-toast";
import { addProductToCartAction } from "@/app/actions/cartPageActions"; // Importar la Server Action

type ProductWithDetails = Tables<'productos'> & {
  imagenes_productos: Array<Pick<Tables<'imagenes_productos'>, 'id' | 'url' | 'es_principal'>>;
  tiendas: Pick<Tables<'tiendas'>, 'id' | 'nombre'> | null;
};

export default function ProductDetailPage({ params }: { params: { productId: string } }) {
  const productId = params.productId;
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const [product, setProduct] = React.useState<ProductWithDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = React.useState(false);

  React.useEffect(() => {
    const fetchProductDetails = async () => {
      if (!productId) {
        setError("ID de producto no válido.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      console.log(\`[ProductDetailPage] Fetching product details for ID: \${productId}\`);

      const { data: productData, error: productError } = await supabase
        .from('productos')
        .select(\`
          *,
          imagenes_productos (id, url, es_principal),
          tiendas (id, nombre)
        \`)
        .eq('id', productId)
        .eq('estado', 'activo')
        .maybeSingle();

      if (productError) {
        console.error(\`[ProductDetailPage] Error fetching product: \${productId}\`, productError.message);
        setError(productError.message || "Error al cargar el producto.");
        setProduct(null);
      } else if (!productData) {
        console.warn(\`[ProductDetailPage] Product not found or not active: \${productId}\`);
        setError("Producto no encontrado o no disponible.");
        setProduct(null);
      } else {
        console.log(\`[ProductDetailPage] Product data received for \${productId}:\`, productData);
        setProduct(productData as ProductWithDetails);
        const images = (productData.imagenes_productos || []) as Array<Pick<Tables<'imagenes_productos'>, 'id' | 'url' | 'es_principal'>>;
        const principalImage = images.find(img => img.es_principal === true) || images[0];
        setSelectedImageUrl(principalImage?.url || null);
        console.log(\`[ProductDetailPage] Selected image URL for \${productId}:\`, principalImage?.url);
      }
      setIsLoading(false);
    };

    fetchProductDetails();
  }, [productId, supabase]);

  const handleAddToCart = async () => {
    if (!product) return;
    setIsAddingToCart(true);
    console.log(\`[ProductDetailPage] Adding product to cart: \${product.id}\`);
    try {
      const result = await addProductToCartAction(product.id, 1); // Añade 1 unidad
      if (result.success) {
        toast({
          title: "¡Éxito!",
          description: result.message,
        });
        // Opcional: Redirigir al carrito o actualizar un contador de carrito en la Navbar
        // router.push('/cart'); 
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("[ProductDetailPage] Error calling addProductToCartAction:", err);
      toast({
        title: "Error Inesperado",
        description: err.message || "No se pudo añadir el producto al carrito.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCart(false);
    }
  };


  if (isLoading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando producto...</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
        <Card className="w-full max-w-lg text-center shadow-xl">
          <CardHeader>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-3xl font-bold text-destructive">Producto No Encontrado</CardTitle>
            <CardDescription className="text-muted-foreground pt-2">
              {error || "Lo sentimos, no pudimos encontrar el producto que estás buscando o no está disponible."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/" className="inline-flex items-center">
                <ChevronLeft className="mr-2 h-4 w-4" /> Volver a la Página de Inicio
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  
  const allImages = (product.imagenes_productos || [])  as Array<Pick<Tables<'imagenes_productos'>, 'id' | 'url' | 'es_principal'>>;
  const currentImageToDisplay = selectedImageUrl || \`https://placehold.co/600x600.png?text=\${encodeURIComponent(product.nombre)}\`;
  console.log(\`[ProductDetailPage] Rendering with currentImageToDisplay: \${currentImageToDisplay}\`);
  console.log("[ProductDetailPage] All images for gallery:", allImages);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/search" className="inline-flex items-center">
            <ChevronLeft className="mr-2 h-4 w-4" /> Volver a Productos
          </Link>
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Columna de Imágenes */}
        <div className="space-y-4">
          <Card className="overflow-hidden shadow-lg rounded-lg">
            <div className="relative aspect-square bg-muted">
              {currentImageToDisplay.startsWith('https://') ? (
                <Image
                  src={currentImageToDisplay}
                  alt={product.nombre}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  className="rounded-lg"
                  priority
                  data-ai-hint="product detail photo"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                  <ImageIcon className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
            </div>
          </Card>
          {allImages && allImages.length > 1 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {allImages.map((img) => (
                img.url && ( 
                  <Card 
                    key={img.id} 
                    className={\`overflow-hidden aspect-square relative border-2 bg-muted cursor-pointer transition-all \${selectedImageUrl === img.url ? 'border-primary' : 'border-transparent hover:border-primary/50'}\`}
                    onClick={() => setSelectedImageUrl(img.url!)}
                  >
                    <Image
                      src={img.url}
                      alt={\`Miniatura de \${product.nombre}\`}
                      fill
                      sizes="100px"
                      style={{ objectFit: 'cover' }}
                      className="rounded"
                      data-ai-hint="product thumbnail"
                    />
                  </Card>
                )
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
                 <h3 className="text-lg font-semibold text-foreground mb-2">Descripción</h3>
                 <p>{product.descripcion || "Este producto no tiene una descripción detallada."}</p>
              </div>
              <div className="text-sm">
                <span className="font-medium text-foreground">Disponibilidad: </span> 
                <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                  {product.stock > 0 ? \`\${product.stock} en stock\` : 'Agotado'}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <Button 
                size="lg" 
                className="w-full sm:w-auto flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" 
                onClick={handleAddToCart}
                disabled={product.stock === 0 || isAddingToCart}
              >
                {isAddingToCart ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ShoppingCart className="mr-2 h-5 w-5" />
                )}
                {isAddingToCart ? "Añadiendo..." : "Añadir al Carrito"}
              </Button>
            </CardFooter>
          </Card>

          {product.metadatos && typeof product.metadatos === 'object' && Object.keys(product.metadatos).length > 0 && (
            <Card className="shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="text-xl">Información Adicional</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {Object.entries(product.metadatos).map(([key, value]) => (
                    <p key={key} className="text-sm"><strong className="capitalize">{key.replace(/_/g, ' ')}:</strong> {String(value)}</p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
