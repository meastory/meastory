-- Allow anonymous users to select guest rooms (needed for join by code)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rooms' AND policyname = 'anon_select_guest_rooms'
  ) THEN
    CREATE POLICY anon_select_guest_rooms
      ON public.rooms
      FOR SELECT
      TO anon
      USING (tier = 'guest');
  END IF;
END $$; 