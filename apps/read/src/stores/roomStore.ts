import { create } from 'zustand'
import { supabase } from './authStore'
import type { Tables } from '../types/supabase'

type Room = Tables<'rooms'>
type Story = Tables<'stories'>
type StoryScene = Tables<'story_scenes'>
type RoomParticipant = Tables<'room_participants'>

interface RoomState {
  currentRoom: Room | null
  currentStory: Story | null
  currentScene: StoryScene | null
  participants: RoomParticipant[]
  isLoading: boolean
  error: string | null
  childName: string
}

interface RoomActions {
  enterRoom: (roomId: string) => Promise<void>
  loadStory: (storyId: string) => Promise<void>
  loadScene: (sceneId: string | number) => Promise<void>
  loadParticipants: (roomId: string) => Promise<void>
  leaveRoom: () => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  setChildName: (name: string) => void
}

const initialState: RoomState = {
  currentRoom: null,
  currentStory: null,
  currentScene: null,
  participants: [],
  isLoading: false,
  error: null,
  childName: localStorage.getItem('childName') || 'Alex',
}

export const useRoomStore = create<RoomState & RoomActions>((set, get) => ({
  ...initialState,

  setChildName: (name: string) => {
    set({ childName: name })
    localStorage.setItem('childName', name)
  },

  setError: (error: string | null) => set({ error }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),

  enterRoom: async (roomId: string) => {
    console.log('🎭 Entering room:', roomId)
    set({ isLoading: true, error: null })

    try {
      // Load room details
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (roomError) throw roomError

      console.log('📋 Room loaded:', room.name, 'Code:', room.code, 'Story ID:', room.story_id)

      set({ currentRoom: room })

      // Load story if one is selected
      if (room.story_id) {
        console.log('📚 Room has story_id, loading story:', room.story_id)
        await get().loadStory(room.story_id)
      } else {
        console.log('⚠️ Room has no story_id - no story will be loaded')
      }

      // Load participants
      await get().loadParticipants(roomId)

      // Connect to WebRTC
      console.log('🔗 Connecting to WebRTC for room:', room.code)
      try {
        // Dynamic import to avoid circular dependency
        const webrtcModule = await import('./webrtcStore')
        const webrtcStore = webrtcModule.useWebRTCStore
        await webrtcStore.getState().connect(roomId, room.code)
        console.log('✅ WebRTC connected successfully')
      } catch (webrtcError) {
        console.error('❌ WebRTC connection failed:', webrtcError)
        // Don't fail room entry if WebRTC fails, just log it
      }

      console.log('✅ Successfully entered room')
    } catch (error: any) {
      console.error('❌ Error entering room:', error)
      set({ error: error.message })
    } finally {
      set({ isLoading: false })
    }
  },

  loadStory: async (storyId: string) => {
    console.log('📚 Loading story:', storyId)
    try {
      const { data: story, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single()

      if (error) throw error

      console.log('📖 Story loaded:', story.title, 'ID:', story.id)
      set({ currentStory: story })

      // Load first scene if it exists
      const { data: firstScene } = await supabase
        .from('story_scenes')
        .select('*')
        .eq('story_id', storyId)
        .eq('scene_order', 1)
        .single()

      if (firstScene) {
        console.log('🎬 First scene loaded:', firstScene.title)
        set({ currentScene: firstScene })
      } else {
        console.log('⚠️ No first scene found for story')
        set({ currentScene: null })
      }
    } catch (error: any) {
      console.error('❌ Error loading story:', error)
      set({ error: error.message })
    }
  },

  loadScene: async (sceneId: string | number) => {
    console.log('🎬 Loading scene:', sceneId)

    try {
      let query = supabase
        .from('story_scenes')
        .select('*')

      if (typeof sceneId === 'string') {
        query = query.eq('id', sceneId)
      } else {
        const currentStory = get().currentStory
        if (currentStory) {
          query = query
            .eq('story_id', currentStory.id)
            .eq('scene_order', sceneId)
        } else {
          throw new Error('No current story available')
        }
      }

      const { data: scene, error } = await query.single()

      if (error) throw error

      console.log('🎭 Scene loaded:', scene.title, 'Order:', scene.scene_order)
      set({ currentScene: scene })
    } catch (error: any) {
      console.error('❌ Error loading scene:', error)
      set({ error: error.message })
    }
  },

  loadParticipants: async (roomId: string) => {
    try {
      const { data: participants, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)

      if (error) throw error
      set({ participants: participants || [] })
    } catch (error: any) {
      console.error('❌ Error loading participants:', error)
    }
  },

  leaveRoom: () => {
    console.log('🚪 Leaving room')
    
    // Disconnect from WebRTC
    try {
      const webrtcModule = require('./webrtcStore')
      const webrtcStore = (webrtcModule as any).useWebRTCStore
      webrtcStore.getState().disconnect()
    } catch (error) {
      console.warn('WebRTC store not available for disconnect:', error)
    }
    
    // Reset state
    set({
      currentRoom: null,
      currentStory: null,
      currentScene: null,
      participants: [],
      error: null,
    })
  },
}))
