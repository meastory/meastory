import { useParams, useNavigate } from 'react-router-dom'
import InviteContent from '../components/InviteContent'
import FullscreenButton from '../components/FullscreenButton'
import InstallPWAButton from '../components/InstallPWAButton'
import MenuPanel from '../components/MenuPanel'
import { useUIStore } from '../stores/uiStore'
import StoryLibrary from '../components/StoryLibrary'

export default function Invite() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { isLibraryOpen, closeLibrary } = useUIStore()

  return (
    <div className="min-h-screen bg-black">
      <div className="absolute top-4 right-4 z-[1101]">
        <MenuPanel />
      </div>
      <div className="absolute bottom-4 right-4 z-[1101] flex gap-2">
        <FullscreenButton showOnDesktop variant="minimal" size="sm" />
        <InstallPWAButton />
      </div>
      
      <InviteContent code={code} isPopup={false} />
      
      <div>
        <button
          onClick={() => navigate(`/join/${code.toUpperCase()}`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Join Room
        </button>
      </div>
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
    </div>
  )
}
