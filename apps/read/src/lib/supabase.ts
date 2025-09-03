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

// S2: Edge function to identify device/ip hashes
export async function identifyDevice(deviceUUID: string, userAgent?: string): Promise<{ ip_hash: string | null; device_hash: string } | { error: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('identify_device', {
      body: { device_uuid: deviceUUID, user_agent: userAgent || navigator.userAgent }
    })
    if (error) return { error: error.message }
    return data as { ip_hash: string | null; device_hash: string }
  } catch (e) {
    return { error: (e as { message?: string }).message || 'invoke_failed' }
  }
}

// S2: RPC guest_check_and_start_session
export async function guestCheckAndStartSession(roomCode: string, ip_hash: string | null, device_hash: string): Promise<
  | { session_id: string; room_id: string; room_code: string; role: 'caller' | 'callee'; started_at: string }
  | { error: string }
> {
  try {
    const { data, error } = await supabase.rpc('guest_check_and_start_session' as unknown as never, {
      p_room_code: roomCode,
      p_ip_hash: ip_hash,
      p_device_hash: device_hash,
    } as unknown as never)
    if (error) {
      console.error('guest_check_and_start_session error:', error)
      const details = (error as unknown as { details?: string; hint?: string }).details || ''
      return { error: `${error.message}${details ? `: ${details}` : ''}` }
    }
    const row = (Array.isArray(data) ? data[0] : data) as {
      session_id: string
      room_id: string
      room_code: string
      role: 'caller' | 'callee'
      started_at: string
    }
    if (!row?.session_id) return { error: 'invalid_response' }
    return row
  } catch (e) {
    console.error('guest_check_and_start_session threw:', e)
    return { error: (e as { message?: string }).message || 'rpc_failed' }
  }
}

// S2: RPC to log connection events
export async function logConnectionEvent(params: {
  session_id: string
  room_code: string
  client_id?: string | null
  event_type: 'connect_start' | 'connected' | 'retry' | 'ice_failed' | 'ended'
  detail?: Record<string, unknown>
}): Promise<void> {
  const { session_id, room_code, client_id, event_type, detail } = params
  await supabase.rpc('rpc_log_connection_event' as unknown as never, {
    p_session_id: session_id,
    p_room_code: room_code,
    p_client_id: client_id || null,
    p_event_type: event_type,
    p_detail: detail || {},
  } as unknown as never)
}

// S2: RPC to end session
export async function endGuestSession(sessionId: string): Promise<void> {
  await supabase.rpc('rpc_end_guest_session' as unknown as never, { p_session_id: sessionId } as unknown as never)
}

export async function heartbeatGuestSession(sessionId: string, roomCode: string): Promise<void> {
  await supabase.rpc('rpc_heartbeat_guest_session' as unknown as never, {
    p_session_id: sessionId,
    p_room_code: roomCode,
  } as unknown as never)
}
