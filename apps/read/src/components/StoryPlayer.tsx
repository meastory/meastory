import { useState, useEffect } from 'react'
import { useRoomStore } from '../stores/roomStore'
import { supabase } from '../stores/authStore'

export default function StoryPlayer() {
  const { currentScene, currentStory, loadScene, leaveRoom } = useRoomStore()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [childName, setChildName] = useState('')

  // Initialize child name on component mount
  useEffect(() => {
    const savedName = localStorage.getItem('childName')
    if (savedName) {
      setChildName(savedName)
    } else {
      // Default name if not set
      setChildName('Alex')
    }
  }, [])

  // Save child name when it changes
  useEffect(() => {
    if (childName) {
      localStorage.setItem('childName', childName)
    }
  }, [childName])

  const handleChoice = async (nextSceneOrder: number) => {
    if (isTransitioning || !currentStory) return

    setIsTransitioning(true)
    console.log('🎯 Making choice, next scene order:', nextSceneOrder)

    try {
      // Load scene by order instead of UUID
      const { data: nextScene, error } = await supabase
        .from('story_scenes')
        .select('*')
        .eq('story_id', currentStory.id)
        .eq('scene_order', nextSceneOrder)
        .single()

      if (error) throw error

      console.log('🎬 Next scene loaded:', nextScene.title)
      // Update the store with the new scene
      useRoomStore.setState({ currentScene: nextScene })
    } catch (error) {
      console.error('❌ Error loading next scene:', error)
    } finally {
      setIsTransitioning(false)
    }
  }

  const handleReadAgain = () => {
    console.log('🔄 Reading story again - loading first scene')
    if (currentStory) {
      loadScene(1) // Load the first scene
    }
  }

  const handleOpenLibrary = () => {
    console.log('📚 Opening library - leaving room')
    // Clear room state and set a flag to show library
    leaveRoom()
    // Set a flag in localStorage to show library after leaving room
    localStorage.setItem('showLibraryAfterLeave', 'true')
  }

  // Replace {{childName}} with the actual name
  const replaceChildName = (text: string) => {
    return text.replace(/\{\{childName\}\}/g, childName)
  }

  // Safely parse choices array
  const getChoices = () => {
    if (!currentScene?.choices) return []
    
    // If choices is already an array, return it
    if (Array.isArray(currentScene.choices)) {
      return currentScene.choices
    }
    
    // If choices is a JSON string, parse it
    if (typeof currentScene.choices === 'string') {
      try {
        return JSON.parse(currentScene.choices)
      } catch {
        return []
      }
    }
    
    return []
  }

  const choices = getChoices()

  if (!currentScene || !currentStory) {
    return (
      <div className="story-overlay flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="mt-4">Loading story...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="story-overlay">
      <div className="story-content">
        {/* Name Input */}
        <div className="mb-6 p-4 bg-white/10 rounded-lg">
          <label className="block text-sm font-medium mb-2 text-white">
            Child's Name:
          </label>
          <input
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Enter child's name"
            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>

        {/* Story Title */}
        <div className="story-title">
          {replaceChildName(currentStory.title)}
        </div>

        {/* Scene Title */}
        {currentScene.title && (
          <div className="text-lg font-semibold mb-4 text-blue-300">
            {replaceChildName(currentScene.title)}
          </div>
        )}

        {/* Scene Content */}
        <div className="story-text">
          {replaceChildName(currentScene.content)}
        </div>

        {/* Scene Choices */}
        {choices.length > 0 && (
          <div className="story-choices">
            {choices.map((choice: any, index: number) => (
              <button
                key={index}
                onClick={() => handleChoice(choice.next_scene_id)}
                disabled={isTransitioning}
                className="story-choice"
              >
                {replaceChildName(choice.label)}
              </button>
            ))}
          </div>
        )}

        {/* End of story */}
        {choices.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-yellow-300 text-lg font-semibold mb-4">
              🎉 The End
            </p>
            <p className="text-gray-300 mb-6">
              {replaceChildName("You've reached the end of this story path!")}
            </p>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleReadAgain}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                🔄 Read Again
              </button>
              <button
                onClick={handleOpenLibrary}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                📚 Open Library
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
