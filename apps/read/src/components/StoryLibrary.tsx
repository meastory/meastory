import { useState, useEffect } from 'react'
import { useRoomStore } from '../stores/roomStore'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../stores/authStore'
import type { Tables } from '../types/supabase'
// import { useTierPolicy } from '../hooks/useTierPolicy'

type Story = Tables<'stories'>

interface StoryLibraryProps {
  onClose?: () => void
}

export default function StoryLibrary({ onClose }: StoryLibraryProps) {
  const { currentRoom, changeStory } = useRoomStore()
  const { user } = useAuthStore()
  // const { getPolicyForTier } = useTierPolicy()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadStories()
  }, [])

  const loadStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('status', 'published')
        .order('title', { ascending: true })

      if (error) throw error
      setStories(data || [])
    } catch (error) {
      console.error('Error loading stories:', error)
      setMessage('Error loading stories')
    } finally {
      setLoading(false)
    }
  }

  const handleStorySelect = async (story: Story) => {
    const effTier = useRoomStore.getState().effectiveRoomTier || 'guest'
    const canAccess = (() => {
      const map: Record<'guest' | 'free' | 'paid' | 'enterprise', number> = { guest: 0, free: 1, paid: 2, enterprise: 3 }
      const storyTier = (story as unknown as { access_tier?: 'guest' | 'free' | 'paid' | 'enterprise' }).access_tier || 'guest'
      return map[storyTier] <= map[effTier]
    })()
    if (!canAccess) return
    if (currentRoom) {
      // We're in a room, change the story for all participants
      console.log('🔄 Changing room story to:', story.title)
      setMessage(`Loading ${story.title}...`)

      try {
        // Change story without disconnecting WebRTC
        await changeStory(story.id)
        
        // Broadcast to peers
        try {
          const { webrtcManager } = await import('../services/webrtcManager')
          webrtcManager.syncStoryChange(story.id)
        } catch (e) {
          console.warn('Story-change broadcast failed:', e)
        }
        
        // Auto-close the library
        onClose?.()        
        // Auto-close the library
        onClose?.()
      } catch (error) {
        console.error('❌ Error updating room story:', error)
        setMessage('Error changing story')
      }
    } else {
      // Not in a room, just show preview
      setSelectedStory(story)
    }
  }

  const handleCreateRoomWithStory = async () => {
    if (!selectedStory) return

    setMessage('Creating room...')

    try {
      // If not logged in, create a guest room via existing flow
      if (!user) {
        const { createGuestRoom } = await import('../lib/supabase')
        const { data, error } = await createGuestRoom('Story Time', selectedStory.id)
        if (error) throw error
        const room = Array.isArray(data) ? data[0] : data
        const code = String(room.code || '').toUpperCase()
        if (!code || code.length !== 6) throw new Error('Invalid room code')
        // Navigate to invite/preflight path to run unified session logic
        location.href = `/invite/${code}`
        return
      }

      // Authenticated: create room, then navigate to invite/preflight
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name: `${selectedStory.title} Room`,
          host_id: user.id,
          story_id: selectedStory.id,
        })
        .select('id, code')
        .single()

      if (error) throw error
      const code = String(data.code || '').toUpperCase()
      if (!code || code.length !== 6) throw new Error('Invalid room code')
      location.href = `/invite/${code}`
    } catch (error: unknown) {
      console.error('❌ Room creation error:', error)
      const msg = (error as { message?: string })?.message || 'Unknown error'
      setMessage(`Error creating room: ${msg}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="mt-4">Loading stories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          {currentRoom ? 'Choose a New Story' : 'Create Room with Story'}
        </h1>
        
        {!currentRoom && (
          <div className="mb-6 p-4 bg-blue-900/50 rounded-lg border border-blue-500/30">
            <p className="text-blue-200 text-center text-sm">
              Select a story below to create a new room and start reading together.
            </p>
          </div>
        )}

        {currentRoom && (
          <div className="mb-6 p-4 bg-blue-900/50 rounded-lg border border-blue-500/30">
            <p className="text-blue-200 text-center">
              🎭 You're in room: <span className="font-semibold">{currentRoom.name}</span>
            </p>
          </div>
        )}

        {message && (
          <div className="mb-8 p-4 bg-gray-800 rounded-lg text-center">
            <p className="text-sm">{message}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => {
            const effTier = useRoomStore.getState().effectiveRoomTier || 'guest'
            const rank: Record<'guest' | 'free' | 'paid' | 'enterprise', number> = { guest: 0, free: 1, paid: 2, enterprise: 3 }
            const storyTier = (story as unknown as { access_tier?: 'guest' | 'free' | 'paid' | 'enterprise' }).access_tier || 'guest'
            const locked = rank[storyTier] > rank[effTier]
            return (
              <div 
                key={story.id}
                className={`rounded-lg p-6 transition-colors border-2 ${locked ? 'bg-gray-900/60 border-gray-700 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800 cursor-pointer hover:border-blue-500/50 border-transparent'}`}
                onClick={() => !locked && handleStorySelect(story)}
              >
                <h3 className={`text-xl font-bold mb-2 ${locked ? 'text-gray-500' : ''}`}>{story.title}</h3>
                <p className={`text-sm mb-4 line-clamp-3 ${locked ? 'text-gray-500' : 'text-gray-300'}`}>
                  {story.description || 'No description available'}
                </p>
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <span>{currentRoom ? 'Click to change story' : 'Click to create room'}</span>
                  {locked && <span className="text-yellow-500">Locked</span>}
                </div>
              </div>
            )
          })}
        </div>

        {stories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No stories available yet</p>
          </div>
        )}

        {/* Story Preview Modal - Only for out-of-room selection */}
        {selectedStory && !currentRoom && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto relative">
              <button
                onClick={() => setSelectedStory(null)}
                className="absolute -top-3 -right-3 z-[2001] w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">{selectedStory.title}</h2>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-300">
                  {selectedStory.description || 'No description available'}
                </p>
                
                <div className="text-sm text-gray-400">
                  <p>Status: {selectedStory.status}</p>
                  <p>Created: {new Date(selectedStory.created_at).toLocaleDateString()}</p>
                </div>
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleCreateRoomWithStory}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    🎭 Create Room & Start Story
                  </button>
                  <button
                    onClick={() => setSelectedStory(null)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
