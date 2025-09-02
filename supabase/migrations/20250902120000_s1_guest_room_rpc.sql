-- S1: Guest room RPC and schema tweaks

-- Ensure rooms.host_id can be NULL for guest-created rooms
ALTER TABLE rooms ALTER COLUMN host_id DROP NOT NULL;

-- Add a simple tier column if not present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'tier'
  ) THEN
    ALTER TABLE rooms ADD COLUMN tier TEXT;
    -- Optional: add basic constraint for known values
    ALTER TABLE rooms ADD CONSTRAINT rooms_tier_check CHECK (tier IN ('guest','free','paid') OR tier IS NULL);
  END IF;
END $$;

-- Guest room creation RPC
CREATE OR REPLACE FUNCTION rpc_create_guest_room(p_name TEXT, p_story_id UUID DEFAULT NULL)
RETURNS TABLE(id UUID, code VARCHAR, name TEXT, story_id UUID, status room_status, max_participants INTEGER, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_room RECORD;
BEGIN
  INSERT INTO rooms (name, story_id, host_id, status, max_participants, tier)
  VALUES (
    COALESCE(NULLIF(p_name, ''), 'Story Time'),
    p_story_id,
    NULL,
    'waiting',
    2,
    'guest'
  )
  RETURNING id, code, name, story_id, status, max_participants, created_at
  INTO new_room;

  RETURN QUERY SELECT new_room.id, new_room.code, new_room.name, new_room.story_id, new_room.status, new_room.max_participants, new_room.created_at;
END;
$$;

-- Allow anonymous callers to execute the RPC
GRANT EXECUTE ON FUNCTION rpc_create_guest_room(TEXT, UUID) TO anon; 