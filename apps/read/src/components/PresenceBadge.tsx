import { useMemo, useState } from 'react'
import { useWebRTCStore } from '../stores/webrtcStore'

interface Props {
  className?: string
}

export default function PresenceBadge({ className }: Props) {
  const { role, participants } = useWebRTCStore()
  const [hover, setHover] = useState(false)

  const label = useMemo(() => {
    const count = participants.size + 1
    const roleText = role ? role.toUpperCase() : '—'
    return `Connected: ${count} • ${roleText}`
  }, [participants.size, role])

  const tooltip = useMemo(() => {
    const items: string[] = []
    participants.forEach((p, id) => {
      const name = p.name || id
      const device = p.deviceLabel ? ` — ${p.deviceLabel}` : ''
      items.push(`${name}${device}`)
    })
    if (items.length === 0) return 'Only you are connected'
    return items.join('\n')
  }, [participants])

  return (
    <div
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-center gap-2 px-3 py-1 rounded bg-white/10 border border-white/20 text-xs text-white/90">
        <span className="relative inline-flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span aria-describedby="presence-tooltip">{label}</span>
      </div>
      {hover && (
        <div
          role="tooltip"
          id="presence-tooltip"
          className="absolute mt-1 right-0 z-[1105] whitespace-pre bg-gray-900 text-white text-xs border border-white/10 rounded px-2 py-1"
        >
          {tooltip}
        </div>
      )}
    </div>
  )
} 