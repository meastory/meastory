# Feature Flags Registry

- `VITE_FEATURE_REALTIME_ONLY`: Use Supabase Realtime exclusively for signaling.
- `VITE_FEATURE_GUEST_FLOW`: Enable guest start/invite/join pages and flows.
- `VITE_FEATURE_AUDIO_FALLBACK`: Enable audio-only fallback and renegotiation.

Configure via `.env.local` for local dev and Netlify env vars for previews/prod. 