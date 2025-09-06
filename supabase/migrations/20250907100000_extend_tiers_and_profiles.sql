-- Extend tiers with policy fields and add user_profiles.tier FK
-- Safe to run multiple times via IF NOT EXISTS and ON CONFLICT

BEGIN;

-- 1) Extend tiers with policy columns
ALTER TABLE public.tiers
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS sessions_per_day INTEGER,
  ADD COLUMN IF NOT EXISTS max_participants INTEGER,
  ADD COLUMN IF NOT EXISTS show_timer_in_waiting BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS show_timer_in_menu BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS inroom_warning_threshold_minutes INTEGER;

-- 2) Ensure all base tiers exist (guest/free/paid/enterprise)
INSERT INTO public.tiers (key, rank)
VALUES ('guest', 0), ('free', 1), ('paid', 2), ('enterprise', 3)
ON CONFLICT (key) DO NOTHING;

-- 3) Seed/Update policy values per product spec
UPDATE public.tiers SET
  duration_minutes = 30,
  sessions_per_day = 3,
  max_participants = 2,
  show_timer_in_waiting = TRUE,
  show_timer_in_menu = TRUE,
  inroom_warning_threshold_minutes = 5
WHERE key = 'guest';

UPDATE public.tiers SET
  duration_minutes = 60,
  sessions_per_day = 5,
  max_participants = 2,
  show_timer_in_waiting = TRUE,
  show_timer_in_menu = TRUE,
  inroom_warning_threshold_minutes = 10
WHERE key = 'free';

UPDATE public.tiers SET
  duration_minutes = 180,
  sessions_per_day = NULL,
  max_participants = 6,
  show_timer_in_waiting = FALSE,
  show_timer_in_menu = TRUE,
  inroom_warning_threshold_minutes = 10
WHERE key = 'paid';

UPDATE public.tiers SET
  duration_minutes = NULL,
  sessions_per_day = NULL,
  max_participants = 10,
  show_timer_in_waiting = FALSE,
  show_timer_in_menu = FALSE,
  inroom_warning_threshold_minutes = NULL
WHERE key = 'enterprise';

-- 4) Add user tier reference to profiles; default new users to 'free'
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS tier TEXT;

-- Add FK if not present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'user_profiles'
      AND tc.constraint_name = 'user_profiles_tier_fkey'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_tier_fkey
      FOREIGN KEY (tier) REFERENCES public.tiers(key)
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Set column default to 'free' only if that tier exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.tiers WHERE key = 'free') THEN
    ALTER TABLE public.user_profiles ALTER COLUMN tier SET DEFAULT 'free';
  END IF;
END $$;

-- Backfill existing users to 'free' where NULL
UPDATE public.user_profiles SET tier = 'free' WHERE tier IS NULL;

COMMIT;


