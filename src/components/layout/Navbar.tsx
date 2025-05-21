"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image"; // Import next/image
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
import { ShoppingCart, UserCircle, LogOut, Store, Search, Contact as ContactIcon, Home, Menu as MenuIcon, Loader2 } from "lucide-react";

// Helper para obtener iniciales del nombre
const getInitials = (name: string | undefined) => {
  if (!name) return "U";
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names.length > 1 ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

export default function Navbar() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<{ nombre?: string | null; rol?: string | null } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true); // Inicia como true
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchUserAndProfile = async () => {
      setIsLoading(true); // Asegurarse de que isLoading sea true al inicio de la carga
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting session in Navbar:", sessionError.message);
          setUser(null);
          setUserProfile(null);
          // No lanzar toast aquí necesariamente, podría ser intrusivo si es un error temporal de red
        } else if (session?.user) {
          setUser(session.user);
          const { data: profile, error: profileError } = await supabase
            .from("usuarios")
            .select("nombre, rol")
            .eq("id", session.user.id)
            .single();
          
          if (profileError) {
            console.error("Error fetching user profile in Navbar:", profileError.message);
            setUserProfile(null); // Limpiar perfil si hay error
          } else {
            setUserProfile(profile);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (error: any) {
        console.error("Unexpected error fetching user/profile in Navbar:", error.message);
        setUser(null);
        setUserProfile(null);
      } finally {
        setIsLoading(false); // MUY IMPORTANTE: Siempre poner isLoading en false al final
      }
    };

    fetchUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setIsLoading(true); // Poner isLoading en true al inicio del cambio de estado de auth
        if (session?.user) {
          setUser(session.user);
          const { data: profile, error: profileError } = await supabase
            .from("usuarios")
            .select("nombre, rol")
            .eq("id", session.user.id)
            .single();
          
          if (profileError) {
            console.error("Error fetching user profile on auth change:", profileError.message);
            setUserProfile(null);
          } else {
            setUserProfile(profile);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
        setIsLoading(false); // Poner isLoading en false después de procesar el cambio
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    // Los estados user y userProfile se actualizarán por el listener onAuthStateChange
    toast({ title: "Sesión Cerrada", description: "Has cerrado sesión exitosamente." });
    router.push("/");
    router.refresh(); 
    setIsMobileMenuOpen(false);
    // No es necesario setIsLoading(false) aquí si el listener de auth lo hará.
    // Pero si el listener no se dispara inmediatamente, podría ser útil.
    // Por ahora, confiamos en que el listener actualizará isLoading.
  };
  
  const userName = userProfile?.nombre || user?.email;
  const userRole = userProfile?.rol;

  const commonDropdownItems = (isMobile = false) => (
    <>
      {userRole === "artesano" && (
        <DropdownMenuItem onClick={() => { router.push("/artisan-dashboard"); if(isMobile) setIsMobileMenuOpen(false); }}>
          <Store className="mr-2 h-4 w-4" />
          <span>Mi Panel de Artesano</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => { router.push('/user-profile'); if(isMobile) setIsMobileMenuOpen(false); }}> 
        <UserCircle className="mr-2 h-4 w-4" />
        <span>Mi Perfil</span>
      </DropdownMenuItem>
      {isMobile && (
         <DropdownMenuItem onClick={() => { router.push('/cart'); setIsMobileMenuOpen(false); }}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span>Carrito</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
        <LogOut className="mr-2 h-4 w-4" />
        <span>Cerrar Sesión</span>
      </DropdownMenuItem>
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card text-card-foreground shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <Image src="/favicon.svg" alt="Arbahua logo" width={28} height={28} className="h-7 w-7" />
          <span className="text-2xl font-bold text-primary">Arbahua</span>
        </Link>

        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          <NavLink href="/">Inicio</NavLink>
          <NavLink href="/search">Productos</NavLink>
          <NavLink href="/stores">Artesanos</NavLink>
          <NavLink href="/contact">Contacto</NavLink>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {!isLoading && user && ( // Solo mostrar si no está cargando Y hay usuario
            <Button variant="ghost" size="icon" onClick={() => router.push('/cart')} className="relative hover:bg-primary/10 hidden md:inline-flex">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="sr-only">Carrito</span>
              {/* Podríamos añadir un contador de items aquí en el futuro */}
            </Button>
          )}

          {isLoading ? (
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : user ? (
            <div className="hidden md:flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 focus-visible:ring-primary">
                    <Avatar className="h-9 w-9 border border-primary/50">
                      {/* Si tienes una URL de avatar para el usuario, puedes ponerla aquí */}
                      {/* <AvatarImage src={userProfile?.avatar_url || undefined} alt={userName || 'Avatar'} /> */}
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
                      {user.email && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {commonDropdownItems()}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button asChild variant="ghost" className="hover:bg-primary/10 hover:text-primary">
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/register">Regístrate</Link>
              </Button>
            </div>
          )}
          
           <div className="md:hidden"> {/* Menú móvil */}
            <DropdownMenu open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MenuIcon className="h-6 w-6" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { router.push('/'); setIsMobileMenuOpen(false); }}><Home className="mr-2 h-4 w-4" />Inicio</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { router.push('/search'); setIsMobileMenuOpen(false); }}><Search className="mr-2 h-4 w-4" />Productos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { router.push('/stores'); setIsMobileMenuOpen(false); }}><Store className="mr-2 h-4 w-4" />Artesanos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { router.push('/contact'); setIsMobileMenuOpen(false); }}><ContactIcon className="mr-2 h-4 w-4" />Contacto</DropdownMenuItem>
                 
                 {isLoading ? (
                    <DropdownMenuItem disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando...
                    </DropdownMenuItem>
                 ) : user ? (
                  <>
                    <DropdownMenuSeparator />
                    {commonDropdownItems(true)}
                  </>
                ) : (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { router.push('/login'); setIsMobileMenuOpen(false); }}>
                      Iniciar Sesión
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { router.push('/register'); setIsMobileMenuOpen(false); }}>
                      Regístrate
                    </DropdownMenuItem>
                  </>
                )}
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
  return (
    <Link
      href={href}
      className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      {...props}
    >
      {children}
    </Link>
  );
}
