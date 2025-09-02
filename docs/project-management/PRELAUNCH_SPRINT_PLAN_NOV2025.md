# Read Me A Story – Pre-Launch Sprint Plan (Target: November 2025)

## Overview
- Objective: Ship a reliable Guest MVP (+ essential Free tier basics) prioritizing connection success and a simplified guest journey with 3 curated stories.
- Scope Freeze: Reliability and guest experience are in-scope; advanced premium features deferred post-launch except participant/time gating and holiday promo entry points.
- Timeframe: Sep–Nov 2025 (5 two-week sprints to code freeze by Nov 10).
- Roles (placeholders):
  - WebRTC/Realtime Engineer (WRE)
  - Frontend/UX Engineer (FE)
  - Full-stack/DB Engineer (FSE)
  - QA/Testing (QA)

## Sprint Timeline & Goals

### Sprint 1 (Sep 2–Sep 15)
- Goal: Standardize signaling on Supabase Realtime; implement presence; preflight device tests; basic guest flow skeleton.
- Owners: WRE (signaling/presence), FE (preflight + pages), FSE (RLS scaffolding)

### Sprint 2 (Sep 16–Sep 29)
- Goal: Enforce guest limits (time, participants, daily); shipping Magic Link/QR invite; connection metrics instrumentation.
- Owners: FSE (limits/RLS), FE (invite UX), WRE (metrics hooks)

### Sprint 3 (Sep 30–Oct 13)
- Goal: Graceful degradation (audio-only fallback), reconnection with state resume; 3 curated stories ready and gated.
- Owners: WRE (fallback/reconnect), FSE (state persistence), FE (library gating)

### Sprint 4 (Oct 14–Oct 27)
- Goal: Free tier basics (bookmarks, 30-day history), conversion prompts (time-left, 3rd participant), holiday promo hooks.
- Owners: FSE (DB/APIs), FE (UX prompts), WRE (participant cap enforcement)

### Sprint 5 (Oct 28–Nov 10) – Code Freeze
- Goal: Cross-device hardening, TURN rollout (managed), analytics dashboards, release readiness checks.
- Owners: WRE (TURN/hardening), QA (test matrix), FSE (dashboards)


## Backlog Mapped to Sprints (Dependencies Noted)

- S1
  - Retire legacy signaling server; ensure only Supabase Realtime is used (dep: none)
  - Add channel presence (metadata: id, role, device) and UI indicators (dep: Realtime)
  - Preflight page: permissions, device selection, basic network hint (dep: FE shell)
  - Guest flow skeleton: `/start` (room create), `/invite/:code`, `/join/:code` (dep: rooms table)
- S2
  - Guest limits: 30m session timer; 2 participants; 3 sessions/day per IP/device (dep: RLS scaffolding)
  - Magic Link + QR code share UI (copy, send) (dep: invite page)
  - Connection metrics table + events (first-attempt success, retries, ICE) (dep: webrtc hooks)
- S3
  - Audio-only fallback on failure; renegotiate to re-enable video (dep: metrics to drive thresholds)
  - Reconnect with exponential backoff; state resume from DB (dep: story-session persistence)
  - Publish and gate 3 curated stories for guest (dep: stories curated/flagged)
- S4
  - Free tier: bookmarks, last-30-day history views (dep: tables + UI)
  - Conversion prompts: 5-min remaining; 3rd participant join (dep: timers/participant caps)
  - Holiday promo/Stripe Checkout link stubs; gift CTA surfaces (dep: Stripe setup)
- S5
  - TURN configuration (managed provider) and rollout (dep: keys/config)
  - Cross-device QA: iOS/Android/desktop/TVs test pass (dep: test plans)
  - Analytics dashboards for KPIs (dep: metrics data accumulated)
  - Release readiness checklist execution


## User Stories & Acceptance Criteria

### Signaling & Presence
- As a participant, I connect via Supabase Realtime and see when others join/leave.
  - AC: Offer/answer/ICE are exchanged on `webrtc-<code>` channel; no external WS.
  - AC: Presence list updates within 2s on join/leave with device label.

### Guest Flow
- As a host (guest), I can create a room and share a Magic Link/QR and the other person joins without login.
  - AC: `/start` issues room with code; `/invite/:code` shows link, QR, and code.
  - AC: `/join/:code` preflight passes → waiting room → connect to story view.

### Limits & Enforcement
- As a guest, sessions end at 30 minutes and only allow 2 participants, max 3 sessions/day per IP/device.
  - AC: Timer banner + 5-min prompt; auto end with friendly modal.
  - AC: Third join attempt blocked with upgrade CTA.
  - AC: RLS or function enforces daily limit with device/IP hash.

### Reliability & Recovery
- As a user, if video fails, the app auto-switches to audio and reconnects without losing story progress.
  - AC: On failure signal or N seconds no media, renegotiate with video disabled.
  - AC: Reconnect attempts with backoff; upon success, story resumes to latest scene.

### Story State & Library Gating
- As users, everyone stays in sync on current scene; guest library shows only 3 curated stories.
  - AC: Current scene persisted in `room_sessions`; resume on rejoin.
  - AC: Guest view filters to curated stories; labels and copy reflect free vs guest.

### Conversion Prompts & Holiday Promo
- As a free user, I see upgrade prompts at time limit and when a 3rd participant tries to join.
  - AC: Prompts include benefits and Stripe promo link.
  - AC: Gift CTA visible on invite and completion screens.

### Free Tier Basics
- As a free user, I can bookmark stories and view the last 30 days of history.
  - AC: Bookmarks saved per account; history view with timestamps; basic sorting.

### Metrics & Dashboards
- As a PM, I can see connection success, invite completion, and story completion.
  - AC: Metrics collected per session; dashboard charts for weekly tracking.


## Estimates & Capacity Planning
- Team capacity assumption per 2-week sprint:
  - WRE: 20 pts; FSE: 20 pts; FE: 20 pts; QA: 10 pts
- High-level estimates
  - Retire legacy signaling + presence: 10 pts (WRE/FE)
  - Preflight + guest skeleton pages: 8 pts (FE)
  - Guest limits (RLS + device/IP hash): 13 pts (FSE)
  - Magic Link/QR share: 5 pts (FE)
  - Metrics pipeline + events: 8 pts (WRE/FSE)
  - Audio-only fallback + renegotiation: 13 pts (WRE)
  - Reconnect + state resume: 13 pts (WRE/FSE)
  - Curated stories gating: 5 pts (FE/FSE)
  - Free bookmarks/history: 8 pts (FSE/FE)
  - Conversion prompts: 5 pts (FE)
  - Stripe promo/gift links: 5 pts (FSE/FE)
  - TURN rollout (managed): 5 pts (WRE)
  - Dashboards: 8 pts (FSE)
  - Cross-device QA hardening: 10 pts (QA/FE/WRE)

> Utilization fits 5 sprints if scope is controlled; defer non-critical polish if any sprint risks overrun.


## QA Plan, Test Cases, and Sprint Metrics

- S1 Metrics
  - Realtime-only signaling coverage: 100% of new sessions
  - Presence accuracy: >99% join/leave reflected
  - Preflight completion rate: >90%
- S2 Metrics
  - Guest limit adherence: 100% correct enforcement
  - Invite completion rate: >85%
  - Connection first-attempt success: ≥85%
- S3 Metrics
  - Recovery success after failure: ≥70%
  - Story resume accuracy: 100% correct scene after reconnect
  - Guest story completion rate: ≥80%
- S4 Metrics
  - Prompt visibility and clicks at limits: >50% view, >10% CTR
  - Free feature stability: <1% error rate
- S5 Metrics
  - Cross-device pass rate: ≥95% across primary matrix
  - TURN adoption on strict NATs: ≥90% success

- Test Case Themes (non-exhaustive)
  - Permissions denied/allowed flows; device changes mid-call
  - NAT traversal scenarios; ICE restart; TURN fallback
  - Realtime disconnect/reconnect; presence race conditions
  - Time limit prompts and auto-end; 3rd participant attempts
  - Curated story gating and story sync under packet loss
  - Stripe link availability (non-transactional validation)


## Release Readiness Checklist (Code Freeze Nov 10)
- [ ] Legacy signaling server removed from runtime paths
- [ ] Supabase Realtime presence verified at scale for 100 concurrent rooms
- [ ] Managed TURN credentials configured, rotated, and documented
- [ ] Guest limits enforced (time, participants, daily) with RLS/edge checks
- [ ] Reconnect/resume verified with chaos tests (network toggles)
- [ ] Analytics dashboards live (connection success, invites, completions)
- [ ] Three curated stories verified end-to-end; content QA done
- [ ] Cross-device test pass on primary matrix (Chrome/Safari/Firefox; iOS/Android; tablets)
- [ ] Accessibility review (keyboard focus, contrast, large targets)
- [ ] On-call and incident runbook prepared; logging/alerts wired
- [ ] Rollback plan documented (feature flags, config toggles)


## Go/No-Go Gates
- Gate A (Oct 13)
  - First-attempt connection ≥85%; presence accurate; guest basic flow stable
- Gate B (Oct 27)
  - Audio-only fallback + reconnect working; story resume accurate; invite completion ≥85%
- Gate C (Nov 10)
  - Cross-device pass ≥95%; curated stories complete; dashboards live; TURN enabled

If a gate fails, scope cuts prioritized: defer Free-tier history UI, then Stripe gift CTA; focus on reliability fixes first.


## Ownership & Communication
- Standups: Daily 15 min; Focus on blockers impacting gates
- Demos: End of each sprint with KPI snapshot
- Reporting: Weekly metrics digest shared to leadership
- Issue Tracking: One board per sprint with Definition of Done aligned to AC and tests


## Appendix – Data & Tables (High-Level)
- connection_events(session_id, room_code, client_id, event_type, ts, detail)
- room_sessions(room_id, current_scene_id, last_choice_ts)
- bookmarks(user_id, story_id, created_at)
- story_history(user_id, story_id, session_id, started_at, ended_at)
- device_limits(ip_hash, device_hash, day, session_count)

RLS/edge function enforces guest daily limits using `ip_hash`/`device_hash`; hashes are derived client-side and sent via headers or RPC. 