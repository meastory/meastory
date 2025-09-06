import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { FullscreenContext } from './FullscreenContextValue'

interface FullscreenProviderProps {
  children: ReactNode
}

export default function FullscreenProvider({ children }: FullscreenProviderProps) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isSupported, setIsSupported] = useState<boolean>(false)

  useEffect(() => {
    const supported = !!(
      document.fullscreenEnabled ||
      (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled ||
      (document as unknown as { mozFullScreenEnabled?: boolean }).mozFullScreenEnabled ||
      (document as unknown as { msFullscreenEnabled?: boolean }).msFullscreenEnabled
    )
    setIsSupported(supported)

    const onChange = () => {
      const el =
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement
      setIsFullscreen(!!el)
    }

    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange as EventListener)
    document.addEventListener('mozfullscreenchange', onChange as EventListener)
    document.addEventListener('MSFullscreenChange', onChange as EventListener)

    onChange()

    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange as EventListener)
      document.removeEventListener('mozfullscreenchange', onChange as EventListener)
      document.removeEventListener('MSFullscreenChange', onChange as EventListener)
    }
  }, [])

  const enterFullscreen = useCallback(async (element?: HTMLElement) => {
    const el = element || document.documentElement
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if ((el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (el as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen()
      } else if ((el as unknown as { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen) {
        await (el as unknown as { mozRequestFullScreen: () => Promise<void> }).mozRequestFullScreen()
      } else if ((el as unknown as { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
        await (el as unknown as { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen()
      }
    } catch (e) {
      console.warn('Enter fullscreen failed:', e)
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen()
      } else if ((document as unknown as { mozCancelFullScreen?: () => Promise<void> }).mozCancelFullScreen) {
        await (document as unknown as { mozCancelFullScreen: () => Promise<void> }).mozCancelFullScreen()
      } else if ((document as unknown as { msExitFullscreen?: () => Promise<void> }).msExitFullscreen) {
        await (document as unknown as { msExitFullscreen: () => Promise<void> }).msExitFullscreen()
      }
    } catch (e) {
      console.warn('Exit fullscreen failed:', e)
    }
  }, [])

  const toggleFullscreen = useCallback((element?: HTMLElement) => {
    if (isFullscreen) {
      void exitFullscreen()
    } else {
      void enterFullscreen(element)
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen])

  const fullscreenHook = { isFullscreen, isSupported, enterFullscreen, exitFullscreen, toggleFullscreen }
  return (
    <FullscreenContext.Provider value={fullscreenHook}>
      {children}
    </FullscreenContext.Provider>
  )
}
