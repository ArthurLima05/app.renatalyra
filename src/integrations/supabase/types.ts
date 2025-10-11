export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          origin: Database["public"]["Enums"]["patient_origin"]
          patient_id: string
          professional_id: string
          session_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          time: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          origin: Database["public"]["Enums"]["patient_origin"]
          patient_id: string
          professional_id: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          time: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          origin?: Database["public"]["Enums"]["patient_origin"]
          patient_id?: string
          professional_id?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          comment: string
          created_at: string
          date: string
          id: string
          origin: Database["public"]["Enums"]["patient_origin"]
          patient_id: string
          professional_id: string | null
          rating: number
        }
        Insert: {
          comment: string
          created_at?: string
          date: string
          id?: string
          origin: Database["public"]["Enums"]["patient_origin"]
          patient_id: string
          professional_id?: string | null
          rating: number
        }
        Update: {
          comment?: string
          created_at?: string
          date?: string
          id?: string
          origin?: Database["public"]["Enums"]["patient_origin"]
          patient_id?: string
          professional_id?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          amount: number
          created_at: string
          id: string
          installment_number: number
          paid: boolean
          paid_date: string | null
          predicted_date: string
          session_id: string | null
          total_installments: number
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          installment_number: number
          paid?: boolean
          paid_date?: string | null
          predicted_date: string
          session_id?: string | null
          total_installments: number
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          installment_number?: number
          paid?: boolean
          paid_date?: string | null
          predicted_date?: string
          session_id?: string | null
          total_installments?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          date: string
          id: string
          message: string
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      patients: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          origin: Database["public"]["Enums"]["patient_origin"]
          phone: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          origin: Database["public"]["Enums"]["patient_origin"]
          phone: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          origin?: Database["public"]["Enums"]["patient_origin"]
          phone?: string
        }
        Relationships: []
      }
      professionals: {
        Row: {
          average_rating: number | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          specialty: string
        }
        Insert: {
          average_rating?: number | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone: string
          specialty: string
        }
        Update: {
          average_rating?: number | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          specialty?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          next_appointment: string | null
          notes: string | null
          patient_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          professional_id: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          status: Database["public"]["Enums"]["appointment_status"]
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date: string
          id?: string
          next_appointment?: string | null
          notes?: string | null
          patient_id: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          professional_id?: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["appointment_status"]
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          next_appointment?: string | null
          notes?: string | null
          patient_id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          professional_id?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          patient_id: string | null
          session_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          description: string
          id?: string
          patient_id?: string | null
          session_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          patient_id?: string | null
          session_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
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
      appointment_status:
        | "agendado"
        | "confirmado"
        | "realizado"
        | "cancelado"
        | "falta"
        | "sugerido"
      notification_type: "cancelamento" | "falta" | "agendamento" | "feedback"
      patient_origin: "Google Ads" | "Instagram" | "Indicação" | "Outro"
      payment_status: "pago" | "em_aberto"
      session_type: "primeira_consulta" | "consulta_avulsa" | "retorno"
      transaction_type: "entrada" | "saida"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "agendado",
        "confirmado",
        "realizado",
        "cancelado",
        "falta",
        "sugerido",
      ],
      notification_type: ["cancelamento", "falta", "agendamento", "feedback"],
      patient_origin: ["Google Ads", "Instagram", "Indicação", "Outro"],
      payment_status: ["pago", "em_aberto"],
      session_type: ["primeira_consulta", "consulta_avulsa", "retorno"],
      transaction_type: ["entrada", "saida"],
    },
  },
} as const
