import { useRef, useEffect } from 'react'
import { useWebRTCStore } from '../stores/webrtcStore'

interface VideoFeedProps {
  participantId?: string // If not provided, shows local stream
  className?: string
  showControls?: boolean
}

export default function VideoFeed({ participantId, className = '', showControls = false }: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { localStream, participants, isMicMuted, isVideoOff, toggleMic, toggleVideo } = useWebRTCStore()
  
  const isLocal = !participantId
  const participant = participantId ? participants.get(participantId) : null
  const stream = isLocal ? localStream : participant?.stream
  
  useEffect(() => {
    const videoElement = videoRef.current
    if (videoElement && stream) {
      videoElement.srcObject = stream
      videoElement.play().catch(error => {
        console.error('❌ Error playing video:', error)
      })
    }
  }, [stream])
  
  // Handle participant leaving
  useEffect(() => {
    if (participantId && !participant) {
      const videoElement = videoRef.current
      if (videoElement) {
        videoElement.srcObject = null
      }
    }
  }, [participantId, participant])
  
  const getDisplayName = () => {
    if (isLocal) return 'You'
    return participant?.name || `Participant ${participantId?.slice(0, 4)}`
  }
  
  const getStatusIndicators = () => {
    if (isLocal) {
      return {
        isMuted: isMicMuted,
        isVideoOff: isVideoOff
      }
    }
    return {
      isMuted: participant?.isMuted || false,
      isVideoOff: participant?.isVideoOff || false
    }
  }
  
  const { isMuted, isVideoOff: participantVideoOff } = getStatusIndicators()
  
  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        muted={isLocal} // Always mute local video to prevent feedback
        playsInline
        autoPlay
      />
      
      {/* Video Off Overlay */}
      {(isVideoOff && isLocal) || (participantVideoOff && !isLocal) ? (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">��</span>
            </div>
            <p className="text-gray-300 text-sm">Camera off</p>
          </div>
        </div>
      ) : null}
      
      {/* Participant Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm font-medium">
              {getDisplayName()}
            </span>
            
            {/* Status Indicators */}
            <div className="flex space-x-1">
              {isMuted && (
                <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">🔇</span>
                </div>
              )}
              {(isVideoOff && isLocal) || (participantVideoOff && !isLocal) && (
                <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">📷</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Local Controls */}
          {showControls && isLocal && (
            <div className="flex space-x-2">
              <button
                onClick={toggleMic}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isMicMuted 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                <span className="text-sm">
                  {isMicMuted ? '🔇' : '��'}
                </span>
              </button>
              
              <button
                onClick={toggleVideo}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isVideoOff 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              >
                <span className="text-sm">
                  {isVideoOff ? '📷' : '📹'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Connection Status */}
      {!stream && !isLocal && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">⏳</span>
            </div>
            <p className="text-gray-300 text-sm">Connecting...</p>
          </div>
        </div>
      )}
    </div>
  )
}
