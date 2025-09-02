import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createGuestRoom } from '../lib/supabase'
import { supabase } from '../stores/authStore'

interface StoryOption {
  id: string
  title: string
}

export default function Start() {
  const navigate = useNavigate()
  const [roomName, setRoomName] = useState('Story Time')
  const [stories, setStories] = useState<StoryOption[]>([])
  const [selectedStoryId, setSelectedStoryId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStories = async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('id, title')
        .eq('status', 'published')
        .order('title', { ascending: true })
      if (!error && data) setStories(data as StoryOption[])
    }
    loadStories()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await createGuestRoom(roomName.trim() || 'Story Time', selectedStoryId || null)
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
          <div>
            <label className="block text-sm mb-1">Room name</label>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-3 text-lg rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
              placeholder="Story Time"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Story (optional)</label>
            <select
              value={selectedStoryId}
              onChange={(e) => setSelectedStoryId(e.target.value)}
              className="w-full px-3 py-3 text-lg rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
            >
              <option value="">No story selected</option>
              {stories.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

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