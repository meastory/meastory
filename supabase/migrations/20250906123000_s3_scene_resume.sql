-- Sprint 3: Minimal scene resume - add columns and RPC with host-only control

-- Add columns if not present
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS current_story_id TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS current_scene_id TEXT;

-- RPC: update current scene and story (host-only)
CREATE OR REPLACE FUNCTION rpc_update_room_scene(
  p_room_id UUID,
  p_story_id TEXT,
  p_scene_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room RECORD;
BEGIN
  SELECT id, host_id INTO v_room FROM rooms WHERE id = p_room_id;
  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'room_not_found';
  END IF;
  -- Ensure caller is host
  IF auth.uid() IS NULL OR auth.uid() <> v_room.host_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE rooms
  SET current_story_id = p_story_id,
      current_scene_id = p_scene_id,
      updated_at = NOW()
  WHERE id = p_room_id;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_update_room_scene(UUID, TEXT, TEXT) TO authenticated; 