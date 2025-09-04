-- Unified story JSON content, access tiers, and updated RLS
-- Safe to run multiple times due to IF EXISTS checks

BEGIN;

-- 1) Add new columns to stories
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS story_type TEXT,
  ADD COLUMN IF NOT EXISTS access_tier TEXT,
  ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS age_min INTEGER,
  ADD COLUMN IF NOT EXISTS age_max INTEGER,
  ADD COLUMN IF NOT EXISTS themes TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS personalization_tokens TEXT[] DEFAULT '{}'::text[];

-- 2) Create tiers lookup and seed
CREATE TABLE IF NOT EXISTS tiers (
  key TEXT PRIMARY KEY,
  rank INTEGER NOT NULL
);

-- Seed base tiers if table empty or missing keys
INSERT INTO tiers (key, rank)
  VALUES ('guest', 0), ('free', 1), ('paid', 2), ('enterprise', 3)
ON CONFLICT (key) DO NOTHING;

-- 3) Helper functions for effective tier resolution and ranking
CREATE OR REPLACE FUNCTION public.effective_tier()
RETURNS TEXT AS $$
DECLARE
  claims JSONB;
  t TEXT;
BEGIN
  BEGIN
    claims := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN others THEN
    claims := NULL;
  END;

  IF claims ? 'app' AND (claims->'app') ? 'tier' THEN
    t := (claims->'app'->>'tier');
  ELSIF claims ? 'app.tier' THEN
    t := (claims->>'app.tier');
  ELSE
    t := 'guest';
  END IF;

  RETURN t;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.tier_rank(t TEXT)
RETURNS INTEGER AS $$
DECLARE r INTEGER; BEGIN
  SELECT rank INTO r FROM tiers WHERE key = t;
  RETURN COALESCE(r, 0);
END; $$ LANGUAGE plpgsql STABLE;

-- 4) Backfill defaults
UPDATE stories SET access_tier = 'guest' WHERE access_tier IS NULL;

-- Compute slug from title if missing
UPDATE stories SET slug = TRIM(BOTH '-' FROM regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL AND title IS NOT NULL;

-- Infer story_type from presence of {{childName}} in any scene content; default to 'original'
WITH story_flags AS (
  SELECT s.id AS story_id,
         CASE WHEN EXISTS (
           SELECT 1 FROM story_scenes sc WHERE sc.story_id = s.id AND sc.content ILIKE '%{{childName}}%'
         ) THEN 'personalized' ELSE 'original' END AS inferred_type
  FROM stories s
)
UPDATE stories AS s
SET story_type = sf.inferred_type
FROM story_flags sf
WHERE s.id = sf.story_id AND s.story_type IS NULL;

-- 5) Enforce uniqueness on slug (if available)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_stories_slug'
  ) THEN
    CREATE UNIQUE INDEX uniq_stories_slug ON stories(slug);
  END IF;
END $$;

-- (Optional) Make slug NOT NULL if all rows have slug populated
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM stories WHERE slug IS NULL
  ) THEN
    ALTER TABLE stories ALTER COLUMN slug SET NOT NULL;
  END IF;
END $$;

-- 6) Update RLS: restrict published visibility by access tier rank
-- Drop old public select policy if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stories' AND policyname = 'Public stories are viewable by everyone'
  ) THEN
    DROP POLICY "Public stories are viewable by everyone" ON stories;
  END IF;
END $$;

-- Create/replace tier-aware public select policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stories' AND policyname = 'Published stories visible within access tier'
  ) THEN
    CREATE POLICY "Published stories visible within access tier" ON stories
      FOR SELECT USING (
        status = 'published'
        AND public.tier_rank(COALESCE(access_tier, 'guest')) <= public.tier_rank(public.effective_tier())
      );
  END IF;
END $$;

-- Keep author manage policies as-is (insert/update/delete)

COMMIT; 