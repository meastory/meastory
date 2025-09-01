import { useState } from 'react'

export default function RoomManager() {
  const [roomCode, setRoomCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateRoom = async () => {
    setIsCreating(true)
    // TODO: Implement room creation with Supabase
    setIsCreating(false)
  }

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      // TODO: Implement room joining
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Start or Join a Story</h2>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button 
          onClick={handleCreateRoom}
          disabled={isCreating}
          className="btn primary"
        >
          {isCreating ? 'Creating...' : 'Start a room'}
        </button>
        
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="Enter room code"
          className="flex-1 px-3 py-2 border border-mist rounded-lg"
        />
        
        <button 
          onClick={handleJoinRoom}
          disabled={!roomCode.trim()}
          className="btn"
        >
          Join
        </button>
      </div>
      
      <p className="text-sm text-slate mt-3">
        Share the room link with your family. Children join via link — no account needed.
      </p>
    </div>
  )
}
