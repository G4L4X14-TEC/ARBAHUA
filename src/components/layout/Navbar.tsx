
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HandMetal, ShoppingCart, UserCircle, LogOut, Store, Search, Info, Contact, Home } from "lucide-react";

// Helper para obtener iniciales del nombre
const getInitials = (name: string | undefined) => {
  if (!name) return "U";
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
};

export default function Navbar() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<{ nombre?: string | null; rol?: string | null } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from("usuarios")
          .select("nombre, rol")
          .eq("id", session.user.id)
          .single();
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          const { data: profile } = await supabase
            .from("usuarios")
            .select("nombre, rol")
            .eq("id", session.user.id)
            .single();
          setUserProfile(profile);
        } else {
          setUser(null);
          setUserProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    router.push("/");
    router.refresh(); // Forzar refresco para asegurar que la UI se actualice en Server Components
    toast({ title: "Sesión Cerrada", description: "Has cerrado sesión exitosamente." });
  };
  
  const userName = userProfile?.nombre || user?.email;
  const userRole = userProfile?.rol;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card text-card-foreground shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <HandMetal className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold text-primary">Arbahua</span>
        </Link>

        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          <NavLink href="/">Inicio</NavLink>
          <NavLink href="/search">Productos</NavLink>
          <NavLink href="/stores">Artesanos</NavLink>
          <NavLink href="/contact">Contacto</NavLink>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {!isLoading && user && (
            <Button variant="ghost" size="icon" onClick={() => router.push('/cart')} className="relative hover:bg-primary/10">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="sr-only">Carrito</span>
              {/* Aquí podrías añadir un contador de items en el carrito */}
            </Button>
          )}

          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 focus-visible:ring-primary">
                  <Avatar className="h-9 w-9 border border-primary/50">
                    {/* Podrías añadir una imagen de perfil aquí si la tuvieras */}
                    {/* <AvatarImage src="user-profile-image.jpg" alt={userName || 'Usuario'} /> */}
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userRole === "artesano" && (
                  <DropdownMenuItem onClick={() => router.push("/artisan-dashboard")}>
                    <Store className="mr-2 h-4 w-4" />
                    <span>Mi Panel de Artesano</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push(userRole === 'artesano' ? '/artisan-profile' : '/user-profile')}> {/* Ajustar ruta perfil artesano */}
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Mi Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" className="hover:bg-primary/10 hover:text-primary">
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/register">Regístrate</Link>
              </Button>
            </div>
          )}
           {/* Menú hamburguesa para móviles */}
           <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push('/')}><Home className="mr-2 h-4 w-4" />Inicio</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/search')}><Search className="mr-2 h-4 w-4" />Productos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/stores')}><Store className="mr-2 h-4 w-4" />Artesanos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/contact')}><Contact className="mr-2 h-4 w-4" />Contacto</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}

interface NavLinkProps extends React.ComponentProps<typeof Link> {
  children: React.ReactNode;
}

function NavLink({ href, children, ...props }: NavLinkProps) {
  const router = useRouter(); // Incorrecto usar useRouter para verificar active path en Server Component, pero aquí es Client
  // Para una Navbar más compleja con estado activo, se necesitaría usePathname de next/navigation
  // const pathname = usePathname();
  // const isActive = pathname === href;

  return (
    <Link
      href={href}
      className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      // className={cn(
      //   "text-sm font-medium transition-colors hover:text-primary",
      //   isActive ? "text-primary font-semibold" : "text-muted-foreground"
      // )}
      {...props}
    >
      {children}
    </Link>
  );
}

    