import type { ReactNode } from 'react'
import { useFullscreen } from '../hooks/useFullscreen'
import { FullscreenContext } from './FullscreenContextValue'

interface FullscreenProviderProps {
  children: ReactNode
}

export default function FullscreenProvider({ children }: FullscreenProviderProps) {
  const fullscreenHook = useFullscreen()
  return (
    <FullscreenContext.Provider value={fullscreenHook}>
      {children}
    </FullscreenContext.Provider>
  )
}
