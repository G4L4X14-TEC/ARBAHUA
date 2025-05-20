
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

// Placeholder para ShippingFormValues -  definiremos esto correctamente después
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

  // 1. Verificar autenticación del usuario
  React.useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingUser(true);
      console.log("[CheckoutPage] Verificando sesión del usuario...");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("[CheckoutPage] Error al obtener sesión:", sessionError.message);
        toast({ title: "Error de Sesión", description: "No se pudo verificar tu sesión.", variant: "destructive" });
        router.push("/login?redirect=/checkout");
        return;
      }
      if (!session?.user) {
        console.log("[CheckoutPage] Usuario no autenticado. Redirigiendo a login.");
        toast({ title: "Acceso Denegado", description: "Debes iniciar sesión para proceder al pago.", variant: "destructive" });
        router.push("/login?redirect=/checkout");
        return;
      }
      console.log("[CheckoutPage] Usuario autenticado:", session.user.id);
      setUser(session.user);
      setIsLoadingUser(false);
    };
    fetchUser();
  }, [supabase, router, toast]);

  // 2. Obtener ítems del carrito si el usuario está autenticado
  React.useEffect(() => {
    if (user && !isLoadingUser) { 
      const fetchCart = async () => {
        setIsLoadingCart(true);
        setErrorCart(null);
        try {
          console.log("[CheckoutPage] Obteniendo ítems del carrito...");
          const items = await getCartItemsAction();
          console.log("[CheckoutPage] Ítems del carrito obtenidos:", items);
          if (items.length === 0) {
            toast({ title: "Carrito Vacío", description: "No tienes productos para pagar. Serás redirigido.", variant: "default" });
            router.push("/cart"); 
            return;
          }
          setCartItems(items);
        } catch (err: any) {
          console.error("[CheckoutPage] Error al obtener ítems del carrito:", err);
          setErrorCart("No se pudieron cargar los artículos del carrito. Inténtalo de nuevo.");
          toast({
            title: "Error al Cargar Carrito",
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

  // Placeholder para la lógica de pago
  const handleProceedToPayment = async (shippingData: ShippingFormValues) => {
    console.log("Procediendo al pago con datos de envío (simulación):", shippingData);
    toast({
      title: "Procesando Pago (Simulación)",
      description: "La integración con Stripe se implementará en el siguiente paso.",
    });
    // Aquí iría la lógica para crear PaymentIntent, confirmar pago con Stripe, crear orden en BD, etc.
  };

  if (isLoadingUser || (user && isLoadingCart && cartItems.length === 0)) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando información de pago...</p>
      </main>
    );
  }
  
  // Este caso debería ser manejado por el useEffect que redirige si no hay usuario
  if (!user) { 
    return null; 
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
    );
  }

  // Este caso debería ser manejado por el useEffect que redirige si el carrito está vacío
  if (!isLoadingCart && cartItems.length === 0) {
    return (
        <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background text-center">
         <Card className="w-full max-w-md">
           <CardHeader>
             <ShoppingCart className="h-12 w-12 mx-auto text-primary mb-4" />
             <CardTitle className="text-2xl">Tu carrito está vacío</CardTitle>
             <CardDescription>Añade algunos productos antes de proceder al pago.</CardDescription>
           </CardHeader>
           <CardContent>
             <Button asChild className="mt-4">
               <Link href="/search">Explorar Productos</Link>
             </Button>
           </CardContent>
         </Card>
       </main>
    );
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

// --- Componentes Internos ---

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
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
                <Image
                  src={item.imagen_url}
                  alt={item.productos.nombre}
                  fill
                  sizes="48px"
                  style={{ objectFit: "cover" }}
                  data-ai-hint="cart item checkout"
                />
              </div>
              <div>
                <p className="font-medium text-foreground truncate max-w-[150px] sm:max-w-[200px]" title={item.productos.nombre}>{item.productos.nombre}</p>
                <p className="text-xs text-muted-foreground">Cantidad: {item.cantidad}</p>
              </div>
            </div>
            <p className="font-medium text-foreground">MXN${item.subtotal.toFixed(2)}</p>
          </div>
        ))}
        <Separator />
        {/* Aquí podrías añadir costos de envío, impuestos, etc. */}
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
  // Placeholder: En un futuro, usar react-hook-form y Zod para validación
  const [formData, setFormData] = React.useState<ShippingFormValues>({
    nombreCompleto: '',
    direccion: '', // Calle, Número, Colonia, etc.
    ciudad: '',
    codigoPostal: '',
    pais: 'México', // Valor por defecto
    telefono: ''
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  // El botón de "Pagar" se moverá a la sección de pago o será un botón general
  // Por ahora, este formulario no tiene un botón de envío propio.
  // La lógica de submit se llamará desde un botón más global en PaymentSection.

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-earthy-green flex items-center gap-2">
         <Home className="h-5 w-5" /> Información de Envío
        </CardTitle>
        <CardDescription>Ingresa los detalles para la entrega de tu pedido.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4"> {/* No necesita onSubmit aquí todavía */}
          <div>
            <Label htmlFor="nombreCompleto">Nombre Completo</Label>
            <Input id="nombreCompleto" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange} required placeholder="Juan Pérez Rodríguez"/>
          </div>
          <div>
            <Label htmlFor="direccion">Dirección (Calle y Número, Colonia, Referencias)</Label>
            <Input id="direccion" name="direccion" value={formData.direccion} onChange={handleChange} required placeholder="Av. Siempre Viva 742, Col. Springfield"/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input id="ciudad" name="ciudad" value={formData.ciudad} onChange={handleChange} required placeholder="Ciudad de México"/>
            </div>
            <div>
              <Label htmlFor="codigoPostal">Código Postal</Label>
              <Input id="codigoPostal" name="codigoPostal" value={formData.codigoPostal} onChange={handleChange} required placeholder="01234"/>
            </div>
          </div>
           <div>
            <Label htmlFor="pais">País</Label>
            <Input id="pais" name="pais" value={formData.pais} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono de Contacto (10 dígitos)</Label>
            <Input id="telefono" name="telefono" type="tel" value={formData.telefono} onChange={handleChange} required placeholder="5512345678"/>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PaymentSection() {
  // El botón "Finalizar Compra" estará aquí.
  // Cuando se integre Stripe, este componente manejará Stripe Elements.
  const [isLoadingPayment, setIsLoadingPayment] = React.useState(false);

  const handleSimulatePayment = () => {
    setIsLoadingPayment(true);
    // Aquí se obtendrían los datos de ShippingForm
    // y se llamaría a la función de pago (que ahora es un placeholder)
    // const shippingData = ... (necesitaríamos una forma de obtener los datos del form de envío)
    // await handleProceedToPayment(shippingData); 
    console.log("Simulando envío de pago...");
    toast({
      title: "Procesando Pago (Simulación)",
      description: "La integración real con Stripe se implementará después.",
    });
    setTimeout(() => {
      setIsLoadingPayment(false);
      // Aquí podría haber una redirección o un mensaje de éxito/error.
    }, 2000);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-earthy-green flex items-center gap-2">
          <CreditCard className="h-5 w-5"/> Información de Pago
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 p-6 rounded-md text-center space-y-3">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
          <p className="text-muted-foreground">
            Aquí se integrarán los elementos seguros de Stripe para ingresar los datos de tu tarjeta.
          </p>
          <p className="text-xs text-muted-foreground">¡Tu pago será procesado de forma segura!</p>
        </div>
         <Button 
            type="button" // Cambiado de submit
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3"
            onClick={handleSimulatePayment}
            disabled={isLoadingPayment}
          >
            {isLoadingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Finalizar Compra (Simulación)
          </Button>
      </CardContent>
    </Card>
  );
}

    