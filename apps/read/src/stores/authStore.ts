import { create } from 'zustand'
import { createClient } from '@supabase/supabase-js'
import type { Database, Tables } from '../types/supabase'
import type { Session } from '@supabase/supabase-js'

// Environment variable validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch {
  throw new Error(`Invalid VITE_SUPABASE_URL format: ${supabaseUrl}`)
}

// Validate API key format (should be a JWT)
if (!supabaseAnonKey.includes('.') || supabaseAnonKey.split('.').length !== 3) {
  throw new Error('Invalid VITE_SUPABASE_ANON_KEY format - should be a JWT token')
}

console.log('🔧 Supabase client initialized with URL:', supabaseUrl)

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

type User = Tables<'user_profiles'>

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
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
    console.log('�� Attempting sign in for:', email)
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ Sign in error:', error)
        throw error
      }

      console.log('✅ Sign in successful for user:', data.user?.id)
      // The auth state change will be handled by the listener
    } catch (error) {
      console.error('❌ Sign in failed:', error)
      set({ loading: false })
      throw error
    }
  },

  signUp: async (email: string, password: string) => {
    console.log('👤 Attempting sign up for:', email)
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('❌ Sign up error:', error)
        throw error
      }

      console.log('✅ Sign up successful for user:', data.user?.id)
      set({ loading: false })
    } catch (error) {
      console.error('❌ Sign up failed:', error)
      set({ loading: false })
      throw error
    }
  },

  signOut: async () => {
    console.log('🚪 Signing out user')
    set({ loading: true })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Sign out error:', error)
        throw error
      }

      console.log('✅ Sign out successful')
      // The auth state change will be handled by the listener
    } catch (error) {
      console.error('❌ Sign out failed:', error)
      set({ loading: false })
      throw error
    }
  },

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),

  initialize: async () => {
    console.log('🔄 Initializing auth...')
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Session retrieval error:', error)
        throw error
      }

      if (session?.user) {
        console.log('📋 Found existing session for user:', session.user.id)
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('❌ Profile fetch error:', profileError)
        } else if (profile) {
          console.log('👤 Profile loaded:', profile.display_name || 'User')
        }

        set({
          session,
          user: profile || null,
          loading: false,
          initialized: true
        })
      } else {
        console.log('📋 No existing session found')
        set({
          session: null,
          user: null,
          loading: false,
          initialized: true
        })
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.id || 'no user')

        if (session?.user) {
          // Fetch or create user profile
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError && profileError.code === 'PGRST116') {
            // Profile not found, it should be created by the trigger
            console.log('⚠️ Profile not found, waiting for trigger to create it')
          } else if (profileError) {
            console.error('❌ Profile fetch error:', profileError)
          } else if (profile) {
            console.log('👤 Profile updated:', profile.display_name || 'User')
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
      console.error('❌ Auth initialization error:', error)
      set({
        session: null,
        user: null,
        loading: false,
        initialized: true
      })
    }
  },
}))
