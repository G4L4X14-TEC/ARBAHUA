
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function SearchPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Buscar Productos</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Explora todas las artesanías disponibles en Arbahua.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground mb-6">
            Esta página mostrará todos los productos, con filtros y opciones de búsqueda. 
            Actualmente está en construcción. ¡Gracias por tu paciencia!
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/">Volver a la Página de Inicio</Link>
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground w-full text-center">
            Pronto podrás encontrar exactamente lo que buscas.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}

    