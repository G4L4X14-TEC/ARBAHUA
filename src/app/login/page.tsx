import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Iniciar Sesión</CardTitle>
          <CardDescription className="text-muted-foreground">
            Accede a tu cuenta de CraftConnect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="tu@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            Entrar
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Regístrate
            </Link>
          </p>
          {/* <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </Link> */}
        </CardFooter>
      </Card>
    </main>
  );
}
