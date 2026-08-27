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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      beliefs: {
        Row: {
          confidence: number
          created_at: string
          id: string
          origin: string
          proposition: string
          provenance: string | null
          stance: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          origin?: string
          proposition: string
          provenance?: string | null
          stance: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          origin?: string
          proposition?: string
          provenance?: string | null
          stance?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beliefs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          category: string
          created_at: string
          first_known_at: string | null
          id: string
          name: string
          status: string
          subject_id: string
          taught_by: string | null
          understanding: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          first_known_at?: string | null
          id?: string
          name: string
          status?: string
          subject_id: string
          taught_by?: string | null
          understanding?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          first_known_at?: string | null
          id?: string
          name?: string
          status?: string
          subject_id?: string
          taught_by?: string | null
          understanding?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concepts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          subject_id: string
          user_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          subject_id: string
          user_label?: string
        }
        Update: {
          created_at?: string
          id?: string
          subject_id?: string
          user_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fork_events: {
        Row: {
          confidence: number
          created_at: string
          date_label: string | null
          description: string | null
          divergence: string
          fork_id: string
          id: string
          title: string
          year: number
        }
        Insert: {
          confidence?: number
          created_at?: string
          date_label?: string | null
          description?: string | null
          divergence?: string
          fork_id: string
          id?: string
          title: string
          year: number
        }
        Update: {
          confidence?: number
          created_at?: string
          date_label?: string | null
          description?: string | null
          divergence?: string
          fork_id?: string
          id?: string
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fork_events_fork_id_fkey"
            columns: ["fork_id"]
            isOneToOne: false
            referencedRelation: "forks"
            referencedColumns: ["id"]
          },
        ]
      }
      forks: {
        Row: {
          confidence: number
          created_at: string
          created_by: string | null
          divergence_label: string | null
          divergence_year: number
          id: string
          label: string
          premise: string
          self_account: string | null
          status: string
          subject_id: string
          summary: string | null
        }
        Insert: {
          confidence?: number
          created_at?: string
          created_by?: string | null
          divergence_label?: string | null
          divergence_year: number
          id?: string
          label: string
          premise: string
          self_account?: string | null
          status?: string
          subject_id: string
          summary?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string
          created_by?: string | null
          divergence_label?: string | null
          divergence_year?: number
          id?: string
          label?: string
          premise?: string
          self_account?: string | null
          status?: string
          subject_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_log: {
        Row: {
          confidence: number | null
          conversation_id: string | null
          created_at: string
          id: string
          kind: string
          state_after: string | null
          state_before: string | null
          subject_id: string
          summary: string
        }
        Insert: {
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          kind: string
          state_after?: string | null
          state_before?: string | null
          subject_id: string
          summary: string
        }
        Update: {
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          state_after?: string | null
          state_before?: string | null
          subject_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_log_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      life_events: {
        Row: {
          created_at: string
          date_label: string | null
          description: string | null
          id: string
          salience: number
          source_label: string | null
          subject_id: string
          title: string
          year: number
        }
        Insert: {
          created_at?: string
          date_label?: string | null
          description?: string | null
          id?: string
          salience?: number
          source_label?: string | null
          subject_id: string
          title: string
          year: number
        }
        Update: {
          created_at?: string
          date_label?: string | null
          description?: string | null
          id?: string
          salience?: number
          source_label?: string | null
          subject_id?: string
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "life_events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          confidence: number
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          impact: string | null
          learned_label: string | null
          scope: string
          source_label: string | null
          strength: number
          subject_id: string
          title: string
        }
        Insert: {
          confidence?: number
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          impact?: string | null
          learned_label?: string | null
          scope?: string
          source_label?: string | null
          strength?: number
          subject_id: string
          title: string
        }
        Update: {
          confidence?: number
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          impact?: string | null
          learned_label?: string | null
          scope?: string
          source_label?: string | null
          strength?: number
          subject_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          meta: Json
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          meta?: Json
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          meta?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          confidence: number
          created_at: string
          description: string | null
          id: string
          name: string
          relation: string
          sentiment: number
          subject_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          relation: string
          sentiment?: number
          subject_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          relation?: string
          sentiment?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          citation: string | null
          coverage: string | null
          created_at: string
          id: string
          kind: string
          licence: string | null
          subject_id: string
          tier: number
          title: string
          url: string | null
        }
        Insert: {
          citation?: string | null
          coverage?: string | null
          created_at?: string
          id?: string
          kind: string
          licence?: string | null
          subject_id: string
          tier?: number
          title: string
          url?: string | null
        }
        Update: {
          citation?: string | null
          coverage?: string | null
          created_at?: string
          id?: string
          kind?: string
          licence?: string | null
          subject_id?: string
          tier?: number
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          birth_year: number | null
          created_at: string
          cutoff_label: string
          cutoff_year: number
          death_year: number | null
          epitaph: string | null
          honorific: string | null
          id: string
          name: string
          portrait_url: string | null
          reconstructed_at: string
          reveal_status: string
          slug: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          cutoff_label: string
          cutoff_year: number
          death_year?: number | null
          epitaph?: string | null
          honorific?: string | null
          id?: string
          name: string
          portrait_url?: string | null
          reconstructed_at?: string
          reveal_status?: string
          slug: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          cutoff_label?: string
          cutoff_year?: number
          death_year?: number | null
          epitaph?: string | null
          honorific?: string | null
          id?: string
          name?: string
          portrait_url?: string | null
          reconstructed_at?: string
          reveal_status?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
