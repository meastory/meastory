import { useState, useEffect } from 'react'

interface MediaPermissions {
  camera: PermissionState | null
  microphone: PermissionState | null
  isLoading: boolean
  error: string | null
}

export function useMediaPermissions(): MediaPermissions & {
  requestPermissions: () => Promise<void>
} {
  const [permissions, setPermissions] = useState<{
    camera: PermissionState | null
    microphone: PermissionState | null
  }>({
    camera: null,
    microphone: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkPermissions = async () => {
    try {
      // Check if Permissions API is supported
      if ('permissions' in navigator) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName })
        const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        
        setPermissions({
          camera: cameraPermission.state,
          microphone: microphonePermission.state
        })
        
        // Listen for permission changes
        cameraPermission.addEventListener('change', () => {
          setPermissions(prev => ({ ...prev, camera: cameraPermission.state }))
        })
        
        microphonePermission.addEventListener('change', () => {
          setPermissions(prev => ({ ...prev, microphone: microphonePermission.state }))
        })
      }
    } catch (err) {
      console.warn('Permissions API not fully supported:', err)
    }
  }

  const requestPermissions = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Request media access to trigger permission prompts
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      // Stop the stream immediately after getting permissions
      stream.getTracks().forEach(track => track.stop())
      
      // Re-check permissions after request
      await checkPermissions()
      
    } catch (err: unknown) {
      console.error('Error requesting media permissions:', err)
      
      let errorMessage = 'Failed to access camera and microphone'
      const e = err as { name?: string }
      
      if (e.name === 'NotAllowedError') {
        errorMessage = 'Camera and microphone access denied. Please allow access in your browser settings.'
      } else if (e.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found on this device.'
      } else if (e.name === 'NotSupportedError') {
        errorMessage = 'Media access is not supported in this browser.'
      } else if (e.name === 'SecurityError') {
        errorMessage = 'Media access blocked due to security restrictions.'
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkPermissions()
  }, [])

  return {
    ...permissions,
    isLoading,
    error,
    requestPermissions
  }
}
