interface VideoBoxProps {
  type: 'local' | 'remote'
}

export default function VideoBox({ type }: VideoBoxProps) {
  return (
    <div className="video-box">
      <video
        id={`${type}Video`}
        data-testid={`${type}-video`}
        autoPlay
        playsInline
        muted={type === 'local'}
      />
    </div>
  )
}
