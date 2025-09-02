import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWebRTCStore } from '../stores/webrtcStore'

interface DeviceOption {
  deviceId: string
  label: string
}

export default function Join() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const normalized = String(code).toUpperCase()

  const { connect, isConnected, participants } = useWebRTCStore()

  const [cameraDevices, setCameraDevices] = useState<DeviceOption[]>([])
  const [micDevices, setMicDevices] = useState<DeviceOption[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMic, setSelectedMic] = useState<string>('')
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'preflight' | 'waiting' | 'connecting' | 'connected'>('preflight')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const rafRef = useRef<number | null>(null)

  const inviteUrl = useMemo(() => `${location.origin}/join/${normalized}`, [normalized])

  useEffect(() => {
    if (isConnected) setPhase('connected')
  }, [isConnected])

  const stopPreview = useCallback(() => {
    previewStream?.getTracks()?.forEach(t => t.stop())
    setPreviewStream(null)
  }, [previewStream])

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
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMic ? { deviceId: { exact: selectedMic }, echoCancellation: true, noiseSuppression: true } as MediaTrackConstraints : { echoCancellation: true, noiseSuppression: true }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setPreviewStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      const devices = await navigator.mediaDevices.enumerateDevices()
      const camLabel = devices.find(d => d.deviceId === selectedCamera)?.label || ''
      const micLabel = devices.find(d => d.deviceId === selectedMic)?.label || ''
      localStorage.setItem('preferredCameraId', selectedCamera)
      localStorage.setItem('preferredMicId', selectedMic)
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
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128
            sum += v * v
          }
          const rms = Math.sqrt(sum / dataArray.length)
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
      stopMeter()
      stopPreview()
    }
  }, [stopMeter, stopPreview])

  const passed = useMemo(() => {
    const audioTracks = previewStream?.getAudioTracks() || []
    const videoTracks = previewStream?.getVideoTracks() || []
    const audioOk = audioTracks.some(t => t.enabled)
    const videoOk = selectedCamera ? videoTracks.some(t => t.enabled) : true
    return audioOk && videoOk
  }, [previewStream, selectedCamera])

  const continueToWaiting = async () => {
    stopMeter()
    stopPreview()
    setPhase('waiting')
    await connect(normalized, normalized)
  }

  useEffect(() => {
    if (phase !== 'waiting') return
    const others = participants.size
    if (others >= 1) {
      setPhase('connecting')
    }
  }, [participants.size, phase])

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

          {error && <div className="text-red-400 text-sm text-center">{error}</div>}

          <div className="flex gap-3">
            <button onClick={startPreview} disabled={checking} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded text-lg">
              {checking ? 'Testing…' : 'Test'}
            </button>
            <button onClick={continueToWaiting} disabled={!passed} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white px-4 py-3 rounded text-lg">
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
        <div className="w-full max-w-md bg-gray-900 p-6 rounded-lg shadow text-center space-y-4">
          <h1 className="text-3xl font-bold">Waiting…</h1>
          <div className="text-gray-300">Share this link:</div>
          <div className="bg-gray-800 rounded p-3 break-all select-all text-sm">{inviteUrl}</div>
          <div className="text-gray-400 text-sm">We will connect automatically</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <p className="text-2xl font-bold">{phase === 'connecting' ? 'Connecting…' : 'Connected'}</p>
      </div>
    </div>
  )
} 