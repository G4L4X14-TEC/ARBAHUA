import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Bienvenido a CraftConnect</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Conectando artesanos apasionados con compradores que valoran lo único.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 items-center">
          <p className="text-center text-foreground">
            Explora un mundo de creaciones hechas a mano o comparte tus talentos con una comunidad vibrante.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/register" className="flex items-center justify-center gap-2">
                ¡Únete Ahora!
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/login">
                Iniciar Sesión
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
