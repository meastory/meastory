# Seeds and Smoke Tests

## Seed: 3 Curated Stories
Use Supabase SQL editor or migration to insert three curated guest stories:

```sql
insert into stories (id, title, description, status, tier)
values
  (gen_random_uuid(), 'The Magic Castle', 'Adventure with simple choices', 'published', 'guest'),
  (gen_random_uuid(), 'The Little Red Hen', 'Comfort bedtime story', 'published', 'guest'),
  (gen_random_uuid(), 'The Tortoise and the Hare', 'Growth mindset classic', 'published', 'guest');
```

Mark their first scenes in `story_scenes` with `scene_order = 1` and valid choices.

## Smoke Test: Local Two-Tab Connect
```bash
# Terminal A
cd apps/read
npm run dev | cat
# Open http://localhost:5173/start and create a room
# Copy invite link

# Terminal B / Incognito
# Visit the invite link and join
# Verify: presence updates, media preflight, connection success, can make a story choice.
``` 