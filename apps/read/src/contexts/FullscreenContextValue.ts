import { createContext } from 'react'

export interface FullscreenContextType {
  isFullscreen: boolean
  isSupported: boolean
  enterFullscreen: (element?: HTMLElement) => Promise<void>
  exitFullscreen: () => Promise<void>
  toggleFullscreen: (element?: HTMLElement) => void
}

export const FullscreenContext = createContext<FullscreenContextType | undefined>(undefined) 