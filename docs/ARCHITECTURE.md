# Architecture & Repo Design Decisions

### Goals
- Deliver a resilient guest storytelling flow quickly
- Keep clean seams for future growth (accounts, subscriptions, analytics)
- Prefer managed services over custom infra where possible

### Repository Layout (current)
```
meastory/
  apps/
    read/                  # React + TypeScript + Vite production app
    mvp/read-old/          # Legacy static MVP (reference only)
  supabase/
    functions/             # Edge Functions (identify_device)
    migrations/            # SQL schema, policies, RPCs
  docs/
    *.md
```

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **State**: Zustand stores (`authStore`, `roomStore`, `uiStore`, `webrtcStore`)
- **Styling**: Tailwind CSS
- **Routing**: React Router (`/start`, `/invite/:code`, `/join`, `/join/:code`, auth pages, app shell)
- **PWA**: Manifest + install prompt, fullscreen controls, persistent text scale via CSS var

### Signaling & Presence
- **Provider**: Supabase Realtime
- **Channel Naming**: `webrtc-<ROOM_CODE>`
- **Presence**: Determines `host` vs `guest` (first presencer = host)
- **Filtering**: Recipient-scoped messages (`offer`/`answer`/`candidate`) and self-ignore guards
- **Fallbacks**: Story sync also broadcast via Realtime in addition to RTC data channel

### WebRTC
- **Negotiation**: Perfect negotiation, glare handling (polite/impolite roles)
- **ICE**: Candidate queuing, phased TURN enable, reconnect/backoff on failure/disconnect
- **Policy**: Optional relay detection → audio-only on TURN as configured
- **Data Channel**: `story-sync` carries story choice, story change, child name updates

### Data Model (Supabase)
- `rooms`: id, code, name, tier (`guest`), status, `current_story_id`, `current_scene_id`, `host_id?`, `max_participants`
- `stories`: id, title, description, status
- `story_scenes`: id, story_id, scene_order, title, content, choices (JSONB)
- `room_participants`: id, room_id, user_id?, participant_name
- `guest_sessions`: id, room_id, room_code, device_hash, ip_hash?, role, started_at, ended_at
- `device_limits`: (ip_hash, device_hash, day) → session_count to enforce 3/day
- `connection_events`: per-session events for connect_start/connected/retry/ice_failed/ended (+ detail JSON)

### RPCs & Functions
- `rpc_create_guest_room(name, story_id?)`: create guest room with 2 max participants
- `guest_check_and_start_session(code, ip_hash, device_hash)`: validate capacity + daily limits; returns role + session
- `rpc_log_connection_event(...)`: persist connection metrics
- `rpc_end_guest_session(session_id)`: mark session ended
- `rpc_heartbeat_guest_session(session_id, room_code)`: heartbeat (see migration)
- `rpc_update_room_scene(room_id, story_id, scene_id)`: host-only, updates `current_*`
- Edge Function `identify_device`: hashes IP and device/browser into `ip_hash`/`device_hash`

### Flows
- **Guest**: Start → create room (RPC) → share invite QR/link → Join → preflight device test → start session (RPC) → enter room (Realtime + WebRTC) → pick story → read and make choices (sync via data channel)
- **Host Story Change**: Update `rooms.story_id` and broadcast; peers load new story without dropping RTC
- **Scene Resume**: Host updates `current_*` via RPC; peers load matching scene

### Security & Privacy
- No A/V stored; peer-to-peer media
- RLS on tables; RPCs are `SECURITY DEFINER` and scope anon access to guest flows
- Minimal device/IP hashing only for limits/abuse prevention

### Evolution Path
- Add richer connection health UI, error toasts, TURN credentials
- Expand story catalog and authoring workflow
- Add accounts/subscriptions (Stripe) and move guest → member flows
- Extract story engine into a package; add tests and analytics dashboards 