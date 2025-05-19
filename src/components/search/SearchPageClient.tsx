
"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Search as SearchIcon, Filter, ListOrdered, XCircle, Loader2 } from "lucide-react";

import { searchProductsAction, getCategoriesAction, type ProductForDisplay, type CategoryForDisplay } from "@/app/actions/searchPageActions";

interface SearchPageClientProps {
  initialSearchTerm?: string | null;
  initialCategoryId?: string | null;
}

export default function SearchPageClient({ initialSearchTerm, initialCategoryId }: SearchPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategoryId || null);
  
  const [products, setProducts] = useState<ProductForDisplay[]>([]);
  const [categories, setCategories] = useState<CategoryForDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const fetchedCategories = await getCategoriesAction();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      // Potentially set an error state for categories
    }
    setIsLoadingCategories(false);
  }, []);

  const fetchProducts = useCallback(async (currentSearchTerm: string | null, currentCategoryId: string | null) => {
    setIsLoading(true);
    try {
      const fetchedProducts = await searchProductsAction({ 
        searchTerm: currentSearchTerm, 
        categoryId: currentCategoryId 
      });
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Failed to search products:", error);
      setProducts([]); // Clear products on error
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const termFromUrl = searchParams.get('q');
    const categoryFromUrl = searchParams.get('category');
    
    setSearchTerm(termFromUrl || "");
    setSelectedCategoryId(categoryFromUrl || null);

    fetchProducts(termFromUrl, categoryFromUrl);
  }, [searchParams, fetchProducts]);

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newParams = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      newParams.set('q', searchTerm.trim());
    } else {
      newParams.delete('q');
    }
    router.push(`/search?${newParams.toString()}`);
  };

  const handleCategoryChange = (categoryId: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (selectedCategoryId === categoryId) { // Deselect if already selected
      newParams.delete('category');
      setSelectedCategoryId(null);
    } else {
      newParams.set('category', categoryId);
      setSelectedCategoryId(categoryId);
    }
    router.push(`/search?${newParams.toString()}`);
  };
  
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategoryId(null);
    router.push('/search');
  };

  const hasActiveFilters = searchTerm.trim() || selectedCategoryId;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card py-8 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-primary mb-4">Encuentra tu Tesoro Artesanal</h1>
          <p className="text-muted-foreground text-lg">
            Explora una amplia variedad de productos únicos hechos por manos talentosas.
          </p>
          <form onSubmit={handleSearchSubmit} className="mt-6 max-w-xl">
            <div className="relative">
              <Input
                type="search"
                placeholder="Buscar por nombre, material, técnica..."
                className="w-full h-12 pl-12 pr-4 rounded-lg text-base"
                value={searchTerm}
                onChange={handleSearchInputChange}
              />
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-3">Buscar</Button>
            </div>
          </form>
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
                <Accordion type="multiple" defaultValue={['categorias']} className="w-full">
                  <AccordionItem value="categorias">
                    <AccordionTrigger className="text-base font-semibold">Categorías</AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                      {isLoadingCategories ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" /> 
                          <span className="ml-2 text-sm text-muted-foreground">Cargando...</span>
                        </div>
                      ) : categories.length > 0 ? (
                        categories.map((cat) => (
                          <div key={cat.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`cat-${cat.id}`} 
                              checked={selectedCategoryId === cat.id}
                              onCheckedChange={() => handleCategoryChange(cat.id)}
                            />
                            <Label htmlFor={`cat-${cat.id}`} className="font-normal text-sm cursor-pointer">
                              {cat.nombre}
                            </Label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No hay categorías disponibles.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="precio">
                    <AccordionTrigger className="text-base font-semibold">Rango de Precio</AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-3">
                      <p className="text-sm text-muted-foreground">(Próximamente)</p>
                      {/* Placeholder UI for price range */}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="ordenar">
                    <AccordionTrigger className="text-base font-semibold">Ordenar Por</AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                       <p className="text-sm text-muted-foreground">(Próximamente)</p>
                      {/* Placeholder UI for sorting */}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                {hasActiveFilters && (
                  <Button variant="outline" className="w-full mt-4" onClick={clearFilters}>
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
                {isLoading ? 'Buscando productos...' : `${products.length} Productos Encontrados`}
              </h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 rounded-lg flex flex-col bg-card transform hover:-translate-y-1">
                    <Link href={`/products/${product.id}`} className="block group h-full flex flex-col">
                      <div className="relative w-full h-56">
                        <Image
                          src={product.imagen_url || "https://placehold.co/400x300.png?text=Sin+Imagen"}
                          alt={product.nombre}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          style={{ objectFit: 'cover' }}
                          className="bg-muted group-hover:scale-105 transition-transform duration-300"
                          data-ai-hint="handmade product"
                        />
                      </div>
                      <CardHeader className="p-4 flex-grow">
                        <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors" title={product.nombre}>
                          {product.nombre}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-1">
                          {product.tienda_nombre || "Artesanía Local"}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="p-4 pt-0 mt-auto flex justify-between items-center">
                        <p className="text-base font-bold text-primary">${typeof product.precio === 'number' ? product.precio.toFixed(2) : 'N/A'}</p>
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
              </div>
            )}
            {/* Paginación (placeholder) */}
            {products.length > 0 && (
                <div className="mt-12 flex justify-center">
                    <Button variant="outline" className="mr-2" disabled>Anterior</Button>
                    <Button variant="outline" disabled>Siguiente</Button>
                </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
