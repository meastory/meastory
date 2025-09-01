import { useState } from 'react'

export default function VideoControls() {
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)

  const toggleMic = () => {
    setIsMicOn(!isMicOn)
    // TODO: Implement actual mic toggle
  }

  const toggleCam = () => {
    setIsCamOn(!isCamOn)
    // TODO: Implement actual camera toggle
  }

  return (
    <div className="video-controls">
      <button 
        onClick={toggleMic}
        className={`control-btn ${isMicOn ? 'active' : ''}`}
        title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isMicOn ? '🎤' : '🔇'}
      </button>
      
      <button 
        onClick={toggleCam}
        className={`control-btn ${isCamOn ? 'active' : ''}`}
        title={isCamOn ? 'Turn off camera' : 'Turn on camera'}
      >
        {isCamOn ? '📹' : '📷'}
      </button>
    </div>
  )
}
