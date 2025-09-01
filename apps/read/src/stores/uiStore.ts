import { create } from 'zustand'

interface UIState {
  mode: 'storybook' | 'video-first' | 'default'
  isMenuOpen: boolean
  isLoading: boolean
  error: string | null
  storyTextScale: number
}

interface UIActions {
  setMode: (mode: UIState['mode']) => void
  setMenuOpen: (open: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setStoryTextScale: (scale: number) => void
  reset: () => void
}

const initialState: UIState = {
  mode: 'default',
  isMenuOpen: false,
  isLoading: false,
  error: null,
  storyTextScale: 1,
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  ...initialState,

  setMode: (mode) => set({ mode }),

  setMenuOpen: (open) => set({ isMenuOpen: open }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setStoryTextScale: (scale) => {
    const clampedScale = Math.max(0.75, Math.min(1.75, scale))
    set({ storyTextScale: clampedScale })
    
    // Persist to localStorage
    try {
      localStorage.setItem('storyTextScale', String(clampedScale))
    } catch (e) {
      console.warn('Failed to save text scale to localStorage')
    }
    
    // Update CSS variable
    document.documentElement.style.setProperty('--story-text-scale', String(clampedScale))
  },

  reset: () => set(initialState),
}))
