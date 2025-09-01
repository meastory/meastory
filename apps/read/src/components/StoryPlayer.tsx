import { useState } from 'react'
import { useRoomStore } from '../stores/roomStore'

export default function StoryPlayer() {
  const { currentScene, currentStory, loadScene } = useRoomStore()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleChoice = async (nextSceneId: string) => {
    if (isTransitioning) return

    setIsTransitioning(true)
    console.log('🎯 Making choice, next scene:', nextSceneId)

    try {
      await loadScene(nextSceneId)
    } catch (error) {
      console.error('❌ Error loading next scene:', error)
    } finally {
      setIsTransitioning(false)
    }
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
        {/* Story Title */}
        <div className="story-title">
          {currentStory.title}
        </div>

        {/* Scene Title */}
        {currentScene.title && (
          <div className="text-lg font-semibold mb-4 text-blue-300">
            {currentScene.title}
          </div>
        )}

        {/* Scene Content */}
        <div className="story-text">
          {currentScene.content}
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
                {choice.label}
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
            <p className="text-gray-300">
              You've reached the end of this story path!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
