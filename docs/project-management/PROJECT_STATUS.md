# Project Status — Me A Story

## Current Phase: Sprint 3 — Guest Flow, Limits, and Metrics

### Overall Progress
- **Focus**: Ship a resilient guest storytelling flow with WebRTC + Supabase
- **Frontend**: React 18 + TypeScript + Vite app in `apps/read`
- **Backend**: Supabase (Postgres + Auth + Realtime + Edge Functions)
- **State**: Zustand stores for auth, room, UI, WebRTC

### Highlights (Completed)
- **Guest Flow**: `/start` → `/invite/:code` → `/join/:code`
- **Signaling**: Supabase Realtime channels per room code with presence-based host/guest role
- **WebRTC**: Perfect negotiation, ICE candidate queuing, phased TURN enable, reconnect/backoff
- **DataChannel Sync**: Story choices, story change, and child name propagate to peers; Realtime fallback
- **Stories**: Library to pick/change stories without dropping connections; end-of-story actions (Read Again / Open Library)
- **Persistence**: Minimal scene resume (`rooms.current_story_id`, `rooms.current_scene_id`) with host-only RPC `rpc_update_room_scene`
- **Guest Sessions**: RPC `guest_check_and_start_session` enforces room capacity (2) and daily device limits (3/day), plus `rpc_log_connection_event`, `rpc_end_guest_session`, and heartbeat timer
- **Edge Function**: `identify_device` returns `ip_hash` and `device_hash` for usage limits
- **UX**: Fullscreen toggle, PWA install prompt, persistent text scaling

### In Progress
- Connection health UI (peer and data channel indicators)
- Error/notice toasts for signaling and RTC edge cases
- QA pass across iOS/Android/desktop networks per `docs/qa/QA_DEVICE_MATRIX.md`

### Next Milestones
- Polish guest flow and error states; add TURN credentials for production networks
- Add basic analytics views over `connection_events`
- Expand story set and seed content; authoring workflow

### Known Risks
- WebRTC across strict corporate/firewalled networks (mitigated by TURN config and audio-only fallback)
- Browser autoplay and device permission quirks (preflight test implemented)

### Current State
- Build: passing; Vite dev server runs locally
- Supabase: migrations applied for rooms/stories/guest_sessions/device_limits/connection_events
- Features: video calling with sync, guest limits, invite QR/link, PWA/Fullscreen

### How to Run (Dev)
- App: `cd apps/read && npm install && cp .env.example .env && npm run dev`
- Supabase: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; apply SQL in `/supabase/migrations/`; deploy `functions/identify_device`

---

Last updated: Sprint 3
