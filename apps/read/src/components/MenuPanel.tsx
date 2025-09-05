import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useRoomStore } from '../stores/roomStore'
import { useWebRTCStore } from '../stores/webrtcStore'
import PresenceBadge from './PresenceBadge'
import InviteContent from './InviteContent'
import { useTierPolicy } from '../hooks/useTierPolicy'

export default function MenuPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  // Timer display is sourced from UI store's sessionRemainingMs
  const menuRef = useRef<HTMLDivElement>(null)
  const inviteRef = useRef<HTMLDivElement>(null)
  const { user, signOut } = useAuthStore()
  const { openLibrary, sessionRemainingMs } = useUIStore()
  const { currentRoom, leaveRoom } = useRoomStore()
  const { toggleMic, toggleVideo, isMicMuted, isVideoOff } = useWebRTCStore()
  const { getPolicyForTier } = useTierPolicy()

  const handleMenuItemClick = () => {
    setIsOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  const handleLeaveRoom = () => {
    leaveRoom()
    setIsOpen(false)
  }

  const handleOpenLibrary = () => {
    console.log('📚 Opening library from menu')
    try {
      openLibrary?.()
    } catch (error) {
      console.warn('Could not open library:', error)
    }
    handleMenuItemClick()
  }

  const handleToggleMic = () => {
    toggleMic()
    handleMenuItemClick()
  }

  const handleToggleVideo = () => {
    toggleVideo()
    handleMenuItemClick()
  }

  const handleShowInvite = () => {
    setShowInvite(true)
    handleMenuItemClick()
  }

  const handleCloseInvite = () => {
    setShowInvite(false)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
      if (inviteRef.current && !inviteRef.current.contains(event.target as Node)) {
        setShowInvite(false)
      }
    }

    if (isOpen || showInvite) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, showInvite])

  return (
    <>
      {/* Menu Button - Top Right */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="menu-btn"
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Time Remaining Warning (tier-based) */}
      {(() => {
        const effTier = useRoomStore.getState().effectiveRoomTier || 'guest'
        const policy = getPolicyForTier(effTier)
        if (!policy.show_timer_in_menu) return null
        if (sessionRemainingMs == null) return null
        const warn = policy.inroom_warning_threshold_minutes ?? 0
        const remainingMinutes = Math.floor(sessionRemainingMs / 60000)
        if (warn > 0 && remainingMinutes <= warn) {
          return (
            <div className="absolute top-16 right-4 z-10 bg-red-600 text-white px-2 py-1 rounded text-sm font-mono">
              {String(remainingMinutes).padStart(2, '0')}:00
            </div>
          )
        }
        return null
      })()}

      {/* Menu Panel */}
      {isOpen && (
        <div 
          ref={menuRef}
          className="absolute top-4 right-16 z-[1002] bg-gray-800 text-white rounded-lg shadow-lg p-4 min-w-48"
        >
          <div className="space-y-3">
            {currentRoom ? (
              <>
                {/* User at top */}
                {user && (
                  <div className="pb-2">
                    <p className="text-sm text-gray-300">User: {user.display_name || 'Logged In'}</p>
                  </div>
                )}

                {/* Room Info */}
                <div className="border-b border-gray-600 pb-3 mb-3">
                  <p className="text-sm text-gray-300 mb-1">
                    Room: <span className="font-semibold text-white">{currentRoom.name}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Code: {currentRoom.code}
                  </p>
                </div>

                {/* Library & Communication */}
                <button 
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                  onClick={handleOpenLibrary}
                >
                  📚 Open Library
                </button>
                <button 
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                  onClick={handleShowInvite}
                >
                  📧 Send Invite
                </button>
                
                <hr className="border-gray-600" />
                
                {/* Media Controls */}
                <button 
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                  onClick={handleToggleMic}
                >
                  {isMicMuted ? '🔇' : '🎤'} {isMicMuted ? 'Unmute' : 'Mute'} Microphone
                </button>
                <button 
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                  onClick={handleToggleVideo}
                >
                  {isVideoOff ? '📷' : '📹'} {isVideoOff ? 'Turn On' : 'Turn Off'} Camera
                </button>
                
                <hr className="border-gray-600" />
                
                {/* Time (live) and Presence (separate line) */}
                {(() => {
                  const effTier = useRoomStore.getState().effectiveRoomTier || 'guest'
                  const policy = getPolicyForTier(effTier)
                  if (!policy.show_timer_in_menu) return null
                  return (
                    <div className="px-3 py-2 text-sm text-gray-300">
                      <div className="mb-2">
                        ⏰ Time: {sessionRemainingMs == null ? '—' : `${String(Math.floor(sessionRemainingMs / 60000)).padStart(2,'0')}:${String(Math.floor((sessionRemainingMs % 60000) / 1000)).padStart(2,'0')}`} remaining
                      </div>
                      <div>
                        <PresenceBadge />
                      </div>
                    </div>
                  )
                })()}
                
                <hr className="border-gray-600" />
                
                {/* Leave Room */}
                <button 
                  className="w-full text-left px-3 py-2 hover:bg-red-700 bg-red-600 rounded flex items-center gap-2"
                  onClick={handleLeaveRoom}
                >
                  👋 Leave Room
                </button>
              </>
            ) : (
              <>
                {/* Lobby Menu Options */}
                <button 
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                  onClick={handleOpenLibrary}
                >
                  📚 Browse Stories
                </button>
                <button 
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                  onClick={handleMenuItemClick}
                >
                  🎭 Manage Rooms
                </button>
                <button 
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                  onClick={handleMenuItemClick}
                >
                  ⚙️ Settings
                </button>
              </>
            )}
            
            {user && (
              <>
                <hr className="border-gray-600" />
                <button 
                  className="w-full text-left px-3 py-2 hover:bg-red-700 rounded flex items-center gap-2"
                  onClick={handleSignOut}
                >
                  🚪 Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Invite Popup */}
      {showInvite && currentRoom && (
        <div className="fixed inset-0 z-[1050] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div ref={inviteRef}>
            <InviteContent 
              code={currentRoom.code || ''} 
              onClose={handleCloseInvite}
              isPopup={true}
            />
          </div>
        </div>
      )}
    </>
  )
}
