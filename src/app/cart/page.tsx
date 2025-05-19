
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

export default function CartPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Carrito de Compras</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Revisa los productos que has añadido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground mb-6">
            Aquí verás los productos en tu carrito y podrás proceder al pago.
            Actualmente está en construcción. ¡Gracias por tu paciencia!
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/">Volver a la Página de Inicio</Link>
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground w-full text-center">
            ¡Sigue explorando y añade tus artesanías favoritas!
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}

    