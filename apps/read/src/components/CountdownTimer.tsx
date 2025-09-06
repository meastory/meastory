import { useEffect, useState } from 'react'

interface CountdownTimerProps {
  endsAtMs: number | null | undefined
  className?: string
  label?: string
  onTick?: (remainingMs: number) => void
}

export default function CountdownTimer({ endsAtMs, className = '', label, onTick }: CountdownTimerProps) {
  const [remainingMs, setRemainingMs] = useState<number>(0)

  useEffect(() => {
    const compute = () => {
      const now = Date.now()
      const rem = endsAtMs ? Math.max(0, endsAtMs - now) : 0
      setRemainingMs(rem)
      onTick?.(rem)
    }
    compute()
    const id = window.setInterval(compute, 1000)
    return () => window.clearInterval(id)
  }, [endsAtMs])

  const mins = Math.floor(remainingMs / 60000)
  const secs = Math.floor((remainingMs % 60000) / 1000)

  return (
    <span className={className}>
      {label ? `${label} ` : ''}{String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
    </span>
  )
}


