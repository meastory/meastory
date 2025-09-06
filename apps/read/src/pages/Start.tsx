import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGuestRoom } from '../lib/supabase'
import FullscreenButton from '../components/FullscreenButton'
import InstallPWAButton from '../components/InstallPWAButton'
import { useAuthStore } from '../stores/authStore'
import MenuPanel from '../components/MenuPanel'
import { useUIStore } from '../stores/uiStore'
import StoryLibrary from '../components/StoryLibrary'

export default function Start() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { session } = useAuthStore()
  const { isLibraryOpen, closeLibrary } = useUIStore()

  // Ensure auth is initialized so session is reliable here
  useEffect(() => {
    // no-op; main mounts AuthInit
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await createGuestRoom('Story Time', null)
      if (error) throw error
      const room = Array.isArray(data) ? data[0] : data
      const code = String(room.code || '').toUpperCase()
      if (!code || code.length !== 6) throw new Error('Invalid room code returned')
      navigate(`/invite/${code}`)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to create room'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="absolute top-4 right-4 z-[1101]">
        <MenuPanel />
      </div>
      <div className="absolute bottom-4 right-4 z-[1101] flex gap-2">
        <FullscreenButton showOnDesktop className="" variant="minimal" size="sm" />
        <InstallPWAButton />
      </div>
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Guests card */}
        <div className="bg-gray-900 p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Guests</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-semibold py-3 rounded text-lg"
            >
              {loading ? 'Creating…' : 'Create Room'}
            </button>
          </form>
          <div className="text-center mt-4">
            <button onClick={() => navigate('/join')} className="text-sm text-gray-300 underline">Join existing room</button>
          </div>
        </div>

        {/* Members card - only when not authenticated */}
        {!session && (
          <div className="bg-gray-900 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Members</h2>
            <div className="space-y-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded text-lg"
              >
                Login
              </button>
              <div className="text-center">
                <button onClick={() => navigate('/register')} className="text-sm text-gray-300 underline">Register</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {isLibraryOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="relative w-full max-w-5xl">
            <button
              onClick={() => closeLibrary?.()}
              className="absolute -top-3 -right-3 z-[2001] w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-gray-700"
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