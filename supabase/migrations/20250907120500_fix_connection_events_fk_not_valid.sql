-- Re-add FK for connection_events.session_id -> room_sessions(id) as NOT VALID to avoid legacy data conflicts
-- Ensure room_participants.user_id -> user_profiles(id) FK exists (NOT VALID)

BEGIN;

-- Drop any existing FK on connection_events.session_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'connection_events'
      AND tc.constraint_name = 'connection_events_session_id_fkey'
  ) THEN
    ALTER TABLE public.connection_events
      DROP CONSTRAINT connection_events_session_id_fkey;
  END IF;
END $$;

-- Add NOT VALID FK to room_sessions
ALTER TABLE public.connection_events
  ADD CONSTRAINT connection_events_session_id_fkey
  FOREIGN KEY (session_id)
  REFERENCES public.room_sessions(id)
  ON UPDATE CASCADE ON DELETE CASCADE
  NOT VALID;

-- Add (NOT VALID) FK for room_participants.user_id -> user_profiles.id if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'room_participants'
      AND tc.constraint_name = 'room_participants_user_id_fkey'
  ) THEN
    ALTER TABLE public.room_participants
      ADD CONSTRAINT room_participants_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
      ON UPDATE CASCADE ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

COMMIT;


