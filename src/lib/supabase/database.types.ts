
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      auditoria_usuarios: {
        Row: {
          id: string
          usuario_id: string
          accion: string
          fecha: string | null
          detalles: Json | null
        }
        Insert: {
          id?: string
          usuario_id: string
          accion: string
          fecha?: string | null
          detalles?: Json | null
        }
        Update: {
          id?: string
          usuario_id?: string
          accion?: string
          fecha?: string | null
          detalles?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_usuarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      carritos: {
        Row: {
          id: string
          cliente_id: string
        }
        Insert: {
          id?: string
          cliente_id: string
        }
        Update: {
          id?: string
          cliente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carritos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false // A client can have only one active cart conceptually, but FK allows multiple.
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      categorias: { // Normalized from "categorías"
        Row: {
          id: string
          nombre: string
          descripcion: string | null
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
        }
        Relationships: []
      }
      detalle_pedido: {
        Row: {
          pedido_id: string
          producto_id: string
          cantidad: number
          precio: number
        }
        Insert: {
          pedido_id: string
          producto_id: string
          cantidad: number
          precio: number
        }
        Update: {
          pedido_id?: string
          producto_id?: string
          cantidad?: number
          precio?: number
        }
        Relationships: [
          {
            foreignKeyName: "detalle_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_pedido_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          }
        ]
      }
      direcciones: {
        Row: {
          id: string
          cliente_id: string
          calle: string
          ciudad: string
          estado: string
          codigo_postal: string // Normalized from "código_postal"
          pais: string // Normalized from "país"
        }
        Insert: {
          id?: string
          cliente_id: string
          calle: string
          ciudad: string
          estado: string
          codigo_postal: string
          pais: string
        }
        Update: {
          id?: string
          cliente_id?: string
          calle?: string
          ciudad?: string
          estado?: string
          codigo_postal?: string
          pais?: string
        }
        Relationships: [
          {
            foreignKeyName: "direcciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      imagenes_productos: {
        Row: {
          id: string
          producto_id: string
          url: string | null
          file_path: string | null
          es_principal: boolean | null
          orden: number | null
        }
        Insert: {
          id?: string
          producto_id: string
          url?: string | null
          file_path?: string | null
          es_principal?: boolean | null
          orden?: number | null
        }
        Update: {
          id?: string
          producto_id?: string
          url?: string | null
          file_path?: string | null
          es_principal?: boolean | null
          orden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imagenes_productos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          }
        ]
      }
      items_carrito: {
        Row: {
          carrito_id: string
          producto_id: string
          cantidad: number
        }
        Insert: {
          carrito_id: string
          producto_id: string
          cantidad: number
        }
        Update: {
          carrito_id?: string
          producto_id?: string
          cantidad?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_carrito_carrito_id_fkey"
            columns: ["carrito_id"]
            isOneToOne: false
            referencedRelation: "carritos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_carrito_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          }
        ]
      }
      notificaciones_artesanos: {
        Row: {
          id: string
          artesano_id: string
          mensaje: string | null
          leido: boolean | null
          fecha: string | null
        }
        Insert: {
          id?: string
          artesano_id: string
          mensaje?: string | null
          leido?: boolean | null
          fecha?: string | null
        }
        Update: {
          id?: string
          artesano_id?: string
          mensaje?: string | null
          leido?: boolean | null
          fecha?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_artesanos_artesano_id_fkey"
            columns: ["artesano_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      pagos: {
        Row: {
          id: string
          pedido_id: string
          monto: number
          metodo_pago: string // Normalized from "método_pago"
          fecha_pago: string | null
          estado: Database["public"]["Enums"]["estado_pago_type"]
        }
        Insert: {
          id?: string
          pedido_id: string
          monto: number
          metodo_pago: string
          fecha_pago?: string | null
          estado: Database["public"]["Enums"]["estado_pago_type"]
        }
        Update: {
          id?: string
          pedido_id?: string
          monto?: number
          metodo_pago?: string
          fecha_pago?: string | null
          estado?: Database["public"]["Enums"]["estado_pago_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pagos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          }
        ]
      }
      pedidos: {
        Row: {
          id: string
          cliente_id: string
          direccion_id: string
          total: number
          estado: Database["public"]["Enums"]["estado_pedido_type"]
          fecha_pedido: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          direccion_id: string
          total: number
          estado: Database["public"]["Enums"]["estado_pedido_type"]
          fecha_pedido?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          direccion_id?: string
          total?: number
          estado?: Database["public"]["Enums"]["estado_pedido_type"]
          fecha_pedido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_direccion_id_fkey"
            columns: ["direccion_id"]
            isOneToOne: false
            referencedRelation: "direcciones"
            referencedColumns: ["id"]
          }
        ]
      }
      producto_categoria: {
        Row: {
          producto_id: string
          categoria_id: string
        }
        Insert: {
          producto_id: string
          categoria_id: string
        }
        Update: {
          producto_id?: string
          categoria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_categoria_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias" // Normalized
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_categoria_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          }
        ]
      }
      productos: {
        Row: {
          id: string
          tienda_id: string
          nombre: string
          descripcion: string | null
          precio: number
          stock: number
          estado: Database["public"]["Enums"]["estado_producto_type"]
          metadatos: Json | null
          fecha_creacion: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tienda_id: string
          nombre: string
          descripcion?: string | null
          precio: number
          stock: number
          estado?: Database["public"]["Enums"]["estado_producto_type"]
          metadatos?: Json | null
          fecha_creacion?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tienda_id?: string
          nombre?: string
          descripcion?: string | null
          precio?: number
          stock?: number
          estado?: Database["public"]["Enums"]["estado_producto_type"]
          metadatos?: Json | null
          fecha_creacion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas"
            referencedColumns: ["id"]
          }
        ]
      }
      resenas: { // Normalized from "reseñas"
        Row: {
          id: string
          cliente_id: string
          producto_id: string
          puntuacion: number // Normalized from "puntuación"
          comentario: string | null
          fecha_resena: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          producto_id: string
          puntuacion: number
          comentario?: string | null
          fecha_resena?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          producto_id?: string
          puntuacion?: number
          comentario?: string | null
          fecha_resena?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseñas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseñas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          }
        ]
      }
      tiendas: {
        Row: {
          id: string
          artesano_id: string
          nombre: string
          descripcion: string | null
          logo_url: string | null
          logo_file_path: string | null
          fecha_creacion: string | null
          updated_at: string | null
          estado: Database["public"]["Enums"]["estado_tienda_type"]
        }
        Insert: {
          id?: string
          artesano_id: string
          nombre: string
          descripcion?: string | null
          logo_url?: string | null
          logo_file_path?: string | null
          fecha_creacion?: string | null
          updated_at?: string | null
          estado?: Database["public"]["Enums"]["estado_tienda_type"]
        }
        Update: {
          id?: string
          artesano_id?: string
          nombre?: string
          descripcion?: string | null
          logo_url?: string | null
          logo_file_path?: string | null
          fecha_creacion?: string | null
          updated_at?: string | null
          estado?: Database["public"]["Enums"]["estado_tienda_type"]
        }
        Relationships: [
          {
            foreignKeyName: "tiendas_artesano_id_fkey"
            columns: ["artesano_id"]
            isOneToOne: false // Un artesano puede tener una tienda, una tienda pertenece a un artesano.
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      usuarios: {
        Row: {
          id: string
          nombre: string
          email: string
          rol: Database["public"]["Enums"]["rol_type"]
          fecha_registro: string | null
          updated_at: string | null
          eliminado: boolean
        }
        Insert: {
          id: string // Corresponds to auth.users.id
          nombre: string
          email: string
          rol: Database["public"]["Enums"]["rol_type"]
          fecha_registro?: string | null
          updated_at?: string | null
          eliminado?: boolean
        }
        Update: {
          id?: string
          nombre?: string
          email?: string
          rol?: Database["public"]["Enums"]["rol_type"]
          fecha_registro?: string | null
          updated_at?: string | null
          eliminado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_pago_type: "Aprobado" | "Rechazado"
      estado_pedido_type: "Pendiente" | "Enviado" | "Entregado" | "Cancelado"
      estado_producto_type: "activo" | "inactivo" | "borrador"
      estado_tienda_type: "activa" | "inactiva"
      rol_type: "cliente" | "artesano" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
