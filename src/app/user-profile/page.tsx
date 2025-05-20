
"use client"; 

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { 
  UserCircle, 
  Package, 
  ShoppingBag, 
  Heart, 
  LogOut, 
  Home as HomeIcon, 
  Store,
  CheckCircle2,
  ClipboardList,
  Loader2,
  AlertTriangle,
  MapPin,
  Settings,
  KeyRound,
  Edit3,
  PlusCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/lib/supabase/database.types";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getUserOrdersAction, type UserOrderForDisplay } from "@/app/actions/userProfileActions";

export default function UserProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Tables<'usuarios'> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showOrderSuccessMessage, setShowOrderSuccessMessage] = React.useState(false);

  const [orders, setOrders] = React.useState<UserOrderForDisplay[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = React.useState(true);
  const [errorOrders, setErrorOrders] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (searchParams.get("order_success") === "true") {
      setShowOrderSuccessMessage(true);
      // Opcional: limpiar el parámetro de la URL para que el mensaje no reaparezca en cada recarga.
      // router.replace('/user-profile', { scroll: false }); 
    }
  }, [searchParams, router]);

  React.useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        toast({ title: "Acceso Denegado", description: "Debes iniciar sesión para ver tu perfil.", variant: "destructive" });
        router.push("/login?redirect=/user-profile");
        return;
      }
      setUser(authUser);

      const { data: profileData, error: profileError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileError) {
        toast({ title: "Error de Perfil", description: `No se pudo cargar tu perfil: ${profileError.message}`, variant: "destructive" });
        setProfile(null); 
      } else if (!profileData) {
        toast({ title: "Perfil No Encontrado", description: "No se encontraron datos de perfil para tu cuenta.", variant: "destructive" });
        setProfile(null);
      } else {
        setProfile(profileData);
      }
      setIsLoading(false);
    };
    fetchUserData();
  }, [supabase, router, toast]);

  React.useEffect(() => {
    if (user && !isLoading) { 
      const fetchOrders = async () => {
        console.log('[UserProfilePage] Fetching orders for user:', user.id);
        setIsLoadingOrders(true);
        setErrorOrders(null);
        try {
          const userOrders = await getUserOrdersAction();
          console.log('[UserProfilePage] Orders received:', userOrders);
          setOrders(userOrders);
        } catch (err: any) {
          console.error('[UserProfilePage] Error fetching orders:', err);
          setErrorOrders("No se pudieron cargar tus pedidos.");
          toast({ title: "Error al Cargar Pedidos", description: err.message || "Ocurrió un problema inesperado.", variant: "destructive" });
        } finally {
          setIsLoadingOrders(false);
        }
      };
      fetchOrders();
    }
  }, [user, isLoading, toast]); // Dependencia de isLoading también, para asegurar que user y profile estén listos

  const handleSignOut = async () => {
    setIsLoading(true); // O un estado de loading específico para el logout
    await supabase.auth.signOut();
    router.push('/');
    toast({ title: "Sesión Cerrada", description: "Has cerrado sesión exitosamente." });
    router.refresh(); // Importante para que la Navbar y otros componentes se actualicen
    // No es necesario setIsLoading(false) aquí porque la página redirigirá o recargará.
  };

  const getOrderStatusBadgeVariant = (status?: Tables<'pedidos'>['estado'] | null): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return 'outline';
    switch (status) {
      case 'Pagado':
      case 'Enviado':
      case 'Entregado':
        return 'default'; 
      case 'Pendiente':
        return 'secondary'; 
      case 'Cancelado':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando perfil...</p>
      </main>
    );
  }

  if (!user || !profile) {
    // Esta condición ya debería estar cubierta por la redirección en useEffect,
    // pero es un fallback por si el perfil no se carga pero el usuario sí.
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Error al Cargar Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No se pudo cargar la información de tu perfil. Por favor, intenta iniciar sesión de nuevo.</p>
            <Button onClick={() => router.push('/login?redirect=/user-profile')} className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">Ir a Iniciar Sesión</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <TooltipProvider>
      <main className="container mx-auto px-4 py-8">
        {showOrderSuccessMessage && (
          <Alert variant="default" className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/30">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertTitle className="font-semibold text-green-700 dark:text-green-300">¡Pedido Realizado con Éxito!</AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">
              Gracias por tu compra. Hemos recibido tu pedido y lo estamos procesando. Puedes ver los detalles en "Mis Pedidos".
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Columna de Perfil y Acciones */}
          <section className="md:col-span-1 space-y-6">
            <Card className="shadow-xl">
              <CardHeader className="text-center border-b pb-6">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-4">
                  <UserCircle className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold text-primary">
                  {profile.nombre || user.email}
                </CardTitle>
                <CardDescription className="text-muted-foreground pt-1 capitalize">
                  {profile.rol}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-earthy-green mb-2">Información de la Cuenta</h3>
                  <div className="text-sm text-foreground space-y-1">
                    <p><span className="font-medium">Nombre:</span> {profile.nombre || 'No especificado'}</p>
                    <p><span className="font-medium">Email:</span> {user.email}</p>
                    <p><span className="font-medium">Miembro desde:</span> {new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  {/* Placeholder para editar perfil */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full mt-3" disabled>
                        <Edit3 className="mr-2 h-4 w-4" /> Editar Perfil
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Próximamente: Edita tu nombre y otros datos.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                 <div>
                  <h3 className="text-lg font-semibold text-earthy-green mt-4 mb-2">Seguridad</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full" disabled>
                        <KeyRound className="mr-2 h-4 w-4" /> Cambiar Contraseña
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Próximamente: Actualiza tu contraseña.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
              <CardFooter className="border-t p-6 flex justify-end">
                <Button onClick={handleSignOut} variant="destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </CardFooter>
            </Card>

            {profile.rol === "artesano" && (
              <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl text-earthy-green">Panel de Artesano</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/artisan-dashboard')} className="w-full bg-primary/80 hover:bg-primary/90 text-primary-foreground">
                        <Store className="mr-2 h-5 w-5" />
                        Gestionar mi Tienda
                    </Button>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Columna de Historial de Pedidos y Otras Secciones */}
          <section className="md:col-span-2 space-y-6">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-earthy-green flex items-center gap-2">
                  <ClipboardList className="h-6 w-6" />
                  Mis Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingOrders ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-muted-foreground">Cargando pedidos...</p>
                  </div>
                ) : errorOrders ? (
                  <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error al Cargar Pedidos</AlertTitle>
                      <AlertDescription>{errorOrders}</AlertDescription>
                    </Alert>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Aún no tienes pedidos.</p>
                    <Button asChild variant="link" className="mt-2 text-primary">
                      <Link href="/search">¡Empieza a comprar!</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id} className="overflow-hidden border">
                        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-muted/30 gap-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Pedido <span className="text-primary">#{order.id.substring(0, 8).toUpperCase()}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.formatted_date}
                            </p>
                          </div>
                          <Badge variant={getOrderStatusBadgeVariant(order.estado)} className="capitalize text-xs sm:ml-auto">
                            {order.estado?.replace('_', ' ') || 'Desconocido'}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                          <p className="text-sm">
                            <span className="font-medium">Total:</span> MXN${order.total.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground italic">
                            <span className="font-medium not-italic">Contenido:</span> {order.items_summary}
                          </p>
                        </CardContent>
                        <CardFooter className="p-4 border-t">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" disabled> 
                                Ver Detalles
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Próximamente: Ver detalles completos del pedido.</p>
                            </TooltipContent>
                          </Tooltip>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl text-earthy-green flex items-center gap-2"><MapPin className="h-5 w-5" />Mis Direcciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Próximamente: Aquí podrás gestionar tus direcciones de envío guardadas.</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="w-full" disabled>
                      <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva Dirección
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Próximamente: Añade y gestiona tus direcciones.</p>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>

            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl text-earthy-green flex items-center gap-2"><Settings className="h-5 w-5" />Preferencias de la Cuenta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Próximamente: Configura tus notificaciones por correo, suscripciones y otras preferencias.</p>
                {/* Placeholder para opciones de preferencias */}
              </CardContent>
            </Card>
            
          </section>
        </div>
      </main>
    </TooltipProvider>
  );
}
