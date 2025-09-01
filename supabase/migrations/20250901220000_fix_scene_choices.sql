-- Fix story scene choices to reference only existing scenes

-- Space Journey: Only has scenes 1, 2, 3
-- Update choices to loop back to existing scenes or end story
UPDATE story_scenes 
SET choices = '[{"label": "Land near the crystal spires", "next_scene_id": 2}, {"label": "Scan for hostile activity", "next_scene_id": 3}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Space Journey') 
  AND scene_order = 1;

UPDATE story_scenes 
SET choices = '[{"label": "Accept the artifact", "next_scene_id": 1}, {"label": "Ask about the price", "next_scene_id": 3}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Space Journey') 
  AND scene_order = 2;

-- Scene 3 has no choices (ends the story)
UPDATE story_scenes 
SET choices = '[]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Space Journey') 
  AND scene_order = 3;

-- Underwater Mystery: Only has scenes 1, 2, 3
UPDATE story_scenes 
SET choices = '[{"label": "Try to open the door", "next_scene_id": 2}, {"label": "Search for an alternate entrance", "next_scene_id": 3}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Underwater Mystery') 
  AND scene_order = 1;

UPDATE story_scenes 
SET choices = '[{"label": "An artichoke", "next_scene_id": 1}, {"label": "A clock", "next_scene_id": 3}, {"label": "Love", "next_scene_id": 1}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Underwater Mystery') 
  AND scene_order = 2;

-- Scene 3 has no choices (ends the story)
UPDATE story_scenes 
SET choices = '[]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Underwater Mystery') 
  AND scene_order = 3;

-- Dragon Adventure: Only has scenes 1, 2, 3
UPDATE story_scenes 
SET choices = '[{"label": "Accept the quest", "next_scene_id": 2}, {"label": "Ask for more information", "next_scene_id": 3}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'The Dragon Adventure') 
  AND scene_order = 1;

UPDATE story_scenes 
SET choices = '[{"label": "Take the high mountain path", "next_scene_id": 3}, {"label": "Follow the river valley", "next_scene_id": 1}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'The Dragon Adventure') 
  AND scene_order = 2;

UPDATE story_scenes 
SET choices = '[{"label": "Yes, I''m ready", "next_scene_id": 2}, {"label": "I need to prepare first", "next_scene_id": 1}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'The Dragon Adventure') 
  AND scene_order = 3;
