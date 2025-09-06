import { useEffect, useRef, useState } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useRoomStore } from '../stores/roomStore'
import VideoContainer from '../components/VideoContainer'
import UnifiedStoryOverlay from '../components/UnifiedStoryOverlay'
import MenuPanel from '../components/MenuPanel'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import FullscreenButton from '../components/FullscreenButton'
import StoryLibrary from '../components/StoryLibrary'

export default function Room() {
  const { isLoading, error, setSessionEndsAtMs, isLibraryOpen, closeLibrary } = useUIStore()
  const { currentRoom, currentStory, enterRoom } = useRoomStore()
  const appRef = useRef<HTMLDivElement>(null)
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    // Restore active room if code/id saved
    try {
      const activeRoomId = localStorage.getItem('activeRoomId')
      const endsAtStr = localStorage.getItem('activeEndsAtMs')
      if (endsAtStr) {
        const endsAt = parseInt(endsAtStr, 10)
        if (!Number.isNaN(endsAt)) setSessionEndsAtMs?.(endsAt)
      }
      if (activeRoomId && !currentRoom) {
        enterRoom(activeRoomId).finally(() => setRestoring(false))
      } else {
        setRestoring(false)
      }
    } catch {
      setRestoring(false)
    }
  }, [])

  if (restoring) return <LoadingSpinner />

  if (!currentRoom) {
    return (
      <div ref={appRef} className="video-first min-h-screen bg-black text-white">
        <MenuPanel />
        <FullscreenButton 
          className="fixed bottom-4 right-4 z-[1030]" 
          targetElement={appRef.current}
          variant="floating"
          showOnDesktop={true}
        />
      </div>
    )
  }

  return (
    <div ref={appRef} className="video-first min-h-screen bg-black text-white">
      {error && <ErrorMessage message={error} />}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Story Title - Top Left */}
          {currentStory && (
            <div className="absolute top-6 left-4 z-10">
              <h1 className="text-white font-bold text-lg" style={{ fontFamily: 'Fraunces, serif', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                {(() => {
                  const cn = useRoomStore.getState().childName
                  return (currentStory.title || '').replace(/\{\{childName\}\}/g, cn || 'Alex')
                })()}
              </h1>
            </div>
          )}
          <VideoContainer />
          <UnifiedStoryOverlay />
          <MenuPanel />
          <FullscreenButton 
            className="fixed bottom-4 right-4 z-[1030]" 
            targetElement={appRef.current}
            variant="floating"
            showOnDesktop={true}
          />
          {isLibraryOpen && (
            <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="relative w-full max-w-5xl">
                <button
                  onClick={() => closeLibrary?.()}
                  className="absolute -top-3 -right-3 z-[2001] control-btn"
                  aria-label="Close library"
                >
                  ✕
                </button>
                <StoryLibrary onClose={() => closeLibrary?.()} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}


