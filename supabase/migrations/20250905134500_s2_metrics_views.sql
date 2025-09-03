-- S2: Create views for metrics dashboards

CREATE OR REPLACE VIEW public.v_weekly_connection_success AS
WITH attempts AS (
  SELECT session_id, MIN(ts) AS first_ts
  FROM public.connection_events
  WHERE event_type = 'connect_start'
  GROUP BY session_id
),
success AS (
  SELECT session_id, MIN(ts) AS connected_ts
  FROM public.connection_events
  WHERE event_type = 'connected'
  GROUP BY session_id
)
SELECT date_trunc('week', a.first_ts) AS week,
       COUNT(*) AS attempts,
       COUNT(s.session_id) AS successes,
       ROUND(100.0 * COUNT(s.session_id) / NULLIF(COUNT(*),0), 1) AS success_rate_pct
FROM attempts a
LEFT JOIN success s USING (session_id)
GROUP BY 1
ORDER BY 1 DESC;

CREATE OR REPLACE VIEW public.v_daily_invites AS
SELECT date_trunc('day', started_at) AS day,
       COUNT(*) AS sessions_started
FROM public.guest_sessions
GROUP BY 1
ORDER BY 1 DESC;

GRANT SELECT ON public.v_weekly_connection_success TO anon;
GRANT SELECT ON public.v_daily_invites TO anon; 