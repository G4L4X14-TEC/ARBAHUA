
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-[calc(100vh-var(--header-height,4rem))] flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-3xl md:text-4xl font-bold text-destructive">
            ¡Oops! Página No Encontrada
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-2 text-base md:text-lg">
            Lo sentimos, la página que estás buscando no existe o ha sido movida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground mb-6">
            Puedes volver al inicio o intentar buscar lo que necesitas.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/">Volver a la Página de Inicio</Link>
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground w-full text-center">
            Si crees que esto es un error, por favor contacta a soporte.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
