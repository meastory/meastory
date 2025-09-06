import { create } from 'zustand'
import { supabase, useAuthStore } from './authStore'
import type { Tables } from '../types/supabase'

// JSON authoring content types for local parsing
interface JsonChoice { label: string; nextSceneId: string }
interface JsonScene {
  id: string
  title?: string
  background?: string
  text: string
  choices?: JsonChoice[]
  meta?: { emotionalBeat?: string; readAloudNotes?: string }
}
interface JsonStoryContent { scenes?: JsonScene[] }

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

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
  effectiveRoomTier?: 'guest' | 'free' | 'paid' | 'enterprise'
}

interface RoomActions {
  enterRoom: (roomId: string) => Promise<void>
  loadStory: (storyId: string) => Promise<void>
  loadScene: (sceneId: string | number) => Promise<void>
  loadParticipants: (roomId: string) => Promise<void>
  leaveRoom: () => void
  changeStory: (storyId: string) => Promise<void>
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  setChildName: (name: string) => void
  recomputeEffectiveTier: () => void
}
const initialState: RoomState = {
  currentRoom: null,
  currentStory: null,
  currentScene: null,
  participants: [],
  isLoading: false,
  error: null,
  childName: localStorage.getItem('childName') || 'Alex',
  effectiveRoomTier: 'guest',
}

export const useRoomStore = create<RoomState & RoomActions>((set, get) => ({
  ...initialState,
  recomputeEffectiveTier: () => {
    const userTier: 'guest' | 'free' | 'paid' | 'enterprise' = useAuthStore.getState().userTier
    const participants = get().participants || []
    let highest: 'guest' | 'free' | 'paid' | 'enterprise' = userTier || 'guest'
    const rank: Record<'guest' | 'free' | 'paid' | 'enterprise', number> = { guest: 0, free: 1, paid: 2, enterprise: 3 }
    for (const p of participants as Array<{ user_tier?: 'guest' | 'free' | 'paid' | 'enterprise' }>) {
      const tier = p.user_tier || 'guest'
      if (rank[tier] > rank[highest]) highest = tier
    }
    set({ effectiveRoomTier: highest })
  },

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

      // Prefer resuming from current_* if present
      if (room.current_story_id) {
        console.log('📚 Resuming story from room state:', room.current_story_id, 'scene:', room.current_scene_id || 'first')
        await get().loadStory(room.current_story_id)
        if (room.current_scene_id) {
          await get().loadScene(room.current_scene_id)
        }
      } else {
        // If the room was created with a story, load it; otherwise wait for user to pick from library
        if (room.story_id) {
          console.log('📚 Room has initial story configured; loading:', room.story_id)
          await get().loadStory(room.story_id)
        } else {
          console.log('ℹ️ No story selected for room; awaiting user selection from library')
        }
      }

      // Load participants
      await get().loadParticipants(roomId)

      // Connect to WebRTC
      console.log('🔗 Connecting to WebRTC for room:', room.code)
      try {
        const webrtcModule = await import('./webrtcStore')
        const webrtcStore = webrtcModule.useWebRTCStore
        await webrtcStore.getState().connect(roomId, room.code || '')
        console.log('✅ WebRTC connected successfully')
      } catch (webrtcError) {
        console.error('❌ WebRTC connection failed:', webrtcError)
      }

      console.log('✅ Successfully entered room')
      // Persist active room for refresh restore
      try {
        localStorage.setItem('activeRoomId', room.id)
        if (room.code) localStorage.setItem('activeRoomCode', room.code)
      } catch (e) {
        console.warn('persist active room failed', e)
      }
    } catch (e: unknown) {
      console.error('❌ Failed to enter room:', e)
      set({ error: (e as { message?: string })?.message || 'Failed to enter room' })
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
        .eq('id', String(storyId))
        .single()

      if (error) throw error

      console.log('📖 Story loaded:', story.title, 'ID:', story.id)
      set({ currentStory: story })

      // Prefer JSONB content-based first scene
      const content = (story as unknown as { content?: JsonStoryContent }).content
      const scenes = Array.isArray(content?.scenes) ? (content!.scenes as JsonScene[]) : null
      const firstSceneFromJson = scenes?.[0] ?? null

      if (firstSceneFromJson) {
        // Map JSON scene to StoryScene-like shape for UI compatibility
        const mappedChoices = (firstSceneFromJson.choices || []).map(c => ({ label: c.label, next_scene_id: c.nextSceneId }))
        const mapped: StoryScene = {
          id: firstSceneFromJson.id,
          story_id: storyId,
          scene_order: 1,
          title: firstSceneFromJson.title ?? null,
          content: firstSceneFromJson.text ?? '',
          choices: mappedChoices,
          background_image_url: firstSceneFromJson.background ?? null,
          audio_url: null,
          created_at: story.created_at,
          updated_at: story.updated_at,
        } as unknown as StoryScene
        console.log('🎬 First scene (JSON) loaded:', mapped.title || mapped.id)
        set({ currentScene: mapped })
        return
      }

      // Fallback: Load first scene from story_scenes
      const { data: firstScene } = await supabase
        .from('story_scenes')
        .select('*')
        .eq('story_id', String(storyId))
        .eq('scene_order', 1)
        .single()

      if (firstScene) {
        console.log('🎬 First scene (DB) loaded:', firstScene.title)
        set({ currentScene: firstScene })
      } else {
        console.log('⚠️ No first scene found for story')
        set({ currentScene: null })
      }
    } catch (error: unknown) {
      console.error('❌ Error loading story:', error)
      const msg = (error as { message?: string })?.message || 'Unknown error'
      set({ error: msg })
    }
  },

  loadScene: async (sceneId: string | number) => {
    console.log('🎬 Loading scene:', sceneId)

    try {
      const currentStory = get().currentStory as unknown as { id: string; content?: JsonStoryContent } | null
      const content = currentStory?.content
      const scenes = Array.isArray(content?.scenes) ? (content!.scenes as JsonScene[]) : null

      // If JSON content exists, resolve by scene id (string) or by index (number)
      if (scenes && currentStory) {
        let nextSceneObj: JsonScene | undefined
        if (typeof sceneId === 'string') {
          nextSceneObj = scenes.find(s => s.id === sceneId)
        } else {
          const index = Number(sceneId) - 1
          nextSceneObj = scenes[index]
        }

        if (nextSceneObj) {
          const mappedChoices = (nextSceneObj.choices || []).map(c => ({ label: c.label, next_scene_id: c.nextSceneId }))
          const mapped: StoryScene = {
            id: nextSceneObj.id,
            story_id: currentStory.id,
            scene_order: typeof sceneId === 'number' ? Number(sceneId) : (scenes.findIndex(s => s.id === nextSceneObj!.id) + 1),
            title: nextSceneObj.title ?? null,
            content: nextSceneObj.text ?? '',
            choices: mappedChoices,
            background_image_url: nextSceneObj.background ?? null,
            audio_url: null,
            created_at: get().currentScene?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as unknown as StoryScene

          console.log('🎭 Scene (JSON) loaded:', mapped.title || mapped.id, 'Order:', mapped.scene_order)
          set({ currentScene: mapped })

          // If host and the scene id is a UUID (legacy), persist; otherwise skip RPC
          try {
            const room = get().currentRoom
            if (room) {
              const { useWebRTCStore } = await import('./webrtcStore')
              if (useWebRTCStore.getState().role === 'host' && isUuid(mapped.id as unknown as string)) {
                await supabase.rpc('rpc_update_room_scene' as unknown as never, {
                  p_room_id: room.id,
                  p_story_id: currentStory.id,
                  p_scene_id: mapped.id as unknown as string,
                } as unknown as never)
              }
            }
          } catch (e) {
            console.warn('rpc_update_room_scene (JSON) skipped/failed:', e)
          }

          return
        }
      }

      // Fallback to relational scenes
      let query = supabase
        .from('story_scenes')
        .select('*')

      if (typeof sceneId === 'string') {
        query = query.eq('id', sceneId)
      } else {
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

      console.log('🎭 Scene (DB) loaded:', scene.title, 'Order:', scene.scene_order)
      set({ currentScene: scene })

      try {
        const currentRoom = get().currentRoom
        if (currentRoom) {
          const { useWebRTCStore } = await import('./webrtcStore')
          if (useWebRTCStore.getState().role === 'host' && get().currentStory) {
            await supabase.rpc('rpc_update_room_scene' as unknown as never, {
              p_room_id: currentRoom.id,
              p_story_id: get().currentStory!.id,
              p_scene_id: scene.id,
            } as unknown as never)
          }
        }
      } catch (e) {
        console.warn('rpc_update_room_scene failed (non-host or RLS):', e)
      }
    } catch (error: unknown) {
      console.error('❌ Error loading scene:', error)
      const msg = (error as { message?: string })?.message || 'Unknown error'
      set({ error: msg })
    }
  },

  loadParticipants: async (roomId: string) => {
    try {
      const { data: participants, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)

      if (error) throw error

      const rows = (participants || []) as RoomParticipant[]
      const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean) as string[]))

      // eslint-disable-next-line prefer-const
      let tiersByUserId: Record<string, 'guest' | 'free' | 'paid' | 'enterprise'> = {}
      if (userIds.length > 0) {
        const { data: profiles, error: pErr } = await supabase
          .from('user_profiles')
          .select('id, tier')
          .in('id', userIds)

        if (!pErr && profiles) {
          for (const p of profiles as Array<{ id: string; tier: string | null }>) {
            const t = (p.tier as 'guest' | 'free' | 'paid' | 'enterprise') || 'guest'
            tiersByUserId[p.id] = t
          }
        }
      }

      const mapped = rows.map((p) => ({
        ...p,
        user_tier: (p.user_id && tiersByUserId[p.user_id]) ? tiersByUserId[p.user_id] : 'guest',
      }))
      set({ participants: mapped })
      get().recomputeEffectiveTier()
    } catch (error: unknown) {
      console.error('❌ Error loading participants:', error)
    }
  },

  changeStory: async (storyId: string) => {
    console.log('🔄 Changing story in room to:', storyId)
    
    try {
      const currentRoom = get().currentRoom
      if (!currentRoom) {
        // Guest context: update local state only
        console.log('ℹ️ No current room (guest flow); applying story locally')
        await get().loadStory(storyId)
        return
      }
      
      // Update the room's story in database
      const { error } = await supabase
        .from('rooms')
        .update({ story_id: storyId })
        .eq('id', currentRoom.id)
      
      if (error) throw error
      
      // Load the new story (this won't disconnect WebRTC)
      await get().loadStory(storyId)

      // If story uses JSON content, skip legacy scene fetch and RPC
      const loaded = get().currentStory as unknown as { id: string; content?: JsonStoryContent } | null
      const hasJsonScenes = Array.isArray(loaded?.content?.scenes)
      if (hasJsonScenes) {
        console.log('🧩 JSON content detected; skipping legacy first-scene fetch/RPC')
        console.log('✅ Story changed successfully without disconnecting WebRTC')
        return
      }

      // If host, also reset current_scene_id via RPC to first scene (UUID only)
      try {
        const { data: firstScene } = await supabase
          .from('story_scenes')
          .select('id')
          .eq('story_id', storyId)
          .eq('scene_order', 1)
          .single()
        const sceneId = firstScene?.id || null
        const { useWebRTCStore } = await import('./webrtcStore')
        if (useWebRTCStore.getState().role === 'host' && sceneId) {
          await supabase.rpc('rpc_update_room_scene' as unknown as never, {
            p_room_id: currentRoom.id,
            p_story_id: storyId,
            p_scene_id: sceneId,
          } as unknown as never)
        }
      } catch (e) {
        console.warn('rpc_update_room_scene (story change) failed or skipped:', e)
      }
      
      console.log('✅ Story changed successfully without disconnecting WebRTC')
    } catch (error: unknown) {
      console.error('❌ Error changing story:', error)
      const msg = (error as { message?: string })?.message || 'Unknown error'
      set({ error: msg })
    }
  },

  leaveRoom: async () => {
    console.log('🚪 Leaving room')
    
    // Disconnect from WebRTC
    try {
      const webrtcModule = await import('./webrtcStore')
      const webrtcStore = webrtcModule.useWebRTCStore
      await webrtcStore.getState().disconnect()
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

    // Clear any session timers in UI store
    try {
      const { useUIStore } = await import('./uiStore')
      useUIStore.getState().setSessionEndsAtMs?.(null)
    } catch {
      // noop
    }

    // Clear persisted active room
    try {
      localStorage.removeItem('activeRoomId')
      localStorage.removeItem('activeRoomCode')
    } catch (e) {
      console.warn('clear persisted active room failed', e)
    }
  },
}))
