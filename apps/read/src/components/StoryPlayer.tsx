import { useState } from 'react'
import { useRoomStore } from '../stores/roomStore'
import { supabase } from '../stores/authStore'

export default function StoryPlayer() {
  const { currentScene, currentStory, loadScene, childName } = useRoomStore()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleChoice = async (nextSceneRef: string | number) => {
    if (isTransitioning || !currentStory) return

    setIsTransitioning(true)
    console.log('🎯 Making choice, next scene ref:', nextSceneRef)

    try {
      const isUuid = typeof nextSceneRef === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nextSceneRef)

      let query = supabase
        .from('story_scenes')
        .select('*')

      if (isUuid) {
        query = query.eq('id', nextSceneRef as string)
      } else {
        const sceneOrder = typeof nextSceneRef === 'number' ? nextSceneRef : Number(nextSceneRef)
        query = query
          .eq('story_id', currentStory.id)
          .eq('scene_order', sceneOrder)
      }

      const { data: nextScene, error } = await query.single()

      if (error) throw error

      console.log('🎬 Next scene resolved:', nextScene.title, 'id:', nextScene.id, 'order:', nextScene.scene_order)
      useRoomStore.setState({ currentScene: nextScene })

      try {
        const { webrtcManager } = await import('../services/webrtcManager')
        webrtcManager.syncStoryChoice(nextScene.id)
      } catch (webrtcError) {
        console.warn('WebRTC sync failed:', webrtcError)
      }
    } catch (error) {
      console.error('❌ Error loading next scene (by id or order):', error)
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
    console.log('📚 Opening library from room context')
    try {
      // Dispatch a lightweight event for guest Join page to open in-room picker
      window.dispatchEvent(new CustomEvent('open-inroom-picker'))

      const roomState = useRoomStore.getState()
      const maybeWithLibrary = roomState as unknown as { showLibrary?: () => void }
      maybeWithLibrary.showLibrary?.()
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
    </div>
  )
}
