import { supabase } from '../stores/authStore'

// Re-export the supabase client from auth store to maintain single instance
export { supabase }

// Helper functions for real-time subscriptions
export const createRoomChannel = (roomId: string) => {
  return supabase.channel(`room-${roomId}`)
}

export const createStoryChannel = (storyId: string) => {
  return supabase.channel(`story-${storyId}`)
}

// Helper functions for database operations
export const getRoomByCode = async (code: string) => {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  
  return { data, error }
}

export const getRoomParticipants = async (roomId: string) => {
  const { data, error } = await supabase
    .from('room_participants')
    .select('*')
    .eq('room_id', roomId)
  
  return { data, error }
}

export const joinRoom = async (roomId: string, userId: string, participantName: string) => {
  const { data, error } = await supabase
    .from('room_participants')
    .insert({
      room_id: roomId,
      user_id: userId,
      participant_name: participantName
    })
    .select()
    .single()
  
  return { data, error }
}

export const leaveRoom = async (roomId: string, userId: string) => {
  const { error } = await supabase
    .from('room_participants')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId)
  
  return { error }
}

// S1: Guest room RPC helper (return type unknown until types are regenerated)
export const createGuestRoom = async (name: string, storyId?: string | null) => {
  const { data, error } = await supabase.rpc('rpc_create_guest_room' as unknown as never, {
    p_name: name,
    p_story_id: storyId || null,
  } as unknown as never)
  return { data: data as unknown, error }
}
