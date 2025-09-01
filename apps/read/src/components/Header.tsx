import { useUIStore } from '../stores/uiStore'

export default function Header() {
  const { mode } = useUIStore()

  return (
    <header className="bg-primary text-white py-6">
      <div className="container">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-serif">Read Me A Story</h1>
            <p className="text-white/80">Live video storytelling for families</p>
          </div>
          
          <div className="text-sm text-white/60">
            Mode: {mode}
          </div>
        </div>
      </div>
    </header>
  )
}
