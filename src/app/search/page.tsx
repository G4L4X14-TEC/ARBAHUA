
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Search as SearchIcon, Filter, ListOrdered, XCircle } from 'lucide-react';

// Mock data for products
const mockProducts = [
  {
    id: '1',
    nombre: 'Jarrón de Cerámica Pintado a Mano',
    tienda_nombre: 'Artesanías Doña Rosa',
    precio: 250.00,
    imagen_url: 'https://placehold.co/400x300.png?text=Jarrón+Cerámica',
    data_ai_hint: 'ceramic vase',
  },
  {
    id: '2',
    nombre: 'Textil Bordado Otomí',
    tienda_nombre: 'Creaciones Textiles Sol',
    precio: 750.50,
    imagen_url: 'https://placehold.co/400x300.png?text=Textil+Bordado',
    data_ai_hint: 'embroidered textile',
  },
  {
    id: '3',
    nombre: 'Alebrije de Madera Tallada',
    tienda_nombre: 'El Nahual Contento',
    precio: 1200.00,
    imagen_url: 'https://placehold.co/400x300.png?text=Alebrije',
    data_ai_hint: 'alebrije wood',
  },
  {
    id: '4',
    nombre: 'Joyería de Plata con Ámbar',
    tienda_nombre: 'Tesoros de la Tierra',
    precio: 980.75,
    imagen_url: 'https://placehold.co/400x300.png?text=Joyería+Ámbar',
    data_ai_hint: 'silver amber',
  },
  {
    id: '5',
    nombre: 'Cesta de Palma Tejida',
    tienda_nombre: 'Manos Mágicas de Oaxaca',
    precio: 180.00,
    imagen_url: 'https://placehold.co/400x300.png?text=Cesta+Palma',
    data_ai_hint: 'woven basket',
  },
  {
    id: '6',
    nombre: 'Muñeca Lele Tradicional',
    tienda_nombre: 'Corazón Queretano',
    precio: 320.00,
    imagen_url: 'https://placehold.co/400x300.png?text=Muñeca+Lele',
    data_ai_hint: 'traditional doll',
  },
];

export default function SearchPage() {
  // Placeholder para filtros activos (se gestionará con estado en el futuro)
  const activeFilters = {
    categoria: 'todos',
    precioMin: '',
    precioMax: '',
    orden: 'relevancia',
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card py-8 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-primary mb-4">Encuentra tu Tesoro Artesanal</h1>
          <p className="text-muted-foreground text-lg">
            Explora una amplia variedad de productos únicos hechos por manos talentosas.
          </p>
          <div className="mt-6 max-w-xl">
            <div className="relative">
              <Input
                type="search"
                placeholder="Buscar por nombre, material, técnica..."
                className="w-full h-12 pl-12 pr-4 rounded-lg text-base"
              />
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Columna de Filtros */}
          <aside className="md:col-span-1">
            <Card className="sticky top-20 shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="text-xl flex items-center gap-2 text-earthy-green">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                <Accordion type="multiple" defaultValue={['categorias', 'precio']} className="w-full">
                  <AccordionItem value="categorias">
                    <AccordionTrigger className="text-base font-semibold">Categorías</AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                      {['Cerámica', 'Textiles', 'Madera', 'Joyería', 'Piel', 'Otros'].map((cat) => (
                        <div key={cat} className="flex items-center space-x-2">
                          <Checkbox id={`cat-${cat.toLowerCase()}`} />
                          <Label htmlFor={`cat-${cat.toLowerCase()}`} className="font-normal text-sm">
                            {cat}
                          </Label>
                        </div>
                      ))}
                      <Button variant="link" className="p-0 h-auto text-xs text-primary">Ver todas las categorías</Button>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="precio">
                    <AccordionTrigger className="text-base font-semibold">Rango de Precio</AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-3">
                      <div className="flex items-center gap-2">
                        <Input type="number" placeholder="Mín" className="h-9 text-sm" />
                        <span>-</span>
                        <Input type="number" placeholder="Máx" className="h-9 text-sm" />
                      </div>
                      <Button size="sm" variant="outline" className="w-full">Aplicar Precio</Button>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="ordenar">
                    <AccordionTrigger className="text-base font-semibold">Ordenar Por</AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                      <RadioGroup defaultValue="relevancia">
                        {[
                          { label: 'Relevancia', value: 'relevancia' },
                          { label: 'Más Recientes', value: 'recientes' },
                          { label: 'Precio: Menor a Mayor', value: 'precio_asc' },
                          { label: 'Precio: Mayor a Menor', value: 'precio_desc' },
                        ].map((orden) => (
                          <div key={orden.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={orden.value} id={`orden-${orden.value}`} />
                            <Label htmlFor={`orden-${orden.value}`} className="font-normal text-sm">
                              {orden.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-4">
                  <Filter className="mr-2 h-4 w-4" /> Aplicar Filtros
                </Button>
                {Object.values(activeFilters).some(val => val && val !== 'todos' && val !== 'relevancia') && (
                  <Button variant="outline" className="w-full mt-2">
                    <XCircle className="mr-2 h-4 w-4" /> Limpiar Filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* Columna de Productos */}
          <section className="md:col-span-3">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <h2 className="text-2xl font-semibold text-earthy-green">
                {mockProducts.length > 0 ? `${mockProducts.length} Productos Encontrados` : "Explora Nuestros Productos"}
              </h2>
              {/* Podría ir un selector de ordenamiento aquí también si se quita del panel de filtros */}
            </div>

            {mockProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 rounded-lg flex flex-col bg-card transform hover:-translate-y-1">
                    <Link href={`/products/${product.id}`} className="block group h-full flex flex-col">
                      <div className="relative w-full h-56">
                        <Image
                          src={product.imagen_url}
                          alt={product.nombre}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          style={{ objectFit: 'cover' }}
                          className="bg-muted group-hover:scale-105 transition-transform duration-300"
                          data-ai-hint={product.data_ai_hint}
                        />
                      </div>
                      <CardHeader className="p-4 flex-grow">
                        <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors" title={product.nombre}>
                          {product.nombre}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-1">
                          {product.tienda_nombre}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="p-4 pt-0 mt-auto flex justify-between items-center">
                        <p className="text-base font-bold text-primary">${product.precio.toFixed(2)}</p>
                        <Button variant="outline" size="sm" className="ml-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-xs px-3 py-1.5 h-auto">
                          Ver Detalles
                        </Button>
                      </CardFooter>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <SearchIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No se encontraron productos</h3>
                <p className="text-muted-foreground">
                  Intenta ajustar tus filtros o busca algo diferente.
                </p>
                {/* Aquí podrían ir sugerencias de categorías populares */}
              </div>
            )}
            {/* Paginación (placeholder) */}
            {mockProducts.length > 0 && (
                <div className="mt-12 flex justify-center">
                    <Button variant="outline" className="mr-2">Anterior</Button>
                    <Button variant="outline">Siguiente</Button>
                </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

    