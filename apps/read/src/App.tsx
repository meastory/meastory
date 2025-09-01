import { useEffect } from 'react'
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

function App() {
  const { isLoading, error, storyTextScale, setStoryTextScale } = useUIStore()
  const { session, initialized, initialize } = useAuthStore()
  const { currentRoom } = useRoomStore()

  // Initialize auth state on app load
  useEffect(() => {
    initialize()
  }, [initialize])

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

  // Update CSS variable when scale changes
  useEffect(() => {
    document.documentElement.style.setProperty('--story-text-scale', String(storyTextScale))
  }, [storyTextScale])

  const handleAuthSuccess = () => {
    // Auth success is handled by the auth store listener
    console.log('✅ Authentication successful')
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
            {currentRoom.story_id ? <StoryPlayer /> : <StoryOverlay />}
            <MenuPanel />
          </>
        )}
      </div>
    )
  }

  // Show room manager if not in a room
  return (
    <div className="video-first min-h-screen bg-black text-white">
      {error && <ErrorMessage message={error} />}
      <MenuPanel />
    </div>
  )
}

export default App
