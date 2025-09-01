import VideoBox from './VideoBox'
import VideoControls from './VideoControls'

export default function VideoContainer() {
  return (
    <div className="video-container">
      <VideoBox type="local" />
      <VideoBox type="remote" />
      <VideoControls />
    </div>
  )
}
