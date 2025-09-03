-- S2: Heartbeat-based liveness for guest sessions to avoid stale room_full

-- Add last_seen_at for liveness tracking
ALTER TABLE public.guest_sessions
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_guest_sessions_last_seen ON public.guest_sessions(last_seen_at);

-- Heartbeat RPC to refresh liveness while client is active
CREATE OR REPLACE FUNCTION rpc_heartbeat_guest_session(
  p_session_id UUID,
  p_room_code TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.guest_sessions
  SET last_seen_at = NOW()
  WHERE id = p_session_id AND room_code = UPPER(p_room_code) AND ended_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION rpc_heartbeat_guest_session(UUID, TEXT) TO anon;

-- Update guest_check RPC: clean up stale and use liveness in active count
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
  v_first_started TIMESTAMPTZ;
BEGIN
  SELECT r.id, r.code, r.tier, r.status
  INTO v_room
  FROM public.rooms r
  WHERE r.code = UPPER(p_room_code)
  LIMIT 1;

  IF v_room.id IS NULL THEN RAISE EXCEPTION 'room_not_found'; END IF;
  IF v_room.tier IS NOT NULL AND v_room.tier <> 'guest' THEN RAISE EXCEPTION 'room_not_guest_tier'; END IF;

  -- Clean up: end sessions that are expired by time or stale heartbeat (>45s)
  UPDATE public.guest_sessions gs
  SET ended_at = NOW()
  WHERE gs.room_id = v_room.id
    AND gs.ended_at IS NULL
    AND (
      gs.started_at < NOW() - INTERVAL '30 minutes' OR
      gs.last_seen_at < NOW() - INTERVAL '45 seconds'
    );

  -- If still at capacity, but one session from same device/ip is stale-ish, reclaim it
  -- (helps quick rejoin from same device)
  SELECT COUNT(*) INTO v_active_count
  FROM public.guest_sessions gs
  WHERE gs.room_id = v_room.id AND gs.ended_at IS NULL AND gs.last_seen_at > NOW() - INTERVAL '45 seconds';

  IF v_active_count >= 2 THEN
    UPDATE public.guest_sessions gs
    SET ended_at = NOW()
    WHERE gs.room_id = v_room.id
      AND gs.ended_at IS NULL
      AND gs.device_hash = p_device_hash
      AND gs.last_seen_at < NOW() - INTERVAL '10 seconds';
  END IF;

  -- Recompute active count
  SELECT COUNT(*) INTO v_active_count
  FROM public.guest_sessions gs
  WHERE gs.room_id = v_room.id AND gs.ended_at IS NULL AND gs.last_seen_at > NOW() - INTERVAL '45 seconds';

  IF v_active_count >= 2 THEN
    RAISE EXCEPTION 'room_full';
  END IF;

  -- Daily limit (create or touch row)
  INSERT INTO public.device_limits (ip_hash, device_hash, day, session_count)
  VALUES (COALESCE(p_ip_hash, 'noip'), p_device_hash, v_day, 0)
  ON CONFLICT (ip_hash, device_hash, day)
  DO UPDATE SET updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_limit;

  IF v_limit.session_count >= 3 THEN RAISE EXCEPTION 'daily_limit_exceeded'; END IF;

  UPDATE public.device_limits SET session_count = session_count + 1, updated_at = NOW() WHERE id = v_limit.id;

  v_role := CASE WHEN v_active_count = 0 THEN 'caller' ELSE 'callee' END;

  INSERT INTO public.guest_sessions (room_id, room_code, device_hash, ip_hash, role, last_seen_at)
  VALUES (v_room.id, v_room.code, p_device_hash, p_ip_hash, v_role, NOW())
  RETURNING guest_sessions.id INTO v_session_id;

  SELECT MIN(gs.started_at) INTO v_first_started FROM public.guest_sessions gs WHERE gs.room_id = v_room.id AND gs.ended_at IS NULL;

  RETURN QUERY SELECT v_session_id, v_room.id, (v_room.code)::text, (v_role)::text, v_first_started;
END;
$$;

GRANT EXECUTE ON FUNCTION guest_check_and_start_session(TEXT, TEXT, TEXT) TO anon; 