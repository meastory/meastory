import { useEffect, useState } from 'react'
import { supabase } from '../stores/authStore'

interface StoryOption { id: string; title: string }

export default function InRoomStoryPicker({ onClose }: { onClose?: () => void }) {
  const [stories, setStories] = useState<StoryOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCurated = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('stories')
        .select('id, title')
        .eq('status', 'published')
        .order('title', { ascending: true })
        .limit(3)
      if (data) setStories(data as StoryOption[])
      setLoading(false)
    }
    loadCurated()
  }, [])

  const handlePick = async (storyId: string) => {
    const { useRoomStore } = await import('../stores/roomStore')
    await useRoomStore.getState().changeStory(storyId)
    try {
      const { webrtcManager } = await import('../services/webrtcManager')
      webrtcManager.syncStoryChange(storyId)
    } catch (e) { console.warn('sync story-change failed:', e) }
    if (onClose) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900 p-6 rounded-lg shadow space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Pick a Story</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">✕</button>
        </div>
        {loading ? (
          <div className="text-gray-300">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {stories.map(s => (
              <button
                key={s.id}
                onClick={() => handlePick(s.id)}
                className="w-full px-4 py-3 rounded bg-gray-700 hover:bg-gray-600 text-white text-left"
              >
                {s.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 