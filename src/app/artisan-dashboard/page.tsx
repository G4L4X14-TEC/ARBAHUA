
"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image"; // Import next/image
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Tables, TablesInsert, TablesUpdate, Database, Json } from "@/lib/supabase/database.types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Store as StoreIcon, Edit3, PlusCircle, LogOut, Trash2, PackagePlus, List, AlertTriangle, ImagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Schema for creating/editing a store
const storeFormSchema = z.object({
  nombre: z.string().min(3, { message: "El nombre de la tienda debe tener al menos 3 caracteres." }).max(100, { message: "El nombre de la tienda no puede exceder los 100 caracteres." }),
  descripcion: z.string().max(500, { message: "La descripción no puede exceder los 500 caracteres." }).optional().nullable(),
});
type StoreFormValues = z.infer<typeof storeFormSchema>;

// Schema for creating/editing a product
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const productFormSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(255),
  descripcion: z.string().max(1000, "La descripción no puede exceder los 1000 caracteres.").optional().nullable(),
  precio: z.coerce.number().positive("El precio debe ser un número positivo.").min(0.01, "El precio debe ser mayor a 0."),
  stock: z.coerce.number().int().min(0, "El stock no puede ser negativo."),
  imagenFile: z.custom<FileList>()
    .optional()
    .nullable()
    .refine(
      (files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE,
      `El tamaño máximo de la imagen es 5MB.`
    )
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0].type),
      "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
    ),
});
type ProductFormValues = z.infer<typeof productFormSchema>;

// Custom type for product with its principal image
type ProductWithPrincipalImage = Tables<'productos'> & {
  principal_image_url?: string | null;
};


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
    toast({ title: store?.id ? "Tienda Actualizada" : "Tienda Creada", description: \`Tu tienda "\${updatedStore.nombre}" ha sido \${store?.id ? 'actualizada' : 'creada'} con éxito.\` });
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
        title: \`Error al \${existingStore?.id ? 'actualizar' : 'crear'} la tienda\`,
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
         <Image
            data-ai-hint="crafts store logo"
            src={store.logo_url || "https://placehold.co/300x200.png"}
            alt={\`Logo de \${store.nombre}\`}
            width={300}
            height={200}
            className="rounded-md object-cover h-40 w-full sm:w-auto sm:h-32 aspect-video mb-4 border"
            priority={true} 
          />
        <p className="text-sm text-muted-foreground">
            Creada el: {new Date(store.fecha_creacion || Date.now()).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-sm ">
            Estado: <span className={\`font-semibold px-2 py-0.5 rounded-full text-xs \${store.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}\`}>{store.estado}</span>
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
  const [products, setProducts] = useState<ProductWithPrincipalImage[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithPrincipalImage | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithPrincipalImage | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    const { data: productsData, error } = await supabase
      .from('productos')
      .select('*, imagenes_productos(url, es_principal)')
      .eq('tienda_id', storeId)
      .order('nombre', { ascending: true });

    if (error) {
      toast({ title: "Error al cargar productos", description: error.message, variant: "destructive" });
      setProducts([]);
    } else {
      const productsWithImages = productsData?.map(p => {
        const principalImage = (p.imagenes_productos as unknown as Tables<'imagenes_productos'>[])?.find(img => img.es_principal === true);
        return {
          ...p,
          principal_image_url: principalImage?.url || null
        };
      }) || [];
      setProducts(productsWithImages as ProductWithPrincipalImage[]);
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

  const handleEditProduct = (product: ProductWithPrincipalImage) => {
    setEditingProduct(product);
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (product: ProductWithPrincipalImage) => {
    setProductToDelete(product);
    setIsConfirmDeleteDialogOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!productToDelete) return;
    
    const { data: imagesToDelete, error: imagesError } = await supabase
      .from('imagenes_productos')
      .select('file_path')
      .eq('producto_id', productToDelete.id);

    if (imagesError) {
      toast({ title: "Error al obtener imágenes para eliminar", description: imagesError.message, variant: "destructive" });
    }

    if (imagesToDelete && imagesToDelete.length > 0) {
      const filePaths = imagesToDelete.map(img => img.file_path).filter(path => path !== null) as string[];
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage.from('product-images').remove(filePaths);
        if (storageError) {
          toast({ title: "Error al eliminar imágenes de Storage", description: storageError.message, variant: "destructive" });
        }
      }
      const { error: deleteImageDbError } = await supabase.from('imagenes_productos').delete().eq('producto_id', productToDelete.id);
       if (deleteImageDbError) {
        toast({ title: "Error al eliminar refs de imágenes", description: deleteImageDbError.message, variant: "destructive" });
      }
    }
    
    const { error: deleteProductError } = await supabase.from('productos').delete().eq('id', productToDelete.id);
    if (deleteProductError) {
      toast({ title: "Error al eliminar producto", description: deleteProductError.message, variant: "destructive" });
    } else {
      toast({ title: "Producto Eliminado", description: \`"\${productToDelete.nombre}" ha sido eliminado.\` });
      fetchProducts(); 
    }
    setIsConfirmDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const onProductSubmit = async (values: ProductFormValues) => {
    let productId = editingProduct?.id;
    let productUpdated = false;

    try {
      const productPayload: Omit<TablesInsert<'productos'>, 'id' | 'tienda_id' | 'fecha_creacion' | 'updated_at'> & { tienda_id: string; estado: Database["public"]["Enums"]["estado_producto_type"] } = {
        nombre: values.nombre,
        descripcion: values.descripcion,
        precio: values.precio,
        stock: values.stock,
        tienda_id: storeId,
        estado: 'activo' as Database["public"]["Enums"]["estado_producto_type"],
        metadatos: null 
      };

      if (editingProduct) {
        const { data, error } = await supabase
          .from('productos')
          .update(productPayload as TablesUpdate<'productos'>)
          .eq('id', editingProduct.id)
          .select()
          .single();
        if (error) throw error;
        productId = data?.id;
        toast({ title: "Producto Actualizado", description: \`"\${data?.nombre}" ha sido actualizado.\` });
        productUpdated = true;
      } else {
        const { data, error } = await supabase
          .from('productos')
          .insert(productPayload as TablesInsert<'productos'>)
          .select()
          .single();
        if (error) throw error;
        productId = data?.id;
        toast({ title: "Producto Creado", description: \`"\${data?.nombre}" ha sido añadido a tu tienda.\` });
        productUpdated = true;
      }

      const imageFile = values.imagenFile?.[0];
      if (imageFile && productId) {
        const fileName = \`\${Date.now()}_\${imageFile.name.replace(/\s+/g, '_')}\`;
        const filePath = \`\${productId}/\${fileName}\`; 

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false, 
          });

        if (uploadError) {
          throw new Error(\`Error al subir la imagen: \${uploadError.message}\`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error("No se pudo obtener la URL pública de la imagen.");
        }
        
        await supabase
          .from('imagenes_productos')
          .update({ es_principal: false })
          .eq('producto_id', productId);

        const { error: imageDbError } = await supabase
          .from('imagenes_productos')
          .insert({
            producto_id: productId,
            url: publicUrlData.publicUrl,
            file_path: filePath,
            es_principal: true,
          });
        
        if (imageDbError) {
          await supabase.storage.from('product-images').remove([filePath]);
          throw new Error(\`Error al guardar la información de la imagen: \${imageDbError.message}\`);
        }
        toast({ title: "Imagen Subida", description: "La imagen principal del producto ha sido actualizada." });
      }

      if (productUpdated) {
        setIsProductDialogOpen(false);
        setEditingProduct(null);
        fetchProducts();
      }

    } catch (error: any) {
      toast({
        title: \`Error en la operación del producto\`,
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
                <TableHead className="w-[80px]">Imagen</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Image
                      src={product.principal_image_url || "https://placehold.co/100x100.png?text=Producto"}
                      alt={product.nombre}
                      width={60}
                      height={60}
                      className="rounded-md object-cover aspect-square"
                      data-ai-hint="product craft"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.nombre}</TableCell>
                  <TableCell className="text-right">${typeof product.precio === 'number' ? product.precio.toFixed(2) : 'N/A'}</TableCell>
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

      <Dialog open={isProductDialogOpen} onOpenChange={(isOpen) => {
          setIsProductDialogOpen(isOpen);
          if (!isOpen) setEditingProduct(null);
      }}>
        <DialogContent className="sm:max-w-lg">
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

      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el producto
              "\${productToDelete?.nombre}" y todas sus imágenes asociadas de tu tienda.
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
  existingProduct: ProductWithPrincipalImage | null;
  onClose: () => void;
}

function ProductFormDialog({ onSubmit, existingProduct, onClose }: ProductFormDialogProps) {
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      nombre: existingProduct?.nombre || "",
      descripcion: existingProduct?.descripcion || "",
      precio: existingProduct?.precio || 0,
      stock: existingProduct?.stock || 0,
      imagenFile: null,
    },
  });

  useEffect(() => {
    form.reset({
      nombre: existingProduct?.nombre || "",
      descripcion: existingProduct?.descripcion || "",
      precio: existingProduct?.precio || 0,
      stock: existingProduct?.stock || 0,
      imagenFile: null, 
    });
    setImagePreview(existingProduct?.principal_image_url || null); 
    if (fileInputRef.current) { 
        fileInputRef.current.value = "";
    }
  }, [existingProduct, form]);


  const handleFormSubmit = async (values: ProductFormValues) => {
    setIsSubmittingProduct(true);
    await onSubmit(values);
    setIsSubmittingProduct(false);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("imagenFile", event.target.files); 
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue("imagenFile", null);
      setImagePreview(existingProduct?.principal_image_url || null); 
    }
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
        <FormField
          control={form.control}
          name="imagenFile"
          render={({ fieldState }) => ( 
            <FormItem>
              <FormLabel>Imagen Principal del Producto</FormLabel>
              <FormControl>
                <Input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </FormControl>
              {imagePreview && (
                <div className="mt-2">
                  <Image src={imagePreview} alt="Vista previa" width={100} height={100} className="rounded-md object-cover aspect-square border" data-ai-hint="preview product craft" />
                </div>
              )}
              <FormDescription>
                Sube una imagen para tu producto (máx. 5MB, formatos: JPG, PNG, WEBP). Si no subes una nueva, se conservará la actual (si existe).
              </FormDescription>
              {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
            </FormItem>
          )}
        />
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

