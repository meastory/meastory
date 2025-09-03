import { useMemo } from 'react'
import { useWebRTCStore } from '../stores/webrtcStore'

interface Props {
  className?: string
}

export default function PresenceBadge({ className }: Props) {
  const { role, participants } = useWebRTCStore()
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
    <div className={className} title={tooltip}>
      <div className="px-3 py-1 rounded bg-white/10 border border-white/20 text-xs text-white/90">
        {label}
      </div>
    </div>
  )
} 