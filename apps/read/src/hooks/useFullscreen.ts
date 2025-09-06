// Deprecated: Use contexts/useFullscreenContext instead.
// Keeping as a thin proxy for backward compatibility to avoid breaking imports.
import { useFullscreenContext } from '../contexts/useFullscreenContext'
export function useFullscreen() {
  return useFullscreenContext()
}
