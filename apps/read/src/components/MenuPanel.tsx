import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import RoomManager from './RoomManager'

export default function MenuPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [showRoomManager, setShowRoomManager] = useState(false)
  const { user, signOut } = useAuthStore()

  const toggleMenu = () => setIsOpen(!isOpen)
  
  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  if (showRoomManager) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
        <div className="relative">
          <button
            onClick={() => setShowRoomManager(false)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors"
            aria-label="Close room manager"
          >
            ✕
          </button>
          <RoomManager />
        </div>
      </div>
    )
  }

  return (
    <>
      <button onClick={toggleMenu} className="menu-button" aria-label="Open menu">
        ☰
      </button>

      {isOpen && (
        <div className="menu-panel">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full text-gray-900">
            <h2 className="text-2xl font-bold mb-4">Menu</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowRoomManager(true)
                  setIsOpen(false)
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                🎭 Manage Rooms
              </button>
              
              <button
                onClick={() => {
                  // TODO: Implement story selection
                  setIsOpen(false)
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                📚 Select Story
              </button>
              
              <button
                onClick={() => {
                  // TODO: Implement settings
                  setIsOpen(false)
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                ⚙️ Settings
              </button>
              
              {user && (
                <div className="border-t pt-3 mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Logged in as: {user.display_name || 'User'}
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
            
            <button 
              onClick={toggleMenu} 
              className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium mt-6 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
