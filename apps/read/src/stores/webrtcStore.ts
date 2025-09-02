import { create } from 'zustand'
import { supabase } from './authStore'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Participant {
  id: string
  stream: MediaStream | null
  isMuted: boolean
  isVideoOff: boolean
  name?: string
  deviceLabel?: string
}

interface WebRTCState {
  isConnected: boolean
  roomId: string | null
  clientId: string | null
  role: 'host' | 'guest' | null
  localStream: MediaStream | null
  participants: Map<string, Participant>
  isMicMuted: boolean
  isVideoOff: boolean
  isConnecting: boolean
  signalingSocket: RealtimeChannel | null
}

interface WebRTCActions {
  connect: (roomId: string, roomCode: string) => Promise<void>
  disconnect: () => Promise<void>
  initializeLocalStream: () => Promise<void>
  toggleMic: () => void
  toggleVideo: () => void
  sendSignalingMessage: (type: string, payload?: unknown) => Promise<void>
  addParticipant: (id: string, name?: string, deviceLabel?: string) => void
  removeParticipant: (id: string) => void
  updateParticipantStream: (id: string, stream: MediaStream) => void
  startCall: (role: 'caller' | 'callee') => Promise<void>
  handleOffer: (from: string, offer: RTCSessionDescriptionInit) => Promise<void>
  handleAnswer: (from: string, answer: RTCSessionDescriptionInit) => Promise<void>
  handleCandidate: (from: string, candidate: RTCIceCandidateInit) => Promise<void>
  handleSignalingMessage: (message: unknown) => void
  setError: (error: string) => void
}

const initialState: WebRTCState = {
  isConnected: false,
  roomId: null,
  clientId: null,
  role: null,
  localStream: null,
  participants: new Map(),
  isMicMuted: false,
  isVideoOff: false,
  isConnecting: false,
  signalingSocket: null,
}

function getSavedDeviceIds() {
  const audioId = localStorage.getItem('preferredMicId') || undefined
  const videoId = localStorage.getItem('preferredCameraId') || undefined
  return { audioId, videoId }
}

function getSavedDeviceLabel() {
  const cam = localStorage.getItem('preferredCameraLabel')
  const mic = localStorage.getItem('preferredMicLabel')
  const camera = cam ? `Camera: ${cam.slice(0, 32)}` : undefined
  const microphone = mic ? `Mic: ${mic.slice(0, 32)}` : undefined
  return [camera, microphone].filter(Boolean).join(' • ')
}

const presenceMetaByKey: Map<string, { ts: number; name?: string; deviceLabel?: string }> = new Map()

export const useWebRTCStore = create<WebRTCState & WebRTCActions>((set, get) => ({
  ...initialState,

  connect: async (roomId: string, roomCode: string) => {
    console.log('🔗 Connecting to room:', roomId)
    set({ isConnecting: true })

    try {
      await get().initializeLocalStream()

      // Ensure previous channel is closed before creating a new one
      const prev = get().signalingSocket
      if (prev && typeof prev.unsubscribe === 'function') {
        try { await prev.unsubscribe() } catch (e) { console.warn('Prev unsubscribe failed', e) }
        set({ signalingSocket: null })
      }

      let clientId = get().clientId
      if (!clientId) {
        clientId = `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        set({ clientId })
      }

      console.log('📡 Setting up Supabase Realtime channel for:', roomCode)

      const channel = supabase.channel(`webrtc-${roomCode}`, {
        config: { presence: { key: clientId } }
      })

      const recomputeFromLocalPresence = () => {
        const myId = get().clientId
        const participants = new Map(get().participants)
        const fresh = new Map<string, Participant>()
        Array.from(presenceMetaByKey.entries()).forEach(([key, meta]) => {
          if (key !== myId) {
            fresh.set(key, {
              id: key,
              stream: participants.get(key)?.stream || null,
              isMuted: false,
              isVideoOff: false,
              name: meta.name,
              deviceLabel: meta.deviceLabel,
            })
          }
        })
        set({ participants: fresh })
        const sorted = Array.from(presenceMetaByKey.entries())
          .map(([key, meta]) => ({ key, ts: meta.ts }))
          .sort((a, b) => a.ts - b.ts || a.key.localeCompare(b.key))
        const hostId = sorted[0]?.key
        const newRole: 'host' | 'guest' | null = myId && hostId ? (myId === hostId ? 'host' : 'guest') : null
        if (newRole !== get().role) {
          set({ role: newRole })
        }
      }

      channel
        .on('presence', { event: 'sync' }, () => {
          console.log('👥 Presence sync')
          recomputeFromLocalPresence()
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: Array<Record<string, unknown>> }) => {
          const selfId = get().clientId
          console.log('👥 Participant joined:', key)
          const meta = newPresences?.[0] || {}
          presenceMetaByKey.set(key, {
            ts: typeof meta.ts === 'number' ? meta.ts : Date.now(),
            name: typeof meta.name === 'string' ? meta.name : undefined,
            deviceLabel: typeof meta.deviceLabel === 'string' ? meta.deviceLabel : undefined,
          })
          recomputeFromLocalPresence()
          setTimeout(async () => {
            if (get().role === 'host' && key !== selfId) {
              const { webrtcManager } = await import('../services/webrtcManager')
              webrtcManager.createOffer(key)
            }
          }, 500)
        })
        .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
          console.log('👋 Participant left:', key)
          presenceMetaByKey.delete(key)
          get().removeParticipant(key)
          recomputeFromLocalPresence()
        })

      // Broadcast message handlers (story sync + signaling)
      channel
        .on('broadcast', { event: 'offer' }, ({ payload }: { payload: unknown }) => {
          const p = payload as Record<string, unknown>
          const from = typeof p.from === 'string' ? p.from : undefined
          const offer = p.offer as RTCSessionDescriptionInit | undefined
          if (from && offer) get().handleOffer(from, offer)
        })
        .on('broadcast', { event: 'answer' }, ({ payload }: { payload: unknown }) => {
          const p = payload as Record<string, unknown>
          const from = typeof p.from === 'string' ? p.from : undefined
          const answer = p.answer as RTCSessionDescriptionInit | undefined
          if (from && answer) get().handleAnswer(from, answer)
        })
        .on('broadcast', { event: 'candidate' }, ({ payload }: { payload: unknown }) => {
          const p = payload as Record<string, unknown>
          const from = typeof p.from === 'string' ? p.from : undefined
          const candidate = p.candidate as RTCIceCandidateInit | undefined
          if (from && candidate) get().handleCandidate(from, candidate)
        })
        .on('broadcast', { event: 'story-choice' }, async ({ payload }: { payload: unknown }) => {
          try {
            const selfId = get().clientId
            if (!selfId) return
            const p = payload as Record<string, unknown>
            if (p.from === selfId) return
            const msg = p.payload as Record<string, unknown> | undefined
            if (msg && msg.type === 'choice' && typeof msg.nextSceneId === 'string') {
              const { useRoomStore } = await import('./roomStore')
              useRoomStore.getState().loadScene(msg.nextSceneId)
            }
          } catch (e) {
            console.warn('story-choice apply failed:', e)
          }
        })
        .on('broadcast', { event: 'story-change' }, async ({ payload }: { payload: unknown }) => {
          try {
            const selfId = get().clientId
            if (!selfId) return
            const p = payload as Record<string, unknown>
            if (p.from === selfId) return
            const msg = p.payload as Record<string, unknown> | undefined
            if (msg && msg.type === 'story-change' && typeof msg.storyId === 'string') {
              const { useRoomStore } = await import('./roomStore')
              await useRoomStore.getState().changeStory(msg.storyId)
            }
          } catch (e) {
            console.warn('story-change apply failed:', e)
          }
        })

      // Subscribe with retry
      const subscribeWithRetry = async (attempt = 1) => {
        await channel.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('📡 Supabase Realtime connected')
            set({ signalingSocket: channel, roomId, isConnected: true, isConnecting: false })

            const deviceLabel = getSavedDeviceLabel()
            try {
              await channel.track({
                clientId,
                name: 'Guest',
                deviceLabel,
                ts: Date.now(),
              })
              presenceMetaByKey.set(clientId!, { ts: Date.now(), name: 'Guest', deviceLabel })
              recomputeFromLocalPresence()
            } catch (e) {
              console.warn('Presence track failed:', e)
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(status === 'CHANNEL_ERROR' ? '❌ Supabase Realtime channel error' : '❌ Supabase Realtime connection timed out')
            if (attempt < 3) {
              const backoff = 500 * Math.pow(2, attempt - 1)
              console.log(`⏳ Retrying subscribe in ${backoff}ms (attempt ${attempt + 1}/3)`) 
              setTimeout(() => { subscribeWithRetry(attempt + 1) }, backoff)
            } else {
              set({ isConnecting: false })
              get().setError('Failed to connect to signaling channel')
            }
          }
        })
      }

      await subscribeWithRetry(1)

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
    
    if (signalingSocket && typeof signalingSocket.unsubscribe === 'function') {
      try { await signalingSocket.unsubscribe() } catch (e) { console.warn('Unsubscribe failed', e) }
    }
    
    const { webrtcManager } = await import('../services/webrtcManager')
    webrtcManager.closeAllConnections()
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    
    presenceMetaByKey.clear()

    set({
      ...initialState,
      signalingSocket: null
    })
  },

  initializeLocalStream: async () => {
    try {
      console.log('🎥 Initializing local media stream')
      const { audioId, videoId } = getSavedDeviceIds()
      const constraints: MediaStreamConstraints = {
        video: videoId ? { deviceId: { exact: videoId } } : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: audioId ? { deviceId: { exact: audioId }, echoCancellation: true, noiseSuppression: true } as MediaTrackConstraints : { echoCancellation: true, noiseSuppression: true }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
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

  addParticipant: (id: string, name?: string, deviceLabel?: string) => {
    const participants = new Map(get().participants)
    participants.set(id, {
      id,
      stream: null,
      isMuted: false,
      isVideoOff: false,
      name,
      deviceLabel,
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

    const updatedParticipant = { ...existingParticipant, stream }
    participants.set(id, updatedParticipant)
    set({ participants })
  },

  startCall: async (role: 'caller' | 'callee') => {
    console.log('📞 Starting call as:', role)
    
    const { participants } = get()
    
    if (role === 'caller' && participants.size > 0) {
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
          
        case 'story-choice':
          {
            const p = payload as Record<string, unknown>
            const selfId = get().clientId
            if (selfId && p.from !== selfId && p.payload && (p.payload as Record<string, unknown>).type === 'choice') {
              const nextId = (p.payload as Record<string, unknown>).nextSceneId as string
              import('./roomStore').then(({ useRoomStore }) => {
                useRoomStore.getState().loadScene(nextId)
              })
            }
          }
          break
          
        case 'story-change':
          {
            const p = payload as Record<string, unknown>
            const selfId = get().clientId
            if (selfId && p.from !== selfId && p.payload && (p.payload as Record<string, unknown>).type === 'story-change') {
              const storyId = (p.payload as Record<string, unknown>).storyId as string
              import('./roomStore').then(async ({ useRoomStore }) => {
                await useRoomStore.getState().changeStory(storyId)
              })
            }
          }
          break
          
        default:
          console.log('📡 Unknown broadcast event:', event)
      }
    } else {
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
  }
}))
