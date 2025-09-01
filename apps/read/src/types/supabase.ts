// Placeholder Supabase types - will be generated when we set up Supabase
export interface Database {
  public: {
    Tables: {
      stories: {
        Row: {
          id: string
          title: string
          age_range: [number, number]
          themes: string[]
          scenes: any[]
          is_premium: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          age_range: [number, number]
          themes: string[]
          scenes: any[]
          is_premium?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          age_range?: [number, number]
          themes?: string[]
          scenes?: any[]
          is_premium?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          created_by: string
          story_id: string
          status: string
          participants: any[]
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          created_by: string
          story_id: string
          status?: string
          participants?: any[]
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          created_by?: string
          story_id?: string
          status?: string
          participants?: any[]
          created_at?: string
          expires_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          subscription_tier: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          display_name: string
          subscription_tier?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          subscription_tier?: string
          created_at?: string
        }
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
  }
}
