
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShoppingCart, ShieldCheck, CreditCard, ChevronLeft, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCartItemsAction, type CartItemForDisplay } from "@/app/actions/cartPageActions";

// Placeholder for ShippingFormValues -  we'll define this properly later
type ShippingFormValues = {
  nombreCompleto: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  pais: string;
  telefono: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = React.useState(true);
  const [cartItems, setCartItems] = React.useState<CartItemForDisplay[]>([]);
  const [isLoadingCart, setIsLoadingCart] = React.useState(true);
  const [errorCart, setErrorCart] = React.useState<string | null>(null);

  // 1. Check user authentication
  React.useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingUser(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        toast({ title: "Error de Sesión", description: "No se pudo verificar tu sesión.", variant: "destructive" });
        router.push("/login?redirect=/checkout");
        return;
      }
      if (!session?.user) {
        toast({ title: "Acceso Denegado", description: "Debes iniciar sesión para proceder al pago.", variant: "destructive" });
        router.push("/login?redirect=/checkout");
        return;
      }
      setUser(session.user);
      setIsLoadingUser(false);
    };
    fetchUser();
  }, [supabase, router, toast]);

  // 2. Fetch cart items if user is authenticated
  React.useEffect(() => {
    if (user && !isLoadingUser) { // Fetch cart only after user is confirmed
      const fetchCart = async () => {
        setIsLoadingCart(true);
        setErrorCart(null);
        try {
          console.log("[CheckoutPage] Fetching cart items...");
          const items = await getCartItemsAction();
          console.log("[CheckoutPage] Cart items fetched:", items);
          if (items.length === 0) {
            toast({ title: "Carrito Vacío", description: "No tienes productos en tu carrito para proceder al pago.", variant: "destructive" });
            router.push("/cart"); // Redirect to cart page, which will show the "empty cart" message
            return;
          }
          setCartItems(items);
        } catch (err: any) {
          console.error("[CheckoutPage] Error fetching cart items:", err);
          setErrorCart("No se pudieron cargar los artículos del carrito. Inténtalo de nuevo.");
          toast({
            title: "Error al cargar carrito",
            description: err.message || "Ocurrió un problema inesperado.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingCart(false);
        }
      };
      fetchCart();
    }
  }, [user, isLoadingUser, router, toast]);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleProceedToPayment = async (shippingData: ShippingFormValues) => {
    // Placeholder for actual payment processing
    console.log("Proceeding to payment with shipping data:", shippingData);
    toast({
      title: "Procesando Pago (Simulación)",
      description: "La integración con Stripe se implementará en el siguiente paso.",
    });
    // In a real scenario:
    // 1. Create a Payment Intent on your backend with the total amount.
    // 2. Use Stripe Elements to collect card details and confirm the payment with the Payment Intent client secret.
    // 3. On successful payment, create the order in your database.
    // 4. Redirect to a success page or order confirmation.
  };

  if (isLoadingUser || (user && isLoadingCart && cartItems.length === 0) ) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando información de pago...</p>
      </main>
    );
  }
  
  if (!user) { // Should be caught by useEffect, but as a fallback
    return null; // Or a more specific message, but useEffect handles redirect
  }
  
  if (errorCart) {
    return (
       <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error al Cargar Carrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{errorCart}</p>
            <Button onClick={() => router.push('/cart')} className="mt-4">Volver al Carrito</Button>
          </CardContent>
        </Card>
      </main>
    )
  }


  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/cart" className="inline-flex items-center">
            <ChevronLeft className="mr-2 h-4 w-4" /> Volver al Carrito
          </Link>
        </Button>
      </div>

      <h1 className="text-3xl font-bold text-primary mb-8 text-center">Proceso de Pago</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Columna de Resumen del Pedido */}
        <section className="lg:col-span-1 lg:order-last">
          <OrderSummary items={cartItems} total={calculateTotal()} />
        </section>

        {/* Columna de Envío y Pago */}
        <section className="lg:col-span-2 space-y-8">
          <ShippingForm onSubmit={handleProceedToPayment} />
          <PaymentSection />
        </section>
      </div>
    </main>
  );
}

// --- Componentes Internos (Placeholders o Simplificados) ---

interface OrderSummaryProps {
  items: CartItemForDisplay[];
  total: number;
}

function OrderSummary({ items, total }: OrderSummaryProps) {
  return (
    <Card className="sticky top-24 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-earthy-green">Resumen de tu Pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.productos.id} className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                <Image
                  src={item.imagen_url}
                  alt={item.productos.nombre}
                  fill
                  sizes="40px"
                  style={{ objectFit: "cover" }}
                  data-ai-hint="cart item checkout"
                />
              </div>
              <div>
                <p className="font-medium text-foreground truncate max-w-[150px] sm:max-w-xs" title={item.productos.nombre}>{item.productos.nombre}</p>
                <p className="text-xs text-muted-foreground">Cantidad: {item.cantidad}</p>
              </div>
            </div>
            <p className="font-medium text-foreground">MXN${item.subtotal.toFixed(2)}</p>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between font-semibold text-lg">
          <span>Total:</span>
          <span>MXN${total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ShippingFormProps {
  onSubmit: (data: ShippingFormValues) => void; 
}

function ShippingForm({ onSubmit }: ShippingFormProps) {
  // Placeholder: en un futuro, usar react-hook-form y Zod para validación
  const [formData, setFormData] = React.useState<ShippingFormValues>({
    nombreCompleto: '',
    direccion: '',
    ciudad: '',
    codigoPostal: '',
    pais: 'México', // Default
    telefono: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la validación antes de llamar a onSubmit
    onSubmit(formData);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-earthy-green">Información de Envío</CardTitle>
        <CardDescription>Ingresa los detalles para la entrega de tu pedido.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombreCompleto">Nombre Completo</Label>
            <Input id="nombreCompleto" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="direccion">Dirección (Calle y Número, Colonia)</Label>
            <Input id="direccion" name="direccion" value={formData.direccion} onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input id="ciudad" name="ciudad" value={formData.ciudad} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="codigoPostal">Código Postal</Label>
              <Input id="codigoPostal" name="codigoPostal" value={formData.codigoPostal} onChange={handleChange} required />
            </div>
          </div>
           <div>
            <Label htmlFor="pais">País</Label>
            <Input id="pais" name="pais" value={formData.pais} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono de Contacto</Label>
            <Input id="telefono" name="telefono" type="tel" value={formData.telefono} onChange={handleChange} required />
          </div>
          {/* El botón de pago se moverá a la sección de pago o será un botón general al final */}
        </form>
      </CardContent>
    </Card>
  );
}

function PaymentSection() {
  // El botón "Finalizar Compra" ahora estaría aquí o al final del formulario de envío
  // si queremos un solo botón para todo el proceso antes de ir a Stripe.
  // Por ahora, solo el placeholder.
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-earthy-green flex items-center gap-2">
          <CreditCard className="h-5 w-5"/> Información de Pago
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 p-6 rounded-md text-center">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">
            Aquí se integrarán los elementos seguros de Stripe para ingresar los datos de tu tarjeta.
          </p>
          <p className="text-xs text-muted-foreground mt-2">¡Tu pago será procesado de forma segura!</p>
        </div>
         <Button 
            type="submit" // Este submit debería ser del formulario general de checkout si combinamos
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3"
            // onClick={() => handleProceedToPayment(formData)} // Esta lógica se movería
            // disabled={isLoadingPayment} // Necesitaríamos un estado para esto
          >
            {/* {isLoadingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null} */}
            Finalizar Compra (Simulación)
          </Button>
      </CardContent>
    </Card>
  );
}


    