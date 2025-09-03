import { useFullscreenContext } from '../contexts/useFullscreenContext'

interface FullscreenButtonProps {
  className?: string
  targetElement?: HTMLElement | null
  showOnDesktop?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'minimal' | 'floating'
}

export default function FullscreenButton({ 
  className = '', 
  targetElement,
  showOnDesktop = false,
  size = 'md',
  variant = 'default'
}: FullscreenButtonProps) {
  const { isFullscreen, isSupported, toggleFullscreen } = useFullscreenContext()

  // Check if we should show on this device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  if (!isSupported || (!isMobile && !showOnDesktop)) {
    return null
  }

  const handleClick = () => {
    toggleFullscreen(targetElement || undefined)
  }

  // Size classes
  const sizeClasses = {
    sm: 'p-2 w-8 h-8',
    md: 'p-3 w-12 h-12',
    lg: 'p-4 w-16 h-16'
  }

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32
  }

  // Variant classes
  const variantClasses = {
    default: 'bg-black/50 hover:bg-black/70 backdrop-blur-sm',
    minimal: 'bg-white/10 hover:bg-white/20 backdrop-blur-sm',
    floating: 'bg-black/60 hover:bg-black/80 backdrop-blur-md shadow-lg'
  }

  return (
    <button
      onClick={handleClick}
      className={`
        ${sizeClasses[size]} rounded-full text-white transition-all duration-200
        ${variantClasses[variant]} touch-manipulation active:scale-95
        ${className}
      `}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? (
        // Exit fullscreen icon - minimize/compress
        <svg width={iconSizes[size]} height={iconSizes[size]} viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
        </svg>
      ) : (
        // Enter fullscreen icon - expand
        <svg width={iconSizes[size]} height={iconSizes[size]} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
      )}
    </button>
  )
}
