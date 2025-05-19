
"use client";

import * as React from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Lock, ArrowLeft } from "lucide-react";

const formSchema = z.object({
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type UpdatePasswordFormValues = z.infer<typeof formSchema>;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    // Listener for Supabase auth events
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // This event means Supabase has verified the token from the URL fragment.
        // The session object might be present here.
        // We can now show the form to the user.
        toast({
          title: "Enlace Verificado",
          description: "Por favor, ingresa tu nueva contraseña.",
        });
        setShowForm(true);
        setAuthError(null); // Clear any previous errors
      } else if (event === "USER_UPDATED") {
        // This event fires after supabase.auth.updateUser() is successful.
        toast({
          title: "¡Contraseña Actualizada!",
          description: "Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión.",
        });
        router.push("/login");
      } else if (event === "SIGNED_IN" && session) {
        // If the user is already signed in and lands here, 
        // or if PASSWORD_RECOVERY event also signs the user in,
        // we still want to ensure the form shows if it was a recovery flow.
        // Check if URL contains recovery params as an additional check.
        if (window.location.hash.includes('type=recovery')) {
          if (!showForm) { // Only show toast if not already shown by PASSWORD_RECOVERY
             toast({
                title: "Enlace Verificado",
                description: "Por favor, ingresa tu nueva contraseña.",
              });
          }
          setShowForm(true);
          setAuthError(null);
        }
      }
    });
    
    // Check URL hash for error_description on mount
    const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove '#'
    const errorDescription = hashParams.get('error_description');
    if (errorDescription) {
        setAuthError(decodeURIComponent(errorDescription));
        setShowForm(false); // Do not show form if there's an error from the link
    } else if (hashParams.has('access_token') && hashParams.has('type') && hashParams.get('type') === 'recovery') {
        // If the URL has recovery params, it's likely a password recovery flow.
        // Supabase client will handle the PASSWORD_RECOVERY event.
        // We ensure the form is potentially shown if the event fires correctly.
    }


    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase, router, toast, showForm]);

  async function onSubmit(values: UpdatePasswordFormValues) {
    setIsLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        throw error;
      }
      // Success is handled by the USER_UPDATED event in the onAuthStateChange listener
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al Actualizar Contraseña",
        description: error.message || "No se pudo actualizar la contraseña. El enlace podría haber expirado o ser inválido. Intenta de nuevo solicitando otro enlace.",
      });
      setAuthError(error.message || "No se pudo actualizar la contraseña.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-xl bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Actualizar Contraseña</CardTitle>
          {!showForm && !authError && (
            <CardDescription className="text-muted-foreground pt-2">
              Verificando enlace de recuperación... Si no ves el formulario en unos segundos, es posible que el enlace sea inválido o haya expirado.
            </CardDescription>
          )}
           {authError && (
            <CardDescription className="text-destructive pt-2">
              Error: {authError} Por favor, solicita un nuevo enlace de recuperación.
            </CardDescription>
          )}
        </CardHeader>
        {showForm && (
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="password">Nueva Contraseña</Label>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="password" type="password" placeholder="••••••••" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="confirmPassword" type="password" placeholder="••••••••" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                  {isLoading ? "Actualizando..." : "Actualizar Contraseña"}
                </Button>
              </form>
            </Form>
          </CardContent>
        )}
        <CardFooter className="flex flex-col items-center gap-4 pt-6">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login" className="flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a Iniciar Sesión
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
