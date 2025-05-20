
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
import { Loader2, ShoppingCart, ShieldCheck, CreditCard, ChevronLeft, Home as HomeIcon } from "lucide-react"; // Renombrado Home a HomeIcon
import { useToast } from "@/hooks/use-toast";
import { getCartItemsAction, type CartItemForDisplay } from "@/app/actions/cartPageActions";
import { saveShippingAddressAction } from "@/app/actions/checkoutActions"; 
import { useForm, FormProvider } from "react-hook-form"; // Añadido FormProvider
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
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

import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Esquema de validación para el formulario de envío
const shippingFormSchema = z.object({
  nombreCompleto: z.string().min(3, { message: "El nombre completo debe tener al menos 3 caracteres." }),
  direccion: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
  ciudad: z.string().min(2, { message: "La ciudad debe tener al menos 2 caracteres." }),
  estado: z.string().min(2, {message: "El estado debe tener al menos 2 caracteres."}), // Campo estado añadido al schema
  codigoPostal: z.string().regex(/^\d{5}$/, { message: "Debe ser un código postal mexicano válido de 5 dígitos." }),
  pais: z.string({ required_error: "Por favor, selecciona un país." }).min(1, "Por favor, selecciona un país."),
  telefono: z.string().regex(/^\d{10}$/, { message: "Debe ser un número de teléfono de 10 dígitos." }),
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

  React.useEffect(() => {
    if (isShippingFormValidAndSubmitted && paymentSectionRef.current) {
      paymentSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isShippingFormValidAndSubmitted]);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleShippingSubmitSuccess = async (data: ShippingFormValues) => {
    console.log("[CheckoutPage] Shipping Data Submitted:", data);
    setIsSavingAddress(true);
    try {
      const result = await saveShippingAddressAction(data);
      if (result.success && result.addressId) {
        setShippingData(data);
        setIsShippingFormValidAndSubmitted(true); 
        setSavedAddressId(result.addressId);
        toast({ title: "Información de Envío Guardada", description: "Puedes proceder al pago." });
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
            onSubmitSuccess={handleShippingSubmitSuccess}
            isSubmittingParent={isSavingAddress} 
          />
          
          {isShippingFormValidAndSubmitted && shippingData && (
            <div ref={paymentSectionRef}> 
              <PaymentSection 
                isShippingComplete={isShippingFormValidAndSubmitted} 
                shippingValues={shippingData} 
              />
            </div>
          )}
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
  isSubmittingParent: boolean; 
}

function ShippingForm({ onSubmitSuccess, isSubmittingParent }: ShippingFormProps) {
  const shippingForm = useForm<ShippingFormValues>({ // Renombrado para evitar colisión
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

  const processForm = (data: ShippingFormValues) => {
    onSubmitSuccess(data); 
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl text-earthy-green flex items-center gap-2">
         <HomeIcon className="h-5 w-5" /> Información de Envío
        </CardTitle>
        <CardDescription>Ingresa los detalles para la entrega de tu pedido.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...shippingForm}> 
          <form onSubmit={shippingForm.handleSubmit(processForm)} className="space-y-4">
            <FormField
              control={shippingForm.control}
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
              control={shippingForm.control}
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
                control={shippingForm.control}
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
                control={shippingForm.control}
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
                control={shippingForm.control}
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
                <FormField
                control={shippingForm.control}
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
                        {/* Aquí puedes añadir más países si es necesario */}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={shippingForm.control}
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
              disabled={!shippingForm.formState.isValid || isSubmittingParent || shippingForm.formState.isSubmitting}
            >
              {isSubmittingParent || shippingForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar Dirección y Continuar al Pago
            </Button>
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
  const { toast } = useToast(); // Obtener toast aquí
  const shippingForm = useFormContext<ShippingFormValues>(); // Obtener el form context de ShippingForm

  if (!stripePromise) {
     return (
      <Card className="shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="text-xl text-destructive flex items-center gap-2">
             Error de Configuración de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            No se pudo cargar la pasarela de pago. Por favor, verifica que la clave publicable de Stripe esté correctamente configurada (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg mt-8"> {/* Añadido mt-8 para separación */}
      <CardHeader>
        <CardTitle className="text-xl text-earthy-green flex items-center gap-2">
          <CreditCard className="h-5 w-5"/> Información de Pago
        </CardTitle>
        <CardDescription>
          {isShippingComplete ? "Ingresa tus datos de pago." : "Completa la información de envío para activar esta sección."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isShippingComplete && shippingValues ? (
          <Elements stripe={stripePromise}>
            <StripePaymentForm shippingValues={shippingValues} />
          </Elements>
        ) : (
          <div className="bg-muted/50 p-6 rounded-md text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
            <p className="text-muted-foreground">
             Completa y guarda tu información de envío para activar el pago.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StripePaymentFormProps {
  shippingValues: ShippingFormValues; // Ahora es requerido
}

function StripePaymentForm({ shippingValues }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoadingPayment, setIsLoadingPayment] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  
  // const shippingForm = useFormContext<ShippingFormValues>(); // No es necesario aquí si no se usa su estado

  const handleSubmitPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentError(null);

    if (!stripe || !elements) {
      console.error("Stripe.js no se ha cargado todavía.");
      setPaymentError("Error al cargar la pasarela de pago. Intenta de nuevo.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      console.error("CardElement no encontrado.");
      setPaymentError("Error con el formulario de tarjeta. Intenta de nuevo.");
      return;
    }

    // No necesitamos validar shippingValues aquí porque isShippingComplete ya lo hizo
    console.log("Simulando proceso de pago con Stripe. Datos de envío:", shippingValues);
    setIsLoadingPayment(true);
    
    // Simulación:
    await new Promise(resolve => setTimeout(resolve, 2000)); 

    const paymentSucceeded = Math.random() > 0.3; 

    if (paymentSucceeded) {
      console.log("Pago (simulado) exitoso!");
      toast({
        title: "Pago Simulado Exitoso",
        description: "¡Gracias por tu compra (simulada)! Tu pedido se está procesando.",
      });
      // Aquí normalmente se crearía la orden en la DB y se redirigiría.
      // router.push('/order-confirmation/SIMULATED_ORDER_ID');
    } else {
      console.error("Pago (simulado) fallido.");
      setPaymentError("El pago fue rechazado. Por favor, verifica los datos de tu tarjeta o intenta con otra.");
      toast({
        title: "Error en el Pago (Simulación)",
        description: "El pago fue rechazado. Por favor, verifica los datos de tu tarjeta.",
        variant: "destructive",
      });
    }
    setIsLoadingPayment(false);
  };

  const cardElementOptions = {
    style: {
      base: {
        color: "#32325d",
        fontFamily: 'Arial, sans-serif',
        fontSmoothing: "antialiased",
        fontSize: "16px",
        "::placeholder": {
          color: "#aab7c4"
        }
      },
      invalid: {
        color: "#fa755a",
        iconColor: "#fa755a"
      }
    }
  };

  return (
    <form onSubmit={handleSubmitPayment} className="space-y-4">
      <Label htmlFor="card-element">Datos de la Tarjeta</Label>
      <div className="p-3 border rounded-md bg-background">
        <CardElement id="card-element" options={cardElementOptions} />
      </div>
      
      {paymentError && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {paymentError}
        </div>
      )}

      <Button 
        type="submit"
        className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3"
        disabled={isLoadingPayment || !stripe || !elements} 
      >
        {isLoadingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
        Finalizar Compra (Simulación)
      </Button>
    </form>
  );
}


    