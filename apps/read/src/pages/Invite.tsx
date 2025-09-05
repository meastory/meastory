import { useParams, useNavigate } from 'react-router-dom'
import InviteContent from '../components/InviteContent'
import FullscreenButton from '../components/FullscreenButton'
import InstallPWAButton from '../components/InstallPWAButton'

export default function Invite() {
  const { code = '' } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-black">
      <div className="absolute bottom-4 right-4 z-[1101] flex gap-2">
        <FullscreenButton showOnDesktop variant="minimal" size="sm" />
        <InstallPWAButton />
      </div>
      
      <InviteContent code={code} isPopup={false} />
      
      <div className="fixed bottom-6 left-6">
        <button
          onClick={() => navigate(`/join/${code.toUpperCase()}`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Join Room
        </button>
      </div>
    </div>
  )
}
