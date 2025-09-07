import { useEffect, useRef } from 'react'
import { useUIStore } from './stores/uiStore'
import { useAuthStore } from './stores/authStore'
import { useFullscreenContext } from './contexts/useFullscreenContext'
import MenuPanel from './components/MenuPanel'
import LoadingSpinner from './components/LoadingSpinner'
import Auth from './components/Auth'
import StoryLibrary from './components/StoryLibrary'
import FullscreenButton from './components/FullscreenButton'
import { useLocation, useNavigate } from 'react-router-dom'
import InfoBanner from './components/InfoBanner'

function App() {
  const { storyTextScale, setStoryTextScale, notice, setNotice, isLibraryOpen, closeLibrary } = useUIStore()
  const { session, initialized, initialize } = useAuthStore()
  const { isFullscreen } = useFullscreenContext()
  // Library is controlled globally via UI store
  const appRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const handleAuthSuccess = () => {
    navigate('/')
  }

  const path = location.pathname || ''
  const isGuestRoute = path === '/start' || path === '/join' || path.startsWith('/join/') || path.startsWith('/invite/')
  const isAuthRoute = path === '/login' || path === '/register'
  // Never force auth on guest/public routes
  const shouldShowAuth = !session && !isGuestRoute && !isAuthRoute

  useEffect(() => {
    initialize()
  }, [initialize])

  // No-op: openLibrary is available via UI store

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
    if (shouldShowLibrary === 'true' && session) {
      // In lobby, user opted to reopen library after leaving
      // Library is controlled via dedicated pages outside room
      localStorage.removeItem('showLibraryAfterLeave')
    }
  }, [session])

  useEffect(() => {
    document.documentElement.style.setProperty('--story-text-scale', String(storyTextScale))
  }, [storyTextScale])

  // Do not auto-open library; user can open it from UI

  const handleCloseLibrary = () => {
    closeLibrary?.()
  }

  // Public routes are always available; no redirect to /start needed

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
          className="fixed bottom-4 right-4 z-[1030]" 
          targetElement={appRef.current}
          variant="floating"
          showOnDesktop={true}
        />
      </div>
    )
  }

  if (isLibraryOpen) {
    return (
      <div ref={appRef} className="video-first min-h-screen bg-black text-white">
        {notice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1102]">
            <InfoBanner message={notice} onDismiss={() => setNotice?.(null)} />
          </div>
        )}
        <div className="relative">
          {/* Menu visible even when library is open */}
          <div className="absolute top-0 right-0 z-[1035]">
            <MenuPanel />
          </div>
          <button
            onClick={handleCloseLibrary}
            className={`absolute top-4 ${isFullscreen ? 'left-4' : 'left-4'} z-20 control-btn`}
            aria-label="Close library"
          >
            ✕
          </button>
          
          <FullscreenButton 
            className="fixed bottom-4 right-4 z-[1030]" 
            targetElement={appRef.current}
            variant="floating"
            showOnDesktop={true}
          />
          
          <StoryLibrary onClose={handleCloseLibrary} />
        </div>
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
        className="fixed bottom-4 right-4 z-[1030]" 
        targetElement={appRef.current}
        variant="floating"
        showOnDesktop={true}
      />
    </div>
  )
}
export default App
