import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Realtime channel helpers
export const createRoomChannel = (roomId: string) => {
  return supabase.channel(`room-${roomId}`)
}

export const createStoryChannel = (storyId: string) => {
  return supabase.channel(`story-${storyId}`)
}

// Database helpers
export const getStories = async () => {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const getStory = async (id: string) => {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export const createRoom = async (storyId: string) => {
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      story_id: storyId,
    } as any)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getRoom = async (id: string) => {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, stories(*)')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}
