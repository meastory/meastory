import { useWebRTCStore } from '../stores/webrtcStore'

type DataMessage =
  | { type: 'choice'; nextSceneId: string }
  | { type: 'child-name-change'; name: string; timestamp?: number }
  | { type: 'story-change'; storyId: string }

class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private dataChannels: Map<string, RTCDataChannel> = new Map()
  private iceCandidatesQueue: Map<string, RTCIceCandidateInit[]> = new Map()
  private pendingMessages: Map<string, DataMessage[]> = new Map()
  private audioSender: RTCRtpSender | null = null
  private videoSender: RTCRtpSender | null = null
  // Perfect negotiation state per peer
  private makingOffer: Map<string, boolean> = new Map()
  private ignoreOffer: Map<string, boolean> = new Map()
  private politePeer: Map<string, boolean> = new Map()
  // Debounce ICE restarts per peer
  private lastIceRestartAt: Map<string, number> = new Map()
  private iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Optional TURN from environment
      ...(() => {
        const url = import.meta.env.VITE_TURN_URL as string | undefined
        const username = import.meta.env.VITE_TURN_USERNAME as string | undefined
        const credential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined
        if (url && username && credential) {
          return [{ urls: url, username, credential }]
        }
        return [] as Array<{ urls: string; username?: string; credential?: string }>
      })()
    ]
  }

  async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    console.log('🔗 Creating peer connection for:', peerId)
    
    const peerConnection = new RTCPeerConnection(this.iceServers)
    
    // Determine polite/impolite role from store (guest = polite)
    try {
      const role = useWebRTCStore.getState().role
      const polite = role !== 'host'
      this.politePeer.set(peerId, polite)
    } catch {
      this.politePeer.set(peerId, true)
    }

    // Add local stream to peer connection
    const localStream = useWebRTCStore.getState().localStream
    if (localStream) {
      console.log('📹 Adding local stream tracks:', localStream.getTracks().map(t => ({ 
        kind: t.kind, 
        enabled: t.enabled, 
        readyState: t.readyState 
      })))
      localStream.getTracks().forEach((track: MediaStreamTrack) => {
        console.log('📹 Adding track:', track.kind, 'enabled:', track.enabled)
        peerConnection.addTrack(track, localStream)
      })
    } else {
      console.warn('⚠️ No local stream available when creating peer connection')
    }
    
    // Update sender references
    this.updateSenderReferences(peerConnection)
    
    // Perfect negotiation: onnegotiationneeded (guard against glare)
    peerConnection.onnegotiationneeded = async () => {
      try {
        if (this.makingOffer.get(peerId)) return
        this.makingOffer.set(peerId, true)
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        const clientId = useWebRTCStore.getState().clientId
        useWebRTCStore.getState().sendSignalingMessage('offer', {
          from: clientId,
          to: peerId,
          offer
        })
      } catch (e) {
        console.warn('onnegotiationneeded failed:', e)
      } finally {
        this.makingOffer.set(peerId, false)
      }
    }
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('🎥 Received remote stream from:', peerId)
      console.log('🎥 Stream tracks:', event.streams[0].getTracks().length)
      const [stream] = event.streams
      useWebRTCStore.getState().updateParticipantStream(peerId, stream)
      console.log('✅ Remote stream added for:', peerId)
    }
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const clientId = useWebRTCStore.getState().clientId
        console.log('🧊 Sending ICE candidate from:', clientId, 'to:', peerId)
        useWebRTCStore.getState().sendSignalingMessage('candidate', {
          from: clientId,
          to: peerId,
          candidate: event.candidate
        })
      }
    }
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState
      console.log(`🔗 Connection state for ${peerId}:`, state)
      
      if (state === 'connected') {
        console.log(`✅ Connected to ${peerId}`)
        this.addMissingLocalTracks(peerId)
        console.log('📡 Data channels:', Array.from(this.dataChannels.keys()))
      } else if (state === 'failed') {
        console.error(`❌ Connection failed for ${peerId}`)
        this.handleConnectionFailure(peerId)
      }
    }

    // Debounced ICE restart on ICE connection failure
    peerConnection.oniceconnectionstatechange = async () => {
      const iceState = peerConnection.iceConnectionState
      console.log(`🧊 ICE state for ${peerId}:`, iceState)
      if (iceState === 'failed' || iceState === 'disconnected') {
        const now = Date.now()
        const last = this.lastIceRestartAt.get(peerId) || 0
        if (now - last < 4000) {
          console.log('🧊 ICE restart skipped (debounced) for', peerId)
          return
        }
        this.lastIceRestartAt.set(peerId, now)
        const clientId = useWebRTCStore.getState().clientId
        if (!clientId) return
        try {
          console.log('🧊 Attempting ICE restart to', peerId)
          const offer = await peerConnection.createOffer({ iceRestart: true })
          await peerConnection.setLocalDescription(offer)
          useWebRTCStore.getState().sendSignalingMessage('offer', {
            from: clientId,
            to: peerId,
            offer
          })
        } catch (e) {
          console.warn('ICE restart failed:', e)
        }
      }
    }
    
    // Handle data channel
    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel
      this.setupDataChannel(peerId, dataChannel)
    }
    
    this.peerConnections.set(peerId, peerConnection)
    return peerConnection
  }

  updateSenderReferences(peerConnection: RTCPeerConnection): void {
    try {
      const senders = peerConnection.getSenders?.() || []
      if (!this.audioSender) {
        this.audioSender = senders.find(s => s.track && s.track.kind === 'audio') || null
      }
      if (!this.videoSender) {
        this.videoSender = senders.find(s => s.track && s.track.kind === 'video') || null
      }
    } catch (error) {
      console.error('❌ Error updating sender references:', error)
    }
  }

  addMissingLocalTracks(peerId: string): void {
    const peerConnection = this.peerConnections.get(peerId)
    if (!peerConnection) return
    
    const localStream = useWebRTCStore.getState().localStream
    if (!localStream) return
    
    this.updateSenderReferences(peerConnection)
    
    const audioTrack = localStream.getAudioTracks()[0]
    if (audioTrack) {
      if (this.audioSender && this.audioSender.track !== audioTrack) {
        try { this.audioSender.replaceTrack(audioTrack) } catch (e) { console.warn('Audio replaceTrack failed:', e) }
      } else if (!this.audioSender) {
        try { this.audioSender = peerConnection.addTrack(audioTrack, localStream) } catch (e) { console.warn('Audio addTrack failed:', e) }
      }
    }
    
    const videoTrack = localStream.getVideoTracks()[0]
    if (videoTrack) {
      if (this.videoSender && this.videoSender.track !== videoTrack) {
        try { this.videoSender.replaceTrack(videoTrack) } catch (e) { console.warn('Video replaceTrack failed:', e) }
      } else if (!this.videoSender) {
        try { this.videoSender = peerConnection.addTrack(videoTrack, localStream) } catch (e) { console.warn('Video addTrack failed:', e) }
      }
    }
  }

  async createOffer(peerId: string): Promise<void> {
    console.log('📤 Creating offer for:', peerId)
    
    const peerConnection = await this.createPeerConnection(peerId)
    
    try {
      this.makingOffer.set(peerId, true)
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      
      const clientId = useWebRTCStore.getState().clientId
      console.log('📤 Sending offer from:', clientId, 'to:', peerId)
      useWebRTCStore.getState().sendSignalingMessage('offer', {
        from: clientId,
        to: peerId,
        offer
      })
      
      const dataChannel = peerConnection.createDataChannel('story-sync')
      this.setupDataChannel(peerId, dataChannel)
      
    } catch (error) {
      console.error('❌ Error creating offer:', error)
    } finally {
      this.makingOffer.set(peerId, false)
    }
  }

  async handleOffer(from: string, offer: RTCSessionDescriptionInit): Promise<void> {
    console.log('📨 Handling offer from:', from)
    
    const peerConnection = await this.createPeerConnection(from)
    const polite = this.politePeer.get(from) ?? true
    
    try {
      const isMakingOffer = this.makingOffer.get(from) || false
      const offerCollision = isMakingOffer || peerConnection.signalingState !== 'stable'
      const shouldIgnore = !polite && offerCollision
      if (shouldIgnore) {
        console.warn('⚠️ Ignoring offer due to glare (impolite peer)')
        this.ignoreOffer.set(from, true)
        return
      }
      this.ignoreOffer.set(from, false)
      if (offerCollision) {
        console.log('🔄 Rolling back due to offer collision')
        await peerConnection.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit)
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      const clientId = useWebRTCStore.getState().clientId
      console.log('📤 Sending answer from:', clientId, 'to:', from)
      useWebRTCStore.getState().sendSignalingMessage('answer', {
        from: clientId,
        to: from,
        answer
      })

      this.processQueuedIceCandidates(from)
      
    } catch (error) {
      console.error('❌ Error handling offer:', error)
    }
  }

  async handleAnswer(from: string, answer: RTCSessionDescriptionInit): Promise<void> {
    console.log('📨 Received answer from:', from)
    
    const peerConnection = this.peerConnections.get(from)
    if (!peerConnection) {
      console.error('❌ No peer connection found for:', from)
      return
    }
    
    try {
      if (peerConnection.signalingState !== 'have-local-offer') {
        console.warn('⚠️ Ignoring unexpected answer in state:', peerConnection.signalingState)
        return
      }
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('✅ Answer processed from:', from)
      this.addMissingLocalTracks(from)
      this.processQueuedIceCandidates(from)
      
    } catch (error) {
      console.error('❌ Error handling answer:', error)
    }
  }

  async handleCandidate(from: string, candidate: RTCIceCandidateInit): Promise<void> {
    console.log('🧊 Handling ICE candidate from:', from)
    
    const peerConnection = this.peerConnections.get(from)
    if (!peerConnection) {
      console.error('❌ No peer connection found for:', from)
      return
    }
    
    if (peerConnection.remoteDescription) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error)
      }
    } else {
      console.log('🧊 Queuing ICE candidate until remote description is set')
      this.queueIceCandidate(from, candidate)
    }
  }

  queueIceCandidate(peerId: string, candidate: RTCIceCandidateInit): void {
    if (!this.iceCandidatesQueue.has(peerId)) {
      this.iceCandidatesQueue.set(peerId, [])
    }
    this.iceCandidatesQueue.get(peerId)!.push(candidate)
  }

  processQueuedIceCandidates(peerId: string): void {
    const peerConnection = this.peerConnections.get(peerId)
    if (!peerConnection || !peerConnection.remoteDescription) {
      console.log('🧊 Cannot process queued ICE candidates - no remote description')
      return
    }

    const queuedCandidates = this.iceCandidatesQueue.get(peerId) || []
    console.log(`🧊 Processing ${queuedCandidates.length} queued ICE candidates for ${peerId}`)
    
    queuedCandidates.forEach(async (candidate) => {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        console.log('✅ Added queued ICE candidate for:', peerId)
      } catch (error) {
        console.error('❌ Error adding queued ICE candidate:', error)
      }
    })
    
    this.iceCandidatesQueue.delete(peerId)
  }

  setupDataChannel(peerId: string, dataChannel: RTCDataChannel): void {
    console.log('📡 Setting up data channel for:', peerId)
    
    dataChannel.onopen = () => {
      console.log('📡 Data channel opened for:', peerId)
      const queued = this.pendingMessages.get(peerId) || []
      if (queued.length) {
        console.log(`📤 Flushing ${queued.length} queued messages to`, peerId)
        queued.forEach(msg => { try { dataChannel.send(JSON.stringify(msg)) } catch (e) { console.warn('Queue send failed:', e) } })
        this.pendingMessages.delete(peerId)
      }
    }
    
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as DataMessage
        console.log('📡 Data channel message from', peerId, ':', message)
        
        switch (message.type) {
          case 'choice':
            this.handleStoryChoiceSync(message.nextSceneId)
            break
          case 'child-name-change':
            this.handleChildNameSync(message.name)
            break
          case 'story-change':
            this.handleStoryChangeSync(message.storyId)
            break
          default:
            console.log('📡 Unknown data channel message type')
        }
      } catch (error) {
        console.error('❌ Error parsing data channel message:', error)
      }
    }
    
    dataChannel.onclose = () => {
      console.log('📡 Data channel closed for:', peerId)
      this.dataChannels.delete(peerId)
    }
    
    this.dataChannels.set(peerId, dataChannel)
  }

  sendDataMessage(peerId: string, message: DataMessage): void {
    const dataChannel = this.dataChannels.get(peerId)
    
    if (dataChannel && dataChannel.readyState === 'open') {
      console.log('📤 Sending data message to', peerId, ':', message)
      dataChannel.send(JSON.stringify(message))
    } else {
      console.warn('📡 Data channel not ready for:', peerId, '– queuing message')
      const queue = this.pendingMessages.get(peerId) || []
      queue.push(message)
      this.pendingMessages.set(peerId, queue)
    }
  }

  broadcastDataMessage(message: DataMessage): void {
    const channels = Array.from(this.dataChannels.entries()).map(([peerId, ch]) => ({ peerId, state: ch.readyState }))
    console.log('📤 Broadcasting data message:', message, 'channels:', channels)
    this.dataChannels.forEach((dataChannel: RTCDataChannel, peerId) => {
      if (dataChannel.readyState === 'open') {
        console.log('📤 →', peerId)
        dataChannel.send(JSON.stringify(message))
      } else {
        console.warn('📡 Channel not open for', peerId, 'state:', dataChannel.readyState, '– queuing')
        const queue = this.pendingMessages.get(peerId) || []
        queue.push(message)
        this.pendingMessages.set(peerId, queue)
      }
    })
  }

  handleConnectionFailure(peerId: string): void {
    console.error(`❌ Connection failed for ${peerId}`)
    
    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection) {
      peerConnection.close()
      this.peerConnections.delete(peerId)
    }
    
    useWebRTCStore.getState().removeParticipant(peerId)
    
    setTimeout(() => {
      console.log(`🔄 Attempting reconnection to ${peerId}`)
      this.createOffer(peerId)
    }, 3000)
  }

  closeAllConnections(): void {
    console.log('🔌 Closing all WebRTC connections')
    
    this.peerConnections.forEach((peerConnection, peerId) => {
      console.log('🔌 Closing connection to:', peerId)
      peerConnection.close()
    })
    this.peerConnections.clear()
    
    this.dataChannels.forEach((dataChannel, peerId) => {
      console.log('🔌 Closing data channel to:', peerId)
      dataChannel.close()
    })
    this.dataChannels.clear()

    this.iceCandidatesQueue.clear()
  }

  // Story synchronization methods
  syncStoryChoice(sceneId: string): void {
    const payload = {
      type: 'choice' as const,
      nextSceneId: sceneId
    }
    this.broadcastDataMessage(payload)
    try {
      const clientId = useWebRTCStore.getState().clientId
      useWebRTCStore.getState().sendSignalingMessage('story-choice', {
        from: clientId,
        payload
      })
    } catch (e) {
      console.warn('Signaling fallback failed:', e)
    }
  }

  syncChildName(name: string): void {
    this.broadcastDataMessage({
      type: 'child-name-change',
      name,
      timestamp: Date.now()
    })
  }

  syncStoryChange(storyId: string): void {
    const payload: DataMessage = { type: 'story-change', storyId }
    this.broadcastDataMessage(payload)
    try {
      const clientId = useWebRTCStore.getState().clientId
      useWebRTCStore.getState().sendSignalingMessage('story-change', {
        from: clientId,
        payload
      })
    } catch (e) {
      console.warn('Signaling fallback failed (story-change):', e)
    }
  }

  handleStoryChoiceSync(nextSceneId: string): void {
    console.log('📖 Syncing story choice to scene:', nextSceneId)
    try {
      import('../stores/roomStore').then(({ useRoomStore }) => {
        const roomStore = useRoomStore.getState()
        if (nextSceneId) {
          roomStore.loadScene(nextSceneId)
        } else {
          console.warn('⚠️ Received invalid nextSceneId for story sync')
        }
      }).catch(error => {
        console.error('❌ Error syncing story choice:', error)
      })
    } catch (error) {
      console.error('❌ Error syncing story choice:', error)
    }
  }

  async handleStoryChangeSync(storyId: string): Promise<void> {
    console.log('📚 Syncing story change to story:', storyId)
    try {
      const { useRoomStore } = await import('../stores/roomStore')
      const room = useRoomStore.getState()
      await room.changeStory(storyId)
    } catch (error) {
      console.error('❌ Error syncing story change:', error)
    }
  }

  handleChildNameSync(name: string): void {
    console.log('👤 Syncing child name from remote participant:', name)
    try {
      localStorage.setItem('childName', name)
      import('../stores/roomStore').then(({ useRoomStore }) => {
        const roomStore = useRoomStore.getState()
        roomStore.setChildName(name)
      }).catch(error => {
        console.error('❌ Error syncing child name:', error)
      })
    } catch (error) {
      console.error('❌ Error syncing child name:', error)
    }
  }
}

export const webrtcManager = new WebRTCManager()
