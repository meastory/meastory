import { useRef, useEffect } from 'react'
import { useWebRTCStore } from '../stores/webrtcStore'

interface VideoFeedProps {
  participantId?: string // If not provided, shows local stream
  className?: string
  showControls?: boolean
}

export default function VideoFeed({ participantId, className = '' }: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { localStream, participants, isMicMuted, isVideoOff } = useWebRTCStore()
  
  const isLocal = !participantId
  const participant = participantId ? participants.get(participantId) : null
  const stream = isLocal ? localStream : participant?.stream
  
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    if (stream) {
      try {
        console.log(`🎞️ Assigning stream to video (${isLocal ? 'local' : `remote:${participantId}`})`, {
          tracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState })),
        })
        // Always reassign to ensure the element attaches latest tracks
        videoElement.srcObject = stream
        
        const tryPlay = async () => {
          try {
            await videoElement.play()
            console.log('▶️ Video play started successfully')
          } catch (err) {
            console.warn('⚠️ Autoplay failed, retrying with muted video...', err)
            const originallyMuted = videoElement.muted
            videoElement.muted = true
            try {
              await videoElement.play()
              console.log('▶️ Video play succeeded after muting')
            } catch (err2) {
              console.error('❌ Video play failed even after muting:', err2)
            } finally {
              if (!isLocal) {
                videoElement.muted = originallyMuted
              }
            }
          }
        }

        if (videoElement.readyState >= 2) {
          tryPlay()
        } else {
          const onLoaded = () => {
            videoElement.removeEventListener('loadedmetadata', onLoaded)
            tryPlay()
          }
          videoElement.addEventListener('loadedmetadata', onLoaded)
        }
      } catch (error) {
        console.error('❌ Error attaching stream to video element:', error)
      }
    } else {
      console.log(`⏳ No stream available for ${isLocal ? 'local' : `remote:${participantId}`}; clearing srcObject`)
      videoElement.srcObject = null
    }
  }, [stream, participantId, isLocal])
  
  // Handle participant leaving
  useEffect(() => {
    if (participantId && !participant) {
      const videoElement = videoRef.current
      if (videoElement) {
        console.log(`👋 Participant ${participantId} left; clearing video srcObject`)
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
        muted={isLocal}
        playsInline
        autoPlay
      />
      
      {/* Video Off Overlay */}
      {(isVideoOff && isLocal) || (participantVideoOff && !isLocal) ? (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-[900]">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">📷</span>
            </div>
            <p className="text-gray-300 text-sm">Camera off</p>
          </div>
        </div>
      ) : null}
      
      {/* Participant Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 z-[950]">
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
              {(isVideoOff && isLocal) || (participantVideoOff && !isLocal) ? (
                <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">📷</span>
                </div>
              ) : null}
            </div>
          </div>
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
