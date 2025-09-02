import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function JoinCode() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const normalized = code.toUpperCase().trim()
    const valid = /^[A-Z0-9]{6}$/.test(normalized)
    if (!valid) {
      setError('Enter a 6-letter code')
      return
    }
    navigate(`/join/${normalized}`)
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900 p-6 rounded-lg shadow space-y-6 text-center">
        <h1 className="text-3xl font-bold">Join</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-center text-2xl tracking-widest font-mono"
            aria-label="Room code"
          />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-semibold">
            Continue
          </button>
        </form>
      </div>
    </div>
  )
} 