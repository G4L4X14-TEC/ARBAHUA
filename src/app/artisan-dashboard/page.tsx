import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ArtisanDashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Panel de Artesano</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            ¡Bienvenido a tu espacio creativo en CraftConnect!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg text-foreground">
            Aquí podrás gestionar tus productos, pedidos y perfil.
          </p>
          <img 
            data-ai-hint="crafts workshop"
            src="https://placehold.co/600x400.png" 
            alt="Espacio de trabajo artesanal" 
            className="rounded-lg mx-auto shadow-md"
          />
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
