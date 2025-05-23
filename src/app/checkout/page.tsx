
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation"; // Asegúrate que useSearchParams esté aquí si lo usas
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
import { 
  Loader2, 
  ShoppingCart, 
  ShieldCheck, 
  CreditCard, 
  ChevronLeft, 
  Home as HomeIcon,
  AlertTriangle // Asegúrate que AlertTriangle esté importado si lo usas
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCartItemsAction, type CartItemForDisplay } from "@/app/actions/cartPageActions";
import { 
  saveShippingAddressAction, 
  createPaymentIntentAction,
  createOrderAction 
} from "@/app/actions/checkoutActions"; 
import { clearCartAction } from "@/app/actions/cartPageActions";

import { 
  useForm, 
  FormProvider, 
  useFormContext, 
  type SubmitHandler 
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form, // Importa Form de react-hook-form o tu alias de ui/form
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from "@/components/ui/form"; // Asegúrate que Form (el alias de FormProvider) esté aquí o FormProvider mismo
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { loadStripe, type Stripe as StripeJS, type StripeCardElement } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

export const shippingFormSchema = z.object({
  nombreCompleto: z.string().min(3, { message: "El nombre completo debe tener al menos 3 caracteres." }),
  direccion: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
  ciudad: z.string().min(2, { message: "La ciudad debe tener al menos 2 caracteres." }),
  estado: z.string().min(2, {message: "El estado debe tener al menos 2 caracteres."}),
  codigoPostal: z.string()
    .trim() // Aplicar trim antes de regex
    .regex(/^\d{5}$/, { message: "Debe ser un código postal mexicano válido de 5 dígitos." }),
  pais: z.string({ required_error: "Por favor, selecciona un país." }).min(1, "Por favor, selecciona un país."),
  telefono: z.string()
    .trim() // Aplicar trim antes de regex
    .regex(/^\d{10}$/, { message: "Debe ser un número de teléfono de 10 dígitos." }),
});
export type ShippingFormValues = z.infer<typeof shippingFormSchema>;

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && typeof window !== 'undefined') {
  console.error("CRITICAL: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no está definida. Stripe no funcionará.");
}

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
  const [isShippingFormValidAndSubmitted, setIsShippingFormValidAndSubmitted] = React.useState(false);
  const [isSavingAddress, setIsSavingAddress] = React.useState(false);
  const [savedAddressId, setSavedAddressId] = React.useState<string | null>(null);
  
  const paymentSectionRef = React.useRef<HTMLDivElement>(null); 
  
  const shippingFormMethods = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
    mode: "onChange", 
    defaultValues: {
      nombreCompleto: "",
      direccion: "",
      ciudad: "",
      estado: "", 
      codigoPostal: "",
      pais: "México", 
      telefono: "",
    },
  });

  React.useEffect(() => {
    const fetchUserAndCart = async () => {
      setIsLoadingUser(true);
      setIsLoadingCart(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        toast({ title: "Acceso Denegado", description: "Debes iniciar sesión para proceder al pago.", variant: "destructive" });
        router.push("/login?redirect=/checkout");
        return;
      }
      setUser(session.user);
      setIsLoadingUser(false);

      console.log("[CheckoutPage] Fetching cart items for user:", session.user.id);
      try {
        const items = await getCartItemsAction();
        console.log("[CheckoutPage] Cart items received:", items);
        if (items.length === 0 && typeof window !== 'undefined') {
          toast({ title: "Carrito Vacío", description: "No tienes productos para pagar. Serás redirigido al carrito.", variant: "default" });
          router.push("/cart"); 
          return;
        }
        setCartItems(items);
      } catch (err: any) {
        console.error("[CheckoutPage] Error fetching cart items:", err);
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
    fetchUserAndCart();
  }, [supabase, router, toast]);

  React.useEffect(() => {
    if (isShippingFormValidAndSubmitted && paymentSectionRef.current) {
      paymentSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isShippingFormValidAndSubmitted]);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleShippingSubmitSuccess = async (data: ShippingFormValues) => {
    console.log("[CheckoutPage] Shipping Data Submitted for saving:", data);
    setIsSavingAddress(true);
    try {
      const result = await saveShippingAddressAction(data);
      if (result.success && result.addressId) {
        setShippingData(data); 
        setIsShippingFormValidAndSubmitted(true); 
        setSavedAddressId(result.addressId); 
        toast({ title: "Dirección Guardada", description: result.message });
        console.log("[CheckoutPage] Address saved with ID:", result.addressId);
      } else {
        toast({ title: "Error al Guardar Dirección", description: result.message, variant: "destructive" });
        setIsShippingFormValidAndSubmitted(false); 
      }
    } catch (error: any) {
      console.error("[CheckoutPage] Error calling saveShippingAddressAction:", error);
      toast({ title: "Error Inesperado", description: "No se pudo guardar la dirección de envío.", variant: "destructive"});
      setIsShippingFormValidAndSubmitted(false);
    } finally {
      setIsSavingAddress(false);
    }
  };

  if (isLoadingUser || isLoadingCart) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando información de pago...</p>
      </main>
    );
  }
  
  if (!user) { 
    // Este caso ya se maneja en el useEffect, pero como fallback
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

  if (cartItems.length === 0 && typeof window !== 'undefined' && window.location.pathname === '/checkout') {
    // Este chequeo se maneja en useEffect, pero como fallback
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
        
        <FormProvider {...shippingFormMethods}>
          <section className="lg:col-span-2 space-y-8">
            <ShippingForm 
              onSubmitSuccess={handleShippingSubmitSuccess}
              isSubmittingParent={isSavingAddress} 
            />
            
            {isShippingFormValidAndSubmitted && shippingData && savedAddressId && cartItems.length > 0 && (
              <div ref={paymentSectionRef}> 
                <PaymentSection 
                  isShippingComplete={isShippingFormValidAndSubmitted}
                  shippingValues={shippingData}
                  userEmail={user?.email || 'no-email@example.com'}
                  cartItems={cartItems} 
                  savedAddressId={savedAddressId} 
                  totalAmountInCents={Math.round(calculateTotal() * 100)} 
                />
              </div>
            )}
          </section>
        </FormProvider>
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
            <p className="font-medium text-foreground">MXN\${item.subtotal.toFixed(2)}</p>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between font-semibold text-lg">
          <span>Total ({items.length} {items.length === 1 ? 'artículo' : 'artículos'}):</span>
          <span>MXN\${total.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ShippingFormProps {
  onSubmitSuccess: (data: ShippingFormValues) => void;
  isSubmittingParent: boolean; 
}

function ShippingForm({ onSubmitSuccess, isSubmittingParent }: ShippingFormProps) {
  const form = useFormContext<ShippingFormValues>(); // Usa el contexto del formulario padre

  return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-earthy-green flex items-center gap-2">
          <HomeIcon className="h-5 w-5" /> Información de Envío
          </CardTitle>
          <CardDescription>Ingresa los detalles para la entrega de tu pedido.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={form.handleSubmit(onSubmitSuccess)} className="space-y-4">
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
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Jalisco" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="codigoPostal"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                          <Input placeholder="01234" {...field} type="text" />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
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
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              </div>
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
              <Button 
                type="submit" 
                className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={!form.formState.isValid || form.formState.isSubmitting || isSubmittingParent }
              >
                {form.formState.isSubmitting || isSubmittingParent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar Dirección y Continuar al Pago
              </Button>
            </form>
        </CardContent>
      </Card>
  );
}

interface PaymentSectionProps {
  isShippingComplete: boolean;
  shippingValues: ShippingFormValues; 
  userEmail: string;
  cartItems: CartItemForDisplay[]; 
  savedAddressId: string | null; 
  totalAmountInCents: number;
}

function PaymentSection({ 
  isShippingComplete, 
  shippingValues, 
  userEmail,
  cartItems,
  savedAddressId,
  totalAmountInCents
}: PaymentSectionProps) {
  // const { toast: pageToast } = useToast(); // Renombrar para evitar conflicto si StripePaymentForm usa su propio toast
  
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && typeof window !== 'undefined') {
     console.error("Stripe.js no se ha cargado. Clave publicable podría estar faltando.");
     return (
      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="text-xl text-destructive flex items-center gap-2">
             <AlertTriangle className="h-5 w-5"/> Error de Configuración de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            No se pudo cargar la pasarela de pago. Por favor, contacta a soporte.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="text-xl text-earthy-green flex items-center gap-2">
          <CreditCard className="h-5 w-5"/> Información de Pago
        </CardTitle>
        <CardDescription>
          Ingresa tus datos de pago. Tu información es procesada de forma segura por Stripe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stripePromise ? (
          <Elements stripe={stripePromise}>
            <StripePaymentForm 
                shippingValues={shippingValues} 
                isShippingComplete={isShippingComplete}
                userEmail={userEmail}
                cartItems={cartItems}
                savedAddressId={savedAddressId}
                totalAmountInCents={totalAmountInCents}
            />
          </Elements>
        ) : (
          <p className="text-center text-muted-foreground">Inicializando pasarela de pago...</p>
        )}
      </CardContent>
    </Card>
  );
}

interface StripePaymentFormProps {
  shippingValues: ShippingFormValues;
  isShippingComplete: boolean;
  userEmail: string;
  cartItems: CartItemForDisplay[];
  savedAddressId: string | null;
  totalAmountInCents: number;
}

function StripePaymentForm({ 
  shippingValues, 
  isShippingComplete, 
  userEmail,
  cartItems,
  savedAddressId,
  totalAmountInCents
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast(); // Obtener toast del hook
  const router = useRouter(); 
  const [isLoadingPayment, setIsLoadingPayment] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  
  const shippingFormContext = useFormContext<ShippingFormValues>(); // Acceder al contexto del formulario de envío

  const handleSubmitPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentError(null);

    if (!isShippingComplete || !shippingFormContext.formState.isValid || !savedAddressId) { 
      toast({ title: "Información Incompleta", description: "Completa y guarda tu dirección de envío antes de pagar.", variant: "destructive" });
      return;
    }

    if (!stripe || !elements) {
      setPaymentError("Error al cargar la pasarela de pago. Intenta de nuevo.");
      setIsLoadingPayment(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setPaymentError("Error con el formulario de tarjeta. Intenta de nuevo.");
      setIsLoadingPayment(false);
      return;
    }
    
    setIsLoadingPayment(true);
    console.log("[StripePaymentForm] Iniciando proceso de pago...");

    try {
      const intentResult = await createPaymentIntentAction();

      if (!intentResult.success || !intentResult.clientSecret) {
        setPaymentError(intentResult.error || "No se pudo iniciar el proceso de pago.");
        toast({ title: "Error de Pago", description: intentResult.error || "No se pudo iniciar el proceso de pago.", variant: "destructive" });
        setIsLoadingPayment(false);
        return;
      }
      console.log("[StripePaymentForm] Payment Intent creado. Client Secret:", intentResult.clientSecret);

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        intentResult.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: shippingValues.nombreCompleto ?? '',
              email: userEmail, 
              phone: shippingValues.telefono ?? '',
              address: {
                line1: shippingValues.direccion ?? '',
                city: shippingValues.ciudad ?? '',
                state: shippingValues.estado ?? '', 
                postal_code: shippingValues.codigoPostal ?? '',
                country: shippingValues.pais === "México" ? "MX" : (shippingValues.pais ?? ''), 
              },
            },
          },
        }
      );

      if (stripeError) {
        setPaymentError(stripeError.message || "Ocurrió un error con tu tarjeta.");
        toast({ title: "Error de Pago", description: stripeError.message || "Ocurrió un error con tu tarjeta.", variant: "destructive"});
        setIsLoadingPayment(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        console.log("[StripePaymentForm] ¡Pago exitoso! PaymentIntent ID:", paymentIntent.id);
        
        const orderResult = await createOrderAction(
          cartItems, 
          savedAddressId, 
          paymentIntent.id, 
          paymentIntent.amount 
        );

        if (orderResult.success && orderResult.orderId) {
           toast({
            title: "¡Pedido Creado Exitosamente!",
            description: `Gracias por tu compra. Tu ID de orden es: ${orderResult.orderId}.`,
            duration: 7000,
          });

          const clearCartResult = await clearCartAction();
          if (clearCartResult.success) {
            toast({ title: "Carrito Limpio", description: "Tu carrito ha sido vaciado." });
          } else {
            toast({ title: "Advertencia", description: `La orden se creó, pero no se pudo limpiar el carrito: ${clearCartResult.message}`, variant: "default" });
          }
          router.push('/user-profile?order_success=true'); 
        } else {
          setPaymentError(`El pago fue exitoso, pero hubo un problema al registrar tu orden: ${orderResult.message}. Por favor, contacta a soporte con ID de transacción: ${paymentIntent.id}`);
          toast({ title: "Error Crítico al Registrar Orden", description: `Tu pago fue procesado (${paymentIntent.id}), pero no pudimos registrar tu orden. Contacta a soporte.`, variant: "destructive", duration: 10000 });
        }
      } else {
        const errorMessage = paymentIntent?.last_payment_error?.message || `Estado del pago: ${paymentIntent?.status}. Por favor, intenta de nuevo.`;
        setPaymentError(errorMessage);
        toast({ title: "Estado del Pago Incierto", description: errorMessage, variant: "destructive"});
      }

    } catch (error: any) {
      console.error("[StripePaymentForm] Error inesperado en el proceso de pago:", error);
      setPaymentError("Ocurrió un error inesperado durante el pago.");
      toast({ title: "Error Inesperado", description: "Ocurrió un error inesperado durante el pago.", variant: "destructive" });
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        color: "hsl(var(--foreground))", 
        fontFamily: 'inherit',
        fontSize: "16px",
        "::placeholder": {
          color: "hsl(var(--muted-foreground))"
        }
      },
      invalid: {
        color: "hsl(var(--destructive))",
        iconColor: "hsl(var(--destructive))"
      }
    },
    hidePostalCode: true, 
  };

  return (
    <form onSubmit={handleSubmitPayment} className="space-y-4">
      <Label htmlFor="card-element">Datos de la Tarjeta</Label>
      <div className="p-3 border rounded-md bg-background border-input">
        <CardElement id="card-element" options={cardElementOptions} />
      </div>
      
      {paymentError && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertTriangle className="inline-block mr-2 h-4 w-4" /> {paymentError}
        </div>
      )}

      <Button 
        type="submit"
        className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3"
        disabled={isLoadingPayment || !isShippingComplete || !stripe || !elements || !shippingFormContext.formState.isValid}
      >
        {isLoadingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
        {isLoadingPayment ? 'Procesando Pago...' : 'Finalizar Compra'}
      </Button>
    </form>
  );
}
