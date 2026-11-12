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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      likes: {
        Row: {
          created_at: string
          room_id: string
          user_uid: string
        }
        Insert: {
          created_at?: string
          room_id: string
          user_uid: string
        }
        Update: {
          created_at?: string
          room_id?: string
          user_uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          bpm: number
          contact_info: string
          created_at: string
          creator_avatar: string
          creator_name: string
          creator_uid: string | null
          genre: string
          id: string
          is_seed: boolean
          likes_count: number
          progression: string[]
          published_at: string | null
          recruitment_call: string
          status: string
          tags: string[]
          template_id: string
          title: string
        }
        Insert: {
          bpm: number
          contact_info?: string
          created_at?: string
          creator_avatar?: string
          creator_name: string
          creator_uid?: string | null
          genre?: string
          id?: string
          is_seed?: boolean
          likes_count?: number
          progression: string[]
          published_at?: string | null
          recruitment_call?: string
          status?: string
          tags?: string[]
          template_id: string
          title: string
        }
        Update: {
          bpm?: number
          contact_info?: string
          created_at?: string
          creator_avatar?: string
          creator_name?: string
          creator_uid?: string | null
          genre?: string
          id?: string
          is_seed?: boolean
          likes_count?: number
          progression?: string[]
          published_at?: string | null
          recruitment_call?: string
          status?: string
          tags?: string[]
          template_id?: string
          title?: string
        }
        Relationships: []
      }
      slots: {
        Row: {
          active_take_id: string | null
          id: string
          is_muted: boolean
          is_solo: boolean
          latency_offset_ms: number
          room_id: string
          slot_type: string
          volume: number
        }
        Insert: {
          active_take_id?: string | null
          id?: string
          is_muted?: boolean
          is_solo?: boolean
          latency_offset_ms?: number
          room_id: string
          slot_type: string
          volume?: number
        }
        Update: {
          active_take_id?: string | null
          id?: string
          is_muted?: boolean
          is_solo?: boolean
          latency_offset_ms?: number
          room_id?: string
          slot_type?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "slots_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_active_take_same_slot_fkey"
            columns: ["active_take_id", "id"]
            isOneToOne: false
            referencedRelation: "takes"
            referencedColumns: ["id", "slot_id"]
          },
        ]
      }
      takes: {
        Row: {
          audio_path: string | null
          created_at: string
          id: string
          is_ai: boolean
          latency_offset_ms: number
          musician_avatar: string
          musician_name: string
          musician_uid: string | null
          slot_id: string
        }
        Insert: {
          audio_path?: string | null
          created_at?: string
          id?: string
          is_ai?: boolean
          latency_offset_ms?: number
          musician_avatar: string
          musician_name: string
          musician_uid?: string | null
          slot_id: string
        }
        Update: {
          audio_path?: string | null
          created_at?: string
          id?: string
          is_ai?: boolean
          latency_offset_ms?: number
          musician_avatar?: string
          musician_name?: string
          musician_uid?: string | null
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "takes_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          accent_color: string
          bass_line_type: string
          bpm: number
          chords_strum_type: string
          created_at: string
          drum_groove: string
          genre: string
          icon: string
          id: string
          key: string
          melody_hook_type: string
          progression: string[]
          sort_order: number
          tagline: string
          title: string
        }
        Insert: {
          accent_color?: string
          bass_line_type?: string
          bpm: number
          chords_strum_type?: string
          created_at?: string
          drum_groove?: string
          genre?: string
          icon?: string
          id: string
          key?: string
          melody_hook_type?: string
          progression: string[]
          sort_order?: number
          tagline?: string
          title: string
        }
        Update: {
          accent_color?: string
          bass_line_type?: string
          bpm?: number
          chords_strum_type?: string
          created_at?: string
          drum_groove?: string
          genre?: string
          icon?: string
          id?: string
          key?: string
          melody_hook_type?: string
          progression?: string[]
          sort_order?: number
          tagline?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_room_with_slots: {
        Args: {
          p_bpm: number
          p_creator_avatar: string
          p_creator_name: string
          p_progression: string[]
          p_slots: Json
          p_template_id: string
          p_title: string
        }
        Returns: string
      }
      toggle_like: {
        Args: { p_room_id: string }
        Returns: {
          liked: boolean
          likes_count: number
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
