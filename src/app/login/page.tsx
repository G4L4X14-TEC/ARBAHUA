
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
  password: z.string().min(1, { message: "La contraseña no puede estar vacía." }),
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
    console.log('Intentando iniciar sesión con:', values);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (authError) {
        console.error("Error en signInWithPassword:", authError);
        throw authError;
      }

      if (!authData.user) {
        console.error("No se pudo obtener authData.user después del inicio de sesión.");
        throw new Error("No se pudo obtener la información del usuario después del inicio de sesión.");
      }

      console.log("Inicio de sesión en Supabase Auth exitoso. User ID:", authData.user.id);

      // Consultar el rol del usuario en la tabla 'usuarios'
      const { data: usuarioData, error: userError } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', authData.user.id)
        .single();

      console.log("Resultado de la consulta a la tabla 'usuarios':", { usuarioData, userError });

      if (userError) {
        console.error("Error al obtener el perfil del usuario de la tabla 'usuarios':", userError);
        await supabase.auth.signOut(); // Cerrar sesión si no podemos obtener el perfil
        toast({
          variant: "destructive",
          title: "Error de Perfil",
          description: userError.message || "No se pudo verificar tu rol en la aplicación. Por favor, contacta a soporte.",
        });
        setIsLoading(false);
        return;
      }

      if (!usuarioData) {
        console.error("No se encontró el perfil del usuario en la tabla 'usuarios' para el ID:", authData.user.id);
        await supabase.auth.signOut(); // Cerrar sesión
        toast({
          variant: "destructive",
          title: "Perfil No Encontrado",
          description: "Tu perfil no fue encontrado en la aplicación. Por favor, contacta a soporte si crees que esto es un error.",
        });
        setIsLoading(false);
        return;
      }
      
      toast({
        title: "¡Inicio de Sesión Exitoso!",
        description: "Bienvenido de nuevo a Arbahua.",
      });

      console.log("Rol del usuario obtenido:", usuarioData.rol);

      // Redirección basada en el rol
      if (usuarioData.rol === "artesano") {
        console.log("Redirigiendo a /artisan-dashboard para artesano...");
        router.push("/artisan-dashboard");
      } else if (usuarioData.rol === "cliente") {
        console.log("Redirigiendo a / para cliente...");
        router.push("/"); 
      } else {
        console.warn("Rol de usuario desconocido o no manejado:", usuarioData.rol);
        toast({ 
          title: "Rol Desconocido", 
          description: "Tu rol no permite una redirección específica. Serás dirigido a la página principal.", 
          variant: "destructive" 
        });
        router.push("/"); 
      }

    } catch (error: any) {
      console.error("Error general en onSubmit de LoginPage:", error);
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
          <CardDescription className="text-muted-foreground pt-2">
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
