import { useState, useEffect } from 'react'
import { useAuthStore, supabase } from '../stores/authStore'
import type { Database } from '../types/supabase'
import type { Tables } from '../types/supabase'

type Room = Tables<'rooms'>
type RoomParticipant = Tables<'room_participants'>

export default function RoomManager() {
  const { user } = useAuthStore()
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomCode, setRoomCode] = useState('')
  const [roomName, setRoomName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create')

  // Load user's rooms
  useEffect(() => {
    if (user) {
      loadUserRooms()
    }
  }, [user])

  const loadUserRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('host_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRooms(data || [])
    } catch (error) {
      console.error('Error loading rooms:', error)
    }
  }

  const createRoom = async () => {
    if (!user || !roomName.trim()) return

    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          name: roomName.trim(),
          host_id: user.id,
          max_participants: 10
        })
        .select()
        .single()

      if (error) throw error

      setMessage(`Room created! Code: ${data.code}`)
      setRoomName('')
      loadUserRooms()
    } catch (error: any) {
      setMessage(`Error creating room: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const joinRoom = async () => {
    if (!user || !roomCode.trim()) return

    setLoading(true)
    setMessage('')

    try {
      // First, find the room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode.trim().toUpperCase())
        .single()

      if (roomError) throw roomError

      // Check if user is already a participant
      const { data: existingParticipant, error: participantError } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single()

      if (existingParticipant) {
        setMessage('You are already in this room!')
        return
      }

      // Add user as participant
      const { error: joinError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          participant_name: user.display_name || user.email || 'Anonymous'
        })

      if (joinError) throw joinError

      setMessage(`Successfully joined room: ${room.name}`)
      setRoomCode('')
      loadUserRooms()
    } catch (error: any) {
      setMessage(`Error joining room: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div>Please log in to manage rooms</div>
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Room Manager</h1>
        
        {/* Tabs */}
        <div className="flex mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 ${activeTab === 'create' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
          >
            Create Room
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`px-4 py-2 ${activeTab === 'join' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
          >
            Join Room
          </button>
        </div>

        {/* Create Room Tab */}
        {activeTab === 'create' && (
          <div className="bg-gray-900 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Create New Room</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter room name"
                />
              </div>
              
              <button
                onClick={createRoom}
                disabled={loading || !roomName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </div>
        )}

        {/* Join Room Tab */}
        {activeTab === 'join' && (
          <div className="bg-gray-900 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Join Existing Room</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter room code (e.g., ABC123)"
                  maxLength={6}
                />
              </div>
              
              <button
                onClick={joinRoom}
                disabled={loading || !roomCode.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>
        )}

        {/* Status Message */}
        {message && (
          <div className="mb-8 p-4 bg-gray-800 rounded-lg">
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* User's Rooms */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Your Rooms</h2>
          
          {rooms.length === 0 ? (
            <p className="text-gray-400">No rooms created yet</p>
          ) : (
            <div className="space-y-4">
              {rooms.map((room) => (
                <div key={room.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{room.name}</h3>
                      <p className="text-sm text-gray-400">Code: {room.code}</p>
                      <p className="text-sm text-gray-400">
                        Status: {room.status} | Created: {new Date(room.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">
                        Enter Room
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
