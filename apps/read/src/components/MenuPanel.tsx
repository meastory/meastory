import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useRoomStore } from '../stores/roomStore'
import RoomManager from './RoomManager'
import StoryLibrary from './StoryLibrary'
import InRoomStoryPicker from './InRoomStoryPicker'

export default function MenuPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [showRoomManager, setShowRoomManager] = useState(false)
  const [showStoryLibrary, setShowStoryLibrary] = useState(false)
  const [showInRoomPicker, setShowInRoomPicker] = useState(false)
  const { user, signOut } = useAuthStore()
  const { currentRoom, leaveRoom } = useRoomStore()

  const toggleMenu = () => setIsOpen(!isOpen)
  
  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  const handleLeaveRoom = () => {
    leaveRoom()
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

  if (showStoryLibrary) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
        <div className="relative">
          <button
            onClick={() => setShowStoryLibrary(false)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors"
            aria-label="Close story library"
          >
            ✕
          </button>
          <StoryLibrary onClose={() => setShowStoryLibrary(false)} />
        </div>
      </div>
    )
  }

  if (showInRoomPicker) {
    return (
      <InRoomStoryPicker onClose={() => setShowInRoomPicker(false)} />
    )
  }

  return (
    <>
      {/* Menu Button - positioned in top-right corner */}
      <button onClick={toggleMenu} className="menu-btn" aria-label="Open menu">
        ☰
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full text-gray-900">
            <h2 className="text-2xl font-bold mb-4">Menu</h2>
            
            <div className="space-y-3">
              {currentRoom ? (
                // In-room menu options
                <>
                  <div className="border-b pb-3 mb-3">
                    <p className="text-sm text-gray-600 mb-2">
                      Current Room: <span className="font-semibold">{currentRoom.name}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Code: {currentRoom.code}
                    </p>
                  </div>

                  <button
                    onClick={handleLeaveRoom}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    🚪 Leave Room
                  </button>

                  <button
                    onClick={() => {
                      setShowInRoomPicker(true)
                      setIsOpen(false)
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    📚 Pick a Story
                  </button>

                  <button
                    onClick={() => {
                      setShowStoryLibrary(true)
                      setIsOpen(false)
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    Library
                  </button>
                </>
              ) : (
                // Room manager menu options
                <>
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
                      setShowStoryLibrary(true)
                      setIsOpen(false)
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    📚 Browse Stories
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsOpen(false)
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    Settings
                  </button>
                </>
              )}
              
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
