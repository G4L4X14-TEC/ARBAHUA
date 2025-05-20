
"use client"; // Necesario para hooks como useRouter y createSupabaseBrowserClient

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation"; // Importar useSearchParams
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { UserCircle, Package, ShoppingBag, Heart, LogOut, Edit3, Home as HomeIcon, Store, CheckCircle2 } from "lucide-react"; // CheckCircle2 añadido
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/lib/supabase/database.types";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Importar Alert

export default function UserProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook para leer query params
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Tables<'usuarios'> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showOrderSuccessMessage, setShowOrderSuccessMessage] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("order_success") === "true") {
      setShowOrderSuccessMessage(true);
      // Opcional: limpiar el parámetro de la URL para que el mensaje no se muestre en recargas
      // router.replace('/user-profile', { scroll: false }); // Descomentar si se desea este comportamiento
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

      console.log("[UserProfilePage] Fetching profile for user ID:", authUser.id);
      const { data: profileData, error: profileError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileError) {
        console.error("[UserProfilePage] Error fetching profile:", profileError);
        toast({ title: "Error de Perfil", description: `No se pudo cargar tu perfil: ${profileError.message}`, variant: "destructive" });
        setProfile(null); 
      } else if (!profileData) {
        console.warn("[UserProfilePage] Profile data not found for user ID:", authUser.id);
        toast({ title: "Perfil No Encontrado", description: "No se encontraron datos de perfil para tu cuenta.", variant: "destructive" });
        setProfile(null);
      } else {
        console.log("[UserProfilePage] Profile data fetched:", profileData);
        setProfile(profileData);
      }
      setIsLoading(false);
    };
    fetchUserData();
  }, [supabase, router, toast]);

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    router.push('/');
    toast({ title: "Sesión Cerrada", description: "Has cerrado sesión exitosamente." });
    router.refresh();
    setIsLoading(false);
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

      <Card className="w-full max-w-2xl mx-auto shadow-xl">
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
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-earthy-green">Información de la Cuenta</h3>
            <div className="text-sm text-foreground space-y-1">
              <p><span className="font-medium">Nombre:</span> {profile?.nombre || 'No especificado'}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              {profile?.rol && <p><span className="font-medium">Rol:</span> <span className="capitalize">{profile.rol}</span></p>}
              <p><span className="font-medium">Miembro desde:</span> {new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-lg font-semibold text-earthy-green mb-2">Mis Pedidos</h3>
             {/* Aquí irá el listado de pedidos */}
             <p className="text-sm text-muted-foreground">Próximamente: Aquí podrás ver tu historial de pedidos.</p>
          </div>

          <div className="space-y-4">
             <h3 className="text-lg font-semibold text-earthy-green mb-2">Acciones Rápidas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t p-6 flex justify-end">
           <Button onClick={handleSignOut} variant="destructive" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
             Cerrar Sesión
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

    