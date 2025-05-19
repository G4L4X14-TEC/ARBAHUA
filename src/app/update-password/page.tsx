
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

// Esta es la página a la que Supabase redirigirá al usuario
// después de que haga clic en el enlace de restablecimiento de contraseña.
// Aquí es donde el usuario ingresará su nueva contraseña.

// **Importante:** Esta página debe manejar la lógica para actualizar la contraseña
// del usuario usando `supabase.auth.updateUser({ password: newPassword })`.
// El token necesario para esto vendrá en la URL como un fragmento hash (#).
// Necesitarás parsear este token y manejar el flujo de actualización.

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Actualizar Contraseña</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Esta funcionalidad está en construcción.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-foreground">
            Aquí podrás ingresar tu nueva contraseña.
          </p>
          <p className="text-sm text-muted-foreground">
            (Próximamente: formulario para nueva contraseña y su confirmación)
          </p>
          <img
            data-ai-hint="secure password update"
            src="https://placehold.co/400x300.png"
            alt="Actualización de contraseña"
            className="mx-auto rounded-lg shadow-md"
          />
          <Button asChild variant="outline">
            <Link href="/login" className="flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a Iniciar Sesión
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
