import { useEffect, useRef, useState } from 'react'
import { useUIStore } from './stores/uiStore'
import { useAuthStore } from './stores/authStore'
import { useRoomStore } from './stores/roomStore'
import { useFullscreenContext } from './contexts/useFullscreenContext'
import VideoContainer from './components/VideoContainer'
import UnifiedStoryOverlay from './components/UnifiedStoryOverlay'
import MenuPanel from './components/MenuPanel'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorMessage from './components/ErrorMessage'
import Auth from './components/Auth'
import StoryLibrary from './components/StoryLibrary'
import FullscreenButton from './components/FullscreenButton'
import { useLocation, useNavigate } from 'react-router-dom'
import InfoBanner from './components/InfoBanner'

function App() {
  const { isLoading, error, storyTextScale, setStoryTextScale, notice, setNotice, isLibraryOpen, openLibrary, closeLibrary, setSessionEndsAtMs } = useUIStore()
  const { session, initialized, initialize } = useAuthStore()
  const { currentRoom, currentStory } = useRoomStore()
  const { isFullscreen } = useFullscreenContext()
  // Library is controlled globally via UI store
  const appRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const [restoring, setRestoring] = useState(false)

  const handleAuthSuccess = () => {
    navigate('/')
  }

  const path = location.pathname || ''
  const isGuestRoute = path === '/start' || path === '/join' || path.startsWith('/join/') || path.startsWith('/invite/')
  const isAuthRoute = path === '/login' || path === '/register'
  // Never force auth while actively in a room (guests should remain in-room on /room)
  const shouldShowAuth = !session && !isGuestRoute && !isAuthRoute && !currentRoom

  useEffect(() => {
    initialize()

    // On refresh in /room, restore active room if persisted
    try {
      const pathNow = window.location.pathname || ''
      if (pathNow.startsWith('/room')) {
        const activeRoomId = localStorage.getItem('activeRoomId')
        const endsAtStr = localStorage.getItem('activeEndsAtMs')
        if (endsAtStr) {
          const endsAt = parseInt(endsAtStr, 10)
          if (!Number.isNaN(endsAt)) setSessionEndsAtMs?.(endsAt)
        }
        if (activeRoomId && !useRoomStore.getState().currentRoom) {
          // Re-enter room without navigating away
          setRestoring(true)
          useRoomStore.getState().enterRoom(activeRoomId)
        }
      }
    } catch (e) {
      console.warn('restore room on refresh failed', e)
    }
  }, [initialize])

  // When room is restored (or if none), stop the restoring spinner
  useEffect(() => {
    if (restoring && currentRoom) {
      setRestoring(false)
    }
  }, [restoring, currentRoom])

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
    if (shouldShowLibrary === 'true' && !currentRoom && session) {
      openLibrary?.()
      localStorage.removeItem('showLibraryAfterLeave')
    }
  }, [currentRoom, session])

  useEffect(() => {
    document.documentElement.style.setProperty('--story-text-scale', String(storyTextScale))
  }, [storyTextScale])

  // Do not auto-open library; user can open it from UI

  const handleCloseLibrary = () => {
    closeLibrary?.()
  }

  // Public routes are always available; no redirect to /start needed

  if (!initialized || restoring) {
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

  if (currentRoom) {
    const replaceChildName = (text: string) => {
      const childName = useRoomStore.getState().childName
      return text.replace(/\{\{childName\}\}/g, childName || 'Alex')
    }

    return (
      <div ref={appRef} className="video-first min-h-screen bg-black text-white">
        {notice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1102]">
            <InfoBanner message={notice} onDismiss={() => setNotice?.(null)} />
          </div>
        )}
        {error && <ErrorMessage message={error} />}
        
        {/* Story Title - Top Left */}
        {currentStory && (
          <div className="absolute top-4 left-4 z-10">
            <h1 className="text-white font-bold text-lg" style={{ fontFamily: 'Fraunces, serif', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {replaceChildName(currentStory.title)}
            </h1>
          </div>
        )}
        
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <VideoContainer />
            <UnifiedStoryOverlay />
            <MenuPanel />
            
            {/* Fullscreen Button - Bottom Right, Always On Top */}
            <FullscreenButton 
              className="fixed bottom-4 right-4 z-[1030]" 
              targetElement={appRef.current}
              variant="floating"
              showOnDesktop={true}
            />
            
            {/* Library modal controlled globally; nothing to render here */}
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
        className="fixed bottom-4 right-4 z-[1030]" 
        targetElement={appRef.current}
        variant="floating"
        showOnDesktop={true}
      />
    </div>
  )
}
export default App
