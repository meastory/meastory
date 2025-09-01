-- Fix infinite recursion in RLS policies
-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view rooms they're participating in" ON rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
DROP POLICY IF EXISTS "Room hosts can update their rooms" ON rooms;
DROP POLICY IF EXISTS "Room hosts can delete their rooms" ON rooms;
DROP POLICY IF EXISTS "Room participants can view participant list" ON room_participants;
DROP POLICY IF EXISTS "Room hosts can manage participants" ON room_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON room_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON room_participants;

-- Simplified RLS policies to avoid recursion

-- Rooms policies (simplified)
CREATE POLICY "Authenticated users can view rooms" ON rooms
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create rooms" ON rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Room hosts can update their rooms" ON rooms
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Room hosts can delete their rooms" ON rooms
  FOR DELETE USING (auth.uid() = host_id);

-- Room participants policies (simplified)
CREATE POLICY "Authenticated users can view participants" ON room_participants
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can join rooms" ON room_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" ON room_participants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Room hosts can manage all participants in their rooms" ON room_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_participants.room_id
      AND rooms.host_id = auth.uid()
    )
  );
