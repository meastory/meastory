import { create } from 'zustand'
import { supabase } from './authStore'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Participant {
  id: string
  stream: MediaStream | null
  isMuted: boolean
  isVideoOff: boolean
  name?: string
}

interface WebRTCState {
  // Connection state
  isConnected: boolean
  roomId: string | null
  clientId: string | null
  
  // Media state
  localStream: MediaStream | null
  participants: Map<string, Participant>
  
  // UI state
  isMicMuted: boolean
  isVideoOff: boolean
  isConnecting: boolean
  
  // Signaling
  signalingSocket: RealtimeChannel | null
}

interface WebRTCActions {
  // Connection management
  connect: (roomId: string, roomCode: string) => Promise<void>
  disconnect: () => Promise<void>
  
  // Media management
  initializeLocalStream: () => Promise<void>
  toggleMic: () => void
  toggleVideo: () => void
  
  // Signaling
  sendSignalingMessage: (type: string, payload?: unknown) => Promise<void>
  
  // Participant management
  addParticipant: (id: string, name?: string) => void
  removeParticipant: (id: string) => void
  updateParticipantStream: (id: string, stream: MediaStream) => void
  
  // Call management
  startCall: (role: 'caller' | 'callee') => Promise<void>
  handleOffer: (from: string, offer: RTCSessionDescriptionInit) => Promise<void>
  handleAnswer: (from: string, answer: RTCSessionDescriptionInit) => Promise<void>
  handleCandidate: (from: string, candidate: RTCIceCandidateInit) => Promise<void>
  
  // Signaling message handling
  handleSignalingMessage: (message: unknown) => void
  
  // Error handling
  setError: (error: string) => void
}

const initialState: WebRTCState = {
  isConnected: false,
  roomId: null,
  clientId: null,
  localStream: null,
  participants: new Map(),
  isMicMuted: false,
  isVideoOff: false,
  isConnecting: false,
  signalingSocket: null,
}

export const useWebRTCStore = create<WebRTCState & WebRTCActions>((set, get) => ({
  ...initialState,

  connect: async (roomId: string, roomCode: string) => {
    console.log('🔗 Connecting to room:', roomId)
    set({ isConnecting: true })

    try {
      // Initialize local media stream first
      await get().initializeLocalStream()

      // Use Supabase Realtime for signaling instead of custom WebSocket
      console.log('📡 Setting up Supabase Realtime signaling for room:', roomCode)
      
      // Subscribe to room-specific signaling channel
      const channel = supabase.channel(`webrtc-${roomCode}`)
      
      // Handle signaling messages
      channel
        .on('broadcast', { event: 'offer' }, ({ payload }: { payload: unknown }) => {
          console.log('📨 Received offer via Supabase Realtime')
          const p = payload as Record<string, unknown>
          const from = typeof p.from === 'string' ? p.from : undefined
          const offer = p.offer as RTCSessionDescriptionInit | undefined
          if (from && offer) get().handleOffer(from, offer)
        })
        .on('broadcast', { event: 'answer' }, ({ payload }: { payload: unknown }) => {
          console.log('📨 Received answer via Supabase Realtime')
          const p = payload as Record<string, unknown>
          const from = typeof p.from === 'string' ? p.from : undefined
          const answer = p.answer as RTCSessionDescriptionInit | undefined
          if (from && answer) get().handleAnswer(from, answer)
        })
        .on('broadcast', { event: 'candidate' }, ({ payload }: { payload: unknown }) => {
          console.log('🧊 Received ICE candidate via Supabase Realtime')
          const p = payload as Record<string, unknown>
          const from = typeof p.from === 'string' ? p.from : undefined
          const candidate = p.candidate as RTCIceCandidateInit | undefined
          if (from && candidate) get().handleCandidate(from, candidate)
        })
        .on('broadcast', { event: 'story-choice' }, async ({ payload }: { payload: unknown }) => {
          try {
            const clientId = get().clientId
            if (!clientId) return
            const p = payload as Record<string, unknown>
            if (p.from === clientId) return
            const msg = p.payload as Record<string, unknown> | undefined
            if (msg && msg.type === 'choice' && typeof msg.nextSceneId === 'string') {
              console.log('📖 Signaling fallback: applying story choice for scene:', msg.nextSceneId)
              const { useRoomStore } = await import('./roomStore')
              useRoomStore.getState().loadScene(msg.nextSceneId)
            }
          } catch (e) {
            console.warn('Failed to apply signaling story-choice:', e)
          }
        })
        .on('broadcast', { event: 'story-change' }, async ({ payload }: { payload: unknown }) => {
          try {
            const clientId = get().clientId
            if (!clientId) return
            const p = payload as Record<string, unknown>
            if (p.from === clientId) return
            const msg = p.payload as Record<string, unknown> | undefined
            if (msg && msg.type === 'story-change' && typeof msg.storyId === 'string') {
              console.log('📚 Signaling fallback: applying story change for story:', msg.storyId)
              const { useRoomStore } = await import('./roomStore')
              await useRoomStore.getState().changeStory(msg.storyId)
            }
          } catch (e) {
            console.warn('Failed to apply signaling story-change:', e)
          }
        })
        .on('broadcast', { event: 'join' }, ({ payload }: { payload: unknown }) => {
          const p = payload as Record<string, unknown>
          console.log('👥 Participant joined via Supabase Realtime:', p.clientId)
          const joinedId = typeof p.clientId === 'string' ? p.clientId : undefined
          const name = typeof p.name === 'string' ? p.name : undefined
          const clientId = get().clientId
          if (!clientId) return
          if (joinedId === clientId) return // ignore our own join
          if (joinedId) get().addParticipant(joinedId, name)
          // Create offer for new participant
          setTimeout(async () => {
            const { webrtcManager } = await import('../services/webrtcManager')
            if (joinedId) webrtcManager.createOffer(joinedId)
          }, 500)
        })
        .on('broadcast', { event: 'leave' }, ({ payload }: { payload: unknown }) => {
          const p = payload as Record<string, unknown>
          console.log('👋 Participant left via Supabase Realtime:', p.clientId)
          const leftId = typeof p.clientId === 'string' ? p.clientId : undefined
          if (leftId) get().removeParticipant(leftId)
        })

      // Subscribe to the channel
      await channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Supabase Realtime signaling connected')
          set({ signalingSocket: channel, roomId, isConnected: true, isConnecting: false })
          
          // Announce our presence in the room
          const clientId = `user-${Date.now()}`
          set({ clientId })
          await channel.send({
            type: 'broadcast',
            event: 'join',
            payload: { 
              clientId,
              name: 'Participant'
            }
          })
          
          console.log('✅ Successfully connected to WebRTC signaling')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Supabase Realtime channel error')
          set({ isConnecting: false })
          get().setError('Failed to connect to signaling channel')
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Supabase Realtime connection timed out')
          set({ isConnecting: false })
          get().setError('Signaling connection timed out')
        }
      })
      
    } catch (error: unknown) {
      console.error('❌ Connection error:', error)
      set({ isConnecting: false })
      const msg = (error as { message?: string })?.message || 'Connection error'
      get().setError(msg)
    }
  },

  disconnect: async () => {
    console.log('🔌 Disconnecting from WebRTC')
    
    const { signalingSocket, localStream } = get()
    
    // Close Supabase Realtime channel
    if (signalingSocket && typeof signalingSocket.unsubscribe === 'function') {
      signalingSocket.unsubscribe()
    }
    
    // Close WebRTC manager connections
    const { webrtcManager } = await import('../services/webrtcManager')
    webrtcManager.closeAllConnections()
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    
    // Reset state
    set({
      ...initialState,
      signalingSocket: null
    })
  },

  initializeLocalStream: async () => {
    try {
      console.log('🎥 Initializing local media stream')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      
      set({ localStream: stream })
      console.log('✅ Local stream initialized')
      
    } catch (error: unknown) {
      console.error('❌ Failed to get media stream:', error)
      const e = error as { name?: string }
      
      if (e.name === 'NotAllowedError') {
        throw new Error('Camera and microphone permissions are required')
      } else if (e.name === 'NotFoundError') {
        throw new Error('No camera or microphone found')
      } else {
        throw new Error('Failed to access camera and microphone')
      }
    }
  },

  toggleMic: () => {
    const { localStream, isMicMuted } = get()
    
    if (localStream) {
      const audioTracks = localStream.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = isMicMuted
      })
      set({ isMicMuted: !isMicMuted })
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get()
    
    if (localStream) {
      const videoTracks = localStream.getVideoTracks()
      videoTracks.forEach(track => {
        track.enabled = isVideoOff
      })
      set({ isVideoOff: !isVideoOff })
    }
  },

  sendSignalingMessage: async (type: string, payload?: unknown) => {
    const { signalingSocket } = get()
    
    if (signalingSocket && typeof signalingSocket.send === 'function') {
      await signalingSocket.send({
        type: 'broadcast',
        event: type,
        payload
      })
    }
  },

  addParticipant: (id: string, name?: string) => {
    const participants = new Map(get().participants)
    participants.set(id, {
      id,
      stream: null,
      isMuted: false,
      isVideoOff: false,
      name
    })
    set({ participants })
  },

  removeParticipant: (id: string) => {
    const participants = new Map(get().participants)
    const participant = participants.get(id)
    
    if (participant?.stream) {
      participant.stream.getTracks().forEach(track => track.stop())
    }
    
    participants.delete(id)
    set({ participants })
  },

  updateParticipantStream: (id: string, stream: MediaStream) => {
    const participants = new Map(get().participants)
    const existingParticipant = participants.get(id)

    // If participant does not exist yet (race condition), create it
    if (!existingParticipant) {
      participants.set(id, {
        id,
        stream,
        isMuted: false,
        isVideoOff: false,
        name: undefined,
      })
      set({ participants })
      return
    }

    // Do NOT stop tracks of the previous remote stream here.
    // Remote streams can be the same MediaStream reference with new tracks added later.
    // Stopping tracks would kill the remote media.
    const updatedParticipant = { ...existingParticipant, stream }
    participants.set(id, updatedParticipant)
    set({ participants })
  },

  startCall: async (role: 'caller' | 'callee') => {
    console.log('📞 Starting call as:', role)
    
    // Get current participants
    const { participants } = get()
    
    if (role === 'caller' && participants.size > 0) {
      // Create offers for all participants
      const { webrtcManager } = await import('../services/webrtcManager')
      participants.forEach((_, peerId) => {
        webrtcManager.createOffer(peerId)
      })
    }
  },

  handleOffer: async (from: string, offer: RTCSessionDescriptionInit) => {
    console.log('📨 Received offer from:', from)
    const { webrtcManager } = await import('../services/webrtcManager')
    await webrtcManager.handleOffer(from, offer)
  },

  handleAnswer: async (from: string, answer: RTCSessionDescriptionInit) => {
    console.log('📨 Received answer from:', from)
    const { webrtcManager } = await import('../services/webrtcManager')
    await webrtcManager.handleAnswer(from, answer)
  },

  handleCandidate: async (from: string, candidate: RTCIceCandidateInit) => {
    console.log('🧊 Received ICE candidate from:', from)
    const { webrtcManager } = await import('../services/webrtcManager')
    webrtcManager.handleCandidate(from, candidate)
  },

  handleSignalingMessage: (message: unknown) => {
    console.log('📡 Signaling message:', message)
    
    // Handle Supabase Realtime broadcast messages
    const msg = message as Record<string, unknown>
    if (msg.type === 'broadcast') {
      const event = msg.event as string
      const payload = msg.payload as Record<string, unknown>
      
      switch (event) {
        case 'offer':
          {
            const p = payload as Record<string, unknown>
            console.log('📨 Processing offer from:', p?.from)
          }
          {
            const p = payload as Record<string, unknown>
            if (typeof p.from === 'string' && p.offer) get().handleOffer(p.from as string, p.offer as RTCSessionDescriptionInit)
          }
          break
          
        case 'answer':
          {
            const p = payload as Record<string, unknown>
            console.log('📨 Processing answer from:', p?.from)
          }
          {
            const p = payload as Record<string, unknown>
            if (typeof p.from === 'string' && p.answer) get().handleAnswer(p.from as string, p.answer as RTCSessionDescriptionInit)
          }
          break
          
        case 'candidate':
          console.log('🧊 Processing ICE candidate from:', payload?.from)
          if (typeof payload?.from === 'string' && payload?.candidate) get().handleCandidate(payload.from as string, payload.candidate as RTCIceCandidateInit)
          break
          
        case 'join':
          console.log('👥 Participant joined:', payload.clientId)
          if (typeof payload?.clientId === 'string') get().addParticipant(payload.clientId as string, typeof payload?.name === 'string' ? payload.name as string : undefined)
          // Create offer for new participant
          setTimeout(async () => {
            const { webrtcManager } = await import('../services/webrtcManager')
            const clientId = get().clientId
            if (clientId) {
              if (typeof payload?.clientId === 'string') webrtcManager.createOffer(payload.clientId as string)
            } else {
              console.warn('⚠️ Client ID not available for creating offer')
            }
          }, 1000)
          break
          
        case 'leave':
          console.log('👋 Participant left:', payload.clientId)
          if (typeof payload?.clientId === 'string') get().removeParticipant(payload.clientId as string)
          break
          
        default:
          console.log('📡 Unknown broadcast event:', event)
      }
    } else {
      // Handle legacy WebSocket messages (fallback)
      const legacy = msg
      const type = legacy.type as string
      const clientId = legacy.clientId as string | undefined
      const roomId = legacy.roomId as string | undefined
      const peerCount = legacy.peerCount as number | undefined
      
      switch (type) {
        case 'hello':
          set({ clientId })
          break
          
        case 'joined':
          console.log(`✅ Joined room ${roomId} as ${clientId}. Peers: ${peerCount}`)
          break
          
        case 'start-call':
          get().startCall((legacy.role as 'caller' | 'callee') || 'caller')
          break
          
        case 'peer-joined':
          if (typeof legacy.clientId === 'string') get().addParticipant(legacy.clientId as string)
          break
          
        case 'peer-left':
          if (typeof legacy.clientId === 'string') get().removeParticipant(legacy.clientId as string)
          break
          
        case 'offer':
          if (typeof legacy.from === 'string' && legacy.payload) get().handleOffer(legacy.from as string, legacy.payload as RTCSessionDescriptionInit)
          break
          
        case 'answer':
          if (typeof legacy.from === 'string' && legacy.payload) get().handleAnswer(legacy.from as string, legacy.payload as RTCSessionDescriptionInit)
          break
          
        case 'candidate':
          if (typeof legacy.from === 'string' && legacy.payload) get().handleCandidate(legacy.from as string, legacy.payload as RTCIceCandidateInit)
          break
          
        case 'error':
          console.error('❌ Signaling error:', legacy.error)
          if (typeof legacy.error === 'string') get().setError(legacy.error)
          break
          
        default:
          console.log('📡 Unknown signaling message type:', type)
      }
    }
  },

  setError: (error: string) => {
    console.error('❌ WebRTC Error:', error)
    // You could integrate this with your UI error handling
  }
}))
