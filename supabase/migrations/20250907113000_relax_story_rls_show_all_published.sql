-- Make all published stories selectable by anyone; handle access tiers client-side

BEGIN;

-- Drop tier-restricted policy if present
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'stories' AND policyname = 'Published stories visible within access tier'
  ) THEN
    DROP POLICY "Published stories visible within access tier" ON public.stories;
  END IF;
END $$;

-- Create permissive select policy for published stories
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'stories' AND policyname = 'Published stories visible to all'
  ) THEN
    CREATE POLICY "Published stories visible to all" ON public.stories
      FOR SELECT USING (status = 'published');
  END IF;
END $$;

COMMIT;


