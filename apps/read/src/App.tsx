import { useEffect, useState, useRef } from 'react'
import { useUIStore } from './stores/uiStore'
import { useAuthStore } from './stores/authStore'
import { useRoomStore } from './stores/roomStore'
import { useFullscreenContext } from './contexts/useFullscreenContext'
import VideoContainer from './components/VideoContainer'
import StoryOverlay from './components/StoryOverlay'
import MenuPanel from './components/MenuPanel'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorMessage from './components/ErrorMessage'
import Auth from './components/Auth'
import StoryPlayer from './components/StoryPlayer'
import StoryLibrary from './components/StoryLibrary'
import FullscreenButton from './components/FullscreenButton'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import InRoomStoryPicker from './components/InRoomStoryPicker'
import InfoBanner from './components/InfoBanner'

function App() {
  const { isLoading, error, storyTextScale, setStoryTextScale, notice, setNotice } = useUIStore()
  const { session, initialized, initialize } = useAuthStore()
  const { currentRoom, currentStory } = useRoomStore()
  const { isFullscreen } = useFullscreenContext()
  const [showLibrary, setShowLibrary] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const appRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const handleAuthSuccess = () => {
    navigate('/')
  }

  const path = location.pathname || ''
  const guestFlag = import.meta.env.VITE_FEATURE_GUEST_FLOW === 'true'
  const isGuestRoute = path === '/start' || path === '/join' || path.startsWith('/join/') || path.startsWith('/invite/')
  const isAuthRoute = path === '/login' || path === '/register'
  const shouldRedirectToStart = !session && guestFlag && !isGuestRoute && !isAuthRoute
  const shouldShowAuth = !session && !isGuestRoute && !isAuthRoute

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const roomStore = useRoomStore.getState()
    const withLibrary = roomStore as typeof roomStore & { showLibrary?: () => void }
    withLibrary.showLibrary = () => {
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

  useEffect(() => {
    if (currentRoom && !currentStory) {
      setShowPicker(true)
    }
  }, [currentRoom, currentStory])

  const handleCloseLibrary = () => {
    setShowLibrary(false)
  }

  if (shouldRedirectToStart) {
    return <Navigate to="/start" replace />
  }

  if (!initialized) {
    return <LoadingSpinner />
  }

  if (shouldShowAuth) {
    return (
      <div ref={appRef} className="video-first min-h-screen bg-black text-white relative">
        {notice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1102]">
            <InfoBanner message={notice} onDismiss={() => setNotice?.(null)} />
          </div>
        )}
        <Auth onAuthSuccess={handleAuthSuccess} />
        <FullscreenButton 
          className="fixed top-4 right-4 z-50" 
          targetElement={appRef.current}
          variant="floating"
        />
      </div>
    )
  }

  if (showLibrary) {
    return (
      <div ref={appRef} className="video-first min-h-screen bg-black text-white">
        {notice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1102]">
            <InfoBanner message={notice} onDismiss={() => setNotice?.(null)} />
          </div>
        )}
        <div className="relative">
          <button
            onClick={handleCloseLibrary}
            className={`
              absolute top-4 z-20 p-2 rounded-full bg-gray-800 text-white 
              hover:bg-gray-700 transition-colors
              ${isFullscreen ? 'right-4' : 'right-16'}
            `}
            aria-label="Close library"
          >
            ✕
          </button>
          
          <FullscreenButton 
            className="fixed top-4 right-4 z-50" 
            targetElement={appRef.current}
            variant="floating"
          />
          
          <StoryLibrary onClose={handleCloseLibrary} />
        </div>
      </div>
    )
  }

  if (currentRoom) {
    return (
      <div ref={appRef} className="video-first min-h-screen bg-black text-white">
        {notice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1102]">
            <InfoBanner message={notice} onDismiss={() => setNotice?.(null)} />
          </div>
        )}
        {error && <ErrorMessage message={error} />}
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <VideoContainer />
            <StoryOverlay />
            <StoryPlayer />
            <MenuPanel />
            
            <button
              onClick={() => setShowPicker(true)}
              className={`
                fixed top-6 left-6 z-[100] px-3 py-2 rounded bg-green-600 
                hover:bg-green-700 text-white pointer-events-auto
                transition-all duration-200
              `}
            >
              📚
            </button>
            
            <FullscreenButton 
              className="fixed top-6 right-6 z-[100]" 
              targetElement={appRef.current}
              variant="floating"
            />
            
            {showPicker && (
              <InRoomStoryPicker onClose={() => setShowPicker(false)} />
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div ref={appRef} className="video-first min-h-screen bg-black text-white">
      {notice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1102]">
          <InfoBanner message={notice} onDismiss={() => setNotice?.(null)} />
        </div>
      )}
      <MenuPanel />
      <FullscreenButton 
        className="fixed top-4 right-4 z-50" 
        targetElement={appRef.current}
        variant="floating"
      />
    </div>
  )
}
export default App
