-- Fix RLS policies for room_participants to allow proper room joining

-- Drop the problematic simplified policies
DROP POLICY IF EXISTS "Authenticated users can view participants" ON room_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON room_participants;
DROP POLICY IF EXISTS "Room hosts can manage all participants in their rooms" ON room_participants;

-- Create proper RLS policies that allow room joining
-- Allow users to check if they're already participants in a room (for join validation)
CREATE POLICY "Users can check their own participation" ON room_participants
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to view participants in rooms they can access
CREATE POLICY "Users can view participants in accessible rooms" ON room_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_participants.room_id
      AND (rooms.host_id = auth.uid() OR rooms.status = 'active')
    )
  );

-- Allow users to join rooms
CREATE POLICY "Users can join rooms" ON room_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own participation
CREATE POLICY "Users can update their own participation" ON room_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow room hosts to manage all participants
CREATE POLICY "Room hosts can manage participants" ON room_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_participants.room_id
      AND rooms.host_id = auth.uid()
    )
  );
