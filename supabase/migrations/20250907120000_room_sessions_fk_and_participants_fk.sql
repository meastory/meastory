-- Point connection_events.session_id FK to room_sessions, and add FK from room_participants.user_id to user_profiles.id

BEGIN;

-- 1) Update FK for connection_events -> room_sessions (NOT VALID to avoid legacy data conflict)
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

ALTER TABLE public.connection_events
  ADD CONSTRAINT connection_events_session_id_fkey
  FOREIGN KEY (session_id)
  REFERENCES public.room_sessions(id)
  ON UPDATE CASCADE ON DELETE CASCADE
  NOT VALID;

-- 2) Add FK for room_participants.user_id -> user_profiles.id if missing
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


