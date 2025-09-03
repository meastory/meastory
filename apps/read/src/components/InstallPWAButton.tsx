import { useState, useEffect } from 'react'
import { pwaInstallManager, isPWA } from '../utils/pwa'

interface InstallPWAButtonProps {
  className?: string
  variant?: 'button' | 'banner' | 'minimal'
  onInstallSuccess?: () => void
  onInstallDismissed?: () => void
}

export default function InstallPWAButton({
  className = '',
  variant = 'button',
  onInstallSuccess,
  onInstallDismissed
}: InstallPWAButtonProps) {
  const [canInstall, setCanInstall] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isPWA()) {
      return
    }

    // Check if installation is available
    pwaInstallManager.onInstallAvailable(() => {
      setCanInstall(true)
    })

    // Check current state
    setCanInstall(pwaInstallManager.canInstall())

    // Check if user previously dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed')
    if (wasDismissed) {
      setDismissed(true)
    }
  }, [])

  const handleInstall = async () => {
    setInstalling(true)
    
    try {
      const outcome = await pwaInstallManager.showInstallPrompt()
      
      if (outcome === 'accepted') {
        setCanInstall(false)
        onInstallSuccess?.()
      } else if (outcome === 'dismissed') {
        localStorage.setItem('pwa-install-dismissed', 'true')
        setDismissed(true)
        onInstallDismissed?.()
      }
    } catch (error) {
      console.error('Install failed:', error)
    } finally {
      setInstalling(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    setDismissed(true)
    onInstallDismissed?.()
  }

  // Don't render if can't install, already dismissed, or is already PWA
  if (!canInstall || dismissed || isPWA()) {
    return null
  }

  if (variant === 'banner') {
    return (
      <div className={`bg-blue-600 text-white p-4 shadow-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📱</div>
            <div>
              <div className="font-semibold">Install MeAStory</div>
              <div className="text-sm opacity-90">
                Get the full app experience with offline support
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="px-4 py-2 bg-white text-blue-600 font-semibold rounded hover:bg-gray-100 disabled:opacity-50"
            >
              {installing ? 'Installing...' : 'Install'}
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-blue-700 rounded"
              aria-label="Dismiss install prompt"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleInstall}
        disabled={installing}
        className={`text-blue-400 hover:text-blue-300 underline text-sm ${className}`}
      >
        {installing ? 'Installing...' : '📱 Install App'}
      </button>
    )
  }

  // Default button variant
  return (
    <button
      onClick={handleInstall}
      disabled={installing}
      className={`
        flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
        text-white font-semibold rounded-lg transition-colors disabled:opacity-50
        ${className}
      `}
    >
      <span>📱</span>
      <span>{installing ? 'Installing...' : 'Install App'}</span>
    </button>
  )
}
