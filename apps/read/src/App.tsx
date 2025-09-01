import { useEffect } from 'react'
import { useUIStore } from './stores/uiStore'
import VideoContainer from './components/VideoContainer'
import StoryOverlay from './components/StoryOverlay'
import MenuPanel from './components/MenuPanel'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorMessage from './components/ErrorMessage'

function App() {
  const { isLoading, error, storyTextScale, setStoryTextScale } = useUIStore()

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

  return (
    <div className="video-first-layout">
      <VideoContainer />
      <StoryOverlay />
      <MenuPanel />
      
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
          <ErrorMessage message={error} />
        </div>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
          <LoadingSpinner />
        </div>
      )}
    </div>
  )
}

export default App
