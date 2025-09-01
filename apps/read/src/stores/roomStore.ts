import { create } from 'zustand'
import type { Room, Participant, Story } from '../types'

interface RoomState {
  room: Room | null
  story: Story | null
  participants: Participant[]
  currentSceneId: string
  isConnected: boolean
  error: string | null
}

interface RoomActions {
  setRoom: (room: Room) => void
  setStory: (story: Story) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (participantId: string) => void
  setCurrentScene: (sceneId: string) => void
  setConnected: (connected: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState: RoomState = {
  room: null,
  story: null,
  participants: [],
  currentSceneId: '',
  isConnected: false,
  error: null,
}

export const useRoomStore = create<RoomState & RoomActions>((set, get) => ({
  ...initialState,

  setRoom: (room) => set({ room }),

  setStory: (story) => set({ story }),

  addParticipant: (participant) => {
    const { participants } = get()
    if (!participants.find(p => p.id === participant.id)) {
      set({ participants: [...participants, participant] })
    }
  },

  removeParticipant: (participantId) => {
    const { participants } = get()
    set({ 
      participants: participants.filter(p => p.id !== participantId) 
    })
  },

  setCurrentScene: (sceneId) => set({ currentSceneId: sceneId }),

  setConnected: (connected) => set({ isConnected: connected }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}))
