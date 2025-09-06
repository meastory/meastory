import { useState } from 'react'
import { useUIStore } from '../stores/uiStore'
import { useRoomStore } from '../stores/roomStore'
import { supabase } from '../stores/authStore'

export default function UnifiedStoryOverlay() {
  const { storyTextScale } = useUIStore()
  const { currentScene, currentStory, loadScene, childName } = useRoomStore()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [storyVisible, setStoryVisible] = useState(true)

  const handleChoice = async (nextSceneRef: string | number) => {
    if (isTransitioning || !currentStory) return

    setIsTransitioning(true)
    console.log('🎯 Making choice, next scene ref:', nextSceneRef)

    try {
      await loadScene(nextSceneRef)

      try {
        const { webrtcManager } = await import('../services/webrtcManager')
        const sceneAfter = useRoomStore.getState().currentScene
        if (sceneAfter?.id) {
          webrtcManager.syncStoryChoice(sceneAfter.id)
        }
      } catch (webrtcError) {
        console.warn('WebRTC sync failed:', webrtcError)
      }
    } catch (error) {
      console.error('❌ Error loading next scene:', error)
    } finally {
      setIsTransitioning(false)
    }
  }

  const handleReadAgain = async () => {
    console.log('🔄 Reading story again - loading first scene')
    if (currentStory) {
      try {
        const { data: firstScene } = await supabase
          .from('story_scenes')
          .select('id')
          .eq('story_id', currentStory.id)
          .eq('scene_order', 1)
          .single()
        await loadScene(1)
        if (firstScene?.id) {
          try {
            const { webrtcManager } = await import('../services/webrtcManager')
            webrtcManager.syncStoryChoice(firstScene.id)
          } catch (e) {
            console.warn('Sync Read Again failed:', e)
          }
        }
      } catch (e) {
        console.warn('Failed to resolve first scene for Read Again:', e)
        await loadScene(1)
      }
    }
  }

  const handleOpenLibrary = () => {
    console.log('📚 Opening library from story overlay')
    try {
      const ui = useUIStore.getState()
      ui.openLibrary?.()
    } catch (error) {
      console.warn('Could not open library:', error)
    }
  }

  const replaceChildName = (text: string) => {
    return text.replace(/\{\{childName\}\}/g, childName || 'Alex')
  }

  const getChoices = () => {
    if (!currentScene?.choices) return [] as { label: string; next_scene_id: string }[]
    if (Array.isArray(currentScene.choices)) {
      return currentScene.choices as { label: string; next_scene_id: string }[]
    }
    if (typeof currentScene.choices === 'string') {
      try {
        return JSON.parse(currentScene.choices) as { label: string; next_scene_id: string }[]
      } catch {
        return [] as { label: string; next_scene_id: string }[]
      }
    }
    return [] as { label: string; next_scene_id: string }[]
  }

  // Welcome state - no active story
  if (!currentScene || !currentStory) {
    return (
      <div className="story-overlay z-[1000]">
        <div className="story-content">
          <h2 className="story-title">Welcome to Read Me A Story</h2>
          <p className="story-text">
            Connect with a loved one and experience an interactive story together.
            Start or join a room to begin your storytelling adventure!
          </p>

          <div className="text-controls">
            <button
              onClick={handleOpenLibrary}
              className="story-choice"
            >
              📚 Choose a Story
            </button>
          </div>
        </div>
      </div>
    )
  }

  const choices = getChoices()

  // Loading state
  if (isTransitioning) {
    return (
      <div className="story-overlay">
        <div className="story-content flex items-center justify-center">
          <div className="text-center">
            <div className="loading-spinner"></div>
            <p className="mt-4">Loading story...</p>
          </div>
        </div>
      </div>
    )
  }

  // Active story state
  return (
    <>
      {/* Story overlay - only show if story is visible */}
      {storyVisible && (
        <div className="story-overlay">
          <div className="story-content">
            {/* Scene Title */}
            {currentScene.title && (
              <div className="text-lg font-semibold mb-4 text-blue-300"
                   style={{ fontSize: `calc(1em * ${storyTextScale} * 0.9)` }}>
                {replaceChildName(currentScene.title)}
              </div>
            )}

            {/* Scene Content */}
            <div className="story-text" style={{ whiteSpace: 'pre-wrap' }}>
              {replaceChildName(currentScene.content)}
            </div>

            {/* Scene Choices */}
            {choices.length > 0 && (
              <div className="story-choices">
                {choices.map((choice, index) => (
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

          {/* Illustration Space - Only shows on landscape/desktop */}
          <div className="story-illustration">
            {/* Placeholder for illustration - you can replace this with actual story illustrations */}
            {currentScene?.illustration_url && (
              <img 
                src={currentScene.illustration_url} 
                alt="Story illustration"
                style={{ opacity: 0.8 }}
              />
            )}
          </div>
        </div>
      )}

      {/* Fixed Hide Story Button - Always in bottom-left corner when story is visible */}
      {storyVisible && currentStory && (
        <div className="fixed bottom-4 left-4 z-[1030]">
          <button 
            className="w-12 h-12 rounded-full border-2 border-white/30 bg-black/50 text-white flex items-center justify-center cursor-pointer transition-all duration-200 text-xl font-bold hover:bg-black/70 hover:border-white/50 hover:scale-105 shadow-lg backdrop-blur-lg"
            onClick={() => setStoryVisible(false)}
            title="Hide story text"
          >
            ▼
          </button>
        </div>
      )}

      {/* Fixed Show Story Button - Always in bottom-left corner when story is hidden */}
      {!storyVisible && currentStory && (
        <div className="fixed bottom-4 left-4 z-[1030]">
          <button 
            className="w-12 h-12 rounded-full border-2 border-white/30 bg-black/50 text-white flex items-center justify-center cursor-pointer transition-all duration-200 text-xl font-bold hover:bg-black/70 hover:border-white/50 hover:scale-105 shadow-lg backdrop-blur-lg"
            onClick={() => setStoryVisible(true)}
            title="Show story text"
          >
            ▲
          </button>
        </div>
      )}
    </>
  )
}
