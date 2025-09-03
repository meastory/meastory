import { useWebRTCStore } from '../stores/webrtcStore'
import { useUIStore } from '../stores/uiStore'

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
  // Relay policy tracking
  private relayActiveByPeer: Map<string, boolean> = new Map()
  private statsPollIntervalByPeer: Map<string, number> = new Map()
  private readonly audioOnlyOnRelay: boolean = (import.meta.env.VITE_TURN_AUDIO_ONLY_ON_RELAY ?? 'true') !== 'false'
  private readonly phasedGathering: boolean = (import.meta.env.VITE_ICE_PHASED_GATHERING ?? 'true') !== 'false'
  private readonly turnDelayMs: number = (() => {
    const ua = navigator.userAgent
    const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua)
    const base = Number(import.meta.env.VITE_ICE_TURN_DELAY_MS || (isSafari ? 5000 : 4000))
    return isNaN(base) ? (isSafari ? 5000 : 4000) : base
  })()
  private policyForcedAudioOnlyByPeer: Map<string, boolean> = new Map()
  private hasEverConnectedByPeer: Map<string, boolean> = new Map()
  private backoffTimersByPeer: Map<string, number> = new Map()
  private backoffStepByPeer: Map<string, number> = new Map()

  private baseIceServers(): RTCIceServer[] {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  }

  private turnIceServers(): RTCIceServer[] {
    const json = import.meta.env.VITE_TURN_SERVERS as string | undefined
    if (json) {
      try {
        const parsed = JSON.parse(json) as Array<{ urls: string | string[]; username?: string; credential?: string }>
        return parsed
      } catch (e) {
        console.warn('VITE_TURN_SERVERS parse failed:', e)
      }
    }
    const url = import.meta.env.VITE_TURN_URL as string | undefined
    const username = import.meta.env.VITE_TURN_USERNAME as string | undefined
    const credential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined
    if (url && username && credential) {
      return [{ urls: url, username, credential }]
    }
    return []
  }

  private buildIceConfig(includeTurn: boolean): RTCConfiguration {
    return { iceServers: includeTurn ? [...this.baseIceServers(), ...this.turnIceServers()] : this.baseIceServers() }
  }

  // Note: per-connection config is built dynamically via buildIceConfig

  async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    console.log('🔗 Creating peer connection for:', peerId)
    
    // Phase 1: exclude TURN initially if phasedGathering
    const initialConfig = this.phasedGathering ? this.buildIceConfig(false) : this.buildIceConfig(true)
    const peerConnection = new RTCPeerConnection(initialConfig)
    
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
      
      const globals = (window as unknown as { __guest_session_id?: string; __guest_room_code?: string })
      const sid = globals.__guest_session_id
      const roomCode = globals.__guest_room_code || ''

      if (state === 'connected') {
        console.log(`✅ Connected to ${peerId}`)
        this.addMissingLocalTracks(peerId)
        console.log('📡 Data channels:', Array.from(this.dataChannels.keys()))
        // Start relay policy checks when connected
        this.startRelayPolicyPolling(peerId)
        // Apply initial bitrate policy conservatively; refined after stats
        this.applyBitratePolicy(false /* unknown yet */).catch(() => {})
        // Emit connected vs reconnected
        const first = !this.hasEverConnectedByPeer.get(peerId)
        this.hasEverConnectedByPeer.set(peerId, true)
        if (sid && roomCode) {
          import('../lib/supabase').then(({ logConnectionEvent }) => {
            logConnectionEvent({ session_id: sid, room_code: roomCode, event_type: first ? 'connected' : 'reconnected', detail: { peer: peerId } }).catch(() => {})
          })
        }
        // Clear any pending backoff
        this.clearBackoff(peerId)
        // Schedule TURN add if phased
        this.scheduleTurnPhaseUpgrade(peerId)
      } else if (state === 'failed') {
        console.error(`❌ Connection failed for ${peerId}`)
        if (sid && roomCode) {
          import('../lib/supabase').then(({ logConnectionEvent }) => {
            logConnectionEvent({ session_id: sid, room_code: roomCode, event_type: 'ice_failed', detail: { peer: peerId } }).catch(() => {})
          })
        }
        this.handleConnectionFailure(peerId)
        this.stopRelayPolicyPolling(peerId)
        this.scheduleReconnect(peerId, 'connection_failed')
      } else if (state === 'disconnected') {
        this.stopRelayPolicyPolling(peerId)
        // Wait 2s before attempting recovery to avoid flapping
        window.setTimeout(() => this.scheduleReconnect(peerId, 'connection_disconnected'), 2000)
      } else if (state === 'closed') {
        this.stopRelayPolicyPolling(peerId)
      }
    }
    
    // Debounced ICE restart on ICE connection failure
    peerConnection.oniceconnectionstatechange = async () => {
      const iceState = peerConnection.iceConnectionState
      console.log(`🧊 ICE state for ${peerId}:`, iceState)
      if (iceState === 'failed' || iceState === 'disconnected') {
        this.scheduleReconnect(peerId, `ice_${iceState}`)
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
    this.stopRelayPolicyPolling(peerId)
    
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

  private startRelayPolicyPolling(peerId: string): void {
    const pc = this.peerConnections.get(peerId)
    if (!pc) return
    // Immediate check once connected
    this.checkRelayAndApplyPolicy(peerId).catch(() => {})
    // Poll every 7s to detect path changes
    this.stopRelayPolicyPolling(peerId)
    const id = window.setInterval(() => {
      this.checkRelayAndApplyPolicy(peerId).catch(() => {})
    }, 7000)
    this.statsPollIntervalByPeer.set(peerId, id)
  }

  private stopRelayPolicyPolling(peerId: string): void {
    const id = this.statsPollIntervalByPeer.get(peerId)
    if (id) {
      window.clearInterval(id)
      this.statsPollIntervalByPeer.delete(peerId)
    }
    this.relayActiveByPeer.delete(peerId)
  }

  private async checkRelayAndApplyPolicy(peerId: string): Promise<void> {
    if (!this.audioOnlyOnRelay) return
    const pc = this.peerConnections.get(peerId)
    if (!pc) return
    try {
      const stats = await pc.getStats()
      let selectedPairId: string | undefined
      const reports = new Map<string, RTCStats>()

      stats.forEach((report) => {
        reports.set(report.id, report)
        if (report.type === 'transport') {
          const t = report as RTCStats & { selectedCandidatePairId?: string }
          if (t.selectedCandidatePairId) {
            selectedPairId = t.selectedCandidatePairId
          }
        } else if (report.type === 'candidate-pair') {
          const cp = report as RTCStats & { nominated?: boolean; selected?: boolean }
          if (cp.nominated) {
            selectedPairId = report.id
          }
        }
      })

      if (!selectedPairId) return
      const pair = reports.get(selectedPairId) as (RTCStats & { localCandidateId?: string; remoteCandidateId?: string }) | undefined
      if (!pair) return
      const local = pair.localCandidateId ? (reports.get(pair.localCandidateId) as (RTCStats & { candidateType?: string; ip?: string; address?: string }) | undefined) : undefined
      const remote = pair.remoteCandidateId ? (reports.get(pair.remoteCandidateId) as (RTCStats & { candidateType?: string; ip?: string; address?: string }) | undefined) : undefined
      const localType = local?.candidateType as string | undefined
      const remoteType = remote?.candidateType as string | undefined
      const isRelay = (localType === 'relay') || (remoteType === 'relay')

      // Emit selected_candidate_pair (first and on change)
      this.maybeEmitSelectedPairMetric(peerId, pair, local, remote, isRelay)

      const wasRelay = this.relayActiveByPeer.get(peerId) || false
      if (isRelay && !wasRelay) {
        this.relayActiveByPeer.set(peerId, true)
        // Adjust bitrate for relay
        this.applyBitratePolicy(true).catch(() => {})
        // Downgrade to audio-only via sender encodings
        try {
          await this.setVideoActive(false)
          this.policyForcedAudioOnlyByPeer.set(peerId, true)
          useUIStore.getState().setNotice?.('Network unstable—audio-only mode. Video will return automatically when the connection improves.')
          // Log event
          const globals = (window as unknown as { __guest_session_id?: string; __guest_room_code?: string })
          const sid = globals.__guest_session_id
          const roomCode = globals.__guest_room_code || ''
          if (sid && roomCode) {
            import('../lib/supabase').then(({ logConnectionEvent }) => {
              logConnectionEvent({ session_id: sid, room_code: roomCode, event_type: 'audio_only_enabled', detail: { peer: peerId } }).catch(() => {})
            })
          }
        } catch (e) {
          console.warn('Failed to apply audio-only on relay:', e)
        }
      } else if (!isRelay && wasRelay) {
        this.relayActiveByPeer.set(peerId, false)
        // Adjust bitrate for direct
        this.applyBitratePolicy(false).catch(() => {})
        // Restore video only if policy forced
        try {
          const forced = this.policyForcedAudioOnlyByPeer.get(peerId)
          if (forced) {
            await this.setVideoActive(true)
            this.policyForcedAudioOnlyByPeer.set(peerId, false)
            useUIStore.getState().setNotice?.('Connection improved—video is back on.')
            const globals = (window as unknown as { __guest_session_id?: string; __guest_room_code?: string })
            const sid = globals.__guest_session_id
            const roomCode = globals.__guest_room_code || ''
            if (sid && roomCode) {
              import('../lib/supabase').then(({ logConnectionEvent }) => {
                logConnectionEvent({ session_id: sid, room_code: roomCode, event_type: 'audio_only_restored', detail: { peer: peerId } }).catch(() => {})
              })
            }
          }
        } catch (e) {
          console.warn('Failed to restore video after relay ended:', e)
        }
      }
    } catch (e) {
      console.warn('getStats failed for relay detection:', e)
    }
  }

  private maskIpAddress(addr?: string): string | undefined {
    if (!addr) return undefined
    if (addr.includes(':')) {
      // IPv6: zero out lower 80 bits (keep first 3 hextets)
      const parts = addr.split(':')
      return parts.slice(0, 3).join(':') + '::'
    }
    const segs = addr.split('.')
    if (segs.length === 4) {
      segs[3] = 'xxx'
      return segs.join('.')
    }
    return addr
  }

  private lastEmittedPairByPeer: Map<string, string> = new Map()

  private maybeEmitSelectedPairMetric(
    peerId: string,
    pair: RTCStats & { id: string },
    local?: RTCStats & { candidateType?: string; ip?: string; address?: string },
    remote?: RTCStats & { candidateType?: string; ip?: string; address?: string },
    isRelay?: boolean
  ): void {
    const globals = (window as unknown as { __guest_session_id?: string; __guest_room_code?: string })
    const sid = globals.__guest_session_id
    const roomCode = globals.__guest_room_code || ''
    if (!sid || !roomCode) return

    const pairId = pair.id
    const last = this.lastEmittedPairByPeer.get(peerId)
    const isChange = last != null && last !== pairId
    if (last === pairId) return
    this.lastEmittedPairByPeer.set(peerId, pairId)

    const ua = navigator.userAgent
    const detail = {
      local_type: local?.candidateType || null,
      remote_type: remote?.candidateType || null,
      local_address_masked: this.maskIpAddress((local as unknown as { ip?: string; address?: string })?.ip || (local as unknown as { address?: string })?.address),
      remote_address_masked: this.maskIpAddress((remote as unknown as { ip?: string; address?: string })?.ip || (remote as unknown as { address?: string })?.address),
      network_type: (navigator as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType || null,
      candidate_pair_id: pairId,
      via: isRelay ? 'relay' : 'direct',
      ts_rel_ms: performance.now?.() || null,
      is_change: isChange || false,
      browser: (() => { try { return /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) && !/Chrome\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Other' } catch { return 'Other' } })(),
      browser_version: (() => { const m = ua.match(/(Chrome|Firefox)\/([\d.]+)/); if (m) return m[2]; const s = ua.match(/Version\/([\d.]+)/); return s ? s[1] : 'unknown' })(),
      os: (() => { if (/Android/.test(ua)) return 'Android'; if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'; if (/Mac OS X/.test(ua)) return 'macOS'; if (/Windows NT/.test(ua)) return 'Windows'; return 'Other' })(),
      device_class: (() => { if (/Mobi|Android|iPhone|iPad|iPod/.test(ua)) return 'mobile'; return 'desktop' })(),
    }

    import('../lib/supabase').then(({ logConnectionEvent }) => {
      logConnectionEvent({ session_id: sid, room_code: roomCode, event_type: 'selected_candidate_pair', detail }).catch(() => {})
    })
  }

  private async setVideoActive(active: boolean): Promise<void> {
    try {
      const pcs = Array.from(this.peerConnections.values())
      for (const pc of pcs) {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
        if (!sender) continue
        const params = sender.getParameters?.() || {}
        const enc = Array.isArray(params.encodings) ? params.encodings : [{}]
        if (!Array.isArray(params.encodings)) params.encodings = enc
        if (!enc.length) enc.push({})
        enc[0].active = active
        // Apply bitrate/content hints
        type ContentHintTrack = MediaStreamTrack & { contentHint?: string }
        const t = sender.track as ContentHintTrack | null
        if (t && typeof t.contentHint === 'string') {
          t.contentHint = 'motion'
        }
        // Conservative bitrate policy tweaks; exact targets will be tuned per path
        if (!active) {
          // audio-only path
        } else {
          // restore video
        }
        try {
          await sender.setParameters(params)
        } catch {
          console.warn('setParameters failed; attempting replaceTrack fallback')
          try { await sender.replaceTrack(active ? sender.track! : null) } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.warn('setVideoActive failed:', e)
    }
  }

  private scheduleTurnPhaseUpgrade(peerId: string): void {
    if (!this.phasedGathering) return
    const pc = this.peerConnections.get(peerId)
    if (!pc) return
    // If TURN already included, skip
    const hasTurn = this.turnIceServers().length > 0
    if (!hasTurn) return
    window.setTimeout(async () => {
      try {
        // Perform ICE restart with TURN now included
        const cfg = this.buildIceConfig(true)
        try { pc.setConfiguration?.(cfg) } catch { /* some browsers ignore */ }
        const offer = await pc.createOffer({ iceRestart: true })
        await pc.setLocalDescription(offer)
        const clientId = useWebRTCStore.getState().clientId
        if (clientId) {
          useWebRTCStore.getState().sendSignalingMessage('offer', { from: clientId, to: peerId, offer })
        }
      } catch (e) {
        console.warn('TURN phase upgrade failed:', e)
      }
    }, this.turnDelayMs)
  }

  private clearBackoff(peerId: string): void {
    const t = this.backoffTimersByPeer.get(peerId)
    if (t) {
      window.clearTimeout(t)
      this.backoffTimersByPeer.delete(peerId)
    }
    this.backoffStepByPeer.delete(peerId)
  }

  private scheduleReconnect(peerId: string, reason: string): void {
    const pc = this.peerConnections.get(peerId)
    if (!pc) return
    const state = pc.connectionState
    if (state === 'connected' || state === 'connecting') return
    const step = (this.backoffStepByPeer.get(peerId) || 0) + 1
    const baseDelays = [1000, 2000, 4000, 8000, 10000]
    const idx = Math.min(step - 1, baseDelays.length - 1)
    const jitterFactor = 0.8 + Math.random() * 0.4
    const delay = Math.floor(baseDelays[idx] * jitterFactor)
    this.backoffStepByPeer.set(peerId, step)

    const doAttempt = async () => {
      try {
        console.log(`🔄 Reconnect attempt ${step} to ${peerId} (reason: ${reason})`)
        // Attempt ICE restart first
        const offer = await pc.createOffer({ iceRestart: true })
        await pc.setLocalDescription(offer)
        const clientId = useWebRTCStore.getState().clientId
        if (clientId) {
          useWebRTCStore.getState().sendSignalingMessage('offer', { from: clientId, to: peerId, offer })
        }
        // If we still don't get connected by next window, try full renegotiation
        const renegotiate = async () => {
          if (pc.connectionState !== 'connected') {
            console.log('🔁 Renegotiation after ICE restart for', peerId)
            const fullOffer = await pc.createOffer()
            await pc.setLocalDescription(fullOffer)
            if (clientId) {
              useWebRTCStore.getState().sendSignalingMessage('offer', { from: clientId, to: peerId, offer: fullOffer })
            }
          }
        }
        window.setTimeout(renegotiate, Math.max(1000, delay / 2))
      } catch (e) {
        console.warn('Reconnect attempt failed to create/send offer:', e)
      }
      // Schedule next backoff if still not connected
      const nextState = pc.connectionState
      if (nextState !== 'connected') {
        this.scheduleReconnect(peerId, 'backoff_continue')
      }
    }

    const timer = window.setTimeout(doAttempt, delay)
    this.backoffTimersByPeer.set(peerId, timer)
  }

  private async applyBitratePolicy(isRelay: boolean | 'unknown'): Promise<void> {
    try {
      const ua = navigator.userAgent
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/.test(ua)
      const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua)
      const videoTargetKbps = (() => {
        if (isRelay === true) return isMobile ? 150 : 200
        if (isRelay === 'unknown') return 350
        // direct path
        return 350
      })()
      const videoMaxKbps = isRelay === true ? (isMobile ? 150 : 200) : 1200
      const opusMinKbps = isSafari ? 16 : 16
      const opusMaxKbps = isRelay === true ? 32 : 48

      const pcs = Array.from(this.peerConnections.values())
      for (const pc of pcs) {
        const senderV = pc.getSenders().find(s => s.track && s.track.kind === 'video')
        if (senderV) {
          const p = senderV.getParameters?.() || {}
          const enc = Array.isArray(p.encodings) ? p.encodings : [{}]
          if (!Array.isArray(p.encodings)) p.encodings = enc
          if (!enc.length) enc.push({})
          enc[0].maxBitrate = Math.max((isSafari ? 150000 : 100000), videoTargetKbps * 1000)
          // allow ramp by bumping max over time on direct path
          if (isRelay !== true) {
            enc[0].maxBitrate = videoMaxKbps * 1000
          }
          try { await senderV.setParameters(p) } catch { /* ignore */ }
          const t = senderV.track as (MediaStreamTrack & { contentHint?: string }) | null
          if (t && typeof t.contentHint === 'string') t.contentHint = 'motion'
        }
        const senderA = pc.getSenders().find(s => s.track && s.track.kind === 'audio')
        if (senderA) {
          const p = senderA.getParameters?.() || {}
          const enc = Array.isArray(p.encodings) ? p.encodings : [{}]
          if (!Array.isArray(p.encodings)) p.encodings = enc
          if (!enc.length) enc.push({})
          enc[0].maxBitrate = Math.max(opusMinKbps * 1000, Math.min(opusMaxKbps * 1000, 48000))
          try { await senderA.setParameters(p) } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.warn('applyBitratePolicy failed:', e)
    }
  }
}

export const webrtcManager = new WebRTCManager()
