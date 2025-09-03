-- S2: Grant enum type usage to anon (safe default)
DO $$ BEGIN
  PERFORM 1 FROM pg_type WHERE typname = 'connection_event_type';
  IF FOUND THEN
    GRANT USAGE ON TYPE connection_event_type TO anon;
  END IF;
END $$; 