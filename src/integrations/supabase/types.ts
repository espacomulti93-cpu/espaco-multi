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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          id: string
          motivo_cancelamento: string | null
          observacoes: string | null
          paciente_id: string
          profissional_id: string
          recorrencia: Database["public"]["Enums"]["recorrencia_tipo"]
          recorrencia_grupo: string | null
          sala_id: string | null
          servico_id: string | null
          status: Database["public"]["Enums"]["agendamento_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          paciente_id: string
          profissional_id: string
          recorrencia?: Database["public"]["Enums"]["recorrencia_tipo"]
          recorrencia_grupo?: string | null
          sala_id?: string | null
          servico_id?: string | null
          status?: Database["public"]["Enums"]["agendamento_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          paciente_id?: string
          profissional_id?: string
          recorrencia?: Database["public"]["Enums"]["recorrencia_tipo"]
          recorrencia_grupo?: string | null
          sala_id?: string | null
          servico_id?: string | null
          status?: Database["public"]["Enums"]["agendamento_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      bloqueios_agenda: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          id: string
          motivo: string | null
          profissional_id: string | null
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          id?: string
          motivo?: string | null
          profissional_id?: string | null
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          motivo?: string | null
          profissional_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bloqueios_agenda_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      fatura_itens: {
        Row: {
          agendamento_id: string | null
          created_at: string
          descricao: string
          fatura_id: string
          id: string
          quantidade: number
          total: number
          valor_unitario: number
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string
          descricao: string
          fatura_id: string
          id?: string
          quantidade?: number
          total?: number
          valor_unitario?: number
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string
          descricao?: string
          fatura_id?: string
          id?: string
          quantidade?: number
          total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "fatura_itens_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          competencia: string
          created_at: string
          id: string
          metodo: Database["public"]["Enums"]["metodo_pagamento"] | null
          observacoes: string | null
          paciente_id: string
          pago_em: string | null
          status: Database["public"]["Enums"]["fatura_status"]
          updated_at: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pagamento"] | null
          observacoes?: string | null
          paciente_id: string
          pago_em?: string | null
          status?: Database["public"]["Enums"]["fatura_status"]
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pagamento"] | null
          observacoes?: string | null
          paciente_id?: string
          pago_em?: string | null
          status?: Database["public"]["Enums"]["fatura_status"]
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          cid_principal: string | null
          cids_secundarios: string[] | null
          convenio_nome: string | null
          created_at: string
          data_nascimento: string | null
          foto_url: string | null
          id: string
          nome: string
          observacoes: string | null
          status: Database["public"]["Enums"]["paciente_status"]
          tipo_atendimento: Database["public"]["Enums"]["tipo_atendimento"]
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          cid_principal?: string | null
          cids_secundarios?: string[] | null
          convenio_nome?: string | null
          created_at?: string
          data_nascimento?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["paciente_status"]
          tipo_atendimento?: Database["public"]["Enums"]["tipo_atendimento"]
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          cid_principal?: string | null
          cids_secundarios?: string[] | null
          convenio_nome?: string | null
          created_at?: string
          data_nascimento?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["paciente_status"]
          tipo_atendimento?: Database["public"]["Enums"]["tipo_atendimento"]
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      profissionais: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          email: string | null
          especialidade: string | null
          id: string
          nome: string
          registro: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
          valor_sessao: number | null
          valores_config: Json | null
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          email?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          registro?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          valor_sessao?: number | null
          valores_config?: Json | null
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          email?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          registro?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          valor_sessao?: number | null
          valores_config?: Json | null
        }
        Relationships: []
      }
      responsaveis: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          paciente_id: string
          parentesco: string | null
          telefone: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          paciente_id: string
          parentesco?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          paciente_id?: string
          parentesco?: string | null
          telefone?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responsaveis_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      salas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          duracao_minutos: number
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          duracao_minutos?: number
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          duracao_minutos?: number
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      agendamento_status:
        | "pendente"
        | "confirmado"
        | "cancelado"
        | "realizado"
        | "falta"
      app_role: "admin" | "recepcionista" | "profissional"
      fatura_status: "aberta" | "paga" | "vencida" | "cancelada"
      metodo_pagamento:
        | "pix"
        | "dinheiro"
        | "cartao_credito"
        | "cartao_debito"
        | "transferencia"
        | "boleto"
        | "convenio"
        | "outro"
      paciente_status: "ativo" | "inativo" | "lista_espera"
      recorrencia_tipo: "unica" | "semanal" | "quinzenal" | "mensal"
      tipo_atendimento: "particular" | "convenio"
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
      agendamento_status: [
        "pendente",
        "confirmado",
        "cancelado",
        "realizado",
        "falta",
      ],
      app_role: ["admin", "recepcionista", "profissional"],
      fatura_status: ["aberta", "paga", "vencida", "cancelada"],
      metodo_pagamento: [
        "pix",
        "dinheiro",
        "cartao_credito",
        "cartao_debito",
        "transferencia",
        "boleto",
        "convenio",
        "outro",
      ],
      paciente_status: ["ativo", "inativo", "lista_espera"],
      recorrencia_tipo: ["unica", "semanal", "quinzenal", "mensal"],
      tipo_atendimento: ["particular", "convenio"],
    },
  },
} as const
