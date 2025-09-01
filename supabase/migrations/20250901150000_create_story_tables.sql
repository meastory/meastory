-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE story_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE room_status AS ENUM ('waiting', 'active', 'ended');
CREATE TYPE participant_role AS ENUM ('host', 'participant');

-- Stories table
CREATE TABLE stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status story_status DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Story scenes/content
CREATE TABLE story_scenes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  scene_order INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  choices JSONB DEFAULT '[]'::jsonb, -- Array of choice objects
  background_image_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(story_id, scene_order)
);

-- Rooms for video calls
CREATE TABLE rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL, -- Short room code for easy joining
  name TEXT NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status room_status DEFAULT 'waiting',
  max_participants INTEGER DEFAULT 10,
  settings JSONB DEFAULT '{}'::jsonb, -- Room settings (audio/video preferences, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Room participants
CREATE TABLE room_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL, -- Display name (for anonymous participants)
  role participant_role DEFAULT 'participant',
  is_connected BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(room_id, user_id)
);

-- Current room state/progress
CREATE TABLE room_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  current_scene_id UUID REFERENCES story_scenes(id) ON DELETE SET NULL,
  progress_data JSONB DEFAULT '{}'::jsonb, -- Store current story state, choices made, etc.
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(room_id)
);

-- User profiles (extends auth.users)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_stories_author_id ON stories(author_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_story_scenes_story_id ON story_scenes(story_id);
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_host_id ON rooms(host_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_room_participants_room_id ON room_participants(room_id);
CREATE INDEX idx_room_participants_user_id ON room_participants(user_id);
CREATE INDEX idx_room_progress_room_id ON room_progress(room_id);

-- Row Level Security (RLS) policies

-- Stories: Users can read published stories, authors can manage their own
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public stories are viewable by everyone" ON stories
  FOR SELECT USING (status = 'published');

CREATE POLICY "Users can insert their own stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own stories" ON stories
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own stories" ON stories
  FOR DELETE USING (auth.uid() = author_id);

-- Story scenes: Follow story permissions
ALTER TABLE story_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story scenes are viewable with story" ON story_scenes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_scenes.story_id
      AND (stories.status = 'published' OR stories.author_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage scenes for their stories" ON story_scenes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_scenes.story_id
      AND stories.author_id = auth.uid()
    )
  );

-- Rooms: Host can manage, participants can view
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rooms they're participating in" ON rooms
  FOR SELECT USING (
    auth.uid() = host_id OR
    EXISTS (
      SELECT 1 FROM room_participants
      WHERE room_participants.room_id = rooms.id
      AND room_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create rooms" ON rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Room hosts can update their rooms" ON rooms
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Room hosts can delete their rooms" ON rooms
  FOR DELETE USING (auth.uid() = host_id);

-- Room participants: Room members can view, hosts can manage
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room participants can view participant list" ON room_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_participants.room_id
      AND (rooms.host_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM room_participants rp
             WHERE rp.room_id = rooms.id
             AND rp.user_id = auth.uid()
           ))
    )
  );

CREATE POLICY "Room hosts can manage participants" ON room_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_participants.room_id
      AND rooms.host_id = auth.uid()
    )
  );

-- Room progress: Room participants can view and update
ALTER TABLE room_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room participants can view progress" ON room_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_progress.room_id
      AND (rooms.host_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM room_participants
             WHERE room_participants.room_id = rooms.id
             AND room_participants.user_id = auth.uid()
           ))
    )
  );

CREATE POLICY "Room hosts can update progress" ON room_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = room_progress.room_id
      AND rooms.host_id = auth.uid()
    )
  );

-- User profiles: Users can manage their own profile
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- Functions for room code generation
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 6-character alphanumeric code
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Check if this code already exists
    SELECT EXISTS(
      SELECT 1 FROM rooms WHERE rooms.code = code
    ) INTO exists_already;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_already;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_scenes_updated_at BEFORE UPDATE ON story_scenes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_progress_updated_at BEFORE UPDATE ON room_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
