import { useWebRTCStore } from '../stores/webrtcStore'
import { useMediaPermissions } from '../hooks/useMediaPermissions'
import VideoFeed from './VideoFeed'
import type { Participant as RTCParticipant } from '../stores/webrtcStore'

export default function VideoGrid() {
  const { participants, isConnected, isConnecting } = useWebRTCStore()
  const { camera, microphone, isLoading: permissionsLoading, error: permissionsError, requestPermissions } = useMediaPermissions()
  
  const participantList = Array.from(participants.values())
  
  const getGridLayout = () => {
    const totalParticipants = participantList.length + 1
    if (totalParticipants === 1) return 'grid-cols-1'
    if (totalParticipants === 2) return 'grid-cols-2'
    if (totalParticipants <= 4) return 'grid-cols-2'
    if (totalParticipants <= 6) return 'grid-cols-3'
    return 'grid-cols-3'
  }
  
  const getVideoSize = () => {
    const totalParticipants = participantList.length + 1
    if (totalParticipants === 1) return 'aspect-video max-w-2xl mx-auto'
    if (totalParticipants === 2) return 'aspect-video'
    return 'aspect-square'
  }
  
  if ((camera === 'denied' || microphone === 'denied') && !isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Permissions Required</h3>
          <p className="text-gray-300 mb-4">
            Camera and microphone access is required to participate in video calls.
          </p>
          {permissionsError && (
            <p className="text-red-400 text-sm mb-4">{permissionsError}</p>
          )}
          <button
            onClick={requestPermissions}
            disabled={permissionsLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {permissionsLoading ? 'Requesting...' : 'Allow Access'}
          </button>
        </div>
      </div>
    )
  }
  
  if (isConnecting || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📡</span>
          </div>
          <p className="text-gray-300">
            {isConnecting ? 'Connecting to video call...' : 'Checking permissions...'}
          </p>
        </div>
      </div>
    )
  }
  
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📹</span>
          </div>
          <p className="text-gray-300">Connect to a room to start video chat</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full p-4">
      <div className={`grid ${getGridLayout()} gap-4 h-full`}>
        <VideoFeed
          className={`${getVideoSize()}`}
          showControls={true}
        />
        {participantList.map((participant: RTCParticipant) => (
          <VideoFeed
            key={participant.id}
            participantId={participant.id}
            className={`${getVideoSize()}`}
            showControls={false}
          />
        ))}
      </div>
    </div>
  )
}
