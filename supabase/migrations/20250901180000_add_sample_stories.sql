-- Add sample stories for testing the story library

INSERT INTO stories (title, description, status, author_id) VALUES
('The Dragon Adventure', 'Embark on an epic journey with a young dragon rider through enchanted forests and ancient ruins. Make choices that determine your fate and discover hidden treasures along the way.', 'published', NULL),
('Space Journey', 'Blast off into the cosmos as a space explorer. Visit distant planets, encounter alien civilizations, and make critical decisions that could save or doom entire worlds.', 'published', NULL),
('Underwater Mystery', 'Dive deep into the ocean depths to solve the mystery of the lost Atlantis. Navigate treacherous currents, befriend sea creatures, and uncover ancient secrets.', 'published', NULL);

-- Add story scenes for The Dragon Adventure
INSERT INTO story_scenes (story_id, scene_order, title, content, choices) VALUES
(
  (SELECT id FROM stories WHERE title = 'The Dragon Adventure'),
  1,
  'The Call to Adventure',
  'You stand at the edge of the Dragon Cliffs, your loyal dragon companion beside you. The morning sun casts golden rays across the misty valley below. Your village elder approaches with urgent news: "A dark force threatens our lands. Will you accept this quest to save our people?"',
  '[{"label": "Accept the quest", "next_scene_id": 2}, {"label": "Ask for more information", "next_scene_id": 3}]'
),
(
  (SELECT id FROM stories WHERE title = 'The Dragon Adventure'),
  2,
  'The Journey Begins',
  'The elder nods solemnly. "You are brave indeed. Your dragon will carry you to the Enchanted Forest where the dark sorcerer''s tower stands. Choose your path wisely through the forest."',
  '[{"label": "Take the high mountain path", "next_scene_id": 4}, {"label": "Follow the river valley", "next_scene_id": 5}]'
),
(
  (SELECT id FROM stories WHERE title = 'The Dragon Adventure'),
  3,
  'Seeking Wisdom',
  '"The sorcerer has unleashed shadow creatures that drain the life from our lands. Our scouts have found his tower in the Enchanted Forest. Will you go now?"',
  '[{"label": "Yes, I''m ready", "next_scene_id": 2}, {"label": "I need to prepare first", "next_scene_id": 6}]'
);

-- Add story scenes for Space Journey
INSERT INTO story_scenes (story_id, scene_order, title, content, choices) VALUES
(
  (SELECT id FROM stories WHERE title = 'Space Journey'),
  1,
  'Arrival at Planet Zorath',
  'Your starship "Odyssey" emerges from hyperspace near Planet Zorath. The planet''s surface is a swirling mix of purple oceans and crystal spires. Your mission scanner detects multiple lifeforms and an ancient alien artifact. What''s your first move?',
  '[{"label": "Land near the crystal spires", "next_scene_id": 2}, {"label": "Scan for hostile activity", "next_scene_id": 3}]'
),
(
  (SELECT id FROM stories WHERE title = 'Space Journey'),
  2,
  'The Crystal Beings',
  'As you land, a delegation of crystal beings emerges from the spires. Their leader speaks telepathically: "Welcome, traveler. The artifact you seek holds great power. But it comes with a terrible price. Do you still want it?"',
  '[{"label": "Accept the artifact", "next_scene_id": 4}, {"label": "Ask about the price", "next_scene_id": 5}]'
),
(
  (SELECT id FROM stories WHERE title = 'Space Journey'),
  3,
  'The Ocean Depths',
  'Your scanners detect no immediate threats, but there are unusual energy signatures coming from beneath the ocean surface. Suddenly, your ship''s AI warns of an approaching storm.',
  '[{"label": "Weather the storm in orbit", "next_scene_id": 6}, {"label": "Dive to investigate the ocean", "next_scene_id": 7}]'
);

-- Add story scenes for Underwater Mystery
INSERT INTO story_scenes (story_id, scene_order, title, content, choices) VALUES
(
  (SELECT id FROM stories WHERE title = 'Underwater Mystery'),
  1,
  'Into the Deep',
  'Your submersible "Deep Explorer" descends into the Mariana Trench. The pressure gauge reads 1,000 atmospheres, and your lights illuminate a landscape of bioluminescent creatures and ancient ruins. A massive stone door blocks your path forward.',
  '[{"label": "Try to open the door", "next_scene_id": 2}, {"label": "Search for an alternate entrance", "next_scene_id": 3}]'
),
(
  (SELECT id FROM stories WHERE title = 'Underwater Mystery'),
  2,
  'The Guardian''s Riddle',
  'As you approach the door, ancient runes begin to glow. A holographic guardian appears: "Only those pure of heart may enter Atlantis. Answer my riddle: What has a heart that doesn''t beat?"',
  '[{"label": "An artichoke", "next_scene_id": 4}, {"label": "A clock", "next_scene_id": 5}, {"label": "Love", "next_scene_id": 6}]'
),
(
  (SELECT id FROM stories WHERE title = 'Underwater Mystery'),
  3,
  'The Coral Maze',
  'You discover a network of underwater tunnels. Strange glowing fish lead you through a maze of coral formations. You hear a distant humming sound getting louder.',
  '[{"label": "Follow the fish", "next_scene_id": 7}, {"label": "Investigate the humming", "next_scene_id": 8}]'
);
