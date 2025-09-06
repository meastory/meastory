-- Drop the older overloaded start_room_session signature to resolve ambiguity
BEGIN;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'start_room_session'
      AND pg_get_function_identity_arguments(p.oid) = 'p_room_code text, p_user_id uuid, p_device_hash text, p_ip_hash text'
  ) THEN
    DROP FUNCTION public.start_room_session(p_room_code text, p_user_id uuid, p_device_hash text, p_ip_hash text);
  END IF;
END $$;

COMMIT;


