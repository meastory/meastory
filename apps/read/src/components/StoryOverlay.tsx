import { useUIStore } from '../stores/uiStore'
import { useRoomStore } from '../stores/roomStore'

export default function StoryOverlay() {
  const { storyTextScale, setStoryTextScale } = useUIStore()
  const { currentRoom, currentScene } = useRoomStore()

  const increaseTextSize = () => {
    const newScale = Math.min(1.75, storyTextScale + 0.1)
    setStoryTextScale(newScale)
  }

  const decreaseTextSize = () => {
    const newScale = Math.max(0.75, storyTextScale - 0.1)
    setStoryTextScale(newScale)
  }

  // If we are in a room and have an active scene, this component should only render the story overlay (handled elsewhere)
  // So we hide the welcome copy to avoid overlapping under story text
  if (currentRoom && currentScene) {
    return null
  }

  return (
    <div className="story-overlay z-[1000]">
      <div className="story-content">
        <div>
          <h2 className="story-title">Welcome to Read Me A Story</h2>
          <p className="story-text">
            Connect with a loved one and experience an interactive story together.
            Start or join a room to begin your storytelling adventure!
          </p>

          <div className="text-controls">
            <button
              onClick={decreaseTextSize}
              className="text-control-btn"
              title="Decrease text size"
            >
              −
            </button>
            <button
              onClick={increaseTextSize}
              className="text-control-btn"
              title="Increase text size"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
