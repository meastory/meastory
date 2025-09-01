import { useWebRTCStore } from '../stores/webrtcStore'

class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private dataChannels: Map<string, RTCDataChannel> = new Map()
  private iceCandidatesQueue: Map<string, RTCIceCandidateInit[]> = new Map()
  private iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    console.log('🔗 Creating peer connection for:', peerId)
    
    const peerConnection = new RTCPeerConnection(this.iceServers)
    
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
        // Data channel should be ready now
        console.log('📡 Data channels:', Array.from(this.dataChannels.keys()))
      } else if (state === 'connecting') {
        console.log(`🔄 Connecting to ${peerId}...`)
      } else if (state === 'disconnected') {
        console.log(`�� Disconnected from ${peerId}`)
      } else if (state === 'failed') {
        console.error(`❌ Connection failed for ${peerId}`)
        this.handleConnectionFailure(peerId)
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

  async createOffer(peerId: string): Promise<void> {
    console.log('📤 Creating offer for:', peerId)
    
    const peerConnection = await this.createPeerConnection(peerId)
    
    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      
      const clientId = useWebRTCStore.getState().clientId
      console.log('📤 Sending offer from:', clientId, 'to:', peerId)
      useWebRTCStore.getState().sendSignalingMessage('offer', {
        from: clientId,
        to: peerId,
        offer
      })
      
      // Create data channel for additional communication
      const dataChannel = peerConnection.createDataChannel('story-sync')
      this.setupDataChannel(peerId, dataChannel)
      
    } catch (error) {
      console.error('❌ Error creating offer:', error)
    }
  }

  async handleOffer(from: string, offer: RTCSessionDescriptionInit): Promise<void> {
    console.log('📨 Handling offer from:', from)
    
    const peerConnection = await this.createPeerConnection(from)
    
    try {
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
      
      // Create data channel for the answering side
      const dataChannel = peerConnection.createDataChannel('story-sync')
      this.setupDataChannel(from, dataChannel)
      
      // Process any queued ICE candidates
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
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('✅ Answer processed from:', from)
      
      // Process any queued ICE candidates now that remote description is set
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
    
    // Check if remote description is set before adding ICE candidates
    if (peerConnection.remoteDescription) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error)
      }
    } else {
      console.log('🧊 Queuing ICE candidate until remote description is set')
      // Queue the candidate to be added later
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
    
    // Clear the queue
    this.iceCandidatesQueue.delete(peerId)
  }

  setupDataChannel(peerId: string, dataChannel: RTCDataChannel): void {
    console.log('📡 Setting up data channel for:', peerId)
    
    dataChannel.onopen = () => {
      console.log('📡 Data channel opened for:', peerId)
    }
    
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('📡 Data channel message from', peerId, ':', message)
        
        // Handle different message types
        switch (message.type) {
          case 'story-choice':
            // Handle story choice synchronization
            this.handleStoryChoiceSync(message.choiceId)
            break
          case 'child-name-change':
            // Handle child name synchronization
            this.handleChildNameSync(message.name)
            break
          default:
            console.log('📡 Unknown data channel message type:', message.type)
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

  sendDataMessage(peerId: string, message: any): void {
    const dataChannel = this.dataChannels.get(peerId)
    
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(message))
    } else {
      console.warn('�� Data channel not ready for:', peerId)
    }
  }

  broadcastDataMessage(message: any): void {
    this.dataChannels.forEach((dataChannel: RTCDataChannel) => {
      if (dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(message))
      }
    })
  }

  handleConnectionFailure(peerId: string): void {
    console.error(`❌ Connection failed for ${peerId}`)
    
    // Clean up peer connection
    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection) {
      peerConnection.close()
      this.peerConnections.delete(peerId)
    }
    
    // Remove participant
    useWebRTCStore.getState().removeParticipant(peerId)
    
    // Attempt reconnection after a delay
    setTimeout(() => {
      console.log(`🔄 Attempting reconnection to ${peerId}`)
      this.createOffer(peerId)
    }, 3000)
  }

  closeAllConnections(): void {
    console.log('�� Closing all WebRTC connections')
    
    // Close peer connections
    this.peerConnections.forEach((peerConnection, peerId) => {
      console.log('🔌 Closing connection to:', peerId)
      peerConnection.close()
    })
    this.peerConnections.clear()
    
    // Close data channels
    this.dataChannels.forEach((dataChannel, peerId) => {
      console.log('🔌 Closing data channel to:', peerId)
      dataChannel.close()
    })
    this.dataChannels.clear()

    // Clear ICE candidate queues
    this.iceCandidatesQueue.clear()
  }

  // Story synchronization methods
  syncStoryChoice(choiceId: number): void {
    this.broadcastDataMessage({
      type: 'story-choice',
      choiceId,
      timestamp: Date.now()
    })
  }

  syncChildName(name: string): void {
    this.broadcastDataMessage({
      type: 'child-name-change',
      name,
      timestamp: Date.now()
    })
  }

  handleStoryChoiceSync(choiceId: number): void {
    console.log('📖 Syncing story choice from remote participant:', choiceId)
    // Import room store dynamically to avoid circular dependencies
    import('../stores/roomStore').then(({ useRoomStore }) => {
      const roomStore = useRoomStore.getState()
      if (roomStore.currentStory) {
        roomStore.loadScene(choiceId)
      }
    }).catch(error => {
      console.error('❌ Error syncing story choice:', error)
    })
  }

  handleChildNameSync(name: string): void {
    console.log('👤 Syncing child name from remote participant:', name)
    // Import room store dynamically to avoid circular dependencies
    import('../stores/roomStore').then(({ useRoomStore }) => {
      const roomStore = useRoomStore.getState()
      // Update child name in local storage and state
      localStorage.setItem('childName', name)
      roomStore.setChildName(name)
    }).catch(error => {
      console.error('❌ Error syncing child name:', error)
    })
  }
}

// Export singleton instance
export const webrtcManager = new WebRTCManager()
