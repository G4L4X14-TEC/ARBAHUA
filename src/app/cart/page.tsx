
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCartItemsAction, type CartItemForDisplay } from "@/app/actions/cartPageActions";

export default function CartPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const [cartItems, setCartItems] = React.useState<CartItemForDisplay[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchCart = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getCartItemsAction();
      setCartItems(items);
    } catch (err: any) {
      console.error("Error fetching cart items:", err);
      setError("No se pudieron cargar los artículos del carrito. Inténtalo de nuevo.");
      toast({
        title: "Error al cargar carrito",
        description: err.message || "Ocurrió un problema inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    const checkUserAndFetchCart = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: "Acceso Denegado", description: "Debes iniciar sesión para ver tu carrito.", variant: "destructive" });
        router.push("/login?redirect=/cart");
        return;
      }
      setUser(session.user);
      fetchCart();
    };
    checkUserAndFetchCart();
  }, [supabase, router, toast, fetchCart]);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleRemoveItem = async (itemId: string) => {
    // Lógica para eliminar item (se implementará después)
    console.log("Eliminar item:", itemId);
    toast({ title: "Función no implementada", description: "La eliminación de productos del carrito se añadirá pronto."});
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    // Lógica para actualizar cantidad (se implementará después)
    if (newQuantity < 1) return; // No permitir cantidad menor a 1
    console.log("Actualizar cantidad:", itemId, newQuantity);
    toast({ title: "Función no implementada", description: "La actualización de cantidades se añadirá pronto."});
  };

  if (isLoading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando tu carrito...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error al Cargar Carrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={fetchCart} className="mt-4">Reintentar</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
        <Card className="w-full max-w-lg text-center shadow-xl">
          <CardHeader>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-primary">Tu Carrito está Vacío</CardTitle>
            <CardDescription className="text-muted-foreground pt-2">
              Parece que aún no has añadido ninguna artesanía.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-foreground mb-6">
              ¡Explora nuestros productos y encuentra algo único!
            </p>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/search">Explorar Productos</Link>
            </Button>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground w-full text-center">
              Arbahua - Conectando con el arte.
            </p>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Columna de Items del Carrito */}
        <div className="lg:w-2/3 space-y-6">
          <h1 className="text-3xl font-bold text-primary mb-6">Tu Carrito de Compras</h1>
          {cartItems.map((item) => (
            <Card key={item.id} className="flex flex-col sm:flex-row gap-4 p-4 shadow-md">
              <div className="relative w-full sm:w-28 h-36 sm:h-28 rounded-md overflow-hidden bg-muted flex-shrink-0">
                <Image
                  src={item.imagen_url}
                  alt={item.productos.nombre}
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="(max-width: 640px) 100vw, 112px"
                  data-ai-hint="cart product image"
                />
              </div>
              <div className="flex-grow flex flex-col justify-between">
                <div>
                  <Link href={`/products/${item.productos.id}`} className="hover:underline">
                    <h2 className="text-lg font-semibold text-foreground">{item.productos.nombre}</h2>
                  </Link>
                  <p className="text-sm text-muted-foreground">Precio unitario: MXN\${(item.productos.precio || 0).toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between mt-2 sm:mt-0">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, item.cantidad - 1)} disabled={item.cantidad <= 1}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm w-8 text-center">{item.cantidad}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleUpdateQuantity(item.id, item.cantidad + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-md font-semibold text-primary">Subtotal: MXN\${item.subtotal.toFixed(2)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 self-start sm:self-center" onClick={() => handleRemoveItem(item.id)}>
                <Trash2 className="h-5 w-5" />
                <span className="sr-only">Eliminar</span>
              </Button>
            </Card>
          ))}
        </div>

        {/* Columna de Resumen del Pedido */}
        <aside className="lg:w-1/3">
          <Card className="sticky top-24 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-earthy-green">Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>MXN\${calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envío Estimado</span>
                <span>Por calcular</span> 
              </div>
              <hr/>
              <div className="flex justify-between text-xl font-bold text-foreground">
                <span>Total Estimado</span>
                <span>MXN\${calculateTotal().toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/checkout">Proceder al Pago <ArrowRight className="ml-2 h-4 w-4"/></Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/search">Seguir Comprando</Link>
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </div>
    </main>
  );
}

    