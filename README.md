# Me A Story

Live, interactive storytelling over video calls for families.

### Status
- Production app now built with React + TypeScript + Vite in `apps/read`.
- Supabase is used for data, auth (minimal), Realtime signaling, RPCs, and Edge Functions.
- Guest flow (Start → Invite → Join) implemented with WebRTC video, story sync, and session limits.

### Quick Start (Development)
1) App
```bash
cd apps/read
npm install
cp .env.example .env
# Set Vite env vars (see below)
npm run dev
```

2) Supabase (local or hosted)
- Create a Supabase project and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `apps/read/.env`.
- Apply SQL migrations in `/supabase/migrations/` to your project.
- Deploy the Edge Function `supabase/functions/identify_device`.

### Environment Variables (Vite)
Set these in `apps/read/.env` or Netlify environment:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key (JWT)
- `VITE_TURN_SERVERS`: Optional JSON array of ICE servers. Example:
  `[ {"urls":"turn:TURN_HOST:3478","username":"user","credential":"pass"} ]`
- `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`: Alternative single TURN config
- `VITE_ICE_TURN_DELAY_MS`: Optional phased TURN delay (defaults sensible per browser)
- `VITE_TURN_AUDIO_ONLY_ON_RELAY`: `'true'|'false'` (default true) reduce to audio on relayed paths
- `VITE_ICE_PHASED_GATHERING`: `'true'|'false'` (default true) prefer STUN first then TURN

### What’s Implemented
- React SPA with routes: `/start`, `/invite/:code`, `/join`, `/join/:code`, auth pages, and app shell
- Supabase Realtime signaling channel per room code with presence-based host/guest role
- WebRTC Manager with perfect negotiation, queued ICE, reconnect/backoff, relay-aware bitrate policy
- DataChannel story sync for choices, story changes, and child name updates (with Realtime fallback)
- Tier-driven room sessions:
  - Unified `start_room_session` (enforces capacity and daily limits by tier)
  - `heartbeat_room_session`, `end_room_session`, and `rpc_log_connection_event`
  - Edge Function `identify_device` returns `ip_hash` and `device_hash`
- Minimal scene resume support (`rooms.current_story_id`/`current_scene_id`, host-only `rpc_update_room_scene`)
- Story library to select/change stories without dropping connections
- PWA manifest + install prompt, fullscreen controls, text scaling persistence

### Repo Layout (current)
```
meastory/
  apps/
    read/                 # React + TS + Vite production app
      public/
      src/
      netlify.toml
    mvp/read-old/         # Legacy static MVP (reference only)
  supabase/
    functions/identify_device/
    migrations/           # SQL for rooms, stories, guest_sessions, limits, RPCs
  docs/
    ARCHITECTURE.md
    WEBRTC_SIGNALING_ARCHITECTURE.md
    project-management/PROJECT_STATUS.md
  README.md
```

### Key Docs
- PRD: `docs/PRD.md`
- Architecture: `docs/ARCHITECTURE.md`
- UI Design System: `docs/UI_DESIGN_SYSTEM.md`
- WebRTC Signaling Architecture: `docs/WEBRTC_SIGNALING_ARCHITECTURE.md`
- LLM Story Generation Engine: `docs/LLM_STORY_GENERATION_ENGINE.md`
- Roadmap: `docs/ROADMAP.md`
- Safety/Privacy/Compliance: `docs/SAFETY_PRIVACY_COMPLIANCE.md`
- Testing & QA: `docs/TESTING_QA.md`

### Contributing
- Feature branches with focused PRs
- Deploy previews on Netlify for QA
- Follow safety/content guidelines for story contributions

### License
- TBA 