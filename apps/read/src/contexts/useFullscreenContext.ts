import { useContext } from 'react'
import { FullscreenContext } from './FullscreenContextValue'

export function useFullscreenContext() {
  const context = useContext(FullscreenContext)
  if (context === undefined) {
    throw new Error('useFullscreenContext must be used within a FullscreenProvider')
  }
  return context
} 