
"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Store as StoreIcon, Edit3, PlusCircle, LogOut, Trash2, PackagePlus, List, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog"; // Asegurar que AlertDialogFooter está importado
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Schema for creating/editing a store
const storeFormSchema = z.object({
  nombre: z.string().min(3, { message: "El nombre de la tienda debe tener al menos 3 caracteres." }).max(100, { message: "El nombre de la tienda no puede exceder los 100 caracteres." }),
  descripcion: z.string().max(500, { message: "La descripción no puede exceder los 500 caracteres." }).optional().nullable(),
});
type StoreFormValues = z.infer<typeof storeFormSchema>;

// Schema for creating/editing a product
const productFormSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(255),
  descripcion: z.string().max(1000, "La descripción no puede exceder los 1000 caracteres.").optional().nullable(),
  precio: z.coerce.number().positive("El precio debe ser un número positivo.").min(0.01, "El precio debe ser mayor a 0."),
  stock: z.coerce.number().int().min(0, "El stock no puede ser negativo."),
});
type ProductFormValues = z.infer<typeof productFormSchema>;

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
    toast({ title: store?.id ? "Tienda Actualizada" : "Tienda Creada", description: `Tu tienda "${updatedStore.nombre}" ha sido ${store?.id ? 'actualizada' : 'creada'} con éxito.` });
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
    // Este caso ya debería ser manejado por el useEffect, pero es una salvaguarda.
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
      const storePayload: TablesUpdate<'tiendas'> = { 
        nombre: values.nombre,
        descripcion: values.descripcion || null,
      };

      if (existingStore?.id) { 
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
            estado: 'activa', 
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
        title: `Error al ${existingStore?.id ? 'actualizar' : 'crear'} la tienda`,
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
          {existingStore?.id ? "Editar Tu Tienda" : "Crea Tu Tienda en Arbahua"}
        </CardTitle>
        <CardDescription>
          {existingStore?.id ? "Actualiza los detalles de tu tienda." : "Define el nombre y la descripción de tu espacio para vender tus artesanías."}
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
                  <FormLabel>Descripción de la Tienda (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Cuenta un poco sobre tu tienda, qué tipo de artesanías ofreces, tu inspiración..." {...field} value={field.value ?? ''} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
              {existingStore?.id && onCancel && (
                 <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                 </Button>
              )}
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : existingStore?.id ? <Edit3 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" /> }
                {isSubmitting ? (existingStore?.id ? "Actualizando..." : "Creando Tienda...") : (existingStore?.id ? "Guardar Cambios" : "Crear Tienda")}
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
      </CardContent>
    </Card>
  );
}

interface ProductManagementProps {
  storeId: string;
}
function ProductManagement({ storeId }: ProductManagementProps) {
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const [products, setProducts] = useState<Tables<'productos'>[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Tables<'productos'> | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Tables<'productos'> | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('tienda_id', storeId)
      .order('nombre', { ascending: true });

    if (error) {
      toast({ title: "Error al cargar productos", description: error.message, variant: "destructive" });
      setProducts([]);
    } else {
      setProducts(data || []);
    }
    setIsLoadingProducts(false);
  }, [supabase, storeId, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddNewProduct = () => {
    setEditingProduct(null);
    setIsProductDialogOpen(true);
  };

  const handleEditProduct = (product: Tables<'productos'>) => {
    setEditingProduct(product);
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (product: Tables<'productos'>) => {
    setProductToDelete(product);
    setIsConfirmDeleteDialogOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!productToDelete) return;
    const { error } = await supabase.from('productos').delete().eq('id', productToDelete.id);
    if (error) {
      toast({ title: "Error al eliminar producto", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Producto Eliminado", description: `"${productToDelete.nombre}" ha sido eliminado.` });
      fetchProducts(); 
    }
    setIsConfirmDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const onProductSubmit = async (values: ProductFormValues) => {
    try {
      if (editingProduct) { 
        const { data, error } = await supabase
          .from('productos')
          .update({ ...values, updated_at: new Date().toISOString() } as TablesUpdate<'productos'>) 
          .eq('id', editingProduct.id)
          .select()
          .single();
        if (error) throw error;
        toast({ title: "Producto Actualizado", description: `"${data?.nombre}" ha sido actualizado.`});
      } else { 
        const payload: TablesInsert<'productos'> = {
          ...values,
          tienda_id: storeId,
          estado: 'activo', 
        };
        const { data, error } = await supabase
          .from('productos')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        toast({ title: "Producto Creado", description: `"${data?.nombre}" ha sido añadido a tu tienda.`});
      }
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      fetchProducts(); 
    } catch (error: any) {
      toast({
        title: `Error al ${editingProduct ? 'actualizar' : 'crear'} producto`,
        description: error.message || "Ocurrió un problema.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full shadow-lg mt-8 border-primary/20">
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle className="text-2xl text-primary flex items-center gap-2"><List className="h-6 w-6" />Gestión de Productos</CardTitle>
          <CardDescription>Añade, edita y visualiza los productos de tu tienda.</CardDescription>
        </div>
        <Button onClick={handleAddNewProduct} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <PackagePlus className="mr-2 h-4 w-4" /> Añadir Nuevo Producto
        </Button>
      </CardHeader>
      <CardContent>
        {isLoadingProducts ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Cargando productos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <PackagePlus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="mb-2">Aún no tienes productos en tu tienda.</p>
            <p>¡Empieza añadiendo tu primera creación!</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.nombre}</TableCell>
                  <TableCell className="text-right">${product.precio.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{product.stock}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteProduct(product)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Product Form Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Producto" : "Añadir Nuevo Producto"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Modifica los detalles de tu producto." : "Ingresa la información de tu nueva creación."}
            </DialogDescription>
          </DialogHeader>
          <ProductFormDialog 
            onSubmit={onProductSubmit} 
            existingProduct={editingProduct}
            onClose={() => {
              setIsProductDialogOpen(false);
              setEditingProduct(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el producto
              "{productToDelete?.nombre}" de tu tienda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sí, eliminar producto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface ProductFormDialogProps {
  onSubmit: (values: ProductFormValues) => Promise<void>;
  existingProduct: Tables<'productos'> | null;
  onClose: () => void;
}

function ProductFormDialog({ onSubmit, existingProduct, onClose }: ProductFormDialogProps) {
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      nombre: existingProduct?.nombre || "",
      descripcion: existingProduct?.descripcion || "",
      precio: existingProduct?.precio || 0,
      stock: existingProduct?.stock || 0,
    },
  });

  useEffect(() => {
    form.reset({
      nombre: existingProduct?.nombre || "",
      descripcion: existingProduct?.descripcion || "",
      precio: existingProduct?.precio || 0,
      stock: existingProduct?.stock || 0,
    });
  }, [existingProduct, form]);


  const handleFormSubmit = async (values: ProductFormValues) => {
    setIsSubmittingProduct(true);
    await onSubmit(values);
    setIsSubmittingProduct(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Producto</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Collar de Ámbar" {...field} />
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
              <FormLabel>Descripción (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalles sobre el material, técnica, inspiración..." {...field} value={field.value ?? ''} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="precio"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Precio (MXN)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ej: 250.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Stock Disponible</FormLabel>
                <FormControl>
                  <Input type="number" step="1" placeholder="Ej: 10" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmittingProduct}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmittingProduct}>
            {isSubmittingProduct ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : existingProduct ? <Edit3 className="mr-2 h-4 w-4" /> : <PackagePlus className="mr-2 h-4 w-4" />}
            {isSubmittingProduct ? (existingProduct ? 'Guardando...' : 'Creando...') : (existingProduct ? "Guardar Cambios" : "Crear Producto")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
