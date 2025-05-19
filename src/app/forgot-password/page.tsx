
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Recuperar Contraseña</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Esta funcionalidad está en construcción.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-foreground">
            Pronto podrás restablecer tu contraseña desde aquí.
          </p>
          <img
            data-ai-hint="password key lock"
            src="https://placehold.co/400x300.png"
            alt="Recuperación de contraseña"
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
