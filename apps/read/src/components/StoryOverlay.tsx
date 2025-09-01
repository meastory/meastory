import { useRoomStore } from '../stores/roomStore'
import { useUIStore } from '../stores/uiStore'

export default function StoryOverlay() {
  const { story, currentSceneId } = useRoomStore()
  const { storyTextScale, setStoryTextScale } = useUIStore()

  const currentScene = story?.scenes?.find(scene => scene.id === currentSceneId)

  const handleChoiceClick = (choiceId: string) => {
    // TODO: Implement choice selection logic
    console.log('Choice selected:', choiceId)
  }

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
        {story ? (
          <>
            <h2 className="story-title">{story.title}</h2>
            
            {currentScene ? (
              <>
                <p className="story-text">{currentScene.text}</p>
                
                <div className="story-choices">
                  {currentScene.choices && currentScene.choices.length > 0 ? (
                    <>
                      {currentScene.choices.map((choice, index) => (
                        <button
                          key={index}
                          onClick={() => handleChoiceClick(choice.nextSceneId)}
                          className="story-choice"
                        >
                          {choice.label}
                        </button>
                      ))}
                      
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
                    </>
                  ) : (
                    <p className="story-text">The story has ended. Thank you for reading!</p>
                  )}
                </div>
              </>
            ) : (
              <p className="story-text">Loading story scene...</p>
            )}
          </>
        ) : (
          <div>
            <h2 className="story-title">Welcome to Read Me A Story</h2>
            <p className="story-text">
              Connect with a loved one and experience an interactive story together. 
              Start or join a room to begin your storytelling adventure!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
