import { useMemo } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

interface InviteContentProps {
  code: string
  onClose?: () => void
  isPopup?: boolean
}

export default function InviteContent({ code, onClose, isPopup = false }: InviteContentProps) {
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
      console.error('Clipboard copy failed', e)
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(normalized)
      alert('Code copied')
    } catch (e) {
      console.error('Code copy failed', e)
    }
  }

  const containerClass = isPopup 
    ? "bg-gray-800 text-white rounded-lg shadow-lg p-6 max-w-md w-full relative"
    : "min-h-screen bg-black text-white flex items-center justify-center p-6"

  const contentClass = isPopup 
    ? "space-y-4"
    : "w-full max-w-md text-center space-y-6"

  return (
    <div className={containerClass}>
      {/* Close button for popup */}
      {isPopup && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          aria-label="Close invite"
        >
          ✕
        </button>
      )}

      <div className={contentClass}>
        <div className="text-center">
          <h1 className={`font-bold text-green-500 mb-2 ${isPopup ? 'text-xl' : 'text-3xl'}`}>
            Story Time Invite
          </h1>
          <p className={`text-gray-300 ${isPopup ? 'text-sm' : 'text-lg'}`}>
            Share this with someone to start reading together
          </p>
        </div>

        {/* Room Code */}
        <div className="bg-gray-900 p-4 rounded-lg text-center">
          <p className="text-gray-400 text-sm mb-1">Room Code</p>
          <button
            onClick={copyCode}
            className="text-3xl font-mono font-bold text-green-400 hover:text-green-300 transition-colors tracking-widest"
            title="Click to copy code"
          >
            {normalized}
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeCanvas
              value={inviteUrl}
              size={isPopup ? 120 : 160}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>
        </div>

        {/* Share Options */}
        <div className="space-y-3">
          <button
            onClick={shareOrCopy}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            📱 Share Link
          </button>
          
          <button
            onClick={copyLink}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            📋 Copy Link
          </button>
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className={`text-gray-400 ${isPopup ? 'text-xs' : 'text-sm'}`}>
            Others can join by visiting{' '}
            <span className="text-green-400 font-mono">meastory.com</span>{' '}
            and entering the room code, or by scanning the QR code.
          </p>
        </div>
      </div>
    </div>
  )
}
