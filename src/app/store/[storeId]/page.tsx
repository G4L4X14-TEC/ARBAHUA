
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";

export default function StoreProfilePage({ params }: { params: { storeId: string } }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Perfil de Tienda del Artesano</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            ID de la Tienda: {params.storeId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground mb-6">
            Esta página mostrará el perfil público de la tienda del artesano, sus productos y más información. 
            Actualmente está en construcción. ¡Gracias por tu paciencia!
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/">Volver a la Página de Inicio</Link>
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground w-full text-center">
            Descubre más artesanos y tiendas en Arbahua.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
