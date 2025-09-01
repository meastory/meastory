import { create } from 'zustand'
import { createClient } from '@supabase/supabase-js'
import type { Database, Tables } from '../types/supabase'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

type User = Tables<'user_profiles'>

interface AuthState {
  user: User | null
  session: any | null
  loading: boolean
  initialized: boolean
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setUser: (user: User | null) => void
  setSession: (session: any | null) => void
  setLoading: (loading: boolean) => void
  initialize: () => Promise<void>
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  initialized: false,
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...initialState,

  signIn: async (email: string, password: string) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // The auth state change will be handled by the listener
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  signUp: async (email: string, password: string) => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      set({ loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  signOut: async () => {
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // The auth state change will be handled by the listener
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error

      if (session?.user) {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError)
        }

        set({
          session,
          user: profile || null,
          loading: false,
          initialized: true
        })
      } else {
        set({
          session: null,
          user: null,
          loading: false,
          initialized: true
        })
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)

        if (session?.user) {
          // Fetch or create user profile
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError && profileError.code === 'PGRST116') {
            // Profile not found, it should be created by the trigger
            console.log('Profile not found, waiting for trigger to create it')
          } else if (profileError) {
            console.error('Error fetching profile:', profileError)
          }

          set({
            session,
            user: profile || null,
            loading: false
          })
        } else {
          set({
            session: null,
            user: null,
            loading: false
          })
        }
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({
        session: null,
        user: null,
        loading: false,
        initialized: true
      })
    }
  },
}))
