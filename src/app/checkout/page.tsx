
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Esquema de validación para el formulario de envío
const shippingFormSchema = z.object({
  nombreCompleto: z.string().min(3, { message: "El nombre completo debe tener al menos 3 caracteres." }),
  direccion: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
  ciudad: z.string().min(2, { message: "La ciudad debe tener al menos 2 caracteres." }),
  codigoPostal: z.string().regex(/^\d{5}$/, { message: "Debe ser un código postal mexicano válido de 5 dígitos." }),
  pais: z.string({ required_error: "Por favor, selecciona un país." }).min(1, "Por favor, selecciona un país."),
  telefono: z.string().regex(/^\d{10}$/, { message: "Debe ser un número de teléfono de 10 dígitos." }),
});
type ShippingFormValues = z.infer<typeof shippingFormSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast(); 
  
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = React.useState(true);
  const [cartItems, setCartItems] = React.useState<CartItemForDisplay[]>([]);
  const [isLoadingCart, setIsLoadingCart] = React.useState(true);
  const [errorCart, setErrorCart] = React.useState<string | null>(null);
  const [shippingData, setShippingData] = React.useState<ShippingFormValues | null>(null);
  const [isShippingFormValid, setIsShippingFormValid] = React.useState(false);


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

  React.useEffect(() => {
    if (user && !isLoadingUser) { 
      const fetchCart = async () => {
        setIsLoadingCart(true);
        setErrorCart(null);
        try {
          const items = await getCartItemsAction();
          if (items.length === 0) {
            toast({ title: "Carrito Vacío", description: "No tienes productos para pagar. Serás redirigido.", variant: "default" });
            router.push("/cart"); 
            return;
          }
          setCartItems(items);
        } catch (err: any) {
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

  const handleShippingSubmit = (data: ShippingFormValues) => {
    console.log("Shipping Data Submitted:", data);
    setShippingData(data);
    // Aquí se podría guardar la dirección o pasarla al siguiente paso
    toast({ title: "Información de Envío Guardada", description: "Puedes proceder al pago." });
  };


  if (isLoadingUser || (user && isLoadingCart && cartItems.length === 0 && !errorCart) ) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando información de pago...</p>
      </main>
    );
  }
  
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

  if (!isLoadingCart && cartItems.length === 0) {
     // Esta condición puede que ya no se alcance si fetchCart redirige antes
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
        <section className="lg:col-span-1 lg:order-last">
          <OrderSummary items={cartItems} total={calculateTotal()} />
        </section>

        <section className="lg:col-span-2 space-y-8">
          <ShippingForm 
            onSubmitSuccess={handleShippingSubmit} 
            onValidationChange={setIsShippingFormValid}
          />
          <PaymentSection 
            isShippingComplete={isShippingFormValid} 
            shippingValues={shippingData} 
          />
        </section>
      </div>
    </main>
  );
}

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
        <div className="flex justify-between font-semibold text-lg">
          <span>Total:</span>
          <span>MXN${total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ShippingFormProps {
  onSubmitSuccess: (data: ShippingFormValues) => void;
  onValidationChange: (isValid: boolean) => void;
}

function ShippingForm({ onSubmitSuccess, onValidationChange }: ShippingFormProps) {
  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
    mode: "onChange", // Validar en cada cambio para actualizar el estado del botón de pago
    defaultValues: {
      nombreCompleto: "",
      direccion: "",
      ciudad: "",
      codigoPostal: "",
      pais: "México", // Valor por defecto
      telefono: "",
    },
  });

  React.useEffect(() => {
    onValidationChange(form.formState.isValid);
  }, [form.formState.isValid, onValidationChange]);

  // La función onSubmit ahora solo se llama si el formulario es válido
  const onSubmit = (data: ShippingFormValues) => {
    onSubmitSuccess(data); 
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-earthy-green flex items-center gap-2">
         <Home className="h-5 w-5" /> Información de Envío
        </CardTitle>
        <CardDescription>Ingresa los detalles para la entrega de tu pedido.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombreCompleto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez Rodríguez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección (Calle y Número, Colonia, Referencias)</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Siempre Viva 742, Col. Springfield" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ciudad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input placeholder="Ciudad de México" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codigoPostal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Postal</FormLabel>
                    <FormControl>
                      <Input placeholder="01234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="pais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un país" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="México">México</SelectItem>
                      {/* Añade más países si es necesario */}
                      {/* <SelectItem value="OtroPaís">OtroPaís</SelectItem> */}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono de Contacto (10 dígitos)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="5512345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* El botón de submit para el formulario de envío es opcional aquí, 
                ya que el botón principal de "Finalizar Compra" podría validar y tomar estos datos.
                Por ahora, lo dejamos sin un botón de submit explícito para este sub-formulario.
                La validación 'onChange' y la llamada a onValidationChange informarán al padre.
            */}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

interface PaymentSectionProps {
  isShippingComplete: boolean;
  shippingValues: ShippingFormValues | null;
}

function PaymentSection({ isShippingComplete, shippingValues }: PaymentSectionProps) {
  const [isLoadingPayment, setIsLoadingPayment] = React.useState(false);
  const { toast } = useToast(); // Obtener toast aquí

  const handleSimulatePayment = () => {
    if (!isShippingComplete || !shippingValues) {
      toast({
        title: "Información Incompleta",
        description: "Por favor, completa y valida la información de envío primero.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingPayment(true);
    console.log("Simulating payment with shipping data:", shippingValues);
    toast({
      title: "Procesando Pago (Simulación)",
      description: "La integración real con Stripe se implementará después.",
    });
    setTimeout(() => {
      setIsLoadingPayment(false);
      toast({
        title: "Pago Simulado Exitoso",
        description: "¡Gracias por tu compra (simulada)!",
      });
      // Aquí podrías redirigir, e.g., router.push('/user-profile/orders');
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
            type="button"
            className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3"
            onClick={handleSimulatePayment}
            disabled={isLoadingPayment || !isShippingComplete}
          >
            {isLoadingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Finalizar Compra (Simulación)
          </Button>
      </CardContent>
    </Card>
  );
}
      
    