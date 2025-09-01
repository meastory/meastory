import { useState, useEffect } from 'react'
import { useRoomStore } from '../stores/roomStore'
import { supabase } from '../stores/authStore'
import type { Tables } from '../types/supabase'

type Story = Tables<'stories'>

export default function StoryLibrary() {
  const { currentRoom, enterRoom } = useRoomStore()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)

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
    } finally {
      setLoading(false)
    }
  }

  const handleStorySelect = async (story: Story) => {
    if (currentRoom) {
      // We're in a room, update the room's story
      console.log('🔄 Changing room story to:', story.title)
      try {
        const { error } = await supabase
          .from('rooms')
          .update({ story_id: story.id })
          .eq('id', currentRoom.id)

        if (error) throw error

        // Reload the room with the new story
        await enterRoom(currentRoom.id)
      } catch (error) {
        console.error('❌ Error updating room story:', error)
      }
    } else {
      // Not in a room, just select the story for later
      setSelectedStory(story)
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
          {currentRoom ? 'Change Story' : 'Story Library'}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <div 
              key={story.id}
              className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => handleStorySelect(story)}
            >
              <h3 className="text-xl font-bold mb-2">{story.title}</h3>
              <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                {story.description || 'No description available'}
              </p>
              <div className="text-xs text-gray-400">
                Tap to select
              </div>
            </div>
          ))}
        </div>

        {stories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No stories available yet</p>
          </div>
        )}

        {/* Story Preview Modal */}
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
                
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Select This Story
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
