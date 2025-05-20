
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
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Textarea } from "@/components/ui/textarea"; 
import { 
  Form, 
  FormControl, 
  FormProvider,
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"; 
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; 

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
  PlusCircle,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types"; 
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  getUserOrdersAction, 
  getUserAddressesAction, 
  updateUserAddressAction, 
  deleteUserAddressAction, 
  type UserOrderForDisplay 
} from "@/app/actions/userProfileActions";
import { saveShippingAddressAction } from "@/app/actions/checkoutActions"; 
import { shippingFormSchema, type ShippingFormValues } from "@/app/checkout/page"; 
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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

  const [addresses, setAddresses] = React.useState<Tables<'direcciones'>[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = React.useState(true);
  const [errorAddresses, setErrorAddresses] = React.useState<string | null>(null);
  
  const [isAddressDialogOpen, setIsAddressDialogOpen] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<Tables<'direcciones'> | null>(null);
  
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = React.useState(false);
  const [addressToDelete, setAddressToDelete] = React.useState<Tables<'direcciones'> | null>(null);

  React.useEffect(() => {
    if (searchParams.get("order_success") === "true") {
      setShowOrderSuccessMessage(true);
      // router.replace('/user-profile', { scroll: false }); 
    }
  }, [searchParams, router]);

  const fetchUserData = React.useCallback(async () => {
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

    if (profileError || !profileData) {
      toast({ title: "Error de Perfil", description: \`No se pudo cargar tu perfil: \${profileError?.message || 'Error desconocido'}\`, variant: "destructive" });
      setProfile(null); 
    } else {
      setProfile(profileData);
    }
    setIsLoading(false);
  }, [supabase, router, toast]);

  React.useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);
  
  const fetchOrders = React.useCallback(async () => {
    if (!user || !profile) return;
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
      toast({ title: "Error al Cargar Pedidos", description: err.message || "Ocurrió un problema.", variant: "destructive" });
    } finally {
      setIsLoadingOrders(false);
    }
  }, [user, profile, toast]);

  const fetchAddresses = React.useCallback(async () => {
    if (!profile) return;
    console.log('[UserProfilePage] Fetching addresses for user:', profile.id);
    setIsLoadingAddresses(true);
    setErrorAddresses(null);
    try {
      const userAddresses = await getUserAddressesAction();
      console.log('[UserProfilePage] Addresses received:', userAddresses);
      setAddresses(userAddresses);
    } catch (err: any) {
      console.error('[UserProfilePage] Error fetching addresses:', err);
      setErrorAddresses("No se pudieron cargar tus direcciones.");
      toast({ title: "Error al Cargar Direcciones", description: err.message || "Ocurrió un problema.", variant: "destructive" });
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [profile, toast]);

  React.useEffect(() => {
    if (user && profile && !isLoading) { 
      fetchOrders();
      fetchAddresses(); 
    }
  }, [user, profile, isLoading, fetchOrders, fetchAddresses]); 

  const handleSignOut = async () => {
    setIsLoading(true); 
    await supabase.auth.signOut();
    router.push('/');
    toast({ title: "Sesión Cerrada", description: "Has cerrado sesión exitosamente." });
    router.refresh(); 
  };

  const getOrderStatusBadgeVariant = (status?: Tables<'pedidos'>['estado'] | null): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return 'outline';
    switch (status) {
      case 'Pagado':
        return 'default'; 
      case 'Enviado':
      case 'Entregado':
        return 'default'; 
      case 'Pendiente':
        return 'secondary'; 
      case 'Cancelado':
        return 'destructive';
      default:
        const _exhaustiveCheck: never = status;
        return 'outline';
    }
  };

  const handleOpenAddAddressDialog = () => {
    setEditingAddress(null); // Asegurarse de que no estamos editando
    setIsAddressDialogOpen(true);
  };

  const handleOpenEditAddressDialog = (address: Tables<'direcciones'>) => {
    setEditingAddress(address);
    setIsAddressDialogOpen(true);
  };
  
  const handleAddressSavedOrUpdated = () => {
    fetchAddresses();
    setIsAddressDialogOpen(false);
    setEditingAddress(null);
  };

  const handleDeleteAddress = (address: Tables<'direcciones'>) => {
    setAddressToDelete(address);
    setIsConfirmDeleteDialogOpen(true);
  };

  const onConfirmDeleteAddress = async () => {
    if (!addressToDelete) return;
    const result = await deleteUserAddressAction(addressToDelete.id);
    if (result.success) {
      toast({ title: "Dirección Eliminada", description: result.message });
      fetchAddresses();
    } else {
      toast({ title: "Error al Eliminar", description: result.message, variant: "destructive" });
    }
    setIsConfirmDeleteDialogOpen(false);
    setAddressToDelete(null);
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

          {/* Columna de Historial de Pedidos y Direcciones */}
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
                              Pedido <span className="text-primary">#\${order.id.substring(0, 8).toUpperCase()}</span>
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
                            <span className="font-medium">Total:</span> MXN\${order.total.toFixed(2)}
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
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-xl text-earthy-green flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Mis Direcciones
                </CardTitle>
                <Button size="sm" onClick={handleOpenAddAddressDialog}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Dirección
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingAddresses ? (
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Cargando direcciones...</p>
                  </div>
                ) : errorAddresses ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error al Cargar Direcciones</AlertTitle>
                    <AlertDescription>{errorAddresses}</AlertDescription>
                  </Alert>
                ) : addresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No tienes direcciones guardadas.</p>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <Card key={address.id} className="p-4 text-sm border">
                        <p className="font-semibold">{address.calle}</p>
                        <p>{address.ciudad}, {address.estado || 'N/A'}, {address.codigo_postal}</p>
                        <p>{address.pais}</p>
                        <div className="mt-2 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEditAddressDialog(address)}>
                            <Edit3 className="mr-1 h-3 w-3" /> Editar
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteAddress(address)}>
                            <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl text-earthy-green flex items-center gap-2"><Settings className="h-5 w-5" />Preferencias de la Cuenta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Próximamente: Configura tus notificaciones por correo, suscripciones y otras preferencias.</p>
              </CardContent>
            </Card>
          </section>
        </div>
        
        <AddressDialog
          isOpen={isAddressDialogOpen}
          onOpenChange={setIsAddressDialogOpen}
          onAddressSavedOrUpdated={handleAddressSavedOrUpdated}
          existingAddress={editingAddress}
        />

        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive h-5 w-5" />
                ¿Confirmas la eliminación?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la dirección: <br />
                <strong>{addressToDelete?.calle}, {addressToDelete?.ciudad}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAddressToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={onConfirmDeleteAddress} 
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Sí, eliminar dirección
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </main>
    </TooltipProvider>
  );
}

interface AddressDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddressSavedOrUpdated: () => void;
  existingAddress: Tables<'direcciones'> | null;
}

function AddressDialog({ 
  isOpen, 
  onOpenChange, 
  onAddressSavedOrUpdated, 
  existingAddress 
}: AddressDialogProps) {
  const { toast } = useToast();
  const [isSubmittingAddress, setIsSubmittingAddress] = React.useState(false);

  const formMethods = useForm<ShippingFormValues>({ 
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      nombreCompleto:  "", // Asumiendo que estos no están en 'direcciones' pero sí en el form
      direccion: "",
      ciudad: "",
      estado: "",
      codigoPostal: "",
      pais: "México", 
      telefono: "", // Asumiendo que estos no están en 'direcciones' pero sí en el form
    },
  });

  React.useEffect(() => {
    if (existingAddress) {
      formMethods.reset({
        nombreCompleto: existingAddress.nombre_completo_destinatario || "",
        direccion: existingAddress.calle || "",
        ciudad: existingAddress.ciudad || "",
        estado: existingAddress.estado || "",
        codigoPostal: existingAddress.codigo_postal || "",
        pais: existingAddress.pais || "México",
        telefono: existingAddress.telefono_contacto || "",
      });
    } else {
      formMethods.reset({ // Resetear a valores por defecto para un nuevo formulario
        nombreCompleto: "",
        direccion: "",
        ciudad: "",
        estado: "",
        codigoPostal: "",
        pais: "México",
        telefono: "",
      });
    }
  }, [existingAddress, formMethods]);

  const handleAddressSubmit = async (data: ShippingFormValues) => {
    setIsSubmittingAddress(true);
    console.log("[AddressDialog] Submitting address:", data, "Existing Address ID:", existingAddress?.id);
    
    let result;
    if (existingAddress?.id) {
      result = await updateUserAddressAction(existingAddress.id, data);
    } else {
      result = await saveShippingAddressAction(data); 
    }

    if (result.success) {
      toast({
        title: existingAddress ? "Dirección Actualizada" : "Dirección Guardada",
        description: result.message || \`Tu dirección ha sido \${existingAddress ? 'actualizada' : 'guardada'}.\`,
      });
      onAddressSavedOrUpdated();
    } else {
      toast({
        title: existingAddress ? "Error al Actualizar" : "Error al Guardar",
        description: result.message || "No se pudo procesar la dirección.",
        variant: "destructive",
      });
    }
    setIsSubmittingAddress(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) { // Si se está cerrando el diálogo
        formMethods.reset(); // Limpiar el formulario
        setEditingAddress(null); // Asegurar que no quede ninguna dirección en edición
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingAddress ? 'Editar Dirección' : 'Añadir Nueva Dirección'}</DialogTitle>
          <DialogDescription>
            {existingAddress ? 'Modifica los detalles de tu dirección.' : 'Ingresa los detalles de tu nueva dirección de envío.'}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...formMethods}> 
          <form onSubmit={formMethods.handleSubmit(handleAddressSubmit)} className="space-y-4 py-4">
            {/* Campos del ShippingForm reutilizados */}
            <FormField
              control={formMethods.control}
              name="nombreCompleto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo del Destinatario</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez Rodríguez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formMethods.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección (Calle y Número, Colonia)</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Siempre Viva 742, Col. Springfield" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={formMethods.control}
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
                control={formMethods.control}
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
                    control={formMethods.control}
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
                    control={formMethods.control}
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
                            {/* Puedes añadir más países si es necesario */}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <FormField
              control={formMethods.control}
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
            <DialogFooter className="pt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmittingAddress}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmittingAddress || !formMethods.formState.isValid} className="bg-primary hover:bg-primary/90">
                {isSubmittingAddress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {existingAddress ? 'Guardar Cambios' : 'Añadir Dirección'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
