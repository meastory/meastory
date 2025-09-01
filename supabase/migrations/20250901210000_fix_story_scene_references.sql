-- Fix story scene choice references by using scene_order instead of UUIDs

-- Update Space Journey scenes to use scene_order references
UPDATE story_scenes 
SET choices = '[{"label": "Land near the crystal spires", "next_scene_id": 2}, {"label": "Scan for hostile activity", "next_scene_id": 3}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Space Journey') 
  AND scene_order = 1;

UPDATE story_scenes 
SET choices = '[{"label": "Accept the artifact", "next_scene_id": 4}, {"label": "Ask about the price", "next_scene_id": 5}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Space Journey') 
  AND scene_order = 2;

UPDATE story_scenes 
SET choices = '[{"label": "Weather the storm in orbit", "next_scene_id": 6}, {"label": "Dive to investigate the ocean", "next_scene_id": 7}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Space Journey') 
  AND scene_order = 3;

-- Update Underwater Mystery scenes to use scene_order references
UPDATE story_scenes 
SET choices = '[{"label": "Try to open the door", "next_scene_id": 2}, {"label": "Search for an alternate entrance", "next_scene_id": 3}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Underwater Mystery') 
  AND scene_order = 1;

UPDATE story_scenes 
SET choices = '[{"label": "An artichoke", "next_scene_id": 4}, {"label": "A clock", "next_scene_id": 5}, {"label": "Love", "next_scene_id": 6}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Underwater Mystery') 
  AND scene_order = 2;

UPDATE story_scenes 
SET choices = '[{"label": "Follow the fish", "next_scene_id": 7}, {"label": "Investigate the humming", "next_scene_id": 8}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'Underwater Mystery') 
  AND scene_order = 3;

-- Update Dragon Adventure scenes to use scene_order references
UPDATE story_scenes 
SET choices = '[{"label": "Accept the quest", "next_scene_id": 2}, {"label": "Ask for more information", "next_scene_id": 3}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'The Dragon Adventure') 
  AND scene_order = 1;

UPDATE story_scenes 
SET choices = '[{"label": "Take the high mountain path", "next_scene_id": 4}, {"label": "Follow the river valley", "next_scene_id": 5}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'The Dragon Adventure') 
  AND scene_order = 2;

UPDATE story_scenes 
SET choices = '[{"label": "Yes, I''m ready", "next_scene_id": 2}, {"label": "I need to prepare first", "next_scene_id": 6}]'::jsonb
WHERE story_id = (SELECT id FROM stories WHERE title = 'The Dragon Adventure') 
  AND scene_order = 3;
