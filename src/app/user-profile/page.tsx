"use client";

/**
 * Página de perfil de usuario.
 * Permite ver información personal, pedidos y gestionar direcciones de envío.
 * Integra acciones de Supabase y Server Actions, así como formularios validados.
 */

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormProvider,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
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
  ShoppingBag,
  LogOut,
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
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/supabase/database.types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  getUserOrdersAction,
  getUserAddressesAction,
  updateUserAddressAction,
  deleteUserAddressAction,
  type UserOrderForDisplay,
} from "@/app/actions/userProfileActions";
import { saveShippingAddressAction } from "@/app/actions/checkoutActions";
import {
  shippingFormSchema,
  type ShippingFormValues,
} from "@/app/checkout/page";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { updateUserProfileActions } from "@/app/actions/userProfileActions";
import { changeUserPasswordActions } from "@/app/actions/userProfileActions";
export const dynamic = "force-dynamic";

// Loader para mostrar mientras carga el perfil
function UserProfileLoading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando perfil...</p>
      </div>
    </main>
  );
}

// Contenido principal del perfil de usuario
function UserProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<"usuarios"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOrderSuccessMessage, setShowOrderSuccessMessage] = useState(false);

  const [orders, setOrders] = useState<UserOrderForDisplay[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [errorOrders, setErrorOrders] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Tables<"direcciones">[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [errorAddresses, setErrorAddresses] = useState<string | null>(null);

  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] =
    useState<Tables<"direcciones"> | null>(null);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);
  const [addressToDelete, setAddressToDelete] =
    useState<Tables<"direcciones"> | null>(null);

  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  // Mensaje de éxito tras realizar un pedido
  useEffect(() => {
    const orderSuccess = searchParams.get("order_success");
    if (orderSuccess === "true") {
      setShowOrderSuccessMessage(true);
    }
  }, [searchParams]);

  // Obtener usuario autenticado y perfil
  const fetchUserProfileData = useCallback(async () => {
    setIsLoading(true);
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      toast({
        title: "Acceso Denegado",
        description: "Debes iniciar sesión para ver tu perfil.",
        variant: "destructive",
      });
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
      toast({
        title: "Error de Perfil",
        description: `No se pudo cargar tu perfil: ${
          profileError?.message || "Error desconocido"
        }`,
        variant: "destructive",
      });
      setProfile(null);
    } else {
      setProfile(profileData);
    }
    setIsLoading(false);
  }, [supabase, router, toast]);

  useEffect(() => {
    fetchUserProfileData();
  }, [fetchUserProfileData]);

  // Obtener pedidos del usuario
  const fetchOrders = useCallback(async () => {
    if (!profile) return;
    setIsLoadingOrders(true);
    setErrorOrders(null);
    try {
      const userOrders = await getUserOrdersAction();
      setOrders(userOrders);
    } catch (err: any) {
      setErrorOrders("No se pudieron cargar tus pedidos.");
      toast({
        title: "Error al Cargar Pedidos",
        description: err.message || "Ocurrió un problema.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingOrders(false);
    }
  }, [profile, toast]);

  // Obtener direcciones del usuario
  const fetchAddresses = useCallback(async () => {
    if (!profile) return;
    setIsLoadingAddresses(true);
    setErrorAddresses(null);
    try {
      const userAddresses = await getUserAddressesAction();
      setAddresses(userAddresses);
    } catch (err: any) {
      setErrorAddresses("No se pudieron cargar tus direcciones.");
      toast({
        title: "Error al Cargar Direcciones",
        description: err.message || "Ocurrió un problema.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [profile, toast]);

  // Cargar pedidos y direcciones al cargar perfil
  useEffect(() => {
    if (profile && !isLoading) {
      fetchOrders();
      fetchAddresses();
    }
  }, [profile, isLoading, fetchOrders, fetchAddresses]);

  // Cerrar sesión
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    toast({
      title: "Sesión Cerrada",
      description: "Has cerrado sesión exitosamente.",
    });
    router.refresh();
  };

  // Variante de badge según estado del pedido
  const getOrderStatusBadgeVariant = (
    status?: Tables<"pedidos">["estado"] | null
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return "outline";
    switch (status) {
      case "Pagado":
      case "Enviado":
      case "Entregado":
        return "default";
      case "Pendiente":
        return "secondary";
      case "Cancelado":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Dialogs de direcciones
  const handleOpenAddAddressDialog = () => {
    setEditingAddress(null);
    setIsAddressDialogOpen(true);
  };

  const handleOpenEditAddressDialog = (address: Tables<"direcciones">) => {
    setEditingAddress(address);
    setIsAddressDialogOpen(true);
  };

  const handleDeleteAddressClick = (address: Tables<"direcciones">) => {
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
      toast({
        title: "Error al Eliminar",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsConfirmDeleteDialogOpen(false);
    setAddressToDelete(null);
  };

  // Abrir diálogo de edición de perfil
  const handleOpenEditProfileDialog = () => {
    setIsProfileDialogOpen(true);
  };

  // Renderizado condicional basado en el estado de carga
  if (isLoading) {
    return <UserProfileLoading />;
  }

  if (!user || !profile) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No se pudo cargar la información del perfil. Serás redirigido.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <TooltipProvider>
      <main className="container mx-auto px-4 py-8">
        {showOrderSuccessMessage && (
          <Alert
            variant="default"
            className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/30"
          >
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertTitle className="font-semibold text-green-700 dark:text-green-300">
              ¡Pedido Realizado con Éxito!
            </AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">
              Gracias por tu compra. Hemos recibido tu pedido y lo estamos
              procesando. Puedes ver los detalles en "Mis Pedidos".
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Panel Izquierdo */}
          <section className="space-y-6 md:col-span-1">
            <Card className="shadow-xl">
              <CardHeader className="border-b pb-6 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <UserCircle className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold text-primary">
                  {profile.nombre || user.email}
                </CardTitle>
                <CardDescription className="pt-1 capitalize text-muted-foreground">
                  {profile.rol}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-earthy-green">
                    Información de la Cuenta
                  </h3>
                  <div className="space-y-1 text-sm text-foreground">
                    <p>
                      <span className="font-medium">Nombre:</span>{" "}
                      {profile.nombre || "No especificado"}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span> {user.email}
                    </p>
                    <p>
                      <span className="font-medium">Miembro desde:</span>{" "}
                      {new Date(user.created_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={handleOpenEditProfileDialog}
                  >
                    <Edit3 className="mr-2 h-4 w-4" /> Editar Perfil
                  </Button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-earthy-green mt-4 mb-2">
                    Seguridad
                  </h3>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsPasswordDialogOpen(true)}
                  >
                    <KeyRound className="mr-2 h-4 w-4" /> Cambiar Contraseña
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t p-6">
                <Button onClick={handleSignOut} variant="destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </Button>
              </CardFooter>
            </Card>

            {profile.rol === "artesano" && (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl text-earthy-green">
                    Panel de Artesano
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => router.push("/artisan-dashboard")}
                    className="w-full bg-primary/80 hover:bg-primary/90 text-primary-foreground"
                  >
                    <Store className="mr-2 h-5 w-5" />
                    Gestionar mi Tienda
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Panel Central/Derecho */}
          <section className="space-y-6 md:col-span-2">
            {/* Pedidos */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-earthy-green">
                  <ClipboardList className="h-6 w-6" />
                  Mis Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingOrders ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-muted-foreground">
                      Cargando pedidos...
                    </p>
                  </div>
                ) : errorOrders ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error al Cargar Pedidos</AlertTitle>
                    <AlertDescription>{errorOrders}</AlertDescription>
                  </Alert>
                ) : orders.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Aún no tienes pedidos.</p>
                    <Button
                      asChild
                      variant="link"
                      className="mt-2 text-primary"
                    >
                      <Link href="/search">¡Empieza a comprar!</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card
                        key={order.id}
                        className="overflow-hidden border"
                      >
                        <CardHeader className="flex flex-col items-start justify-between gap-2 bg-muted/30 p-4 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Pedido{" "}
                              <span className="text-primary">
                                #{(order.id || "N/A").substring(0, 8).toUpperCase()}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.formatted_date}
                            </p>
                          </div>
                          <Badge
                            variant={getOrderStatusBadgeVariant(order.estado)}
                            className="capitalize text-xs sm:ml-auto"
                          >
                            {order.estado?.replace("_", " ") || "Desconocido"}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-2 p-4">
                          <p className="text-sm">
                            <span className="font-medium">Total:</span> MXN$
                            {typeof order.total === "number"
                              ? order.total.toFixed(2)
                              : "N/A"}
                          </p>
                          <p className="text-sm italic text-muted-foreground">
                            <span className="font-medium not-italic">
                              Contenido:
                            </span>{" "}
                            {order.items_summary}
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
                              <p>
                                Próximamente: Ver detalles completos del pedido.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Direcciones */}
            <Card className="shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl text-earthy-green">
                  <MapPin className="h-5 w-5" />
                  Mis Direcciones
                </CardTitle>
                <Button size="sm" onClick={handleOpenAddAddressDialog}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingAddresses ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">
                      Cargando direcciones...
                    </p>
                  </div>
                ) : errorAddresses ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error al Cargar Direcciones</AlertTitle>
                    <AlertDescription>{errorAddresses}</AlertDescription>
                  </Alert>
                ) : addresses.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No tienes direcciones guardadas.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <Card key={address.id} className="border p-4 text-sm">
                        <p className="font-semibold">{address.calle}</p>
                        <p>
                          {address.ciudad}, {address.estado || "N/A"},{" "}
                          {address.codigo_postal}
                        </p>
                        <p>{address.pais}</p>
                        {(address.nombre_completo_destinatario ||
                          address.telefono_contacto) && (
                          <div className="mt-1 border-t pt-1 text-xs text-muted-foreground">
                            {address.nombre_completo_destinatario && (
                              <p>Destinatario: {address.nombre_completo_destinatario}</p>
                            )}
                            {address.telefono_contacto && (
                              <p>Tel: {address.telefono_contacto}</p>
                            )}
                          </div>
                        )}
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditAddressDialog(address)}
                          >
                            <Edit3 className="mr-1 h-3 w-3" /> Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteAddressClick(address)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preferencias */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-earthy-green">
                  <Settings className="h-5 w-5" />
                  Preferencias de la Cuenta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Próximamente: Configura tus notificaciones por correo,
                  suscripciones y otras preferencias.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Diálogo de añadir/editar dirección */}
        <AddAddressDialog
          isOpen={isAddressDialogOpen}
          onOpenChange={(isOpen) => {
            setIsAddressDialogOpen(isOpen);
            if (!isOpen) {
              setEditingAddress(null);
            }
          }}
          onAddressSavedOrUpdated={fetchAddresses}
          existingAddress={editingAddress}
        />

        {/* Diálogo de confirmación de borrado */}
        <AlertDialog
          open={isConfirmDeleteDialogOpen}
          onOpenChange={setIsConfirmDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive h-5 w-5" />
                ¿Confirmas la eliminación?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la
                dirección: <br />
                <strong>
                  {addressToDelete?.calle}, {addressToDelete?.ciudad}
                </strong>
                .
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAddressToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirmDeleteAddress}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Sí, eliminar dirección
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de Edición de Perfil */}
        <EditProfileDialog
          isOpen={isProfileDialogOpen}
          onOpenChange={setIsProfileDialogOpen}
          profile={profile} // Corrected prop name from currentProfile to profile
          onProfileUpdated={fetchUserProfileData}
        />

        {/* Diálogo de Cambio de Contraseña */}
        <ChangePasswordDialog
          isOpen={isPasswordDialogOpen}
          onOpenChange={setIsPasswordDialogOpen}
          onPasswordChanged={() => {
            toast({
              title: "Contraseña Actualizada",
              description: "Tu contraseña ha sido cambiada exitosamente.",
            });
            setIsPasswordDialogOpen(false);
          }}
        />
      </main>
    </TooltipProvider>
  );
}

// Diálogo para añadir o editar dirección de envío
interface AddAddressDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddressSavedOrUpdated: () => void;
  existingAddress: Tables<"direcciones"> | null;
}

function AddAddressDialog({
  isOpen,
  onOpenChange,
  onAddressSavedOrUpdated,
  existingAddress,
}: AddAddressDialogProps) {
  const { toast } = useToast();
  const [isSubmittingAddress, setIsSubmittingAddress] = React.useState(false);

  const formMethods = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
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

  useEffect(() => {
    if (isOpen) {
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
        formMethods.reset({
          nombreCompleto: "",
          direccion: "",
          ciudad: "",
          estado: "",
          codigoPostal: "",
          pais: "México",
          telefono: "",
        });
      }
    }
  }, [existingAddress, isOpen, formMethods]);

  const handleAddressSubmit = async (data: ShippingFormValues) => {
    setIsSubmittingAddress(true);

    let result;
    if (existingAddress?.id) {
      result = await updateUserAddressAction(existingAddress.id, data);
    } else {
      result = await saveShippingAddressAction(data);
    }

    if (result.success) {
      toast({
        title: existingAddress
          ? "Dirección Actualizada"
          : "Dirección Guardada",
        description:
          result.message ||
          `Tu dirección ha sido ${existingAddress ? "actualizada" : "guardada"}.`,
      });
      onAddressSavedOrUpdated();
      onOpenChange(false);
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existingAddress ? "Editar Dirección" : "Añadir Nueva Dirección"}
          </DialogTitle>
          <DialogDescription>
            {existingAddress
              ? "Modifica los detalles de tu dirección."
              : "Ingresa los detalles de tu nueva dirección de envío."}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...formMethods}>
          <form
            onSubmit={formMethods.handleSubmit(handleAddressSubmit)}
            className="space-y-4 py-4"
          >
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
                    <Input
                      placeholder="Av. Siempre Viva 742, Col. Springfield"
                      {...field}
                    />
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
                    <Input type="text" placeholder="01234" {...field} />
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmittingAddress}
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmittingAddress || !formMethods.formState.isValid}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmittingAddress ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {existingAddress ? "Guardar Cambios" : "Añadir Dirección"}
            </Button>
          </DialogFooter>
        </form>
      </FormProvider>
    </DialogContent>
  </Dialog>
);
}

interface EditProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProfileUpdated: () => void;
  profile: Tables<"usuarios"> | null;
}

function EditProfileDialog({
  isOpen,
  onOpenChange,
  onProfileUpdated,
  profile,
}: EditProfileDialogProps) {
  const profileFormSchema = z.object({
    nombre: z.string().optional(),
  });

  type ProfileFormValues = z.infer<typeof profileFormSchema>;

  const formMethods = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      nombre: profile?.nombre || "",
    },
  });

  useEffect(() => {
    if (isOpen && profile) {
      formMethods.reset({
        nombre: profile.nombre || "",
      });
    } else if (!isOpen) {
      formMethods.reset({ nombre: "" });
    }
  }, [isOpen, profile, formMethods]);

  const { toast } = useToast();

  const handleProfileSubmit = async (data: ProfileFormValues) => {
    const result = await updateUserProfileActions(data);

    if (result.success) {
      toast({
        title: "Perfil Actualizado",
        description: result.message || "Tu perfil ha sido actualizado correctamente.",
      });
      onProfileUpdated();
      onOpenChange(false);
    } else {
      toast({
        title: "Error al Actualizar",
        description: result.message || "No se pudo actualizar tu perfil.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Actualiza la información de tu perfil.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...formMethods}>
          <form
            onSubmit={formMethods.handleSubmit(handleProfileSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={formMethods.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPasswordChanged: () => void;
}

function ChangePasswordDialog({
  isOpen,
  onOpenChange,
  onPasswordChanged,
}: ChangePasswordDialogProps) {
  const { toast } = useToast();

  const passwordFormSchema = z
    .object({
      currentPassword: z.string().min(1, "Introduce tu contraseña actual."),
      newPassword: z
        .string()
        .trim()
        .min(8, "La nueva contraseña debe tener al menos 8 caracteres.")
        .regex(/[A-Z]/, "La nueva contraseña debe contener al menos una mayúscula.")
        .regex(/[a-z]/, "La nueva contraseña debe contener al menos una minúscula.")
        .regex(/\d/, "La nueva contraseña debe contener al menos un número.")
        .regex(/[^a-zA-Z0-9]/, "La nueva contraseña debe contener al menos un carácter especial."),
      confirmPassword: z.string().min(1, "Confirma tu nueva contraseña."),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Las contraseñas no coinciden.",
      path: ["confirmPassword"],
    });

  type PasswordFormValues = z.infer<typeof passwordFormSchema>;

  const formMethods = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      formMethods.reset();
    }
  }, [isOpen, formMethods]);

  const handleChangePasswordSubmit = async (data: PasswordFormValues) => {
    const result = await changeUserPasswordActions({ newPassword: data.newPassword });

    if (result.success) {
      toast({
        title: "Contraseña Actualizada",
        description: result.message || "Tu contraseña ha sido actualizada correctamente.",
      });
      onPasswordChanged();
    } else {
      toast({
        title: "Error al Cambiar Contraseña",
        description: result.message || "No se pudo cambiar tu contraseña.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogDescription>
            Introduce tu contraseña actual y la nueva contraseña.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...formMethods}>
          <form
            onSubmit={formMethods.handleSubmit(handleChangePasswordSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={formMethods.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña Actual</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formMethods.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormDescription>
                    La nueva contraseña debe tener al menos 8 caracteres.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formMethods.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Cambiar Contraseña
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

// Página principal exportada
export default function UserProfilePage() {
  return (
    <Suspense fallback={<UserProfileLoading />}>
      <UserProfileContent />
    </Suspense>
  );
}