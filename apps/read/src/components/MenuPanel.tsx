import { useState } from 'react'
import { useUIStore } from '../stores/uiStore'

export default function MenuPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const { isMenuOpen, setMenuOpen } = useUIStore()

  const toggleMenu = () => {
    const newState = !isMenuOpen
    setIsOpen(newState)
    setMenuOpen(newState)
  }

  return (
    <>
      <button 
        onClick={toggleMenu}
        className="menu-btn"
        title="Open menu"
      >
        <span style={{ fontSize: '20px' }}>☰</span>
      </button>
      
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="absolute top-20 right-20 bg-white rounded-lg p-6 shadow-xl max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4 text-gray-800">Menu</h3>
            
            <div className="space-y-3">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Start New Room
              </button>
              
              <button className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                Join Room
              </button>
              
              <button className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                Select Story
              </button>
              
              <button className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                Settings
              </button>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}
