import { create } from 'zustand'

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
  signalingSocket: WebSocket | null
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
  sendSignalingMessage: (type: string, payload?: any) => void
  
  // Participant management
  addParticipant: (id: string, name?: string) => void
  removeParticipant: (id: string) => void
  updateParticipantStream: (id: string, stream: MediaStream) => void
  
  // Call management
  startCall: (role: 'caller' | 'callee') => Promise<void>
  handleOffer: (from: string, offer: RTCSessionDescriptionInit) => Promise<void>
  handleAnswer: (from: string, answer: RTCSessionDescriptionInit) => Promise<void>
  handleCandidate: (from: string, candidate: RTCIceCandidateInit) => Promise<void>
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

      // Connect to signaling server
      const signalingUrl = process.env.NODE_ENV === 'production' 
        ? 'wss://meastory-signal.herokuapp.com' // Update with your production URL
        : 'ws://localhost:3001'
      
      const socket = new WebSocket(signalingUrl)
      
      socket.onopen = () => {
        console.log('📡 Signaling connection established')
        set({ signalingSocket: socket, roomId, isConnected: true, isConnecting: false })
        
        // Join the room
        socket.send(JSON.stringify({
          type: 'join',
          roomId: roomCode // Use the room code for signaling
        }))
      }

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          get().handleSignalingMessage(message)
        } catch (error) {
          console.error('❌ Error parsing signaling message:', error)
        }
      }

      socket.onclose = () => {
        console.log('📡 Signaling connection closed')
        set({ signalingSocket: null, isConnected: false })
        get().disconnect()
      }

      socket.onerror = (error) => {
        console.error('❌ Signaling connection error:', error)
        set({ isConnecting: false })
        get().setError('Failed to connect to signaling server')
      }

    } catch (error: any) {
      console.error('❌ Connection error:', error)
      set({ isConnecting: false })
      get().setError(error.message)
    }
  },

  disconnect: async () => {
    console.log('🔌 Disconnecting from WebRTC')
    
    const { signalingSocket, localStream } = get()
    
    // Close signaling connection
    if (signalingSocket) {
      signalingSocket.close()
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

  sendSignalingMessage: (type: string, payload?: any) => {
    const { signalingSocket, clientId } = get()
    
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
      signalingSocket.send(JSON.stringify({
        type,
        payload,
        clientId
      }))
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
    const { type, clientId, roomId, peerCount } = message
    
    console.log('📡 Signaling message:', type, message)
    
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
  },

  setError: (error: string) => {
    console.error('❌ WebRTC Error:', error)
    // You could integrate this with your UI error handling
  }
}))
