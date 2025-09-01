import { create } from 'zustand'
import { supabase } from './authStore'

interface Participant {
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
  signalingSocket: any
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
  sendSignalingMessage: (type: string, payload?: any) => Promise<void>
  
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
  handleSignalingMessage: (message: any) => void
  
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
        .on('broadcast', { event: 'offer' }, ({ payload }: { payload: any }) => {
          console.log('📨 Received offer via Supabase Realtime')
          get().handleOffer(payload.from, payload.offer)
        })
        .on('broadcast', { event: 'answer' }, ({ payload }: { payload: any }) => {
          console.log('📨 Received answer via Supabase Realtime')
          get().handleAnswer(payload.from, payload.answer)
        })
        .on('broadcast', { event: 'candidate' }, ({ payload }: { payload: any }) => {
          console.log('🧊 Received ICE candidate via Supabase Realtime')
          get().handleCandidate(payload.from, payload.candidate)
        })
        .on('broadcast', { event: 'join' }, ({ payload }: { payload: any }) => {
          console.log('👥 Participant joined via Supabase Realtime:', payload.clientId)
          get().addParticipant(payload.clientId, payload.name)
          // Create offer for new participant
          setTimeout(async () => {
            const { webrtcManager } = await import('../services/webrtcManager')
            const clientId = get().clientId
            if (clientId) {
              webrtcManager.createOffer(payload.clientId)
            } else {
              console.warn('⚠️ Client ID not available for creating offer')
            }
          }, 1000)
        })
        .on('broadcast', { event: 'leave' }, ({ payload }: { payload: any }) => {
          console.log('👋 Participant left via Supabase Realtime:', payload.clientId)
          get().removeParticipant(payload.clientId)
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
      
    } catch (error: any) {
      console.error('❌ Connection error:', error)
      set({ isConnecting: false })
      get().setError(error.message)
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
      
    } catch (error: any) {
      console.error('❌ Failed to get media stream:', error)
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera and microphone permissions are required')
      } else if (error.name === 'NotFoundError') {
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

  sendSignalingMessage: async (type: string, payload?: any) => {
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
    const participant = participants.get(id)
    
    if (participant) {
      // Clean up old stream
      if (participant.stream) {
        participant.stream.getTracks().forEach(track => track.stop())
      }
      
      participants.set(id, { ...participant, stream })
      set({ participants })
    }
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

  handleSignalingMessage: (message: any) => {
    console.log('📡 Signaling message:', message)
    
    // Handle Supabase Realtime broadcast messages
    if (message.type === 'broadcast') {
      const { event, payload } = message
      
      switch (event) {
        case 'offer':
          console.log('📨 Processing offer from:', payload.from)
          get().handleOffer(payload.from, payload.offer)
          break
          
        case 'answer':
          console.log('📨 Processing answer from:', payload.from)
          get().handleAnswer(payload.from, payload.answer)
          break
          
        case 'candidate':
          console.log('🧊 Processing ICE candidate from:', payload.from)
          get().handleCandidate(payload.from, payload.candidate)
          break
          
        case 'join':
          console.log('�� Participant joined:', payload.clientId)
          get().addParticipant(payload.clientId, payload.name)
          // Create offer for new participant
          setTimeout(async () => {
            const { webrtcManager } = await import('../services/webrtcManager')
            const clientId = get().clientId
            if (clientId) {
              webrtcManager.createOffer(payload.clientId)
            } else {
              console.warn('⚠️ Client ID not available for creating offer')
            }
          }, 1000)
          break
          
        case 'leave':
          console.log('👋 Participant left:', payload.clientId)
          get().removeParticipant(payload.clientId)
          break
          
        default:
          console.log('📡 Unknown broadcast event:', event)
      }
    } else {
      // Handle legacy WebSocket messages (fallback)
      const { type, clientId, roomId, peerCount } = message
      
      switch (type) {
        case 'hello':
          set({ clientId })
          break
          
        case 'joined':
          console.log(`✅ Joined room ${roomId} as ${clientId}. Peers: ${peerCount}`)
          break
          
        case 'start-call':
          get().startCall(message.role)
          break
          
        case 'peer-joined':
          get().addParticipant(message.clientId)
          break
          
        case 'peer-left':
          get().removeParticipant(message.clientId)
          break
          
        case 'offer':
          get().handleOffer(message.from, message.payload)
          break
          
        case 'answer':
          get().handleAnswer(message.from, message.payload)
          break
          
        case 'candidate':
          get().handleCandidate(message.from, message.payload)
          break
          
        case 'error':
          console.error('❌ Signaling error:', message.error)
          get().setError(message.error)
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
