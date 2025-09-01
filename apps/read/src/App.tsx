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

function App() {
  const { isLoading, error, storyTextScale, setStoryTextScale } = useUIStore()
  const { session, initialized, initialize } = useAuthStore()
  const { currentRoom } = useRoomStore()
  const [showLibrary, setShowLibrary] = useState(false)

  // Initialize auth state on app load
  useEffect(() => {
    initialize()
  }, [initialize])

  // Set up library callback in room store
  useEffect(() => {
    const roomStore = useRoomStore.getState()
    const extendedStore = roomStore as any
    extendedStore.showLibrary = () => {
      console.log('📚 Opening library from room context')
      setShowLibrary(true)
    }
  }, [])

  // Initialize story text scale from localStorage
  useEffect(() => {
    const savedScale = localStorage.getItem('storyTextScale')
    if (savedScale) {
      const scale = parseFloat(savedScale)
      if (!isNaN(scale)) {
        setStoryTextScale(scale)
      }
    }
  }, [setStoryTextScale])

  // Check for library navigation flag (legacy support)
  useEffect(() => {
    const shouldShowLibrary = localStorage.getItem('showLibraryAfterLeave')
    if (shouldShowLibrary === 'true' && !currentRoom && session) {
      setShowLibrary(true)
      localStorage.removeItem('showLibraryAfterLeave')
    }
  }, [currentRoom, session])

  // Update CSS variable when scale changes
  useEffect(() => {
    document.documentElement.style.setProperty('--story-text-scale', String(storyTextScale))
  }, [storyTextScale])

  const handleAuthSuccess = () => {
    console.log('✅ Authentication successful')
  }

  const handleCloseLibrary = () => {
    setShowLibrary(false)
  }

  if (!initialized) {
    return <LoadingSpinner />
  }

  // Show auth if no session
  if (!session) {
    return (
      <div className="video-first min-h-screen bg-black text-white">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    )
  }

  // Show library if requested
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

  // Show room interface if in a room
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
          </>
        )}
      </div>
    )
  }

  // Default state - show room manager
  return (
    <div className="video-first min-h-screen bg-black text-white">
      <MenuPanel />
    </div>
  )
}

export default App
