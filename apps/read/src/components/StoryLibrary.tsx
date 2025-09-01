import { useState, useEffect } from 'react'
import { useRoomStore } from '../stores/roomStore'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../stores/authStore'
import type { Tables } from '../types/supabase'

type Story = Tables<'stories'>

export default function StoryLibrary() {
  const { currentRoom, enterRoom } = useRoomStore()
  const { user } = useAuthStore()
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
    if (currentRoom) {
      // We're in a room, change the story for all participants
      console.log('🔄 Changing room story to:', story.title)
      setMessage(`Changing story to: ${story.title}...`)

      try {
        const { error } = await supabase
          .from('rooms')
          .update({ story_id: story.id })
          .eq('id', currentRoom.id)

        if (error) throw error

        // Reload the room with the new story
        await enterRoom(currentRoom.id)
        setMessage(`Story changed to: ${story.title}`)
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
    if (!selectedStory || !user) return

    setMessage('Creating room...')

    try {
      console.log('🏗️ Creating room with story:', selectedStory.title)

      // Create room with selected story
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name: `${selectedStory.title} Room`,
          host_id: user.id,
          story_id: selectedStory.id,
          max_participants: 10
        })
        .select('id, name, code, created_at, status')
        .single()

      if (error) throw error

      console.log('✅ Room created successfully:', data)
      setMessage(`Room created! Code: ${data.code}`)

      // Enter the room
      await enterRoom(data.id)
    } catch (error: any) {
      console.error('❌ Room creation error:', error)
      setMessage(`Error creating room: ${error.message}`)
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
              Select a story below to create a new room. Once in a room, you can change stories 
              anytime without creating new rooms - perfect for multiple storytelling sessions!
            </p>
          </div>
        )}

        {currentRoom && (
          <div className="mb-6 p-4 bg-blue-900/50 rounded-lg border border-blue-500/30">
            <p className="text-blue-200 text-center">
              🎭 You're in room: <span className="font-semibold">{currentRoom.name}</span><br/>
              <span className="text-sm">Changing the story will affect all participants in this room</span>
            </p>
          </div>
        )}

        {message && (
          <div className="mb-8 p-4 bg-gray-800 rounded-lg text-center">
            <p className="text-sm">{message}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <div 
              key={story.id}
              className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors cursor-pointer border-2 border-transparent hover:border-blue-500/50"
              onClick={() => handleStorySelect(story)}
            >
              <h3 className="text-xl font-bold mb-2">{story.title}</h3>
              <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                {story.description || 'No description available'}
              </p>
              <div className="text-xs text-gray-400">
                {currentRoom ? 'Click to change story for everyone' : 'Click to create room with this story'}
              </div>
            </div>
          ))}
        </div>

        {stories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No stories available yet</p>
          </div>
        )}

        {/* Story Preview Modal - Only for out-of-room selection */}
        {selectedStory && !currentRoom && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">{selectedStory.title}</h2>
                <button
                  onClick={() => setSelectedStory(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
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
