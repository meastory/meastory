import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { useUIStore } from './stores/uiStore'
import Auth from './components/Auth'
import VideoContainer from './components/VideoContainer'
import StoryOverlay from './components/StoryOverlay'
import MenuPanel from './components/MenuPanel'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorMessage from './components/ErrorMessage'

function App() {
  const { user, session, loading: authLoading, initialized, initialize } = useAuthStore()
  const { isLoading: uiLoading, error, storyTextScale, setStoryTextScale } = useUIStore()

  // Initialize authentication on app start
  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])

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

  // Show loading spinner during auth initialization
  if (authLoading && !initialized) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Show auth component if not authenticated
  if (!session || !user) {
    return <Auth onAuthSuccess={() => {}} />
  }

  // Main app content
  return (
    <div className="video-first min-h-screen bg-black text-white">
      {error && <ErrorMessage message={error} />}

      {uiLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <VideoContainer />
          <StoryOverlay />
          <MenuPanel />
        </>
      )}
    </div>
  )
}

export default App
