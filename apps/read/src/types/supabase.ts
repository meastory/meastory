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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      connection_events: {
        Row: {
          client_id: string | null
          detail: Json
          event_type: Database["public"]["Enums"]["connection_event_type"]
          id: number
          room_code: string
          session_id: string
          ts: string
        }
        Insert: {
          client_id?: string | null
          detail?: Json
          event_type: Database["public"]["Enums"]["connection_event_type"]
          id?: number
          room_code: string
          session_id: string
          ts?: string
        }
        Update: {
          client_id?: string | null
          detail?: Json
          event_type?: Database["public"]["Enums"]["connection_event_type"]
          id?: number
          room_code?: string
          session_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      device_limits: {
        Row: {
          day: string
          device_hash: string
          id: number
          ip_hash: string
          session_count: number
          updated_at: string
        }
        Insert: {
          day: string
          device_hash: string
          id?: number
          ip_hash: string
          session_count?: number
          updated_at?: string
        }
        Update: {
          day?: string
          device_hash?: string
          id?: number
          ip_hash?: string
          session_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      guest_sessions: {
        Row: {
          device_hash: string
          ended_at: string | null
          id: string
          ip_hash: string | null
          last_seen_at: string
          role: string
          room_code: string
          room_id: string
          started_at: string
        }
        Insert: {
          device_hash: string
          ended_at?: string | null
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          role: string
          room_code: string
          room_id: string
          started_at?: string
        }
        Update: {
          device_hash?: string
          ended_at?: string | null
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          role?: string
          room_code?: string
          room_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_participants: {
        Row: {
          id: string
          is_connected: boolean | null
          joined_at: string
          left_at: string | null
          participant_name: string
          role: Database["public"]["Enums"]["participant_role"] | null
          room_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          is_connected?: boolean | null
          joined_at?: string
          left_at?: string | null
          participant_name: string
          role?: Database["public"]["Enums"]["participant_role"] | null
          room_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          is_connected?: boolean | null
          joined_at?: string
          left_at?: string | null
          participant_name?: string
          role?: Database["public"]["Enums"]["participant_role"] | null
          room_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_progress: {
        Row: {
          current_scene_id: string | null
          id: string
          progress_data: Json | null
          room_id: string
          updated_at: string
        }
        Insert: {
          current_scene_id?: string | null
          id?: string
          progress_data?: Json | null
          room_id: string
          updated_at?: string
        }
        Update: {
          current_scene_id?: string | null
          id?: string
          progress_data?: Json | null
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_progress_current_scene_id_fkey"
            columns: ["current_scene_id"]
            isOneToOne: false
            referencedRelation: "story_scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_progress_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_sessions: {
        Row: {
          device_hash: string | null
          ends_at: string | null
          id: string
          ip_hash: string | null
          room_id: string
          started_at: string
          tier: string
          user_id: string | null
        }
        Insert: {
          device_hash?: string | null
          ends_at?: string | null
          id?: string
          ip_hash?: string | null
          room_id: string
          started_at?: string
          tier: string
          user_id?: string | null
        }
        Update: {
          device_hash?: string | null
          ends_at?: string | null
          id?: string
          ip_hash?: string | null
          room_id?: string
          started_at?: string
          tier?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_sessions_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["key"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string | null
          created_at: string
          current_scene_id: string | null
          current_story_id: string | null
          ended_at: string | null
          host_id: string | null
          id: string
          max_participants: number | null
          name: string
          settings: Json | null
          status: Database["public"]["Enums"]["room_status"] | null
          story_id: string | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          current_scene_id?: string | null
          current_story_id?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          max_participants?: number | null
          name: string
          settings?: Json | null
          status?: Database["public"]["Enums"]["room_status"] | null
          story_id?: string | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          current_scene_id?: string | null
          current_story_id?: string | null
          ended_at?: string | null
          host_id?: string | null
          id?: string
          max_participants?: number | null
          name?: string
          settings?: Json | null
          status?: Database["public"]["Enums"]["room_status"] | null
          story_id?: string | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          access_tier: string | null
          age_max: number | null
          age_min: number | null
          author_id: string | null
          content: Json | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          personalization_tokens: string[] | null
          slug: string
          status: Database["public"]["Enums"]["story_status"] | null
          story_type: string | null
          themes: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          access_tier?: string | null
          age_max?: number | null
          age_min?: number | null
          author_id?: string | null
          content?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          personalization_tokens?: string[] | null
          slug: string
          status?: Database["public"]["Enums"]["story_status"] | null
          story_type?: string | null
          themes?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          access_tier?: string | null
          age_max?: number | null
          age_min?: number | null
          author_id?: string | null
          content?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          personalization_tokens?: string[] | null
          slug?: string
          status?: Database["public"]["Enums"]["story_status"] | null
          story_type?: string | null
          themes?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      story_scenes: {
        Row: {
          audio_url: string | null
          background_image_url: string | null
          choices: Json | null
          content: string
          created_at: string
          id: string
          scene_order: number
          story_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          background_image_url?: string | null
          choices?: Json | null
          content: string
          created_at?: string
          id?: string
          scene_order: number
          story_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          background_image_url?: string | null
          choices?: Json | null
          content?: string
          created_at?: string
          id?: string
          scene_order?: number
          story_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_scenes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          duration_minutes: number | null
          inroom_warning_threshold_minutes: number | null
          key: string
          max_participants: number | null
          rank: number
          sessions_per_day: number | null
          show_timer_in_menu: boolean | null
          show_timer_in_waiting: boolean | null
        }
        Insert: {
          duration_minutes?: number | null
          inroom_warning_threshold_minutes?: number | null
          key: string
          max_participants?: number | null
          rank: number
          sessions_per_day?: number | null
          show_timer_in_menu?: boolean | null
          show_timer_in_waiting?: boolean | null
        }
        Update: {
          duration_minutes?: number | null
          inroom_warning_threshold_minutes?: number | null
          key?: string
          max_participants?: number | null
          rank?: number
          sessions_per_day?: number | null
          show_timer_in_menu?: boolean | null
          show_timer_in_waiting?: boolean | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          preferences: Json | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          preferences?: Json | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferences?: Json | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["key"]
          },
        ]
      }
    }
    Views: {
      v_daily_invites: {
        Row: {
          day: string | null
          sessions_started: number | null
        }
        Relationships: []
      }
      v_time_to_audio_only_ms: {
        Row: {
          browser: string | null
          browser_version: string | null
          device_class: string | null
          median_time_to_audio_only_ms: number | null
          network_type: string | null
          os: string | null
          week: string | null
        }
        Relationships: []
      }
      v_weekly_connection_success: {
        Row: {
          attempts: number | null
          success_rate_pct: number | null
          successes: number | null
          week: string | null
        }
        Relationships: []
      }
      v_weekly_relay_rate: {
        Row: {
          browser: string | null
          browser_version: string | null
          device_class: string | null
          network_type: string | null
          os: string | null
          relay_firsts: number | null
          relay_rate_pct: number | null
          sessions: number | null
          week: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      effective_tier: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      end_room_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      generate_unique_room_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      guest_check_and_start_session: {
        Args: { p_device_hash: string; p_ip_hash: string; p_room_code: string }
        Returns: {
          role: string
          room_code: string
          room_id: string
          session_id: string
          started_at: string
        }[]
      }
      heartbeat_room_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      room_effective_tier: {
        Args: { p_room_id: string }
        Returns: string
      }
      rpc_create_guest_room: {
        Args: { p_name: string; p_story_id?: string }
        Returns: {
          code: string
          created_at: string
          id: string
          max_participants: number
          name: string
          status: Database["public"]["Enums"]["room_status"]
          story_id: string
        }[]
      }
      rpc_end_guest_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      rpc_heartbeat_guest_session: {
        Args: { p_room_code: string; p_session_id: string }
        Returns: undefined
      }
      rpc_log_connection_event: {
        Args: {
          p_client_id: string
          p_detail?: Json
          p_event_type: Database["public"]["Enums"]["connection_event_type"]
          p_room_code: string
          p_session_id: string
        }
        Returns: undefined
      }
      rpc_update_room_scene: {
        Args: { p_room_id: string; p_scene_id: string; p_story_id: string }
        Returns: undefined
      }
      start_room_session: {
        Args: {
          p_device_hash?: string
          p_ip_hash?: string
          p_room_code: string
          p_user_id?: string
        }
        Returns: {
          duration_ms: number
          room_id: string
          session_id: string
          started_at: string
          tier: string
        }[]
      }
      tier_rank: {
        Args: { t: string }
        Returns: number
      }
      upsert_story: {
        Args: {
          p_access_tier: string
          p_content: Json
          p_description: string
          p_slug: string
          p_status: Database["public"]["Enums"]["story_status"]
          p_title: string
        }
        Returns: string
      }
    }
    Enums: {
      connection_event_type:
        | "connect_start"
        | "connected"
        | "retry"
        | "ice_failed"
        | "ended"
        | "selected_candidate_pair"
        | "audio_only_enabled"
        | "audio_only_restored"
        | "reconnected"
      participant_role: "host" | "participant"
      room_status: "waiting" | "active" | "ended"
      story_status: "draft" | "published" | "archived"
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
      connection_event_type: [
        "connect_start",
        "connected",
        "retry",
        "ice_failed",
        "ended",
        "selected_candidate_pair",
        "audio_only_enabled",
        "audio_only_restored",
        "reconnected",
      ],
      participant_role: ["host", "participant"],
      room_status: ["waiting", "active", "ended"],
      story_status: ["draft", "published", "archived"],
    },
  },
} as const
