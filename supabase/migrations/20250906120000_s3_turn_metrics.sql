-- Sprint 3: TURN minimization metrics and event types

-- Extend enum with new event types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'connection_event_type' AND e.enumlabel = 'selected_candidate_pair'
  ) THEN
    ALTER TYPE connection_event_type ADD VALUE IF NOT EXISTS 'selected_candidate_pair';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'connection_event_type' AND e.enumlabel = 'audio_only_enabled'
  ) THEN
    ALTER TYPE connection_event_type ADD VALUE IF NOT EXISTS 'audio_only_enabled';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'connection_event_type' AND e.enumlabel = 'audio_only_restored'
  ) THEN
    ALTER TYPE connection_event_type ADD VALUE IF NOT EXISTS 'audio_only_restored';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'connection_event_type' AND e.enumlabel = 'reconnected'
  ) THEN
    ALTER TYPE connection_event_type ADD VALUE IF NOT EXISTS 'reconnected';
  END IF;
END $$;

-- View: weekly relay rate (first selected pair per session), with breakdowns
CREATE OR REPLACE VIEW public.v_weekly_relay_rate AS
WITH first_pair AS (
  SELECT DISTINCT ON (session_id)
         session_id,
         ts,
         (detail->>'via') AS via
  FROM public.connection_events
  WHERE event_type::text = 'selected_candidate_pair'
  ORDER BY session_id, ts ASC
),
ua AS (
  SELECT DISTINCT ON (session_id)
         session_id,
         (detail->>'browser') AS browser,
         (detail->>'browser_version') AS browser_version,
         (detail->>'os') AS os,
         (detail->>'device_class') AS device_class,
         (detail->>'network_type') AS network_type
  FROM public.connection_events
  WHERE event_type::text = 'connect_start'
  ORDER BY session_id, ts ASC
)
SELECT
  date_trunc('week', fp.ts) AS week,
  COALESCE(ua.browser, 'unknown') AS browser,
  COALESCE(ua.browser_version, 'unknown') AS browser_version,
  COALESCE(ua.os, 'unknown') AS os,
  COALESCE(ua.device_class, 'unknown') AS device_class,
  COALESCE(ua.network_type, 'unknown') AS network_type,
  COUNT(*) AS sessions,
  SUM(CASE WHEN fp.via = 'relay' THEN 1 ELSE 0 END) AS relay_firsts,
  ROUND(100.0 * SUM(CASE WHEN fp.via = 'relay' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS relay_rate_pct
FROM first_pair fp
LEFT JOIN ua USING (session_id)
GROUP BY 1,2,3,4,5,6
ORDER BY 1 DESC;

-- View: median time from connected -> audio_only_enabled, with breakdowns
CREATE OR REPLACE VIEW public.v_time_to_audio_only_ms AS
WITH connected AS (
  SELECT session_id, MIN(ts) AS ts
  FROM public.connection_events
  WHERE event_type::text = 'connected'
  GROUP BY session_id
),
first_audio_only AS (
  SELECT DISTINCT ON (session_id) session_id, ts
  FROM public.connection_events
  WHERE event_type::text = 'audio_only_enabled'
  ORDER BY session_id, ts ASC
),
ua AS (
  SELECT DISTINCT ON (session_id)
         session_id,
         (detail->>'browser') AS browser,
         (detail->>'browser_version') AS browser_version,
         (detail->>'os') AS os,
         (detail->>'device_class') AS device_class,
         (detail->>'network_type') AS network_type
  FROM public.connection_events
  WHERE event_type::text = 'connect_start'
  ORDER BY session_id, ts ASC
)
SELECT
  date_trunc('week', c.ts) AS week,
  COALESCE(ua.browser, 'unknown') AS browser,
  COALESCE(ua.browser_version, 'unknown') AS browser_version,
  COALESCE(ua.os, 'unknown') AS os,
  COALESCE(ua.device_class, 'unknown') AS device_class,
  COALESCE(ua.network_type, 'unknown') AS network_type,
  PERCENTILE_DISC(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (ao.ts - c.ts)) * 1000.0
  ) AS median_time_to_audio_only_ms
FROM connected c
JOIN first_audio_only ao USING (session_id)
LEFT JOIN ua USING (session_id)
GROUP BY 1,2,3,4,5,6
ORDER BY 1 DESC;

GRANT SELECT ON public.v_weekly_relay_rate TO anon;
GRANT SELECT ON public.v_time_to_audio_only_ms TO anon; 