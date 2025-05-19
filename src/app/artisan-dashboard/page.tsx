
"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Unused but good to keep for future form enhancements
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Store as StoreIcon, Edit3, PlusCircle, LogOut } from "lucide-react";

// Schema for creating/editing a store
const storeFormSchema = z.object({
  nombre: z.string().min(3, { message: "El nombre de la tienda debe tener al menos 3 caracteres." }).max(100, { message: "El nombre de la tienda no puede exceder los 100 caracteres." }),
  descripcion: z.string().max(500, { message: "La descripción no puede exceder los 500 caracteres." }).optional().nullable(),
  // logo_file: z.instanceof(File).optional(), // For later: logo upload
});
type StoreFormValues = z.infer<typeof storeFormSchema>;

export default function ArtisanDashboardPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [artisanProfile, setArtisanProfile] = useState<Tables<'usuarios'> | null>(null);
  const [store, setStore] = useState<Tables<'tiendas'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStoreLoading, setIsStoreLoading] = useState(true);
  const [showCreateEditStoreForm, setShowCreateEditStoreForm] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        toast({ title: "Acceso Denegado", description: "Debes iniciar sesión para acceder a esta página.", variant: "destructive" });
        router.push("/login");
        return;
      }
      setUser(authUser);

      const { data: profileData, error: profileError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileError || !profileData) {
        toast({ title: "Error de Perfil", description: "No se pudo cargar tu perfil de artesano. Intenta iniciar sesión de nuevo.", variant: "destructive" });
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      if (profileData.rol !== "artesano") {
        toast({ title: "Acceso Denegado", description: "Esta página es solo para artesanos.", variant: "destructive" });
        router.push("/");
        return;
      }
      setArtisanProfile(profileData);
      setIsLoading(false);
    };
    fetchUserData();
  }, [supabase, router, toast]);

  const fetchStore = useCallback(async () => {
    if (!artisanProfile) return;
    setIsStoreLoading(true);
    const { data: storeData, error: storeError } = await supabase
      .from("tiendas")
      .select("*")
      .eq("artesano_id", artisanProfile.id)
      .maybeSingle();

    if (storeError) {
      toast({ title: "Error al Cargar Tienda", description: storeError.message, variant: "destructive" });
      setStore(null);
    } else {
      setStore(storeData);
      if (!storeData) {
        setShowCreateEditStoreForm(true);
      } else {
        setShowCreateEditStoreForm(false);
      }
    }
    setIsStoreLoading(false);
  }, [supabase, artisanProfile, toast]);

  useEffect(() => {
    if (artisanProfile) {
      fetchStore();
    }
  }, [artisanProfile, fetchStore]);

  const handleStoreCreatedOrUpdated = (updatedStore: Tables<'tiendas'>) => {
    setStore(updatedStore);
    setShowCreateEditStoreForm(false);
    toast({ title: store ? "Tienda Actualizada" : "Tienda Creada", description: `Tu tienda "${updatedStore.nombre}" ha sido ${store ? 'actualizada' : 'creada'} con éxito.` });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    toast({ title: "Sesión Cerrada", description: "Has cerrado sesión exitosamente." });
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando panel de artesano...</p>
      </main>
    );
  }

  if (!user || !artisanProfile || artisanProfile.rol !== 'artesano') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No tienes permiso para ver esta página o no has iniciado sesión como artesano.</p>
            <Button onClick={() => router.push('/login')} className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">Ir a Iniciar Sesión</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-background">
      <div className="w-full max-w-4xl space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-b">
          <div>
            <h1 className="text-3xl font-bold text-primary">Panel de Artesano</h1>
            <p className="text-muted-foreground">Bienvenido, {artisanProfile.nombre}. Gestiona tu tienda y productos.</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </header>

        {isStoreLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Cargando información de la tienda...</p>
          </div>
        ) : showCreateEditStoreForm || !store ? (
          <CreateEditStoreForm
            artisanId={artisanProfile.id}
            existingStore={store}
            onSuccess={handleStoreCreatedOrUpdated}
            onCancel={() => store && setShowCreateEditStoreForm(false)}
          />
        ) : (
          <StoreDisplay
            store={store}
            onEditStore={() => setShowCreateEditStoreForm(true)}
          />
        )}

        {store && !showCreateEditStoreForm && (
          <ProductManagement storeId={store.id} />
        )}
      </div>
    </main>
  );
}

interface CreateEditStoreFormProps {
  artisanId: string;
  existingStore: Tables<'tiendas'> | null;
  onSuccess: (store: Tables<'tiendas'>) => void;
  onCancel?: () => void;
}

function CreateEditStoreForm({ artisanId, existingStore, onSuccess, onCancel }: CreateEditStoreFormProps) {
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      nombre: existingStore?.nombre || "",
      descripcion: existingStore?.descripcion || "",
    },
  });

  async function onSubmit(values: StoreFormValues) {
    setIsSubmitting(true);
    try {
      let resultStore: Tables<'tiendas'> | null = null;
      const storePayload = {
        nombre: values.nombre,
        descripcion: values.descripcion || null,
        // updated_at is handled by trigger
      };

      if (existingStore) {
        const { data, error } = await supabase
          .from("tiendas")
          .update(storePayload)
          .eq("id", existingStore.id)
          .eq("artesano_id", artisanId)
          .select()
          .single();
        if (error) throw error;
        resultStore = data;
      } else {
        const insertPayload: TablesInsert<'tiendas'> = {
            ...storePayload,
            artesano_id: artisanId,
            estado: 'activa', // Default state
        };
        const { data, error } = await supabase
          .from("tiendas")
          .insert(insertPayload)
          .select()
          .single();
        if (error) throw error;
        resultStore = data;
      }
      if (resultStore) {
        onSuccess(resultStore);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: `Error al ${existingStore ? 'actualizar' : 'crear'} la tienda`,
        description: error.message || "Ocurrió un problema. Inténtalo de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full shadow-lg border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl text-primary flex items-center gap-2">
          <StoreIcon className="h-6 w-6" />
          {existingStore ? "Editar Tu Tienda" : "Crea Tu Tienda en Arbahua"}
        </CardTitle>
        <CardDescription>
          {existingStore ? "Actualiza los detalles de tu tienda." : "Define el nombre y la descripción de tu espacio para vender tus artesanías."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Tienda</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: El Rincón Creativo de Ana" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de la Tienda</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Cuenta un poco sobre tu tienda, qué tipo de artesanías ofreces, tu inspiración..." {...field} value={field.value ?? ''} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Logo upload will be added later */}
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              {existingStore && onCancel && (
                 <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                 </Button>
              )}
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : existingStore ? <Edit3 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" /> }
                {isSubmitting ? (existingStore ? "Actualizando..." : "Creando Tienda...") : (existingStore ? "Guardar Cambios" : "Crear Tienda")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

interface StoreDisplayProps {
  store: Tables<'tiendas'>;
  onEditStore: () => void;
}

function StoreDisplay({ store, onEditStore }: StoreDisplayProps) {
  return (
    <Card className="w-full shadow-lg border-primary/20">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <CardTitle className="text-2xl text-primary flex items-center gap-2">
            <StoreIcon className="h-6 w-6" />
            {store.nombre}
          </CardTitle>
          <CardDescription>{store.descripcion || "Esta tienda aún no tiene una descripción."}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onEditStore} className="ml-auto">
          <Edit3 className="mr-2 h-4 w-4" />
          Editar Tienda
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* TODO: Display store logo if exists */}
         <img
            data-ai-hint="crafts store logo"
            src={store.logo_url || "https://placehold.co/300x200.png"}
            alt={`Logo de ${store.nombre}`}
            className="rounded-md object-cover h-40 w-full sm:w-auto sm:h-32 aspect-video mb-4 border"
          />
        <p className="text-sm text-muted-foreground">
            Creada el: {new Date(store.fecha_creacion || Date.now()).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-sm ">
            Estado: <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${store.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{store.estado}</span>
        </p>
        <Button asChild variant="link" className="p-0 h-auto text-primary">
            <Link href={`/artisan-profile/${store.artesano_id}`}>Ver Perfil Público de la Tienda (Próximamente)</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface ProductManagementProps {
  storeId: string;
}
function ProductManagement({ storeId }: ProductManagementProps) {
  // TODO: Implement product listing, creation, editing functionality
  return (
    <Card className="w-full shadow-lg mt-8 border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Gestión de Productos</CardTitle>
        <CardDescription>Aquí podrás añadir, editar y ver los productos de tu tienda.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">La funcionalidad para gestionar tus productos estará disponible aquí próximamente.</p>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Nuevo Producto (Próximamente)
          </Button>
        </div>
        {/* Placeholder for product list and creation form trigger */}
      </CardContent>
    </Card>
  );
}

    