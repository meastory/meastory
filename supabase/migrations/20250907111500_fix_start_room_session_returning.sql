-- Qualify RETURNING columns to avoid ambiguous started_at reference

BEGIN;

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
  v_session_id uuid;
  v_started_at timestamptz;
BEGIN
  SELECT id INTO r FROM public.rooms WHERE code = upper(p_room_code) LIMIT 1;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'room_not_found';
  END IF;

  eff_tier := public.room_effective_tier(r.id);
  SELECT duration_minutes INTO dur_minutes FROM public.tiers WHERE key = eff_tier;
  dur_ms := CASE WHEN dur_minutes IS NULL THEN NULL ELSE (dur_minutes::bigint * 60000) END;

  INSERT INTO public.room_sessions(room_id, user_id, device_hash, ip_hash, tier, ends_at)
  VALUES (
    r.id,
    p_user_id,
    p_device_hash,
    p_ip_hash,
    eff_tier,
    CASE WHEN dur_minutes IS NULL THEN NULL ELSE now() + make_interval(mins => dur_minutes) END
  )
  RETURNING public.room_sessions.id, public.room_sessions.started_at INTO v_session_id, v_started_at;

  session_id := v_session_id;
  room_id := r.id;
  tier := eff_tier;
  started_at := v_started_at;
  duration_ms := dur_ms;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;


