import { useUIStore } from '../stores/uiStore'

export default function StoryOverlay() {
  const { storyTextScale, setStoryTextScale } = useUIStore()

  const increaseTextSize = () => {
    const newScale = Math.min(1.75, storyTextScale + 0.1)
    setStoryTextScale(newScale)
  }

  const decreaseTextSize = () => {
    const newScale = Math.max(0.75, storyTextScale - 0.1)
    setStoryTextScale(newScale)
  }

  return (
    <div className="story-overlay">
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
