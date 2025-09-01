-- Fix the ambiguous column reference for room codes

-- First remove the default constraint that references the function
ALTER TABLE rooms ALTER COLUMN code DROP DEFAULT;

-- Drop existing trigger and function (now safe to drop)
DROP TRIGGER IF EXISTS generate_room_code_trigger ON rooms;
DROP FUNCTION IF EXISTS set_room_code();
DROP FUNCTION IF EXISTS generate_room_code();

-- Make code column nullable
ALTER TABLE rooms ALTER COLUMN code DROP NOT NULL;

-- Create the room code generation function with a different name to avoid ambiguity
CREATE OR REPLACE FUNCTION generate_unique_room_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN := TRUE;
BEGIN
  WHILE code_exists LOOP
    -- Generate a random 6-character alphanumeric code
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Check if this code already exists
    SELECT EXISTS(
      SELECT 1 FROM rooms WHERE rooms.code = new_code
    ) INTO code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to set code if not provided
CREATE OR REPLACE FUNCTION ensure_room_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate code if it's NULL
  IF NEW.code IS NULL THEN
    NEW.code := generate_unique_room_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER ensure_room_code_trigger
  BEFORE INSERT ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION ensure_room_code();

-- Update any existing rooms without codes (shouldn't be any, but just in case)
UPDATE rooms SET code = generate_unique_room_code() WHERE code IS NULL;
