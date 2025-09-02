import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGuestRoom } from '../lib/supabase'

export default function Start() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      <div className="w-full max-w-md bg-gray-900 p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-6 text-center">Start</h1>

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
      </div>
    </div>
  )
} 