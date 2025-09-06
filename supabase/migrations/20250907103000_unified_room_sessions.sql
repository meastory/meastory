-- Unified room sessions: start, heartbeat, end

BEGIN;

-- Helper: get tier rank
CREATE OR REPLACE FUNCTION public.tier_rank(t TEXT)
RETURNS INTEGER AS $$
DECLARE r INTEGER; BEGIN
  SELECT rank INTO r FROM public.tiers WHERE key = t;
  RETURN COALESCE(r, 0);
END; $$ LANGUAGE plpgsql STABLE;

-- Determine effective room tier given a room id
CREATE OR REPLACE FUNCTION public.room_effective_tier(p_room_id uuid)
RETURNS TEXT AS $$
DECLARE
  highest_rank INTEGER := 0;
  highest_key TEXT := 'guest';
BEGIN
  -- Check participants with user_id
  FOR highest_key, highest_rank IN
    SELECT t.key, t.rank
    FROM public.room_participants rp
    JOIN public.user_profiles up ON up.id = rp.user_id
    JOIN public.tiers t ON t.key = COALESCE(up.tier, 'free')
    WHERE rp.room_id = p_room_id
    ORDER BY t.rank DESC
    LIMIT 1
  LOOP
    RETURN highest_key;
  END LOOP;

  -- No authenticated participants → guest
  RETURN 'guest';
END; $$ LANGUAGE plpgsql STABLE;

-- Sessions table
CREATE TABLE IF NOT EXISTS public.room_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  user_id uuid,
  device_hash text,
  ip_hash text,
  tier text NOT NULL,
  CONSTRAINT room_sessions_tier_fkey FOREIGN KEY (tier) REFERENCES public.tiers(key) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Start session RPC
CREATE OR REPLACE FUNCTION public.start_room_session(
  p_room_code text,
  p_user_id uuid DEFAULT NULL,
  p_device_hash text DEFAULT NULL,
  p_ip_hash text DEFAULT NULL
)
RETURNS TABLE(session_id uuid, room_id uuid, tier text, started_at timestamptz, duration_ms bigint) AS $$
DECLARE
  r record;
  eff_tier text;
  dur_minutes integer;
  dur_ms bigint;
BEGIN
  SELECT id INTO r FROM public.rooms WHERE code = upper(p_room_code) LIMIT 1;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'room_not_found';
  END IF;

  eff_tier := public.room_effective_tier(r.id);
  SELECT duration_minutes INTO dur_minutes FROM public.tiers WHERE key = eff_tier;
  dur_ms := CASE WHEN dur_minutes IS NULL THEN NULL ELSE (dur_minutes::bigint * 60000) END;

  INSERT INTO public.room_sessions(room_id, user_id, device_hash, ip_hash, tier, ends_at)
  VALUES (r.id, p_user_id, p_device_hash, p_ip_hash, eff_tier,
          CASE WHEN dur_minutes IS NULL THEN NULL ELSE now() + make_interval(mins => dur_minutes) END)
  RETURNING id, started_at INTO session_id, started_at;

  room_id := r.id;
  tier := eff_tier;
  duration_ms := dur_ms;
  RETURN NEXT;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Heartbeat RPC
CREATE OR REPLACE FUNCTION public.heartbeat_room_session(p_session_id uuid)
RETURNS void AS $$
BEGIN
  -- No-op for now; can update last_seen or extend soft expiry if needed
  PERFORM 1;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- End session RPC
CREATE OR REPLACE FUNCTION public.end_room_session(p_session_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM public.room_sessions WHERE id = p_session_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;


