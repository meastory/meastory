import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'

export default function Invite() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const normalized = String(code).toUpperCase()
  const inviteUrl = useMemo(() => `${location.origin}/join/${normalized}`, [normalized])

  const shareOrCopy = async () => {
    try {
      if ((navigator as unknown as { share?: (data: ShareData) => Promise<void> }).share) {
        await (navigator as unknown as { share: (data: ShareData) => Promise<void> }).share({
          title: 'Join Me for Story Time',
          text: 'Tap to join my story session',
          url: inviteUrl,
        })
        return
      }
      await navigator.clipboard.writeText(inviteUrl)
      alert('Link copied')
    } catch (e) {
      console.error('Share/copy failed', e)
      try {
        await navigator.clipboard.writeText(inviteUrl)
        alert('Link copied')
      } catch (err) {
        console.warn('Clipboard write failed', err)
      }
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      alert('Link copied')
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900 p-6 rounded-lg shadow space-y-6 text-center">
        <h1 className="text-3xl font-bold">Invite</h1>

        <div className="text-sm text-gray-300">Room code</div>
        <div className="text-4xl tracking-widest font-mono bg-gray-800 rounded px-4 py-3 inline-block">
          {normalized}
        </div>

        <div className="flex gap-3">
          <button onClick={shareOrCopy} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold">
            Share Link
          </button>
          <button onClick={copyLink} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded font-semibold">
            Copy
          </button>
        </div>

        <div className="flex items-center justify-center pt-2">
          <div className="bg-white p-3 rounded">
            <QRCodeCanvas value={inviteUrl} size={200} includeMargin={false} />
          </div>
        </div>

        <button onClick={() => navigate(`/join/${normalized}`)} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-semibold">
          Join on this device
        </button>
      </div>
    </div>
  )
} 