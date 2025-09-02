-- Replace guest room RPC with SQL-language version to avoid ambiguity

CREATE OR REPLACE FUNCTION rpc_create_guest_room(p_name TEXT, p_story_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  code VARCHAR,
  name TEXT,
  story_id UUID,
  status room_status,
  max_participants INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO rooms (name, story_id, host_id, status, max_participants, tier)
  VALUES (
    COALESCE(NULLIF(p_name, ''), 'Story Time'),
    p_story_id,
    NULL,
    'waiting',
    2,
    'guest'
  )
  RETURNING rooms.id, rooms.code, rooms.name, rooms.story_id, rooms.status, rooms.max_participants, rooms.created_at;
$$;

GRANT EXECUTE ON FUNCTION rpc_create_guest_room(TEXT, UUID) TO anon; 