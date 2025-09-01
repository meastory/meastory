-- Fix room schema to auto-generate codes
-- Make code optional for inserts and add default value

-- First, drop the existing constraint and function if they exist
DROP TRIGGER IF EXISTS generate_room_code_trigger ON rooms;
DROP FUNCTION IF EXISTS generate_room_code();

-- Create the room code generation function
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

-- Update the rooms table to use the function as default
ALTER TABLE rooms ALTER COLUMN code SET DEFAULT generate_room_code();

-- Create a trigger to generate code if not provided
CREATE OR REPLACE FUNCTION set_room_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := generate_room_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_room_code_trigger
  BEFORE INSERT ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION set_room_code();
