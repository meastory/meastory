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
}

interface RoomActions {
  enterRoom: (roomId: string) => Promise<void>
  loadStory: (storyId: string) => Promise<void>
  loadScene: (sceneId: string | number) => Promise<void>
  loadParticipants: (roomId: string) => Promise<void>
  leaveRoom: () => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}

const initialState: RoomState = {
  currentRoom: null,
  currentStory: null,
  currentScene: null,
  participants: [],
  isLoading: false,
  error: null,
}

export const useRoomStore = create<RoomState & RoomActions>((set, get) => ({
  ...initialState,

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
        console.log('🎬 First scene loaded:', firstScene.title, 'ID:', firstScene.id)
        set({ currentScene: firstScene })
      } else {
        console.log('⚠️ No first scene found for story')
      }
    } catch (error: any) {
      console.error('❌ Error loading story:', error)
      set({ error: error.message })
    }
  },

  loadScene: async (sceneIdentifier: string | number) => {
    console.log('🎭 Loading scene:', sceneIdentifier)
    const { currentStory } = get()
    
    if (!currentStory) {
      console.error('❌ No current story to load scene from')
      return
    }

    try {
      let query = supabase
        .from('story_scenes')
        .select('*')
        .eq('story_id', currentStory.id)

      // If sceneIdentifier is a number, load by scene_order
      if (typeof sceneIdentifier === 'number') {
        query = query.eq('scene_order', sceneIdentifier)
      } else {
        // If it's a string, load by UUID
        query = query.eq('id', sceneIdentifier)
      }

      const { data: scene, error } = await query.single()

      if (error) throw error

      console.log('🎬 Scene loaded:', scene.title, 'ID:', scene.id)
      set({ currentScene: scene })
    } catch (error: any) {
      console.error('❌ Error loading scene:', error)
      set({ error: error.message })
    }
  },

  loadParticipants: async (roomId: string) => {
    console.log('👥 Loading participants for room:', roomId)
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)

      if (error) throw error

      console.log('👤 Participants loaded:', data?.length || 0)
      set({ participants: data || [] })
    } catch (error: any) {
      console.error('❌ Error loading participants:', error)
    }
  },

  leaveRoom: () => {
    console.log('�� Leaving room')
    set({
      currentRoom: null,
      currentStory: null,
      currentScene: null,
      participants: [],
      error: null,
    })
  },

  setError: (error) => set({ error }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
