// PWA utilities for install prompt and detection

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// PWA Install Prompt Management
class PWAInstallManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null
  private installCallback: (() => void) | null = null

  constructor() {
    this.setupInstallPrompt()
  }

  private setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.deferredPrompt = e as BeforeInstallPromptEvent
      if (this.installCallback) this.installCallback()
    })

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed')
      this.deferredPrompt = null
    })
  }

  public canInstall(): boolean {
    return this.deferredPrompt !== null
  }

  public async showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) return 'unavailable'
    await this.deferredPrompt.prompt()
    const { outcome } = await this.deferredPrompt.userChoice
    this.deferredPrompt = null
    return outcome
  }

  public onInstallAvailable(callback: () => void) {
    this.installCallback = callback
    if (this.canInstall()) callback()
  }
}

export const pwaInstallManager = new PWAInstallManager()

export const isPWA = (): boolean => {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  const ref = document.referrer
  return window.matchMedia('(display-mode: standalone)').matches ||
         nav.standalone === true ||
         (typeof ref === 'string' && ref.includes('android-app://'))
}

export const getPWADisplayMode = (): string => {
  if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone'
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen'
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui'
  return 'browser'
}

export const supportsPWAInstall = (): boolean => {
  return 'serviceWorker' in navigator && 'beforeinstallprompt' in window
}
