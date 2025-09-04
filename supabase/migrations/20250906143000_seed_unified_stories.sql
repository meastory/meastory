-- Seed unified JSON stories into stories.content with access tiers

BEGIN;

-- Helper: upsert by slug
CREATE OR REPLACE FUNCTION public.upsert_story(
  p_slug TEXT,
  p_title TEXT,
  p_description TEXT,
  p_status story_status,
  p_access_tier TEXT,
  p_content JSONB
) RETURNS UUID AS $$
DECLARE sid UUID; BEGIN
  INSERT INTO stories (slug, title, description, status, access_tier, content)
  VALUES (p_slug, p_title, p_description, p_status, p_access_tier, p_content)
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    access_tier = EXCLUDED.access_tier,
    content = EXCLUDED.content
  RETURNING id INTO sid;
  RETURN sid;
END; $$ LANGUAGE plpgsql;

-- three-little-pigs (guest)
SELECT public.upsert_story(
  'three-little-pigs',
  'The Three Little Pigs',
  '',
  'published',
  'guest',
  '{}'::jsonb
);

-- the-three-bears (guest)
SELECT public.upsert_story('the-three-bears', 'The Three Bears and {{childName}}''s Forest Adventure', '', 'published', 'guest', '{}'::jsonb);

-- little-red-riding-hood (free)
SELECT public.upsert_story('little-red-riding-hood', '{{childName}} and the Path to Granny''s House', '', 'published', 'free', '{}'::jsonb);

-- bramble-storm (free)
SELECT public.upsert_story('bramble-storm', 'Bramble Bear and the Coming Storm', '', 'published', 'free', '{}'::jsonb);

-- bramble-lost-little-one (free)
SELECT public.upsert_story('bramble-lost-little-one', 'Bramble Bear and the Lost Little One', '', 'published', 'free', '{}'::jsonb);

-- bramble-friendship-muddle (paid)
SELECT public.upsert_story('bramble-friendship-muddle', 'Bramble Bear and the Friendship Muddle', '', 'published', 'paid', '{}'::jsonb);

-- Replace placeholders with actual file contents
-- NOTE: The CLI deployment environment may not have file access; consider seeding via API scripts if needed.

COMMIT; 