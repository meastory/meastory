-- S2 fix: relax tier check to allow NULL tier as guest-compatible
CREATE OR REPLACE FUNCTION guest_check_and_start_session(
  p_room_code TEXT,
  p_ip_hash TEXT,
  p_device_hash TEXT
)
RETURNS TABLE (
  session_id UUID,
  room_id UUID,
  room_code TEXT,
  role TEXT,
  started_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room RECORD;
  v_active_count INTEGER;
  v_role TEXT;
  v_day DATE := (NOW() AT TIME ZONE 'utc')::date;
  v_limit RECORD;
  v_session_id UUID;
BEGIN
  -- Load room by code
  SELECT id, code, tier, status
  INTO v_room
  FROM rooms
  WHERE code = UPPER(p_room_code)
  LIMIT 1;

  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'room_not_found';
  END IF;
  -- Allow NULL tier as guest-compatible to avoid strict failures in mixed data
  IF v_room.tier IS NOT NULL AND v_room.tier <> 'guest' THEN
    RAISE EXCEPTION 'room_not_guest_tier';
  END IF;

  -- Active participants in this room (no ended_at)
  SELECT COUNT(*) INTO v_active_count
  FROM guest_sessions
  WHERE room_id = v_room.id AND ended_at IS NULL;

  IF v_active_count >= 2 THEN
    RAISE EXCEPTION 'room_full';
  END IF;

  -- Enforce daily limit (3/day per ip/device). Allow NULL ip_hash (dev/local), still limit by device_hash.
  INSERT INTO device_limits (ip_hash, device_hash, day, session_count)
  VALUES (COALESCE(p_ip_hash, 'noip'), p_device_hash, v_day, 0)
  ON CONFLICT (ip_hash, device_hash, day)
  DO UPDATE SET updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_limit;

  IF v_limit.session_count >= 3 THEN
    RAISE EXCEPTION 'daily_limit_exceeded';
  END IF;

  -- Increment after check
  UPDATE device_limits
  SET session_count = session_count + 1, updated_at = NOW()
  WHERE id = v_limit.id;

  -- Assign role based on current active count
  IF v_active_count = 0 THEN
    v_role := 'caller';
  ELSE
    v_role := 'callee';
  END IF;

  -- Create session
  INSERT INTO guest_sessions (room_id, room_code, device_hash, ip_hash, role)
  VALUES (v_room.id, v_room.code, p_device_hash, p_ip_hash, v_role)
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT v_session_id, v_room.id, v_room.code, v_role, NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION guest_check_and_start_session(TEXT, TEXT, TEXT) TO anon; 