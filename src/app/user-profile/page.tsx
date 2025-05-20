
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
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/lib/supabase/database.types";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
      // Opcional: limpiar el parámetro de la URL 
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
    if (user) { // Solo cargar pedidos si el usuario está disponible
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
  }, [user, toast]); // Dependencia de 'user'

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    router.push('/');
    toast({ title: "Sesión Cerrada", description: "Has cerrado sesión exitosamente." });
    router.refresh();
    setIsLoading(false);
  };

  const getOrderStatusBadgeVariant = (status: Tables<'pedidos'>['estado']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Pagado':
      case 'Enviado':
      case 'Entregado':
        return 'default'; // Verde o color primario por defecto de Badge
      case 'Pendiente':
        return 'secondary'; // Gris o color secundario
      case 'Cancelado':
        return 'destructive'; // Rojo
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

  if (!user) {
    // Esto no debería pasar si la redirección en el primer useEffect funciona, pero es un fallback.
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Debes iniciar sesión para ver esta página.</p>
            <Button onClick={() => router.push('/login?redirect=/user-profile')} className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">Ir a Iniciar Sesión</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {showOrderSuccessMessage && (
        <Alert variant="default" className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/30">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <AlertTitle className="font-semibold text-green-700 dark:text-green-300">¡Pedido Realizado con Éxito!</AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-400">
            Gracias por tu compra. Hemos recibido tu pedido y lo estamos procesando.
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
                {profile?.nombre || user.email}
              </CardTitle>
              {profile?.rol && (
                <CardDescription className="text-muted-foreground pt-1 capitalize">
                  {profile.rol}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-2">
              <h3 className="text-lg font-semibold text-earthy-green">Información de la Cuenta</h3>
              <div className="text-sm text-foreground space-y-1">
                <p><span className="font-medium">Nombre:</span> {profile?.nombre || 'No especificado'}</p>
                <p><span className="font-medium">Email:</span> {user.email}</p>
                {profile?.rol && <p><span className="font-medium">Rol:</span> <span className="capitalize">{profile.rol}</span></p>}
                <p><span className="font-medium">Miembro desde:</span> {new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </CardContent>
             <CardFooter className="border-t p-6 flex justify-end">
               <Button onClick={handleSignOut} variant="destructive" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                 Cerrar Sesión
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-xl">
             <CardHeader>
                <CardTitle className="text-xl text-earthy-green">Acciones Rápidas</CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start text-left h-auto py-3" disabled>
                    <Heart className="mr-3 h-5 w-5 text-primary" />
                    <div>
                    <p className="font-medium">Mis Favoritos</p>
                    <p className="text-xs text-muted-foreground">Productos guardados (Próximamente).</p>
                    </div>
                </Button>
                <Button variant="outline" className="w-full justify-start text-left h-auto py-3" disabled>
                    <HomeIcon className="mr-3 h-5 w-5 text-primary" />
                    <div>
                    <p className="font-medium">Mis Direcciones</p>
                    <p className="text-xs text-muted-foreground">Gestionar direcciones (Próximamente).</p>
                    </div>
                </Button>
                {profile?.rol === "artesano" && (
                    <Button onClick={() => router.push('/artisan-dashboard')} variant="outline" className="w-full justify-start text-left h-auto py-3 bg-primary/5 border-primary/30 hover:bg-primary/10">
                        <Store className="mr-3 h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium">Panel de Artesano</p>
                            <p className="text-xs text-muted-foreground">Gestionar mi tienda y productos.</p>
                        </div>
                    </Button>
                )}
             </CardContent>
          </Card>
        </section>

        {/* Columna de Historial de Pedidos */}
        <section className="md:col-span-2">
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
                    <AlertTitle>Error</AlertTitle>
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
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className="flex flex-row justify-between items-center p-4 bg-muted/30">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Pedido <span className="text-primary">#{order.id.substring(0, 8)}...</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.formatted_date}
                          </p>
                        </div>
                        <Badge variant={getOrderStatusBadgeVariant(order.estado)} className="capitalize">
                          {order.estado.replace('_', ' ')}
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
                        <Button variant="outline" size="sm" disabled> {/* Placeholder */}
                          Ver Detalles
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

    