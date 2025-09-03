import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWebRTCStore } from '../stores/webrtcStore'
import VideoGrid from '../components/VideoGrid'
import StoryOverlay from '../components/StoryOverlay'
import StoryPlayer from '../components/StoryPlayer'
import InRoomStoryPicker from '../components/InRoomStoryPicker'
import { useRoomStore } from '../stores/roomStore'
import { getRoomByCode } from '../lib/supabase'
import PresenceBadge from '../components/PresenceBadge'
import { useFullscreen } from '../hooks/useFullscreen'

interface DeviceOption {
  deviceId: string
  label: string
}

export default function Join() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const normalized = String(code).toUpperCase()

  const { isConnected, participants } = useWebRTCStore()
  const { currentStory, setChildName, childName, enterRoom } = useRoomStore()

  const [cameraDevices, setCameraDevices] = useState<DeviceOption[]>([])
  const [micDevices, setMicDevices] = useState<DeviceOption[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMic, setSelectedMic] = useState<string>('')
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'preflight' | 'waiting' | 'connecting' | 'connected'>('preflight')

  const [showPicker, setShowPicker] = useState(false)
  const [nameInput, setNameInput] = useState(childName || 'Alex')
  const [micLevel, setMicLevel] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const previewStreamRef = useRef<MediaStream | null>(null)
  const autoPickerRef = useRef(false)

  const inviteUrl = useMemo(() => `${location.origin}/join/${normalized}`, [normalized])
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  useEffect(() => {
    if (isConnected) setPhase('connected')
  }, [isConnected])

  // Allow StoryPlayer's "Open Library" button to open the in-room picker in guest context
  useEffect(() => {
    const roomStore = useRoomStore.getState()
    const withLibrary = roomStore as typeof roomStore & { showLibrary?: () => void }
    withLibrary.showLibrary = () => {
      autoPickerRef.current = false
      setShowPicker(true)
    }
  }, [])

  // Listen to custom event to open in-room picker (guest)
  useEffect(() => {
    const handler = () => { autoPickerRef.current = false; setShowPicker(true) }
    window.addEventListener('open-inroom-picker' as unknown as keyof WindowEventMap, handler as EventListener)
    return () => {
      window.removeEventListener('open-inroom-picker' as unknown as keyof WindowEventMap, handler as EventListener)
    }
  }, [])

  const stopPreview = useCallback(() => {
    const s = previewStreamRef.current
    s?.getTracks()?.forEach(t => t.stop())
    previewStreamRef.current = null
    setPreviewStream(null)
  }, [])

  const enumerate = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const vids = devices.filter(d => d.kind === 'videoinput').map(d => ({ deviceId: d.deviceId, label: d.label }))
      const mics = devices.filter(d => d.kind === 'audioinput').map(d => ({ deviceId: d.deviceId, label: d.label }))
      setCameraDevices(vids)
      setMicDevices(mics)
      const savedCam = localStorage.getItem('preferredCameraId')
      const savedMic = localStorage.getItem('preferredMicId')
      setSelectedCamera(savedCam || vids[0]?.deviceId || '')
      setSelectedMic(savedMic || mics[0]?.deviceId || '')
    } catch (e) {
      console.warn('enumerateDevices failed', e)
    }
  }

  const startPreview = async () => {
    setChecking(true)
    setError(null)
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : { facingMode: 'user' },
        audio: selectedMic ? { deviceId: { exact: selectedMic }, echoCancellation: true, noiseSuppression: true } as MediaTrackConstraints : { echoCancellation: true, noiseSuppression: true }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      previewStreamRef.current = stream
      setPreviewStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      const vTrack = stream.getVideoTracks()[0]
      const aTrack = stream.getAudioTracks()[0]
      const vDevice = (vTrack?.getSettings().deviceId as string | undefined) || ''
      const aDevice = (aTrack?.getSettings().deviceId as string | undefined) || ''
      if (!selectedCamera && vDevice) setSelectedCamera(vDevice)
      if (!selectedMic && aDevice) setSelectedMic(aDevice)

      const devices = await navigator.mediaDevices.enumerateDevices()
      const camLabel = devices.find(d => d.deviceId === (vDevice || selectedCamera))?.label || ''
      const micLabel = devices.find(d => d.deviceId === (aDevice || selectedMic))?.label || ''
      if (vDevice || selectedCamera) localStorage.setItem('preferredCameraId', vDevice || selectedCamera)
      if (aDevice || selectedMic) localStorage.setItem('preferredMicId', aDevice || selectedMic)
      localStorage.setItem('preferredCameraLabel', camLabel)
      localStorage.setItem('preferredMicLabel', micLabel)

      const AudioCtx: typeof AudioContext | undefined = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext
      const audioContext = AudioCtx ? new AudioCtx() : null
      if (audioContext) {
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const loop = () => {
          analyser.getByteTimeDomainData(dataArray)
          // Compute RMS level in [0, 1]
          let sumSquares = 0
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128
            sumSquares += v * v
          }
          const rms = Math.sqrt(sumSquares / dataArray.length)
          setMicLevel(rms)
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      }

    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'Failed to access camera/mic'
      setError(msg)
    } finally {
      setChecking(false)
    }
  }

  const stopMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  useEffect(() => {
    enumerate()
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      const s = previewStreamRef.current
      s?.getTracks()?.forEach(t => t.stop())
      previewStreamRef.current = null
    }
  }, [])

  const passed = useMemo(() => {
    const audioTracks = previewStream?.getAudioTracks() || []
    const videoTracks = previewStream?.getVideoTracks() || []
    const audioOk = audioTracks.some(t => t.readyState === 'live') || audioTracks.length > 0
    const videoOk = selectedCamera ? (videoTracks.some(t => t.readyState === 'live') || videoTracks.length > 0) : true
    return audioOk && videoOk
  }, [previewStream, selectedCamera])

  const continueToWaiting = async () => {
    if (!passed) {
      try { await startPreview() } catch (e) { console.warn('Auto-test failed', e) }
    }
    try {
      if (nameInput && nameInput !== childName) {
        setChildName(nameInput)
        const { webrtcManager } = await import('../services/webrtcManager')
        webrtcManager.syncChildName(nameInput)
      }
    } catch (e) { console.warn('Name sync failed', e) }
    stopMeter()
    stopPreview()
    setPhase('waiting')

    try {
      const { data, error } = await getRoomByCode(normalized)
      if (error || !data?.id) {
        setError('Room not found')
        return
      }
      await enterRoom(data.id)
      // enterRoom will internally initiate the WebRTC connect using room.code
    } catch (e) {
      console.error('Failed to enter room', e)
      setError('Failed to enter room')
    }
  }

  useEffect(() => {
    if (phase !== 'waiting') return
    const others = participants.size
    if (others >= 1) {
      setPhase('connecting')
    }
  }, [participants.size, phase])

  // Auto-open picker when we first enter the room without a story
  useEffect(() => {
    if ((phase === 'connected' || phase === 'connecting') && !currentStory) {
      autoPickerRef.current = true
      setShowPicker(true)
    }
  }, [phase, currentStory])

  // Auto-close only if picker was auto-opened and a story becomes available
  useEffect(() => {
    if (autoPickerRef.current && currentStory && showPicker) {
      autoPickerRef.current = false
      setShowPicker(false)
    }
  }, [currentStory, showPicker])

  if (phase === 'preflight') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-gray-900 p-6 rounded-lg shadow space-y-6">
          <h1 className="text-3xl font-bold text-center">Get Ready</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-sm mb-2">Camera</label>
              <select value={selectedCamera} onChange={(e) => setSelectedCamera(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-3 text-lg">
                {cameraDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2">Microphone</label>
              <select value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-3 text-lg">
                {micDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || 'Microphone'}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="bg-black rounded overflow-hidden">
              <video ref={videoRef} playsInline muted className="w-full aspect-video bg-black" />
            </div>
            <div>
              <div className="mb-2 text-sm">Mic Level</div>
              <div className="h-4 bg-gray-800 rounded">
                <div className="h-4 bg-green-500 rounded" style={{ width: `${Math.min(100, Math.floor(micLevel * 200))}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-2">Say hello to test</div>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm mb-2">Child's Name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-3 py-3 text-lg rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
              placeholder="Alex"
            />
          </div>

          {error && <div className="text-red-400 text-sm text-center">{error}</div>}

          <div className="flex gap-3">
            <button onClick={startPreview} disabled={checking} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded text-lg">
              {checking ? 'Testing…' : 'Test'}
            </button>
            <button onClick={continueToWaiting} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded text-lg">
              Continue
            </button>
            <button onClick={() => navigate(`/invite/${normalized}`)} className="ml-auto text-sm text-gray-300 underline">Invite</button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'waiting') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gray-900 p-6 rounded-lg shadow space-y-4 text-center">
          <h1 className="text-3xl font-bold">Waiting…</h1>
          <div className="text-gray-300">Share this link with the other device:</div>
          <div className="bg-gray-800 rounded p-3 break-all select-all text-sm">{inviteUrl}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="w-full max-w-6xl h-[70vh] mx-auto relative">
        <PresenceBadge className="absolute top-4 left-4 z-[110]" />
        <button
          onClick={() => toggleFullscreen()}
          className="absolute top-4 right-4 z-[110] px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-white"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? '⤢' : '⤢'}
        </button>
        <VideoGrid />
      </div>
      <StoryOverlay />
      <StoryPlayer />
      <button
        onClick={() => { autoPickerRef.current = false; setShowPicker(true) }}
        className="fixed top-6 left-20 z-[100] px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
      >
        📚
      </button>
      {showPicker && (
        <InRoomStoryPicker onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
} 