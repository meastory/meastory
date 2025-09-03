-- Sprint 2: Guest limits (participants, daily usage), sessions, and connection metrics
-- Idempotent-ish creation with IF NOT EXISTS where possible

-- Types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_event_type') THEN
    CREATE TYPE connection_event_type AS ENUM (
      'connect_start',
      'connected',
      'retry',
      'ice_failed',
      'ended'
    );
  END IF;
END $$;

-- Tables
-- Track daily session counts per device/IP to enforce 3/day
CREATE TABLE IF NOT EXISTS device_limits (
  id BIGSERIAL PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  device_hash TEXT NOT NULL,
  day DATE NOT NULL,
  session_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ip_hash, device_hash, day)
);

-- Guest sessions (anonymous/guest rooms)
CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  device_hash TEXT NOT NULL,
  ip_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('caller','callee')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_room ON guest_sessions(room_id) ;
CREATE INDEX IF NOT EXISTS idx_guest_sessions_active ON guest_sessions(room_id, ended_at) ;

-- Connection metrics
CREATE TABLE IF NOT EXISTS connection_events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL,
  client_id TEXT,
  event_type connection_event_type NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_conn_events_room_ts ON connection_events(room_code, ts);
CREATE INDEX IF NOT EXISTS idx_conn_events_session_ts ON connection_events(session_id, ts);

-- Enable RLS (functions will be SECURITY DEFINER)
ALTER TABLE device_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_events ENABLE ROW LEVEL SECURITY;

-- RPCs
-- Atomically enforce: guest room, <=2 active participants, 3/day limit per (ip_hash, device_hash)
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
  -- Load guest room by code
  SELECT id, code, tier, status
  INTO v_room
  FROM rooms
  WHERE code = UPPER(p_room_code)
  LIMIT 1;

  IF v_room.id IS NULL THEN
    RAISE EXCEPTION 'room_not_found';
  END IF;
  IF v_room.tier IS DISTINCT FROM 'guest' THEN
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

-- RPC to log connection events
CREATE OR REPLACE FUNCTION rpc_log_connection_event(
  p_session_id UUID,
  p_room_code TEXT,
  p_client_id TEXT,
  p_event_type connection_event_type,
  p_detail JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO connection_events(session_id, room_code, client_id, event_type, detail)
  VALUES (p_session_id, UPPER(p_room_code), p_client_id, p_event_type, COALESCE(p_detail, '{}'::jsonb));
$$;

GRANT EXECUTE ON FUNCTION rpc_log_connection_event(UUID, TEXT, TEXT, connection_event_type, JSONB) TO anon; 

-- RPC to end a guest session (mark ended_at)
CREATE OR REPLACE FUNCTION rpc_end_guest_session(p_session_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE guest_sessions SET ended_at = NOW() WHERE id = p_session_id AND ended_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION rpc_end_guest_session(UUID) TO anon; 