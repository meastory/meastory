-- Ensure start_room_session determines tier from user when available and upgrades room tier
-- Also make function SECURITY DEFINER to bypass RLS for internal lookups

BEGIN;

-- Drop existing function (any text-typed signature) to avoid overload conflicts
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'start_room_session'
      AND pg_get_function_identity_arguments(p.oid) = 'p_room_code text, p_user_id text, p_device_hash text, p_ip_hash text'
  ) THEN
    DROP FUNCTION public.start_room_session(p_room_code text, p_user_id text, p_device_hash text, p_ip_hash text);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.start_room_session(
  p_room_code text,
  p_user_id text DEFAULT NULL,
  p_device_hash text DEFAULT NULL,
  p_ip_hash text DEFAULT NULL
)
RETURNS TABLE (
  session_id uuid,
  room_id uuid,
  tier text,
  started_at timestamptz,
  duration_ms bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id uuid;
  v_room_tier text;
  v_user_tier text;
  v_eff_tier text;
  v_started_at timestamptz := now();
  v_duration_minutes int;
  v_duration_ms bigint;
  v_max_participants int;
BEGIN
  SELECT r.id, r.tier INTO v_room_id, v_room_tier
  FROM public.rooms r
  WHERE r.code = upper(p_room_code)
  LIMIT 1;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'room_not_found' USING HINT = 'Invalid room code';
  END IF;

  -- Look up user tier if provided
  IF p_user_id IS NOT NULL THEN
    SELECT up.tier INTO v_user_tier
    FROM public.user_profiles up
    WHERE up.id::text = p_user_id
    LIMIT 1;
  END IF;

  -- Compute effective tier by rank
  WITH ranks AS (
    SELECT key, rank FROM public.tiers WHERE key IN (coalesce(v_user_tier, 'guest'), coalesce(v_room_tier, 'guest'))
  )
  SELECT key INTO v_eff_tier
  FROM ranks
  ORDER BY rank DESC
  LIMIT 1;

  IF v_eff_tier IS NULL THEN
    v_eff_tier := coalesce(v_user_tier, coalesce(v_room_tier, 'guest'));
  END IF;

  -- Duration and max participants from tiers table
  SELECT t.duration_minutes, coalesce(t.max_participants, 2) INTO v_duration_minutes, v_max_participants
  FROM public.tiers t
  WHERE t.key = v_eff_tier
  LIMIT 1;

  IF v_duration_minutes IS NULL THEN
    v_duration_ms := NULL; -- unlimited
  ELSE
    v_duration_ms := (v_duration_minutes::bigint) * 60000;
  END IF;

  -- Insert session
  INSERT INTO public.room_sessions (room_id, user_id, device_hash, ip_hash, tier, started_at)
  VALUES (v_room_id, NULLIF(p_user_id, '')::uuid, NULLIF(p_device_hash, ''), NULLIF(p_ip_hash, ''), v_eff_tier, v_started_at)
  RETURNING id, started_at, tier INTO session_id, started_at, tier;

  -- Upgrade room tier and max participants if needed
  UPDATE public.rooms r
  SET tier = v_eff_tier,
      max_participants = v_max_participants
  WHERE r.id = v_room_id
    AND (
      r.tier IS DISTINCT FROM v_eff_tier OR
      r.max_participants IS DISTINCT FROM v_max_participants
    );

  -- Return payload
  room_id := v_room_id;
  duration_ms := v_duration_ms;
  RETURN;
END $$;

COMMIT;


