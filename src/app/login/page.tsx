
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
import { Mail, Lock } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Por favor, introduce un email válido." }),
  password: z.string().min(1, { message: "La contraseña no puede estar vacía." }), // Mínimo 1 para no estar vacía
});

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error("No se pudo obtener la información del usuario.");
      }

      // Consultar el rol del usuario en la tabla 'usuarios'
      const { data: usuarioData, error: userError } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        // Si no se encuentra el usuario en la tabla 'usuarios' o hay otro error,
        // es mejor cerrar la sesión para evitar un estado inconsistente.
        await supabase.auth.signOut();
        throw new Error(userError.message || "Error al verificar el rol del usuario.");
      }

      if (!usuarioData) {
        await supabase.auth.signOut();
        throw new Error("Rol de usuario no encontrado.");
      }
      
      toast({
        title: "¡Inicio de Sesión Exitoso!",
        description: "Bienvenido de nuevo a Arbahua.",
      });

      // Redirección basada en el rol
      if (usuarioData.rol === "artesano") {
        router.push("/artisan-dashboard");
      } else if (usuarioData.rol === "cliente") {
        router.push("/"); 
      } else {
        // Por si hay otros roles en el futuro o un caso no manejado
        router.push("/"); 
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al Iniciar Sesión",
        description: error.message || "Hubo un problema al intentar iniciar sesión. Verifica tus credenciales.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm shadow-xl bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Iniciar Sesión en Arbahua</CardTitle>
          <CardDescription className="text-muted-foreground">
            Accede a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email">Email</Label>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="tu@email.com" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="password">Contraseña</Label>
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
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Entrar"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2 pt-6">
          <p className="text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Regístrate
            </Link>
          </p>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
