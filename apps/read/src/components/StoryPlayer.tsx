import { useRoomStore } from '../stores/roomStore'

export default function StoryPlayer() {
  const { story, currentSceneId } = useRoomStore()

  if (!story) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Story</h2>
        <p className="text-slate">No story selected. Create or join a room to begin.</p>
      </div>
    )
  }

  const currentScene = story.scenes.find(scene => scene.id === currentSceneId)

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">{story.title}</h2>
      
      {currentScene ? (
        <div>
          <p className="text-story mb-4">{currentScene.text}</p>
          
          {currentScene.choices && currentScene.choices.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {currentScene.choices.map((choice, index) => (
                <button key={index} className="btn">
                  {choice.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-slate">Loading scene...</p>
      )}
    </div>
  )
}
