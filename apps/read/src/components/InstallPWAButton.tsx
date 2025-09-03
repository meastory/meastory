import { useEffect, useState } from 'react'
import { pwaInstallManager } from '../utils/pwa'

export default function InstallPWAButton({ className = '' }: { className?: string }) {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    const onAvail = () => setAvailable(true)
    pwaInstallManager.onInstallAvailable(onAvail)
    return () => {
      // no-op cleanup
    }
  }, [])

  const onInstall = async () => {
    const res = await pwaInstallManager.showInstallPrompt()
    if (res === 'accepted') {
      console.log('PWA install accepted')
      setAvailable(false)
    }
  }

  if (!available) return null

  return (
    <button onClick={onInstall} className={`px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm ${className}`}>
      Install App
    </button>
  )
}
