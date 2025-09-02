import { useEffect, useState } from 'react'
import { useUIStore } from './stores/uiStore'
import { useAuthStore } from './stores/authStore'
import { useRoomStore } from './stores/roomStore'
import VideoContainer from './components/VideoContainer'
import StoryOverlay from './components/StoryOverlay'
import MenuPanel from './components/MenuPanel'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorMessage from './components/ErrorMessage'
import Auth from './components/Auth'
import StoryPlayer from './components/StoryPlayer'
import StoryLibrary from './components/StoryLibrary'
import { Navigate } from 'react-router-dom'
import InRoomStoryPicker from './components/InRoomStoryPicker'

function App() {
  const { isLoading, error, storyTextScale, setStoryTextScale } = useUIStore()
  const { session, initialized, initialize } = useAuthStore()
  const { currentRoom, currentStory } = useRoomStore()
  const [showLibrary, setShowLibrary] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const roomStore = useRoomStore.getState()
    const withLibrary = roomStore as typeof roomStore & { showLibrary?: () => void }
    withLibrary.showLibrary = () => {
      console.log('📚 Opening library from room context')
      setShowLibrary(true)
    }
  }, [])

  useEffect(() => {
    const savedScale = localStorage.getItem('storyTextScale')
    if (savedScale) {
      const scale = parseFloat(savedScale)
      if (!isNaN(scale)) {
        setStoryTextScale(scale)
      }
    }
  }, [setStoryTextScale])

  useEffect(() => {
    const shouldShowLibrary = localStorage.getItem('showLibraryAfterLeave')
    if (shouldShowLibrary === 'true' && !currentRoom && session) {
      setShowLibrary(true)
      localStorage.removeItem('showLibraryAfterLeave')
    }
  }, [currentRoom, session])

  useEffect(() => {
    document.documentElement.style.setProperty('--story-text-scale', String(storyTextScale))
  }, [storyTextScale])

  // Auto-open picker when a room is entered with no story loaded
  useEffect(() => {
    if (currentRoom && !currentStory) {
      setShowPicker(true)
    }
  }, [currentRoom, currentStory])

  const handleAuthSuccess = () => {
    console.log('✅ Authentication successful')
  }

  const handleCloseLibrary = () => {
    setShowLibrary(false)
  }

  if (!initialized) {
    return <LoadingSpinner />
  }

  // Guest-only flow: if no session and flag is enabled, go to /start
  if (!session && import.meta.env.VITE_FEATURE_GUEST_FLOW === 'true') {
    return <Navigate to="/start" replace />
  }

  if (!session) {
    return (
      <div className="video-first min-h-screen bg-black text-white">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    )
  }

  if (showLibrary) {
    return (
      <div className="video-first min-h-screen bg-black text-white">
        <div className="relative">
          <button
            onClick={handleCloseLibrary}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors"
            aria-label="Close library"
          >
            ✕
          </button>
          <StoryLibrary onClose={handleCloseLibrary} />
        </div>
      </div>
    )
  }

  if (currentRoom) {
    return (
      <div className="video-first min-h-screen bg-black text-white">
        {error && <ErrorMessage message={error} />}

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <VideoContainer />
            <StoryOverlay />
            <StoryPlayer />
            <MenuPanel />

            {/* Floating Pick Story button if no story loaded */}
            {!currentStory && (
              <button
                onClick={() => setShowPicker(true)}
                className="fixed bottom-4 left-4 z-40 px-4 py-3 rounded bg-green-600 hover:bg-green-700 text-white"
              >
                Pick a Story
              </button>
            )}

            {showPicker && (
              <InRoomStoryPicker onClose={() => setShowPicker(false)} />
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="video-first min-h-screen bg-black text-white">
      <MenuPanel />
    </div>
  )
}

export default App
